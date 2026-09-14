# backend/video_analysis.py
# Non-verbal analysis of an interview answer video using OpenCV + MediaPipe.
#
# Install:
#   pip install opencv-python-headless mediapipe numpy
#
# CHANGELOG (this revision):
#   - BUGFIX: duration_sec (and therefore blinkRate) was computed purely from
#     cv2.CAP_PROP_FRAME_COUNT / fps. For webm/vp9 uploads this container
#     metadata is very often 0 or wrong (especially if the upstream ffmpeg
#     re-encode step failed and analyze_video() got handed the raw webm),
#     which silently made blinkRate always report 0 even though blinks were
#     being detected correctly. Fixed by deriving duration from the actual
#     number of frames decoded (frame_idx / fps) after the read loop, which
#     is ground truth regardless of what the container header claims. This
#     is now used everywhere duration is reported, including the early
#     "no face detected" exit path.
#
# CHANGELOG (previous revision):
#   - postureScore is now ACTUALLY computed (previously documented but never
#     returned) using MediaPipe Pose shoulder/nose alignment + slouch proxy.
#   - Smile detection normalized per-face (uses mouth width / face width
#     instead of a fixed ratio threshold, which broke on faces at different
#     distances from the camera).
#   - Blink detection now uses a short rolling baseline instead of one fixed
#     EAR threshold, since EAR varies a lot by camera angle/eye shape.
#   - Added engagementScore: a single 0-100 rollup so the frontend/LLM prompt
#     doesn't have to guess how to weight five different numbers.
#   - Hardened against short/corrupt clips, 0-fps files, and missing Pose
#     landmarks (falls back gracefully instead of crashing the request).
#   - framesAnalyzed/faceDetectedPct now always returned, even on early exit,
#     so the caller can tell "no face" apart from "video unreadable".

import cv2
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

SAMPLE_EVERY_N_FRAMES = 3  # analyze every 3rd frame to keep it fast
MIN_FRAMES_FOR_RELIABLE_RESULT = 8

# MediaPipe FaceMesh landmark indices we care about
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH_LEFT = 61
MOUTH_RIGHT = 291
MOUTH_TOP = 13
MOUTH_BOTTOM = 14
NOSE_TIP = 1
CHIN = 152
LEFT_CHEEK = 234
RIGHT_CHEEK = 454
FOREHEAD = 10

# MediaPipe Pose landmark indices
POSE_NOSE = 0
POSE_LEFT_SHOULDER = 11
POSE_RIGHT_SHOULDER = 12
POSE_LEFT_EAR = 7
POSE_RIGHT_EAR = 8


def _eye_aspect_ratio(landmarks, eye_idx, w, h):
    pts = np.array([(landmarks[i].x * w, landmarks[i].y * h) for i in eye_idx])
    vert1 = np.linalg.norm(pts[1] - pts[5])
    vert2 = np.linalg.norm(pts[2] - pts[4])
    horiz = np.linalg.norm(pts[0] - pts[3])
    if horiz == 0:
        return 0
    return (vert1 + vert2) / (2.0 * horiz)


def _face_width(landmarks, w, h):
    left = np.array([landmarks[LEFT_CHEEK].x * w, landmarks[LEFT_CHEEK].y * h])
    right = np.array([landmarks[RIGHT_CHEEK].x * w, landmarks[RIGHT_CHEEK].y * h])
    return max(np.linalg.norm(left - right), 1e-6)


def _mouth_smile_ratio(landmarks, w, h):
    """Mouth width normalized by face width — a smile widens the mouth
    relative to the face, independent of how close the person is to camera."""
    left = np.array([landmarks[MOUTH_LEFT].x * w, landmarks[MOUTH_LEFT].y * h])
    right = np.array([landmarks[MOUTH_RIGHT].x * w, landmarks[MOUTH_RIGHT].y * h])
    mouth_width = np.linalg.norm(left - right)
    return mouth_width / _face_width(landmarks, w, h)


def _head_offset_from_center(landmarks, w, h):
    """Rough proxy for whether the face/gaze is pointed toward the camera."""
    nose = landmarks[NOSE_TIP]
    left_cheek = landmarks[LEFT_CHEEK]
    right_cheek = landmarks[RIGHT_CHEEK]
    cheek_mid_x = (left_cheek.x + right_cheek.x) / 2.0
    cheek_span = abs(right_cheek.x - left_cheek.x) or 1e-6
    offset = abs(nose.x - cheek_mid_x) / cheek_span
    return offset  # ~0 = centered/forward, larger = turned away


def _posture_sample(pose_landmarks):
    """Returns (shoulder_tilt, forward_lean) for one frame using Pose, or None."""
    try:
        lm = pose_landmarks.landmark
        ls, rs = lm[POSE_LEFT_SHOULDER], lm[POSE_RIGHT_SHOULDER]
        nose = lm[POSE_NOSE]
        if min(ls.visibility, rs.visibility, nose.visibility) < 0.4:
            return None
        # Tilt: vertical difference between shoulders (0 = level)
        shoulder_tilt = abs(ls.y - rs.y)
        # Forward lean / slump proxy: nose x should sit near shoulder midpoint x
        mid_x = (ls.x + rs.x) / 2.0
        shoulder_span = abs(ls.x - rs.x) or 1e-6
        forward_lean = abs(nose.x - mid_x) / shoulder_span
        return shoulder_tilt, forward_lean
    except Exception:
        return None


