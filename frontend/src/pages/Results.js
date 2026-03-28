// frontend/src/pages/Results.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { batchAnalyzeAnswers } from "../services/interviewApi";
import "./results.css";

export default function Results() {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState(null);
  const [analysis, setAnalysis]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab]         = useState("overview");
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [sortBy, setSortBy]               = useState("order");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("completedInterview"));
    if (!data) { navigate("/dashboard"); return; }
    setInterviewData(data);
    analyzeInterview(data);
  }, [navigate]);

  // ─── Core analysis function ────────────────────────────────────────────────
  //
  // OLD: called analyzeAnswer() in a for-loop → N sequential LLM calls → timeout
  // NEW: one call to batchAnalyzeAnswers() → single LLM call → fast + reliable
  //      Client-side helpers fill everything else (expectedPoints, skillArea, etc.)

  const analyzeInterview = async (data) => {
    const answers = data.answers || [];
    if (!answers.length) { setLoading(false); return; }

    setAnalysisProgress(10);

    let aiResults = [];
    try {
      setAnalysisProgress(30);
      aiResults = await batchAnalyzeAnswers(
        answers,
        data.jobTitle,
        data.experienceLevel
      );
      setAnalysisProgress(80);
    } catch (err) {
      console.error("Batch analysis error:", err);
      // batchAnalyzeAnswers already returns a fallback array, so aiResults
      // will be populated — we should never reach here. Just in case:
      aiResults = answers.map(a => ({
        score: (a.answer || '').trim() === '[Skipped]' ? 0 : 5,
        feedback: ["Score estimated."], strengths: [], improvements: [],
        hasExamples: false, skipped: (a.answer || '').trim() === '[Skipped]',
      }));
    }

    // Merge AI results with answer metadata
    const analysisResults = answers.map((answer, i) => {
      const ai = aiResults[i] || {};
      return {
        questionId:     answer.questionId,
        question:       answer.question,
        userAnswer:     answer.answer,
        score:          ai.score        ?? 5,
        feedback:       ai.feedback     ?? [],
        strengths:      ai.strengths    ?? [],
        improvements:   ai.improvements ?? [],
        hasExamples:    ai.hasExamples  ?? false,
        modelAnswer:    null,
        round:          answer.round,
        roundName:      answer.roundName || `Round ${answer.round}`,
        confidence:     answer.confidence || 3,
        timeSpent:      answer.timeSpent  || 0,
        wordCount:      answer.wordCount  || 0,
        skipped:        answer.skipped    || ai.skipped || false,
        expectedPoints: generateExpectedPoints(answer.question, answer.round),
        keywords:       [],
        skillArea:      "General",
      };
    });

    setAnalysisProgress(95);

    // Aggregate stats
    const nonSkipped  = analysisResults.filter(r => !r.skipped);
    const totalScore  = nonSkipped.reduce((s, r) => s + r.score, 0);
    const maxScore    = nonSkipped.length * 10;
    const percentage  = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : "0.0";

    const roundScores = {};
    analysisResults.forEach(r => {
      if (!roundScores[r.round])
        roundScores[r.round] = { name: r.roundName, total: 0, count: 0, scores: [] };
      if (!r.skipped) {
        roundScores[r.round].total += r.score;
        roundScores[r.round].count += 1;
        roundScores[r.round].scores.push(r.score);
      }
    });

    const avgTime     = nonSkipped.length
      ? nonSkipped.reduce((s, r) => s + r.timeSpent, 0) / nonSkipped.length
      : 0;
    const fastestAnswer = nonSkipped.reduce((min, r) => r.timeSpent < (min?.timeSpent ?? Infinity) ? r : min, null);
    const slowestAnswer = nonSkipped.reduce((max, r) => r.timeSpent > (max?.timeSpent ?? -1)      ? r : max, null);

    setAnalysis({
      results:       analysisResults,
      totalScore, maxScore, percentage,
      roundScores,
      avgTime,
      fastestAnswer,
      slowestAnswer,
      totalTime:        data.totalTime || 0,
      skippedCount:     analysisResults.filter(r => r.skipped).length,
      strengths:        identifyStrengths(nonSkipped),
      improvements:     identifyImprovements(nonSkipped),
      avgConfidence:    nonSkipped.reduce((s, r) => s + r.confidence, 0) / (nonSkipped.length || 1),
      avgWordCount:     nonSkipped.reduce((s, r) => s + r.wordCount,  0) / (nonSkipped.length || 1),
    });

    setAnalysisProgress(100);
    setLoading(false);
  };

  // ─── Pure helpers (no API calls) ──────────────────────────────────────────

  const generateExpectedPoints = (question, round) => {
    if (round <= 2) return [
      "Clear explanation of core concepts",
      "Mention relevant technologies or frameworks",
      "Practical examples or use cases",
      "Discussion of trade-offs or alternatives",
      "Time/space complexity or performance considerations",
    ];
    return [
      "Specific situation from past experience (STAR method)",
      "Clear description of your role and actions taken",
      "Measurable outcomes or quantified results",
      "Lessons learned or skills demonstrated",
      "Relevance to the target role",
    ];
  };

  const identifyStrengths = (results) => {
    const s = [];
    const high    = results.filter(r => r.score >= 8);
    if (high.length)  s.push(`Excellent answers on ${high.length} question${high.length > 1 ? "s" : ""}`);
    const withEx  = results.filter(r => r.hasExamples);
    if (withEx.length > results.length / 2) s.push("Consistent use of real-world examples");
    const avg     = results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1);
    if (avg >= 7) s.push("Consistently strong performance across questions");
    const confHigh = results.filter(r => r.confidence >= 4 && r.score >= 7);
    if (confHigh.length) s.push(`High confidence matched strong answers in ${confHigh.length} case${confHigh.length > 1 ? "s" : ""}`);
    if (!s.length) s.push("Completed the interview — that's the first step");
    return s;
  };

  const identifyImprovements = (results) => {
    const imp = [];
    const low     = results.filter(r => r.score < 5);
    if (low.length)   imp.push(`Improve depth on ${low.length} weaker answer${low.length > 1 ? "s" : ""}`);
    const noEx    = results.filter(r => !r.hasExamples);
    if (noEx.length > results.length / 2) imp.push("Add concrete examples and measurable outcomes to more answers");
    const avg     = results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1);
    if (avg < 6)  imp.push("Focus on structuring answers using the STAR method");
    const lowConf = results.filter(r => r.confidence <= 2);
    if (lowConf.length > 2) imp.push(`Build confidence on ${lowConf.length} topics through further practice`);
    if (!imp.length) imp.push("Continue practising to refine timing and depth");
    return imp;
  };

  const getPerformanceLevel = (pct) => {
    if (pct >= 85) return { label: "Outstanding", color: "#22d3a5", emoji: "🏆", tier: 5 };
    if (pct >= 75) return { label: "Excellent",   color: "#6c63ff", emoji: "🎉", tier: 4 };
    if (pct >= 65) return { label: "Good",         color: "#3b82f6", emoji: "👍", tier: 3 };
    if (pct >= 50) return { label: "Fair",          color: "#f59e0b", emoji: "💪", tier: 2 };
    return              { label: "Needs Work",     color: "#f43f5e", emoji: "📚", tier: 1 };
  };

  const formatTime = (s) => {
    if (!s) return "—";
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const handleDownloadReport = () => {
    if (!analysis) return;
    const report = {
      meta:          { jobTitle: interviewData.jobTitle, experienceLevel: interviewData.experienceLevel, completedAt: interviewData.completedAt, totalTime: formatTime(analysis.totalTime) },
      score:         { percentage: analysis.percentage, total: analysis.totalScore, max: analysis.maxScore, skipped: analysis.skippedCount },
      analytics:     { avgTimePerQuestion: `${Math.round(analysis.avgTime)}s`, avgWordCount: Math.round(analysis.avgWordCount), avgConfidence: analysis.avgConfidence.toFixed(1) },
      roundBreakdown: Object.entries(analysis.roundScores).map(([round, d]) => ({ round: d.name, score: ((d.total / (d.count * 10)) * 100).toFixed(1) + "%", questions: d.count })),
      strengths:     analysis.strengths,
      improvements:  analysis.improvements,
      questionAnalysis: analysis.results.map(r => ({
        question: r.question, answer: r.userAnswer, score: r.score + "/10",
        confidence: r.confidence + "/5", timeSpent: formatTime(r.timeSpent),
        wordCount: r.wordCount, feedback: r.feedback, strengths: r.strengths,
        improvements: r.improvements, skipped: r.skipped,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `interview-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const sortedResults = analysis
    ? [...analysis.results].sort((a, b) => {
        if (sortBy === "score")      return b.score      - a.score;
        if (sortBy === "confidence") return b.confidence - a.confidence;
        if (sortBy === "time")       return b.timeSpent  - a.timeSpent;
        return 0;
      })
    : [];

  // ─── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-orb" />
        <p className="loading-title">Analyzing your interview performance…</p>
        <div className="progress-track">
          <div className="progress-bar-loading" style={{ width: `${analysisProgress}%` }} />
        </div>
        <p className="progress-text">{Math.round(analysisProgress)}% complete</p>
        <p className="loading-sub">AI is reviewing all your answers at once</p>
      </div>
    );
  }

  const perf = getPerformanceLevel(parseFloat(analysis.percentage));

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="results-container">
      {/* Header */}
      <header className="results-header">
        <div>
          <h1 className="results-title">Interview Results</h1>
          <p className="results-subtitle">{interviewData.jobTitle} · {interviewData.experienceLevel}</p>
        </div>
        <div className="header-actions">
          <button className="btn-outline" onClick={handleDownloadReport}>⬇ Download Report</button>
          <button className="btn-outline" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </div>
      </header>

      {/* Score Hero */}
      <section className="score-hero">
        <div className="score-circle-wrap">
          <svg className="score-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={perf.color} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - analysis.percentage / 100)}`}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 8px ${perf.color}80)` }}
            />
          </svg>
          <div className="score-inner">
            <span className="score-pct"  style={{ color: perf.color }}>{analysis.percentage}%</span>
            <span className="score-perf" style={{ color: perf.color }}>{perf.label}</span>
            <span className="score-emoji">{perf.emoji}</span>
          </div>
        </div>

        <div className="score-stats-grid">
          {[
            { icon: "🎯", val: `${analysis.totalScore}/${analysis.maxScore}`, lbl: "Total Score" },
            { icon: "📝", val: analysis.results.length - analysis.skippedCount, lbl: "Answered" },
            ...(analysis.skippedCount > 0 ? [{ icon: "⏭", val: analysis.skippedCount, lbl: "Skipped", warn: true }] : []),
            { icon: "⏱", val: formatTime(analysis.totalTime),            lbl: "Total Time" },
            { icon: "⚡", val: formatTime(Math.round(analysis.avgTime)),  lbl: "Avg per Q"  },
            { icon: "📊", val: Math.round(analysis.avgWordCount),         lbl: "Avg Words"  },
            { icon: "😊", val: `${analysis.avgConfidence.toFixed(1)}/5`,  lbl: "Avg Confidence" },
          ].map(({ icon, val, lbl, warn }, i) => (
            <div key={i} className={`stat-card${warn ? " warn" : ""}`}>
              <span className="stat-icon">{icon}</span>
              <span className="stat-val">{val}</span>
              <span className="stat-lbl">{lbl}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="tabs-bar">
        {[
          { id: "overview",   label: "📊 Overview"   },
          { id: "rounds",     label: "🏁 Rounds"     },
          { id: "questions",  label: "💬 Questions"  },
          { id: "analytics",  label: "📈 Analytics"  },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="two-col">
            <div className="feedback-card strengths-card">
              <h3>💪 Strengths</h3>
              <ul>{analysis.strengths.map((s, i) => <li key={i}><span className="li-dot green">▸</span>{s}</li>)}</ul>
            </div>
            <div className="feedback-card improvements-card">
              <h3>📈 Areas to Improve</h3>
              <ul>{analysis.improvements.map((s, i) => <li key={i}><span className="li-dot amber">▸</span>{s}</li>)}</ul>
            </div>
          </div>

          <div className="dist-card">
            <h3>Score Distribution</h3>
            <div className="dist-bars">
              {[
                { range: "9-10", label: "Excellent",   color: "#22d3a5" },
                { range: "7-8",  label: "Good",         color: "#6c63ff" },
                { range: "5-6",  label: "Fair",          color: "#f59e0b" },
                { range: "0-4",  label: "Needs Work",   color: "#f43f5e" },
              ].map(({ range, label, color }) => {
                const [lo, hi] = range.split("-").map(Number);
                const count    = analysis.results.filter(r => !r.skipped && r.score >= lo && r.score <= hi).length;
                const total    = analysis.results.filter(r => !r.skipped).length;
                const pct      = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={range} className="dist-row">
                    <span className="dist-label">{label}</span>
                    <div className="dist-track">
                      <div className="dist-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="dist-count" style={{ color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="resources-card">
            <h3>📚 Suggested Next Steps</h3>
            <div className="resources-grid">
              {analysis.improvements.slice(0, 3).map((imp, i) => (
                <div key={i} className="resource-item">
                  <span className="resource-icon">{["🧠","📖","🎯"][i]}</span>
                  <div>
                    <div className="resource-title">Practice: {imp.split(" ").slice(0, 5).join(" ")}…</div>
                    <div className="resource-sub">Search LeetCode, YouTube, or mock interview platforms</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Rounds ── */}
      {activeTab === "rounds" && (
        <div className="tab-content">
          <div className="rounds-grid-results">
            {Object.entries(analysis.roundScores).map(([round, data]) => {
              const pct  = data.count > 0 ? ((data.total / (data.count * 10)) * 100).toFixed(1) : 0;
              const perf = getPerformanceLevel(parseFloat(pct));
              return (
                <div key={round} className="round-result-card">
                  <div className="round-result-header">
                    <h3>{data.name}</h3>
                    <span className="round-result-pct" style={{ color: perf.color }}>{pct}%</span>
                  </div>
                  <div className="round-bar-track">
                    <div className="round-bar-fill" style={{ width: `${pct}%`, background: perf.color }} />
                  </div>
                  <div className="round-result-stats">
                    <span>{data.total}/{data.count * 10} pts</span>
                    <span>{data.count} questions</span>
                    <span style={{ color: perf.color }}>{perf.label}</span>
                  </div>
                  {data.scores && (
                    <div className="round-mini-scores">
                      {data.scores.map((s, i) => (
                        <span key={i} className={`mini-score-dot ${s >= 8 ? "high" : s >= 6 ? "mid" : "low"}`}
                          title={`Q${i + 1}: ${s}/10`}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Questions ── */}
      {activeTab === "questions" && (
        <div className="tab-content">
          <div className="questions-toolbar">
            <span className="toolbar-label">Sort by:</span>
            {["order", "score", "confidence", "time"].map(s => (
              <button key={s} className={`sort-btn ${sortBy === s ? "active" : ""}`}
                onClick={() => setSortBy(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {sortedResults.map((result, index) => (
            <div key={result.questionId}
              className={`q-card ${result.skipped ? "skipped" : ""} ${expandedQuestion === result.questionId ? "expanded" : ""}`}>
              <div className="q-card-header"
                onClick={() => setExpandedQuestion(expandedQuestion === result.questionId ? null : result.questionId)}>
                <div className="q-card-left">
                  <span className="q-num">Q{index + 1}</span>
                  <div className="q-meta">
                    <span className="q-round-badge">{result.roundName}</span>
                    {result.skipped && <span className="q-skipped-badge">Skipped</span>}
                  </div>
                  <p className="q-preview">{result.question.slice(0, 80)}{result.question.length > 80 ? "…" : ""}</p>
                </div>
                <div className="q-card-right">
                  <div className="q-score-display">
                    <span className={`q-score-num ${result.score >= 8 ? "green" : result.score >= 6 ? "blue" : result.score >= 4 ? "amber" : "red"}`}>
                      {result.skipped ? "—" : `${result.score}/10`}
                    </span>
                  </div>
                  <div className="q-mini-stats">
                    <span title="Confidence">{"⭐".repeat(result.confidence || 0)}</span>
                    <span title="Time">{formatTime(result.timeSpent)}</span>
                    <span title="Words">{result.wordCount}w</span>
                  </div>
                  <span className="q-expand-icon">{expandedQuestion === result.questionId ? "▲" : "▼"}</span>
                </div>
              </div>

              {expandedQuestion === result.questionId && (
                <div className="q-detail">
                  <h4 className="q-full-text">"{result.question}"</h4>

                  <div className="q-stats-row">
                    <div className="q-stat"><span className="q-stat-label">Score</span>      <span className="q-stat-val">{result.score}/10</span></div>
                    <div className="q-stat"><span className="q-stat-label">Confidence</span>  <span className="q-stat-val">{["😰","😕","😐","😊","🚀"][Math.min((result.confidence||1)-1,4)]} {result.confidence}/5</span></div>
                    <div className="q-stat"><span className="q-stat-label">Time</span>        <span className="q-stat-val">{formatTime(result.timeSpent)}</span></div>
                    <div className="q-stat"><span className="q-stat-label">Words</span>       <span className="q-stat-val">{result.wordCount}</span></div>
                    <div className="q-stat"><span className="q-stat-label">Examples</span>    <span className="q-stat-val">{result.hasExamples ? "✅ Yes" : "❌ No"}</span></div>
                  </div>

                  {!result.skipped && (
                    <div className="q-answer-block">
                      <h5>Your Answer</h5>
                      <div className="q-answer-text">{result.userAnswer}</div>
                    </div>
                  )}

                  <div className="q-sections-grid">
                    {result.feedback.length > 0 && (
                      <div className="q-section feedback-section-detail">
                        <h5>🤖 AI Feedback</h5>
                        <ul>{result.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul>
                      </div>
                    )}
                    {result.strengths.length > 0 && (
                      <div className="q-section strengths-detail">
                        <h5>✅ Strengths</h5>
                        <ul>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                    {result.improvements.length > 0 && (
                      <div className="q-section improve-detail">
                        <h5>💡 To Improve</h5>
                        <ul>{result.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                    <div className="q-section expected-detail">
                      <h5>📋 Expected Points</h5>
                      <ul>{result.expectedPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Analytics ── */}
      {activeTab === "analytics" && (
        <div className="tab-content">
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Confidence vs Score</h3>
              <div className="conf-score-chart">
                {analysis.results.filter(r => !r.skipped).map((r, i) => (
                  <div key={i} className="cs-bar-group" title={`Q${i+1}: Conf ${r.confidence}, Score ${r.score}`}>
                    <div className="cs-bars">
                      <div className="cs-bar conf-bar"  style={{ height: `${(r.confidence / 5) * 100}%` }} />
                      <div className="cs-bar score-bar" style={{ height: `${(r.score / 10) * 100}%` }} />
                    </div>
                    <span className="cs-label">Q{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span><span className="legend-dot conf" /> Confidence (normalised)</span>
                <span><span className="legend-dot score" /> Score (normalised)</span>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Time Per Question</h3>
              <div className="time-chart">
                {analysis.results.filter(r => !r.skipped).map((r, i) => {
                  const maxT = Math.max(...analysis.results.map(x => x.timeSpent), 1);
                  return (
                    <div key={i} className="time-row">
                      <span className="time-q-label">Q{i + 1}</span>
                      <div className="time-track">
                        <div className="time-fill" style={{
                          width: `${(r.timeSpent / maxT) * 100}%`,
                          background: r.timeSpent > 180 ? "#f43f5e" : r.timeSpent > 120 ? "#f59e0b" : "#22d3a5"
                        }} />
                      </div>
                      <span className="time-val">{formatTime(r.timeSpent)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="analytics-card">
              <h3>Word Count per Answer</h3>
              <div className="time-chart">
                {analysis.results.filter(r => !r.skipped).map((r, i) => (
                  <div key={i} className="time-row">
                    <span className="time-q-label">Q{i + 1}</span>
                    <div className="time-track">
                      <div className="time-target-line" style={{ left: `${Math.min((80 / 200) * 100, 100)}%` }} />
                      <div className="time-fill" style={{
                        width: `${Math.min((r.wordCount / 200) * 100, 100)}%`,
                        background: r.wordCount < 30 ? "#f43f5e" : r.wordCount < 48 ? "#f59e0b" : "#6c63ff"
                      }} />
                    </div>
                    <span className="time-val">{r.wordCount}w</span>
                  </div>
                ))}
              </div>
              <p className="chart-note">Target ~80 words per answer. Vertical line marks the target.</p>
            </div>

            <div className="analytics-card">
              <h3>Performance Summary</h3>
              <div className="summary-stats">
                {[
                  { label: "Fastest Answer",    val: formatTime(analysis.fastestAnswer?.timeSpent) },
                  { label: "Slowest Answer",    val: formatTime(analysis.slowestAnswer?.timeSpent) },
                  { label: "Avg Time per Q",    val: formatTime(Math.round(analysis.avgTime)) },
                  { label: "Avg Word Count",    val: `${Math.round(analysis.avgWordCount)} words` },
                  { label: "With Examples",     val: `${analysis.results.filter(r => r.hasExamples).length}/${analysis.results.length}` },
                  { label: "High Confidence",   val: `${analysis.results.filter(r => r.confidence >= 4).length} answers` },
                ].map(({ label, val }, i) => (
                  <div key={i} className="summary-stat">
                    <span className="ss-label">{label}</span>
                    <span className="ss-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-section">
        <button className="btn-action secondary" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        <button className="btn-action download"  onClick={handleDownloadReport}>⬇ Download Report</button>
        <button className="btn-action primary"   onClick={() => { localStorage.removeItem("completedInterview"); navigate("/create-interview"); }}>
          🔄 New Interview
        </button>
      </div>
    </div>
  );
}