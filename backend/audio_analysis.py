# backend/audio_analysis.py
# Vocal-delivery analysis for an interview answer.
#
# Install:
#   pip install librosa soundfile numpy pydub transformers==4.44.2 accelerate torch
#   (ffmpeg must be installed on the system / available on PATH — needed by
#    both pydub and whisper for decoding uploaded .webm/.mp4 recordings)
#
# IMPORTANT: pin transformers==4.44.2 (and huggingface_hub==0.25.2,
# tokenizers==0.19.1). Newer transformers (5.x) changed the ASR pipeline's
# output handling and was returning empty transcripts in testing.
#
# CHANGELOG (this revision):
#   - NEW: _looks_degenerate() detects Whisper's known failure mode on
#     unclear/silent/noisy audio, where it gets stuck repeating the same
#     short token or phrase dozens of times (e.g. ", absolute, absolute,
#     absolute, ..."). Previously this garbage text was passed straight
#     through as the transcript — feeding nonsense into wordsPerMinute,
#     fillerWordRate, and the LLM scoring prompt. Now, if the raw Whisper
#     output looks degenerate, we discard it and report a clear
#     transcriptionNote instead, and skip wpm/filler calculations that
#     would otherwise be computed from garbage.
#
# CHANGELOG (earlier revisions):
#   - BUGFIX: when _extract_wav() failed (pydub missing, clip too short,
#     ffmpeg decode error, etc.) analyze_audio() silently discarded that
#     error and tried to librosa.load() the ORIGINAL file instead (which is
#     often a video container librosa/audioread can't handle well). The
#     caller then saw a confusing generic "could not load audio: ..." error
#     instead of the real, actionable reason. Fixed: if wav extraction fails,
#     return that error immediately instead of guessing with a fallback load.
#   - FIXED: _transcribe() was passing generate_kwargs={"language": "en"} to
#     the pipeline unconditionally. English-only checkpoints (any model name
#     ending in ".en", e.g. the default "openai/whisper-tiny.en") reject
#     `language`/`task` generate_kwargs entirely and raise:
#       "Cannot specify `task` or `language` for an English-only model."
#     This caused transcription to fail on every single request, so
#     transcript always came back empty and wordsPerMinute was always None.
#     Fix: only pass language/task kwargs when using a multilingual
#     checkpoint (a model name that does NOT end in ".en").
#   - Added debug logging of the raw Whisper pipeline output in _transcribe()
#     so empty-transcript issues are visible instead of silent.
#   - Using transformers' Whisper pipeline instead of openai-whisper or
#     faster-whisper (those pull in compiled extensions blocked by Windows
#     Application Control / WDAC policy on this machine).
#   - Whisper pipeline is loaded ONCE at import/warm-up time (see
#     preload_whisper(), called from app.py at startup).
#   - wordsPerMinute clamped to a sane range (30-220), None with a reason
#     when the transcript is too short to trust.
#   - Filler word matching uses a single compiled alternation regex.
#   - Detects near-silent/empty clips up front and returns a clear error.
#   - Added pauseRatio and deliveryScore rollup.

import os
import re
import tempfile

import numpy as np

try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False

try:
    from transformers import pipeline
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

WHISPER_MODEL_NAME = os.getenv("WHISPER_MODEL_NAME", "openai/whisper-tiny.en")

# English-only checkpoints (name ends in ".en") reject `language`/`task`
# generate_kwargs outright. Multilingual checkpoints need `language`/`task`
# set explicitly, otherwise they may auto-detect the wrong language on noisy
# clips. Compute this once at import time since WHISPER_MODEL_NAME is fixed
# for the process lifetime.
_IS_ENGLISH_ONLY_MODEL = WHISPER_MODEL_NAME.strip().endswith(".en")

FILLER_WORDS = [
    "um", "uh", "umm", "uhh", "erm", "hmm", "like", "you know",
    "sort of", "kind of", "actually", "basically", "literally", "i mean",
]
_FILLER_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(p) for p in sorted(FILLER_WORDS, key=len, reverse=True)) + r')\b',
    re.IGNORECASE,
)

MIN_WPM, MAX_WPM = 30, 220
MIN_WORDS_FOR_WPM = 5

# Minimum consecutive repeats of the same word/short-phrase before we call a
# transcript "degenerate" and throw it out. Real speech essentially never
# repeats one word or a 2-4 word phrase back-to-back this many times.
_DEGENERATE_REPEAT_THRESHOLD = 8

_whisper_pipe = None


