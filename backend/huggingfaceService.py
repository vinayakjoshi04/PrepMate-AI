# backend/huggingfaceService.py
# LLM wrapper. Function names are unchanged (call_huggingface etc.) so
# interview.py, resumeanalyzer.py and app.py keep working without edits.
#
# CHANGELOG (this revision):
#   - Transport is Groq's free tier (OpenAI-compatible API). Whisper is
#     unaffected: it runs locally.
#   - Default model is now openai/gpt-oss-20b (Groq no longer lists Llama chat
#     models for this key). gpt-oss models are REASONING models: they spend
#     part of the token budget thinking before they answer. To avoid empty or
#     truncated replies this file:
#       * sends reasoning_effort="low" for gpt-oss models,
#       * adds REASONING_HEADROOM extra tokens to every request,
#       * treats an empty reply as a failed attempt and retries.
#   - JSON mode (response_format=json_object) is tried first for JSON calls;
#     if Groq rejects it for the model, the call is retried once without it
#     (the JSON-extraction/validation code below still handles the output).
#   - Temperature is a parameter. Default: 0.3 for JSON calls, 0.7 for plain text.
#
# .env needs:
#   GROQ_API_KEY=gsk_...
# Optional:
#   GROQ_MODEL=openai/gpt-oss-20b     (or openai/gpt-oss-120b for higher quality)
#
# To list the models your key can use:
#   python -c "import os,requests; from dotenv import load_dotenv; load_dotenv(); r=requests.get('https://api.groq.com/openai/v1/models', headers={'Authorization':'Bearer '+os.getenv('GROQ_API_KEY')}); [print(m['id']) for m in r.json()['data']]"

import os
import time
import json
import re

import requests
from dotenv import load_dotenv

load_dotenv(override=True)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Extra tokens added on top of max_tokens for reasoning models, so the model's
# internal thinking doesn't eat the budget meant for the actual answer.
REASONING_HEADROOM = 600

print(f"🔑 Using Groq key ending in: ...{GROQ_API_KEY[-6:] if GROQ_API_KEY else 'MISSING'}")
print(f"🤖 Active model: {GROQ_MODEL}")

ACTIVE_MODEL = GROQ_MODEL

RATE_LIMIT_DELAY = 2
last_request_time = 0

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


def _is_reasoning_model(model):
    return "gpt-oss" in (model or "").lower()


def groq_chat(messages, model, max_tokens, temperature=0.3, stop=None, json_mode=False):
    """Single call to Groq's OpenAI-compatible chat endpoint. Returns the text."""
    if not GROQ_API_KEY:
        raise Exception(
            "GROQ_API_KEY is missing from .env. "
            "Get a free key at: https://console.groq.com/keys"
        )

    reasoning = _is_reasoning_model(model)

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens + (REASONING_HEADROOM if reasoning else 0),
        "temperature": temperature,
    }
    if reasoning:
        payload["reasoning_effort"] = "low"
    if stop:
        payload["stop"] = stop
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    def _post(body):
        return requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json=body,
            timeout=90,
        )

    r = _post(payload)

    # If this model rejects JSON mode, retry once without it. The validation
    # and extraction logic in call_huggingface still checks the JSON.
    if r.status_code == 400 and json_mode:
        low = r.text.lower()
        if "response_format" in low or "json" in low:
            print("⚠️  JSON mode rejected for this model, retrying without it...")
            payload.pop("response_format", None)
            r = _post(payload)

    if r.status_code != 200:
        raise Exception(f"{r.status_code} Groq error: {r.text[:400]}")

    content = r.json()["choices"][0]["message"].get("content") or ""
    if not content.strip():
        raise Exception("Empty reply from model (reasoning used the whole token budget)")
    return content


