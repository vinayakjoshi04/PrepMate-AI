// frontend/src/pages/CreateInterview.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createInterviewSession } from "../services/interviewApi";
import "./createInterview.css";

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education",
  "Retail", "Manufacturing", "Media & Entertainment",
  "Consulting", "Government", "Startup / VC-backed", "Other"
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", desc: "Foundational concepts", emoji: "🟢" },
  { value: "mixed", label: "Mixed", desc: "Balanced challenge", emoji: "🟡" },
  { value: "hard", label: "Hard", desc: "Senior-level depth", emoji: "🔴" },
];

const FOCUS_AREAS = [
  "Data Structures & Algorithms",
  "System Design",
  "Frontend / UI",
  "Backend / APIs",
  "Databases & SQL",
  "Cloud & DevOps",
  "Security",
  "Machine Learning / AI",
  "Leadership & Management",
  "Problem Solving",
  "Communication",
  "Teamwork & Collaboration",
  "Conflict Resolution",
  "Time Management",
];

const ROUND_TEMPLATES = [
  {
    id: "tech_1", name: "Technical Round 1", type: "technical",
    desc: "Core concepts, algorithms, problem solving"
  },
  {
    id: "tech_2", name: "Technical Round 2", type: "technical",
    desc: "System design, architecture, advanced topics"
  },
  {
    id: "behavioral", name: "Behavioral Round", type: "behavioral",
    desc: "Culture fit, teamwork, conflict resolution"
  },
  {
    id: "hr", name: "HR Round", type: "hr",
    desc: "Background, motivation, salary expectations"
  },
  {
    id: "case", name: "Case Study Round", type: "case",
    desc: "Business problem solving, decision making"
  },
];

