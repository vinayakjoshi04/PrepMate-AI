# backend/resumeanalyzer.py - PRODUCTION READY
# ─────────────────────────────────────────────────────────────────────────────
# Everything related to resume handling lives here:
#   • Text extraction (PDF / DOC / DOCX / TXT)
#   • File / format validation
#   • Prompt construction (deep analysis, strengths/weaknesses, JD-tailored
#     ATS resume rewrite)
#   • Calling the AI model + JSON repair / normalization
#   • Building a downloadable ATS resume as real .docx and .pdf files
#
# app.py only orchestrates HTTP routes and imports everything it needs
# from this module.
#
# CHANGELOG (this revision):
#   - FIX (root cause of "downloaded doc is JSON"): generate_ats_resume() now
#     calls call_huggingface(..., expect_json=False) with an explicit
#     plain-text system_prompt. Previously it relied on call_huggingface()'s
#     default system prompt, which forces JSON ("You MUST respond with ONLY
#     valid, complete JSON") — directly contradicting this function's own
#     user-prompt instruction to return plain resume text. That's what caused
#     the model to wrap the resume in JSON, which then leaked into the
#     exported .docx/.pdf. _unwrap_if_json() is kept as a safety net only.
#   - build_ats_rewrite_prompt() strengthened for better resume quality:
#     stronger guidance on action verbs, honest quantification (never invents
#     numbers), a punchier professional summary, and de-duplicated bullet
#     openers so every line doesn't start with the same verb.
# ─────────────────────────────────────────────────────────────────────────────

import os
import re
import io
import traceback

from huggingfaceService import call_huggingface
from interview import repair_json  # shared JSON-repair helper

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


# ─────────────────────────────────────────────────────────────────────────────
# FILE VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_resume_file(file):
    """Returns (is_valid, error_message)."""
    if not file or not file.filename:
        return False, "No file selected"
    if not allowed_file(file.filename):
        return False, "Invalid file type. Please upload PDF, DOC, or DOCX"
    return True, None


# ─────────────────────────────────────────────────────────────────────────────
# TEXT EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_path):
    try:
        import PyPDF2
        text = ""
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        return text
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return None


def extract_text_from_docx(file_path):
    try:
        import docx
        doc = docx.Document(file_path)
        parts = [p.text for p in doc.paragraphs]
        # also pull text out of tables, since many resumes use them
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        parts.append(cell.text)
        return "\n".join(parts)
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return None


def extract_text_from_doc(file_path):
    try:
        import docx
        doc = docx.Document(file_path)
        text = "\n".join(p.text for p in doc.paragraphs)
        return text if text.strip() else None
    except Exception:
        try:
            with open(file_path, 'rb') as f:
                return f.read().decode('utf-8', errors='ignore') or None
        except Exception:
            return None


def extract_resume_text(file_path, filename):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext == 'pdf':
        return extract_text_from_pdf(file_path)
    elif ext == 'docx':
        return extract_text_from_docx(file_path)
    elif ext == 'doc':
        return extract_text_from_doc(file_path)
    elif ext == 'txt':
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            print(f"TXT read error: {e}")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# FORMAT / STRUCTURE CHECKS (deterministic, no AI needed)
# These are quick heuristics layered on top of the AI analysis so the report
# always contains some hard facts even if the model misses something.
# ─────────────────────────────────────────────────────────────────────────────

SECTION_PATTERNS = {
    "contact":    r"(email|phone|linkedin|@)",
    "summary":    r"(summary|objective|profile)",
    "experience": r"(experience|employment|work history)",
    "education":  r"(education|university|college|degree|b\.?tech|bachelor|master)",
    "skills":     r"(skills|technologies|tools|competencies)",
}


