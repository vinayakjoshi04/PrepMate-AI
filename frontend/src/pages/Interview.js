// frontend/src/pages/Interview.js
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeInterviewBatch } from "../services/interviewApi";
import { mediaStore } from "../utils/mediaStore";
import { supabase } from "../supabaseClient";
import "./interview.css";

const CODING_KEYWORDS = [
  "algorithm", "data structure", "implement", "write a function", "write code",
  "time complexity", "space complexity", "leetcode", "sorting algorithm",
  "recursion", "linked list", "binary tree", "big o", "write a program", "code the",
];
const detectCoding = (q) => {
  const text = `${q?.question || ""} ${q?.focusArea || ""}`.toLowerCase();
  return CODING_KEYWORDS.some((k) => text.includes(k));
};

const CODE_LANGS = ["javascript", "python", "java", "c++", "typescript", "go"];

export default function Interview() {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confidence, setConfidence] = useState(3);
  const [showHint, setShowHint] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [nextRoundData, setNextRoundData] = useState(null);

  const timerRef = useRef(null);
  const questionTimerRef = useRef(null);

  const [mediaStatus, setMediaStatus] = useState("idle");
  const [mediaError, setMediaError] = useState("");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const MIN_RECORD_SECONDS = 3;

  const liveVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const [codingOverride, setCodingOverride] = useState({});
  const [code, setCode] = useState("");
  const [codeLang, setCodeLang] = useState("javascript");
  const codeBoxRef = useRef(null);

  const [finalizing, setFinalizing] = useState(false);

  // Logged-in Supabase user id (or null if not logged in / not using auth here)
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("activeInterview"));
    if (!data) {
      navigate("/create-interview");
      return;
    }
    if (!data.sessionId) {
      data.sessionId = crypto.randomUUID();
    }
    mediaStore.clear();
    setInterviewData(data);
    setLoading(false);

    // Fetch the current logged-in user (if any) so recordings can be tied to their account
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        setUserId(user?.id || null);
      })
      .catch((err) => {
        console.warn("Could not fetch Supabase user:", err);
        setUserId(null);
      });
  }, [navigate]);

  useEffect(() => {
    if (loading || !interviewData) return;

    let cancelled = false;
    setMediaStatus("requesting");

    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
        setMediaStatus("ready");
      })
      .catch((err) => {
        console.error("Camera/mic error:", err);
        setMediaError(
          "Couldn't access your camera/microphone. Spoken questions need it — coding questions still work without it."
        );
        setMediaStatus("error");
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, interviewData]);

  useEffect(() => {
    if (streamRef.current && liveVideoRef.current && !liveVideoRef.current.srcObject) {
      liveVideoRef.current.srcObject = streamRef.current;
    }
  }, [mediaStatus, currentQuestionIndex, currentRound]);

  useEffect(() => {
    if (mediaStatus !== "error" && streamRef.current) {
      setMediaStatus("ready");
      setRecordSeconds(0);
    }
    setCode("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, currentRound]);

  useEffect(() => {
    if (loading || !interviewData) return;
    setTimeSpent(0);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    questionTimerRef.current = setInterval(() => setTimeSpent((p) => p + 1), 1000);
    return () => clearInterval(questionTimerRef.current);
  }, [currentQuestionIndex, currentRound, loading, interviewData]);

  useEffect(() => {
    if (loading) return;
    timerRef.current = setInterval(() => setTotalTime((p) => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentRoundData = interviewData?.rounds[currentRound];
  const currentQuestion = currentRoundData?.questions[currentQuestionIndex];
  const isCoding = currentQuestion
    ? (codingOverride[currentQuestion.id] ?? detectCoding(currentQuestion))
    : false;

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

  const getHint = () => {
    const q = currentQuestion?.question?.toLowerCase() || "";
    if (q.includes("tell me about yourself") || q.includes("introduce yourself"))
      return "Structure: Present role → Key experience → Why this role. Keep it under 2 minutes.";
    if (q.includes("weakness") || q.includes("challenge"))
      return "Use the STAR method: Situation → Task → Action → Result.";
    if (q.includes("why") && q.includes("compan"))
      return "Research the company values and connect them to your personal goals.";
    if (q.includes("conflict") || q.includes("disagree"))
      return "Focus on how you resolved it professionally.";
    if (isCoding)
      return "Clarify requirements first, state your approach, then code. Mention time/space complexity when you finish.";
    if (q.includes("leadership") || q.includes("manage") || q.includes("team"))
      return "Give a concrete example: team size, challenge, your action, measurable outcome.";
    return currentRound < 2
      ? "Be specific — mention technologies, patterns, or metrics."
      : "Use a real story from your experience. Quantify results.";
  };

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    try {
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setMediaError("Recording hit an error — please try again.");
        setMediaStatus("ready");
      };
      recorder.start();
      recorderRef.current = recorder;
      setMediaStatus("recording");
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds((p) => p + 1), 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setMediaError("Recording failed to start. Please try again.");
    }
  }, []);

  const stopRecordingAndGetBlob = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      clearInterval(recordTimerRef.current);
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: "video/webm" })
          : null;
        resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  const cancelRecording = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      await stopRecordingAndGetBlob();
    }
    setMediaStatus("ready");
    setRecordSeconds(0);
  }, [stopRecordingAndGetBlob]);

  const advanceQuestion = useCallback((updatedAnswers) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      if (currentQuestionIndex < currentRoundData.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        completeRound(updatedAnswers);
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, currentRoundData]);

  const handleStopAndSubmit = useCallback(async () => {
    if (recordSeconds < MIN_RECORD_SECONDS) return;

    clearInterval(questionTimerRef.current);
    setMediaStatus("processing");
    const blob = await stopRecordingAndGetBlob();

    if (!blob || blob.size < 2000) {
      setMediaError("Recording was too short or empty — please try again.");
      setMediaStatus("ready");
      setRecordSeconds(0);
      console.warn("⚠️ DEBUG: Blob rejected — blob:", blob, "size:", blob?.size);
      return;
    }

    mediaStore.set(currentQuestion.id, blob);
    console.log(
      "✅ DEBUG: Stored clip for questionId:", currentQuestion.id,
      "(type:", typeof currentQuestion.id, ") size:", blob.size,
      "bytes, mimeType:", blob.type
    );

    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: "(Recorded — pending analysis)",
      round: currentRound + 1,
      roundName: currentRoundData.name,
      confidence,
      timeSpent,
      wordCount: 0,
      isCoding: false,
      timestamp: new Date().toISOString(),
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setConfidence(3);
    setShowHint(false);
    setRecordSeconds(0);
    setMediaStatus("ready");
    advanceQuestion(updatedAnswers);
  }, [
    recordSeconds, currentQuestion, currentRound, currentRoundData, confidence,
    timeSpent, answers, stopRecordingAndGetBlob, advanceQuestion,
  ]);

  const handleCodeKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart, end = el.selectionEnd;
      const newVal = code.slice(0, start) + "  " + code.slice(end);
      setCode(newVal);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
      return;
    }
    if (e.key === "Enter") {
      const el = e.target;
      const cursor = el.selectionStart;
      const lineStart = code.lastIndexOf("\n", cursor - 1) + 1;
      const currentLine = code.slice(lineStart, cursor);
      const indentMatch = currentLine.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : "";
      const extra = /[{([:]\s*$/.test(currentLine) ? "  " : "";
      if (indent || extra) {
        e.preventDefault();
        const insert = "\n" + indent + extra;
        const newVal = code.slice(0, cursor) + insert + code.slice(cursor);
        setCode(newVal);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = cursor + insert.length;
        });
      }
    }
  };

  const handleSubmitCode = useCallback(() => {
    if (!code.trim()) {
      codeBoxRef.current?.focus();
      codeBoxRef.current?.classList.add("shake");
      setTimeout(() => codeBoxRef.current?.classList.remove("shake"), 500);
      return;
    }
    clearInterval(questionTimerRef.current);

    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: `[Language: ${codeLang}]\n${code.trim()}`,
      round: currentRound + 1,
      roundName: currentRoundData.name,
      confidence,
      timeSpent,
      wordCount: code.trim().split(/\s+/).filter(Boolean).length,
      isCoding: true,
      timestamp: new Date().toISOString(),
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setCode("");
    setConfidence(3);
    setShowHint(false);
    advanceQuestion(updatedAnswers);
  }, [code, codeLang, currentQuestion, currentRound, currentRoundData, confidence, timeSpent, answers, advanceQuestion]);

  const completeRound = (allAnswers) => {
    if (currentRound < interviewData.rounds.length - 1) {
      setNextRoundData(interviewData.rounds[currentRound + 1]);
      setShowRoundModal(true);
      window._pendingAnswers = allAnswers;
    } else {
      finishInterview(allAnswers);
    }
  };

  const handleProceedNextRound = () => {
    setShowRoundModal(false);
    setCurrentRound((prev) => prev + 1);
    setCurrentQuestionIndex(0);
    setNextRoundData(null);
  };

  // ── ONE consolidated analysis call for the whole interview ─────────────
  const finishInterview = async (allAnswers) => {
    setFinalizing(true);

    const items = allAnswers.map((a) => ({
      questionId: a.questionId,
      question: a.question,
      answerText: a.isCoding ? a.answer : "",
      round: a.round,
      skipped: !!a.skipped,
      isCoding: !!a.isCoding,
    }));

    console.log("🔍 DEBUG allAnswers:", allAnswers);
    console.log("🔍 DEBUG items sent to batch:", items);
    console.log("🔍 DEBUG mediaStore has clips for questionIds:", [...mediaStore.all().keys()]);

    let mergedAnswers = allAnswers;
    let analysisWarning = false;
    let executiveSummary = null;

    try {
      const { results, executiveSummary: summary } = await analyzeInterviewBatch(
        items,
        mediaStore.all(),
        interviewData.jobTitle,
        interviewData.experienceLevel,
        interviewData.sessionId,
        userId
      );
      console.log("🔍 DEBUG results from analyzeInterviewBatch:", results);

      if (results) {
        const byId = new Map(results.filter(Boolean).map((r) => [String(r.questionId), r]));
        mergedAnswers = allAnswers.map((a) => {
          const r = byId.get(String(a.questionId));
          if (!r) return a;
          return {
            ...a,
            answer: a.isCoding || a.skipped ? a.answer : (r.answerText || a.answer),
            report: r,
          };
        });
        executiveSummary = summary;
      } else {
        analysisWarning = true;
      }
    } catch (err) {
      console.error("Final analysis error:", err);
      analysisWarning = true;
    }

    mediaStore.clear();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (analysisWarning) {
      localStorage.setItem("interviewAnalysisWarning", "1");
    }

    const finalData = {
      ...interviewData,
      answers: mergedAnswers,
      executiveSummary,
      totalTime,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem("completedInterview", JSON.stringify(finalData));
    localStorage.removeItem("activeInterview");
    setFinalizing(false);
    navigate("/results");
  };

  const handleSkipQuestion = async () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      await cancelRecording();
    }
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
      isCoding,
      timestamp: new Date().toISOString(),
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setConfidence(3);
    setShowHint(false);
    advanceQuestion(updatedAnswers);
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setShowHint(false);
      if (e.ctrlKey && e.key === "h") { e.preventDefault(); setShowHint((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading || !interviewData || !currentQuestion) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading interview...</p>
      </div>
    );
  }

  const difficultyColors = { Easy: "#22c55e", Medium: "#eab308", Hard: "#ef4444", Expert: "#8b5cf6" };
  const diffColor = difficultyColors[currentQuestion.difficulty] || "#eab308";

  return (
    <div className={`interview-container ${isTransitioning ? "transitioning" : ""}`}>

      {finalizing && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">🧠</div>
            <h2>Analyzing your full interview…</h2>
            <p>Scoring content, delivery, and body language across all your answers — this runs once, at the end.</p>
          </div>
        </div>
      )}

      {mediaStatus === "error" && !isCoding && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-icon">📵</div>
            <h2>Camera/mic needed for this question</h2>
            <p>{mediaError}</p>
            <button className="btn-modal-primary" onClick={() => window.location.reload()}>
              Reload & Try Again
            </button>
          </div>
        </div>
      )}

      <header className="interview-header">
        <div className="interview-info">
          <div className="round-title-row">
            <span className="round-tag">{currentRoundData.type?.toUpperCase() || "ROUND"}</span>
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
          </div>
          <span className="overall-progress-pct">{Math.round(overallProgress)}%</span>
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

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="interview-layout">
        <main className={`interview-main ${isTransitioning ? "fade-out" : "fade-in"}`}>

          <div className="question-card">
            <div className="question-header">
              <div className="question-badges">
                <span className="difficulty-badge" style={{ background: diffColor + "1a", color: diffColor, border: `1px solid ${diffColor}44` }}>
                  {currentQuestion.difficulty || "Medium"}
                </span>
                <span className="focus-badge">{currentQuestion.focusArea || "General"}</span>
                {isCoding && <span className="coding-badge">Coding</span>}
              </div>
              <div className="question-meta-right">
                <button
                  className={`code-toggle ${isCoding ? "active" : ""}`}
                  onClick={() => setCodingOverride((p) => ({ ...p, [currentQuestion.id]: !isCoding }))}
                  title="Switch between spoken/video mode and code-editor mode"
                >
                  {isCoding ? "Switch to Spoken" : "Switch to Coding"}
                </button>
                <button
                  className={`hint-toggle ${showHint ? "active" : ""}`}
                  onClick={() => setShowHint((v) => !v)}
                  title="Toggle hint (Ctrl+H)"
                >
                  Hint {showHint ? "▲" : "▼"}
                </button>
              </div>
            </div>

            <div className="question-content">
              <h3 className="question-text">{currentQuestion.question || "Question not available"}</h3>
            </div>

            {showHint && (
              <div className="hint-box">
                <span className="hint-label">Hint</span>
                <p>{getHint()}</p>
              </div>
            )}
          </div>

          {/* ── Workspace: camera + (optionally) code editor side by side ── */}
          <div className={`workspace-grid ${isCoding ? "split-mode" : ""}`}>

            <div className={`camera-stage ${isCoding ? "compact" : ""}`}>
              <div className={`camera-frame status-${mediaStatus}`}>
                <video ref={liveVideoRef} autoPlay muted playsInline className="camera-video mirrored" />
                {mediaStatus === "recording" && (
                  <div className="rec-overlay">
                    <span className="rec-indicator"><span className="rec-dot" /> REC {formatTime(recordSeconds)}</span>
                  </div>
                )}
                {mediaStatus === "requesting" && <div className="camera-overlay-msg">Connecting to camera…</div>}
                {mediaStatus === "processing" && <div className="camera-overlay-msg">Finalizing clip…</div>}
                {isCoding && mediaStatus === "ready" && (
                  <div className="camera-corner-label">Talk through your approach on camera</div>
                )}
              </div>

              {!isCoding && (
                <>
                  <div className="camera-controls">
                    {mediaStatus === "ready" && (
                      <button className="btn-record" onClick={startRecording}>Start Recording</button>
                    )}
                    {mediaStatus === "recording" && (
                      <>
                        <button
                          className="btn-stop-submit"
                          onClick={handleStopAndSubmit}
                          disabled={recordSeconds < MIN_RECORD_SECONDS}
                        >
                          {recordSeconds < MIN_RECORD_SECONDS
                            ? `Keep speaking… (${MIN_RECORD_SECONDS - recordSeconds}s)`
                            : "Stop & Save Answer"}
                        </button>
                        <button className="btn-cancel-rec" onClick={cancelRecording}>Cancel & Re-record</button>
                      </>
                    )}
                    {mediaStatus === "processing" && (
                      <button className="btn-record" disabled>Working…</button>
                    )}
                  </div>

                  <p className="camera-hint">
                    {mediaStatus === "ready" && "Speak your answer out loud. Analysis runs once, after you finish all questions — so no waiting between answers."}
                    {mediaStatus === "recording" && "Face the camera, speak clearly — we're tracking eye contact, posture, pace, and filler words."}
                    {mediaStatus === "processing" && "Wrapping up the recording…"}
                  </p>

                  <div className="action-buttons">
                    <button className="btn-skip" onClick={handleSkipQuestion} disabled={mediaStatus === "processing"}>
                      Skip
                    </button>
                  </div>
                </>
              )}

              {isCoding && (
                <p className="camera-hint compact-hint">
                  Camera stays on for observation only — no recording is required for coding questions.
                </p>
              )}
            </div>

            {isCoding && (
              <div className="code-editor-card">
                <div className="code-editor-header">
                  <div className="code-editor-header-left">
                    <span>Solution</span>
                    <select
                      className="code-lang-select"
                      value={codeLang}
                      onChange={(e) => setCodeLang(e.target.value)}
                    >
                      {CODE_LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <span className="code-line-count">
                    {code.split("\n").length} lines · {code.length} chars
                  </span>
                </div>

                <div className="code-editor-body">
                  <div className="code-line-numbers" aria-hidden="true">
                    {code.split("\n").map((_, i) => (
                      <div key={i} className="code-line-num">{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={codeBoxRef}
                    className="code-editor-textarea"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleCodeKeyDown}
                    placeholder={`// ${codeLang} — write your solution here.\n// Explain your approach in comments; content scoring reads them.\n\nfunction solve() {\n  \n}`}
                    spellCheck={false}
                    rows={16}
                  />
                </div>

                <div className="code-editor-actions">
                  <button className="btn-skip" onClick={handleSkipQuestion}>Skip</button>
                  <button className="btn-submit-code" onClick={handleSubmitCode} disabled={!code.trim()}>
                    Submit Code →
                  </button>
                </div>
              </div>
            )}
          </div>

        </main>
      </div>

      {showRoundModal && nextRoundData && (
        <div className="modal-overlay" onClick={() => {}}>
          <div className="modal-card">
            <div className="modal-icon">✓</div>
            <h2>Round {currentRound + 1} complete</h2>
            <p>Nice work finishing <strong>{currentRoundData.name}</strong>.</p>
            <div className="modal-next-info">
              <span className="modal-next-label">Next up</span>
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