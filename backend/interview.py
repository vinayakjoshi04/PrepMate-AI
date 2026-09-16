# backend/interview.py
import json
import os
import re
import shutil
import subprocess
import tempfile
import traceback

from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from huggingfaceService import (
    extract_skills, generate_questions, call_huggingface,
    generate_behavioral_report, generate_batch_behavioral_report,
    generate_executive_summary,
)
from video_analysis import analyze_video
from audio_analysis import analyze_audio
from local_storage import upload_recording, save_recording_metadata, get_fresh_signed_url

interview_bp = Blueprint("interview", __name__)

MEDIA_UPLOAD_FOLDER = "uploads/media"
ALLOWED_MEDIA_EXTENSIONS = {"webm", "mp4", "mov", "wav", "mp3", "m4a", "ogg"}
# Raised from 60MB -> 300MB to comfortably support recordings up to the new
# 10-minute-per-answer cap (webm/vp9+opus at 10 min can land well past 60MB).
MAX_MEDIA_SIZE = 300 * 1024 * 1024
BATCH_CHUNK_SIZE = 5

if not os.path.exists(MEDIA_UPLOAD_FOLDER):
    os.makedirs(MEDIA_UPLOAD_FOLDER)

# ─── ffmpeg availability check (run once at import) ────────────────────────
FFMPEG_PATH = shutil.which("ffmpeg")
if FFMPEG_PATH:
    print(f"✅ ffmpeg found at: {FFMPEG_PATH}")
else:
    print("❌ ffmpeg NOT found on PATH. Video/audio analysis will fail silently "
          "(cv2 often can't open .webm directly, and pydub needs ffmpeg to extract "
          "audio). Install ffmpeg and add it to PATH, then restart the server.")


