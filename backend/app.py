# backend/app.py - PRODUCTION READY (for Render)
# NOTE: All interview-flow routes (create-interview, analyze-answer,
# batch-analyze-answers, analyze-video, analyze-audio, analyze-multimodal)
# live in interview.py, registered as a Blueprint below.
#
# All resume-analysis logic (extraction, format checks, prompts, AI calls,
# ATS resume generation, docx/pdf export) lives in resumeanalyzer.py.
#
# Recordings are now stored on local disk (uploads/recordings/) instead of
# Supabase — see local_storage.py. Served back out via /api/recordings/<path>.

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import traceback
import os
import io
from werkzeug.utils import secure_filename
from audio_analysis import preload_whisper

from interview import interview_bp, repair_json
import resumeanalyzer as ra
# requires: pip install python-docx reportlab PyPDF2 --break-system-packages

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://prep-mate-ai-eight.vercel.app",
            "https://*.vercel.app",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5000",
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

app.register_blueprint(interview_bp)

UPLOAD_FOLDER = 'uploads'
RECORDINGS_DIR = os.path.join(UPLOAD_FOLDER, "recordings")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(RECORDINGS_DIR):
    os.makedirs(RECORDINGS_DIR)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# Raised from 60MB -> 320MB: recordings can now run up to 10 minutes/answer.
app.config['MAX_CONTENT_LENGTH'] = 320 * 1024 * 1024


# ─── Preflight ────────────────────────────────────────────────────────────────

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", request.headers.get('Origin', '*'))
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Max-Age", "3600")
        return response, 200


# ─── Root / Health ────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "service": "PrepMate-AI Backend",
        "version": "2.1.0",
        "status": "running",
        "endpoints": {
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
            "recordings": "/api/recordings/<path>"
        }
    }), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "PrepMate-AI Backend",
        "version": "2.1.0",
        "environment": os.getenv('FLASK_ENV', 'development'),
        "frontend": "https://prep-mate-ai-eight.vercel.app",
        "backend": "https://prepmate-ai-backend-ckrb.onrender.com"
    }), 200


# ─── Serve locally-stored recordings ───────────────────────────────────────

@app.route("/api/recordings/<path:filepath>", methods=["GET"])
def serve_recording(filepath):
    return send_from_directory(RECORDINGS_DIR, filepath)


# ─── Analyze Resume ───────────────────────────────────────────────────────────

@app.route("/api/analyze-resume", methods=["POST"])
def analyze_resume():
    try:
        print("\n" + "=" * 60)
        print("📨 ANALYZE RESUME REQUEST")
        print("=" * 60)

        if 'resume' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['resume']
        is_valid, err = ra.validate_resume_file(file)
        if not is_valid:
            return jsonify({"error": err}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        resume_text = ra.extract_resume_text(file_path, filename)
        try:
            os.remove(file_path)
        except Exception:
            pass

        if not resume_text or len(resume_text.strip()) < 100:
            return jsonify({"error": "Failed to extract text. Ensure the file is not password-protected."}), 400

        print(f"✅ Extracted {len(resume_text)} chars")

        job_description = request.form.get('jobDescription', '').strip()

        print("🤖 Running deep analysis…")
        analysis = ra.run_deep_analysis(resume_text, job_description)
        if not analysis:
            return jsonify({"error": "Failed to parse AI analysis. Please try again."}), 500

        print(f"✅ Analysis done | ATS: {analysis['atsScore']}"
              f" | JobMatch: {analysis.get('jobMatchScore')}")

        improved_resume = ""
        try:
            print("🤖 Generating ATS-optimized resume…")
            improved_resume = ra.generate_ats_resume(resume_text, analysis, job_description)
            print(f"✅ ATS resume generated | {len(improved_resume)} chars")
        except Exception as e:
            print(f"⚠️  ATS resume generation failed (non-critical): {e}")

        analysis["improvedResume"] = improved_resume
        analysis["rawResumeText"] = resume_text[:8000]  # kept for client-side re-generation
        return jsonify(analysis), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ─── Generate / Regenerate ATS Resume ────────────────────────────────────────

@app.route("/api/generate-ats-resume", methods=["POST"])
def generate_ats_resume_route():
    try:
        data = request.get_json(force=True) or {}
        analysis = data.get("existingAnalysis") or {}
        job_description = data.get("jobDescription", "").strip()
        keywords_to_add = data.get("keywordsToAdd", [])
        resume_text = analysis.get("rawResumeText") or analysis.get("improvedResume") or ""

        if not resume_text:
            return jsonify({"error": "No resume text available to regenerate from."}), 400

        improved = ra.generate_ats_resume(resume_text, analysis, job_description, keywords_to_add)
        return jsonify({"atsResume": improved}), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ─── Export Resume (real .docx / .pdf, ATS-safe formatting) ──────────────────

@app.route("/api/export-resume", methods=["POST"])
def export_resume():
    try:
        data = request.get_json(force=True) or {}
        raw_content = (data.get("content") or "").strip()
        fmt = (data.get("format") or "pdf").lower()

        if fmt not in {"pdf", "docx", "txt"}:
            return jsonify({"error": f"Unsupported format: {fmt}"}), 400

        content, sanitize_error = ra.sanitize_export_content(raw_content)
        if sanitize_error:
            print(f"⚠️  Export blocked — bad content: {sanitize_error}")
            return jsonify({"error": sanitize_error}), 400

        print(f"📄 Exporting resume as {fmt.upper()} ({len(content)} chars)")

        if fmt == "pdf":
            try:
                file_bytes = ra.export_resume_to_pdf(content)
            except ImportError:
                return jsonify({
                    "error": "PDF export is unavailable on the server — the 'reportlab' package is not installed. "
                             "Run: pip install reportlab --break-system-packages"
                }), 500
            return send_file(
                io.BytesIO(file_bytes),
                mimetype="application/pdf",
                as_attachment=True,
                download_name="ats_optimized_resume.pdf"
            )

        elif fmt == "docx":
            try:
                file_bytes = ra.export_resume_to_docx(content)
            except ImportError:
                return jsonify({
                    "error": "DOCX export is unavailable on the server — the 'python-docx' package is not installed. "
                             "Run: pip install python-docx --break-system-packages"
                }), 500
            return send_file(
                io.BytesIO(file_bytes),
                mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                as_attachment=True,
                download_name="ats_optimized_resume.docx"
            )

        else:  # txt
            return send_file(
                io.BytesIO(content.encode("utf-8")),
                mimetype="text/plain",
                as_attachment=True,
                download_name="ats_optimized_resume.txt"
            )

    except Exception as e:
        print(f"\n❌ EXPORT ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Export failed: {str(e)}"}), 500


