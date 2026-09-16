# backend/huggingfaceService.py
# Hugging Face Inference API wrapper.
#
# CHANGELOG (this revision):
#   - FIX: call_huggingface() now takes an `expect_json` flag (default True).
#     Previously EVERY call — including plain-text calls like the ATS resume
#     rewrite and the executive summary — used the same hard-coded system
#     prompt: "You MUST respond with ONLY valid, complete JSON." That directly
#     contradicted user prompts that asked for plain resume text, so the model
#     would wrap the resume in a JSON object (e.g. {"resume": "..."}), which is
#     exactly the "downloaded doc is JSON" bug. Now:
#       * expect_json=True  (default, used by all scoring/report/JSON calls):
#         unchanged behavior — forces JSON, validates/retries on bad JSON.
#       * expect_json=False (used by plain-text calls): uses a plain-text
#         system prompt instead, skips the JSON validate/retry loop entirely,
#         and just strips stray ``` fences before returning.
#   - generate_executive_summary() and resumeanalyzer.generate_ats_resume()
#     now call this with expect_json=False so they never get JSON-wrapped.
#
# CHANGELOG (earlier revision):
#   - Added generate_executive_summary() for a panel-style report summary.
#   - QWEN_MODEL ("Qwen/Qwen2.5-7B-Instruct") is no longer usable on HF's
#     free serverless tier — HF's router now points it at a Together AI
#     "Turbo" variant that requires a paid dedicated endpoint, and every
#     call fails instantly with a 400 "model_not_available" error. Both
#     generate_behavioral_report() and generate_batch_behavioral_report()
#     now use LLAMA_MODEL instead, which is confirmed working.
#   - call_huggingface() retry logic reworked:
#       * Fails FAST (no retries wasted) when the model route is
#         permanently dead (400 "model_not_available"/"non-serverless"),
#         since retrying that error 3x just burns time for nothing.
#       * Waits LONGER and scales up per attempt on genuine 503/loading
#         cold-starts (15s, 30s, 45s...) instead of giving up quickly —
#         a cold model genuinely needs that time, it's not a dead route.
#       * Default retry_count raised 3 -> 5 to give real cold-starts a
#         fair chance before falling back.
#
# One model is used for everything now:
#   - LLAMA_MODEL: text scoring for individual/batch answers AND the
#     multimodal/behavioral report (previously split across two models;
#     consolidated after QWEN_MODEL stopped being accessible for free).
#
# Get your free API key: https://huggingface.co/settings/tokens

import os
from dotenv import load_dotenv
import time
import json
import re

try:
    from huggingface_hub import InferenceClient
except ImportError:
    print("Installing huggingface_hub...")
    import subprocess
    subprocess.check_call(["pip", "install", "huggingface_hub"])
    from huggingface_hub import InferenceClient

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY")

LLAMA_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
# NOTE: QWEN_MODEL kept only for reference / in case HF restores free access
# to it later. Do NOT pass this to call_huggingface() right now — it will
# fail every single attempt with a 400 model_not_available error.
QWEN_MODEL = "Qwen/Qwen2.5-7B-Instruct"

RATE_LIMIT_DELAY = 3
last_request_time = 0

client = None

DEFAULT_JSON_SYSTEM_PROMPT = (
    "You are an expert technical recruiter and interviewer. You MUST "
    "respond with ONLY valid, complete JSON. Do not use markdown formatting, "
    "code blocks, or any additional text. Ensure all JSON objects are "
    "properly closed with matching braces and brackets."
)

DEFAULT_PLAIN_TEXT_SYSTEM_PROMPT = (
    "You are a helpful expert assistant. Respond with plain text only. "
    "Do not wrap your answer in JSON, do not use markdown formatting or code "
    "fences, and do not add any preamble, explanation, or commentary beyond "
    "exactly what was asked for."
)


def get_client():
    global client
    if client is None:
        if not HF_API_KEY:
            raise Exception(
                "Hugging Face API key missing in .env file. "
                "Get your free key at: https://huggingface.co/settings/tokens"
            )
        client = InferenceClient(token=HF_API_KEY)
    return client


