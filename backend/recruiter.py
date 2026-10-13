# backend/recruiter.py - Recruiter-side API (Flask Blueprint)
#
# Endpoints (all under /api/recruiter, all POST except /health):
#   POST /match               rank candidates against a job post (skill overlap + role + ATS + experience)
#   POST /generate-jd         draft a job description / requirements / perks / tags from a few inputs
#   POST /interview-questions build an interview kit for a candidate (technical + behavioural)
#   POST /message-template    fill invite / shortlist / interview / offer / rejection templates
#   GET  /health
#
# Auth: every route (except /health) needs a Supabase access token:
#   Authorization: Bearer <access_token>
# The token is verified against Supabase and the user must have
# user_metadata.role == "recruiter".
# Set env vars on Render:  SUPABASE_URL, SUPABASE_ANON_KEY
# (If they are missing, auth is skipped ONLY when FLASK_ENV=development.)
#
# requires: pip install requests

import logging
import os
import re
from functools import wraps

import requests
from flask import Blueprint, jsonify, request

logger = logging.getLogger("prepmate.recruiter")

recruiter_bp = Blueprint("recruiter", __name__, url_prefix="/api/recruiter")

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or ""
ENV = os.getenv("FLASK_ENV", "development")

MAX_CANDIDATES = 500


# ─── Auth ─────────────────────────────────────────────────────────────────────

