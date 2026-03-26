# backend/app.py - PRODUCTION READY (for Render)
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import re
import traceback
import os
from werkzeug.utils import secure_filename

# Using Hugging Face + Llama
from huggingfaceService import extract_skills, generate_questions, call_huggingface, extract_json_from_text

app = Flask(__name__)

# CORS Configuration - Allow your Vercel frontend + Render backend
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://prep-mate-ai-eight.vercel.app",
            "https://*.vercel.app",  # All Vercel preview URLs
            "http://localhost:3000",  # Local development - React
            "http://localhost:5173",  # Local development - Vite
            "http://localhost:5000",  # Local development - Flask
            "http://127.0.0.1:3000",  # Alternative localhost
            "http://127.0.0.1:5173",  # Alternative localhost
            "http://127.0.0.1:5000",  # Alternative localhost
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Add global OPTIONS handler for all routes
@app.before_request
def handle_preflight():
    """Handle OPTIONS preflight requests globally"""
    if request.method == "OPTIONS":
        origin = request.headers.get('Origin', 'No origin')
        print(f"🔄 OPTIONS Preflight request from: {origin}")
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", request.headers.get('Origin', '*'))
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Max-Age", "3600")
        return response, 200

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        import PyPDF2
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text()
        return text
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return None

def extract_text_from_docx(file_path):
    """Extract text from DOCX file"""
    try:
        import docx
        doc = docx.Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return None

def extract_text_from_doc(file_path):
    """Extract text from DOC file (older Word format)"""
    try:
        import docx
        doc = docx.Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text if text.strip() else None
    except Exception as e:
        print(f"DOC extraction error with python-docx: {e}")
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                text = content.decode('utf-8', errors='ignore')
                return text if text.strip() else None
        except:
            print(f"DOC file could not be processed")
            return None

def extract_resume_text(file_path, filename):
    """Extract text from resume file based on extension"""
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
    return None

@app.route("/", methods=["GET"])
def root():
    """Root endpoint - API information"""
    return jsonify({
        "service": "PrepMate-AI Backend",
        "version": "1.0.0",
        "status": "running",
        "environment": os.getenv('FLASK_ENV', 'development'),
        "frontend": "https://prep-mate-ai-eight.vercel.app",
        "endpoints": {
            "health": "/api/health",
            "create_interview": "/api/create-interview",
            "analyze_answer": "/api/analyze-answer",
            "analyze_resume": "/api/analyze-resume",
            "skill_gap": "/api/skill-gap"
        },
        "documentation": "Send POST request to /api/create-interview with job details"
    }), 200

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "PrepMate-AI Backend",
        "version": "1.0.0",
        "environment": os.getenv('FLASK_ENV', 'development'),
        "frontend": "https://prep-mate-ai-eight.vercel.app",
        "backend": "https://prepmate-ai-backend-ckrb.onrender.com"
    }), 200

def clean_json_response(text):
    """Extract JSON from markdown code blocks if present"""
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    return text

