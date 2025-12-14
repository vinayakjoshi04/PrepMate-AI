# backend/geminiService.py

import os
import requests
from dotenv import load_dotenv
import time
import json
import re

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Using Gemini 1.5 Flash with v1 API (stable)
GEMINI_API_URL = (
    "https://generativelanguage.googleapis.com/v1/"
    "models/gemini-1.5-flash:generateContent"
)

HEADERS = {
    "Content-Type": "application/json"
}

RATE_LIMIT_DELAY = 5  # 5 seconds between requests
last_request_time = 0


def rate_limit():
    """Enforce rate limiting between API calls"""
    global last_request_time
    now = time.time()
    elapsed = now - last_request_time
    if elapsed < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - elapsed)
    last_request_time = time.time()


def extract_json_from_text(text):
    """Extract JSON from text, handling markdown code blocks"""
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    
    # Try to find JSON object
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        return json_match.group(0)
    
    return text


def call_gemini(prompt, max_tokens=2048):
    """Make a request to Gemini API with rate limiting"""
    if not GEMINI_API_KEY:
        raise Exception("Gemini API key missing in .env file")

    rate_limit()

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.95,
            "maxOutputTokens": max_tokens
        }
    }

    try:
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers=HEADERS,
            json=payload,
            timeout=30
        )

        if response.status_code == 429:
            raise Exception(
                "Rate limit exceeded. Please wait 1-2 minutes and try again. "
                "Free tier: 15 requests/minute, 1,500/day."
            )

        if response.status_code == 403:
            raise Exception("Invalid API key. Please check your GEMINI_API_KEY in .env")

        if response.status_code == 404:
            raise Exception(
                "Model not found. Run 'python list_models.py' to see available models."
            )

        if not response.ok:
            raise Exception(f"Gemini API error ({response.status_code}): {response.text}")

        return response.json()
        
    except requests.exceptions.Timeout:
        raise Exception("Request timeout. Please check your internet connection.")
    except requests.exceptions.ConnectionError:
        raise Exception("Cannot connect to Gemini API. Check your internet connection.")


def extract_skills(job_title, job_description, experience_level):
    """Extract skills from job description using Gemini"""
    prompt = f"""Analyze this job posting and extract skills. Return ONLY valid JSON with NO markdown formatting.

Job Title: {job_title}
Experience Level: {experience_level}

Job Description:
{job_description}

Return this exact JSON structure:
{{
  "technicalSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "softSkills": ["skill1", "skill2", "skill3"],
  "requiredCompetencies": ["competency1", "competency2", "competency3"],
  "primaryFocus": "brief description of main focus area"
}}"""

    data = call_gemini(prompt, max_tokens=1024)
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    
    # Clean and validate JSON
    cleaned_text = extract_json_from_text(text)
    
    # Validate it's proper JSON
    try:
        json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON validation failed: {e}")
        print(f"Raw response: {text[:500]}")
        raise Exception("Gemini returned invalid JSON format")
    
    return cleaned_text


def generate_questions(job_title, job_description, experience_level, interview_type, skills_json):
    """Generate interview questions based on job requirements"""
    
    question_count = {
        "technical": 8,
        "behavioral": 6,
        "mixed": 10
    }.get(interview_type, 8)
    
    prompt = f"""Generate {question_count} {interview_type} interview questions. Return ONLY valid JSON with NO markdown formatting.

Job Title: {job_title}
Experience Level: {experience_level}
Interview Type: {interview_type}

Skills Required:
{skills_json}

Return this exact JSON structure:
{{
  "questions": [
    {{
      "id": 1,
      "question": "detailed question text here",
      "difficulty": "Easy",
      "focusArea": "specific skill or competency"
    }},
    {{
      "id": 2,
      "question": "detailed question text here",
      "difficulty": "Medium",
      "focusArea": "specific skill or competency"
    }}
  ]
}}

Make questions specific, challenging, and relevant to the {experience_level} level."""

    data = call_gemini(prompt, max_tokens=2048)
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    
    # Clean and validate JSON
    cleaned_text = extract_json_from_text(text)
    
    # Validate it's proper JSON
    try:
        json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON validation failed: {e}")
        print(f"Raw response: {text[:500]}")
        raise Exception("Gemini returned invalid JSON format")
    
    return cleaned_text