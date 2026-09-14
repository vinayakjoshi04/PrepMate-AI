// frontend/src/pages/ResumeAnalyzer.js - ENHANCED v3
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './resumeanalyzer.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',      label: 'Overview',      icon: 'home' },
  { id: 'sections',      label: 'Sections',       icon: 'layers' },
  { id: 'positives',     label: 'Positives',      icon: 'check' },
  { id: 'negatives',     label: 'Negatives',      icon: 'alert' },
  { id: 'keywords',      label: 'Keywords',       icon: 'search' },
  { id: 'format',        label: 'Format Check',   icon: 'file-text' },
  { id: 'ats-resume',    label: 'ATS Resume',     icon: 'sparkle' },
];

const SVG_ICONS = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  zap: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  'file-text': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  upload: (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  file: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  refresh: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  download: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  copy: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  sparkle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  ),
  eye: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  alert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAPIUrl = () =>
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://prepmate-ai-backend-ckrb.onrender.com';

const getScoreColor = (score) => {
  if (score >= 80) return '#43e97b';
  if (score >= 60) return '#f6c90e';
  return '#f5576c';
};

const getScoreLabel = (score) => {
  if (score >= 90) return 'Outstanding';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Needs Improvement';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Icon = ({ name, size = 18 }) => {
  const icon = SVG_ICONS[name];
  if (!icon) return null;
  return React.cloneElement(icon, { width: size, height: size });
};

const ScoreRing = ({ score, displayScore, size = 200 }) => {
  const color = getScoreColor(score);
  const inner = size * 0.84;
  return (
    <div
      className="score-circle-large"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${displayScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
      }}
    >
      <div className="score-inner-large" style={{ width: inner, height: inner }}>
        <span className="score-number-large">{displayScore}</span>
        <span className="score-total-large">/100</span>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, color, animated = true }) => (
  <div className="breakdown-bar">
    <div
      className={`breakdown-fill${animated ? ' animated-fill' : ''}`}
      style={{ width: `${value}%`, background: color || getScoreColor(value) }}
    />
  </div>
);

