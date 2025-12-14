# backend/test_huggingface.py
# Test Hugging Face Inference API with new client

import os
from dotenv import load_dotenv

# Import or install Hugging Face client
try:
    from huggingface_hub import InferenceClient
except ImportError:
    print("Installing huggingface_hub...")
    import subprocess
    subprocess.check_call(["pip", "install", "huggingface_hub"])
    from huggingface_hub import InferenceClient

load_dotenv()

HF_API_KEY = os.getenv("HF_API_KEY")

print("=" * 60)
print("🧪 TESTING HUGGING FACE API (LLAMA)")
print("=" * 60)

if not HF_API_KEY:
    print("❌ HF_API_KEY not found in .env file!")
    print("\n📝 Get your FREE API key:")
    print("   1. Go to: https://huggingface.co/settings/tokens")
    print("   2. Sign in/Sign up (free)")
    print("   3. Click 'New token'")
    print("   4. Name it 'PrepMate-AI'")
    print("   5. Role: 'read'")
    print("   6. Copy the token")
    print("   7. Add to .env: HF_API_KEY=hf_...")
    exit(1)

print(f"✅ API Key found: {HF_API_KEY[:20]}...")

# Test with Llama model
MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct"

print(f"\n🤖 Using model: {MODEL}")
print("📡 Testing API call with new InferenceClient...")

try:
    # Initialize client
    client = InferenceClient(token=HF_API_KEY)
    
    # Test message
    messages = [
        {
            "role": "system",
            "content": "You are a helpful assistant. Respond with valid JSON only."
        },
        {
            "role": "user",
            "content": 'Say "Hello, PrepMate-AI is working with Llama on Hugging Face!" in JSON format: {"message": "...", "status": "success"}'
        }
    ]
    
    print("\n⏳ Calling Hugging Face API...")
    
    response = client.chat_completion(
        messages=messages,
        model=MODEL,
        max_tokens=200,
        temperature=0.7
    )
    
    generated_text = response.choices[0].message.content
    
    print("\n✅ SUCCESS! Hugging Face API is working!")
    print("\n📝 Response:")
    print(generated_text)
    print("\n🎉 Your backend is ready!")
    print("\n💡 Hugging Face Free Tier:")
    print("   • 1,000 requests/day")
    print("   • Unlimited models")
    print("   • No credit card needed")
    
except Exception as e:
    error_msg = str(e)
    
    if "503" in error_msg or "loading" in error_msg.lower():
        print("⏳ MODEL IS LOADING")
        print("🔍 The model is being loaded by Hugging Face")
        print("\n💡 This is normal for the first request!")
        print("   Waiting 20 seconds and retrying...")
        
        import time
        time.sleep(20)
        
        try:
            print("\n📡 Retrying...")
            response = client.chat_completion(
                messages=messages,
                model=MODEL,
                max_tokens=200,
                temperature=0.7
            )
            generated_text = response.choices[0].message.content
            print("✅ SUCCESS on retry!")
            print("\n📝 Response:")
            print(generated_text)
        except Exception as retry_error:
            print(f"❌ Still failing: {retry_error}")
    
    elif "401" in error_msg or "unauthorized" in error_msg.lower():
        print("❌ UNAUTHORIZED")
        print("🔍 Invalid API key")
        print("\n💡 Get a new token at:")
        print("   https://huggingface.co/settings/tokens")
    
    elif "rate limit" in error_msg.lower() or "429" in error_msg:
        print("❌ RATE LIMIT")
        print("🔍 Too many requests")
        print("\n💡 Free tier: 1,000 requests/day")
    
    else:
        print(f"❌ ERROR: {error_msg}")

print("\n" + "=" * 60)