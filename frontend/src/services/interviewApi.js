// frontend/src/services/interviewApi.js

// Backend API URL - Your Render deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     import.meta.env.REACT_APP_API_URL || 
                     "https://prepmate-ai-backend-ckrb.onrender.com/api";

console.log("🌐 API Base URL:", API_BASE_URL);

/**
 * Create a new interview session
 * @param {Object} formData - Interview creation data
 * @returns {Promise<Object>} Interview session with skills and questions
 */
export const createInterviewSession = async (formData) => {
  try {
    console.log("🚀 Calling Backend API:", `${API_BASE_URL}/create-interview`);
    console.log("📦 Request payload:", {
      jobTitle: formData.jobTitle,
      jobDescription: formData.jobDescription?.substring(0, 100) + "...",
      experienceLevel: formData.experienceLevel,
      interviewType: formData.interviewType,
    });
    
    // Add timeout for slow Render cold starts (90 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    
    const response = await fetch(`${API_BASE_URL}/create-interview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        experienceLevel: formData.experienceLevel,
        interviewType: formData.interviewType,
        industry: formData.industry || ""
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Log response details
    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("❌ Server error response:", errorData);
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Interview generated successfully");
    console.log("📊 Skills count:", data.skills?.technicalSkills?.length || 0);
    console.log("❓ Questions count:", data.questions?.length || 0);
    
    // Validate response structure
    if (!data.skills || !data.questions) {
      throw new Error("Invalid response structure from server");
    }
    
    if (data.questions.length === 0) {
      throw new Error("No questions were generated. Please try again.");
    }
    
    return data; // { skills, questions }
    
  } catch (error) {
    console.error("❌ API Error:", error);
    
    // Better error messages based on error type
    if (error.name === 'AbortError') {
      throw new Error(
        "Request timed out after 90 seconds. " +
        "This usually happens when Render's free tier is sleeping (cold start). " +
        "Please wait a moment and try again."
      );
    }
    
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      throw new Error(
        "❌ Cannot connect to backend server.\n\n" +
        "Please check:\n" +
        "1. Backend is running on Render: https://prepmate-ai-backend-ckrb.onrender.com\n" +
        "2. Check Render dashboard for service status\n" +
        "3. Try refreshing the page\n\n" +
        "If the problem persists, the backend may be sleeping (Render free tier). " +
        "Visit the backend URL to wake it up, then try again."
      );
    }
    
    if (error.message.includes("CORS")) {
      throw new Error(
        "CORS error: Backend is blocking requests from this domain. " +
        "Please check CORS configuration in backend app.py"
      );
    }
    
    throw error;
  }
};

/**
 * Analyze interview answer using AI
 * @param {Object} answerData - Answer data to analyze
 * @param {Object} interviewContext - Interview context (job title, experience level, etc.)
 * @returns {Promise<Object>} Analysis results with score and feedback
 */
export const analyzeAnswer = async (answerData, interviewContext) => {
  try {
    console.log("🔍 Analyzing answer with AI...");
    console.log("📝 Question:", answerData.question?.substring(0, 60) + "...");
    console.log("💬 Answer length:", answerData.answer?.length, "characters");
    
    // Add timeout (60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(`${API_BASE_URL}/analyze-answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: answerData.question,
        answer: answerData.answer,
        round: answerData.round,
        jobTitle: interviewContext.jobTitle,
        experienceLevel: interviewContext.experienceLevel
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log("📡 Analysis response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("❌ Analysis error response:", errorData);
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Analysis complete");
    console.log("📊 Score:", data.score);
    console.log("💡 Feedback points:", data.feedback?.length || 0);
    
    // Validate response structure
    if (typeof data.score !== 'number') {
      console.warn("⚠️ Invalid score, using default");
      data.score = 5;
    }
    
    return {
      score: data.score || 5,
      feedback: data.feedback || [],
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      hasExamples: data.hasExamples || false
    };
    
  } catch (error) {
    console.error("❌ Analysis Error:", error);
    
    if (error.name === 'AbortError') {
      throw new Error("Analysis timed out after 60 seconds. Please try again.");
    }
    
    if (error.message.includes("Failed to fetch")) {
      throw new Error("Cannot connect to backend for analysis. Please check your connection.");
    }
    
    throw error;
  }
};

/**
 * Test backend connection
 * @returns {Promise<boolean>}
 */
export const testBackendConnection = async () => {
  try {
    console.log("🏥 Testing backend connection:", `${API_BASE_URL}/health`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const isHealthy = response.ok;
    console.log(isHealthy ? "✅ Backend is healthy" : "❌ Backend is not responding");
    
    if (isHealthy) {
      const data = await response.json();
      console.log("📊 Backend info:", data);
    }
    
    return isHealthy;
  } catch (error) {
    console.error("❌ Backend not reachable:", error.message);
    return false;
  }
};

/**
 * Get backend health info
 * @returns {Promise<Object|null>}
 */
export const getBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Cannot fetch backend health:", error);
    return null;
  }
};

// Export API_BASE_URL for debugging
export { API_BASE_URL };