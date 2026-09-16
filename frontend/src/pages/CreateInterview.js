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

// ── Recording math constants ────────────────────────────────────────────
// Mirrors backend/interview.py MIN_RECORD_SECONDS / MAX_RECORD_SECONDS in
// Interview.js — a spoken answer can run anywhere from 1 to 10 minutes.
// These are used to give the user a REALISTIC time/storage range up front,
// instead of a single flat guess that was wrong once the min went from
// 3 seconds to 1 minute.
const MIN_RECORD_MINUTES = 1;
const MAX_RECORD_MINUTES = 10;

// Rough size of a 720p webm (vp9+opus) recording per minute of footage.
// This varies with motion/lighting, so treat it as an estimate, not a hard
// number — used only to give the user a sense of scale before they start.
const EST_MB_PER_MINUTE = 10;

/**
 * Given a question count, returns the best/worst-case time range (in
 * minutes) for ONE round, assuming every question is spoken (not coding).
 * Coding questions don't record video, so this is a ceiling, not a promise.
 */
function estimateRoundTimeRange(questionCount) {
  return {
    minMinutes: questionCount * MIN_RECORD_MINUTES,
    maxMinutes: questionCount * MAX_RECORD_MINUTES,
  };
}

/**
 * Given a question count and number of rounds, returns the combined
 * time + storage range across the WHOLE interview.
 */
function estimateInterviewTotals(questionCount, roundCount) {
  const totalQuestions = questionCount * roundCount;
  const minMinutes = totalQuestions * MIN_RECORD_MINUTES;
  const maxMinutes = totalQuestions * MAX_RECORD_MINUTES;
  const minStorageMB = totalQuestions * MIN_RECORD_MINUTES * EST_MB_PER_MINUTE;
  const maxStorageMB = totalQuestions * MAX_RECORD_MINUTES * EST_MB_PER_MINUTE;
  return { totalQuestions, minMinutes, maxMinutes, minStorageMB, maxStorageMB };
}

function formatMinutes(mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatStorage(mb) {
  if (mb < 1000) return `${Math.round(mb)}MB`;
  return `${(mb / 1000).toFixed(1)}GB`;
}

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

  // ── Camera/mic permission checkbox state ────────────────────────────────
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState("idle"); // idle | checking | ok | error
  const [permissionError, setPermissionError] = useState("");

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

  // ── Camera/mic permission checkbox ──────────────────────────────────────
  const handlePermissionCheckbox = async (e) => {
    const checked = e.target.checked;
    setPermissionsChecked(checked);
    if (!checked) {
      setPermissionStatus("idle");
      return;
    }
    setPermissionStatus("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(t => t.stop());
      setPermissionStatus("ok");
    } catch (err) {
      console.error("Permission check failed:", err);
      setPermissionsChecked(false);
      setPermissionStatus("error");
      setPermissionError("Camera/mic access was blocked. Enable it in your browser settings, then check the box again.");
    }
  };

  const handleSaveDraft = () => {
    localStorage.setItem("interviewDraft", JSON.stringify({ formData, selectedRounds }));
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
    if (!permissionsChecked || permissionStatus !== "ok") {
      alert("Please check the camera & microphone permission box before starting — spoken questions require it.");
      return;
    }

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
          <div className="loading-icon" />
          <h2>Preparing Your Interview</h2>
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

  // ── Live estimates used in Step 3 ────────────────────────────────────────
  const totals = estimateInterviewTotals(formData.questionsPerRound, selectedRounds.length || 1);

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
            {step === 1 ? "Set up your interview" :
             step === 2 ? "Define the scope" :
             "Fine-tune preferences"}
          </h1>
          <p>
            {step === 1 ? "Tell us about the role you're preparing for" :
             step === 2 ? "Paste the job description and choose your rounds" :
             "Customize difficulty, question count, and camera access"}
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
                  {[3, 5, 7, 10].map(n => {
                    const { minMinutes, maxMinutes } = estimateRoundTimeRange(n);
                    return (
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
                        {/* Was a flat "~{n*3} min" guess left over from the old
                            3-second minimum. Now a real range: each spoken
                            answer can run 1–10 minutes, so a round of n
                            questions takes anywhere from n*1 to n*10 minutes. */}
                        <span className="qcount-time">
                          {formatMinutes(minMinutes)}–{formatMinutes(maxMinutes)} /round
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="form-hint">
                  Range assumes all spoken questions (1–10 min each). Coding questions don't record video and won't count toward this.
                </p>
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

              {/* ── Time & Storage Estimate (computed from questionsPerRound
                   × number of selected rounds × the 1–10 min recording range) ── */}
              <div className="form-section">
                <label className="form-label">Estimated Time & Storage</label>
                <div className="estimate-card">
                  <div className="estimate-row">
                    <span className="estimate-label">Total spoken questions</span>
                    <span className="estimate-val">
                      {formData.questionsPerRound} × {selectedRounds.length || 1} round{(selectedRounds.length || 1) > 1 ? "s" : ""} = {totals.totalQuestions}
                    </span>
                  </div>
                  <div className="estimate-row">
                    <span className="estimate-label">Interview duration</span>
                    <span className="estimate-val">
                      {formatMinutes(totals.minMinutes)} – {formatMinutes(totals.maxMinutes)}
                    </span>
                  </div>
                  <div className="estimate-row">
                    <span className="estimate-label">Recording storage (approx.)</span>
                    <span className="estimate-val">
                      {formatStorage(totals.minStorageMB)} – {formatStorage(totals.maxStorageMB)}
                    </span>
                  </div>
                </div>
                <p className="form-hint">
                  Storage is a rough estimate based on typical webcam recording size — actual size depends on your camera, lighting, and how much you move. If you switch any questions to coding mode during the interview, both numbers will come in lower than shown here.
                </p>
              </div>

              {/* ── Camera & Mic permission checkbox ── */}
              <div className="form-section">
                <label className="form-label">
                  Camera & Microphone Access <span className="required">*</span>
                </label>
                <p className="form-hint">
                  Spoken questions are recorded on your webcam so PrepMate can analyze eye
                  contact, posture, and vocal delivery alongside your answer content.
                  Coding questions use a text editor instead and don't need your camera.
                </p>
                <label className={`permission-check-card ${permissionStatus}`}>
                  <input
                    type="checkbox"
                    checked={permissionsChecked}
                    onChange={handlePermissionCheckbox}
                  />
                  <span className="permission-checkbox-custom">
                    {permissionStatus === "ok" ? "✓" : ""}
                  </span>
                  <div className="permission-check-body">
                    <div className="permission-check-title">
                      I allow camera & microphone access for this interview
                    </div>
                    <div className="permission-check-sub">
                      {permissionStatus === "checking" && "Requesting permission…"}
                      {permissionStatus === "ok" && "✅ Camera & mic verified — you're ready to record"}
                      {permissionStatus === "error" && (
                        <span className="permission-error">{permissionError}</span>
                      )}
                      {permissionStatus === "idle" && "Nothing is recorded now — this just confirms access works"}
                    </div>
                  </div>
                </label>
                {!permissionsChecked && (
                  <span className="error-text">Required to start a video interview</span>
                )}
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
    </div>
  );
}