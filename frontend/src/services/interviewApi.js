// frontend/src/services/interviewApi.js

const getAPIUrl = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return 'https://prepmate-ai-backend-ckrb.onrender.com';
};

const API_BASE_URL = `${getAPIUrl()}/api`;

console.log("🌐 API Base URL:", API_BASE_URL);

const fetchWithRetry = async (url, options, { retries = 2, backoffMs = 1000 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status >= 500 && attempt < retries) {
        await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError' || attempt === retries) throw err;
      await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)));
    }
  }
  throw lastError;
};

export const createInterviewSession = async (formData) => {
  try {
    console.log("🚀 createInterviewSession →", `${API_BASE_URL}/create-interview`);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000);

    const response = await fetchWithRetry(`${API_BASE_URL}/create-interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobTitle:        formData.jobTitle,
        jobDescription:  formData.jobDescription,
        experienceLevel: formData.experienceLevel,
        interviewType:   formData.interviewType,
        industry:        formData.industry        || "",
        questionsCount:  formData.questionsCount  || 5,
        difficulty:      formData.difficulty      || "mixed",
        focusAreas:      formData.focusAreas      || [],
        roundName:       formData.roundName       || "Interview Round",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Questions:", data.questions?.length);

    if (!data.skills || !data.questions?.length) {
      throw new Error("Invalid response from server. Please try again.");
    }

    return data;

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        "Request timed out (90 s). Render's free tier may be waking up — " +
        "please wait a moment and try again."
      );
    }
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      throw new Error(
        "Cannot connect to the backend. Please check your internet connection " +
        "or visit https://prepmate-ai-backend-ckrb.onrender.com to wake the server."
      );
    }
    throw error;
  }
};

export const analyzeAnswer = async (answerData, interviewContext) => {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 60000);

    const response = await fetchWithRetry(`${API_BASE_URL}/analyze-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question:        answerData.question,
        answer:          answerData.answer,
        round:           answerData.round,
        jobTitle:        interviewContext.jobTitle,
        experienceLevel: interviewContext.experienceLevel,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      score:        typeof data.score === 'number' ? data.score : 5,
      feedback:     data.feedback     || [],
      strengths:    data.strengths    || [],
      improvements: data.improvements || [],
      hasExamples:  data.hasExamples  || false,
    };

  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error("Analysis timed out. Please try again.");
    }
    const wc = (answerData.answer || '').split(/\s+/).length;
    return {
      score:        Math.min(3 + Math.floor(wc / 20), 8),
      feedback:     ["AI scoring unavailable. Score estimated from answer length."],
      strengths:    ["Attempted the question"],
      improvements: ["Add concrete examples and quantify your results"],
      hasExamples:  false,
    };
  }
};

export const batchAnalyzeAnswers = async (answers, jobTitle, experienceLevel, onProgress) => {
  try {
    console.log(`🔍 Batch analyzing ${answers.length} answers…`);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 120000);

    const response = await fetchWithRetry(`${API_BASE_URL}/batch-analyze-answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, jobTitle, experienceLevel }),
      signal: controller.signal,
    }, {
      retries: 1,
      backoffMs: 1500,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown" }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Batch analysis: ${data.results?.length} results`);
    onProgress?.('done');
    return data.results || [];

  } catch (error) {
    console.error("❌ Batch analyze failed:", error.message);

    if (error.name === 'AbortError') {
      console.warn("⏳ Batch timed out — falling back to word-count estimates");
    }
    onProgress?.('fallback');

    return answers.map(a => {
      const skipped = (a.answer || '').trim() === '[Skipped]';
      const wc      = skipped ? 0 : (a.answer || '').split(/\s+/).length;
      return {
        score:        skipped ? 0 : Math.min(3 + Math.floor(wc / 20), 8),
        feedback:     skipped
          ? ["Question was skipped."]
          : ["AI scoring unavailable. Score estimated from answer length."],
        strengths:    skipped ? [] : ["Attempted the question"],
        improvements: skipped
          ? ["Attempt all questions for full feedback."]
          : ["Add concrete examples and quantify your results"],
        hasExamples:  false,
        skipped,
      };
    });
  }
};

export const analyzeMultimodal = async (videoBlob, question, answerText, jobTitle, experienceLevel) => {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 120000);

    const form = new FormData();
    form.append("question", question || "");
    form.append("answer", answerText || "");
    form.append("jobTitle", jobTitle || "");
    form.append("experienceLevel", experienceLevel || "");
    if (videoBlob) {
      form.append("video", videoBlob, "answer.webm");
    }

    const response = await fetch(`${API_BASE_URL}/analyze-multimodal`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error("❌ Multimodal analysis failed:", error.message);
    return null;
  }
};

export const testBackendConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10000);
    const response   = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

export const getBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

export const cancelInterviewSession = async (sessionId) => {
  if (!sessionId) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/cancel-interview/${sessionId}`, {
      method: "POST",
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const exportResultsAsJSON = (results, filename = "interview-results.json") => {
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export { API_BASE_URL };

/**
 * Analyze an ENTIRE interview in one request — video clips, coding answers,
 * and skipped questions together.
 *
 * @param {Array} items - per-question metadata (questionId, question, answerText, round, skipped, isCoding)
 * @param {Map}   videoBlobs - map of questionId -> Blob, from mediaStore.all()
 * @param {string} jobTitle
 * @param {string} experienceLevel
 * @param {string} sessionId - client-generated id grouping all clips from this practice session
 * @param {string|null} userId - logged-in Supabase user id, or null if not logged in
 *
 * @returns {Promise<{results: Array|null, executiveSummary: string|null}>}
 *          results is null on total failure so the caller can show a warning.
 */
export const analyzeInterviewBatch = async (
  items,
  videoBlobs,
  jobTitle,
  experienceLevel,
  sessionId,
  userId
) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000);

    const form = new FormData();
    form.append("meta", JSON.stringify(items));
    form.append("jobTitle", jobTitle || "");
    form.append("experienceLevel", experienceLevel || "");
    form.append("sessionId", sessionId || "unknown");
    form.append("userId", userId || "");
    items.forEach((it) => {
      const blob = videoBlobs.get ? videoBlobs.get(String(it.questionId)) : null;
      if (blob) form.append(`video_${it.questionId}`, blob, `answer_${it.questionId}.webm`);
    });

    const response = await fetch(`${API_BASE_URL}/analyze-interview-batch`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return { results: data.results || [], executiveSummary: data.executiveSummary || null };
  } catch (error) {
    console.error("❌ Interview batch analysis failed:", error.message);
    return { results: null, executiveSummary: null };
  }
};

/**
 * Fetch a fresh signed URL for a previously stored recording, since signed
 * URLs expire (default 1 hour on the backend).
 * @param {string} storagePath - the storage_path value from practice_recordings
 */
export const getRecordingUrl = async (storagePath) => {
  try {
    const response = await fetch(`${API_BASE_URL}/get-recording-url?path=${encodeURIComponent(storagePath)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error("❌ Failed to fetch recording URL:", error.message);
    return null;
  }
};