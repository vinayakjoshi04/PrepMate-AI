import React, { useState, useRef } from "react";
import "./SkillRoadmap.css";

/* ─── API URL ─────────────────────────────────────────── */
const getAPIUrl = () => {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000";
  }
  return "https://prepmate-ai-backend-ckrb.onrender.com";
};

/* ─── Icons ───────────────────────────────────────────── */
const Icons = {
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  BookOpen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z" />
      <path d="M5 3l.94 2.88L8 7l-2.06.62L5 10.5l-.94-2.88L2 7l2.06-.62z" />
      <path d="M19 13l.94 2.88L22 17l-2.06.62L19 20.5l-.94-2.88L16 17l2.06-.62z" />
    </svg>
  ),
};

/* ─── Milestone Card ──────────────────────────────────── */
const MilestoneCard = ({ milestone, index }) => {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    high: { color: "#f093fb", bg: "rgba(240,147,251,0.1)", border: "rgba(240,147,251,0.25)" },
    medium: { color: "#667eea", bg: "rgba(102,126,234,0.1)", border: "rgba(102,126,234,0.25)" },
    low: { color: "#43e97b", bg: "rgba(67,233,123,0.1)", border: "rgba(67,233,123,0.25)" },
  };

  const p = priorityColors[milestone.priority] || priorityColors.medium;

  return (
    <div className="milestone-card" style={{ "--delay": `${index * 0.08}s` }}>
      <div className="milestone-card-glow" style={{ background: `radial-gradient(circle, ${p.color}, transparent 70%)` }} />

      <div className="milestone-header" onClick={() => setExpanded(!expanded)}>
        <div className="milestone-left">
          <div className="milestone-number" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}99)` }}>
            {String(index + 1).padStart(2, "0")}
          </div>
          <div className="milestone-info">
            <h3 className="milestone-title">{milestone.skill}</h3>
            <div className="milestone-tags">
              <span className="milestone-tag" style={{ color: p.color, background: p.bg, borderColor: p.border }}>
                {milestone.priority} priority
              </span>
              <span className="milestone-tag milestone-tag-neutral">
                <Icons.Clock />
                {milestone.timeframe}
              </span>
            </div>
          </div>
        </div>
        <div className="milestone-right">
          <div className="milestone-match-score">
            <span className="match-pct" style={{ color: p.color }}>{milestone.matchScore || 0}%</span>
            <span className="match-label">match</span>
          </div>
          <div className={`milestone-chevron ${expanded ? "expanded" : ""}`}>
            <Icons.ChevronDown />
          </div>
        </div>
      </div>

      <div className={`milestone-body ${expanded ? "open" : ""}`}>
        <div className="milestone-body-inner">
          <p className="milestone-description">{milestone.description}</p>

          {milestone.resources && milestone.resources.length > 0 && (
            <div className="milestone-resources">
              <h4 className="resources-label">Learning Resources</h4>
              <div className="resources-list">
                {milestone.resources.map((res, i) => (
                  <a key={i} href={res.url || "#"} target="_blank" rel="noopener noreferrer" className="resource-chip">
                    <Icons.BookOpen />
                    <span>{res.name}</span>
                    <Icons.ExternalLink />
                  </a>
                ))}
              </div>
            </div>
          )}

          {milestone.subtasks && milestone.subtasks.length > 0 && (
            <div className="milestone-subtasks">
              <h4 className="resources-label">Action Items</h4>
              <ul className="subtask-list">
                {milestone.subtasks.map((task, i) => (
                  <li key={i} className="subtask-item">
                    <span className="subtask-dot" style={{ background: p.color }} />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Skill Gap Badge ─────────────────────────────────── */
const SkillGapBadge = ({ skill, type }) => {
  const styles = {
    missing: { color: "#f093fb", bg: "rgba(240,147,251,0.08)", border: "rgba(240,147,251,0.2)" },
    present: { color: "#43e97b", bg: "rgba(67,233,123,0.08)", border: "rgba(67,233,123,0.2)" },
    partial: { color: "#4facfe", bg: "rgba(79,172,254,0.08)", border: "rgba(79,172,254,0.2)" },
  };
  const s = styles[type] || styles.missing;

  return (
    <span className="skill-gap-badge" style={{ color: s.color, background: s.bg, borderColor: s.border }}>
      {type === "present" ? <Icons.Check /> : type === "partial" ? <Icons.Star /> : <Icons.AlertCircle />}
      {skill}
    </span>
  );
};

/* ─── Main Component ──────────────────────────────────── */
const SkillRoadmap = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("gaps");
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      return;
    }
    setResumeFile(file);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleSubmit = async () => {
    if (!jobDescription.trim()) { setError("Please paste a job description."); return; }
    if (!resumeFile && !resumeText.trim()) { setError("Please upload your resume or paste resume text."); return; }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const API_URL = getAPIUrl();
      const formData = new FormData();
      formData.append("jobDescription", jobDescription);

      if (resumeFile) {
        formData.append("resume", resumeFile);
      } else {
        const blob = new Blob([resumeText], { type: "text/plain" });
        formData.append("resume", blob, "resume.txt");
      }

      const response = await fetch(`${API_URL}/api/skill-gap`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");

      setResult(data);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const matchScore = result ? Math.round((result.presentSkills?.length / Math.max((result.presentSkills?.length || 0) + (result.missingSkills?.length || 0), 1)) * 100) : 0;

  return (
    <div className="sr-container">
      {/* Background blobs */}
      <div className="sr-blob sr-blob-1" />
      <div className="sr-blob sr-blob-2" />
      <div className="sr-blob sr-blob-3" />

      {/* ─── Hero ─────────────────────────────────────────── */}
      <div className="sr-hero">
        <div className="sr-eyebrow">
          <span className="sr-eyebrow-dot" />
          Module 03 · Skill Intelligence
        </div>
        <h1 className="sr-title">
          Skill Gap <span className="sr-title-gradient">&amp; Roadmap</span>
        </h1>
        <p className="sr-subtitle">
          Compare your resume against any job description. Identify exactly what's missing — then get a personalized roadmap to close the gap.
        </p>

        <div className="sr-stats">
          {[
            { value: "JD vs CV", label: "Gap Analysis" },
            { value: "AI", label: "Powered" },
            { value: "Roadmap", label: "Personalized" },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="sr-stat-divider" />}
              <div className="sr-stat">
                <span className="sr-stat-value">{s.value}</span>
                <span className="sr-stat-label">{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ─── Input Section ────────────────────────────────── */}
      <div className="sr-input-grid">
        {/* Job Description */}
        <div className="sr-card">
          <div className="sr-card-glow sr-card-glow-purple" />
          <div className="sr-card-header">
            <div className="sr-card-icon sr-icon-purple">
              <Icons.Target />
            </div>
            <div>
              <h2 className="sr-card-title">Job Description</h2>
              <p className="sr-card-subtitle">Paste the full JD below</p>
            </div>
          </div>
          <textarea
            className="sr-textarea"
            placeholder="Paste the job description here...&#10;&#10;Include requirements, responsibilities, and skills needed."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
          />
          <div className="sr-char-count">{jobDescription.length} chars</div>
        </div>

        {/* Resume */}
        <div className="sr-card">
          <div className="sr-card-glow sr-card-glow-pink" />
          <div className="sr-card-header">
            <div className="sr-card-icon sr-icon-pink">
              <Icons.Upload />
            </div>
            <div>
              <h2 className="sr-card-title">Your Resume</h2>
              <p className="sr-card-subtitle">Upload file or paste text</p>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`sr-dropzone ${resumeFile ? "has-file" : ""}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {resumeFile ? (
              <div className="sr-file-info">
                <div className="sr-file-icon">
                  <Icons.Check />
                </div>
                <span className="sr-file-name">{resumeFile.name}</span>
                <button className="sr-file-remove" onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}>
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="sr-dz-icon"><Icons.Upload /></div>
                <p className="sr-dz-text">Drop your resume here</p>
                <p className="sr-dz-sub">PDF, DOC, DOCX · Max 5MB</p>
              </>
            )}
          </div>

          <div className="sr-divider-row">
            <span className="sr-divider-line" />
            <span className="sr-divider-label">or paste text</span>
            <span className="sr-divider-line" />
          </div>

          <textarea
            className="sr-textarea sr-textarea-sm"
            placeholder="Paste your resume text here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={5}
            disabled={!!resumeFile}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="sr-error">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* CTA */}
      <div className="sr-cta-wrap">
        <button className="sr-cta-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <span className="sr-spinner" />
              Analyzing your profile...
            </>
          ) : (
            <>
              <Icons.Sparkles />
              Build My Roadmap
              <Icons.ArrowRight />
            </>
          )}
        </button>
        <p className="sr-cta-hint">Powered by Llama 3.1 · Analysis takes ~15 seconds</p>
      </div>

      {/* ─── Results ──────────────────────────────────────── */}
      {result && (
        <div className="sr-results" ref={resultsRef}>

          {/* Score Banner */}
          <div className="sr-score-banner">
            <div className="sr-score-banner-glow" />
            <div className="sr-score-left">
              <div className="sr-score-ring">
                <svg viewBox="0 0 120 120" className="sr-ring-svg">
                  <circle cx="60" cy="60" r="50" className="sr-ring-bg" />
                  <circle
                    cx="60" cy="60" r="50"
                    className="sr-ring-fill"
                    strokeDasharray={`${matchScore * 3.14} 314`}
                    strokeDashoffset="0"
                  />
                </svg>
                <div className="sr-ring-text">
                  <span className="sr-ring-pct">{matchScore}%</span>
                  <span className="sr-ring-label">Match</span>
                </div>
              </div>
            </div>
            <div className="sr-score-right">
              <h2 className="sr-score-title">Profile Analysis Complete</h2>
              <p className="sr-score-desc">
                You match <strong>{matchScore}%</strong> of the job requirements. Here's your personalized plan to reach 100%.
              </p>
              <div className="sr-score-chips">
                <span className="sr-score-chip sr-chip-green">
                  <Icons.Check /> {result.presentSkills?.length || 0} Skills Matched
                </span>
                <span className="sr-score-chip sr-chip-pink">
                  <Icons.AlertCircle /> {result.missingSkills?.length || 0} Skills Missing
                </span>
                <span className="sr-score-chip sr-chip-blue">
                  <Icons.Clock /> {result.totalTimeframe || "8–12 weeks"}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="sr-tabs">
            {[
              { id: "gaps", label: "Skill Gaps", icon: <Icons.Target /> },
              { id: "roadmap", label: "Roadmap", icon: <Icons.Map /> },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`sr-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Gaps Tab */}
          {activeTab === "gaps" && (
            <div className="sr-tab-content sr-gaps-content">
              <div className="sr-gaps-grid">
                {/* Missing Skills */}
                <div className="sr-gaps-column">
                  <div className="sr-gaps-col-header sr-col-missing">
                    <Icons.AlertCircle />
                    <span>Missing Skills ({result.missingSkills?.length || 0})</span>
                  </div>
                  <div className="sr-badges-wrap">
                    {(result.missingSkills || []).map((skill, i) => (
                      <SkillGapBadge key={i} skill={skill} type="missing" />
                    ))}
                  </div>
                </div>

                {/* Present Skills */}
                <div className="sr-gaps-column">
                  <div className="sr-gaps-col-header sr-col-present">
                    <Icons.Check />
                    <span>You Already Have ({result.presentSkills?.length || 0})</span>
                  </div>
                  <div className="sr-badges-wrap">
                    {(result.presentSkills || []).map((skill, i) => (
                      <SkillGapBadge key={i} skill={skill} type="present" />
                    ))}
                  </div>
                </div>
              </div>

              {result.summary && (
                <div className="sr-summary-box">
                  <Icons.Sparkles />
                  <p>{result.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Roadmap Tab */}
          {activeTab === "roadmap" && (
            <div className="sr-tab-content">
              <div className="sr-roadmap-intro">
                <Icons.Map />
                <div>
                  <h3>Your Learning Roadmap</h3>
                  <p>Prioritized milestones to go from where you are to where you want to be.</p>
                </div>
              </div>
              <div className="sr-milestones">
                {(result.roadmap || []).map((milestone, i) => (
                  <MilestoneCard key={i} milestone={milestone} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillRoadmap;