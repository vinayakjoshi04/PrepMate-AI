// frontend/src/pages/Results.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./results.css";

export default function Results() {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState(null);
  const [analysis, setAnalysis]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [analysisWarning, setAnalysisWarning] = useState(false);
  const [activeTab, setActiveTab]         = useState("summary");
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [sortBy, setSortBy]               = useState("order");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("completedInterview"));
    if (!data) { navigate("/dashboard"); return; }
    setInterviewData(data);

    if (localStorage.getItem("interviewAnalysisWarning")) {
      setAnalysisWarning(true);
      localStorage.removeItem("interviewAnalysisWarning");
    }

    buildAnalysis(data);
    setLoading(false);
  }, [navigate]);

    const buildAnalysis = (data) => {
    const answers = data.answers || [];
    if (!answers.length) return;
    const executiveSummary = data.executiveSummary || null;

    const analysisResults = answers.map((answer) => {
      const r = answer.report || null;
      const skipped = !!answer.skipped;
      const isCoding = !!answer.isCoding;
      // FIX: was `!isCoding && !skipped && ...` — that discarded video/audio
      // analysis for coding questions even when a recording existed and was
      // analyzed. Now hasMultimodal reflects whether analysis data actually
      // came back, regardless of question type.
      const hasMultimodal = !skipped && !!(r?.videoMetrics || r?.audioMetrics);

      return {
        questionId:     answer.questionId,
        question:       answer.question,
        userAnswer:     answer.answer,
        score:          skipped ? 0 : (r?.contentScore ?? 5),
        feedback:       r?.feedback     ?? (skipped ? ["Question was skipped."] : []),
        strengths:      r?.strengths    ?? [],
        improvements:   r?.improvements ?? [],
        hasExamples:    r?.hasExamples  ?? false,
        round:          answer.round,
        roundName:      answer.roundName || `Round ${answer.round}`,
        confidence:     answer.confidence || 3,
        timeSpent:      answer.timeSpent  || 0,
        wordCount:      answer.wordCount  || 0,
        skipped,
        isCoding,
        expectedPoints: generateExpectedPoints(answer.question, answer.round, isCoding),
        deliveryScore:  r?.deliveryScore != null ? r.deliveryScore * 10 : null,
        overallScore:   r?.overallScore ?? null,
        nonverbalNotes: r?.nonverbalNotes || "",
        vocalNotes:     r?.vocalNotes || "",
        videoMetrics:   r?.videoMetrics || null,
        audioMetrics:   r?.audioMetrics || null,
        hasMultimodal,
      };
    });

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

    const withMM = nonSkipped.filter(r => r.hasMultimodal);
    const avgDeliveryScore = withMM.length
      ? withMM.reduce((s, r) => s + (r.deliveryScore || 0), 0) / withMM.length
      : null;

    let videoAgg = null, audioAgg = null;
    if (withMM.length) {
      const vids = withMM.map(r => r.videoMetrics).filter(v => v && !v.error);
      const auds = withMM.map(r => r.audioMetrics).filter(a => a && !a.error);
      const avg = (arr, key) => {
        const vals = arr.map(x => x[key]).filter(v => typeof v === "number");
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      };
      if (vids.length) {
        videoAgg = {
          eyeContactPct:   avg(vids, "eyeContactPct"),
          engagementScore: avg(vids, "engagementScore"),
          headStability:   avg(vids, "headStability"),
          postureScore:    avg(vids, "postureScore"),
          smilePct:        avg(vids, "smilePct"),
          blinkRate:       avg(vids, "blinkRate"),
          clipsAnalyzed:   vids.length,
        };
      }
      if (auds.length) {
        audioAgg = {
          deliveryScore:     avg(auds, "deliveryScore"),
          wordsPerMinute:    avg(auds, "wordsPerMinute"),
          fillerWordRate:    avg(auds, "fillerWordRate"),
          volumeConsistency: avg(auds, "volumeConsistency"),
          pitchVariety:      avg(auds, "pitchVariety"),
          pauseRatio:        avg(auds, "pauseRatio"),
          clipsAnalyzed:     auds.length,
        };
      }
    }

    const codingCount = analysisResults.filter(r => r.isCoding && !r.skipped).length;

    setAnalysis({
      results:       analysisResults,
      executiveSummary,
      totalScore, maxScore, percentage,
      roundScores,
      avgTime,
      fastestAnswer,
      slowestAnswer,
      totalTime:        data.totalTime || 0,
      skippedCount:     analysisResults.filter(r => r.skipped).length,
      codingCount,
      strengths:        identifyStrengths(nonSkipped),
      improvements:     identifyImprovements(nonSkipped),
      avgConfidence:    nonSkipped.reduce((s, r) => s + r.confidence, 0) / (nonSkipped.length || 1),
      avgWordCount:     nonSkipped.reduce((s, r) => s + r.wordCount,  0) / (nonSkipped.length || 1),
      hasMultimodal:    withMM.length > 0,
      avgDeliveryScore,
      videoAgg,
      audioAgg,
      bestAnswer:  nonSkipped.reduce((best, r) => (r.score > (best?.score ?? -1) ? r : best), null),
      worstAnswer: nonSkipped.filter(r => !r.isCoding).reduce((worst, r) => (r.score < (worst?.score ?? 11) ? r : worst), null),
    });
  };

  const generateExpectedPoints = (question, round, isCoding) => {
    if (isCoding) return [
      "Clarify requirements/edge cases before coding",
      "Correct, working solution",
      "Reasonable time/space complexity",
      "Readable code with sensible naming",
      "Discussion of trade-offs or alternative approaches",
    ];
    if (round <= 2) return [
      "Clear explanation of core concepts",
      "Mention relevant technologies or frameworks",
      "Practical examples or use cases",
      "Discussion of trade-offs or alternatives",
      "Performance considerations",
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
    const avg = results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1);
    if (avg >= 7) s.push("Consistently strong performance across questions");
    const confHigh = results.filter(r => r.confidence >= 4 && r.score >= 7);
    if (confHigh.length) s.push(`High confidence matched strong answers in ${confHigh.length} case${confHigh.length > 1 ? "s" : ""}`);
    const goodEyeContact = results.filter(r => r.videoMetrics && r.videoMetrics.eyeContactPct >= 65);
    if (goodEyeContact.length) s.push(`Strong eye contact maintained on ${goodEyeContact.length} answer${goodEyeContact.length > 1 ? "s" : ""}`);
    const cleanDelivery = results.filter(r => r.audioMetrics && r.audioMetrics.fillerWordRate <= 3 && r.audioMetrics.speakingDurationSec > 0);
    if (cleanDelivery.length) s.push("Minimal filler words — clean, confident vocal delivery");
    const codingWins = results.filter(r => r.isCoding && r.score >= 7);
    if (codingWins.length) s.push(`Solid coding solutions on ${codingWins.length} question${codingWins.length > 1 ? "s" : ""}`);
    if (!s.length) s.push("Completed the interview — that's the first step");
    return s;
  };

  const identifyImprovements = (results) => {
    const imp = [];
    const low = results.filter(r => r.score < 5);
    if (low.length) imp.push(`Improve depth on ${low.length} weaker answer${low.length > 1 ? "s" : ""}`);
    const noEx = results.filter(r => !r.hasExamples && !r.isCoding);
    if (noEx.length > results.length / 2) imp.push("Add concrete examples and measurable outcomes to more answers");
    const avg = results.reduce((sum, r) => sum + r.score, 0) / (results.length || 1);
    if (avg < 6) imp.push("Focus on structuring answers using the STAR method");
    const lowConf = results.filter(r => r.confidence <= 2);
    if (lowConf.length > 2) imp.push(`Build confidence on ${lowConf.length} topics through further practice`);
    const lowEyeContact = results.filter(r => r.videoMetrics && r.videoMetrics.eyeContactPct < 40);
    if (lowEyeContact.length) imp.push(`Work on eye contact — it dropped on ${lowEyeContact.length} answer${lowEyeContact.length > 1 ? "s" : ""}`);
    const heavyFillers = results.filter(r => r.audioMetrics && r.audioMetrics.fillerWordRate > 8);
    if (heavyFillers.length) imp.push("Reduce filler words (um, like, you know) during answers");
    const fastTalkers = results.filter(r => r.audioMetrics?.wordsPerMinute && r.audioMetrics.wordsPerMinute > 170);
    if (fastTalkers.length) imp.push("Slow down slightly — pace was rushed on some answers");
    const weakCoding = results.filter(r => r.isCoding && r.score < 6);
    if (weakCoding.length) imp.push(`Revisit approach/complexity on ${weakCoding.length} coding question${weakCoding.length > 1 ? "s" : ""}`);
    if (!imp.length) imp.push("Continue practising to refine timing and depth");
    return imp;
  };

  const getPerformanceLevel = (pct) => {
    if (pct >= 85) return { label: "Outstanding", color: "#22c55e", verdict: "You're interview-ready. This level of performance would stand out to most hiring panels." };
    if (pct >= 75) return { label: "Excellent",   color: "#3b82f6", verdict: "Strong performance overall — just a few edges to polish before you're fully ready." };
    if (pct >= 65) return { label: "Good",         color: "#60a5fa", verdict: "Solid foundation. A bit more practice on structure and depth will take this further." };
    if (pct >= 50) return { label: "Fair",          color: "#eab308", verdict: "You're on the right track, but there's real room to grow before the next attempt." };
    return              { label: "Needs Work",     color: "#ef4444", verdict: "This is a starting point, not a verdict. Focus on the improvement areas below and try again." };
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
      executiveSummary: analysis.executiveSummary || null,
      score:         { percentage: analysis.percentage, total: analysis.totalScore, max: analysis.maxScore, skipped: analysis.skippedCount },
      analytics:     { avgTimePerQuestion: `${Math.round(analysis.avgTime)}s`, avgWordCount: Math.round(analysis.avgWordCount), avgConfidence: analysis.avgConfidence.toFixed(1) },
      delivery:      analysis.hasMultimodal ? { avgDeliveryScore: analysis.avgDeliveryScore?.toFixed(1), video: analysis.videoAgg, audio: analysis.audioAgg } : null,
      roundBreakdown: Object.entries(analysis.roundScores).map(([round, d]) => ({ round: d.name, score: ((d.total / (d.count * 10)) * 100).toFixed(1) + "%", questions: d.count })),
      strengths:     analysis.strengths,
      improvements:  analysis.improvements,
      questionAnalysis: analysis.results.map(r => ({
        question: r.question, answer: r.userAnswer, score: r.score + "/10",
        confidence: r.confidence + "/5", timeSpent: formatTime(r.timeSpent),
        wordCount: r.wordCount, feedback: r.feedback, strengths: r.strengths,
        improvements: r.improvements, skipped: r.skipped, isCoding: r.isCoding,
        deliveryScore: r.deliveryScore, nonverbalNotes: r.nonverbalNotes, vocalNotes: r.vocalNotes,
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
        if (sortBy === "delivery")   return (b.deliveryScore || -1) - (a.deliveryScore || -1);
        return 0;
      })
    : [];

  if (loading || !analysis) {
    return (
      <div className="loading-container">
        <div className="loading-orb" />
        <p className="loading-title">Preparing your report…</p>
      </div>
    );
  }

  const perf = getPerformanceLevel(parseFloat(analysis.percentage));

  return (
    <div className="results-container">
      <header className="results-header">
        <div>
          <span className="results-eyebrow">Interview Report</span>
          <h1 className="results-title">{interviewData.jobTitle}</h1>
          <p className="results-subtitle">{interviewData.experienceLevel} · Completed {new Date(interviewData.completedAt).toLocaleDateString()}</p>
        </div>
        <div className="header-actions">
          <button className="btn-outline" onClick={handleDownloadReport}>Download</button>
          <button className="btn-outline" onClick={() => navigate("/dashboard")}>Dashboard</button>
        </div>
      </header>

      {analysisWarning && (
        <div className="mm-warning-banner">
          Full analysis was unavailable when this interview finished — scores below use fallback estimates.
          <button onClick={() => setAnalysisWarning(false)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ── VERDICT HERO ─────────────────────────────────── */}
      <section className="verdict-hero" style={{ "--perf-color": perf.color }}>
        <div className="verdict-left">
          <div className="verdict-ring-wrap">
            <svg className="score-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={perf.color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - analysis.percentage / 100)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
              />
            </svg>
            <div className="verdict-ring-inner">
              <span className="verdict-pct">{analysis.percentage}%</span>
              <span className="verdict-pct-label">Overall</span>
            </div>
          </div>
        </div>
        <div className="verdict-right">
          <div className="verdict-badge" style={{ color: perf.color, borderColor: `${perf.color}40`, background: `${perf.color}14` }}>
            {perf.label}
          </div>
          <p className="verdict-text">{perf.verdict}</p>
          <div className="verdict-meta-row">
            <span><strong>{analysis.results.length - analysis.skippedCount}</strong> of {analysis.results.length} answered</span>
            <span className="dot">·</span>
            <span><strong>{formatTime(analysis.totalTime)}</strong> total time</span>
            {analysis.hasMultimodal && (
              <>
                <span className="dot">·</span>
                <span><strong>{analysis.avgDeliveryScore?.toFixed(0)}/100</strong> delivery</span>
              </>
            )}
          </div>
        </div>
      </section>

      {analysis.executiveSummary && (
        <section className="exec-summary-card">
          <div className="exec-summary-label">Executive Summary</div>
          <p className="exec-summary-text">{analysis.executiveSummary}</p>
        </section>
      )}

      <div className="tabs-bar">
        {[
          { id: "summary",    label: "Summary"    },
          { id: "questions",  label: "Questions"  },
          { id: "rounds",     label: "Rounds"     },
          { id: "analytics",  label: "Analytics"  },
          ...(analysis.hasMultimodal ? [{ id: "delivery", label: "Delivery" }] : []),
        ].map(t => (
          <button key={t.id} className={`tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" && (
        <div className="tab-content">

          {(analysis.bestAnswer || analysis.worstAnswer) && (
            <div className="highlight-row">
              {analysis.bestAnswer && (
                <div className="highlight-card highlight-best">
                  <div className="highlight-tag">Strongest answer</div>
                  <p className="highlight-q">"{analysis.bestAnswer.question.slice(0, 90)}{analysis.bestAnswer.question.length > 90 ? "…" : ""}"</p>
                  <div className="highlight-score">{analysis.bestAnswer.score}/10</div>
                </div>
              )}
              {analysis.worstAnswer && analysis.worstAnswer.questionId !== analysis.bestAnswer?.questionId && (
                <div className="highlight-card highlight-weak">
                  <div className="highlight-tag">Focus area</div>
                  <p className="highlight-q">"{analysis.worstAnswer.question.slice(0, 90)}{analysis.worstAnswer.question.length > 90 ? "…" : ""}"</p>
                  <div className="highlight-score">{analysis.worstAnswer.score}/10</div>
                </div>
              )}
            </div>
          )}

          <div className="two-col">
            <div className="feedback-card strengths-card">
              <h3>What worked</h3>
              <ul>{analysis.strengths.map((s, i) => <li key={i}><span className="li-dot green">—</span>{s}</li>)}</ul>
            </div>
            <div className="feedback-card improvements-card">
              <h3>What to work on</h3>
              <ul>{analysis.improvements.map((s, i) => <li key={i}><span className="li-dot amber">—</span>{s}</li>)}</ul>
            </div>
          </div>

          <div className="dist-card">
            <h3>Score distribution</h3>
            <div className="dist-bars">
              {[
                { range: "9-10", label: "Excellent",   color: "#22c55e" },
                { range: "7-8",  label: "Good",         color: "#3b82f6" },
                { range: "5-6",  label: "Fair",          color: "#eab308" },
                { range: "0-4",  label: "Needs Work",   color: "#ef4444" },
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
            <h3>Suggested next steps</h3>
            <div className="resources-grid">
              {analysis.improvements.slice(0, 3).map((imp, i) => (
                <div key={i} className="resource-item">
                  <span className="resource-index">{i + 1}</span>
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

      {activeTab === "rounds" && (
        <div className="tab-content">
          <div className="rounds-grid-results">
            {Object.entries(analysis.roundScores).map(([round, data]) => {
              const pct  = data.count > 0 ? ((data.total / (data.count * 10)) * 100).toFixed(1) : 0;
              const rperf = getPerformanceLevel(parseFloat(pct));
              return (
                <div key={round} className="round-result-card">
                  <div className="round-result-header">
                    <h3>{data.name}</h3>
                    <span className="round-result-pct" style={{ color: rperf.color }}>{pct}%</span>
                  </div>
                  <div className="round-bar-track">
                    <div className="round-bar-fill" style={{ width: `${pct}%`, background: rperf.color }} />
                  </div>
                  <div className="round-result-stats">
                    <span>{data.total}/{data.count * 10} pts</span>
                    <span>{data.count} questions</span>
                    <span style={{ color: rperf.color }}>{rperf.label}</span>
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

      {activeTab === "questions" && (
        <div className="tab-content">
          <div className="questions-toolbar">
            <span className="toolbar-label">Sort:</span>
            {["order", "score", "confidence", "time", ...(analysis.hasMultimodal ? ["delivery"] : [])].map(s => (
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

                <div className={`q-score-pill ${result.score >= 8 ? "green" : result.score >= 6 ? "blue" : result.score >= 4 ? "amber" : "red"}`}>
                  {result.skipped ? "—" : result.score}
                </div>

                <div className="q-card-left">
                  <div className="q-meta">
                    <span className="q-round-badge">{result.roundName}</span>
                    {result.skipped && <span className="q-skipped-badge">Skipped</span>}
                    {result.isCoding && <span className="q-coding-badge">Coding</span>}
                    {result.hasMultimodal && <span className="q-mm-badge">Recorded</span>}
                  </div>
                  <p className="q-preview">{result.question.slice(0, 90)}{result.question.length > 90 ? "…" : ""}</p>
                </div>

                <div className="q-card-right">
                  <div className="q-mini-stats">
                    <span title="Time">{formatTime(result.timeSpent)}</span>
                    {result.hasMultimodal && <span title="Delivery">{result.deliveryScore}/100</span>}
                  </div>
                  <span className="q-expand-icon">{expandedQuestion === result.questionId ? "▲" : "▼"}</span>
                </div>
              </div>

              {expandedQuestion === result.questionId && (
                <div className="q-detail">
                  <h4 className="q-full-text">{result.question}</h4>

                  <div className="q-stats-row">
                    <div className="q-stat"><span className="q-stat-label">Content</span> <span className="q-stat-val">{result.score}/10</span></div>
                    <div className="q-stat"><span className="q-stat-label">Confidence</span>  <span className="q-stat-val">{result.confidence}/5</span></div>
                    <div className="q-stat"><span className="q-stat-label">Time</span>        <span className="q-stat-val">{formatTime(result.timeSpent)}</span></div>
                    <div className="q-stat"><span className="q-stat-label">Words</span>       <span className="q-stat-val">{result.wordCount}</span></div>
                    <div className="q-stat"><span className="q-stat-label">Examples</span>    <span className="q-stat-val">{result.hasExamples ? "Yes" : "No"}</span></div>
                    {result.hasMultimodal && (
                      <div className="q-stat mm"><span className="q-stat-label">Delivery</span> <span className="q-stat-val">{result.deliveryScore}/100</span></div>
                    )}
                  </div>

                  {!result.skipped && (
                    <div className="q-answer-block">
                      <h5>{result.isCoding ? "Your Code" : "Your Answer"}</h5>
                      <div className={result.isCoding ? "q-answer-text code" : "q-answer-text"}>{result.userAnswer}</div>
                    </div>
                  )}

                  {result.feedback.length > 0 && (
                    <div className="coach-note">
                      <span className="coach-note-label">Coach's Take</span>
                      <ul>{result.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    </div>
                  )}

                  {result.hasMultimodal && (result.nonverbalNotes || result.vocalNotes) && (
                    <div className="q-mm-block">
                      <h5>Delivery Analysis</h5>
                      <div className="q-mm-grid">
                        {result.nonverbalNotes && (
                          <div className="q-mm-item">
                            <span className="q-mm-label">Body Language</span>
                            <p>{result.nonverbalNotes}</p>
                            {result.videoMetrics && !result.videoMetrics.error && (
                              <div className="q-mm-metrics">
                                <span>{result.videoMetrics.eyeContactPct}% eye contact</span>
                                <span>Posture {result.videoMetrics.postureScore ?? "—"}/100</span>
                                <span>Smiling {result.videoMetrics.smilePct}%</span>
                              </div>
                            )}
                          </div>
                        )}
                        {result.vocalNotes && (
                          <div className="q-mm-item">
                            <span className="q-mm-label">Vocal Delivery</span>
                            <p>{result.vocalNotes}</p>
                            {result.audioMetrics && !result.audioMetrics.error && (
                              <div className="q-mm-metrics">
                                <span>{result.audioMetrics.wordsPerMinute ?? "—"} wpm</span>
                                <span>{result.audioMetrics.fillerWordRate}% fillers</span>
                                <span>Volume {result.audioMetrics.volumeConsistency}/100</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="q-sections-grid">
                    {result.strengths.length > 0 && (
                      <div className="q-section strengths-detail">
                        <h5>Strengths</h5>
                        <ul>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                    {result.improvements.length > 0 && (
                      <div className="q-section improve-detail">
                        <h5>To Improve</h5>
                        <ul>{result.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                    <div className="q-section expected-detail">
                      <h5>Expected Points</h5>
                      <ul>{result.expectedPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
                <span><span className="legend-dot conf" /> Confidence</span>
                <span><span className="legend-dot score" /> Score</span>
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
                          background: r.timeSpent > 180 ? "#ef4444" : r.timeSpent > 120 ? "#eab308" : "#22c55e"
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
                        background: r.wordCount < 30 ? "#ef4444" : r.wordCount < 48 ? "#eab308" : "#3b82f6"
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

      {activeTab === "delivery" && analysis.hasMultimodal && (
        <div className="tab-content">
          <div className="two-col">
            {analysis.videoAgg && (
              <div className="mm-agg-card">
                <h3>Body Language <span className="mm-agg-sub">avg across {analysis.videoAgg.clipsAnalyzed} clips</span></h3>
                <div className="mm-agg-grid">
                  <div className="mm-agg-stat"><span>Engagement</span><strong>{analysis.videoAgg.engagementScore?.toFixed(0)}/100</strong></div>
                  <div className="mm-agg-stat"><span>Eye Contact</span><strong>{analysis.videoAgg.eyeContactPct?.toFixed(0)}%</strong></div>
                  <div className="mm-agg-stat"><span>Head Stability</span><strong>{analysis.videoAgg.headStability?.toFixed(0)}/100</strong></div>
                  <div className="mm-agg-stat"><span>Posture</span><strong>{analysis.videoAgg.postureScore != null ? `${analysis.videoAgg.postureScore.toFixed(0)}/100` : "—"}</strong></div>
                  <div className="mm-agg-stat"><span>Smiling</span><strong>{analysis.videoAgg.smilePct?.toFixed(0)}%</strong></div>
                  <div className="mm-agg-stat"><span>Blink Rate</span><strong>{analysis.videoAgg.blinkRate?.toFixed(0)}/min</strong></div>
                </div>
              </div>
            )}
            {analysis.audioAgg && (
              <div className="mm-agg-card">
                <h3>Vocal Delivery <span className="mm-agg-sub">avg across {analysis.audioAgg.clipsAnalyzed} clips</span></h3>
                <div className="mm-agg-grid">
                  <div className="mm-agg-stat"><span>Delivery Score</span><strong>{analysis.audioAgg.deliveryScore?.toFixed(0)}/100</strong></div>
                  <div className="mm-agg-stat"><span>Pace</span><strong>{analysis.audioAgg.wordsPerMinute ? `${analysis.audioAgg.wordsPerMinute.toFixed(0)} wpm` : "—"}</strong></div>
                  <div className="mm-agg-stat"><span>Filler Rate</span><strong>{analysis.audioAgg.fillerWordRate?.toFixed(1)}%</strong></div>
                  <div className="mm-agg-stat"><span>Volume Stability</span><strong>{analysis.audioAgg.volumeConsistency?.toFixed(0)}/100</strong></div>
                  <div className="mm-agg-stat"><span>Pitch Variety</span><strong>{analysis.audioAgg.pitchVariety != null ? `${analysis.audioAgg.pitchVariety.toFixed(0)}/100` : "—"}</strong></div>
                  <div className="mm-agg-stat"><span>Pause Ratio</span><strong>{analysis.audioAgg.pauseRatio?.toFixed(0)}%</strong></div>
                </div>
              </div>
            )}
          </div>

          <div className="dist-card">
            <h3>Delivery Score by Question</h3>
            <div className="time-chart">
              {analysis.results.filter(r => r.hasMultimodal).map((r, i) => (
                <div key={i} className="time-row">
                  <span className="time-q-label">Q{i + 1}</span>
                  <div className="time-track">
                    <div className="time-fill" style={{
                      width: `${r.deliveryScore}%`,
                      background: r.deliveryScore >= 70 ? "#22c55e" : r.deliveryScore >= 45 ? "#eab308" : "#ef4444"
                    }} />
                  </div>
                  <span className="time-val">{r.deliveryScore}/100</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="action-section">
        <button className="btn-action secondary" onClick={() => navigate("/dashboard")}>Dashboard</button>
        <button className="btn-action download"  onClick={handleDownloadReport}>Download Report</button>
        <button className="btn-action primary"   onClick={() => { localStorage.removeItem("completedInterview"); navigate("/create-interview"); }}>
          New Interview
        </button>
      </div>
    </div>
  );
}