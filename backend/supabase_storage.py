# backend/supabase_storage.py
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY else None

BUCKET_NAME = "interview-media"


def upload_recording(local_path, remote_filename):
    if not supabase:
        print("⚠️  Supabase not configured — skipping upload")
        return None
    try:
        with open(local_path, "rb") as f:
            supabase.storage.from_(BUCKET_NAME).upload(
                remote_filename,
                f,
                {"content-type": "video/webm", "upsert": "true"},
            )
        result = supabase.storage.from_(BUCKET_NAME).create_signed_url(remote_filename, 3600)
        return result.get("signedURL") or result.get("signedUrl")
    except Exception as e:
        print(f"⚠️  Supabase upload failed for {remote_filename}: {e}")
        return None


def save_recording_metadata(session_id, question_id, storage_path, user_id=None,
                             job_title="", experience_level="", duration_sec=None):
    if not supabase:
        return
    try:
        supabase.table("practice_recordings").insert({
            "session_id": session_id,
            "question_id": question_id,
            "storage_path": storage_path,
            "user_id": user_id,
            "job_title": job_title,
            "experience_level": experience_level,
            "duration_sec": duration_sec,
        }).execute()
    except Exception as e:
        print(f"⚠️  Failed to save recording metadata: {e}")


def get_fresh_signed_url(storage_path, expires_in=3600):
    if not supabase:
        return None
    try:
        result = supabase.storage.from_(BUCKET_NAME).create_signed_url(storage_path, expires_in)
        return result.get("signedURL") or result.get("signedUrl")
    except Exception as e:
        print(f"⚠️  Failed to generate signed URL: {e}")
        return None