def rate_limit():
    global last_request_time
    now = time.time()
    elapsed = now - last_request_time
    if elapsed < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - elapsed)
    last_request_time = time.time()


def extract_json_from_text(text):
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()

    start = text.find('{')
    if start == -1:
        return text

    brace_count = 0
    end = start
    for i in range(start, len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i + 1
                break

    if end > start:
        extracted = text[start:end]
        try:
            json.loads(extracted)
            return extracted
        except json.JSONDecodeError:
            return text
    return text


def call_huggingface(prompt, max_tokens=3072, retry_count=5, model=None, system_prompt=None,
                      expect_json=True):
    """Make a request to Hugging Face using InferenceClient with retry logic.
    `model` defaults to LLAMA_MODEL.

    `expect_json` (default True) controls two things:
      - Which default system prompt is used when `system_prompt` isn't passed
        explicitly (a JSON-forcing prompt vs. a plain-text prompt).
      - Whether the response is validated/retried as JSON at all. Plain-text
        calls (like a resume rewrite) should NEVER be forced into JSON, and
        previously they were — this flag is the fix for that.

    Retry behavior (expect_json=True only; expect_json=False returns on the
    first successful response with no JSON validation):
      - "model_not_available" / "non-serverless" (dead route, needs a paid
        dedicated endpoint) -> fails IMMEDIATELY, no retries. Retrying this
        error is pointless; it will fail identically every time.
      - "503"/"loading" (model cold-starting) -> retries with an increasing
        wait (15s, 30s, 45s, ...) since this genuinely just needs more time.
      - rate limit / 429 -> retries with increasing backoff.
      - anything else -> retries with a flat short backoff.
    """
    rate_limit()

    hf_client = get_client()
    model_to_use = model or LLAMA_MODEL

    default_system_prompt = DEFAULT_JSON_SYSTEM_PROMPT if expect_json else DEFAULT_PLAIN_TEXT_SYSTEM_PROMPT

    messages = [
        {
            "role": "system",
            "content": system_prompt or default_system_prompt
        },
        {"role": "user", "content": prompt}
    ]

    last_error = None

    for attempt in range(retry_count):
        try:
            print(f"🔄 [{model_to_use}] Attempt {attempt + 1}/{retry_count}...")

            response = hf_client.chat_completion(
                messages=messages,
                model=model_to_use,
                max_tokens=max_tokens,
                temperature=0.7,
                stop=["```", "\n\n\n"]
            )

            generated_text = response.choices[0].message.content
            print(f"📝 Received {len(generated_text)} characters")

            if not expect_json:
                # Plain-text mode: skip JSON validation/retry entirely. Just
                # strip any stray markdown code-fence the model might still add.
                cleaned = re.sub(r'```[a-z]*\n?', '', generated_text).strip()
                print(f"✅ Plain-text response accepted on attempt {attempt + 1}")
                return cleaned

            cleaned = extract_json_from_text(generated_text)
            try:
                json.loads(cleaned)
                print(f"✅ Valid JSON received on attempt {attempt + 1}")
                return generated_text
            except json.JSONDecodeError as json_err:
                print(f"⚠️  Incomplete/invalid JSON on attempt {attempt + 1}: {json_err}")
                if attempt < retry_count - 1:
                    time.sleep(2)
                    last_error = json_err
                    continue
                else:
                    return generated_text

        except Exception as e:
            error_msg = str(e)
            last_error = e
            print(f"❌ Attempt {attempt + 1} failed: {error_msg}")

            if "model_not_available" in error_msg or "non-serverless" in error_msg.lower():
                raise Exception(
                    f"Model '{model_to_use}' is not available on HF's free serverless "
                    f"tier right now (needs a paid dedicated endpoint). Switch to a "
                    f"different model. Original error: {error_msg}"
                )

            if "503" in error_msg or "loading" in error_msg.lower():
                wait_time = 15 * (attempt + 1)
                print(f"⏳ Model is loading, waiting {wait_time} seconds (attempt {attempt + 1})...")
                time.sleep(wait_time)
                continue
            elif "rate limit" in error_msg.lower() or "429" in error_msg:
                if attempt < retry_count - 1:
                    wait_time = 10 * (attempt + 1)
                    time.sleep(wait_time)
                    continue
                else:
                    raise Exception("Rate limit exceeded. Wait a moment and try again.")
            elif "401" in error_msg or "unauthorized" in error_msg.lower():
                raise Exception(
                    "Invalid API key. Get your free Hugging Face API key at: "
                    "https://huggingface.co/settings/tokens"
                )
            elif attempt < retry_count - 1:
                time.sleep(4)
                continue
            else:
                raise Exception(f"Hugging Face API error after {retry_count} attempts: {error_msg}")

    if last_error:
        raise last_error
    raise Exception("All retry attempts failed")


def extract_skills(job_title, job_description, experience_level):
    prompt = f"""Analyze this job posting and extract the required skills.

Job Title: {job_title}
Experience Level: {experience_level}

Job Description:
{job_description}

Return ONLY valid JSON with this exact structure (no markdown, no explanation, no code blocks):
{{
  "technicalSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "softSkills": ["skill1", "skill2", "skill3"],
  "requiredCompetencies": ["competency1", "competency2", "competency3"],
  "primaryFocus": "brief description of main focus area"
}}

IMPORTANT: Return ONLY the JSON object above, nothing else. Ensure all braces are closed."""

    text = call_huggingface(prompt, max_tokens=1024)
    cleaned_text = extract_json_from_text(text)

    try:
        parsed = json.loads(cleaned_text)
        required_keys = ["technicalSkills", "softSkills", "requiredCompetencies", "primaryFocus"]
        missing_keys = [key for key in required_keys if key not in parsed]
        if missing_keys:
            raise ValueError(f"Missing required keys: {', '.join(missing_keys)}")
    except (json.JSONDecodeError, ValueError) as e:
        try:
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                fallback = json.loads(json_match.group())
                if all(key in fallback for key in ["technicalSkills", "softSkills"]):
                    return json.dumps(fallback)
        except Exception:
            pass
        raise Exception(f"AI returned invalid JSON format. Error: {str(e)}")

    return cleaned_text


def generate_questions(job_title, job_description, experience_level, interview_type, skills_json):
    question_count = {"technical": 6, "behavioral": 5, "mixed": 7}.get(interview_type, 6)

    prompt = f"""Generate exactly {question_count} challenging {interview_type} interview questions for this role.

Job Title: {job_title}
Experience Level: {experience_level}
Interview Type: {interview_type}

Required Skills:
{skills_json}

Return ONLY valid JSON with this exact structure. Each question MUST have all 4 fields:
{{
  "questions": [
    {{"id": 1, "question": "detailed question text", "difficulty": "Easy", "focusArea": "skill area"}},
    {{"id": 2, "question": "detailed question text", "difficulty": "Medium", "focusArea": "skill area"}}
  ]
}}

CRITICAL RULES:
1. Generate EXACTLY {question_count} questions
2. Each question must be specific to {experience_level} level
3. Return ONLY the JSON object, no markdown, no explanations
4. Ensure all braces and brackets are properly closed
5. No trailing commas"""

    text = call_huggingface(prompt, max_tokens=3072)
    cleaned_text = extract_json_from_text(text)

    try:
        parsed = json.loads(cleaned_text)
        if "questions" not in parsed or not isinstance(parsed["questions"], list):
            raise ValueError("Invalid questions structure - missing 'questions' array")
        if len(parsed["questions"]) == 0:
            raise ValueError("No questions generated")
        for i, q in enumerate(parsed["questions"]):
            required_fields = ["id", "question", "difficulty", "focusArea"]
            missing = [f for f in required_fields if f not in q]
            if missing:
                raise ValueError(f"Question {i+1} missing fields: {', '.join(missing)}")
    except (json.JSONDecodeError, ValueError) as e:
        try:
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                fallback = json.loads(json_match.group())
                if "questions" in fallback and len(fallback["questions"]) > 0:
                    return json.dumps(fallback)
        except Exception:
            pass
        raise Exception(f"AI returned invalid JSON format. Error: {str(e)}")

    return cleaned_text


def generate_behavioral_report(question, answer_text, job_title, experience_level,
                                video_metrics=None, audio_metrics=None):
    """
    Uses LLAMA_MODEL to synthesize verbal (answer content) + non-verbal (video)
    + vocal-delivery (audio) signals into one combined feedback report.
    video_metrics / audio_metrics may be None or contain an 'error' key if that
    modality wasn't available — the prompt is built to degrade gracefully.
    """
    video_block = "Not available."
    if video_metrics and "error" not in video_metrics:
        posture = video_metrics.get('postureScore')
        posture_line = f"{posture}/100" if posture is not None else "not measurable (person out of frame/too close)"
        video_block = (
            f"- Overall engagement score: {video_metrics.get('engagementScore')}/100\n"
            f"- Eye contact: {video_metrics.get('eyeContactPct')}% of the time facing the camera\n"
            f"- Head/posture stability: {video_metrics.get('headStability')}/100\n"
            f"- Posture (shoulder level + lean): {posture_line}\n"
            f"- Smiling/positive expression: {video_metrics.get('smilePct')}% of the time\n"
            f"- Blink rate: {video_metrics.get('blinkRate')} blinks/min "
            f"(very high can indicate nervousness)"
        )
        if video_metrics.get('lowConfidence'):
            video_block += "\n- NOTE: face was only reliably detected in a few frames; treat these numbers as low-confidence."

    audio_block = "Not available."
    transcript_note = ""
    if audio_metrics and "error" not in audio_metrics:
        wpm = audio_metrics.get('wordsPerMinute')
        wpm_line = f"{wpm} words/min" if wpm is not None else "not measurable (transcript too short/unclear)"
        audio_block = (
            f"- Overall delivery score: {audio_metrics.get('deliveryScore')}/100\n"
            f"- Speaking pace: {wpm_line}\n"
            f"- Filler words: {audio_metrics.get('fillerWordCount')} "
            f"({audio_metrics.get('fillerWordRate')}% of words)\n"
            f"- Volume consistency: {audio_metrics.get('volumeConsistency')}/100\n"
            f"- Pitch variety (monotone check): {audio_metrics.get('pitchVariety')}/100\n"
            f"- Long pauses (>1.5s): {audio_metrics.get('longPauseCount')}, "
            f"silence made up {audio_metrics.get('pauseRatio')}% of the clip"
        )
        if audio_metrics.get('transcriptionNote'):
            audio_block += f"\n- NOTE: transcription issue — {audio_metrics.get('transcriptionNote')}"

        transcript = (audio_metrics.get('transcript') or "").strip()
        if transcript and transcript.strip().lower() != (answer_text or "").strip().lower():
            transcript_note = (
                f"\n\nSPOKEN TRANSCRIPT (auto-transcribed from the recording — may contain "
                f"minor recognition errors, but reflects what was actually said aloud, "
                f"which may differ from the typed answer above):\n{transcript[:600]}"
            )

    prompt = f"""You are an expert interview coach analyzing a candidate's full delivery —
what they said AND how they said/presented it. Candidate is interviewing for
{job_title} ({experience_level}).

QUESTION:
{question[:300]}

ANSWER (typed/submitted content):
{answer_text[:1200]}{transcript_note}

NON-VERBAL SIGNALS (from webcam video analysis, already rolled up into scores):
{video_block}

VOCAL DELIVERY SIGNALS (from audio analysis, already rolled up into scores):
{audio_block}

Combine ALL available signals (skip any marked "Not available") into one holistic
assessment. Use the rollup scores as your anchor — don't recompute your own
opinion of eye contact from scratch, trust the measured numbers. Body language
and vocal delivery should adjust — not replace — the content score. If a spoken
transcript was provided and it differs meaningfully from the typed answer (richer,
thinner, or off-topic compared to what was typed), briefly note that in feedback —
otherwise ignore this and just judge the typed answer.

Return ONLY valid JSON (no markdown):
{{
  "contentScore": 7,
  "deliveryScore": 6,
  "overallScore": 7,
  "feedback": ["Point about content", "Point about delivery", "Point combining both"],
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "nonverbalNotes": "1-2 sentences on body language, or empty string if no video data",
  "vocalNotes": "1-2 sentences on vocal delivery, or empty string if no audio data"
}}

Rules: all scores 0-10 integers, arrays 2-3 items, return ONLY JSON."""

    response_text = call_huggingface(
        prompt, max_tokens=900, model=LLAMA_MODEL,
        system_prompt=(
            "You are an expert interview coach that fuses verbal content with body "
            "language and vocal delivery data into one JSON report. Respond with ONLY "
            "valid, complete JSON — no markdown, no extra commentary."
        )
    )
    return response_text


def _build_signal_blocks(answer_text, video_metrics, audio_metrics):
    """Shared helper: turns raw video/audio metrics into short prompt-ready
    summary strings. Used by both the old single-question report function
    and the new batched one below."""
    video_block = "Not available."
    if video_metrics and "error" not in video_metrics:
        posture = video_metrics.get('postureScore')
        posture_line = f"{posture}/100" if posture is not None else "not measurable"
        video_block = (
            f"Engagement {video_metrics.get('engagementScore')}/100, "
            f"Eye contact {video_metrics.get('eyeContactPct')}%, "
            f"Head stability {video_metrics.get('headStability')}/100, "
            f"Posture {posture_line}, Smiling {video_metrics.get('smilePct')}%, "
            f"Blink rate {video_metrics.get('blinkRate')}/min"
        )

    audio_block = "Not available."
    transcript_note = ""
    if audio_metrics and "error" not in audio_metrics:
        wpm = audio_metrics.get('wordsPerMinute')
        audio_block = (
            f"Delivery {audio_metrics.get('deliveryScore')}/100, "
            f"Pace {wpm if wpm is not None else 'n/a'} wpm, "
            f"Fillers {audio_metrics.get('fillerWordCount')} ({audio_metrics.get('fillerWordRate')}%), "
            f"Volume consistency {audio_metrics.get('volumeConsistency')}/100, "
            f"Pitch variety {audio_metrics.get('pitchVariety')}, "
            f"Pause ratio {audio_metrics.get('pauseRatio')}%"
        )
        transcript = (audio_metrics.get('transcript') or "").strip()
        if transcript and transcript.lower() != (answer_text or "").strip().lower():
            transcript_note = f" [Spoken transcript differs from typed text: {transcript[:200]}]"

    return video_block, audio_block, transcript_note


def generate_batch_behavioral_report(items, job_title, experience_level):
    """
    TOKEN-SAVING PATH: scores multiple answers (spoken + coding) in ONE LLM call
    instead of one call per question. Used by /api/analyze-interview-batch.

    items: list of dicts, each:
      {"index": int, "question": str, "answerText": str, "isCoding": bool,
       "videoMetrics": dict|None, "audioMetrics": dict|None}

    Coding items may now ALSO carry videoMetrics/audioMetrics if the person
    recorded themselves while coding (recording is mandatory for every
    non-skipped question, coding or not). When that happens we don't discard
    the signal — we use it to note attentiveness (looking away, long
    unexplained silences, speech not matching what's typed), while keeping
    contentScore based purely on code quality/correctness.

    Returns raw text (expected to be JSON: {"results": [...]}).
    """
    blocks = []
    for it in items:
        vb, ab, note = _build_signal_blocks(
            it.get("answerText", ""), it.get("videoMetrics"), it.get("audioMetrics")
        )
        has_clip = bool(
            (it.get("videoMetrics") and "error" not in it["videoMetrics"]) or
            (it.get("audioMetrics") and "error" not in it["audioMetrics"])
        )

        if it.get("isCoding") and has_clip:
            kind = (
                "CODING ANSWER WITH RECORDING — evaluate code correctness/efficiency/quality "
                "for contentScore as usual, based only on the code itself. Separately, use the "
                "body-language/vocal signals below to note attentiveness in nonverbalNotes/"
                "vocalNotes: sustained looking away from the screen, long silences while typing "
                "with no verbal reasoning, or speech that doesn't match what's being typed. "
                "Phrase this neutrally as an observation (e.g. 'looked away from the screen for "
                "extended periods'), not an accusation of cheating."
            )
        elif it.get("isCoding"):
            kind = "CODING ANSWER, NO RECORDING (evaluate correctness, efficiency, code quality only)"
        else:
            kind = "SPOKEN ANSWER"

        blocks.append(
            f"[{it['index']}] {kind}\n"
            f"Question: {it['question'][:250]}\n"
            f"Answer: {(it.get('answerText') or '')[:800]}{note}\n"
            f"Body language: {vb}\n"
            f"Vocal delivery: {ab}\n"
        )

    prompt = f"""You are an expert interview coach scoring a {experience_level} {job_title} candidate's
full interview. Below are {len(items)} answers, some spoken (with body-language/vocal signals attached)
and some coding answers — some of which ALSO have body-language/vocal signals attached because the
candidate recorded themselves while solving the problem.

{chr(10).join(blocks)}

For SPOKEN answers, combine ALL available signals into one holistic score as usual.

For CODING answers: contentScore/deliveryScore/overallScore should always be based purely on the
code's correctness, efficiency, and quality — never adjusted up or down because of body language or
vocal delivery. If a recording exists for a coding answer, still use nonverbalNotes/vocalNotes to
describe attentiveness patterns from the footage (factual, 1-2 sentences, neutral tone — not an
accusation). If no recording exists for a coding answer, deliveryScore should equal contentScore and
nonverbalNotes/vocalNotes should be empty strings.

Return ONLY valid JSON (no markdown):
{{
  "results": [
    {{
      "index": 1,
      "contentScore": 7,
      "deliveryScore": 6,
      "overallScore": 7,
      "feedback": ["Point 1", "Point 2"],
      "strengths": ["Strength 1"],
      "improvements": ["Improvement 1"],
      "hasExamples": true,
      "nonverbalNotes": "1-2 sentences or empty string",
      "vocalNotes": "1-2 sentences or empty string"
    }}
  ]
}}

Rules: one entry per answer in order given, index matches the bracketed number above,
all scores 0-10 integers, arrays 2-3 items, return ONLY JSON."""

    response_text = call_huggingface(
        prompt, max_tokens=min(300 + len(items) * 220, 3000), model=LLAMA_MODEL,
        system_prompt=(
            "You are an expert interview coach that scores multiple answers — spoken and coding — "
            "in one pass, fusing content with body language and vocal delivery data where available. "
            "For coding answers, code quality alone determines the score; any recording is used only "
            "for a neutral attentiveness note, never to adjust the score. "
            "Respond with ONLY valid, complete JSON — no markdown, no extra commentary."
        )
    )
    return response_text


def generate_executive_summary(job_title, experience_level, per_question_results, overall_pct):
    """
    Synthesizes ALL scored answers (content + delivery + body language) into
    one short, panel-style executive summary paragraph for the top of the report.
    per_question_results: list of dicts, each with at least
      {"question": str, "contentScore": int, "deliveryScore": int, "isCoding": bool}
    Returns a plain-text paragraph, or None if generation fails (caller should
    fall back gracefully — this is a nice-to-have, not a blocker).
    """
    lines = []
    for r in per_question_results:
        lines.append(
            f"- Q: {(r.get('question') or '')[:120]} | "
            f"Content {r.get('contentScore')}/10, Delivery {r.get('deliveryScore')}/10 | "
            f"{'CODING' if r.get('isCoding') else 'SPOKEN'}"
        )
    summary_block = "\n".join(lines)

    prompt = f"""You are a senior hiring panel member writing the executive summary
for a {experience_level} {job_title} candidate's mock interview report.
Overall score: {overall_pct}%.

Per-question results:
{summary_block}

Write a 3-4 sentence executive summary in a professional, direct tone — as if
this were the opening paragraph of a real interview feedback memo sent to a
hiring manager. Mention overall readiness level, 1-2 concrete strengths, and
1-2 concrete areas to improve. No bullet points, no headers, just prose.
Do not use the word "candidate" more than once. Return ONLY the paragraph text,
no markdown, no quotes around it."""

    try:
        text = call_huggingface(
            prompt, max_tokens=220, model=LLAMA_MODEL,
            expect_json=False,
            system_prompt=(
                "You are a senior hiring panel member. Write plain, direct prose only — "
                "no JSON, no markdown, no bullet points. Just the summary paragraph."
            )
        )
        return text.strip().strip('"')
    except Exception as e:
        print(f"⚠️  Executive summary generation failed: {e}")
        return None