def _convert_to_mp4(input_path):
    """
    Re-encode any uploaded clip (webm/mov/etc) to a standard H.264/AAC .mp4.
    This exists because cv2.VideoCapture very often fails to open raw webm/VP9
    files (especially on Windows opencv-python-headless builds), which was
    causing analyze_video() to silently return {"error": "could not open video
    file"} with zero visible failure anywhere in the logs.
    Returns the new path, or the original path if ffmpeg isn't available
    (in which case analysis may still fail — but now it will be logged).
    """
    if not FFMPEG_PATH:
        return input_path, False

    out_path = input_path + "_converted.mp4"
    try:
        result = subprocess.run(
            [
                FFMPEG_PATH, "-y", "-i", input_path,
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
                "-c:a", "aac", "-ar", "16000", "-ac", "1",
                out_path,
            ],
            # Raised from 60s -> 300s: a 10-minute source clip takes
            # meaningfully longer to re-encode than the old ~1-minute cap did.
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0 or not os.path.exists(out_path):
            print(f"⚠️  ffmpeg conversion failed for {input_path}: {result.stderr[-500:]}")
            return input_path, False
        return out_path, True
    except Exception as e:
        print(f"⚠️  ffmpeg conversion exception for {input_path}: {e}")
        return input_path, False


def _run_full_analysis(media_path, qid_label=""):
    """
    Converts the clip, then runs video + audio analysis, logging results
    clearly so we can see exactly what happened for every clip.
    """
    print(f"   🎬 [{qid_label}] Converting media for reliable decoding…")
    converted_path, converted = _convert_to_mp4(media_path)
    print(f"   🎬 [{qid_label}] Using {'converted' if converted else 'ORIGINAL (ffmpeg unavailable/failed)'} file: {converted_path}")

    try:
        print(f"   👁  [{qid_label}] Running analyze_video()…")
        video_metrics = analyze_video(converted_path)
        if video_metrics.get("error"):
            print(f"   ❌ [{qid_label}] Video analysis ERROR: {video_metrics['error']}")
        else:
            print(f"   ✅ [{qid_label}] Video OK — frames={video_metrics.get('framesAnalyzed')}, "
                  f"faceDetected={video_metrics.get('faceDetectedPct')}%, "
                  f"eyeContact={video_metrics.get('eyeContactPct')}%, "
                  f"engagement={video_metrics.get('engagementScore')}")

        print(f"   🎙️  [{qid_label}] Running analyze_audio()…")
        audio_metrics = analyze_audio(converted_path)
        if audio_metrics.get("error"):
            print(f"   ❌ [{qid_label}] Audio analysis ERROR: {audio_metrics['error']}")
        else:
            transcript_preview = (audio_metrics.get("transcript") or "")[:80]
            note = audio_metrics.get("transcriptionNote")
            print(f"   ✅ [{qid_label}] Audio OK — duration={audio_metrics.get('speakingDurationSec')}s, "
                  f"wpm={audio_metrics.get('wordsPerMinute')}, "
                  f"delivery={audio_metrics.get('deliveryScore')}, "
                  f"transcript='{transcript_preview}'")
            if note:
                print(f"   ⚠️  [{qid_label}] Transcription note: {note}")
            if not transcript_preview:
                print(f"   ⚠️  [{qid_label}] Transcript came back EMPTY — Whisper may not be receiving usable audio")
    finally:
        # BUGFIX: this cleanup previously sat after both analysis calls with
        # no try/finally, so if analyze_video/analyze_audio ever raised
        # (rather than returning an {"error": ...} dict) the converted temp
        # .mp4 would never be removed. Guaranteed cleanup now.
        if converted and converted_path != media_path:
            _cleanup(converted_path)

    return video_metrics, audio_metrics


# ─── Shared helpers ──────────────────────────────────────────────────────

def clean_json_response(text):
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    return text.strip()


def repair_json(text):
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()

    brace_pos = text.find('{')
    if brace_pos == -1:
        return None
    text = text[brace_pos:]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    depth = 0
    end_pos = -1
    in_string = False
    escape_next = False
    for i, ch in enumerate(text):
        if escape_next:
            escape_next = False
            continue
        if ch == '\\' and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end_pos = i
                break

    if end_pos != -1:
        try:
            return json.loads(text[:end_pos + 1])
        except json.JSONDecodeError:
            pass

    lines = text.splitlines()
    for trim in range(len(lines)):
        attempt = '\n'.join(lines[:len(lines) - trim]).rstrip().rstrip(',')
        open_braces = attempt.count('{') - attempt.count('}')
        open_brackets = attempt.count('[') - attempt.count(']')
        attempt += ']' * open_brackets + '}' * open_braces
        try:
            return json.loads(attempt)
        except json.JSONDecodeError:
            continue

    return None


def _allowed_media(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_MEDIA_EXTENSIONS


def _save_media_file(file_storage):
    """
    Saves the uploaded file to a temp path and returns (path, error).
    Enforces MAX_MEDIA_SIZE right after saving and rejects oversized uploads.
    """
    filename = secure_filename(file_storage.filename)
    suffix = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'webm'
    tmp = tempfile.NamedTemporaryFile(
        dir=MEDIA_UPLOAD_FOLDER, suffix=f".{suffix}", delete=False
    )
    file_storage.save(tmp.name)
    size = os.path.getsize(tmp.name)
    print(f"   💾 Saved upload: {tmp.name} ({size / 1024:.1f} KB)")

    if size > MAX_MEDIA_SIZE:
        print(f"   ❌ Upload too large ({size / 1024 / 1024:.1f} MB > "
              f"{MAX_MEDIA_SIZE / 1024 / 1024:.0f} MB limit) — rejecting")
        _cleanup(tmp.name)
        return None, f"file too large (max {MAX_MEDIA_SIZE // (1024 * 1024)}MB)"

    if size < 2000:
        print(f"   ⚠️  File is suspiciously small ({size} bytes) — recording may be empty/corrupt")

    return tmp.name, None


def _cleanup(path):
    try:
        os.remove(path)
    except Exception:
        pass


# ─── Create Interview ───────────────────────────────────────────────────

@interview_bp.route("/api/create-interview", methods=["POST"])
def create_interview():
    try:
        print("\n" + "=" * 60)
        print("📨 CREATE INTERVIEW REQUEST")
        print("=" * 60)

        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        required_fields = ["jobTitle", "jobDescription", "experienceLevel", "interviewType"]
        missing_fields = [f for f in required_fields if not data.get(f)]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        job_title = data["jobTitle"]
        job_description = data["jobDescription"]
        experience_level = data["experienceLevel"]
        interview_type = data["interviewType"]

        try:
            questions_count = int(data.get("questionsCount", 5))
        except (TypeError, ValueError):
            questions_count = 5
        questions_count = max(1, min(questions_count, 20))

        difficulty = data.get("difficulty", "mixed")
        focus_areas = data.get("focusAreas", [])
        round_name = data.get("roundName", "Interview Round")

        print(f"📝 {job_title} | {experience_level} | {interview_type}")
        print(f"🎯 Difficulty: {difficulty} | Questions: {questions_count} | Focus: {focus_areas}")

        skills_text = extract_skills(job_title, job_description[:2500], experience_level)
        skills = repair_json(clean_json_response(skills_text))
        if not skills:
            return jsonify({"error": "Failed to extract skills. Please try again."}), 500

        difficulty_instruction = {
            "easy": "Ask foundational, entry-level questions only.",
            "mixed": "Mix of beginner, intermediate, and one advanced question.",
            "hard": "Ask senior-level questions: complex system design, edge cases, tradeoffs.",
        }.get(difficulty, "Mix of beginner, intermediate, and one advanced question.")

        enriched_skills = json.dumps({
            **skills,
            "_difficulty": difficulty_instruction,
            "_focusAreas": ", ".join(focus_areas[:6]) if focus_areas else "",
            "_questionsCount": questions_count,
            "_roundName": round_name,
        })

        questions_text = generate_questions(
            job_title, job_description[:2000], experience_level,
            interview_type, enriched_skills
        )
        questions_data = repair_json(clean_json_response(questions_text))
        if not questions_data:
            return jsonify({"error": "Failed to generate questions. Please try again."}), 500

        questions_list = questions_data.get("questions", [])[:questions_count]
        if not questions_list:
            return jsonify({"error": "No questions generated. Please try again."}), 500

        print(f"✅ {len(questions_list)} questions for {round_name}")
        return jsonify({"skills": skills, "questions": questions_list}), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ─── Analyze Single Answer ────────────────────────────────────────────────

@interview_bp.route("/api/analyze-answer", methods=["POST"])
def analyze_answer():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        question = data.get('question', '') or ''
        answer = data.get('answer', '') or ''
        round_num = data.get('round')
        job_title = data.get('jobTitle', '') or ''
        exp_level = data.get('experienceLevel', '') or ''

        if answer.strip() == "[Skipped]":
            return jsonify({
                "score": 0,
                "feedback": ["Question was skipped."],
                "strengths": [],
                "improvements": ["Attempt all questions to receive full AI feedback."],
                "hasExamples": False
            }), 200

        round_name = {1: "Technical Round 1", 2: "Technical Round 2"}.get(round_num, "HR Round")

        prompt = f"""You are an expert interviewer. Score this candidate answer.

Job: {job_title} ({exp_level}) — {round_name}
Question: {question[:300]}
Answer: {answer[:1200]}

Return ONLY valid JSON (no markdown):
{{
  "score": 7,
  "feedback": ["Specific point 1", "Specific point 2", "Specific point 3"],
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "hasExamples": true
}}

Rules: score is 0-10 integer, all arrays 2-3 items, return ONLY JSON."""

        response_text = call_huggingface(prompt, max_tokens=600)
        parsed = repair_json(response_text)

        if not parsed:
            wc = len(answer.split())
            return jsonify({
                "score": min(3 + (wc // 20), 8),
                "feedback": ["AI scoring temporarily unavailable. Score estimated from answer length."],
                "strengths": ["Attempted the question"],
                "improvements": ["Add concrete examples and quantify your results"],
                "hasExamples": False
            }), 200

        try:
            score = max(0, min(10, int(parsed.get('score', 5))))
        except (TypeError, ValueError):
            score = 5

        return jsonify({
            "score": score,
            "feedback": parsed.get('feedback', []),
            "strengths": parsed.get('strengths', []),
            "improvements": parsed.get('improvements', []),
            "hasExamples": bool(parsed.get('hasExamples', False))
        }), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return jsonify({
            "score": 5,
            "feedback": ["Server error during analysis. Score is estimated."],
            "strengths": [],
            "improvements": ["Please retry for accurate scoring."],
            "hasExamples": False
        }), 200


# ─── Batch Analyze Answers (legacy) ────────────────────────────────────────

@interview_bp.route("/api/batch-analyze-answers", methods=["POST"])
def batch_analyze_answers():
    try:
        print("\n" + "=" * 60)
        print("📨 BATCH ANALYZE ANSWERS (legacy)")
        print("=" * 60)

        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        answers = data.get('answers', [])
        job_title = data.get('jobTitle', 'the role')
        exp_level = data.get('experienceLevel', 'mid-level')

        if not answers:
            return jsonify({"error": "No answers provided"}), 400

        real_answers = [a for a in answers if (a.get('answer') or '').strip() != '[Skipped]']
        skipped_ids = {a.get('questionId') for a in answers if (a.get('answer') or '').strip() == '[Skipped]'}

        print(f"📝 {len(real_answers)} real answers | {len(skipped_ids)} skipped")

        answer_lines = []
        for i, a in enumerate(real_answers):
            q = (a.get('question') or '')[:150]
            ans = (a.get('answer') or '')[:300]
            answer_lines.append(f"[{i+1}] Q: {q}\n    A: {ans}")

        answers_block = "\n\n".join(answer_lines)

        prompt = f"""You are an expert interviewer. Score ALL {len(real_answers)} answers for a {exp_level} {job_title} candidate.

{answers_block}

Return ONLY valid JSON (no markdown):
{{
  "results": [
    {{
      "index": 1,
      "score": 7,
      "feedback": ["Point 1", "Point 2"],
      "strengths": ["Strength 1"],
      "improvements": ["Improvement 1"],
      "hasExamples": true
    }}
  ]
}}

Rules: one entry per answer in order, index starts at 1, score 0-10, return ONLY JSON."""

        max_tokens = min(200 + len(real_answers) * 130, 2400)

        print(f"🤖 Batch scoring {len(real_answers)} answers (max_tokens={max_tokens})…")
        response_text = call_huggingface(prompt, max_tokens=max_tokens)
        parsed = repair_json(response_text)

        results_map = {}

        if parsed and 'results' in parsed:
            ai_results = parsed['results']
            for i, a in enumerate(real_answers):
                ai = ai_results[i] if i < len(ai_results) else {}
                try:
                    score = max(0, min(10, int(ai.get('score', 5))))
                except (TypeError, ValueError):
                    score = 5
                results_map[a['questionId']] = {
                    "score": score,
                    "feedback": ai.get('feedback', ["Answer recorded."]),
                    "strengths": ai.get('strengths', ["Attempted the question"]),
                    "improvements": ai.get('improvements', ["Add more specific examples"]),
                    "hasExamples": bool(ai.get('hasExamples', False)),
                    "skipped": False,
                }
        else:
            print("⚠️  Batch parse failed — using word-count fallback")
            for a in real_answers:
                wc = len((a.get('answer') or '').split())
                results_map[a['questionId']] = {
                    "score": min(3 + (wc // 25), 8),
                    "feedback": ["AI scoring temporarily unavailable. Score estimated."],
                    "strengths": ["Attempted the question"],
                    "improvements": ["Add concrete examples and quantify results"],
                    "hasExamples": False,
                    "skipped": False,
                }

        for a in answers:
            if a['questionId'] in skipped_ids:
                results_map[a['questionId']] = {
                    "score": 0,
                    "feedback": ["Question was skipped."],
                    "strengths": [],
                    "improvements": ["Attempt all questions for full feedback."],
                    "hasExamples": False,
                    "skipped": True,
                }

        ordered = [
            results_map.get(a['questionId'], {
                "score": 5, "feedback": [], "strengths": [],
                "improvements": [], "hasExamples": False, "skipped": False
            })
            for a in answers
        ]

        print(f"✅ Batch complete: {len(ordered)} results")
        return jsonify({"results": ordered}), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ─── Video-only analysis (standalone) ─────────────────────────────────────

@interview_bp.route("/api/analyze-video", methods=["POST"])
def analyze_video_route():
    if 'video' not in request.files:
        return jsonify({"error": "No video file uploaded"}), 400

    file = request.files['video']
    if not file.filename or not _allowed_media(file.filename):
        return jsonify({"error": "Invalid or missing video file"}), 400

    path, save_err = _save_media_file(file)
    if path is None:
        return jsonify({"error": save_err}), 413

    converted_path, converted = _convert_to_mp4(path)
    try:
        metrics = analyze_video(converted_path)
        print(f"analyze-video result: {metrics}")
        return jsonify(metrics), 200
    finally:
        _cleanup(path)
        if converted and converted_path != path:
            _cleanup(converted_path)


# ─── Audio-only analysis (standalone) ─────────────────────────────────────

@interview_bp.route("/api/analyze-audio", methods=["POST"])
def analyze_audio_route():
    if 'audio' not in request.files and 'video' not in request.files:
        return jsonify({"error": "No audio/video file uploaded"}), 400

    file = request.files.get('audio') or request.files.get('video')
    if not file.filename or not _allowed_media(file.filename):
        return jsonify({"error": "Invalid or missing media file"}), 400

    path, save_err = _save_media_file(file)
    if path is None:
        return jsonify({"error": save_err}), 413

    converted_path, converted = _convert_to_mp4(path)
    try:
        metrics = analyze_audio(converted_path)
        print(f"analyze-audio result: {metrics}")
        return jsonify(metrics), 200
    finally:
        _cleanup(path)
        if converted and converted_path != path:
            _cleanup(converted_path)


# ─── Multimodal: single video + text answer -> combined report ────────────

@interview_bp.route("/api/analyze-multimodal", methods=["POST"])
def analyze_multimodal():
    media_path = None
    try:
        question = request.form.get('question', '')
        answer_text = request.form.get('answer', '')
        job_title = request.form.get('jobTitle', '')
        exp_level = request.form.get('experienceLevel', '')

        if answer_text.strip() == "[Skipped]":
            return jsonify({
                "contentScore": 0, "deliveryScore": 0, "overallScore": 0,
                "feedback": ["Question was skipped."], "strengths": [],
                "improvements": ["Attempt all questions for full feedback."],
                "nonverbalNotes": "", "vocalNotes": "",
                "videoMetrics": None, "audioMetrics": None
            }), 200

        video_metrics, audio_metrics = None, None

        if 'video' in request.files and request.files['video'].filename:
            file = request.files['video']
            if not _allowed_media(file.filename):
                return jsonify({"error": "Invalid media file type"}), 400
            media_path, save_err = _save_media_file(file)
            if media_path is None:
                return jsonify({"error": save_err}), 413
            video_metrics, audio_metrics = _run_full_analysis(media_path, qid_label="single")

            if not answer_text.strip() and audio_metrics and audio_metrics.get("transcript"):
                answer_text = audio_metrics["transcript"]

        if not answer_text.strip():
            answer_text = "(No answer content available.)"

        report_text = generate_behavioral_report(
            question=question, answer_text=answer_text, job_title=job_title,
            experience_level=exp_level, video_metrics=video_metrics, audio_metrics=audio_metrics
        )
        report = repair_json(report_text)

        if not report:
            return jsonify({
                "contentScore": 5, "deliveryScore": 5, "overallScore": 5,
                "feedback": ["AI report generation temporarily unavailable."],
                "strengths": [], "improvements": ["Please retry."],
                "nonverbalNotes": "", "vocalNotes": "",
                "videoMetrics": video_metrics, "audioMetrics": audio_metrics
            }), 200

        report["videoMetrics"] = video_metrics
        report["audioMetrics"] = audio_metrics
        for key in ("contentScore", "deliveryScore", "overallScore"):
            if key in report:
                try:
                    report[key] = max(0, min(10, int(report[key])))
                except (TypeError, ValueError):
                    report[key] = 5

        return jsonify(report), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500

    finally:
        if media_path:
            _cleanup(media_path)


# ─── Whole-interview batch analysis ────────────────────────────────────────

@interview_bp.route("/api/analyze-interview-batch", methods=["POST"])
def analyze_interview_batch():
    saved_paths = []
    try:
        print("\n" + "=" * 60)
        print("📨 ANALYZE INTERVIEW BATCH")
        print("=" * 60)

        meta_raw = request.form.get("meta")
        job_title = request.form.get("jobTitle", "")
        exp_level = request.form.get("experienceLevel", "")
        session_id = request.form.get("sessionId", "unknown")
        user_id = request.form.get("userId") or None
        if not meta_raw:
            return jsonify({"error": "Missing meta"}), 400

        items = json.loads(meta_raw)
        if not isinstance(items, list) or not items:
            return jsonify({"error": "No answers provided"}), 400

        print("📋 DEBUG items received:", items)
        print("📎 DEBUG incoming file keys:", list(request.files.keys()))
        print(f"👤 DEBUG session_id={session_id} user_id={user_id}")

        scoreable = []
        skipped_out = {}

        for it in items:
            qid = str(it.get("questionId"))
            skipped_flag = it.get("skipped")
            print(f"   → item qid={qid} skipped={skipped_flag} isCoding={it.get('isCoding')} "
                  f"hasRecordedClip={it.get('hasRecordedClip')}")

            if skipped_flag:
                skipped_out[qid] = {
                    "questionId": qid, "contentScore": 0, "deliveryScore": 0, "overallScore": 0,
                    "feedback": ["Question was skipped."], "strengths": [], "improvements": [],
                    "hasExamples": False, "nonverbalNotes": "", "vocalNotes": "",
                    "videoMetrics": None, "audioMetrics": None, "answerText": "[Skipped]",
                }
                continue

            video_metrics, audio_metrics = None, None
            answer_text = it.get("answerText", "") or ""
            is_coding = bool(it.get("isCoding"))
            # FIX: this used to be gated on `not is_coding`, so a coding
            # question's uploaded clip was never even looked up, let alone
            # analyzed — regardless of whether a recording actually existed.
            # Now it's gated on hasRecordedClip, which reflects reality
            # (mediaStore) rather than assuming "coding = no recording".
            has_clip = bool(it.get("hasRecordedClip"))

            if has_clip:
                file_key = f"video_{qid}"
                file = request.files.get(file_key)
                print(f"   → looking for file key '{file_key}': {'FOUND' if file else 'NOT FOUND'}")
                if file and file.filename and _allowed_media(file.filename):
                    path, save_err = _save_media_file(file)
                    if path is None:
                        print(f"   ⚠️  Upload rejected for qid={qid}: {save_err} — scoring with empty content")
                    else:
                        saved_paths.append(path)
                        video_metrics, audio_metrics = _run_full_analysis(path, qid_label=f"q{qid}")

                        # Only borrow the Whisper transcript as the answer text for
                        # SPOKEN questions with no typed content. For coding questions
                        # the submitted code is always the answer — the transcript is
                        # only used for the attentiveness notes, never overwrites code.
                        if not is_coding and not answer_text.strip() and audio_metrics and audio_metrics.get("transcript"):
                            answer_text = audio_metrics["transcript"]

                        # ── Persist the recording locally before cleanup ──
                        remote_name = f"{session_id}/{qid}_{os.path.basename(path)}"
                        recording_url = upload_recording(path, remote_name)
                        if recording_url:
                            print(f"   💾 [{qid}] Saved locally: {remote_name}")
                            save_recording_metadata(
                                session_id=session_id,
                                question_id=qid,
                                storage_path=remote_name,
                                user_id=user_id,
                                job_title=job_title,
                                experience_level=exp_level,
                                duration_sec=audio_metrics.get("speakingDurationSec") if audio_metrics else None,
                            )
                        else:
                            print(f"   ⚠️  [{qid}] Local save failed — continuing without persistence")
                else:
                    print(f"   ⚠️  hasRecordedClip=True but no usable file found for qid={qid} "
                          f"— this question will be scored with empty/text-only content")
            else:
                print(f"   → qid={qid} has no recorded clip — skipping video/audio analysis")

            if not answer_text.strip():
                answer_text = "(No answer content available.)"

            scoreable.append({
                "questionId": qid,
                "question": it.get("question", ""),
                "answerText": answer_text,
                "isCoding": is_coding,
                "videoMetrics": video_metrics,
                "audioMetrics": audio_metrics,
            })

        print(f"📊 DEBUG: {len(scoreable)} scoreable, {len(skipped_out)} skipped")

        scored_out = {}
        for chunk_start in range(0, len(scoreable), BATCH_CHUNK_SIZE):
            chunk = scoreable[chunk_start:chunk_start + BATCH_CHUNK_SIZE]
            llm_items = [{**c, "index": i + 1} for i, c in enumerate(chunk)]
            print(f"🤖 Batch behavioral scoring: {len(chunk)} items in this chunk…")
            raw = generate_batch_behavioral_report(llm_items, job_title, exp_level)
            parsed = repair_json(raw)
            results_list = parsed.get("results", []) if parsed else []
            print(f"   → LLM returned {len(results_list)} results (parsed OK: {parsed is not None})")

            for i, c in enumerate(chunk):
                r = results_list[i] if i < len(results_list) else {}

                def _safe_score(v):
                    try:
                        return max(0, min(10, int(v)))
                    except (TypeError, ValueError):
                        return 5

                scored_out[c["questionId"]] = {
                    "questionId": c["questionId"],
                    "question": c["question"],
                    "isCoding": c["isCoding"],
                    "contentScore": _safe_score(r.get("contentScore", 5)),
                    "deliveryScore": _safe_score(r.get("deliveryScore", 5)),
                    "overallScore": _safe_score(r.get("overallScore", 5)),
                    "feedback": r.get("feedback", ["Answer recorded."]),
                    "strengths": r.get("strengths", ["Attempted the question"]),
                    "improvements": r.get("improvements", ["Add more specific detail"]),
                    "hasExamples": bool(r.get("hasExamples", False)),
                    "nonverbalNotes": r.get("nonverbalNotes", ""),
                    "vocalNotes": r.get("vocalNotes", ""),
                    "videoMetrics": c["videoMetrics"],
                    "audioMetrics": c["audioMetrics"],
                    "answerText": c["answerText"],
                }

        merged = {**skipped_out, **scored_out}
        ordered = [merged.get(str(it.get("questionId")), {}) for it in items]

        # ── Executive summary (best-effort — report still works without it) ──
        executive_summary = None
        try:
            non_skipped = [r for r in ordered if r and r.get("feedback") != ["Question was skipped."]]
            if non_skipped:
                total = sum(r.get("contentScore", 0) for r in non_skipped)
                pct = round((total / (len(non_skipped) * 10)) * 100, 1) if non_skipped else 0
                print("🧾 Generating executive summary…")
                executive_summary = generate_executive_summary(job_title, exp_level, non_skipped, pct)
                print(f"   → Executive summary: {'generated' if executive_summary else 'failed, using fallback'}")
        except Exception as e:
            print(f"⚠️  Executive summary step failed (non-critical): {e}")

        print(f"✅ Interview batch analysis complete: {len(ordered)} results "
              f"({len(scoreable)} LLM-scored, {len(skipped_out)} skipped)")
        return jsonify({"results": ordered, "executiveSummary": executive_summary}), 200

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}"}), 500

    finally:
        for p in saved_paths:
            _cleanup(p)


# ─── Fetch a fresh URL for a stored recording ───────────────────────

@interview_bp.route("/api/get-recording-url", methods=["GET"])
def get_recording_url():
    storage_path = request.args.get("path")
    if not storage_path:
        return jsonify({"error": "Missing path"}), 400
    url = get_fresh_signed_url(storage_path)
    if not url:
        return jsonify({"error": "Could not generate URL"}), 500
    return jsonify({"url": url}), 200