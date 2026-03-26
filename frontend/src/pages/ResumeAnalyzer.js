// frontend/src/pages/ResumeAnalyzer.js - FIXED VERSION
import React, { useState } from 'react';
import './resumeanalyzer.css';

const ResumeAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Determine API URL based on environment
  const getAPIUrl = () => {
    // If running locally (localhost, 127.0.0.1)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    // If running on production/Vercel
    return 'https://prepmate-ai-backend-ckrb.onrender.com';
  };

  const API_URL = getAPIUrl();

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  // Validate file type and size
  const validateAndSetFile = (selectedFile) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
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

      console.log('📤 Uploading resume to:', `${API_URL}/api/analyze-resume`);
      console.log('📄 File name:', file.name);
      console.log('📦 File size:', file.size, 'bytes');

      const response = await fetch(`${API_URL}/api/analyze-resume`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it automatically with boundary
        credentials: 'include', // Include credentials for CORS
      });

      console.log('📨 Response status:', response.status);
      console.log('📨 Response headers:', {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Analysis failed`);
      }

      const data = await response.json();
      console.log('✅ Analysis successful:', data);
      setAnalysis(data);
    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(err.message || 'Failed to analyze resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download improved resume
  const handleDownload = () => {
    if (analysis && analysis.improvedResume) {
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
  };

  // Reset analyzer
  const handleReset = () => {
    setFile(null);
    setFileName('');
    setAnalysis(null);
    setError('');
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  };

  // Get score label
  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="resume-analyzer-container">
      {/* Header */}
      <div className="analyzer-header">
        <div className="header-content">
          <h1>Resume Analyzer</h1>
          <p className="header-subtitle">
            Parse. Score. Improve. Get AI-powered insights to optimize your resume for ATS systems.
          </p>
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '10px' }}>
              API URL: {API_URL}/api/analyze-resume
            </p>
          )}
        </div>
      </div>

      <div className="analyzer-main">
        {/* Upload Section */}
        {!analysis && (
          <div className="upload-section">
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
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
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
                    Analyzing...
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
                <p>Check how well your resume works with applicant tracking systems</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h4>Detailed Feedback</h4>
                <p>Get section-by-section analysis with actionable improvements</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <h4>Keyword Analysis</h4>
                <p>Identify missing keywords to improve your resume ranking</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                </div>
                <h4>AI Enhancement</h4>
                <p>Receive an AI-improved version of your resume</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {analysis && (
          <div className="results-section">
            {/* ATS Score Card */}
            <div className="score-card">
              <div className="score-header">
                <h2>ATS Compatibility Score</h2>
                <button onClick={handleReset} className="btn-new-analysis">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  New Analysis
                </button>
              </div>
              
              <div className="score-display">
                <div 
                  className="score-circle"
                  style={{
                    background: `conic-gradient(${getScoreColor(analysis.atsScore)} ${analysis.atsScore * 3.6}deg, #f0f0f0 0deg)`
                  }}
                >
                  <div className="score-inner">
                    <span className="score-number">{analysis.atsScore}</span>
                    <span className="score-total">/100</span>
                  </div>
                </div>
                <div className="score-info">
                  <span 
                    className="score-label"
                    style={{ color: getScoreColor(analysis.atsScore) }}
                  >
                    {getScoreLabel(analysis.atsScore)}
                  </span>
                  <p className="score-description">
                    Your resume is {analysis.atsScore >= 80 ? 'highly optimized' : analysis.atsScore >= 60 ? 'well-optimized' : 'partially optimized'} for applicant tracking systems
                  </p>
                </div>
              </div>
            </div>

            {/* Section Feedback */}
            <div className="feedback-card">
              <h3>Section-by-Section Feedback</h3>
              <div className="feedback-list">
                {analysis.sectionFeedback && analysis.sectionFeedback.map((item, index) => (
                  <div key={index} className="feedback-item">
                    <div className="feedback-header">
                      <h4>{item.section}</h4>
                      <span className="feedback-score" style={{ color: getScoreColor(item.score) }}>
                        {item.score}/100
                      </span>
                    </div>
                    <p className="feedback-text">{item.feedback}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Keyword Analysis */}
            {analysis.keywordGaps && analysis.keywordGaps.length > 0 && (
              <div className="keywords-card">
                <h3>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Missing Keywords
                </h3>
                <p className="keywords-description">
                  Consider adding these industry-relevant keywords to improve ATS matching:
                </p>
                <div className="keywords-list">
                  {analysis.keywordGaps.map((keyword, index) => (
                    <span key={index} className="keyword-tag">{keyword}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths and Improvements */}
            <div className="insights-grid">
              <div className="insights-card strengths">
                <h3>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Strengths
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
                  Areas for Improvement
                </h3>
                <ul>
                  {analysis.improvements && analysis.improvements.map((improvement, index) => (
                    <li key={index}>{improvement}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Download Improved Resume */}
            {analysis.improvedResume && (
              <div className="download-card">
                <div className="download-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <polyline points="9 15 12 18 15 15" />
                  </svg>
                  <div>
                    <h3>AI-Enhanced Resume Ready</h3>
                    <p>Download your improved resume with optimized content and formatting</p>
                  </div>
                </div>
                <button onClick={handleDownload} className="btn-download">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Improved Resume
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;