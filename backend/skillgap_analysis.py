# backend/skillgap_analysis.py
# Skill-gap analysis: compares a resume against a job description and returns
# present / missing / partial skills plus a prioritised learning roadmap.
#
# Public API:
#     analyze_skill_gap(resume_text, job_description) -> (result_dict | None, error_str | None)

import logging
from urllib.parse import urlparse

from huggingfaceService import call_huggingface
from interview import repair_json

logger = logging.getLogger(__name__)

MAX_JD_CHARS = 3000
MAX_RESUME_CHARS = 3000
MAX_SKILLS_PER_LIST = 25
MAX_ROADMAP_ITEMS = 6
MAX_RESOURCES = 3
MAX_SUBTASKS = 5
AI_ATTEMPTS = 2

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}

PROMPT_TEMPLATE = """You are an expert career coach and technical recruiter. Compare the resume against the job description.

JOB DESCRIPTION:
{jd}

RESUME:
{resume}

Instructions:
- "presentSkills": skills the job requires that the resume clearly demonstrates.
- "partialSkills": skills the resume only touches on or shows at a lower level than required.
- "missingSkills": skills the job requires that the resume does not show.
- A skill must appear in exactly ONE of the three lists.
- Use short, canonical skill names (e.g. "React", "SQL", "Docker"), not sentences.
- "roadmap": a learning plan for the missing/partial skills, most important first, max {max_items} items.
- "priority" must be one of: high, medium, low.
- "matchScore" is 0-100: how close the candidate currently is to the skill requirement.
- Only include resource URLs you are confident are real (official docs, well-known sites).

Return ONLY valid JSON (no markdown, no commentary) in exactly this shape:
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
      "matchScore": 40,
      "description": "Why this skill matters and how to learn it.",
      "resources": [{{"name": "Resource", "url": "https://example.com"}}],
      "subtasks": ["Task 1", "Task 2", "Task 3"]
    }}
  ]
}}"""


# ─── Normalisation helpers ────────────────────────────────────────────────────

def _clean_str(value, max_len=500):
    return str(value).strip()[:max_len] if value is not None else ""


def _clean_skill_list(values):
    """Strip, drop empties/non-strings, de-duplicate (case-insensitive), cap length."""
    if not isinstance(values, list):
        return []
    seen, out = set(), []
    for v in values:
        if not isinstance(v, (str, int, float)):
            continue
        name = _clean_str(v, 80)
        key = name.lower()
        if name and key not in seen:
            seen.add(key)
            out.append(name)
        if len(out) >= MAX_SKILLS_PER_LIST:
            break
    return out


def _valid_url(url):
    try:
        p = urlparse(str(url).strip())
        return p.scheme in {"http", "https"} and bool(p.netloc)
    except Exception:
        return False


def _clean_resources(resources):
    if not isinstance(resources, list):
        return []
    out = []
    for r in resources:
        if not isinstance(r, dict) or not _valid_url(r.get("url")):
            continue
        out.append({
            "name": _clean_str(r.get("name") or r.get("url"), 120),
            "url": _clean_str(r["url"], 500),
        })
        if len(out) >= MAX_RESOURCES:
            break
    return out


def _clean_roadmap_item(item):
    if not isinstance(item, dict):
        return None
    skill = _clean_str(item.get("skill"), 80)
    if not skill:
        return None

    priority = _clean_str(item.get("priority"), 10).lower()
    if priority not in PRIORITY_ORDER:
        priority = "medium"

    try:
        score = max(0, min(100, int(float(item.get("matchScore", 0)))))
    except (TypeError, ValueError):
        score = 0

    subtasks = item.get("subtasks")
    subtasks = [_clean_str(s, 200) for s in subtasks if s] if isinstance(subtasks, list) else []

    return {
        "skill": skill,
        "priority": priority,
        "timeframe": _clean_str(item.get("timeframe"), 40) or "2-3 weeks",
        "matchScore": score,
        "description": _clean_str(item.get("description"), 600),
        "resources": _clean_resources(item.get("resources")),
        "subtasks": subtasks[:MAX_SUBTASKS],
    }


def _fallback_roadmap(missing, partial):
    """Used only when the AI returns no usable roadmap."""
    items = [(s, "high", 0) for s in missing[:4]] + [(s, "medium", 50) for s in partial[:2]]
    return [{
        "skill": s,
        "priority": p,
        "timeframe": "2-3 weeks",
        "matchScore": score,
        "description": f"Build practical, project-based experience with {s}.",
        "resources": [],
        "subtasks": [f"Learn the fundamentals of {s}",
                     f"Build a small project using {s}",
                     f"Add {s} to your resume"],
    } for s, p, score in items][:MAX_ROADMAP_ITEMS]


def _normalise(raw):
    """Turn raw AI output into a clean, consistent result dict (or None if unusable)."""
    if not isinstance(raw, dict):
        return None

    present = _clean_skill_list(raw.get("presentSkills"))
    partial = _clean_skill_list(raw.get("partialSkills"))
    missing = _clean_skill_list(raw.get("missingSkills"))

    # A skill can only live in one list: present > partial > missing
    present_keys = {s.lower() for s in present}
    partial = [s for s in partial if s.lower() not in present_keys]
    partial_keys = {s.lower() for s in partial}
    missing = [s for s in missing if s.lower() not in present_keys | partial_keys]

    if not (present or partial or missing):
        return None

    roadmap = [i for i in (_clean_roadmap_item(r) for r in (raw.get("roadmap") or [])) if i]
    if not roadmap:
        roadmap = _fallback_roadmap(missing, partial)
    roadmap.sort(key=lambda r: PRIORITY_ORDER[r["priority"]])  # stable sort
    roadmap = roadmap[:MAX_ROADMAP_ITEMS]

    total = len(present) + len(partial) + len(missing)
    match_pct = round(((len(present) + 0.5 * len(partial)) / total) * 100) if total else 0

    return {
        "presentSkills": present,
        "missingSkills": missing,
        "partialSkills": partial,
        "summary": _clean_str(raw.get("summary"), 800),
        "totalTimeframe": _clean_str(raw.get("totalTimeframe"), 40),
        "matchPercentage": match_pct,
        "roadmap": roadmap,
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def analyze_skill_gap(resume_text, job_description):
    """
    Returns (result, error). Exactly one of them is None.
    """
    resume_text = (resume_text or "").strip()
    job_description = (job_description or "").strip()

    if not job_description:
        return None, "Job description is required."
    if len(resume_text) < 50:
        return None, "Could not extract resume text. Please try a different file."

    prompt = PROMPT_TEMPLATE.format(
        jd=job_description[:MAX_JD_CHARS],
        resume=resume_text[:MAX_RESUME_CHARS],
        max_items=MAX_ROADMAP_ITEMS,
    )

    for attempt in range(1, AI_ATTEMPTS + 1):
        try:
            response_text = call_huggingface(prompt, max_tokens=2200)
            result = _normalise(repair_json(response_text))
            if result:
                return result, None
            logger.warning("Skill gap: unusable AI output (attempt %d/%d)", attempt, AI_ATTEMPTS)
        except Exception:
            logger.exception("Skill gap: AI call failed (attempt %d/%d)", attempt, AI_ATTEMPTS)

    return None, "Failed to generate a skill gap analysis. Please try again."