// frontend/src/pages/ResumeAnalyzer.js - ENHANCED v2
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './resumeanalyzer.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',      label: 'Overview',      icon: 'home' },
  { id: 'sections',      label: 'Sections',       icon: 'layers' },
  { id: 'keywords',      label: 'Keywords',       icon: 'search' },
  { id: 'improvements',  label: 'Improvements',   icon: 'zap' },
  { id: 'ats-resume',    label: 'ATS Resume',     icon: 'file-text' },
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

// ─── ATS Resume Builder ───────────────────────────────────────────────────────
// Parses raw analysis data and builds a clean ATS-formatted resume string.

const buildATSResumeText = (analysis, parsedSections) => {
  const sections = parsedSections || {};

  const contactBlock = sections.contact
    ? sections.contact.trim()
    : '[Your Name]\n[Phone] | [Email] | [LinkedIn] | [City, State]';

  const summaryBlock = sections.summary
    ? sections.summary.trim()
    : (analysis.improvedResume ? extractSection(analysis.improvedResume, 'summary') : '');

  const experienceBlock = sections.experience
    ? sections.experience.trim()
    : (analysis.improvedResume ? extractSection(analysis.improvedResume, 'experience') : '');

  const educationBlock = sections.education
    ? sections.education.trim()
    : (analysis.improvedResume ? extractSection(analysis.improvedResume, 'education') : '');

  const skillsBlock = buildSkillsBlock(analysis);

  const lines = [];

  lines.push(contactBlock);
  lines.push('');
  lines.push('─'.repeat(60));

  if (summaryBlock) {
    lines.push('');
    lines.push('PROFESSIONAL SUMMARY');
    lines.push('─'.repeat(20));
    lines.push(summaryBlock);
  }

  if (experienceBlock) {
    lines.push('');
    lines.push('WORK EXPERIENCE');
    lines.push('─'.repeat(20));
    lines.push(experienceBlock);
  }

  if (educationBlock) {
    lines.push('');
    lines.push('EDUCATION');
    lines.push('─'.repeat(20));
    lines.push(educationBlock);
  }

  if (skillsBlock) {
    lines.push('');
    lines.push('SKILLS');
    lines.push('─'.repeat(20));
    lines.push(skillsBlock);
  }

  return lines.join('\n');
};

// Safely convert any API value to a plain string for text processing.
const toSafeString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(toSafeString).join('\n');
  if (typeof val === 'object') {
    // Try common key names that backends use for resume text
    const textKeys = ['text', 'content', 'resume', 'body', 'value', 'data'];
    for (const k of textKeys) {
      if (val[k] && typeof val[k] === 'string') return val[k];
    }
    // Last resort: JSON stringify so it's at least a string
    try { return JSON.stringify(val, null, 2); } catch { return ''; }
  }
  return String(val);
};

const extractSection = (raw, sectionName) => {
  const text = toSafeString(raw);
  if (!text) return '';
  const patterns = {
    contact:    /(?:contact|personal info)[:\s\n]+([\s\S]*?)(?=\n[A-Z]{3,}|\n─|$)/i,
    summary:    /(?:summary|profile|objective|about)[:\s\n]+([\s\S]*?)(?=\n[A-Z]{3,}|\n─|$)/i,
    experience: /(?:experience|employment|work history|career)[:\s\n]+([\s\S]*?)(?=\n[A-Z]{3,}|\n─|$)/i,
    education:  /(?:education|academic|qualifications)[:\s\n]+([\s\S]*?)(?=\n[A-Z]{3,}|\n─|$)/i,
    skills:     /(?:skills|competencies|technologies|expertise)[:\s\n]+([\s\S]*?)(?=\n[A-Z]{3,}|\n─|$)/i,
  };
  if (!patterns[sectionName]) return '';
  const match = text.match(patterns[sectionName]);
  return match ? match[1].trim() : '';
};

const buildSkillsBlock = (analysis) => {
  const existing = analysis.strengths
    ? analysis.strengths
        .filter(s => s.length < 40)
        .slice(0, 8)
    : [];
  const gaps = analysis.keywordGaps ? analysis.keywordGaps.slice(0, 6) : [];
  const combined = [...new Set([...existing, ...gaps])];
  return combined.length ? combined.join(' • ') : '';
};

// ─── Parsed Sections State ────────────────────────────────────────────────────
// Tries to split improvedResume into editable sections client-side.