export default function CreateInterview() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // multi-step form
  const [formData, setFormData] = useState({
    jobTitle: "",
    jobDescription: "",
    industry: "",
    experienceLevel: "",
    difficulty: "mixed",
    questionsPerRound: 5,
    focusAreas: [],
    customNotes: "",
  });
  const [selectedRounds, setSelectedRounds] = useState(["tech_1", "behavioral"]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [processingStep, setProcessingStep] = useState(0);

  const processingSteps = [
    "Analyzing job description…",
    "Identifying key skills…",
    "Generating technical questions…",
    "Generating behavioral questions…",
    "Tailoring difficulty…",
    "Finalizing interview…",
  ];

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.jobTitle.trim()) newErrors.jobTitle = "Job title is required";
    else if (formData.jobTitle.trim().length < 3) newErrors.jobTitle = "Must be at least 3 characters";
    if (!formData.experienceLevel) newErrors.experienceLevel = "Please select an experience level";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.jobDescription.trim()) newErrors.jobDescription = "Job description is required";
    else if (formData.jobDescription.trim().length < 50) newErrors.jobDescription = "Must be at least 50 characters";
    if (selectedRounds.length === 0) newErrors.rounds = "Select at least one round";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const toggleFocusArea = (area) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  };

  const toggleRound = (id) => {
    setSelectedRounds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
    if (errors.rounds) setErrors(prev => ({ ...prev, rounds: "" }));
  };

  const handleSaveDraft = () => {
    localStorage.setItem("interviewDraft", JSON.stringify({ formData, selectedRounds }));
    // Small toast instead of alert
    const toast = document.createElement("div");
    toast.className = "toast-saved";
    toast.textContent = "✓ Draft saved";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleLoadDraft = () => {
    const draft = localStorage.getItem("interviewDraft");
    if (draft) {
      const { formData: fd, selectedRounds: sr } = JSON.parse(draft);
      setFormData(fd);
      setSelectedRounds(sr);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    let stepIdx = 0;
    const interval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, processingSteps.length - 1);
      setProcessingStage(processingSteps[stepIdx]);
      setProcessingStep(stepIdx);
    }, 900);

    try {
      const orderedRounds = ROUND_TEMPLATES.filter(r => selectedRounds.includes(r.id));
      const allSessions = [];

      for (const round of orderedRounds) {
        const session = await createInterviewSession({
          ...formData,
          interviewType: round.type,
          roundName: round.name,
          questionsCount: formData.questionsPerRound,
          focusAreas: formData.focusAreas,
          difficulty: formData.difficulty,
        });
        allSessions.push({ ...round, questions: session.questions, skills: session.skills });
      }

      const sessionData = {
        ...formData,
        rounds: allSessions.map((r, i) => ({
          id: i + 1,
          name: r.name,
          type: r.type,
          questions: r.questions,
        })),
        skills: allSessions[0]?.skills || [],
        sessionId: `interview_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      clearInterval(interval);
      localStorage.setItem("activeInterview", JSON.stringify(sessionData));
      localStorage.removeItem("interviewDraft");

      setTimeout(() => navigate("/interview"), 400);
    } catch (error) {
      clearInterval(interval);
      console.error("Error creating interview:", error);
      alert(`Failed to generate interview: ${error.message}\n\nMake sure Flask backend is running:\ncd backend && python app.py`);
      setLoading(false);
      setProcessingStage("");
    }
  };

  if (loading) {
    return (
      <div className="create-interview-container loading-screen">
        <div className="loading-content">
          <div className="loading-icon">🤖</div>
          <h2>Crafting Your Interview</h2>
          <p className="loading-subtitle">{processingStage}</p>
          <div className="loading-steps">
            {processingSteps.map((s, i) => (
              <div key={i} className={`loading-step ${i <= processingStep ? "done" : i === processingStep + 1 ? "active" : ""}`}>
                <span className="step-dot">{i < processingStep ? "✓" : i === processingStep ? "◉" : "○"}</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div className="loading-progress-bar">
            <div className="loading-progress-fill" style={{ width: `${((processingStep + 1) / processingSteps.length) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-interview-container">
      {/* Header */}
      <header className="create-interview-header">
        <button className="back-button" onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/dashboard")}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {step > 1 ? "Back" : "Dashboard"}
        </button>

        <div className="step-indicator">
          {[1, 2, 3].map(s => (
            <div key={s} className={`step-dot-nav ${s === step ? "current" : s < step ? "done" : ""}`}>
              <span>{s < step ? "✓" : s}</span>
              <span className="step-label">{s === 1 ? "Basics" : s === 2 ? "Details" : "Preferences"}</span>
            </div>
          ))}
        </div>

        <button className="draft-button" onClick={handleLoadDraft} type="button">
          Load Draft
        </button>
      </header>

      <main className="create-interview-main">
        <div className="create-interview-hero">
          <div className="hero-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1>
            {step === 1 ? "Set Up Your Interview" :
             step === 2 ? "Define the Scope" :
             "Fine-Tune Preferences"}
          </h1>
          <p>
            {step === 1 ? "Tell us about the role you're preparing for" :
             step === 2 ? "Paste the job description and choose your rounds" :
             "Customize difficulty, question count, and focus areas"}
          </p>
        </div>

        <div className="interview-form">

          {/* ── STEP 1: Basics ── */}
          {step === 1 && (
            <>
              <div className="form-section">
                <label htmlFor="jobTitle" className="form-label">
                  Job Title <span className="required">*</span>
                </label>
                <input
                  id="jobTitle" name="jobTitle" type="text"
                  placeholder="e.g., Senior Frontend Developer"
                  value={formData.jobTitle} onChange={handleChange}
                  className={errors.jobTitle ? "error" : ""}
                />
                {errors.jobTitle && <span className="error-text">{errors.jobTitle}</span>}
              </div>

              <div className="form-section">
                <label className="form-label">Experience Level <span className="required">*</span></label>
                <div className="radio-group">
                  {["Entry Level", "Mid Level", "Senior Level", "Lead/Principal"].map(level => (
                    <label key={level} className="radio-label">
                      <input type="radio" name="experienceLevel" value={level}
                        checked={formData.experienceLevel === level} onChange={handleChange} />
                      <span className="radio-custom"></span>
                      {level}
                    </label>
                  ))}
                </div>
                {errors.experienceLevel && <span className="error-text">{errors.experienceLevel}</span>}
              </div>

              <div className="form-section">
                <label htmlFor="industry" className="form-label">
                  Industry <span className="optional">(Optional)</span>
                </label>
                <select id="industry" name="industry" value={formData.industry} onChange={handleChange}>
                  <option value="">Select an industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i.toLowerCase()}>{i}</option>)}
                </select>
              </div>
            </>
          )}

          {/* ── STEP 2: Details ── */}
          {step === 2 && (
            <>
              <div className="form-section">
                <label htmlFor="jobDescription" className="form-label">
                  Job Description <span className="required">*</span>
                </label>
                <textarea
                  id="jobDescription" name="jobDescription"
                  placeholder="Paste the full job description here — responsibilities, requirements, qualifications. The more detail, the more tailored your questions will be."
                  value={formData.jobDescription} onChange={handleChange} rows={10}
                  className={errors.jobDescription ? "error" : ""}
                />
                <div className="char-count">
                  <span className={formData.jobDescription.length >= 50 ? "count-ok" : "count-warn"}>
                    {formData.jobDescription.length} characters
                  </span>
                  {formData.jobDescription.length < 50 && " (minimum 50)"}
                </div>
                {errors.jobDescription && <span className="error-text">{errors.jobDescription}</span>}
              </div>

              <div className="form-section">
                <label className="form-label">Interview Rounds <span className="required">*</span></label>
                <p className="form-hint">Select the rounds you want to practice. Order follows the list below.</p>
                <div className="rounds-grid">
                  {ROUND_TEMPLATES.map(r => (
                    <label key={r.id} className={`round-card-label ${selectedRounds.includes(r.id) ? "selected" : ""}`}>
                      <input type="checkbox" checked={selectedRounds.includes(r.id)}
                        onChange={() => toggleRound(r.id)} />
                      <div className="round-card-body">
                        <div className="round-card-name">{r.name}</div>
                        <div className="round-card-desc">{r.desc}</div>
                      </div>
                      <span className="round-card-check">{selectedRounds.includes(r.id) ? "✓" : ""}</span>
                    </label>
                  ))}
                </div>
                {errors.rounds && <span className="error-text">{errors.rounds}</span>}
              </div>
            </>
          )}

          {/* ── STEP 3: Preferences ── */}
          {step === 3 && (
            <>
              <div className="form-section">
                <label className="form-label">Questions Per Round</label>
                <div className="qcount-row">
                  {[3, 5, 7, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`qcount-btn ${formData.questionsPerRound === n ? "selected" : ""}`}
                      onClick={() => setFormData(p => ({ ...p, questionsPerRound: n }))}
                    >
                      <span className="qcount-num">{n}</span>
                      <span className="qcount-label">
                        {n === 3 ? "Quick" : n === 5 ? "Standard" : n === 7 ? "Thorough" : "Deep Dive"}
                      </span>
                      <span className="qcount-time">~{n * 3} min</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Difficulty Preference</label>
                <div className="difficulty-grid">
                  {DIFFICULTY_OPTIONS.map(d => (
                    <label key={d.value} className={`difficulty-card ${formData.difficulty === d.value ? "selected" : ""}`}>
                      <input type="radio" name="difficulty" value={d.value}
                        checked={formData.difficulty === d.value} onChange={handleChange} />
                      <span className="diff-emoji">{d.emoji}</span>
                      <span className="diff-label">{d.label}</span>
                      <span className="diff-desc">{d.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Focus Areas <span className="optional">(Optional)</span></label>
                <p className="form-hint">Select areas to emphasize. Leave blank for auto-detection from job description.</p>
                <div className="tags-grid">
                  {FOCUS_AREAS.map(area => (
                    <button
                      key={area} type="button"
                      className={`tag-btn ${formData.focusAreas.includes(area) ? "selected" : ""}`}
                      onClick={() => toggleFocusArea(area)}
                    >
                      {formData.focusAreas.includes(area) && <span>✓ </span>}
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <label htmlFor="customNotes" className="form-label">
                  Additional Notes <span className="optional">(Optional)</span>
                </label>
                <textarea
                  id="customNotes" name="customNotes"
                  placeholder="e.g., 'I'm weak in system design', 'Focus on React hooks', 'Ask about remote work policies'..."
                  value={formData.customNotes} onChange={handleChange} rows={3}
                />
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            {step < 3 && (
              <button type="button" className="btn-secondary" onClick={handleSaveDraft}>
                Save Draft
              </button>
            )}
            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={handleNextStep}>
                Next Step
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleSubmit}>
                Generate Interview
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .toast-saved {
          position: fixed; bottom: 24px; right: 24px;
          background: #22d3a5; color: #0d1117; padding: 10px 20px;
          border-radius: 8px; font-weight: 700; font-size: 14px;
          box-shadow: 0 4px 20px rgba(34,211,165,0.4);
          animation: toastIn 0.3s ease, toastOut 0.3s ease 1.7s forwards;
          z-index: 9999;
        }
        @keyframes toastIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastOut { to { opacity:0; transform:translateY(10px); } }
      `}</style>
    </div>
  );
}