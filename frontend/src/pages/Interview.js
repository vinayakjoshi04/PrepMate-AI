// frontend/src/pages/Interview.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./interview.css";

export default function Interview() {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confidence, setConfidence] = useState(3); // 1-5 scale
  const [showHint, setShowHint] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0); // seconds on current question
  const [totalTime, setTotalTime] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [nextRoundData, setNextRoundData] = useState(null);
  const [answerHistory, setAnswerHistory] = useState([]); // for undo
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const answerBoxRef = useRef(null);
  const timerRef = useRef(null);
  const questionTimerRef = useRef(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("activeInterview"));
    if (!data) {
      navigate("/create-interview");
      return;
    }
    setInterviewData(data);
    setLoading(false);
  }, [navigate]);

  // Per-question timer
  useEffect(() => {
    if (loading || !interviewData) return;
    setTimeSpent(0);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    questionTimerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(questionTimerRef.current);
  }, [currentQuestionIndex, currentRound, loading, interviewData]);

  // Total interview timer
  useEffect(() => {
    if (loading) return;
    timerRef.current = setInterval(() => {
      setTotalTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentRoundData = interviewData?.rounds[currentRound];
  const currentQuestion = currentRoundData?.questions[currentQuestionIndex];
  const progress = currentRoundData?.questions
    ? ((currentQuestionIndex + 1) / currentRoundData.questions.length) * 100
    : 0;
  const overallProgress = interviewData
    ? (() => {
        let totalQ = 0, doneQ = 0;
        interviewData.rounds.forEach((r, i) => {
          totalQ += r.questions.length;
          if (i < currentRound) doneQ += r.questions.length;
          else if (i === currentRound) doneQ += currentQuestionIndex;
        });
        return (doneQ / totalQ) * 100;
      })()
    : 0;

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const targetWordCount = currentQuestion?.targetWords || 80;
  const wordCountStatus =
    wordCount < 20 ? "too-short" :
    wordCount < targetWordCount * 0.6 ? "below-target" :
    wordCount <= targetWordCount * 1.5 ? "on-target" : "above-target";

  const getHint = () => {
    const q = currentQuestion?.question?.toLowerCase() || "";
    if (q.includes("tell me about yourself") || q.includes("introduce yourself"))
      return "Structure: Present role → Key experience → Why this role. Keep it under 2 minutes.";
    if (q.includes("weakness") || q.includes("challenge"))
      return "Use the STAR method: Situation → Task → Action → Result. Turn a real weakness into a growth story.";
    if (q.includes("why") && q.includes("compan"))
      return "Research the company values, recent news, and team culture. Connect them to your personal goals.";
    if (q.includes("conflict") || q.includes("disagree"))
      return "Focus on how you resolved it professionally. Emphasize listening and finding common ground.";
    if (q.includes("design") || q.includes("architect") || q.includes("system"))
      return "Start with requirements clarification → high-level design → drill into components → discuss trade-offs.";
    if (q.includes("algorithm") || q.includes("complexity") || q.includes("time complex"))
      return "State your approach first, analyze time/space complexity, then discuss optimizations.";
    if (q.includes("leadership") || q.includes("manage") || q.includes("team"))
      return "Give a concrete example: team size, challenge faced, your approach, and measurable outcome.";
    return currentRound < 2
      ? "Be specific — mention technologies, patterns, or metrics. Avoid vague answers."
      : "Use a real story from your experience. Quantify results wherever possible.";
  };

  const handleSubmitAnswer = useCallback(() => {
    if (!answer.trim()) {
      answerBoxRef.current?.focus();
      answerBoxRef.current?.classList.add("shake");
      setTimeout(() => answerBoxRef.current?.classList.remove("shake"), 500);
      return;
    }

    clearInterval(questionTimerRef.current);

    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: answer.trim(),
      round: currentRound + 1,
      roundName: currentRoundData.name,
      confidence,
      timeSpent,
      wordCount,
      timestamp: new Date().toISOString(),
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setAnswerHistory(prev => [...prev, answer]);
    setAnswer("");
    setConfidence(3);
    setShowHint(false);
    setIsTransitioning(true);

    setTimeout(() => {
      setIsTransitioning(false);
      if (currentQuestionIndex < currentRoundData.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        completeRound(updatedAnswers);
      }
    }, 300);
  }, [answer, currentQuestion, currentRound, currentRoundData, confidence, timeSpent, wordCount, answers, currentQuestionIndex]);

  const completeRound = (allAnswers) => {
    if (currentRound < interviewData.rounds.length - 1) {
      setNextRoundData(interviewData.rounds[currentRound + 1]);
      setShowRoundModal(true);
      // Store answers for after modal
      window._pendingAnswers = allAnswers;
    } else {
      finishInterview(allAnswers);
    }
  };

  const handleProceedNextRound = () => {
    setShowRoundModal(false);
    setCurrentRound(prev => prev + 1);
    setCurrentQuestionIndex(0);
    setNextRoundData(null);
  };

  const finishInterview = (allAnswers) => {
    const finalData = {
      ...interviewData,
      answers: allAnswers,
      totalTime,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem("completedInterview", JSON.stringify(finalData));
    localStorage.removeItem("activeInterview");
    navigate("/results");
  };

  const handleSkipQuestion = () => {
    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: "[Skipped]",
      round: currentRound + 1,
      roundName: currentRoundData.name,
      confidence: 0,
      timeSpent,
      wordCount: 0,
      skipped: true,
      timestamp: new Date().toISOString(),
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setAnswer("");
    setConfidence(3);
    setShowHint(false);
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      if (currentQuestionIndex < currentRoundData.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        completeRound(updatedAnswers);
      }
    }, 300);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === "Enter") handleSubmitAnswer();
      if (e.key === "Escape") setShowHint(false);
      if (e.ctrlKey && e.key === "h") { e.preventDefault(); setShowHint(v => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmitAnswer]);

  if (loading || !interviewData || !currentQuestion) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading interview...</p>
      </div>
    );
  }

  const difficultyColors = {
    Easy: "#10b981", Medium: "#f59e0b", Hard: "#ef4444", Expert: "#8b5cf6"
  };
  const diffColor = difficultyColors[currentQuestion.difficulty] || "#f59e0b";

  return (
    <div className={`interview-container ${isTransitioning ? "transitioning" : ""}`}>

      {/* Top Bar */}
      <header className="interview-header">
        <div className="interview-info">
          <div className="round-title-row">
            <span className="round-icon">{currentRound === 0 ? "⚙️" : currentRound === 1 ? "🧩" : "🤝"}</span>
            <h2>{currentRoundData.name}</h2>
          </div>
          <span className="question-counter">
            Question {currentQuestionIndex + 1} of {currentRoundData.questions.length}
          </span>
        </div>

        <div className="header-center">
          <div className="overall-progress-label">Overall Progress</div>
          <div className="overall-progress-track">
            <div className="overall-progress-fill" style={{ width: `${overallProgress}%` }} />
            <span className="overall-progress-pct">{Math.round(overallProgress)}%</span>
          </div>
        </div>

        <div className="header-right">
          <div className="timer-display">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2"/></svg>
            <span className={timeSpent > 180 ? "timer-warn" : ""}>{formatTime(timeSpent)}</span>
          </div>
          <div className="total-timer">Total: {formatTime(totalTime)}</div>
          <div className="round-badges">
            {interviewData.rounds.map((round, idx) => (
              <span
                key={round.id}
                className={`round-badge ${idx === currentRound ? "active" : ""} ${idx < currentRound ? "completed" : ""}`}
                title={round.name}
              >
                {idx < currentRound ? "✓" : `R${idx + 1}`}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Round Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="interview-layout">
        {/* Sidebar */}
        <aside className="interview-sidebar">
          <div className="sidebar-section">
            <h4>Round Questions</h4>
            <div className="sidebar-questions">
              {currentRoundData.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`sidebar-q-item ${
                    idx === currentQuestionIndex ? "current" :
                    idx < currentQuestionIndex ? "answered" : "pending"
                  }`}
                >
                  <span className="sidebar-q-num">{idx + 1}</span>
                  <span className="sidebar-q-preview">{q.question.slice(0, 45)}…</span>
                  {idx < currentQuestionIndex && <span className="sidebar-check">✓</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h4>All Rounds</h4>
            {interviewData.rounds.map((r, idx) => (
              <div key={r.id} className={`sidebar-round ${idx === currentRound ? "active" : idx < currentRound ? "done" : ""}`}>
                <span>{r.name}</span>
                <span className="sidebar-round-count">{r.questions.length}Q</span>
              </div>
            ))}
          </div>

          <div className="sidebar-section tips-mini">
            <h4>⌨️ Shortcuts</h4>
            <div className="shortcut-row"><kbd>Ctrl+Enter</kbd> Submit</div>
            <div className="shortcut-row"><kbd>Ctrl+H</kbd> Toggle hint</div>
            <div className="shortcut-row"><kbd>Esc</kbd> Close hint</div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`interview-main ${isTransitioning ? "fade-out" : "fade-in"}`}>

          {/* Question Card */}
          <div className="question-card">
            <div className="question-header">
              <div className="question-badges">
                <span className="difficulty-badge" style={{ background: diffColor + "22", color: diffColor, border: `1px solid ${diffColor}55` }}>
                  {currentQuestion.difficulty || "Medium"}
                </span>
                <span className="focus-badge">{currentQuestion.focusArea || "General"}</span>
                {currentQuestion.type && (
                  <span className="type-badge">{currentQuestion.type}</span>
                )}
              </div>
              <div className="question-meta-right">
                <span className="target-time">🎯 ~{currentQuestion.targetMinutes || 3} min</span>
                <button
                  className={`hint-toggle ${showHint ? "active" : ""}`}
                  onClick={() => setShowHint(v => !v)}
                  title="Toggle hint (Ctrl+H)"
                >
                  💡 {showHint ? "Hide Hint" : "Show Hint"}
                </button>
              </div>
            </div>

            <div className="question-content">
              <h3 className="question-text">{currentQuestion.question || "Question not available"}</h3>
            </div>

            {showHint && (
              <div className="hint-box">
                <span className="hint-label">💡 Hint</span>
                <p>{getHint()}</p>
              </div>
            )}

            {currentQuestion.followUp && (
              <div className="follow-up-box">
                <span className="follow-up-label">🔄 Possible Follow-up</span>
                <p>{currentQuestion.followUp}</p>
              </div>
            )}
          </div>

          {/* Answer Section */}
          <div className="answer-section">
            <div className="answer-header">
              <label className="answer-label">Your Answer</label>
              <div className="word-count-indicator">
                <div className={`word-pill ${wordCountStatus}`}>
                  {wordCount} words
                  {wordCountStatus === "too-short" && " — too brief"}
                  {wordCountStatus === "below-target" && ` — target ~${targetWordCount}`}
                  {wordCountStatus === "on-target" && " — great length ✓"}
                  {wordCountStatus === "above-target" && " — consider trimming"}
                </div>
              </div>
            </div>

            <div className="chat-box">
              <textarea
                ref={answerBoxRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={`Type your answer here...\n\nTip: Use the STAR method for behavioral questions (Situation → Task → Action → Result)`}
                className="answer-textarea"
                rows={9}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) handleSubmitAnswer();
                }}
              />

              {/* Word count bar */}
              <div className="word-count-bar-track">
                <div
                  className={`word-count-bar-fill ${wordCountStatus}`}
                  style={{ width: `${Math.min((wordCount / (targetWordCount * 1.5)) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Confidence Rating */}
            <div className="confidence-section">
              <label className="confidence-label">Confidence Level</label>
              <div className="confidence-buttons">
                {[
                  { val: 1, label: "😰", text: "Not Sure" },
                  { val: 2, label: "😕", text: "Unsure" },
                  { val: 3, label: "😐", text: "Okay" },
                  { val: 4, label: "😊", text: "Confident" },
                  { val: 5, label: "🚀", text: "Very Confident" },
                ].map(({ val, label, text }) => (
                  <button
                    key={val}
                    className={`confidence-btn ${confidence === val ? "selected" : ""}`}
                    onClick={() => setConfidence(val)}
                    title={text}
                  >
                    <span className="conf-emoji">{label}</span>
                    <span className="conf-text">{text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="btn-skip" onClick={handleSkipQuestion}>
                Skip
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitAnswer}
                disabled={!answer.trim()}
              >
                {currentQuestionIndex === currentRoundData.questions.length - 1
                  ? currentRound === interviewData.rounds.length - 1
                    ? "🏁 Finish Interview"
                    : "Complete Round →"
                  : "Next Question →"}
              </button>
            </div>

            <div className="submit-hint">Press <kbd>Ctrl+Enter</kbd> to submit quickly</div>
          </div>

          {/* Tips Card */}
          <div className="tips-card">
            <h4>💡 Interview Tips</h4>
            <ul>
              <li>Use the <strong>STAR method</strong> for behavioral questions (Situation, Task, Action, Result)</li>
              <li>Quantify your impact when possible — numbers make answers memorable</li>
              <li>It's fine to say "Let me think for a moment" before answering</li>
              <li>Aim for {targetWordCount}–{Math.round(targetWordCount * 1.3)} words for thorough yet concise answers</li>
            </ul>
          </div>

        </main>
      </div>

      {/* Round Completion Modal */}
      {showRoundModal && nextRoundData && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-card">
            <div className="modal-icon">🎉</div>
            <h2>Round {currentRound + 1} Complete!</h2>
            <p>Great work finishing <strong>{currentRoundData.name}</strong>.</p>
            <div className="modal-next-info">
              <span className="modal-next-label">Next up:</span>
              <span className="modal-next-name">{nextRoundData.name}</span>
              <span className="modal-next-count">{nextRoundData.questions.length} questions</span>
            </div>
            <div className="modal-actions">
              <button className="btn-modal-secondary" onClick={() => finishInterview(window._pendingAnswers)}>
                End Interview
              </button>
              <button className="btn-modal-primary" onClick={handleProceedNextRound}>
                Start Next Round →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}