def run_format_checks(resume_text):
    """Deterministic structural checks — returned alongside the AI analysis."""
    text_lower = resume_text.lower()
    checks = []

    # section presence
    for name, pattern in SECTION_PATTERNS.items():
        present = bool(re.search(pattern, text_lower))
        checks.append({
            "check": f"{name.capitalize()} section present",
            "passed": present,
            "detail": "Found" if present else f"No clear {name} section detected"
        })

    # length check
    word_count = len(resume_text.split())
    length_ok = 250 <= word_count <= 1100
    checks.append({
        "check": "Appropriate length",
        "passed": length_ok,
        "detail": f"{word_count} words "
                  f"({'good range' if length_ok else 'too short' if word_count < 250 else 'too long, consider trimming'})"
    })

    # bullet / action-verb usage
    bullet_like = len(re.findall(r"(^|\n)\s*[•\-\*]", resume_text))
    checks.append({
        "check": "Uses bullet points",
        "passed": bullet_like >= 3,
        "detail": f"{bullet_like} bullet-style lines detected"
    })

    # quantified achievements (numbers / %)
    numbers_found = len(re.findall(r"\b\d+%|\b\d+[\+xX]|\$\d+|\b\d{2,}\b", resume_text))
    checks.append({
        "check": "Contains quantified achievements",
        "passed": numbers_found >= 2,
        "detail": f"{numbers_found} numeric/metric mentions found"
    })

    # potential ATS-unfriendly elements
    has_tables_hint = "\t\t" in resume_text  # crude signal only
    checks.append({
        "check": "No obvious table/column artifacts",
        "passed": not has_tables_hint,
        "detail": "Looks like plain flowing text" if not has_tables_hint
                  else "Possible multi-column/table layout detected — may confuse ATS parsers"
    })

    # email / phone format sanity
    has_email = bool(re.search(r"[\w\.-]+@[\w\.-]+\.\w+", resume_text))
    has_phone = bool(re.search(r"(\+?\d[\d\-\s\(\)]{7,}\d)", resume_text))
    checks.append({
        "check": "Valid contact details found",
        "passed": has_email and has_phone,
        "detail": f"Email: {'✓' if has_email else '✗'}  Phone: {'✓' if has_phone else '✗'}"
    })

    passed_count = sum(1 for c in checks if c["passed"])
    return {
        "checks": checks,
        "passedCount": passed_count,
        "totalChecks": len(checks),
        "wordCount": word_count,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PROMPTS
# ─────────────────────────────────────────────────────────────────────────────

def build_deep_analysis_prompt(resume_text, job_description=""):
    """
    Full, structured breakdown: every line item mentioned in the resume is
    evaluated. Produces ATS score, per-section feedback, a POINT-BY-POINT
    list of positives and negatives (not just 3-4 generic bullets), keyword
    gaps, and — if a JD is supplied — a job-match verdict.
    """
    resume_snippet = resume_text[:6000]
    jd_block = f"\nTARGET JOB DESCRIPTION:\n{job_description[:2000]}\n" if job_description else ""
    jd_instruction = (
        "Also compare the resume directly against the job description: list "
        "which required qualifications are met, which are missing, and give "
        "a jobMatchScore (0-100)."
        if job_description else
        "No job description was supplied, so leave jobMatchScore as null and "
        "jobMatchNotes as an empty string."
    )

    return f"""You are a senior ATS (Applicant Tracking System) auditor and professional resume reviewer
with 15+ years of experience screening resumes for Fortune 500 recruiting pipelines.

Analyze the ENTIRE resume below, line by line. Do not skip any section. For every
distinct claim, bullet, role, or line in the resume, decide whether it helps or hurts
the candidate's chances, and surface it individually rather than summarizing broadly.

RESUME:
{resume_snippet}
{jd_block}
{jd_instruction}

Return ONLY this JSON (no markdown fences, no commentary):

{{
  "atsScore": 75,
  "overallVerdict": "1-2 sentence blunt verdict on ATS readiness and overall quality.",
  "sectionFeedback": [
    {{"section": "Contact Information",  "score": 85, "feedback": "...", "suggestions": ["...", "..."]}},
    {{"section": "Professional Summary", "score": 70, "feedback": "...", "suggestions": ["...", "..."]}},
    {{"section": "Work Experience",      "score": 72, "feedback": "...", "suggestions": ["...", "..."]}},
    {{"section": "Education",            "score": 80, "feedback": "...", "suggestions": ["...", "..."]}},
    {{"section": "Skills",               "score": 65, "feedback": "...", "suggestions": ["...", "..."]}}
  ],
  "positives": [
    "Point-by-point list of EVERY genuinely strong item found in the resume — specific bullets, roles, achievements, formatting choices. Aim for 8-15 items, one per distinct thing found, not generic praise."
  ],
  "negatives": [
    "Point-by-point list of EVERY weak, missing, vague, or risky item found — one per issue. Aim for 8-15 items. Be specific: quote or paraphrase the offending line and say exactly why it's a problem."
  ],
  "keywordGaps": ["Agile", "Stakeholder Management", "Data Analysis", "Python", "KPIs"],
  "keywordsFound": ["Keyword actually present in the resume", "..."],
  "strengths": ["Short exec-summary strengths (3-5 items) for the overview tab"],
  "improvements": ["Short exec-summary improvements (3-6 items), ordered by impact, highest first"],
  "redFlags": ["Anything a recruiter would flag immediately: employment gaps, inconsistent dates, spelling errors, unprofessional email, missing critical info. Empty array if none."],
  "jobMatchScore": 62,
  "jobMatchNotes": "Only if JD provided: what matches, what's missing, and how to close the gap. Empty string otherwise."
}}

Rules:
- atsScore and jobMatchScore are integers 0-100 (jobMatchScore is null if no JD given).
- sectionFeedback: 4-7 items covering every section actually present in the resume.
- positives / negatives: as many as genuinely apply (minimum 6 each), each item specific and traceable to something actually in the resume — never invent content that isn't there.
- Return ONLY valid JSON, nothing else."""


def build_ats_rewrite_prompt(resume_text, analysis, job_description="", keywords_to_add=None):
    """
    Produces a clean, ATS-safe, plain-text resume rewrite. If a job description
    is supplied, the rewrite is explicitly tailored to mirror its language and
    prioritize the qualifications it asks for.
    """
    keywords_to_add = keywords_to_add or []
    resume_snippet = resume_text[:5000]

    jd_block = f"\nTARGET JOB DESCRIPTION (mirror its exact terminology where truthful):\n{job_description[:2000]}\n" if job_description else ""

    all_keywords = list(dict.fromkeys(
        (analysis.get('keywordGaps', []) or [])[:8] + list(keywords_to_add)
    ))

    fixes = analysis.get('negatives') or analysis.get('improvements') or []
    fixes_block = "\n".join(f"- {f}" for f in fixes[:8])

    return f"""You are an expert resume writer specializing in ATS-optimized resumes for
competitive roles. Your rewrites read like they were written by a senior recruiter,
not a template generator.

Rewrite the resume below into a clean, ATS-safe, plain-text resume. Use ONLY
information that is truthful and present in (or a reasonable rephrasing of)
the original resume — never invent employers, dates, titles, or numbers that
aren't implied by the original text.

ORIGINAL RESUME:
{resume_snippet}
{jd_block}
ISSUES TO FIX:
{fixes_block if fixes_block else "- General ATS formatting and clarity improvements"}

NATURALLY WORK IN THESE KEYWORDS WHERE TRUTHFUL AND RELEVANT (do not stuff):
{', '.join(all_keywords) if all_keywords else "(none specified)"}

QUALITY RULES (these matter as much as formatting):
- Professional summary: 2-3 punchy sentences, third-person-implied (no "I"),
  leading with years of experience + domain + the single biggest strength.
  No generic filler like "hardworking team player" — every claim must be
  backed by something in the original resume.
- Every bullet starts with a strong, specific action verb (e.g. "Architected",
  "Reduced", "Negotiated", "Automated", "Mentored") — vary the verbs, never
  repeat the same opener twice in a row or more than 2-3 times total.
- Wherever the original resume already contains or implies a number, percentage,
  dollar amount, team size, or timeframe, surface it prominently. Where it does
  NOT, do not invent one — instead sharpen the qualitative impact (scope, scale,
  outcome) using only what's truthfully implied.
- Cut weak, vague, or resume-cliché phrasing entirely rather than just softening it.
- Keep tense consistent: past tense for previous roles, present tense only for
  the current role's ongoing responsibilities.

FORMATTING RULES (strict):
- Plain text only. No tables, no columns, no text boxes, no images, no icons.
- Use these exact section headings, in this order, omitting any with no content:
  [Full Name + contact line]
  PROFESSIONAL SUMMARY
  WORK EXPERIENCE
  EDUCATION
  SKILLS
  CERTIFICATIONS (if applicable)
- Under WORK EXPERIENCE, use this pattern per role:
  Job Title | Company Name | Location | Start Date – End Date
  - Bullet points starting with strong action verbs
  - Quantify achievements wherever the original resume supports it
- SKILLS section: comma or bullet separated, grouped by type if useful (Technical / Tools / Soft Skills).
- Keep it to roughly one page worth of content (400-700 words) unless the candidate clearly has 10+ years of experience.

Return ONLY the final resume text. No preamble, no explanation, no JSON, no markdown formatting,
no code fences — just the plain resume text itself, starting with the candidate's name."""


# ─────────────────────────────────────────────────────────────────────────────
# ORCHESTRATION HELPERS (called from app.py routes)
# ─────────────────────────────────────────────────────────────────────────────

def run_deep_analysis(resume_text, job_description=""):
    """Calls the AI model, repairs/normalizes the JSON, merges in deterministic checks."""
    prompt = build_deep_analysis_prompt(resume_text, job_description)
    raw = call_huggingface(prompt, max_tokens=2200)
    analysis = repair_json(raw)
    if not analysis:
        return None

    defaults = {
        "atsScore": 50, "overallVerdict": "", "sectionFeedback": [],
        "positives": [], "negatives": [], "keywordGaps": [], "keywordsFound": [],
        "strengths": [], "improvements": [], "redFlags": [],
        "jobMatchScore": None, "jobMatchNotes": "",
    }
    for k, v in defaults.items():
        if k not in analysis or analysis[k] is None:
            analysis[k] = v

    analysis["atsScore"] = max(0, min(100, int(analysis.get("atsScore") or 50)))
    if analysis.get("jobMatchScore") is not None:
        try:
            analysis["jobMatchScore"] = max(0, min(100, int(analysis["jobMatchScore"])))
        except (TypeError, ValueError):
            analysis["jobMatchScore"] = None

    for s in analysis.get("sectionFeedback", []):
        if "score" in s:
            try:
                s["score"] = max(0, min(100, int(s["score"])))
            except (TypeError, ValueError):
                s["score"] = 50
        s.setdefault("suggestions", [])

    analysis["formatChecks"] = run_format_checks(resume_text)
    return analysis


def _unwrap_if_json(raw_text):
    """
    SAFETY NET ONLY (should rarely trigger now that generate_ats_resume() calls
    call_huggingface() with expect_json=False and a plain-text system prompt).

    Some shared AI-call helpers always validated/repaired the response as JSON,
    even when the prompt asked for plain text. If a model still ever wraps its
    answer in JSON despite the plain-text instructions, this unwraps that case:
    if raw_text parses as JSON, pull the actual resume string out of it;
    otherwise return raw_text unchanged.
    """
    import json
    stripped = (raw_text or "").strip()
    if not stripped:
        return raw_text

    looks_like_json = (stripped.startswith('{') and stripped.endswith('}')) or \
                       (stripped.startswith('[') and stripped.endswith(']'))
    if not looks_like_json:
        return raw_text

    try:
        parsed = json.loads(stripped)
    except (ValueError, TypeError):
        return raw_text  # not actually valid JSON, treat as plain text

    # Common shapes a JSON-forcing helper might produce
    candidate_keys = [
        'atsResume', 'improvedResume', 'resume', 'resumeText',
        'text', 'content', 'body', 'output', 'result'
    ]

    if isinstance(parsed, dict):
        for key in candidate_keys:
            val = parsed.get(key)
            if isinstance(val, str) and len(val.strip()) > 50:
                return val
        # last resort: use the longest string value found anywhere in the dict
        string_values = [v for v in parsed.values() if isinstance(v, str)]
        if string_values:
            return max(string_values, key=len)
        return raw_text

    if isinstance(parsed, list):
        string_items = [v for v in parsed if isinstance(v, str)]
        if string_items:
            return "\n".join(string_items)
        return raw_text

    return raw_text


def generate_ats_resume(resume_text, analysis, job_description="", keywords_to_add=None):
    """Calls the AI model to produce the final ATS-ready resume text.

    FIX: this now explicitly calls call_huggingface() in plain-text mode
    (expect_json=False) with its own system_prompt. Previously it relied on
    call_huggingface()'s default system prompt, which forces JSON output —
    that contradicted the "return only plain resume text" instruction in the
    prompt below and is what caused the resume to come back JSON-wrapped
    (and then leak into the exported .docx/.pdf as raw JSON).
    """
    prompt = build_ats_rewrite_prompt(resume_text, analysis, job_description, keywords_to_add)
    text = call_huggingface(
        prompt,
        max_tokens=1800,
        expect_json=False,
        system_prompt=(
            "You are an expert professional resume writer. Respond with ONLY the "
            "final resume as plain text. Never wrap your answer in JSON, never use "
            "markdown formatting or code fences, and never add any preamble, "
            "explanation, or commentary — output only the resume text itself."
        )
    )
    text = _unwrap_if_json(text)  # safety net, kept in case a model still wraps it
    text = re.sub(r'```[a-z]*\n?', '', text).strip()
    return text


# ─────────────────────────────────────────────────────────────────────────────
# EXPORT: build real .docx and .pdf files from the final resume text
# ─────────────────────────────────────────────────────────────────────────────

SECTION_HEADS = {
    "PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "EDUCATION",
    "SKILLS", "CERTIFICATIONS", "PROJECTS", "SUMMARY", "EXPERIENCE"
}


def _split_resume_lines(resume_text):
    return [ln.rstrip() for ln in resume_text.split("\n")]


def export_resume_to_docx(resume_text):
    """Builds a clean, ATS-safe .docx (no tables/columns/text boxes) and returns bytes.

    Deliberately avoids relying on built-in Word styles like 'List Bullet'
    (which can throw if the numbering part isn't present in some minimal
    templates) — bullets are drawn manually with indentation instead, which
    is both more robust and still perfectly ATS-readable.
    """
    from docx import Document
    from docx.shared import Pt, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement

    doc = Document()

    style = doc.styles['Normal']
    style.font.name = 'Calibri'
    style.font.size = Pt(10.5)
    section = doc.sections[0]
    section.left_margin = Inches(0.7)
    section.right_margin = Inches(0.7)
    section.top_margin = Inches(0.6)
    section.bottom_margin = Inches(0.6)

    lines = _split_resume_lines(resume_text)
    first_content_written = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            doc.add_paragraph("")
            continue

        if not first_content_written:
            p = doc.add_paragraph()
            run = p.add_run(stripped)
            run.bold = True
            run.font.size = Pt(16)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            first_content_written = True
            continue

        if set(stripped) <= set("─-—_= "):
            continue

        if stripped.upper() == stripped and stripped.upper().rstrip(':') in SECTION_HEADS:
            p = doc.add_paragraph()
            run = p.add_run(stripped.upper())
            run.bold = True
            run.font.size = Pt(12)
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            try:
                pPr = p._p.get_or_add_pPr()
                pBdr = OxmlElement('w:pBdr')
                bottom = OxmlElement('w:bottom')
                bottom.set(qn('w:val'), 'single')
                bottom.set(qn('w:sz'), '6')
                bottom.set(qn('w:space'), '1')
                bottom.set(qn('w:color'), '444444')
                pBdr.append(bottom)
                pPr.append(pBdr)
            except Exception:
                pass  # border is cosmetic only — never let it break the export
            continue

        if stripped.startswith(('•', '-', '*')):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.25)
            p.paragraph_format.space_after = Pt(2)
            p.add_run("•  " + stripped.lstrip('•-* ').strip())
            continue

        p = doc.add_paragraph(stripped)
        p.paragraph_format.space_after = Pt(2)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


