import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInterviewSession } from "../services/interviewApi";
import "./createInterview.css";

export default function CreateInterview() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    industry: "",
    experienceLevel: ""
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState("");

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = "Job title is required";
    } else if (formData.jobTitle.trim().length < 3) {
      newErrors.jobTitle = "Job title must be at least 3 characters";
    }
    
    if (!formData.jobDescription.trim()) {
      newErrors.jobDescription = "Job description is required";
    } else if (formData.jobDescription.trim().length < 50) {
      newErrors.jobDescription = "Job description must be at least 50 characters";
    }
    
    if (!formData.experienceLevel) {
      newErrors.experienceLevel = "Please select an experience level";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Save as draft to localStorage
  const handleSaveDraft = () => {
    localStorage.setItem("interviewDraft", JSON.stringify(formData));
    alert("Draft saved successfully!");
  };

  // Load draft from localStorage
  const handleLoadDraft = () => {
    const draft = localStorage.getItem("interviewDraft");
    if (draft) {
      setFormData(JSON.parse(draft));
      alert("Draft loaded successfully!");
    } else {
      alert("No draft found!");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setProcessingStage("Analyzing job description...");
    
    try {
      // Call backend for technical questions
      setProcessingStage("Generating technical questions...");
      const technicalSession = await createInterviewSession({
        ...formData,
        interviewType: "technical"
      });
      
      // Call backend for behavioral questions
      setProcessingStage("Generating behavioral questions...");
      const behavioralSession = await createInterviewSession({
        ...formData,
        interviewType: "behavioral"
      });
      
      // Store the complete interview session
      const sessionData = {
        ...formData,
        skills: technicalSession.skills,
        technicalQuestions: technicalSession.questions,
        behavioralQuestions: behavioralSession.questions,
        sessionId: `interview_${Date.now()}`,
      };
      
      // Save to localStorage
      localStorage.setItem("currentInterview", JSON.stringify(sessionData));
      
      // Clear draft
      localStorage.removeItem("interviewDraft");
      
      setProcessingStage("Complete!");
      
      // Navigate to skills review page
      setTimeout(() => {
        navigate("/skills-review", { state: { sessionData } });
      }, 500);
      
    } catch (error) {
      console.error("Error creating interview:", error);
      alert(
        `Failed to generate interview: ${error.message}\n\n` +
        `Make sure Flask backend is running:\n` +
        `cd backend && python app.py`
      );
      setLoading(false);
      setProcessingStage("");
    }
  };

  return (
    <div className="create-interview-container">
      {/* Header */}
      <header className="create-interview-header">
        <button 
          className="back-button"
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        
        <button 
          className="draft-button"
          onClick={handleLoadDraft}
          type="button"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Load Draft
        </button>
      </header>

      {/* Main Content */}
      <main className="create-interview-main">
        <div className="create-interview-hero">
          <div className="hero-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h1>Create New Interview</h1>
          <p>Provide job details to generate personalized AI interview questions</p>
        </div>

        <form className="interview-form" onSubmit={handleSubmit}>
          {/* Job Title */}
          <div className="form-section">
            <label htmlFor="jobTitle" className="form-label">
              Job Title <span className="required">*</span>
            </label>
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              placeholder="e.g., Senior Frontend Developer"
              value={formData.jobTitle}
              onChange={handleChange}
              className={errors.jobTitle ? "error" : ""}
              aria-invalid={errors.jobTitle ? "true" : "false"}
            />
            {errors.jobTitle && (
              <span className="error-text">{errors.jobTitle}</span>
            )}
          </div>

          {/* Experience Level */}
          <div className="form-section">
            <label htmlFor="experienceLevel" className="form-label">
              Experience Level <span className="required">*</span>
            </label>
            <div className="radio-group">
              {["Entry Level", "Mid Level", "Senior Level", "Lead/Principal"].map((level) => (
                <label key={level} className="radio-label">
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={level}
                    checked={formData.experienceLevel === level}
                    onChange={handleChange}
                  />
                  <span className="radio-custom"></span>
                  {level}
                </label>
              ))}
            </div>
            {errors.experienceLevel && (
              <span className="error-text">{errors.experienceLevel}</span>
            )}
          </div>

          {/* Industry (Optional) */}
          <div className="form-section">
            <label htmlFor="industry" className="form-label">
              Industry <span className="optional">(Optional)</span>
            </label>
            <select
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
            >
              <option value="">Select an industry</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Job Description */}
          <div className="form-section">
            <label htmlFor="jobDescription" className="form-label">
              Job Description <span className="required">*</span>
            </label>
            <textarea
              id="jobDescription"
              name="jobDescription"
              placeholder="Paste the job description here. Include responsibilities, requirements, and qualifications..."
              value={formData.jobDescription}
              onChange={handleChange}
              rows={12}
              className={errors.jobDescription ? "error" : ""}
              aria-invalid={errors.jobDescription ? "true" : "false"}
            />
            <div className="char-count">
              {formData.jobDescription.length} characters (minimum 50)
            </div>
            {errors.jobDescription && (
              <span className="error-text">{errors.jobDescription}</span>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveDraft}
              disabled={loading}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Draft
            </button>
            
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {processingStage || "Processing..."}
                </>
              ) : (
                <>
                  Generate Interview
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}