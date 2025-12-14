// frontend/src/services/interviewApi.js

const API_BASE_URL = "http://localhost:5000/api";

/**
 * Create a new interview session
 * @param {Object} formData - Interview creation data
 * @returns {Promise<Object>} Interview session with skills and questions
 */
export const createInterviewSession = async (formData) => {
  try {
    console.log("🚀 Calling Flask API:", `${API_BASE_URL}/create-interview`);
    
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Interview generated:", data);
    return data; // { skills, questions }
    
  } catch (error) {
    console.error("❌ API Error:", error);
    
    // Better error messages
    if (error.message.includes("Failed to fetch")) {
      throw new Error(
        "Cannot connect to backend. Make sure Flask is running:\n\n" +
        "cd backend\n" +
        "python app.py"
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
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Analysis complete:", data);
    
    return {
      score: data.score || 5,
      feedback: data.feedback || [],
      strengths: data.strengths || [],
      improvements: data.improvements || [],
      hasExamples: data.hasExamples || false
    };
    
  } catch (error) {
    console.error("❌ Analysis Error:", error);
    throw error;
  }
};

/**
 * Test backend connection
 * @returns {Promise<boolean>}
 */
export const testBackendConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch (error) {
    console.error("Backend not reachable:", error);
    return false;
  }
};