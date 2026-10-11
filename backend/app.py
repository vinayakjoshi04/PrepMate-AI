# backend/app.py - PRODUCTION READY (for Render)
# NOTE: Interview-flow routes (create-interview, analyze-answer,
# batch-analyze-answers, analyze-video, analyze-audio, analyze-multimodal)
# live in interview.py (Blueprint).
# Resume-analysis logic lives in resumeanalyzer.py.
# Skill-gap logic lives in skillgap_analysis.py.
# Recordings are stored on local disk (uploads/recordings/) and served via
# /api/recordings/<path>.
#
# requires: pip install flask flask-cors python-docx reportlab PyPDF2

import io
import logging
import os
import threading
import traceback
import uuid

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException, NotFound
from werkzeug.utils import secure_filename

from audio_analysis import preload_whisper
from interview import interview_bp
import resumeanalyzer as ra
from skillgap_analysis import analyze_skill_gap

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("prepmate")

APP_VERSION = "2.2.0"
SERVICE_NAME = "PrepMate-AI Backend"
ENV = os.getenv("FLASK_ENV", "development")

app = Flask(__name__)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# flask-cors only supports wildcards through regex, so "https://*.vercel.app"
# as a plain string never matched. Preflight (OPTIONS) is handled by flask-cors.
ALLOWED_ORIGINS = [
    "https://prep-mate-ai-eight.vercel.app",
    r"https://.*\.vercel\.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5000",
]
extra_origin = os.getenv("EXTRA_ALLOWED_ORIGIN")
if extra_origin:
    ALLOWED_ORIGINS.append(extra_origin)

CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600,
    }
})

app.register_blueprint(interview_bp)

# ─── Config ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
RECORDINGS_DIR = os.path.join(UPLOAD_FOLDER, "recordings")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RECORDINGS_DIR, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
# Recordings can run up to 10 minutes/answer.
app.config["MAX_CONTENT_LENGTH"] = 320 * 1024 * 1024