def _verify_recruiter(token):
    """Returns (user_dict | None, error | None)."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        if ENV == "development":
            return {"id": "dev", "user_metadata": {"role": "recruiter"}}, None
        return None, "Server auth is not configured."
    try:
        r = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"},
            timeout=8,
        )
    except requests.RequestException as e:
        logger.warning("Supabase auth check failed: %s", e)
        return None, "Could not verify session."
    if r.status_code != 200:
        return None, "Invalid or expired session."
    user = r.json()
    if (user.get("user_metadata") or {}).get("role") != "recruiter":
        return None, "Recruiter access only."
    return user, None


def recruiter_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        token = header[7:].strip() if header.lower().startswith("bearer ") else ""
        if not token and not (ENV == "development" and not SUPABASE_URL):
            return jsonify({"error": "Missing authorization token."}), 401
        user, err = _verify_recruiter(token)
        if err:
            return jsonify({"error": err}), 401 if "session" in err or "token" in err else 403
        request.recruiter = user
        return fn(*args, **kwargs)
    return wrapper


def _body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


# ─── Skill normalisation ──────────────────────────────────────────────────────

ALIASES = {
    "js": "javascript", "ecmascript": "javascript", "ts": "typescript",
    "reactjs": "react", "react.js": "react", "nodejs": "node", "node.js": "node",
    "expressjs": "express", "express.js": "express", "vuejs": "vue", "vue.js": "vue",
    "nextjs": "next.js", "next": "next.js", "py": "python", "golang": "go",
    "postgres": "postgresql", "mongo": "mongodb", "k8s": "kubernetes",
    "ml": "machine learning", "dl": "deep learning", "ai": "artificial intelligence",
    "c plus plus": "c++", "cpp": "c++", "csharp": "c#", "html5": "html", "css3": "css",
    "amazon web services": "aws", "gcp": "google cloud", "sklearn": "scikit-learn",
}


def norm_skill(s):
    s = re.sub(r"\s+", " ", str(s or "").strip().lower())
    s = s.strip(".,;:()[]")
    return ALIASES.get(s, s)


def skill_set(items):
    if isinstance(items, str):
        items = re.split(r"[,\n;/|]", items)
    return {norm_skill(i) for i in (items or []) if norm_skill(i)}


def text_mentions(text, skill):
    """Whole-word-ish match so 'java' does not match 'javascript'."""
    if not text or not skill:
        return False
    pattern = r"(?<![a-z0-9+#.])" + re.escape(skill) + r"(?![a-z0-9+#])"
    return re.search(pattern, text.lower()) is not None


EXP_LEVELS = {"intern": 0, "fresher": 0, "entry": 0, "junior": 1, "mid": 2, "senior": 3, "lead": 4}


def exp_years(text):
    m = re.search(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:yrs?|years?)", str(text or "").lower())
    if m:
        return float(m.group(1))
    t = str(text or "").lower()
    if "fresher" in t or "intern" in t:
        return 0.0
    return None


def required_years(job):
    blob = f"{job.get('title', '')} {job.get('requirements', '')} {job.get('description', '')}".lower()
    m = re.search(r"(\d+)\s*\+?\s*(?:yrs?|years?)", blob)
    if m:
        return float(m.group(1))
    if job.get("type", "").lower() == "internship" or "intern" in blob:
        return 0.0
    if "senior" in blob or "lead" in blob:
        return 4.0
    return None


# ─── Match scoring ────────────────────────────────────────────────────────────

def score_candidate(cand, job):
    job_skills = skill_set(job.get("tags"))
    # Pull extra skills the recruiter wrote in requirements but did not tag
    cand_skills = skill_set(cand.get("skills"))
    jd_blob = f"{job.get('requirements', '')} {job.get('description', '')}"
    for s in cand_skills:
        if s not in job_skills and text_mentions(jd_blob, s):
            job_skills.add(s)

    matched = sorted(s for s in job_skills if s in cand_skills)
    missing = sorted(s for s in job_skills if s not in cand_skills)

    # 1) Skill overlap (60)
    skill_score = 60 * (len(matched) / len(job_skills)) if job_skills else 30

    # 2) Role / title similarity (20)
    title_words = {w for w in re.findall(r"[a-z+#.]{3,}", str(job.get("title", "")).lower())} - {
        "the", "and", "for", "with", "senior", "junior", "lead", "intern", "internship"}
    role_blob = f"{cand.get('role', '')} {' '.join(cand_skills)}".lower()
    role_hits = sum(1 for w in title_words if w in role_blob)
    role_score = 20 * (role_hits / len(title_words)) if title_words else 10

    # 3) ATS score 0-10 (10)
    ats = cand.get("ats_score")
    try:
        ats_score = 10 * min(max(float(ats), 0), 10) / 10
    except (TypeError, ValueError):
        ats_score = 4  # unknown -> neutral-ish

    # 4) Experience fit (10)
    need, have = required_years(job), exp_years(cand.get("experience"))
    if need is None or have is None:
        exp_score = 6
    elif have >= need:
        exp_score = 10
    else:
        exp_score = max(0, 10 * (have / need))

    total = round(min(100, skill_score + role_score + ats_score + exp_score))
    return {
        "id": cand.get("id"),
        "score": total,
        "matchedSkills": matched,
        "missingSkills": missing[:8],
        "breakdown": {
            "skills": round(skill_score), "role": round(role_score),
            "ats": round(ats_score), "experience": round(exp_score),
        },
        "label": "Strong match" if total >= 75 else "Good match" if total >= 50 else "Partial match",
    }


@recruiter_bp.route("/match", methods=["POST"])
@recruiter_required
def match():
    data = _body()
    job = data.get("job")
    candidates = data.get("candidates")
    if not isinstance(job, dict) or not isinstance(candidates, list):
        return jsonify({"error": "'job' and 'candidates' are required."}), 400
    results = [score_candidate(c, job) for c in candidates[:MAX_CANDIDATES] if isinstance(c, dict)]
    results.sort(key=lambda r: r["score"], reverse=True)
    return jsonify({"results": results}), 200


# ─── Job description generator ────────────────────────────────────────────────

ROLE_PACKS = {
    "frontend": {
        "resp": ["Build responsive, accessible user interfaces", "Turn designs into reusable components",
                 "Optimise performance and Core Web Vitals", "Collaborate with designers and backend engineers"],
        "tags": ["React", "JavaScript", "HTML", "CSS", "Git"],
    },
    "backend": {
        "resp": ["Design and ship scalable REST APIs", "Model data and write efficient queries",
                 "Write tests and maintain CI pipelines", "Monitor, debug and improve production systems"],
        "tags": ["Python", "Node", "SQL", "REST", "Git"],
    },
    "full stack": {
        "resp": ["Own features end-to-end, from database to UI", "Build APIs and integrate them in the frontend",
                 "Review code and improve engineering practices", "Work closely with product on priorities"],
        "tags": ["React", "Node", "SQL", "REST", "Git"],
    },
    "data": {
        "resp": ["Clean, explore and analyse large datasets", "Build dashboards and communicate insights",
                 "Develop and evaluate predictive models", "Work with stakeholders to define metrics"],
        "tags": ["Python", "SQL", "Pandas", "Statistics", "Machine Learning"],
    },
    "devops": {
        "resp": ["Automate build, test and deployment pipelines", "Manage cloud infrastructure as code",
                 "Improve reliability, observability and cost", "Respond to incidents and write postmortems"],
        "tags": ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux"],
    },
    "design": {
        "resp": ["Research users and define flows", "Create wireframes, prototypes and polished UI",
                 "Maintain the design system", "Partner with engineers through delivery"],
        "tags": ["Figma", "UX Research", "Prototyping", "Design Systems"],
    },
    "default": {
        "resp": ["Deliver high-quality work against clear goals", "Collaborate across teams",
                 "Communicate progress and blockers early", "Continuously learn and improve"],
        "tags": [],
    },
}

PERKS_BY_TYPE = {
    "internship": ["Mentorship from senior engineers", "Certificate and letter of recommendation",
                   "Pre-placement offer opportunity for top performers"],
    "full-time": ["Health insurance", "Flexible working hours", "Learning and certification budget",
                  "Performance bonus"],
    "part-time": ["Flexible schedule", "Remote-friendly", "Skill-building projects"],
    "contract": ["Competitive rate", "Fixed-scope projects", "Possible extension"],
    "freelance": ["Choose your hours", "Remote-first", "Project-based payments"],
}


def _pack_for(title):
    t = title.lower()
    for key in ("full stack", "frontend", "front-end", "backend", "back-end", "devops", "data", "design", "ui"):
        if key in t:
            k = {"front-end": "frontend", "back-end": "backend", "ui": "design"}.get(key, key)
            return ROLE_PACKS[k]
    return ROLE_PACKS["default"]


@recruiter_bp.route("/generate-jd", methods=["POST"])
@recruiter_required
def generate_jd():
    d = _body()
    title = str(d.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Job title is required."}), 400

    jtype = str(d.get("type") or "Full-time")
    location = str(d.get("location") or "").strip()
    company = str(d.get("company") or "our team").strip()
    skills = [s for s in (d.get("skills") or []) if str(s).strip()]
    pack = _pack_for(title)
    tags = list(dict.fromkeys([*skills, *pack["tags"]]))[:10]
    where = f" ({location})" if location else ""

    level = "an intern" if jtype.lower() == "internship" else "a team member"
    description = (
        f"{company} is hiring {level} for the role of {title}{where}. "
        f"You will work on real problems with real users and grow quickly alongside experienced colleagues.\n\n"
        "What you will do:\n" + "\n".join(f"- {r}" for r in pack["resp"])
    )
    req_lines = [f"Hands-on experience with {', '.join(tags[:4])}" if tags else "Relevant hands-on experience",
                 "Strong problem-solving and communication skills",
                 "A portfolio, GitHub or projects that show your work"]
    if jtype.lower() == "internship":
        req_lines.append("Currently pursuing or recently completed a relevant degree")
    else:
        req_lines.append("Ability to work independently and in a team")
    perks = PERKS_BY_TYPE.get(jtype.lower(), PERKS_BY_TYPE["full-time"])

    return jsonify({
        "description": description,
        "requirements": "\n".join(f"- {l}" for l in req_lines),
        "perks": ", ".join(perks),
        "tags": tags,
    }), 200


# ─── Interview kit ────────────────────────────────────────────────────────────

TECH_Q = [
    "Walk me through a project where you used {s}. What was hard and how did you solve it?",
    "What are common mistakes people make with {s}, and how do you avoid them?",
    "How would you debug a production problem involving {s}?",
    "When would you NOT choose {s}? What would you use instead?",
]
BEHAVIOURAL = [
    "Tell me about a time you had to learn something quickly to deliver on a deadline.",
    "Describe a disagreement with a teammate and how you resolved it.",
    "Tell me about a project you are proud of. What was your specific contribution?",
    "How do you prioritise when everything feels urgent?",
    "Describe a time you received critical feedback. What did you change?",
]
FRESHER_Q = [
    "Which academic or personal project best shows your skills? Why?",
    "How do you keep learning outside your coursework?",
]
SENIOR_Q = [
    "Describe a technical decision you owned. What trade-offs did you weigh?",
    "How do you mentor teammates and raise the quality bar?",
]


@recruiter_bp.route("/interview-questions", methods=["POST"])
@recruiter_required
def interview_questions():
    d = _body()
    cand = d.get("candidate") if isinstance(d.get("candidate"), dict) else {}
    job = d.get("job") if isinstance(d.get("job"), dict) else {}

    cand_skills = [str(s).strip() for s in (cand.get("skills") or []) if str(s).strip()]
    job_skills = [str(s).strip() for s in (job.get("tags") or []) if str(s).strip()]
    # prioritise skills the job needs AND the candidate claims, then job-only gaps
    cs = skill_set(cand_skills)
    focus = [s for s in job_skills if norm_skill(s) in cs] or cand_skills
    gaps = [s for s in job_skills if norm_skill(s) not in cs]

    technical = []
    for i, s in enumerate(focus[:4]):
        technical.append({"skill": s, "question": TECH_Q[i % len(TECH_Q)].format(s=s)})
    probes = [{"skill": s, "question": f"The role needs {s}, which is not on your resume. "
                                       f"What related experience do you have, and how fast could you ramp up?"}
              for s in gaps[:2]]

    yrs = exp_years(cand.get("experience"))
    behavioural = list(BEHAVIOURAL[:3]) + (FRESHER_Q if (yrs is not None and yrs < 1) else SENIOR_Q if (yrs or 0) >= 4 else [])

    return jsonify({
        "technical": technical,
        "gapProbes": probes,
        "behavioural": behavioural,
        "scorecard": ["Technical skills", "Problem solving", "Communication", "Culture & motivation"],
    }), 200


# ─── Message templates ────────────────────────────────────────────────────────

TEMPLATES = {
    "invite": "Hi {name},\n\nWe reviewed your profile on PrepMate and were impressed by your background. "
              "We'd love to invite you to interview for the {job} role at {company}.\n\n"
              "Please reply here with a time that works for you this week.\n\nBest regards,\n{recruiter}",
    "shortlist": "Hi {name},\n\nGood news - you've been shortlisted for {job} at {company}. "
                 "We'll share the next steps shortly. Feel free to ask any questions here.\n\nBest regards,\n{recruiter}",
    "interview": "Hi {name},\n\nWe'd like to schedule your interview for {job}. "
                 "Could you share 2-3 slots that work for you? The interview will take about 45 minutes.\n\n"
                 "Best regards,\n{recruiter}",
    "offer": "Hi {name},\n\nCongratulations! We're delighted to offer you the {job} position at {company}. "
             "We'll send the formal offer details here. Please let us know if you have any questions.\n\n"
             "Warm regards,\n{recruiter}",
    "rejection": "Hi {name},\n\nThank you for your interest in the {job} role at {company} and for the time you invested. "
                 "After careful consideration we won't be moving forward this time. "
                 "We'll keep your profile in mind for future openings.\n\nBest wishes,\n{recruiter}",
}


@recruiter_bp.route("/message-template", methods=["POST"])
@recruiter_required
def message_template():
    d = _body()
    kind = str(d.get("kind") or "invite").lower()
    if kind not in TEMPLATES:
        return jsonify({"error": f"Unknown template. Use one of: {', '.join(TEMPLATES)}"}), 400

    class _Safe(dict):
        def __missing__(self, key):
            return "{" + key + "}"

    text = TEMPLATES[kind].format_map(_Safe(
        name=d.get("candidateName") or "there",
        job=d.get("jobTitle") or "open",
        company=d.get("company") or "our company",
        recruiter=d.get("recruiterName") or "The Hiring Team",
    ))
    return jsonify({"kind": kind, "message": text}), 200


@recruiter_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "module": "recruiter"}), 200