@app.route("/api/create-interview", methods=["POST"])
def create_interview():
    """Generate interview questions based on job description"""
    try:
        print("\n" + "=" * 60)
        print("📨 INCOMING REQUEST")
        print("=" * 60)
        print(f"🌐 Origin: {request.headers.get('Origin', 'No origin header')}")
        print(f"📍 Remote Address: {request.remote_addr}")
        print(f"🔧 Method: {request.method}")
        print(f"📦 Content-Type: {request.headers.get('Content-Type')}")

        data = request.json
        if not data:
            print("❌ No JSON data received")
            return jsonify({"error": "No data provided"}), 400

        print(f"📝 Job Title: {data.get('jobTitle', 'N/A')}")
        print(f"👤 Experience: {data.get('experienceLevel', 'N/A')}")
        print(f"🎯 Type: {data.get('interviewType', 'N/A')}")

        required_fields = ["jobTitle", "jobDescription", "experienceLevel", "interviewType"]
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            print(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), 400

        print("=" * 60)
        print(f"📝 Processing interview for: {data['jobTitle']}")
        print(f"👤 Experience Level: {data['experienceLevel']}")
        print(f"🎯 Interview Type: {data['interviewType']}")
        print("=" * 60)

        print("\n🔍 Step 1: Extracting skills from job description...")
        try:
            skills_text = extract_skills(
                data["jobTitle"], data["jobDescription"], data["experienceLevel"]
            )
            print(f"✅ Raw skills response received ({len(skills_text)} chars)")
            print(f"📄 Skills response preview:\n{skills_text[:300]}...")
        except Exception as e:
            print(f"❌ Skills extraction failed: {str(e)}")
            print(f"📚 Traceback:\n{traceback.format_exc()}")
            return jsonify({"error": f"Failed to extract skills: {str(e)}"}), 500

        skills_text = clean_json_response(skills_text)
        try:
            skills = json.loads(skills_text)
            tech_count = len(skills.get('technicalSkills', []))
            soft_count = len(skills.get('softSkills', []))
            print(f"✅ Skills parsed: {tech_count} technical, {soft_count} soft skills")
        except json.JSONDecodeError as e:
            print(f"❌ Skills JSON parse error: {e}")
            return jsonify({"error": "Failed to parse skills. The AI response was not valid JSON. Please try again."}), 500

        print(f"\n❓ Step 2: Generating {data['interviewType']} questions...")
        try:
            questions_text = generate_questions(
                data["jobTitle"], data["jobDescription"], data["experienceLevel"],
                data["interviewType"], json.dumps(skills)
            )
            print(f"✅ Raw questions response received ({len(questions_text)} chars)")
            print(f"📄 Questions response preview:\n{questions_text[:500]}...")
        except Exception as e:
            print(f"❌ Question generation failed: {str(e)}")
            return jsonify({"error": f"Failed to generate questions: {str(e)}"}), 500

        questions_text = clean_json_response(questions_text)
        try:
            questions_data = json.loads(questions_text)
            questions_list = questions_data.get("questions", [])
            print(f"✅ Questions parsed: {len(questions_list)} questions generated")
        except json.JSONDecodeError as e:
            print(f"❌ Questions JSON parse error: {e}")
            try:
                json_match = re.search(r'\{.*\}', questions_text, re.DOTALL)
                if json_match:
                    questions_data = json.loads(json_match.group())
                    questions_list = questions_data.get("questions", [])
                    print(f"✅ Recovered with regex: {len(questions_list)} questions")
                else:
                    raise Exception("Could not extract JSON")
            except:
                return jsonify({"error": "Failed to parse questions. Please try again."}), 500

        if not questions_list or len(questions_list) == 0:
            return jsonify({"error": "AI generated no questions. Please try again."}), 500

        print("\n🎉 Interview created successfully!")
        return jsonify({"skills": skills, "questions": questions_list}), 200

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}", "type": type(e).__name__}), 500


@app.route("/api/analyze-answer", methods=["POST"])
def analyze_answer():
    """Analyze a candidate's interview answer using Llama AI"""
    try:
        print("\n" + "=" * 60)
        print("📨 ANALYZE ANSWER REQUEST")
        print("=" * 60)

        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        question = data.get('question')
        answer = data.get('answer')
        round_num = data.get('round')
        job_title = data.get('jobTitle')
        experience_level = data.get('experienceLevel')

        if not all([question, answer, job_title, experience_level]):
            missing = [k for k, v in {'question': question, 'answer': answer, 'jobTitle': job_title, 'experienceLevel': experience_level}.items() if not v]
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        round_name = "Technical Round 1" if round_num == 1 else "Technical Round 2" if round_num == 2 else "HR Round"

        prompt = f"""You are an expert technical interviewer analyzing a candidate's response.

Interview Context:
- Job Title: {job_title}
- Experience Level: {experience_level}
- Round: {round_name}

Question: {question}

Candidate's Answer: {answer}

Analyze this answer and provide:
1. A score out of 10 (number between 0-10)
2. 3-4 specific feedback points (mix of positive and constructive)
3. 2-3 key strengths demonstrated
4. 2-3 areas for improvement
5. Whether the answer includes relevant examples/experience (true/false)

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{{
  "score": 7,
  "feedback": ["Feedback point 1", "Feedback point 2", "Feedback point 3"],
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "hasExamples": true
}}

IMPORTANT: Return ONLY the JSON object, nothing else."""

        response_text = call_huggingface(prompt, max_tokens=1024)
        cleaned_text = extract_json_from_text(response_text)

        try:
            analysis = json.loads(cleaned_text)
            required_keys = ["score", "feedback", "strengths", "improvements", "hasExamples"]
            missing_keys = [key for key in required_keys if key not in analysis]
            if missing_keys:
                raise ValueError(f"Missing required keys: {', '.join(missing_keys)}")

            score = max(0, min(10, analysis.get('score', 5)))
            result = {
                "score": score,
                "feedback": analysis.get('feedback', []),
                "strengths": analysis.get('strengths', []),
                "improvements": analysis.get('improvements', []),
                "hasExamples": analysis.get('hasExamples', False)
            }
            print(f"✅ Analysis complete | Score: {score}/10")
            return jsonify(result), 200

        except (json.JSONDecodeError, ValueError) as e:
            print(f"❌ JSON parse/validation error: {e}")
            return jsonify({"error": "Failed to parse AI response. Please try again."}), 500

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}", "type": type(e).__name__}), 500