def preload_whisper():
    """Call this once at app startup (see app.py) so the model is already
    in memory before the first real request comes in. Safe to call more
    than once — it's a no-op after the first successful load."""
    global _whisper_pipe
    if not WHISPER_AVAILABLE:
        print("⚠️  transformers not installed — audio transcription disabled. "
              "Run: pip install transformers==4.44.2 accelerate")
        return None
    if _whisper_pipe is None:
        print(f"🔊 Loading Whisper '{WHISPER_MODEL_NAME}' via transformers (one-time)...")
        _whisper_pipe = pipeline(
            "automatic-speech-recognition",
            model=WHISPER_MODEL_NAME,
            chunk_length_s=30,
        )
        print("✅ Whisper pipeline loaded and ready")
    return _whisper_pipe


def _get_whisper_pipe():
    return _whisper_pipe if _whisper_pipe is not None else preload_whisper()


def _extract_wav(input_path):
    """Convert any uploaded audio/video file to a 16kHz mono wav for analysis."""
    if not PYDUB_AVAILABLE:
        return None, "pydub not installed"
    try:
        audio = AudioSegment.from_file(input_path)
        if len(audio) < 500:
            return None, "clip too short"
        audio = audio.set_channels(1).set_frame_rate(16000)
        tmp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        audio.export(tmp_wav.name, format="wav")
        return tmp_wav.name, None
    except Exception as e:
        return None, f"extraction failed: {e}"


def _looks_degenerate(transcript):
    """
    Detects Whisper's known failure mode on unclear/quiet/noisy audio: it
    gets stuck in a loop repeating the same short token or phrase, e.g.
    ", absolute, absolute, absolute, absolute, ..." This is not real speech
    content, so we want to catch it and treat the transcript as unusable
    rather than feeding it into wpm/filler-rate math or the scoring prompt.
    """
    if not transcript or not transcript.strip():
        return False

    words = re.findall(r"[a-z0-9']+", transcript.lower())
    if len(words) < _DEGENERATE_REPEAT_THRESHOLD:
        return False

    # Case 1: a single word repeated N+ times back-to-back.
    run_len = 1
    for i in range(1, len(words)):
        if words[i] == words[i - 1]:
            run_len += 1
            if run_len >= _DEGENERATE_REPEAT_THRESHOLD:
                return True
        else:
            run_len = 1

    # Case 2: a short phrase (2-4 words) repeating back-to-back many times,
    # e.g. "you know you know you know you know ...".
    for phrase_len in (2, 3, 4):
        if len(words) < phrase_len * _DEGENERATE_REPEAT_THRESHOLD:
            continue
        run_len = 1
        i = phrase_len
        while i + phrase_len <= len(words):
            if words[i:i + phrase_len] == words[i - phrase_len:i]:
                run_len += 1
                if run_len >= _DEGENERATE_REPEAT_THRESHOLD:
                    return True
            else:
                run_len = 1
            i += phrase_len

    # Case 3: overall vocabulary is extremely repetitive (few unique words
    # relative to total length) — catches loops that don't perfectly align
    # to a fixed phrase length but are still clearly stuck.
    unique_ratio = len(set(words)) / len(words)
    if len(words) >= 15 and unique_ratio < 0.15:
        return True

    return False


def _transcribe(wav_path):
    """Transcribe using local transformers Whisper pipeline. Fully offline —
    no API key, no network call, no rate limits."""
    pipe = _get_whisper_pipe()
    if pipe is None:
        return "", "whisper pipeline not available on server"

    try:
        # IMPORTANT: English-only checkpoints (e.g. "openai/whisper-tiny.en")
        # raise "Cannot specify `task` or `language` for an English-only
        # model." if you pass language/task at all — so pass an empty dict
        # for those. Multilingual checkpoints (no ".en" suffix) are fine
        # with, and benefit from, explicit language/task.
        if _IS_ENGLISH_ONLY_MODEL:
            generate_kwargs = {}
        else:
            generate_kwargs = {"language": "en", "task": "transcribe"}

        result = pipe(wav_path, generate_kwargs=generate_kwargs)
        print(f"   🔍 DEBUG raw whisper result: {result}")
        text = (result.get("text") or "").strip()
        if not text:
            return "", "speech not understood (silence, noise, or too quiet)"

        if _looks_degenerate(text):
            print(f"   ⚠️  DEBUG transcript looked degenerate (repeated-token loop) — discarding: {text[:120]}")
            return "", "transcription unreliable (unclear or noisy audio produced a repeated-word loop)"

        return text, None
    except Exception as e:
        print(f"   ❌ DEBUG whisper exception: {e}")
        return "", f"transcription failed: {e}"


def _count_filler_words(transcript):
    return len(_FILLER_PATTERN.findall(transcript.lower()))