# ─── Skill Gap ────────────────────────────────────────────────────────────────

@app.route("/api/skill-gap", methods=["POST"])
def skill_gap():
    try:
        print("\n" + "=" * 60)
        print("📨 SKILL GAP REQUEST")
        print("=" * 60)

        job_description = request.form.get('jobDescription', '').strip()
        if not job_description:
            return jsonify({"error": "Job description is required."}), 400

        resume_text = ""
        if 'resume' in request.files:
            file = request.files['resume']
            if file and file.filename:
                is_valid, err = ra.validate_resume_file(file)
                if not is_valid:
                    return jsonify({"error": err}), 400
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                resume_text = ra.extract_resume_text(file_path, filename) or ""
                try:
                    os.remove(file_path)
                except Exception:
                    pass

        if not resume_text:
            resume_text = request.form.get('resumeText', '').strip()

        if not resume_text or len(resume_text) < 50:
            return jsonify({"error": "Could not extract resume text. Please try a different file."}), 400

        print(f"✅ JD: {len(job_description)} | Resume: {len(resume_text)} chars")

        from huggingfaceService import call_huggingface

        prompt = f"""You are an expert career coach. Compare the resume against the job description.

JOB DESCRIPTION:
{job_description[:2500]}

RESUME:
{resume_text[:2500]}

Return ONLY valid JSON (no markdown):
{{
  "presentSkills": ["Skill A", "Skill B"],
  "missingSkills": ["Skill X", "Skill Y"],
  "partialSkills": ["Skill P"],
  "summary": "2-3 sentence summary of fit and key gaps.",
  "totalTimeframe": "10-14 weeks",
  "roadmap": [
    {{
      "skill": "Skill Name",
      "priority": "high",
      "timeframe": "2-3 weeks",
      "matchScore": 80,
      "description": "Why this skill matters and how to learn it.",
      "resources": [{{"name": "Resource", "url": "https://example.com"}}],
      "subtasks": ["Task 1", "Task 2", "Task 3"]
    }}
  ]
}}

Rules: roadmap max 6 items, priority = high/medium/low, return ONLY JSON."""

        print("🤖 Skill gap AI call…")
        response_text = call_huggingface(prompt, max_tokens=2000)
        analysis = repair_json(response_text)
        if not analysis:
            return jsonify({"error": "Failed to parse AI response. Please try again."}), 500

        required_keys = ["presentSkills", "missingSkills", "roadmap"]
        missing_keys = [k for k in required_keys if k not in analysis]
        if missing_keys:
            return jsonify({"error": f"Incomplete AI response (missing: {', '.join(missing_keys)})."}), 500

        for item in analysis.get("roadmap", []):
            if item.get("priority") not in {"high", "medium", "low"}:
                item["priority"] = "medium"
            if "matchScore" in item:
                item["matchScore"] = max(0, min(100, int(item["matchScore"])))

        result = {
            "presentSkills": analysis.get("presentSkills", []),
            "missingSkills": analysis.get("missingSkills", []),
            "partialSkills": analysis.get("partialSkills", []),
            "summary": analysis.get("summary", ""),
            "totalTimeframe": analysis.get("totalTimeframe", ""),
            "roadmap": analysis.get("roadmap", [])
        }
        print(f"✅ Skill gap done | Present: {len(result['presentSkills'])} | "
              f"Missing: {len(result['missingSkills'])} | Roadmap: {len(result['roadmap'])}")
        return jsonify(result), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ─── Error Handlers ───────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": [
            "/api/health", "/api/create-interview",
            "/api/analyze-answer", "/api/batch-analyze-answers",
            "/api/analyze-video", "/api/analyze-audio", "/api/analyze-multimodal",
            "/api/analyze-resume", "/api/generate-ats-resume", "/api/export-resume",
            "/api/skill-gap", "/api/recordings/<path>"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error", "message": str(error)}), 500

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({"error": "File too large. Maximum size is 320MB."}), 413


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    env = os.getenv('FLASK_ENV', 'development')
    print(f"\n🚀 PrepMate-AI Backend | Port {port} | Env {env}\n")
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or env != "development":
        preload_whisper()
    app.run(debug=(env == 'development'), port=port, host='0.0.0.0')