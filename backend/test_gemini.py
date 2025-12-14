# backend/test_gemini.py
# Run this to test if your Gemini API key works

import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print("=" * 50)
print("🧪 TESTING GEMINI API CONNECTION")
print("=" * 50)

# Check if API key exists
if not GEMINI_API_KEY:
    print("❌ GEMINI_API_KEY not found in .env file!")
    print("📝 Create a .env file in the backend folder with:")
    print("   GEMINI_API_KEY=your_key_here")
    exit(1)

print(f"✅ API Key found: {GEMINI_API_KEY[:20]}...")

# Test API call
print("\n📡 Testing Gemini API call...")

API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"

payload = {
    "contents": [
        {
            "parts": [{"text": "Say 'Hello, PrepMate-AI is working!' in JSON format: {\"message\": \"...\"}"}]
        }
    ],
    "generationConfig": {
        "temperature": 0.7,
        "maxOutputTokens": 100
    }
}

try:
    response = requests.post(
        f"{API_URL}?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json=payload,
        timeout=30
    )
    
    print(f"\n📊 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        print("✅ SUCCESS! Gemini API is working!")
        data = response.json()
        print("\n📝 Response:")
        print(data["candidates"][0]["content"]["parts"][0]["text"])
        print("\n🎉 Your backend should work now!")
        
    elif response.status_code == 400:
        print("❌ BAD REQUEST (400)")
        print("🔍 Response:", response.text)
        print("\n💡 This usually means:")
        print("   - Invalid API key format")
        print("   - Wrong model name")
        
    elif response.status_code == 403:
        print("❌ FORBIDDEN (403)")
        print("🔍 Response:", response.text)
        print("\n💡 This usually means:")
        print("   - API key is invalid or expired")
        print("   - Gemini API not enabled in your Google Cloud project")
        
    elif response.status_code == 429:
        print("❌ RATE LIMIT EXCEEDED (429)")
        print("🔍 Response:", response.text)
        print("\n💡 Wait 1-2 minutes and try again")
        
    else:
        print(f"❌ ERROR ({response.status_code})")
        print("🔍 Response:", response.text)
        
except requests.exceptions.Timeout:
    print("❌ REQUEST TIMEOUT")
    print("💡 Check your internet connection")
    
except requests.exceptions.ConnectionError:
    print("❌ CONNECTION ERROR")
    print("💡 Check your internet connection")
    
except Exception as e:
    print(f"❌ UNEXPECTED ERROR: {e}")

print("\n" + "=" * 50)