// frontend/src/services/interviewApi.js

const getAPIUrl = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return 'https://prepmate-ai-backend-ckrb.onrender.com';
};

const API_BASE_URL = `${getAPIUrl()}/api`;

console.log("🌐 API Base URL:", API_BASE_URL);

/**
 * Create a new interview session.
 * Now passes questionsCount, difficulty, focusAreas, and roundName
 * so the backend can tailor questions to the user's step-3 preferences.
 */
export const createInterviewSession = async (formData) => {
  try {
    console.log("🚀 createInterviewSession →", `${API_BASE_URL}/create-interview`);

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(`${API_BASE_URL}/create-interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobTitle:        formData.jobTitle,
        jobDescription:  formData.jobDescription,
        experienceLevel: formData.experienceLevel,
        interviewType:   formData.interviewType,
        industry:        formData.industry        || "",
        // Step-3 preferences — previously sent but ignored by backend
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


/**
 * Analyze a single interview answer.
 * Used as a fallback if the batch endpoint is unavailable.
 */
export const analyzeAnswer = async (answerData, interviewContext) => {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(`${API_BASE_URL}/analyze-answer`, {
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
    // Return a safe fallback so Results.js doesn't crash
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


/**
 * Batch analyze ALL interview answers in a single API call.
 *
 * WHY: Results.js previously called analyzeAnswer() once per question
 * sequentially — 21 calls for a 3-round × 7Q interview. That chains
 * 21 LLM calls and reliably times out on Render's free tier.
 *
 * This sends everything in one request → one LLM call → one response.
 *
 * @param {Array}  answers          - Full answers array from localStorage
 * @param {string} jobTitle
 * @param {string} experienceLevel
 * @returns {Promise<Array>}        - Ordered array of analysis results
 */
export const batchAnalyzeAnswers = async (answers, jobTitle, experienceLevel) => {
  try {
    console.log(`🔍 Batch analyzing ${answers.length} answers…`);

    const controller = new AbortController();
    // Allow up to 120 s — one big call beats 21 small ones even if it's slower
    const timeoutId  = setTimeout(() => controller.abort(), 120000);

    const response = await fetch(`${API_BASE_URL}/batch-analyze-answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, jobTitle, experienceLevel }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown" }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Batch analysis: ${data.results?.length} results`);
    return data.results || [];

  } catch (error) {
    console.error("❌ Batch analyze failed:", error.message);

    if (error.name === 'AbortError') {
      console.warn("⏳ Batch timed out — falling back to word-count estimates");
    }

    // Client-side fallback: estimate every answer from word count
    // so Results.js always has something to show
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


/** Test backend reachability */
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

/** Get backend health details */
export const getBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

export { API_BASE_URL };