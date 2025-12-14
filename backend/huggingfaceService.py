# backend/huggingfaceService.py
# FREE Hugging Face Inference API with Llama models
# Get your free API key: https://huggingface.co/settings/tokens

import os
from dotenv import load_dotenv
import time
import json
import re

# Import Hugging Face client
try:
    from huggingface_hub import InferenceClient
except ImportError:
    print("Installing huggingface_hub...")
    import subprocess
    subprocess.check_call(["pip", "install", "huggingface_hub"])
    from huggingface_hub import InferenceClient

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY")

# Available FREE Llama models:
# Option 1: Meta Llama 3.1 8B (RECOMMENDED)
MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct"

# Option 2: Mistral 7B (Alternative)
# MODEL = "mistralai/Mistral-7B-Instruct-v0.2"

# Option 3: Qwen 2.5 7B (Fast and good)
# MODEL = "Qwen/Qwen2.5-7B-Instruct"

RATE_LIMIT_DELAY = 3
last_request_time = 0

# Initialize client
client = None


def get_client():
    """Get or create Hugging Face client"""
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
    """Enforce rate limiting between API calls"""
    global last_request_time
    now = time.time()
    elapsed = now - last_request_time
    if elapsed < RATE_LIMIT_DELAY:
        time.sleep(RATE_LIMIT_DELAY - elapsed)
    last_request_time = time.time()


def extract_json_from_text(text):
    """Extract JSON from text, handling markdown code blocks and incomplete JSON"""
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    text = text.strip()
    
    # Try to find complete JSON object
    # Look for opening { and closing }
    start = text.find('{')
    if start == -1:
        return text
    
    # Count braces to find matching closing brace
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
        return text[start:end]
    
    return text


def call_huggingface(prompt, max_tokens=3072, retry_count=2):
    """Make a request to Hugging Face using InferenceClient"""
    rate_limit()
    
    hf_client = get_client()
    
    # Format message for Llama
    messages = [
        {
            "role": "system",
            "content": "You are an expert technical recruiter and interviewer. You MUST respond with ONLY valid, complete JSON. Do not use markdown formatting, code blocks, or any additional text. Ensure all JSON objects are properly closed with matching braces and brackets."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    for attempt in range(retry_count):
        try:
            # Use chat completion endpoint
            response = hf_client.chat_completion(
                messages=messages,
                model=MODEL,
                max_tokens=max_tokens,
                temperature=0.7,
                stop=["```", "\n\n\n"]  # Stop at markdown or excessive newlines
            )
            
            # Extract generated text
            generated_text = response.choices[0].message.content
            
            # Validate it's complete JSON
            cleaned = extract_json_from_text(generated_text)
            try:
                json.loads(cleaned)  # Test if it's valid
                return generated_text
            except json.JSONDecodeError:
                if attempt < retry_count - 1:
                    print(f"⚠️  Incomplete JSON on attempt {attempt + 1}, retrying...")
                    time.sleep(2)
                    continue
                else:
                    return generated_text
            
        except Exception as e:
            error_msg = str(e)
            
            if "503" in error_msg or "loading" in error_msg.lower():
                print("⏳ Model is loading, waiting 20 seconds...")
                time.sleep(20)
                # Retry once
                response = hf_client.chat_completion(
                    messages=messages,
                    model=MODEL,
                    max_tokens=max_tokens,
                    temperature=0.7,
                    stop=["```", "\n\n\n"]
                )
                return response.choices[0].message.content
            
            elif "rate limit" in error_msg.lower() or "429" in error_msg:
                raise Exception(
                    "Rate limit exceeded. Hugging Face free tier: 1000 requests/day. "
                    "Wait a moment and try again."
                )
            
            elif "401" in error_msg or "unauthorized" in error_msg.lower():
                raise Exception(
                    "Invalid API key. Get your free Hugging Face API key at: "
                    "https://huggingface.co/settings/tokens"
                )
            
            else:
                raise Exception(f"Hugging Face API error: {error_msg}")
    
    return generated_text


def extract_skills(job_title, job_description, experience_level):
    """Extract skills from job description using Llama"""
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

IMPORTANT: Return ONLY the JSON object above, nothing else."""

    text = call_huggingface(prompt, max_tokens=1024)
    
    # Clean and validate JSON
    cleaned_text = extract_json_from_text(text)
    
    try:
        parsed = json.loads(cleaned_text)
        # Validate structure
        if not all(key in parsed for key in ["technicalSkills", "softSkills", "requiredCompetencies", "primaryFocus"]):
            raise ValueError("Missing required keys")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"⚠️  JSON validation failed: {e}")
        print(f"Raw response: {text[:500]}")
        raise Exception("AI returned invalid JSON format. Please try again.")
    
    return cleaned_text


def generate_questions(job_title, job_description, experience_level, interview_type, skills_json):
    """Generate interview questions using Llama"""
    
    question_count = {
        "technical": 6,  # Reduced from 8 to fit in token limit
        "behavioral": 5,  # Reduced from 6
        "mixed": 7  # Reduced from 10
    }.get(interview_type, 6)
    
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
    {{"id": 2, "question": "detailed question text", "difficulty": "Medium", "focusArea": "skill area"}},
    {{"id": 3, "question": "detailed question text", "difficulty": "Medium", "focusArea": "skill area"}},
    {{"id": 4, "question": "detailed question text", "difficulty": "Hard", "focusArea": "skill area"}},
    {{"id": 5, "question": "detailed question text", "difficulty": "Hard", "focusArea": "skill area"}},
    {{"id": 6, "question": "detailed question text", "difficulty": "Medium", "focusArea": "skill area"}}
  ]
}}

CRITICAL RULES:
1. Generate EXACTLY {question_count} questions
2. Each question must be specific to {experience_level} level
3. Return ONLY the JSON object, no markdown, no explanations
4. Ensure all braces and brackets are properly closed"""

    text = call_huggingface(prompt, max_tokens=3072)
    
    # Clean and validate JSON
    cleaned_text = extract_json_from_text(text)
    
    try:
        parsed = json.loads(cleaned_text)
        # Validate structure
        if "questions" not in parsed or not isinstance(parsed["questions"], list):
            raise ValueError("Invalid questions structure")
        if len(parsed["questions"]) == 0:
            raise ValueError("No questions generated")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"⚠️  JSON validation failed: {e}")
        print(f"Raw response (first 800 chars): {text[:800]}")
        print(f"Cleaned text (first 800 chars): {cleaned_text[:800]}")
        raise Exception("AI returned invalid JSON format. Please try again.")
    
    return cleaned_text