def call_huggingface(prompt, max_tokens=3072, retry_count=5, model=None, system_prompt=None,
                     expect_json=True, temperature=None):
    """LLM call with retry logic. (Name kept for backward compatibility; it now
    talks to Groq.)

    expect_json=True  -> JSON system prompt, JSON mode, validate/retry on bad JSON.
    expect_json=False -> plain-text system prompt, no JSON validation.
    temperature       -> defaults to 0.3 for JSON calls, 0.7 for plain text.
    """
    rate_limit()

    model_to_use = model or ACTIVE_MODEL
    if temperature is None:
        temperature = 0.3 if expect_json else 0.7

    default_system_prompt = DEFAULT_JSON_SYSTEM_PROMPT if expect_json else DEFAULT_PLAIN_TEXT_SYSTEM_PROMPT

    messages = [
        {"role": "system", "content": system_prompt or default_system_prompt},
        {"role": "user", "content": prompt},
    ]

    # Stop sequences: JSON output must not be cut by "\n\n\n", so only use
    # them for plain-text calls.
    stop = None if expect_json else ["```"]

    last_error = None

    for attempt in range(retry_count):
        try:
            print(f"🔄 [{model_to_use}] Attempt {attempt + 1}/{retry_count}...")

            generated_text = groq_chat(
                messages=messages,
                model=model_to_use,
                max_tokens=max_tokens,
                temperature=temperature,
                stop=stop,
                json_mode=expect_json,
            )
            print(f"📝 Received {len(generated_text)} characters")

            if not expect_json:
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
                return generated_text

        except Exception as e:
            error_msg = str(e)
            last_error = e
            print(f"❌ Attempt {attempt + 1} failed: {error_msg}")

            low = error_msg.lower()

            # Bad key: retrying is pointless
            if "401" in error_msg or "invalid api key" in low or "unauthorized" in low:
                raise Exception(
                    "Invalid Groq API key. Check GROQ_API_KEY in .env "
                    "(create one at https://console.groq.com/keys)."
                )

            # Model name wrong / removed: retrying is pointless
            if "model_not_found" in low or "does not exist" in low or "decommissioned" in low:
                raise Exception(
                    f"Model '{model_to_use}' is not available on Groq. "
                    f"Set GROQ_MODEL in .env to a current model. Original error: {error_msg}"
                )

            # Rate limit: wait and retry
            if "429" in error_msg or "rate limit" in low:
                if attempt < retry_count - 1:
                    wait_time = 8 * (attempt + 1)
                    print(f"⏳ Rate limited, waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                raise Exception("Groq rate limit exceeded. Wait a minute and try again.")

            # Temporary server trouble: wait and retry
            if any(code in error_msg for code in ("500", "502", "503", "504")) or "overloaded" in low:
                wait_time = 5 * (attempt + 1)
                print(f"⏳ Groq temporarily unavailable, waiting {wait_time}s...")
                time.sleep(wait_time)
                continue

            if attempt < retry_count - 1:
                time.sleep(3)
                continue
            raise Exception(f"LLM API error after {retry_count} attempts: {error_msg}")

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

    # Slightly higher temperature here: question variety is a feature.
    text = call_huggingface(prompt, max_tokens=3072, temperature=0.7)
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
    Synthesizes verbal (answer content) + non-verbal (video) + vocal-delivery
    (audio) signals into one combined feedback report.
    video_metrics / audio_metrics may be None or contain an 'error' key if that
    modality wasn't available; the prompt degrades gracefully.
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
        prompt, max_tokens=900, model=ACTIVE_MODEL,
        system_prompt=(
            "You are an expert interview coach that fuses verbal content with body "
            "language and vocal delivery data into one JSON report. Respond with ONLY "
            "valid, complete JSON — no markdown, no extra commentary."
        )
    )
    return response_text


def _build_signal_blocks(answer_text, video_metrics, audio_metrics):
    """Shared helper: turns raw video/audio metrics into short prompt-ready
    summary strings."""
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

    Coding items may also carry videoMetrics/audioMetrics if the person
    recorded themselves while coding. The signal is used only for a neutral
    attentiveness note; contentScore stays based purely on code quality.

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
        prompt, max_tokens=min(300 + len(items) * 220, 3000), model=ACTIVE_MODEL,
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
    Synthesizes ALL scored answers into one short, panel-style executive
    summary paragraph for the top of the report.
    per_question_results: list of dicts, each with at least
      {"question": str, "contentScore": int, "deliveryScore": int, "isCoding": bool}
    Returns a plain-text paragraph, or None if generation fails (caller should
    fall back gracefully).
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
            prompt, max_tokens=220, model=ACTIVE_MODEL,
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