@app.route("/api/analyze-resume", methods=["POST"])
def analyze_resume():
    """Analyze a resume file and provide ATS score, feedback, and improvements"""
    try:
        print("\n" + "=" * 60)
        print("📨 ANALYZE RESUME REQUEST")
        print("=" * 60)

        if 'resume' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['resume']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Please upload PDF, DOC, or DOCX"}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        resume_text = extract_resume_text(file_path, filename)

        try:
            os.remove(file_path)
        except:
            pass

        if not resume_text or len(resume_text.strip()) < 100:
            return jsonify({"error": "Failed to extract text from resume. Please ensure the file is not corrupted or password-protected."}), 400

        print(f"✅ Text extracted successfully ({len(resume_text)} chars)")

        prompt = f"""You are an expert ATS (Applicant Tracking System) and resume reviewer. Analyze the following resume comprehensively.

RESUME TEXT:
{resume_text[:4000]}

Provide a detailed analysis with:

1. ATS SCORE (0-100): Rate how well this resume would perform in applicant tracking systems
2. SECTION FEEDBACK: Analyze each major section (Contact Info, Summary/Objective, Experience, Education, Skills) with:
   - Section name
   - Score out of 100
   - Specific feedback
3. KEYWORD GAPS: List 5-8 important industry keywords that are missing
4. STRENGTHS: List 3-4 key strengths of this resume
5. IMPROVEMENTS: List 3-4 specific areas that need improvement
6. IMPROVED RESUME: Provide an enhanced version of the resume with better formatting and content

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{{
  "atsScore": 75,
  "sectionFeedback": [
    {{
      "section": "Contact Information",
      "score": 85,
      "feedback": "Contact details are clear and professional. Consider adding LinkedIn profile."
    }},
    {{
      "section": "Professional Experience",
      "score": 70,
      "feedback": "Experience is relevant but lacks quantifiable achievements. Add metrics and numbers."
    }}
  ],
  "keywordGaps": ["Project Management", "Agile", "Stakeholder Communication", "Data Analysis", "Python"],
  "strengths": [
    "Clear career progression with relevant experience",
    "Strong educational background",
    "Good technical skills section"
  ],
  "improvements": [
    "Add quantifiable achievements (numbers, percentages, metrics)",
    "Include more action verbs in bullet points",
    "Expand on project outcomes and impact"
  ],
  "improvedResume": "IMPROVED RESUME TEXT HERE..."
}}

IMPORTANT: Return ONLY the JSON object, nothing else. Be specific and actionable in feedback."""

        response_text = call_huggingface(prompt, max_tokens=2048)
        cleaned_text = extract_json_from_text(response_text)

        try:
            analysis = json.loads(cleaned_text)
            required_keys = ["atsScore", "sectionFeedback", "keywordGaps", "strengths", "improvements"]
            missing_keys = [key for key in required_keys if key not in analysis]
            if missing_keys:
                raise ValueError(f"Missing required keys: {', '.join(missing_keys)}")

            ats_score = max(0, min(100, analysis.get('atsScore', 50)))
            section_feedback = analysis.get('sectionFeedback', [])
            for section in section_feedback:
                if 'score' in section:
                    section['score'] = max(0, min(100, section['score']))

            result = {
                "atsScore": ats_score,
                "sectionFeedback": section_feedback,
                "keywordGaps": analysis.get('keywordGaps', []),
                "strengths": analysis.get('strengths', []),
                "improvements": analysis.get('improvements', []),
                "improvedResume": analysis.get('improvedResume', '')
            }
            print(f"✅ Resume analysis complete | ATS Score: {ats_score}/100")
            return jsonify(result), 200

        except (json.JSONDecodeError, ValueError) as e:
            print(f"❌ JSON parse/validation error: {e}")
            return jsonify({"error": "Failed to parse AI analysis. Please try again."}), 500

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}", "type": type(e).__name__}), 500