def analyze_audio(file_path):
    """
    Analyze the vocal delivery of an interview-answer recording.
    `file_path` can be an audio OR a video file (audio track will be extracted).
    Returns a metrics dict, or a dict with 'error' if analysis could not run.
    """
    if not LIBROSA_AVAILABLE:
        return {"error": "librosa not installed on server"}

    wav_path, extract_err = _extract_wav(file_path)
    if wav_path is None:
        # BUGFIX: previously fell through to `wav_path = file_path` and tried
        # librosa.load() on the original (often video) container anyway,
        # which masked the real reason with a generic downstream error.
        # The real reason (missing pydub, ffmpeg decode failure, clip too
        # short, etc.) is much more actionable — surface it directly.
        return {"error": extract_err or "could not extract audio from file"}
    cleanup = True

    try:
        y, sr_rate = librosa.load(wav_path, sr=16000, mono=True)
    except Exception as e:
        if cleanup:
            try:
                os.remove(wav_path)
            except Exception:
                pass
        return {"error": f"could not load audio: {e}"}

    duration_sec = len(y) / sr_rate if sr_rate else 0
    if duration_sec < 1:
        if cleanup:
            try:
                os.remove(wav_path)
            except Exception:
                pass
        return {"error": "audio too short to analyze"}

    rms_all = librosa.feature.rms(y=y)[0]
    if float(np.max(rms_all)) < 1e-4:
        if cleanup:
            try:
                os.remove(wav_path)
            except Exception:
                pass
        return {
            "error": "audio appears silent — check microphone",
            "speakingDurationSec": round(duration_sec, 1),
        }

    rms_db = librosa.amplitude_to_db(rms_all, ref=np.max)
    avg_volume_db = float(np.mean(rms_db))
    volume_std = float(np.std(rms_db))
    volume_consistency = max(0, round(100 - min(volume_std * 5, 100), 1))

    try:
        f0, voiced_flag, _ = librosa.pyin(
            y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7')
        )
        voiced_f0 = f0[voiced_flag == True] if voiced_flag is not None else np.array([])
        if len(voiced_f0) > 5:
            pitch_cv = float(np.std(voiced_f0) / (np.mean(voiced_f0) + 1e-6))
            pitch_variety = round(min(pitch_cv * 300, 100), 1)
        else:
            pitch_variety = None
    except Exception:
        pitch_variety = None

    intervals = librosa.effects.split(y, top_db=30)
    long_pause_count = 0
    silence_samples = 0
    for i in range(1, len(intervals)):
        gap_samples = intervals[i][0] - intervals[i - 1][1]
        silence_samples += max(gap_samples, 0)
        if (gap_samples / sr_rate) > 1.5:
            long_pause_count += 1
    pause_ratio = round(min(silence_samples / len(y), 1.0) * 100, 1) if len(y) else 0

    transcript, transcribe_err = _transcribe(wav_path)
    # transcript is already "" if _transcribe flagged it as degenerate — the
    # wpm/filler-rate calculations below naturally come out as 0/None for an
    # empty transcript, so no extra branching needed here.
    word_count = len(transcript.split()) if transcript else 0

    wpm = None
    if word_count >= MIN_WORDS_FOR_WPM and duration_sec > 0:
        raw_wpm = word_count / (duration_sec / 60)
        wpm = round(min(max(raw_wpm, MIN_WPM), MAX_WPM), 1)

    filler_count = _count_filler_words(transcript) if transcript else 0
    filler_rate = round(filler_count / max(word_count, 1) * 100, 1) if word_count else 0

    if cleanup:
        try:
            os.remove(wav_path)
        except Exception:
            pass

    filler_penalty = min(filler_rate * 2, 30)
    pause_penalty = min(pause_ratio * 0.4, 25)
    pitch_component = pitch_variety if pitch_variety is not None else 55
    delivery_score = round(max(0, min(100,
        volume_consistency * 0.35
        + pitch_component * 0.25
        + (100 - filler_penalty) * 0.20
        + (100 - pause_penalty) * 0.20
    )), 1)

    return {
        "transcript": transcript,
        "transcriptionNote": transcribe_err,
        "speakingDurationSec": round(duration_sec, 1),
        "wordsPerMinute": wpm,
        "fillerWordCount": filler_count,
        "fillerWordRate": filler_rate,
        "avgVolumeDb": round(avg_volume_db, 1),
        "volumeConsistency": volume_consistency,
        "pitchVariety": pitch_variety,
        "longPauseCount": long_pause_count,
        "pauseRatio": pause_ratio,
        "deliveryScore": delivery_score,
    }