const KeywordTag = ({ keyword, onAdd, added }) => (
  <span className={`keyword-tag${added ? ' keyword-added' : ''}`}>
    {keyword}
    <button
      className="keyword-add"
      title={added ? 'Added' : 'Mark as added'}
      onClick={() => onAdd(keyword)}
    >
      {added ? <Icon name="check" size={14} /> : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      )}
    </button>
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ResumeAnalyzer = () => {
  const API_URL = getAPIUrl();

  // Upload state
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [showJobMatch, setShowJobMatch] = useState(false);

  // Analysis state
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [displayScore, setDisplayScore] = useState(0);
  const [addedKeywords, setAddedKeywords] = useState(new Set());
  const [copiedSection, setCopiedSection] = useState(null);

  // ATS Resume state
  const [atsResumeText, setAtsResumeText] = useState('');
  const [generatingAts, setGeneratingAts] = useState(false);
  const [atsPreviewMode, setAtsPreviewMode] = useState('preview'); // 'preview' | 'raw'
  const [downloadingFmt, setDownloadingFmt] = useState(null);

  const atsTextareaRef = useRef(null);

  // ── Animated score counter ────────────────────────────────────────────────

  useEffect(() => {
    if (!analysis?.atsScore) return;
    let current = 0;
    const target = analysis.atsScore;
    const step = target / (1500 / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [analysis]);

  // ── Load the AI-generated ATS resume when analysis arrives ────────────────

  useEffect(() => {
    if (!analysis) return;
    setAtsResumeText(analysis.improvedResume || '');
  }, [analysis]);

  // ── File validation ───────────────────────────────────────────────────────

  const validateAndSetFile = useCallback((f) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];
    if (!validTypes.includes(f.type)) {
      setError('Please upload a PDF or Word document (.pdf, .doc, .docx)');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    setFile(f);
    setFileName(f.name);
    setError('');
    setAnalysis(null);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[0]) validateAndSetFile(e.target.files[0]);
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  };

  // ── Analyze ───────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!file) { setError('Please upload a resume first'); return; }
    setLoading(true);
    setError('');
    setDisplayScore(0);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      if (jobDescription.trim()) formData.append('jobDescription', jobDescription);

      const response = await fetch(`${API_URL}/api/analyze-resume`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}: Analysis failed`);
      }

      const data = await response.json();
      setAnalysis(data);
      setActiveTab('overview');
      setAddedKeywords(new Set());
    } catch (err) {
      setError(err.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Generate / Regenerate ATS resume via API ──────────────────────────────

  const handleGenerateAtsResume = async () => {
    if (!analysis) return;
    setGeneratingAts(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/generate-ats-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          existingAnalysis: analysis,
          jobDescription: jobDescription || '',
          keywordsToAdd: Array.from(addedKeywords),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate ATS resume');
      const data = await response.json();
      if (data.atsResume) setAtsResumeText(data.atsResume);
    } catch (err) {
      setError('Could not regenerate the ATS resume. Please try again.');
    } finally {
      setGeneratingAts(false);
    }
  };

  // ── Download (real docx/pdf built server-side, txt built client-side) ────

  const handleDownload = async (format = 'pdf') => {
    // Guard against ever sending raw JSON/analysis objects as "resume text" —
    // this is what previously caused JSON to get baked into the .docx file.
    const content = (typeof atsResumeText === 'string' && atsResumeText.trim())
      ? atsResumeText
      : (typeof analysis?.improvedResume === 'string' ? analysis.improvedResume : '');

    if (!content || !content.trim()) {
      setError('There is no resume text to export yet. Click "Regenerate" on the ATS Resume tab first.');
      return;
    }
    if (content.trim().startsWith('{')) {
      setError('The ATS resume text looks malformed (JSON instead of plain text). Click "Regenerate" and try again.');
      return;
    }

    setDownloadingFmt(format);
    setError('');

    try {
      if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain' });
        triggerDownload(blob, `ats_optimized_${stripExt(fileName)}.txt`);
        return;
      }

      const response = await fetch(`${API_URL}/api/export-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, format }),
      });

      // Read the response ONCE as text, then decide how to interpret it.
      // This prevents a JSON error body from ever being saved as a "file".
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok || contentType.includes('application/json')) {
        let message = `${format.toUpperCase()} generation failed`;
        try {
          const errJson = await response.json();
          if (errJson?.error) message = errJson.error;
        } catch {
          // response wasn't JSON either — keep the generic message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      triggerDownload(blob, `ats_optimized_${stripExt(fileName)}.${format}`);
    } catch (err) {
      setError(err.message || `Download failed (${format.toUpperCase()}). Please try again.`);
    } finally {
      setDownloadingFmt(null);
    }
  };

  const triggerDownload = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stripExt = (name) => (name || 'resume').replace(/\.[^/.]+$/, '');

  // ── Copy to clipboard ─────────────────────────────────────────────────────

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      // fallback
    }
  };

  // ── Keyword tracking ──────────────────────────────────────────────────────

  const toggleKeyword = (kw) => {
    setAddedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setFile(null);
    setFileName('');
    setAnalysis(null);
    setError('');
    setJobDescription('');
    setShowJobMatch(false);
    setActiveTab('overview');
    setDisplayScore(0);
    setAddedKeywords(new Set());
    setAtsResumeText('');
  };

  // ── Score breakdown ────────────────────────────────────────────────────────

  const getBreakdown = () => {
    if (!analysis) return [];
    const sectionScores = {};
    (analysis.sectionFeedback || []).forEach((s) => {
      sectionScores[s.section?.toLowerCase()] = s.score;
    });

    const avg = (keys) => {
      const vals = keys.map((k) => sectionScores[k]).filter((v) => v !== undefined && v !== null);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    const ats = analysis.atsScore || 0;
    return [
      { label: 'Formatting',      score: avg(['format', 'formatting', 'structure', 'layout', 'contact information']) ?? Math.min(100, ats + 10) },
      { label: 'Keywords',        score: avg(['keywords', 'keyword', 'skills']) ?? Math.max(0, ats - 15) },
      { label: 'Content Quality', score: avg(['content', 'experience', 'work experience', 'professional summary']) ?? Math.min(100, ats + 5) },
      { label: 'Structure',       score: avg(['structure', 'sections', 'education']) ?? ats },
    ];
  };

  const getImpact = (index, total) => {
    if (index < Math.ceil(total * 0.3)) return 'high';
    if (index < Math.ceil(total * 0.65)) return 'medium';
    return 'low';
  };

  const impactIcon = (impact) => {
    if (impact === 'high') return SVG_ICONS.alert;
    return SVG_ICONS.info;
  };

  // ── Job match score (prefer server-computed, fallback to local estimate) ──

  const jobMatchScore = () => {
    if (analysis?.jobMatchScore !== null && analysis?.jobMatchScore !== undefined) {
      return analysis.jobMatchScore;
    }
    if (!jobDescription || !analysis) return null;
    const descWords = new Set(jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const resumeText = (atsResumeText || '').toLowerCase();
    let matched = 0;
    descWords.forEach((w) => { if (resumeText.includes(w)) matched++; });
    return descWords.size ? Math.round((matched / descWords.size) * 100) : null;
  };

  const jms = jobMatchScore();
  const formatChecks = analysis?.formatChecks;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="resume-analyzer-container">
      {/* Background Gradients */}
      <div className="bg-gradient gradient-1" />
      <div className="bg-gradient gradient-2" />
      <div className="bg-gradient gradient-3" />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="analyzer-header">
        <div className="header-content">
          <div className="header-top">
            <div>
              <h1>Resume Analyzer</h1>
              <p className="header-subtitle">
                AI-powered ATS analysis · Line-by-line scoring · Keyword optimization · JD-tailored resume export
              </p>
            </div>
            {analysis && (
              <div className="header-quick-score">
                <div className="quick-score-label">ATS Score</div>
                <div className="quick-score-value" style={{ color: getScoreColor(analysis.atsScore) }}>
                  {displayScore}
                </div>
                {jms !== null && (
                  <div className="quick-score-sublabel">
                    Job match: <span style={{ color: getScoreColor(jms) }}>{jms}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="analyzer-main">
        {/* ── Upload Section ─────────────────────────────────────────────── */}
        {!analysis && (
          <div className="upload-section">
            <div className="upload-container">
              {/* Drop Zone */}
              <div
                className={`upload-area${dragActive ? ' drag-active' : ''}${file ? ' has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!file ? (
                  <>
                    <div className="upload-icon"><Icon name="upload" size={64} /></div>
                    <h3>Upload Your Resume</h3>
                    <p>Drag & drop here, or click to browse</p>
                    <p className="upload-hint">PDF, DOC, DOCX · Max 5 MB</p>
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    <label htmlFor="resume-upload" className="btn-upload">Choose File</label>
                  </>
                ) : (
                  <>
                    <div className="file-preview">
                      <Icon name="file" size={48} />
                      <div className="file-info">
                        <p className="file-name">{fileName}</p>
                        <p className="file-size">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button onClick={handleReset} className="btn-change">Change File</button>
                  </>
                )}
              </div>

              {/* Job Description */}
              <div className="job-match-section">
                <div className="section-header">
                  <h3>
                    <Icon name="user" size={20} />
                    Target Job Description
                    <span className="optional-badge">Recommended</span>
                  </h3>
                  <button className="toggle-btn" onClick={() => setShowJobMatch(!showJobMatch)}>
                    {showJobMatch ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showJobMatch && (
                  <div className="job-input-container">
                    <textarea
                      className="job-description-input"
                      placeholder="Paste the job description here — the ATS resume we generate will be tailored specifically to it…"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={6}
                    />
                    <p className="input-hint">
                      We'll calculate a job-match score, surface missing keywords from the posting, and mirror its
                      language in your ATS-optimized resume.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="error-message">
                <Icon name="info" size={20} />
                {error}
              </div>
            )}

            {file && !error && (
              <button onClick={handleAnalyze} className="btn-analyze" disabled={loading}>
                {loading ? (
                  <><div className="button-spinner" />Analyzing every line…</>
                ) : (
                  <><Icon name="sparkle" size={20} />Analyze Resume</>
                )}
              </button>
            )}

            {/* Feature cards */}
            <div className="features-grid">
              {[
                { icon: 'check', title: 'ATS Compatibility', desc: 'Full structural audit — headings, contact info, bullet usage, and layout risk factors.' },
                { icon: 'zap',   title: 'Line-by-Line Review', desc: 'Every strength and weakness in your resume, called out individually — not vague generalities.' },
                { icon: 'search',title: 'Keyword Optimization', desc: 'Identify missing and matched keywords against the role you\'re targeting.' },
                { icon: 'file-text', title: 'Format Checker', desc: 'Deterministic checks for length, metrics, contact details, and ATS-unfriendly layout.' },
                { icon: 'user',  title: 'Job Description Matching', desc: 'Paste a JD and get a live compatibility score plus tailored language.' },
                { icon: 'download', title: 'Word / PDF Export', desc: 'Download a properly formatted, ATS-safe resume as a real .docx or .pdf.' },
              ].map(({ icon, title, desc }) => (
                <div className="feature-card" key={title}>
                  <div className="feature-icon"><Icon name={icon} size={32} /></div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Results Section ────────────────────────────────────────────── */}
        {analysis && (
          <div className="results-section">
            {/* Action Bar */}
            <div className="results-action-bar">
              <button onClick={handleReset} className="btn-new-analysis">
                <Icon name="refresh" size={20} />
                New Analysis
              </button>

              <div className="export-options">
                <span className="export-label">Download ATS Resume:</span>
                {['pdf', 'docx', 'txt'].map((fmt) => (
                  <button
                    key={fmt}
                    className="export-btn"
                    onClick={() => handleDownload(fmt)}
                    disabled={downloadingFmt === fmt}
                    title={`Download as ${fmt.toUpperCase()}`}
                  >
                    {downloadingFmt === fmt ? <div className="button-spinner small" /> : <Icon name="download" size={18} />}
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {analysis.overallVerdict && (
              <div className="verdict-banner">
                <Icon name="sparkle" size={20} />
                <p>{analysis.overallVerdict}</p>
              </div>
            )}

            {/* Job Match Banner */}
            {jms !== null && (
              <div className="job-match-banner" style={{ borderColor: getScoreColor(jms) }}>
                <div className="jmb-left">
                  <Icon name="user" size={20} />
                  <span>Job Description Match</span>
                </div>
                <div className="jmb-score" style={{ color: getScoreColor(jms) }}>
                  {jms}%
                </div>
                <div className="jmb-bar">
                  <div className="jmb-fill" style={{ width: `${jms}%`, background: getScoreColor(jms) }} />
                </div>
                <span className="jmb-label">
                  {analysis.jobMatchNotes
                    ? analysis.jobMatchNotes
                    : jms >= 75 ? 'Strong match' : jms >= 50 ? 'Moderate match' : 'Low match — add more keywords'}
                </span>
              </div>
            )}

            {/* Red flags, if any */}
            {(analysis.redFlags || []).length > 0 && (
              <div className="red-flags-banner">
                <h4><Icon name="alert" size={18} />Recruiter Red Flags</h4>
                <ul>
                  {analysis.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}
                </ul>
              </div>
            )}

            {/* Tabs */}
            <div className="results-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {SVG_ICONS[tab.icon]}
                  {tab.label}
                  {tab.id === 'ats-resume' && <span className="tab-badge">New</span>}
                </button>
              ))}
            </div>

            {/* ── Tab Content ──────────────────────────────────────────────── */}
            <div className="tab-content">

              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="tab-panel">
                  <div className="score-card-enhanced">
                    <div className="score-display-large">
                      <ScoreRing score={analysis.atsScore} displayScore={displayScore} />
                      <div className="score-info-large">
                        <h2>ATS Compatibility Score</h2>
                        <span className="score-label-large" style={{ color: getScoreColor(analysis.atsScore) }}>
                          {getScoreLabel(analysis.atsScore)}
                        </span>
                        <p className="score-description-large">
                          Your resume is{' '}
                          {analysis.atsScore >= 80 ? 'highly optimized' : analysis.atsScore >= 60 ? 'well-optimized' : 'partially optimized'}{' '}
                          for applicant tracking systems and ready for{' '}
                          {analysis.atsScore >= 80
                            ? 'immediate submission.'
                            : analysis.atsScore >= 60
                            ? 'submission with minor improvements.'
                            : 'improvement before submission.'}
                        </p>
                        {analysis.atsScore < 80 && (
                          <button
                            className="btn-goto-ats"
                            onClick={() => setActiveTab('ats-resume')}
                          >
                            <Icon name="file-text" size={16} />
                            View ATS-Optimized Resume →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="score-breakdown">
                      <h3>Score Breakdown</h3>
                      <div className="breakdown-grid">
                        {getBreakdown().map(({ label, score }) => (
                          <div className="breakdown-item" key={label}>
                            <div className="breakdown-header">
                              <span>{label}</span>
                              <span className="breakdown-score">{score}%</span>
                            </div>
                            <ProgressBar value={score} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="quick-stats-grid">
                    {[
                      { label: 'Positives', value: analysis.positives?.length || 0, gradient: 'linear-gradient(135deg,#43e97b,#38d9a9)', icon: 'check' },
                      { label: 'Issues Found', value: analysis.negatives?.length || 0, gradient: 'linear-gradient(135deg,#f5576c,#f093fb)', icon: 'alert' },
                      { label: 'Missing Keywords', value: analysis.keywordGaps?.length || 0, gradient: 'linear-gradient(135deg,#667eea,#764ba2)', icon: 'search' },
                      { label: 'Format Checks Passed', value: `${formatChecks?.passedCount ?? 0}/${formatChecks?.totalChecks ?? 0}`, gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', icon: 'file-text' },
                    ].map(({ label, value, gradient, icon }) => (
                      <div className="stat-card" key={label}>
                        <div className="stat-icon" style={{ background: gradient }}>
                          <Icon name={icon} size={24} />
                        </div>
                        <div className="stat-content">
                          <div className="stat-value">{value}</div>
                          <div className="stat-label">{label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick insights */}
                  <div className="insights-grid">
                    <div className="insights-card strengths">
                      <h3>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Key Strengths
                      </h3>
                      <ul>
                        {(analysis.strengths || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="insights-card improvements">
                      <h3>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        Priority Improvements
                      </h3>
                      <ul>
                        {(analysis.improvements || []).slice(0, 5).map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Sections */}
              {activeTab === 'sections' && (
                <div className="tab-panel">
                  <div className="section-analysis-card">
                    <h3>Section-by-Section Analysis</h3>
                    <p className="section-intro">
                      Detailed feedback on each section with specific, actionable recommendations.
                    </p>
                    <div className="sections-list">
                      {(analysis.sectionFeedback || []).map((item, i) => (
                        <div key={i} className="section-item">
                          <div className="section-header">
                            <div className="section-title-row">
                              <h4>{item.section}</h4>
                              <span
                                className="section-score"
                                style={{
                                  background: `${getScoreColor(item.score)}20`,
                                  color: getScoreColor(item.score),
                                  border: `1px solid ${getScoreColor(item.score)}40`,
                                }}
                              >
                                {item.score}/100
                              </span>
                            </div>
                            <div className="section-progress">
                              <div
                                className="section-progress-fill"
                                style={{ width: `${item.score}%`, background: getScoreColor(item.score) }}
                              />
                            </div>
                          </div>
                          <p className="section-feedback">{item.feedback}</p>

                          {item.suggestions && item.suggestions.length > 0 && (
                            <div className="section-suggestions">
                              {item.suggestions.map((sug, si) => (
                                <span key={si} className="suggestion-chip">{sug}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Positives */}
              {activeTab === 'positives' && (
                <div className="tab-panel">
                  <div className="point-list-card positives-card">
                    <h3><Icon name="check" size={22} />Everything Working In Your Favor</h3>
                    <p className="section-intro">Point-by-point list of every strong item found in your resume.</p>
                    <ul className="point-list">
                      {(analysis.positives || []).map((p, i) => (
                        <li key={i} className="point-item positive">
                          <span className="point-icon"><Icon name="check" size={16} /></span>
                          <span>{p}</span>
                        </li>
                      ))}
                      {(analysis.positives || []).length === 0 && (
                        <p className="empty-hint">No specific positives were detected — try re-running the analysis.</p>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Negatives */}
              {activeTab === 'negatives' && (
                <div className="tab-panel">
                  <div className="point-list-card negatives-card">
                    <h3><Icon name="alert" size={22} />Everything Working Against You</h3>
                    <p className="section-intro">Every issue found, called out individually with the reason it hurts your ATS score.</p>
                    <ul className="point-list">
                      {(analysis.negatives || []).map((n, i) => (
                        <li key={i} className="point-item negative">
                          <span className="point-icon"><Icon name="x" size={16} /></span>
                          <span>{n}</span>
                        </li>
                      ))}
                      {(analysis.negatives || []).length === 0 && (
                        <p className="empty-hint">No major issues detected. Nice work.</p>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Keywords */}
              {activeTab === 'keywords' && (
                <div className="tab-panel">
                  <div className="keywords-analysis-card">
                    <div className="keywords-header">
                      <h3>
                        <Icon name="search" size={24} />
                        Keyword Optimization
                      </h3>
                      <div className="keywords-stats">
                        <div className="keyword-stat">
                          <span className="keyword-stat-value">{analysis.keywordGaps?.length || 0}</span>
                          <span className="keyword-stat-label">Missing</span>
                        </div>
                        <div className="keyword-stat">
                          <span className="keyword-stat-value" style={{ color: '#43e97b' }}>{analysis.keywordsFound?.length || 0}</span>
                          <span className="keyword-stat-label">Found</span>
                        </div>
                        {addedKeywords.size > 0 && (
                          <div className="keyword-stat">
                            <span className="keyword-stat-value" style={{ color: '#4facfe' }}>{addedKeywords.size}</span>
                            <span className="keyword-stat-label">Tracked</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {(analysis.keywordsFound || []).length > 0 && (
                      <div className="keyword-category" style={{ marginBottom: 28 }}>
                        <h4><Icon name="check" size={18} />Already Present</h4>
                        <div className="keywords-list">
                          {analysis.keywordsFound.map((kw, ki) => (
                            <span key={ki} className="keyword-tag keyword-added">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(analysis.keywordGaps || []).length > 0 ? (
                      <>
                        <div className="keywords-intro">
                          <p>
                            These keywords are absent from your resume. Click{' '}
                            <strong>+</strong> to mark them as added — the ATS resume regenerator will weave them in.
                          </p>
                        </div>

                        <div className="keyword-category">
                          <h4><Icon name="zap" size={18} />Missing Keywords</h4>
                          <div className="keywords-list">
                            {(analysis.keywordGaps || []).map((kw, ki) => (
                              <KeywordTag
                                key={ki}
                                keyword={kw}
                                added={addedKeywords.has(kw)}
                                onAdd={toggleKeyword}
                              />
                            ))}
                          </div>
                        </div>

                        {addedKeywords.size > 0 && (
                          <div className="tracked-keywords-panel">
                            <h4>
                              <Icon name="check" size={16} />
                              Marked as Added ({addedKeywords.size})
                            </h4>
                            <div className="keywords-list">
                              {Array.from(addedKeywords).map((kw) => (
                                <span key={kw} className="keyword-tag keyword-added">{kw}</span>
                              ))}
                            </div>
                            <p className="input-hint">
                              Head to the <strong>ATS Resume</strong> tab and regenerate to incorporate these into your optimized resume.
                            </p>
                          </div>
                        )}

                        <div className="keywords-tips">
                          <h4>
                            <Icon name="info" size={20} />
                            How to Add Keywords Effectively
                          </h4>
                          <ul>
                            <li>Integrate keywords naturally into experience bullet points.</li>
                            <li>Use exact phrases when they match your actual skills.</li>
                            <li>Add high-frequency keywords to your professional summary.</li>
                            <li>Include them in a dedicated Skills section for easy ATS parsing.</li>
                            <li>Avoid keyword stuffing — maintain readability and authenticity.</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="keywords-empty">
                        <Icon name="check" size={64} />
                        <h4>Excellent Keyword Coverage!</h4>
                        <p>Your resume contains all the essential industry keywords we analyzed.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Format Check */}
              {activeTab === 'format' && (
                <div className="tab-panel">
                  <div className="format-check-card">
                    <h3><Icon name="file-text" size={22} />Format & Structure Check</h3>
                    <p className="section-intro">
                      Deterministic checks run against your resume's raw structure, independent of the AI review.
                    </p>
                    <div className="format-checks-list">
                      {(formatChecks?.checks || []).map((c, i) => (
                        <div key={i} className={`format-check-item ${c.passed ? 'pass' : 'fail'}`}>
                          <span className="format-check-icon">
                            <Icon name={c.passed ? 'check' : 'x'} size={16} />
                          </span>
                          <div>
                            <strong>{c.check}</strong>
                            <p>{c.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ATS Resume Tab ─────────────────────────────────────────────── */}
              {activeTab === 'ats-resume' && (
                <div className="tab-panel">
                  <div className="ats-resume-card">
                    {/* Header */}
                    <div className="ats-resume-header">
                      <div>
                        <h3>
                          <Icon name="file-text" size={24} />
                          ATS-Optimized Resume
                        </h3>
                        <p className="ats-resume-subtitle">
                          Clean, ATS-safe formatting · No tables, columns, or images · Machine-readable
                          {jobDescription ? ' · Tailored to your target job description' : ''}
                        </p>
                      </div>
                      <div className="ats-resume-actions">
                        <div className="ats-view-toggle">
                          <button
                            className={atsPreviewMode === 'preview' ? 'active' : ''}
                            onClick={() => setAtsPreviewMode('preview')}
                          >
                            <Icon name="eye" size={16} /> Preview
                          </button>
                          <button
                            className={atsPreviewMode === 'raw' ? 'active' : ''}
                            onClick={() => setAtsPreviewMode('raw')}
                          >
                            <Icon name="edit" size={16} /> Edit
                          </button>
                        </div>
                        <button
                          className="btn-regenerate"
                          onClick={handleGenerateAtsResume}
                          disabled={generatingAts}
                        >
                          {generatingAts ? (
                            <><div className="button-spinner" />Regenerating…</>
                          ) : (
                            <><Icon name="sparkle" size={16} />Regenerate</>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* ATS quality indicators */}
                    <div className="ats-quality-row">
                      {[
                        { label: 'No tables/columns', ok: true },
                        { label: 'No graphics/images', ok: true },
                        { label: 'Standard fonts', ok: true },
                        { label: 'Readable headings', ok: true },
                        { label: `${addedKeywords.size} keywords tracked`, ok: addedKeywords.size > 0 },
                        { label: jobDescription ? 'Tailored to JD' : 'No JD provided', ok: !!jobDescription },
                      ].map(({ label, ok }) => (
                        <div key={label} className={`ats-quality-chip ${ok ? 'ok' : 'warn'}`}>
                          {ok ? <Icon name="check" size={14} /> : <Icon name="info" size={14} />}
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* Preview / Edit */}
                    {atsPreviewMode === 'preview' ? (
                      <div className="ats-preview-pane">
                        <div className="ats-preview-toolbar">
                          <button
                            className="ats-copy-btn"
                            onClick={() => handleCopy(atsResumeText, 'ats')}
                          >
                            {copiedSection === 'ats' ? <><Icon name="check" size={16} />Copied!</> : <><Icon name="copy" size={16} />Copy All</>}
                          </button>
                        </div>
                        <pre className="ats-preview-text">{atsResumeText || 'Click Regenerate to build your ATS resume.'}</pre>
                      </div>
                    ) : (
                      <div className="ats-edit-pane">
                        <p className="ats-edit-hint">
                          Edit your resume directly. Changes are reflected when you download.
                        </p>
                        <textarea
                          ref={atsTextareaRef}
                          className="ats-editor"
                          value={atsResumeText}
                          onChange={(e) => setAtsResumeText(e.target.value)}
                          spellCheck={false}
                          rows={40}
                        />
                      </div>
                    )}

                    {/* Download row */}
                    <div className="ats-download-row">
                      <span className="export-label">Download as:</span>
                      {['pdf', 'docx', 'txt'].map((fmt) => (
                        <button
                          key={fmt}
                          className="export-btn"
                          onClick={() => handleDownload(fmt)}
                          disabled={downloadingFmt === fmt}
                        >
                          {downloadingFmt === fmt ? <div className="button-spinner small" /> : <Icon name="download" size={18} />}
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {/* ATS Tips */}
                    <div className="ats-tips-grid">
                      <div className="ats-tip">
                        <div className="ats-tip-icon" style={{ color: '#43e97b' }}>
                          <Icon name="check" size={20} />
                        </div>
                        <div>
                          <strong>Plain text structure</strong>
                          <p>ATS systems parse text sequentially. No columns, tables, or text boxes.</p>
                        </div>
                      </div>
                      <div className="ats-tip">
                        <div className="ats-tip-icon" style={{ color: '#4facfe' }}>
                          <Icon name="layers" size={20} />
                        </div>
                        <div>
                          <strong>Standard section headings</strong>
                          <p>Use exact labels: EXPERIENCE, EDUCATION, SKILLS — not creative alternatives.</p>
                        </div>
                      </div>
                      <div className="ats-tip">
                        <div className="ats-tip-icon" style={{ color: '#f6c90e' }}>
                          <Icon name="search" size={20} />
                        </div>
                        <div>
                          <strong>Mirror job description language</strong>
                          <p>Use the exact phrasing from the job posting — ATS matches exact strings.</p>
                        </div>
                      </div>
                      <div className="ats-tip">
                        <div className="ats-tip-icon" style={{ color: '#f093fb' }}>
                          <Icon name="zap" size={20} />
                        </div>
                        <div>
                          <strong>Quantify achievements</strong>
                          <p>Numbers stand out to both ATS and hiring managers. Be specific.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message" style={{ marginTop: 16 }}>
                <Icon name="info" size={20} />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;