# ─────────────────────────────────────────────────────────────
# MODULE 03 — Skill Gap & Roadmap
# ─────────────────────────────────────────────────────────────
@app.route("/api/skill-gap", methods=["POST"])
def skill_gap():
    """
    Compare a resume against a job description.
    Returns: present skills, missing skills, match summary, and a personalized learning roadmap.
    """
    try:
        print("\n" + "=" * 60)
        print("📨 SKILL GAP REQUEST")
        print("=" * 60)
        print(f"🌐 Origin: {request.headers.get('Origin', 'No origin header')}")

        # ── 1. Extract inputs ──────────────────────────────
        job_description = request.form.get('jobDescription', '').strip()

        if not job_description:
            return jsonify({"error": "Job description is required."}), 400

        # Resume: file upload OR raw text in form field
        resume_text = ""
        if 'resume' in request.files:
            file = request.files['resume']
            if file and file.filename:
                if not allowed_file(file.filename):
                    return jsonify({"error": "Invalid file type. Please upload PDF, DOC, DOCX, or TXT."}), 400

                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                print(f"📄 Resume file saved: {filename}")

                resume_text = extract_resume_text(file_path, filename) or ""

                try:
                    os.remove(file_path)
                except:
                    pass

        # Fallback: plain-text resume in form body
        if not resume_text:
            resume_text = request.form.get('resumeText', '').strip()

        if not resume_text or len(resume_text) < 50:
            return jsonify({"error": "Could not extract resume text. Please try a different file or paste your resume text."}), 400

        print(f"✅ JD length: {len(job_description)} chars")
        print(f"✅ Resume length: {len(resume_text)} chars")

        # ── 2. Build prompt ────────────────────────────────
        prompt = f"""You are an expert career coach and technical recruiter. Compare the resume against the job description below.

JOB DESCRIPTION:
{job_description[:3000]}

RESUME:
{resume_text[:3000]}

Perform a thorough skill gap analysis and return ONLY valid JSON with this exact structure (no markdown, no code blocks):

{{
  "presentSkills": ["Skill A", "Skill B", "Skill C"],
  "missingSkills": ["Skill X", "Skill Y", "Skill Z"],
  "partialSkills": ["Skill P"],
  "summary": "A 2-3 sentence summary of the candidate's fit for this role and the key gaps to address.",
  "totalTimeframe": "10-14 weeks",
  "roadmap": [
    {{
      "skill": "Skill Name",
      "priority": "high",
      "timeframe": "2-3 weeks",
      "matchScore": 15,
      "description": "Why this skill is important for the role and how to acquire it.",
      "resources": [
        {{"name": "Resource Name", "url": "https://example.com"}},
        {{"name": "Resource Name 2", "url": "https://example.com"}}
      ],
      "subtasks": [
        "Complete the basics tutorial",
        "Build a small project using this skill",
        "Add it to your resume with a concrete example"
      ]
    }}
  ]
}}

Rules:
- presentSkills: skills clearly mentioned or demonstrated in the resume that match the JD
- missingSkills: skills required by the JD that are NOT in the resume
- partialSkills: skills partially present (mentioned but not demonstrated)
- roadmap: only include missing or partial skills, ordered by priority (high → medium → low)
- matchScore in roadmap: how often this skill appears in the JD (0-100)
- priority: "high", "medium", or "low"
- resources: real, free, widely known resources (Coursera, YouTube, official docs, freeCodeCamp, etc.)
- Return 5-8 roadmap items maximum
- Return ONLY the JSON object, nothing else."""

        # ── 3. Call AI ─────────────────────────────────────
        print("\n🤖 Calling Llama AI for skill gap analysis...")
        response_text = call_huggingface(prompt, max_tokens=2048)
        print(f"✅ AI response received ({len(response_text)} chars)")
        print(f"📄 Response preview:\n{response_text[:400]}...")

        # ── 4. Parse response ──────────────────────────────
        cleaned_text = extract_json_from_text(response_text)

        try:
            analysis = json.loads(cleaned_text)
        except json.JSONDecodeError:
            # Regex fallback
            try:
                json_match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
                if json_match:
                    analysis = json.loads(json_match.group())
                else:
                    raise Exception("Could not find JSON in response")
            except Exception as parse_err:
                print(f"❌ JSON parse failed: {parse_err}")
                return jsonify({"error": "Failed to parse AI response. Please try again."}), 500

        # ── 5. Validate & sanitize ─────────────────────────
        required_keys = ["presentSkills", "missingSkills", "roadmap"]
        missing_keys = [k for k in required_keys if k not in analysis]
        if missing_keys:
            return jsonify({"error": f"Incomplete AI response (missing: {', '.join(missing_keys)}). Please try again."}), 500

        # Sanitize roadmap priorities
        valid_priorities = {"high", "medium", "low"}
        for item in analysis.get("roadmap", []):
            if item.get("priority") not in valid_priorities:
                item["priority"] = "medium"
            if "matchScore" in item:
                item["matchScore"] = max(0, min(100, int(item["matchScore"])))

        result = {
            "presentSkills":  analysis.get("presentSkills", []),
            "missingSkills":  analysis.get("missingSkills", []),
            "partialSkills":  analysis.get("partialSkills", []),
            "summary":        analysis.get("summary", ""),
            "totalTimeframe": analysis.get("totalTimeframe", ""),
            "roadmap":        analysis.get("roadmap", [])
        }

        print(f"✅ Skill gap analysis complete")
        print(f"📤 SENDING RESPONSE:")
        print(f"   - Present skills:  {len(result['presentSkills'])}")
        print(f"   - Missing skills:  {len(result['missingSkills'])}")
        print(f"   - Partial skills:  {len(result['partialSkills'])}")
        print(f"   - Roadmap items:   {len(result['roadmap'])}")
        print("=" * 60 + "\n")

        return jsonify(result), 200

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Server error: {str(e)}", "type": type(e).__name__}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": {
            "root": "GET /",
            "health": "GET /api/health",
            "create_interview": "POST /api/create-interview",
            "analyze_answer": "POST /api/analyze-answer",
            "analyze_resume": "POST /api/analyze-resume",
            "skill_gap": "POST /api/skill-gap"
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error", "message": str(error)}), 500

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({"error": "File too large. Maximum size is 5MB."}), 413


if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    env = os.getenv('FLASK_ENV', 'development')

    print("\n" + "=" * 60)
    print("🚀 PREPMATE-AI BACKEND STARTING...")
    print("=" * 60)
    print(f"🌍 Environment: {env}")
    print(f"📡 API Server: http://localhost:{port}")
    print(f"🏥 Health Check: http://localhost:{port}/api/health")
    print(f"🎯 Create Interview: POST http://localhost:{port}/api/create-interview")
    print(f"🔍 Analyze Answer: POST http://localhost:{port}/api/analyze-answer")
    print(f"📄 Analyze Resume: POST http://localhost:{port}/api/analyze-resume")
    print(f"🗺️  Skill Gap:      POST http://localhost:{port}/api/skill-gap")
    print("🤖 AI Model: Llama 3.1 8B (Hugging Face)")
    print("🌐 CORS: Enabled for Vercel + localhost + Render")
    print("🌍 Frontend: https://prep-mate-ai-eight.vercel.app")
    print("🖥️  Backend: https://prepmate-ai-backend-ckrb.onrender.com")
    print("=" * 60 + "\n")
    print("✅ Ready to accept requests!\n")

    app.run(debug=(env == 'development'), port=port, host='0.0.0.0')