def export_resume_to_pdf(resume_text):
    """Builds a clean, ATS-safe .pdf and returns bytes."""
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, ListFlowable, ListItem

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title="ATS Optimized Resume"
    )

    styles = getSampleStyleSheet()
    name_style = ParagraphStyle('NameStyle', parent=styles['Title'], fontSize=18, alignment=TA_CENTER, spaceAfter=10)
    heading_style = ParagraphStyle('HeadingStyle', parent=styles['Heading2'], fontSize=12, spaceBefore=12, spaceAfter=4, textColor='#222222')
    body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=10.2, leading=14, spaceAfter=2)
    bullet_style = ParagraphStyle('BulletStyle', parent=body_style, leftIndent=14)

    story = []
    lines = _split_resume_lines(resume_text)
    first_content_written = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            story.append(Spacer(1, 6))
            continue
        if set(stripped) <= set("─-—_= "):
            continue

        if not first_content_written:
            story.append(Paragraph(_escape(stripped), name_style))
            first_content_written = True
            continue

        if stripped.upper() == stripped and stripped.upper().rstrip(':') in SECTION_HEADS:
            story.append(Paragraph(_escape(stripped.upper()), heading_style))
            story.append(HRFlowable(width="100%", thickness=0.75, color='#666666', spaceAfter=4))
            continue

        if stripped.startswith(('•', '-', '*')):
            story.append(Paragraph("• " + _escape(stripped.lstrip('•-* ').strip()), bullet_style))
            continue

        story.append(Paragraph(_escape(stripped), body_style))

    doc.build(story)
    buf.seek(0)
    return buf.read()


def sanitize_export_content(content):
    """
    Guards against the failure mode where raw JSON (an error payload or an
    un-stringified analysis object) accidentally gets passed in as the resume
    text and ends up baked into the exported file. Returns (clean_text, error).
    """
    if not content or not content.strip():
        return None, "No resume content to export."

    stripped = content.strip()
    if stripped.startswith('{') and stripped.endswith('}'):
        import json
        try:
            parsed = json.loads(stripped)
            # If it's a JSON object, this is almost certainly an error payload
            # or a raw analysis object, not resume text — refuse to export it
            # rather than silently baking JSON into a Word doc.
            if isinstance(parsed, dict):
                for key in ('improvedResume', 'atsResume', 'content', 'text'):
                    if isinstance(parsed.get(key), str) and parsed[key].strip():
                        return parsed[key], None
                return None, "The content passed in looks like raw JSON, not resume text. Please regenerate the ATS resume and try again."
        except (ValueError, TypeError):
            pass  # not actually JSON, just text that happens to start/end with braces

    return content, None


def _escape(text):
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;'))