const parseSections = (raw) => {
  const text = toSafeString(raw);
  if (!text) return {};
  return {
    contact:    extractSection(text, 'contact') || text.split('\n').slice(0, 4).join('\n'),
    summary:    extractSection(text, 'summary'),
    experience: extractSection(text, 'experience'),
    education:  extractSection(text, 'education'),
    skills:     extractSection(text, 'skills'),
  };
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
  const [editingAts, setEditingAts] = useState(false);
  const [generatingAts, setGeneratingAts] = useState(false);
  const [parsedSections, setParsedSections] = useState({});
  const [atsPreviewMode, setAtsPreviewMode] = useState('preview'); // 'preview' | 'raw'

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

  // ── Auto-build ATS resume when analysis arrives ───────────────────────────

  useEffect(() => {
    if (!analysis) return;
    // toSafeString handles string / object / array / null from the API
    const rawResume = toSafeString(analysis.improvedResume);
    const sections = parseSections(rawResume);
    setParsedSections(sections);
    const built = buildATSResumeText(analysis, sections);
    setAtsResumeText(built);
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

  // ── Generate improved ATS resume via API ──────────────────────────────────

  const handleGenerateAtsResume = async () => {
    if (!analysis) return;
    setGeneratingAts(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/analyze-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          existingAnalysis: analysis,
          generateAtsResume: true,
          jobDescription: jobDescription || '',
          keywordsToAdd: Array.from(addedKeywords),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate ATS resume');
      const data = await response.json();

      if (data.atsResume || data.improvedResume) {
        const text = data.atsResume || data.improvedResume;
        setAtsResumeText(text);
      }
    } catch {
      // fallback: rebuild from current data
      const rebuilt = buildATSResumeText(analysis, parsedSections);
      setAtsResumeText(rebuilt);
    } finally {
      setGeneratingAts(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────

  const handleDownload = async (format = 'pdf') => {
    const content = atsResumeText || analysis?.improvedResume || '';
    if (!content) return;

    try {
      if (format === 'pdf') {
        const response = await fetch(`${API_URL}/api/export-resume`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, format: 'pdf' }),
        });
        if (!response.ok) throw new Error('PDF generation failed');
        const blob = await response.blob();
        triggerDownload(blob, `ats_optimized_${stripExt(fileName)}.pdf`);
      } else {
        const mimeTypes = {
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          txt: 'text/plain',
        };
        const blob = new Blob([content], { type: mimeTypes[format] || 'text/plain' });
        triggerDownload(blob, `ats_optimized_${stripExt(fileName)}.${format}`);
      }
    } catch (err) {
      setError('Download failed. Please try again.');
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

  const stripExt = (name) => name.replace(/\.[^/.]+$/, '');

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
    setParsedSections({});
    setEditingAts(false);
  };

  // ── Score breakdown (uses real data if available, estimates otherwise) ─────

  const getBreakdown = () => {
    if (!analysis) return [];
    // Try to pull from section scores
    const sectionScores = {};
    (analysis.sectionFeedback || []).forEach((s) => {
      sectionScores[s.section?.toLowerCase()] = s.score;
    });

    const avg = (keys) => {
      const vals = keys.map((k) => sectionScores[k]).filter(Boolean);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    const ats = analysis.atsScore || 0;
    return [
      { label: 'Formatting',      score: avg(['format', 'formatting', 'structure', 'layout']) || Math.min(100, ats + 10) },
      { label: 'Keywords',        score: avg(['keywords', 'keyword', 'skills']) || Math.max(0, ats - 15) },
      { label: 'Content Quality', score: avg(['content', 'experience', 'work experience']) || Math.min(100, ats + 5) },
      { label: 'Structure',       score: avg(['structure', 'sections', 'education']) || ats },
    ];
  };

  // ── Impact classification ─────────────────────────────────────────────────

  const getImpact = (index, total) => {
    if (index < Math.ceil(total * 0.3)) return 'high';
    if (index < Math.ceil(total * 0.65)) return 'medium';
    return 'low';
  };

  const impactIcon = (impact) => {
    if (impact === 'high') return SVG_ICONS.alert;
    if (impact === 'medium') return SVG_ICONS.info;
    return SVG_ICONS.info;
  };

  // ── Job match score (derived) ─────────────────────────────────────────────

  const jobMatchScore = () => {
    if (!jobDescription || !analysis) return null;
    const descWords = new Set(jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const resumeText = (atsResumeText || toSafeString(analysis.improvedResume)).toLowerCase();
    let matched = 0;
    descWords.forEach((w) => { if (resumeText.includes(w)) matched++; });
    return descWords.size ? Math.round((matched / descWords.size) * 100) : null;
  };

  const jms = jobMatchScore();

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
                AI-powered ATS analysis · Keyword optimization · Professional resume generation
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
                    Job Match Analysis
                    <span className="optional-badge">Optional</span>
                  </h3>
                  <button className="toggle-btn" onClick={() => setShowJobMatch(!showJobMatch)}>
                    {showJobMatch ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showJobMatch && (
                  <div className="job-input-container">
                    <textarea
                      className="job-description-input"
                      placeholder="Paste the job description here for targeted keyword matching and compatibility scoring…"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={6}
                    />
                    <p className="input-hint">
                      We'll calculate a live job-match percentage and surface missing keywords from the posting.
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
                  <><div className="button-spinner" />Analyzing…</>
                ) : (
                  <><Icon name="sparkle" size={20} />Analyze Resume</>
                )}
              </button>
            )}

            {/* Feature cards */}
            <div className="features-grid">
              {[
                { icon: 'check', title: 'ATS Compatibility', desc: 'Ensure your resume passes applicant tracking systems with 90%+ compatibility.' },
                { icon: 'zap',   title: 'Real-time Scoring', desc: 'Instant feedback across formatting, keywords, content quality, and structure.' },
                { icon: 'search',title: 'Keyword Optimization', desc: 'Identify and add industry-relevant keywords to rank higher in searches.' },
                { icon: 'file-text', title: 'ATS Resume Builder', desc: 'Auto-generate a clean, ATS-ready resume from your analysis in one click.' },
                { icon: 'user',  title: 'Job Matching', desc: 'Compare against job descriptions for a live compatibility percentage.' },
                { icon: 'download', title: 'PDF / DOCX Export', desc: 'Download your optimized resume in your preferred format.' },
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
                    title={`Download as ${fmt.toUpperCase()}`}
                  >
                    <Icon name="download" size={18} />
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

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
                  {jms >= 75 ? 'Strong match' : jms >= 50 ? 'Moderate match' : 'Low match — add more keywords'}
                </span>
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
                      { label: 'Strengths', value: analysis.strengths?.length || 0, gradient: 'linear-gradient(135deg,#43e97b,#38d9a9)', icon: 'zap' },
                      { label: 'Improvements', value: analysis.improvements?.length || 0, gradient: 'linear-gradient(135deg,#f6c90e,#f9ca24)', icon: 'edit' },
                      { label: 'Missing Keywords', value: analysis.keywordGaps?.length || 0, gradient: 'linear-gradient(135deg,#667eea,#764ba2)', icon: 'search' },
                      { label: 'Sections Analyzed', value: analysis.sectionFeedback?.length || 0, gradient: 'linear-gradient(135deg,#4facfe,#00f2fe)', icon: 'layers' },
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

                  {/* Insights */}
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

                          {/* Suggestions chips */}
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
                        {addedKeywords.size > 0 && (
                          <div className="keyword-stat">
                            <span className="keyword-stat-value" style={{ color: '#43e97b' }}>{addedKeywords.size}</span>
                            <span className="keyword-stat-label">Tracked</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {(analysis.keywordGaps || []).length > 0 ? (
                      <>
                        <div className="keywords-intro">
                          <p>
                            These keywords are absent from your resume. Click{' '}
                            <strong>+</strong> to mark them as added — the job-match score updates live.
                          </p>
                        </div>

                        <div className="keywords-categories">
                          {[
                            {
                              label: 'Technical Skills',
                              icon: 'zap',
                              items: (analysis.keywordGaps || []).filter((_, i) => i % 2 === 0),
                            },
                            {
                              label: 'Soft Skills & Competencies',
                              icon: 'user',
                              items: (analysis.keywordGaps || []).filter((_, i) => i % 2 !== 0),
                            },
                          ].map(({ label, icon, items }) => (
                            <div className="keyword-category" key={label}>
                              <h4>
                                <Icon name={icon} size={18} />
                                {label}
                              </h4>
                              <div className="keywords-list">
                                {items.map((kw, ki) => (
                                  <KeywordTag
                                    key={ki}
                                    keyword={kw}
                                    added={addedKeywords.has(kw)}
                                    onAdd={toggleKeyword}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
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

              {/* Improvements */}
              {activeTab === 'improvements' && (
                <div className="tab-panel">
                  <div className="improvements-card">
                    <div className="improvements-header">
                      <h3>
                        <Icon name="zap" size={24} />
                        Recommended Improvements
                      </h3>
                      <div className="impact-legend">
                        {['high', 'medium', 'low'].map((lvl) => (
                          <span key={lvl} className={`legend-item ${lvl}`}>
                            <span className="legend-dot" />
                            {lvl.charAt(0).toUpperCase() + lvl.slice(1)} Impact
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="improvements-list">
                      {(analysis.improvements || []).map((imp, i, arr) => {
                        const impact = getImpact(i, arr.length);
                        return (
                          <div key={i} className={`improvement-item impact-${impact}`}>
                            <div className="improvement-icon">{impactIcon(impact)}</div>
                            <div className="improvement-content">
                              <div className="improvement-header-row">
                                <h4>{imp}</h4>
                                <span className={`impact-badge ${impact}`}>
                                  {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
                                </span>
                              </div>
                              <p className="improvement-description">
                                {impact === 'high' && 'Critical — will significantly improve your ATS score.'}
                                {impact === 'medium' && 'Important — will noticeably enhance resume effectiveness.'}
                                {impact === 'low' && 'Minor enhancement for additional polish.'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
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
                        <button key={fmt} className="export-btn" onClick={() => handleDownload(fmt)}>
                          <Icon name="download" size={18} />
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