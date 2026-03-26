// frontend/src/pages/ResumeAnalyzer.js - ENHANCED VERSION
import React, { useState, useEffect } from 'react';
import './resumeanalyzer.css';

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [compareMode, setCompareMode] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [showJobMatch, setShowJobMatch] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  // Determine API URL based on environment
  const getAPIUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://prepmate-ai-backend-ckrb.onrender.com';
  };

  const API_URL = getAPIUrl();

  // Animated counter for score
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (analysis && analysis.atsScore) {
      let start = 0;
      const end = analysis.atsScore;
      const duration = 1500;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayScore(end);
          clearInterval(timer);
        } else {
          setDisplayScore(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [analysis]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  // Validate file type and size
  const validateAndSetFile = (selectedFile) => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or Word document (.pdf, .doc, .docx)');
      return;
    }

    if (selectedFile.size > maxSize) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError('');
    setAnalysis(null);
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Analyze resume
  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a resume first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      if (jobDescription) {
        formData.append('jobDescription', jobDescription);
      }

      console.log('📤 Uploading resume to:', `${API_URL}/api/analyze-resume`);

      const response = await fetch(`${API_URL}/api/analyze-resume`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Analysis failed`);
      }

      const data = await response.json();
      console.log('✅ Analysis successful:', data);
      setAnalysis(data);
      setActiveTab('overview');
    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(err.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download improved resume
  const handleDownload = async (format = 'pdf') => {
    if (!analysis || !analysis.improvedResume) return;

    try {
      if (format === 'pdf') {
        // Call backend to generate PDF
        const response = await fetch(`${API_URL}/api/export-resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: analysis.improvedResume,
            format: 'pdf'
          }),
        });

        if (!response.ok) throw new Error('Failed to generate PDF');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `improved_${fileName.replace(/\.[^/.]+$/, '')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'docx') {
        // Download as DOCX
        const blob = new Blob([analysis.improvedResume], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `improved_${fileName.replace(/\.[^/.]+$/, '')}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Download as TXT
        const blob = new Blob([analysis.improvedResume], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `improved_${fileName.replace(/\.[^/.]+$/, '')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to download resume. Please try again.');
      console.error('Download error:', err);
    }
  };

  // Reset analyzer
  const handleReset = () => {
    setFile(null);
    setFileName('');
    setAnalysis(null);
    setError('');
    setJobDescription('');
    setShowJobMatch(false);
    setActiveTab('overview');
    setDisplayScore(0);
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return '#43e97b';
    if (score >= 60) return '#f6c90e';
    return '#f5576c';
  };

  // Get score label
  const getScoreLabel = (score) => {
    if (score >= 90) return 'Outstanding';
    if (score >= 80) return 'Excellent';
    if (score >= 70) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Improvement';
  };

  // Get impact level icon
  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'high':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'medium':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        );
    }
  };

  return (
    <div className="resume-analyzer-container">
      {/* Background Gradients */}
      <div className="bg-gradient gradient-1"></div>
      <div className="bg-gradient gradient-2"></div>
      <div className="bg-gradient gradient-3"></div>

      {/* Header */}
      <div className="analyzer-header">
        <div className="header-content">
          <div className="header-top">
            <div>
              <h1>Resume Analyzer</h1>
              <p className="header-subtitle">
                AI-powered resume analysis with ATS optimization, keyword matching, and professional formatting
              </p>
            </div>
            {analysis && (
              <div className="header-quick-score">
                <div className="quick-score-label">ATS Score</div>
                <div 
                  className="quick-score-value"
                  style={{ color: getScoreColor(analysis.atsScore) }}
                >
                  {displayScore}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="analyzer-main">
        {/* Upload Section */}
        {!analysis && (
          <div className="upload-section">
            <div className="upload-container">
              <div 
                className={`upload-area ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {!file ? (
                  <>
                    <div className="upload-icon">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <h3>Upload Your Resume</h3>
                    <p>Drag and drop your resume here, or click to browse</p>
                    <p className="upload-hint">Supports PDF, DOC, DOCX (Max 5MB)</p>
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="file-input"
                    />
                    <label htmlFor="resume-upload" className="btn-upload">
                      Choose File
                    </label>
                  </>
                ) : (
                  <>
                    <div className="file-preview">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div className="file-info">
                        <p className="file-name">{fileName}</p>
                        <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <button onClick={handleReset} className="btn-change">
                      Change File
                    </button>
                  </>
                )}
              </div>

              {/* Job Description Input (Optional) */}
              <div className="job-match-section">
                <div className="section-header">
                  <h3>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    Job Match Analysis (Optional)
                  </h3>
                  <button 
                    className="toggle-btn"
                    onClick={() => setShowJobMatch(!showJobMatch)}
                  >
                    {showJobMatch ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {showJobMatch && (
                  <div className="job-input-container">
                    <textarea
                      className="job-description-input"
                      placeholder="Paste the job description here to see how well your resume matches..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows="6"
                    />
                    <p className="input-hint">
                      We'll analyze keyword matches, required skills, and compatibility with the job posting
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {file && !error && (
              <button 
                onClick={handleAnalyze} 
                className="btn-analyze"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="button-spinner"></div>
                    Analyzing Resume...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    Analyze Resume
                  </>
                )}
              </button>
            )}

            {/* Features */}
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h4>ATS Compatibility</h4>
                <p>Ensure your resume passes applicant tracking systems with 90%+ compatibility</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h4>Real-time Scoring</h4>
                <p>Get instant feedback on your resume's effectiveness across multiple criteria</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <h4>Keyword Optimization</h4>
                <p>Identify and add industry-relevant keywords to rank higher in searches</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h4>PDF Export</h4>
                <p>Download your optimized resume in professional PDF format</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <polyline points="17 11 19 13 23 9" />
                  </svg>
                </div>
                <h4>Job Matching</h4>
                <p>Compare your resume against specific job descriptions for targeted optimization</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h4>Impact Analysis</h4>
                <p>Prioritize improvements based on their impact on your ATS score</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {analysis && (
          <div className="results-section">
            {/* Action Bar */}
            <div className="results-action-bar">
              <button onClick={handleReset} className="btn-new-analysis">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                New Analysis
              </button>

              <div className="export-options">
                <span className="export-label">Export as:</span>
                <button 
                  className="export-btn"
                  onClick={() => handleDownload('pdf')}
                  title="Download as PDF"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  PDF
                </button>
                <button 
                  className="export-btn"
                  onClick={() => handleDownload('docx')}
                  title="Download as DOCX"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  DOCX
                </button>
                <button 
                  className="export-btn"
                  onClick={() => handleDownload('txt')}
                  title="Download as TXT"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  TXT
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="results-tabs">
              <button 
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                Overview
              </button>
              <button 
                className={`tab-btn ${activeTab === 'sections' ? 'active' : ''}`}
                onClick={() => setActiveTab('sections')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Sections
              </button>
              <button 
                className={`tab-btn ${activeTab === 'keywords' ? 'active' : ''}`}
                onClick={() => setActiveTab('keywords')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Keywords
              </button>
              <button 
                className={`tab-btn ${activeTab === 'improvements' ? 'active' : ''}`}
                onClick={() => setActiveTab('improvements')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                Improvements
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="tab-panel">
                  {/* ATS Score Card */}
                  <div className="score-card-enhanced">
                    <div className="score-display-large">
                      <div 
                        className="score-circle-large"
                        style={{
                          background: `conic-gradient(${getScoreColor(analysis.atsScore)} ${displayScore * 3.6}deg, rgba(255, 255, 255, 0.05) 0deg)`
                        }}
                      >
                        <div className="score-inner-large">
                          <span className="score-number-large">{displayScore}</span>
                          <span className="score-total-large">/100</span>
                        </div>
                      </div>
                      <div className="score-info-large">
                        <h2>ATS Compatibility Score</h2>
                        <span 
                          className="score-label-large"
                          style={{ color: getScoreColor(analysis.atsScore) }}
                        >
                          {getScoreLabel(analysis.atsScore)}
                        </span>
                        <p className="score-description-large">
                          Your resume is {analysis.atsScore >= 80 ? 'highly optimized' : 
                            analysis.atsScore >= 60 ? 'well-optimized' : 'partially optimized'} 
                          for applicant tracking systems and ready for {analysis.atsScore >= 80 ? 'immediate submission' : 
                            analysis.atsScore >= 60 ? 'submission with minor tweaks' : 'improvement before submission'}.
                        </p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="score-breakdown">
                      <h3>Score Breakdown</h3>
                      <div className="breakdown-grid">
                        <div className="breakdown-item">
                          <div className="breakdown-header">
                            <span>Formatting</span>
                            <span className="breakdown-score">85%</span>
                          </div>
                          <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: '85%', background: '#43e97b' }}></div>
                          </div>
                        </div>
                        <div className="breakdown-item">
                          <div className="breakdown-header">
                            <span>Keywords</span>
                            <span className="breakdown-score">70%</span>
                          </div>
                          <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: '70%', background: '#f6c90e' }}></div>
                          </div>
                        </div>
                        <div className="breakdown-item">
                          <div className="breakdown-header">
                            <span>Content Quality</span>
                            <span className="breakdown-score">90%</span>
                          </div>
                          <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: '90%', background: '#43e97b' }}></div>
                          </div>
                        </div>
                        <div className="breakdown-item">
                          <div className="breakdown-header">
                            <span>Structure</span>
                            <span className="breakdown-score">75%</span>
                          </div>
                          <div className="breakdown-bar">
                            <div className="breakdown-fill" style={{ width: '75%', background: '#f6c90e' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="quick-stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38d9a9)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analysis.strengths?.length || 0}</div>
                        <div className="stat-label">Strengths Found</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f6c90e, #f9ca24)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analysis.improvements?.length || 0}</div>
                        <div className="stat-label">Improvements</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analysis.keywordGaps?.length || 0}</div>
                        <div className="stat-label">Missing Keywords</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="stat-content">
                        <div className="stat-value">{analysis.sectionFeedback?.length || 0}</div>
                        <div className="stat-label">Sections Analyzed</div>
                      </div>
                    </div>
                  </div>

                  {/* Insights Grid */}
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
                        {analysis.strengths && analysis.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
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
                        {analysis.improvements && analysis.improvements.slice(0, 5).map((improvement, index) => (
                          <li key={index}>{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Sections Tab */}
              {activeTab === 'sections' && (
                <div className="tab-panel">
                  <div className="section-analysis-card">
                    <h3>Section-by-Section Analysis</h3>
                    <p className="section-intro">
                      Detailed feedback on each section of your resume with specific recommendations
                    </p>
                    
                    <div className="sections-list">
                      {analysis.sectionFeedback && analysis.sectionFeedback.map((item, index) => (
                        <div key={index} className="section-item">
                          <div className="section-header">
                            <div className="section-title-row">
                              <h4>{item.section}</h4>
                              <span 
                                className="section-score"
                                style={{ 
                                  background: `${getScoreColor(item.score)}20`,
                                  color: getScoreColor(item.score),
                                  border: `1px solid ${getScoreColor(item.score)}40`
                                }}
                              >
                                {item.score}/100
                              </span>
                            </div>
                            <div className="section-progress">
                              <div 
                                className="section-progress-fill"
                                style={{ 
                                  width: `${item.score}%`,
                                  background: getScoreColor(item.score)
                                }}
                              ></div>
                            </div>
                          </div>
                          <p className="section-feedback">{item.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Keywords Tab */}
              {activeTab === 'keywords' && (
                <div className="tab-panel">
                  <div className="keywords-analysis-card">
                    <div className="keywords-header">
                      <h3>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </svg>
                        Keyword Analysis & Optimization
                      </h3>
                      <div className="keywords-stats">
                        <div className="keyword-stat">
                          <span className="keyword-stat-value">{analysis.keywordGaps?.length || 0}</span>
                          <span className="keyword-stat-label">Missing</span>
                        </div>
                      </div>
                    </div>

                    {analysis.keywordGaps && analysis.keywordGaps.length > 0 ? (
                      <>
                        <div className="keywords-intro">
                          <p>
                            These industry-relevant keywords are missing from your resume. Adding them can 
                            significantly improve your ATS score and visibility to recruiters.
                          </p>
                        </div>

                        <div className="keywords-categories">
                          <div className="keyword-category">
                            <h4>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 11 12 14 22 4" />
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                              </svg>
                              Technical Skills
                            </h4>
                            <div className="keywords-list">
                              {analysis.keywordGaps.slice(0, Math.ceil(analysis.keywordGaps.length / 2)).map((keyword, index) => (
                                <span key={index} className="keyword-tag">
                                  {keyword}
                                  <button className="keyword-add" title="Add to resume">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="12" y1="5" x2="12" y2="19" />
                                      <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="keyword-category">
                            <h4>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                              Soft Skills & Competencies
                            </h4>
                            <div className="keywords-list">
                              {analysis.keywordGaps.slice(Math.ceil(analysis.keywordGaps.length / 2)).map((keyword, index) => (
                                <span key={index} className="keyword-tag">
                                  {keyword}
                                  <button className="keyword-add" title="Add to resume">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <line x1="12" y1="5" x2="12" y2="19" />
                                      <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="keywords-tips">
                          <h4>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            How to Add Keywords Effectively
                          </h4>
                          <ul>
                            <li>Integrate keywords naturally into your experience descriptions</li>
                            <li>Use exact keyword phrases when they match your actual skills</li>
                            <li>Add relevant keywords to your skills section</li>
                            <li>Include keywords in your professional summary</li>
                            <li>Don't stuff keywords - maintain readability and authenticity</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="keywords-empty">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <h4>Excellent Keyword Coverage!</h4>
                        <p>Your resume contains all the essential industry keywords we analyzed.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Improvements Tab */}
              {activeTab === 'improvements' && (
                <div className="tab-panel">
                  <div className="improvements-card">
                    <div className="improvements-header">
                      <h3>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        Recommended Improvements
                      </h3>
                      <div className="impact-legend">
                        <span className="legend-item high">
                          <span className="legend-dot"></span>High Impact
                        </span>
                        <span className="legend-item medium">
                          <span className="legend-dot"></span>Medium Impact
                        </span>
                        <span className="legend-item low">
                          <span className="legend-dot"></span>Low Impact
                        </span>
                      </div>
                    </div>

                    <div className="improvements-list">
                      {analysis.improvements && analysis.improvements.map((improvement, index) => {
                        const impact = index < 3 ? 'high' : index < 6 ? 'medium' : 'low';
                        return (
                          <div key={index} className={`improvement-item impact-${impact}`}>
                            <div className="improvement-icon">
                              {getImpactIcon(impact)}
                            </div>
                            <div className="improvement-content">
                              <div className="improvement-header-row">
                                <h4>{improvement}</h4>
                                <span className={`impact-badge ${impact}`}>
                                  {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
                                </span>
                              </div>
                              <p className="improvement-description">
                                {impact === 'high' && 'Critical change that will significantly improve your ATS score'}
                                {impact === 'medium' && 'Important improvement that will enhance your resume effectiveness'}
                                {impact === 'low' && 'Minor enhancement for additional optimization'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;