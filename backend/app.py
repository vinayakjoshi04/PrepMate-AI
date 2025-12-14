# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import re

# Using Hugging Face + Llama
from huggingfaceService import extract_skills, generate_questions, call_huggingface, extract_json_from_text

app = Flask(__name__)
CORS(app, origins=["https://prep-mate-o3he0rffn-vinayak-vivek-joshis-projects.vercel.app/"])  # Allow frontend calls

@app.route("/", methods=["GET"])
def root():
    """Root endpoint - API information"""
    return jsonify({
        "service": "PrepMate-AI Backend",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "create_interview": "/api/create-interview",
            "analyze_answer": "/api/analyze-answer"
        },
        "documentation": "Send POST request to /api/create-interview with job details"
    }), 200

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "PrepMate-AI Backend",
        "version": "1.0.0"
    }), 200

def clean_json_response(text):
    """Extract JSON from markdown code blocks if present"""
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    return text

@app.route("/api/create-interview", methods=["POST"])
def create_interview():
    """Generate interview questions based on job description"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ["jobTitle", "jobDescription", "experienceLevel", "interviewType"]
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        print("=" * 60)
        print(f"📝 Processing interview for: {data['jobTitle']}")
        print(f"👤 Experience Level: {data['experienceLevel']}")
        print(f"🎯 Interview Type: {data['interviewType']}")
        print("=" * 60)

        # Step 1: Extract skills from job description
        print("\n🔍 Step 1: Extracting skills from job description...")
        try:
            skills_text = extract_skills(
                data["jobTitle"],
                data["jobDescription"],
                data["experienceLevel"]
            )
            print(f"✅ Raw skills response received ({len(skills_text)} chars)")
        except Exception as e:
            print(f"❌ Skills extraction failed: {str(e)}")
            return jsonify({
                "error": f"Failed to extract skills: {str(e)}"
            }), 500

        # Clean and parse skills JSON
        skills_text = clean_json_response(skills_text)
        try:
            skills = json.loads(skills_text)
            tech_count = len(skills.get('technicalSkills', []))
            soft_count = len(skills.get('softSkills', []))
            print(f"✅ Skills parsed: {tech_count} technical, {soft_count} soft skills")
        except json.JSONDecodeError as e:
            print(f"❌ Skills JSON parse error: {e}")
            print(f"📄 Raw response (first 300 chars):\n{skills_text[:300]}")
            return jsonify({
                "error": "Failed to parse skills. The AI response was not valid JSON. Please try again."
            }), 500

        # Step 2: Generate interview questions
        print(f"\n❓ Step 2: Generating {data['interviewType']} questions...")
        try:
            questions_text = generate_questions(
                data["jobTitle"],
                data["jobDescription"],
                data["experienceLevel"],
                data["interviewType"],
                json.dumps(skills)
            )
            print(f"✅ Raw questions response received ({len(questions_text)} chars)")
        except Exception as e:
            print(f"❌ Question generation failed: {str(e)}")
            return jsonify({
                "error": f"Failed to generate questions: {str(e)}"
            }), 500

        # Clean and parse questions JSON
        questions_text = clean_json_response(questions_text)
        try:
            questions_data = json.loads(questions_text)
            questions_list = questions_data.get("questions", [])
            print(f"✅ Questions parsed: {len(questions_list)} questions generated")
        except json.JSONDecodeError as e:
            print(f"❌ Questions JSON parse error: {e}")
            print(f"📄 Raw response (first 300 chars):\n{questions_text[:300]}")
            return jsonify({
                "error": "Failed to parse questions. The AI response was not valid JSON. Please try again."
            }), 500

        print("\n🎉 Interview created successfully!")
        print("=" * 60 + "\n")
        
        return jsonify({
            "skills": skills,
            "questions": questions_list
        }), 200

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {str(e)}")
        print("=" * 60 + "\n")
        return jsonify({
            "error": f"Server error: {str(e)}"
        }), 500


@app.route("/api/analyze-answer", methods=["POST"])
def analyze_answer():
    """
    Analyze a candidate's interview answer using Llama AI
    """
    try:
        data = request.json
        
        # Extract data
        question = data.get('question')
        answer = data.get('answer')
        round_num = data.get('round')
        job_title = data.get('jobTitle')
        experience_level = data.get('experienceLevel')
        
        # Validate input
        if not all([question, answer, job_title, experience_level]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Determine round name
        round_name = "Technical Round 1" if round_num == 1 else "Technical Round 2" if round_num == 2 else "HR Round"
        
        print("=" * 60)
        print(f"🔍 Analyzing answer for: {job_title}")
        print(f"📝 Question: {question[:60]}...")
        print(f"🎯 Round: {round_name}")
        print("=" * 60)
        
        # Create prompt for Llama
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
        
        # Call Hugging Face API
        print("\n🤖 Calling Llama AI for analysis...")
        response_text = call_huggingface(prompt, max_tokens=1024)
        print(f"✅ AI response received ({len(response_text)} chars)")
        
        # Extract and parse JSON
        cleaned_text = extract_json_from_text(response_text)
        
        try:
            analysis = json.loads(cleaned_text)
            
            # Validate structure
            required_keys = ["score", "feedback", "strengths", "improvements", "hasExamples"]
            if not all(key in analysis for key in required_keys):
                raise ValueError("Missing required keys in AI response")
            
            # Validate and cap score
            score = max(0, min(10, analysis.get('score', 5)))
            
            result = {
                "score": score,
                "feedback": analysis.get('feedback', []),
                "strengths": analysis.get('strengths', []),
                "improvements": analysis.get('improvements', []),
                "hasExamples": analysis.get('hasExamples', False)
            }
            
            print(f"✅ Analysis complete | Score: {score}/10")
            print("=" * 60 + "\n")
            
            return jsonify(result), 200
            
        except (json.JSONDecodeError, ValueError) as e:
            print(f"❌ JSON parse error: {e}")
            print(f"📄 Raw response (first 300 chars):\n{response_text[:300]}")
            print("=" * 60 + "\n")
            return jsonify({
                "error": "Failed to parse AI response. Please try again."
            }), 500
        
    except Exception as e:
        print(f"❌ Server Error: {str(e)}")
        print("=" * 60 + "\n")
        return jsonify({
            "error": f"Server error: {str(e)}"
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": {
            "root": "GET /",
            "health": "GET /api/health",
            "create_interview": "POST /api/create-interview",
            "analyze_answer": "POST /api/analyze-answer"
        }
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        "error": "Internal server error",
        "message": str(error)
    }), 500

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 PREPMATE-AI BACKEND STARTING...")
    print("=" * 60)
    print("📡 API Server: http://localhost:5000")
    print("🏥 Health Check: http://localhost:5000/api/health")
    print("🎯 Create Interview: POST http://localhost:5000/api/create-interview")
    print("🔍 Analyze Answer: POST http://localhost:5000/api/analyze-answer")
    print("🤖 AI Model: Llama 3.1 8B (Hugging Face)")
    print("=" * 60 + "\n")
    print("✅ Ready to accept requests!\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')