def analyze_video(file_path, max_frames_to_sample=150):
    """
    Analyze a short interview-answer video file.
    Returns a metrics dict, or a dict with 'error' if analysis could not run.
    """
    if not MEDIAPIPE_AVAILABLE:
        return {"error": "mediapipe not installed on server"}

    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        return {"error": "could not open video file"}

    mp_face = mp.solutions.face_mesh
    mp_pose = mp.solutions.pose
    face_mesh = mp_face.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=0,  # lite model — this runs per-frame, keep it cheap
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    frame_idx = 0
    sampled = 0
    faces_found = 0
    forward_count = 0
    smile_frames = 0
    ear_history = []
    offset_history = []
    blink_count = 0
    was_blinking = False
    smile_ratios = []
    tilt_samples = []
    lean_samples = []

    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    if fps <= 0 or fps > 240:
        fps = 24

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1
            if frame_idx % SAMPLE_EVERY_N_FRAMES != 0:
                continue
            if sampled >= max_frames_to_sample:
                break
            sampled += 1

            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False

            face_results = face_mesh.process(rgb)
            pose_results = pose.process(rgb)

            if pose_results.pose_landmarks:
                p = _posture_sample(pose_results.pose_landmarks)
                if p is not None:
                    tilt_samples.append(p[0])
                    lean_samples.append(p[1])

            if not face_results.multi_face_landmarks:
                continue

            faces_found += 1
            landmarks = face_results.multi_face_landmarks[0].landmark

            # Eye contact / head-forward proxy
            offset = _head_offset_from_center(landmarks, w, h)
            offset_history.append(offset)
            if offset < 0.18:
                forward_count += 1

            # Blink detection via EAR with a rolling baseline (first ~10
            # valid readings establish "eyes open" level for this person/cam)
            ear = (_eye_aspect_ratio(landmarks, LEFT_EYE, w, h) +
                   _eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)) / 2.0
            ear_history.append(ear)
            if len(ear_history) >= 10:
                baseline = float(np.median(ear_history[-30:]))
                threshold = baseline * 0.72
            else:
                threshold = 0.19
            is_blinking = ear < threshold
            if is_blinking and not was_blinking:
                blink_count += 1
            was_blinking = is_blinking

            # Smile proxy (normalized by face width)
            smile_ratio = _mouth_smile_ratio(landmarks, w, h)
            smile_ratios.append(smile_ratio)
    finally:
        cap.release()
        face_mesh.close()
        pose.close()

    # BUGFIX: derive duration from frames actually decoded rather than the
    # container's CAP_PROP_FRAME_COUNT metadata, which is frequently 0 or
    # unreliable for webm/vp9 uploads (especially if the upstream ffmpeg
    # re-encode step was skipped or failed). frame_idx is ground truth: it
    # only increments once per frame genuinely read by cap.read().
    duration_sec = (frame_idx / fps) if fps else 0

    if faces_found == 0:
        return {
            "error": "no face detected in video",
            "framesAnalyzed": sampled,
            "faceDetectedPct": 0,
            "durationSec": round(duration_sec, 1),
        }

    if faces_found < MIN_FRAMES_FOR_RELIABLE_RESULT:
        low_confidence = True
    else:
        low_confidence = False

    # Smile threshold relative to this person's own resting mouth ratio,
    # rather than one fixed number for every face shape.
    if smile_ratios:
        resting = float(np.percentile(smile_ratios, 25))
        smile_threshold = resting * 1.12
        smile_frames = sum(1 for r in smile_ratios if r > smile_threshold)

    face_detected_pct = round(100 * faces_found / max(sampled, 1), 1)
    eye_contact_pct = round(100 * forward_count / max(faces_found, 1), 1)
    smile_pct = round(100 * smile_frames / max(faces_found, 1), 1)

    # Head stability: lower variance in offset => more stable => higher score
    offset_std = float(np.std(offset_history)) if offset_history else 0
    head_stability = max(0, round(100 - min(offset_std * 400, 100), 1))

    blinks_per_min = round(blink_count / (duration_sec / 60), 1) if duration_sec > 0 else 0

    # Posture score: penalize shoulder tilt and forward/lateral lean.
    if tilt_samples:
        avg_tilt = float(np.mean(tilt_samples))
        avg_lean = float(np.mean(lean_samples))
        posture_penalty = min(avg_tilt * 300, 50) + min(avg_lean * 150, 50)
        posture_score = max(0, round(100 - posture_penalty, 1))
    else:
        posture_score = None  # pose not reliably detected (e.g. tight crop)

    # Single rollup score combining the above, weighted toward eye contact
    # and stability since those matter most for perceived confidence.
    components = [
        (eye_contact_pct, 0.35),
        (head_stability, 0.25),
        (posture_score if posture_score is not None else 65, 0.25),
        (min(smile_pct * 2, 100), 0.15),  # some smiling is good; don't need constant
    ]
    engagement_score = round(sum(v * wgt for v, wgt in components), 1)

    result = {
        "framesAnalyzed": sampled,
        "faceDetectedPct": face_detected_pct,
        "eyeContactPct": eye_contact_pct,
        "smilePct": smile_pct,
        "headStability": head_stability,
        "postureScore": posture_score,
        "blinkRate": blinks_per_min,
        "engagementScore": engagement_score,
        "durationSec": round(duration_sec, 1),
        "lowConfidence": low_confidence,
    }
    return result