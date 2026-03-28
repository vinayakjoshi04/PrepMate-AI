// frontend/src/pages/Results.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeAnswer } from "../services/interviewApi";
import "./results.css";

export default function Results() {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [sortBy, setSortBy] = useState("order"); // order | score | confidence | time

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("completedInterview"));
    if (!data) { navigate("/dashboard"); return; }
    setInterviewData(data);
    analyzeInterview(data);
  }, [navigate]);

  const analyzeInterview = async (data) => {
    const answers = data.answers || [];
    const analysisResults = [];

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      setAnalysisProgress(((i + 1) / answers.length) * 100);

      try {
        const aiResult = await analyzeAnswer(answer, {
          jobTitle: data.jobTitle,
          experienceLevel: data.experienceLevel,
        });
        analysisResults.push({
          questionId: answer.questionId,
          question: answer.question,
          userAnswer: answer.answer,
          score: aiResult.score,
          feedback: aiResult.feedback,
          strengths: aiResult.strengths,
          improvements: aiResult.improvements,
          modelAnswer: aiResult.modelAnswer || null,
          hasExamples: aiResult.hasExamples,
          round: answer.round,
          roundName: answer.roundName || `Round ${answer.round}`,
          confidence: answer.confidence || 3,
          timeSpent: answer.timeSpent || 0,
          wordCount: answer.wordCount || 0,
          skipped: answer.skipped || false,
          expectedPoints: generateExpectedPoints(answer.question, answer.round),
          keywords: aiResult.keywords || [],
          skillArea: aiResult.skillArea || "General",
        });
      } catch (error) {
        analysisResults.push(basicAnalysis(answer));
      }
    }

    const nonSkipped = analysisResults.filter(r => !r.skipped);
    const totalScore = nonSkipped.reduce((s, r) => s + r.score, 0);
    const maxScore = nonSkipped.length * 10;
    const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : 0;

    // Round scores
    const roundScores = {};
    analysisResults.forEach(r => {
      if (!roundScores[r.round]) roundScores[r.round] = { name: r.roundName, total: 0, count: 0, scores: [] };
      if (!r.skipped) {
        roundScores[r.round].total += r.score;
        roundScores[r.round].count += 1;
        roundScores[r.round].scores.push(r.score);
      }
    });

    // Skill area breakdown
    const skillMap = {};
    analysisResults.filter(r => !r.skipped).forEach(r => {
      const area = r.skillArea;
      if (!skillMap[area]) skillMap[area] = { total: 0, count: 0 };
      skillMap[area].total += r.score;
      skillMap[area].count += 1;
    });

    // Confidence vs score correlation
    const confidenceCorrelation = nonSkipped.map(r => ({
      confidence: r.confidence,
      score: r.score,
    }));

    // Time analytics
    const avgTime = nonSkipped.length > 0
      ? nonSkipped.reduce((s, r) => s + r.timeSpent, 0) / nonSkipped.length
      : 0;
    const fastestAnswer = nonSkipped.reduce((min, r) => r.timeSpent < min.timeSpent ? r : min, nonSkipped[0] || {});
    const slowestAnswer = nonSkipped.reduce((max, r) => r.timeSpent > max.timeSpent ? r : max, nonSkipped[0] || {});

    setAnalysis({
      results: analysisResults,
      totalScore, maxScore, percentage,
      roundScores,
      skillMap,
      confidenceCorrelation,
      avgTime,
      fastestAnswer,
      slowestAnswer,
      totalTime: data.totalTime || 0,
      skippedCount: analysisResults.filter(r => r.skipped).length,
      strengths: identifyStrengths(nonSkipped),
      improvements: identifyImprovements(nonSkipped),
      avgConfidence: nonSkipped.reduce((s, r) => s + r.confidence, 0) / (nonSkipped.length || 1),
      avgWordCount: nonSkipped.reduce((s, r) => s + r.wordCount, 0) / (nonSkipped.length || 1),
    });
    setLoading(false);
  };

  const basicAnalysis = (answer) => {
    const wordCount = answer.answer === "[Skipped]" ? 0 : answer.answer.split(/\s+/).length;
    const hasExamples = answer.answer.toLowerCase().includes("example") ||
                        answer.answer.toLowerCase().includes("experience");
    let score = 5;
    if (wordCount < 20) score = 3;
    else if (wordCount < 50) score = 5;
    else if (wordCount < 100) score = 7;
    else score = 8;
    if (hasExamples) score = Math.min(score + 1, 10);
    return {
      questionId: answer.questionId,
      question: answer.question,
      userAnswer: answer.answer,
      score: answer.skipped ? 0 : score,
      feedback: [answer.skipped ? "Question was skipped" : "Answer analyzed based on length and content"],
      strengths: answer.skipped ? [] : ["Attempted the question"],
      improvements: ["Add more specific examples and quantify results"],
      modelAnswer: null,
      hasExamples,
      round: answer.round,
      roundName: answer.roundName || `Round ${answer.round}`,
      confidence: answer.confidence || 3,
      timeSpent: answer.timeSpent || 0,
      wordCount,
      skipped: answer.skipped || false,
      expectedPoints: generateExpectedPoints(answer.question, answer.round),
      keywords: [],
      skillArea: "General",
    };
  };

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
    const high = results.filter(r => r.score >= 8);
    if (high.length) s.push(`Excellent answers on ${high.length} question${high.length > 1 ? "s" : ""}`);
    const withEx = results.filter(r => r.hasExamples);
    if (withEx.length > results.length / 2) s.push("Consistent use of real-world examples");
    const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (avg >= 7) s.push("Consistently strong performance across questions");
    const confAnswers = results.filter(r => r.confidence >= 4 && r.score >= 7);
    if (confAnswers.length > 0) s.push(`High confidence matched strong answers in ${confAnswers.length} case${confAnswers.length > 1 ? "s" : ""}`);
    if (!s.length) s.push("Completed the interview — that's the first step");
    return s;
  };

  const identifyImprovements = (results) => {
    const imp = [];
    const low = results.filter(r => r.score < 5);
    if (low.length) imp.push(`Improve depth on ${low.length} weaker answer${low.length > 1 ? "s" : ""}`);
    const noEx = results.filter(r => !r.hasExamples);
    if (noEx.length > results.length / 2) imp.push("Add concrete examples and measurable outcomes to more answers");
    const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (avg < 6) imp.push("Focus on structuring answers using the STAR method");
    const lowConf = results.filter(r => r.confidence <= 2);
    if (lowConf.length > 2) imp.push(`Build confidence on ${lowConf.length} topics through further practice`);
    if (!imp.length) imp.push("Continue practicing to refine timing and depth");
    return imp;
  };

  const getPerformanceLevel = (pct) => {
    if (pct >= 85) return { label: "Outstanding", color: "#22d3a5", emoji: "🏆", tier: 5 };
    if (pct >= 75) return { label: "Excellent", color: "#6c63ff", emoji: "🎉", tier: 4 };
    if (pct >= 65) return { label: "Good", color: "#3b82f6", emoji: "👍", tier: 3 };
    if (pct >= 50) return { label: "Fair", color: "#f59e0b", emoji: "💪", tier: 2 };
    return { label: "Needs Work", color: "#f43f5e", emoji: "📚", tier: 1 };
  };

  const formatTime = (s) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const sortedResults = analysis
    ? [...analysis.results].sort((a, b) => {
        if (sortBy === "score") return b.score - a.score;
        if (sortBy === "confidence") return b.confidence - a.confidence;
        if (sortBy === "time") return b.timeSpent - a.timeSpent;
        return 0; // order
      })
    : [];

  const handleDownloadReport = () => {
    if (!analysis) return;
    const report = {
      meta: { jobTitle: interviewData.jobTitle, experienceLevel: interviewData.experienceLevel, completedAt: interviewData.completedAt, totalTime: formatTime(analysis.totalTime) },
      score: { percentage: analysis.percentage, total: analysis.totalScore, max: analysis.maxScore, skipped: analysis.skippedCount },
      analytics: { avgTimePerQuestion: `${Math.round(analysis.avgTime)}s`, avgWordCount: Math.round(analysis.avgWordCount), avgConfidence: analysis.avgConfidence.toFixed(1) },
      roundBreakdown: Object.entries(analysis.roundScores).map(([round, d]) => ({
        round: d.name, score: ((d.total / (d.count * 10)) * 100).toFixed(1) + "%", questions: d.count,
      })),
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      questionAnalysis: analysis.results.map(r => ({
        question: r.question,
        answer: r.userAnswer,
        score: r.score + "/10",
        confidence: r.confidence + "/5",
        timeSpent: formatTime(r.timeSpent),
        wordCount: r.wordCount,
        feedback: r.feedback,
        strengths: r.strengths,
        improvements: r.improvements,
        skipped: r.skipped,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-orb"></div>
        <p className="loading-title">Analyzing your interview performance…</p>
        <div className="progress-track">
          <div className="progress-bar-loading" style={{ width: `${analysisProgress}%` }} />
        </div>
        <p className="progress-text">{Math.round(analysisProgress)}% complete</p>
        <p className="loading-sub">AI is reviewing each answer in detail</p>
      </div>
    );
  }

  const perf = getPerformanceLevel(parseFloat(analysis.percentage));

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
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={perf.color} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - analysis.percentage / 100)}`}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 8px ${perf.color}80)` }}
            />
          </svg>
          <div className="score-inner">
            <span className="score-pct" style={{ color: perf.color }}>{analysis.percentage}%</span>
            <span className="score-perf" style={{ color: perf.color }}>{perf.label}</span>
            <span className="score-emoji">{perf.emoji}</span>
          </div>
        </div>

        <div className="score-stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <span className="stat-val">{analysis.totalScore}/{analysis.maxScore}</span>
            <span className="stat-lbl">Total Score</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📝</span>
            <span className="stat-val">{analysis.results.length - analysis.skippedCount}</span>
            <span className="stat-lbl">Answered</span>
          </div>
          {analysis.skippedCount > 0 && (
            <div className="stat-card warn">
              <span className="stat-icon">⏭</span>
              <span className="stat-val">{analysis.skippedCount}</span>
              <span className="stat-lbl">Skipped</span>
            </div>
          )}
          <div className="stat-card">
            <span className="stat-icon">⏱</span>
            <span className="stat-val">{formatTime(analysis.totalTime)}</span>
            <span className="stat-lbl">Total Time</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <span className="stat-val">{formatTime(Math.round(analysis.avgTime))}</span>
            <span className="stat-lbl">Avg per Q</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📊</span>
            <span className="stat-val">{Math.round(analysis.avgWordCount)}</span>
            <span className="stat-lbl">Avg Words</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">😊</span>
            <span className="stat-val">{analysis.avgConfidence.toFixed(1)}/5</span>
            <span className="stat-lbl">Avg Confidence</span>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="tabs-bar">
        {[
          { id: "overview", label: "📊 Overview" },
          { id: "rounds", label: "🏁 Rounds" },
          { id: "questions", label: "💬 Questions" },
          { id: "analytics", label: "📈 Analytics" },
        ].map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="tab-content">
          <div className="two-col">
            <div className="feedback-card strengths-card">
              <h3>💪 Strengths</h3>
              <ul>
                {analysis.strengths.map((s, i) => (
                  <li key={i}><span className="li-dot green">▸</span>{s}</li>
                ))}
              </ul>
            </div>
            <div className="feedback-card improvements-card">
              <h3>📈 Areas to Improve</h3>
              <ul>
                {analysis.improvements.map((s, i) => (
                  <li key={i}><span className="li-dot amber">▸</span>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Score distribution bar */}
          <div className="dist-card">
            <h3>Score Distribution</h3>
            <div className="dist-bars">
              {[
                { range: "9-10", label: "Excellent", color: "#22d3a5" },
                { range: "7-8", label: "Good", color: "#6c63ff" },
                { range: "5-6", label: "Fair", color: "#f59e0b" },
                { range: "0-4", label: "Needs Work", color: "#f43f5e" },
              ].map(({ range, label, color }) => {
                const [lo, hi] = range.split("-").map(Number);
                const count = analysis.results.filter(r => !r.skipped && r.score >= lo && r.score <= hi).length;
                const total = analysis.results.filter(r => !r.skipped).length;
                const pct = total > 0 ? (count / total) * 100 : 0;
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

          {/* Resource suggestions */}
          <div className="resources-card">
            <h3>📚 Suggested Resources</h3>
            <div className="resources-grid">
              {analysis.improvements.slice(0, 3).map((imp, i) => (
                <div key={i} className="resource-item">
                  <span className="resource-icon">{["🧠","📖","🎯"][i]}</span>
                  <div>
                    <div className="resource-title">Practice: {imp.split(" ").slice(0, 5).join(" ")}…</div>
                    <div className="resource-sub">Search LeetCode, YouTube, or mock interviews</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Rounds ──────────────────────────────── */}
      {activeTab === "rounds" && (
        <div className="tab-content">
          <div className="rounds-grid-results">
            {Object.entries(analysis.roundScores).map(([round, data]) => {
              const pct = data.count > 0 ? ((data.total / (data.count * 10)) * 100).toFixed(1) : 0;
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
                          title={`Q${i + 1}: ${s}/10`}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Questions ───────────────────────────── */}
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
              <div className="q-card-header" onClick={() => setExpandedQuestion(
                expandedQuestion === result.questionId ? null : result.questionId
              )}>
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
                    <span title="Confidence">{"😊".repeat(0)}{"⭐".repeat(result.confidence || 0)}</span>
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
                    <div className="q-stat"><span className="q-stat-label">Score</span><span className="q-stat-val">{result.score}/10</span></div>
                    <div className="q-stat"><span className="q-stat-label">Confidence</span>
                      <span className="q-stat-val">
                        {["😰","😕","😐","😊","🚀"][Math.min((result.confidence || 1) - 1, 4)]} {result.confidence}/5
                      </span>
                    </div>
                    <div className="q-stat"><span className="q-stat-label">Time</span><span className="q-stat-val">{formatTime(result.timeSpent)}</span></div>
                    <div className="q-stat"><span className="q-stat-label">Words</span><span className="q-stat-val">{result.wordCount}</span></div>
                    <div className="q-stat"><span className="q-stat-label">Examples</span><span className="q-stat-val">{result.hasExamples ? "✅ Yes" : "❌ No"}</span></div>
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

                  {result.modelAnswer && (
                    <div className="model-answer-block">
                      <h5>💎 Model Answer</h5>
                      <p>{result.modelAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: Analytics ───────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="tab-content">
          <div className="analytics-grid">
            {/* Confidence vs Score */}
            <div className="analytics-card">
              <h3>Confidence vs Score</h3>
              <div className="conf-score-chart">
                {analysis.results.filter(r => !r.skipped).map((r, i) => (
                  <div key={i} className="cs-bar-group" title={`Q${i+1}: Conf ${r.confidence}, Score ${r.score}`}>
                    <div className="cs-bars">
                      <div className="cs-bar conf-bar" style={{ height: `${(r.confidence / 5) * 100}%` }}
                        title={`Confidence: ${r.confidence}/5`} />
                      <div className="cs-bar score-bar" style={{ height: `${(r.score / 10) * 100}%` }}
                        title={`Score: ${r.score}/10`} />
                    </div>
                    <span className="cs-label">Q{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <span><span className="legend-dot conf"></span> Confidence (normalized)</span>
                <span><span className="legend-dot score"></span> Score (normalized)</span>
              </div>
            </div>

            {/* Time per Question */}
            <div className="analytics-card">
              <h3>Time Per Question</h3>
              <div className="time-chart">
                {analysis.results.filter(r => !r.skipped).map((r, i) => {
                  const maxT = Math.max(...analysis.results.map(x => x.timeSpent), 1);
                  const pct = (r.timeSpent / maxT) * 100;
                  return (
                    <div key={i} className="time-row">
                      <span className="time-q-label">Q{i + 1}</span>
                      <div className="time-track">
                        <div className="time-fill" style={{ width: `${pct}%`,
                          background: r.timeSpent > 180 ? "#f43f5e" : r.timeSpent > 120 ? "#f59e0b" : "#22d3a5" }} />
                      </div>
                      <span className="time-val">{formatTime(r.timeSpent)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Word Count Trend */}
            <div className="analytics-card">
              <h3>Word Count per Answer</h3>
              <div className="time-chart">
                {analysis.results.filter(r => !r.skipped).map((r, i) => {
                  const maxW = Math.max(...analysis.results.map(x => x.wordCount), 1);
                  const pct = Math.min((r.wordCount / 200) * 100, 100);
                  const target = 80;
                  return (
                    <div key={i} className="time-row">
                      <span className="time-q-label">Q{i + 1}</span>
                      <div className="time-track">
                        <div className="time-target-line" style={{ left: `${Math.min((target / 200) * 100, 100)}%` }} />
                        <div className="time-fill" style={{ width: `${pct}%`,
                          background: r.wordCount < 30 ? "#f43f5e" : r.wordCount < target * 0.6 ? "#f59e0b" : "#6c63ff" }} />
                      </div>
                      <span className="time-val">{r.wordCount}w</span>
                    </div>
                  );
                })}
              </div>
              <p className="chart-note">Target: ~80 words per answer. The vertical line marks the target.</p>
            </div>

            {/* Summary stats */}
            <div className="analytics-card">
              <h3>Performance Summary</h3>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="ss-label">Fastest Answer</span>
                  <span className="ss-val">{formatTime(analysis.fastestAnswer?.timeSpent)}</span>
                </div>
                <div className="summary-stat">
                  <span className="ss-label">Slowest Answer</span>
                  <span className="ss-val">{formatTime(analysis.slowestAnswer?.timeSpent)}</span>
                </div>
                <div className="summary-stat">
                  <span className="ss-label">Avg Time per Q</span>
                  <span className="ss-val">{formatTime(Math.round(analysis.avgTime))}</span>
                </div>
                <div className="summary-stat">
                  <span className="ss-label">Avg Word Count</span>
                  <span className="ss-val">{Math.round(analysis.avgWordCount)} words</span>
                </div>
                <div className="summary-stat">
                  <span className="ss-label">With Examples</span>
                  <span className="ss-val">{analysis.results.filter(r => r.hasExamples).length}/{analysis.results.length}</span>
                </div>
                <div className="summary-stat">
                  <span className="ss-label">High Confidence (4-5)</span>
                  <span className="ss-val">{analysis.results.filter(r => r.confidence >= 4).length} answers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-section">
        <button className="btn-action secondary" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        <button className="btn-action download" onClick={handleDownloadReport}>⬇ Download Report</button>
        <button className="btn-action primary" onClick={() => { localStorage.removeItem("completedInterview"); navigate("/create-interview"); }}>
          🔄 New Interview
        </button>
      </div>
    </div>
  );
}