ENDPOINTS = {
    "health": "/api/health",
    "create_interview": "/api/create-interview",
    "analyze_answer": "/api/analyze-answer",
    "batch_analyze": "/api/batch-analyze-answers",
    "analyze_video": "/api/analyze-video",
    "analyze_audio": "/api/analyze-audio",
    "analyze_multimodal": "/api/analyze-multimodal",
    "analyze_resume": "/api/analyze-resume",
    "generate_ats_resume": "/api/generate-ats-resume",
    "export_resume": "/api/export-resume",
    "skill_gap": "/api/skill-gap",
    "recordings": "/api/recordings/<path>",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def extract_text_from_upload(file):
    """
    Validate, temporarily save (unique name, always cleaned up) and extract
    text from an uploaded resume. Returns (text, error).
    """
    is_valid, err = ra.validate_resume_file(file)
    if not is_valid:
        return "", err

    safe_name = secure_filename(file.filename) or "resume"
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"  # avoids collisions between concurrent users
    file_path = os.path.join(UPLOAD_FOLDER, unique_name)

    try:
        file.save(file_path)
        text = ra.extract_resume_text(file_path, unique_name) or ""
    finally:
        try:
            os.remove(file_path)
        except OSError:
            pass

    return text, None


def get_json_body():
    """Always returns a dict, even for empty/invalid JSON."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def json_error(message, status):
    return jsonify({"error": message}), status


def server_error(context, exc):
    """Log full details server-side, return a safe message to the client."""
    logger.error("%s: %s\n%s", context, exc, traceback.format_exc())
    return json_error(f"{context}. Please try again.", 500)


# ─── Root / Health ────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "service": SERVICE_NAME,
        "version": APP_VERSION,
        "status": "running",
        "endpoints": ENDPOINTS,
    }), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": APP_VERSION,
        "environment": ENV,
        "frontend": "https://prep-mate-ai-eight.vercel.app",
        "backend": "https://prepmate-ai-backend-ckrb.onrender.com",
    }), 200


# ─── Serve locally-stored recordings ──────────────────────────────────────────

@app.route("/api/recordings/<path:filepath>", methods=["GET"])
def serve_recording(filepath):
    # send_from_directory blocks path traversal; missing files -> clean 404
    try:
        return send_from_directory(RECORDINGS_DIR, filepath)
    except NotFound:
        return json_error("Recording not found.", 404)


# ─── Analyze Resume ───────────────────────────────────────────────────────────

@app.route("/api/analyze-resume", methods=["POST"])
def analyze_resume():
    try:
        logger.info("Analyze resume request")

        file = request.files.get("resume")
        if not file or not file.filename:
            return json_error("No file uploaded.", 400)

        resume_text, err = extract_text_from_upload(file)
        if err:
            return json_error(err, 400)
        if len(resume_text.strip()) < 100:
            return json_error("Failed to extract text. Ensure the file is not password-protected or scanned-only.", 400)

        logger.info("Extracted %d chars", len(resume_text))
        job_description = request.form.get("jobDescription", "").strip()

        analysis = ra.run_deep_analysis(resume_text, job_description)
        if not analysis:
            return json_error("Failed to parse AI analysis. Please try again.", 500)

        logger.info("Analysis done | ATS: %s | JobMatch: %s",
                    analysis.get("atsScore"), analysis.get("jobMatchScore"))

        improved_resume = ""
        try:
            improved_resume = ra.generate_ats_resume(resume_text, analysis, job_description)
            logger.info("ATS resume generated (%d chars)", len(improved_resume))
        except Exception as e:
            logger.warning("ATS resume generation failed (non-critical): %s", e)

        analysis["improvedResume"] = improved_resume
        analysis["rawResumeText"] = resume_text[:8000]  # kept for client-side re-generation
        return jsonify(analysis), 200

    except Exception as e:
        return server_error("Resume analysis failed", e)


# ─── Generate / Regenerate ATS Resume ─────────────────────────────────────────

@app.route("/api/generate-ats-resume", methods=["POST"])
def generate_ats_resume_route():
    try:
        data = get_json_body()
        analysis = data.get("existingAnalysis")
        analysis = analysis if isinstance(analysis, dict) else {}
        job_description = (data.get("jobDescription") or "").strip()

        keywords_to_add = data.get("keywordsToAdd") or []
        if not isinstance(keywords_to_add, list):
            keywords_to_add = []
        keywords_to_add = [str(k).strip() for k in keywords_to_add if str(k).strip()][:50]

        resume_text = analysis.get("rawResumeText") or analysis.get("improvedResume") or ""
        if not resume_text:
            return json_error("No resume text available to regenerate from.", 400)

        improved = ra.generate_ats_resume(resume_text, analysis, job_description, keywords_to_add)
        return jsonify({"atsResume": improved}), 200

    except Exception as e:
        return server_error("ATS resume generation failed", e)


# ─── Export Resume (real .docx / .pdf, ATS-safe formatting) ───────────────────

EXPORT_FORMATS = {
    "pdf": ("application/pdf", "ats_optimized_resume.pdf"),
    "docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
             "ats_optimized_resume.docx"),
    "txt": ("text/plain", "ats_optimized_resume.txt"),
}


@app.route("/api/export-resume", methods=["POST"])
def export_resume():
    try:
        data = get_json_body()
        raw_content = (data.get("content") or "").strip()
        fmt = (data.get("format") or "pdf").lower()

        if fmt not in EXPORT_FORMATS:
            return json_error(f"Unsupported format: {fmt}", 400)

        content, sanitize_error = ra.sanitize_export_content(raw_content)
        if sanitize_error:
            logger.warning("Export blocked - bad content: %s", sanitize_error)
            return json_error(sanitize_error, 400)

        logger.info("Exporting resume as %s (%d chars)", fmt.upper(), len(content))

        try:
            if fmt == "pdf":
                file_bytes = ra.export_resume_to_pdf(content)
            elif fmt == "docx":
                file_bytes = ra.export_resume_to_docx(content)
            else:
                file_bytes = content.encode("utf-8")
        except ImportError:
            package = "reportlab" if fmt == "pdf" else "python-docx"
            return json_error(
                f"{fmt.upper()} export is unavailable on the server - "
                f"the '{package}' package is not installed.", 500)

        mimetype, download_name = EXPORT_FORMATS[fmt]
        return send_file(io.BytesIO(file_bytes), mimetype=mimetype,
                         as_attachment=True, download_name=download_name)

    except Exception as e:
        return server_error("Export failed", e)


# ─── Skill Gap ────────────────────────────────────────────────────────────────

@app.route("/api/skill-gap", methods=["POST"])
def skill_gap():
    try:
        logger.info("Skill gap request")

        job_description = request.form.get("jobDescription", "").strip()
        if not job_description:
            return json_error("Job description is required.", 400)

        resume_text = ""
        file = request.files.get("resume")
        if file and file.filename:
            resume_text, err = extract_text_from_upload(file)
            if err:
                return json_error(err, 400)

        if not resume_text:
            resume_text = request.form.get("resumeText", "").strip()

        logger.info("JD: %d chars | Resume: %d chars", len(job_description), len(resume_text))

        result, error = analyze_skill_gap(resume_text, job_description)
        if error:
            # input problems -> 400, AI failures -> 500
            status = 400 if ("required" in error or "extract" in error) else 500
            return json_error(error, status)

        logger.info("Skill gap done | Present: %d | Missing: %d | Roadmap: %d",
                    len(result["presentSkills"]), len(result["missingSkills"]), len(result["roadmap"]))
        return jsonify(result), 200

    except Exception as e:
        return server_error("Skill gap analysis failed", e)


# ─── Error Handlers ───────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": sorted(set(ENDPOINTS.values())),
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return json_error("Method not allowed for this endpoint.", 405)


@app.errorhandler(413)
def file_too_large(error):
    return json_error("File too large. Maximum size is 320MB.", 413)


@app.errorhandler(Exception)
def unhandled_exception(error):
    # Keep proper status codes for HTTP errors (400, 415, ...)
    if isinstance(error, HTTPException):
        return json_error(error.description, error.code)
    logger.error("Unhandled exception: %s\n%s", error, traceback.format_exc())
    return json_error("Internal server error.", 500)


# ─── Whisper preload ──────────────────────────────────────────────────────────
# Runs at import time so it also works under gunicorn on Render (the old
# __main__ block never ran there). Done in a background thread so the port
# binds immediately and Render's health check doesn't time out.

def _preload_whisper_safe():
    try:
        preload_whisper()
        logger.info("Whisper preloaded")
    except Exception as e:
        logger.warning("Whisper preload failed (will load lazily): %s", e)


# Avoid double-loading under the Flask debug reloader
if ENV != "development" or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    threading.Thread(target=_preload_whisper_safe, daemon=True).start()


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info("%s | Port %s | Env %s", SERVICE_NAME, port, ENV)
    app.run(debug=(ENV == "development"), port=port, host="0.0.0.0")