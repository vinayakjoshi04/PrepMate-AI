# backend/local_storage.py
# Drop-in local-disk replacement for supabase_storage.py.
# Same function signatures, so interview.py only needed an import swap.

import os
import json
import shutil
import time

RECORDINGS_DIR = os.path.join("uploads", "recordings")
METADATA_FILE = os.path.join(RECORDINGS_DIR, "metadata.json")

if not os.path.exists(RECORDINGS_DIR):
    os.makedirs(RECORDINGS_DIR)


def _load_metadata():
    if not os.path.exists(METADATA_FILE):
        return []
    try:
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


def _save_metadata(records):
    with open(METADATA_FILE, "w") as f:
        json.dump(records, f, indent=2)


def upload_recording(local_path, remote_name):
    """
    'remote_name' arrives as 'session_id/questionId_filename.mp4'.
    Copies the file into uploads/recordings/<that path> and returns the
    storage-relative path, or None on failure.
    """
    dest_path = os.path.join(RECORDINGS_DIR, remote_name)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    try:
        shutil.copy2(local_path, dest_path)
        return remote_name
    except Exception as e:
        print(f"⚠️  Local recording save failed: {e}")
        return None


def save_recording_metadata(session_id, question_id, storage_path, user_id=None,
                             job_title=None, experience_level=None, duration_sec=None):
    records = _load_metadata()
    records.append({
        "sessionId": session_id,
        "questionId": question_id,
        "storagePath": storage_path,
        "userId": user_id,
        "jobTitle": job_title,
        "experienceLevel": experience_level,
        "durationSec": duration_sec,
        "savedAt": time.time(),
    })
    _save_metadata(records)


def get_fresh_signed_url(storage_path):
    """
    No signing needed for local files — just confirm the file still exists
    and hand back a server route the frontend can hit directly.
    """
    full_path = os.path.join(RECORDINGS_DIR, storage_path)
    if os.path.exists(full_path):
        return f"/api/recordings/{storage_path}"
    return None