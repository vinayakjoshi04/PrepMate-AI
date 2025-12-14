// frontend/src/pages/Interview.js
import { useState, useEffect, useRef } from "react";
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
  const answerBoxRef = useRef(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("activeInterview"));
    if (!data) {
      navigate("/create-interview");
      return;
    }
    setInterviewData(data);
    setLoading(false);
  }, [navigate]);

  const currentRoundData = interviewData?.rounds[currentRound];
  const currentQuestion = currentRoundData?.questions[currentQuestionIndex];
  const progress = currentRoundData?.questions 
    ? ((currentQuestionIndex + 1) / currentRoundData.questions.length) * 100 
    : 0;

  const handleSubmitAnswer = () => {
    if (!answer.trim()) {
      alert("Please provide an answer before continuing");
      return;
    }

    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      answer: answer.trim(),
      round: currentRound + 1,
      timestamp: new Date().toISOString()
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setAnswer("");

    // Move to next question
    if (currentQuestionIndex < currentRoundData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Round completed
      completeRound(updatedAnswers);
    }
  };

  const completeRound = (allAnswers) => {
    if (currentRound < interviewData.rounds.length - 1) {
      // Move to next round
      const confirmNext = window.confirm(
        `Round ${currentRound + 1} completed! Ready for ${interviewData.rounds[currentRound + 1].name}?`
      );
      if (confirmNext) {
        setCurrentRound(currentRound + 1);
        setCurrentQuestionIndex(0);
      }
    } else {
      // Interview completed
      const finalData = {
        ...interviewData,
        answers: allAnswers,
        completedAt: new Date().toISOString()
      };
      localStorage.setItem("completedInterview", JSON.stringify(finalData));
      localStorage.removeItem("activeInterview");
      navigate("/results");
    }
  };

  const handleSkipQuestion = () => {
    const confirmSkip = window.confirm("Skip this question? You won't be able to answer it later.");
    if (confirmSkip) {
      // Submit empty answer
      const newAnswer = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        answer: "[Skipped]",
        round: currentRound + 1,
        timestamp: new Date().toISOString()
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);
      setAnswer("");

      // Move to next question
      if (currentQuestionIndex < currentRoundData.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        completeRound(updatedAnswers);
      }
    }
  };

  if (loading || !interviewData || !currentQuestion) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading interview...</p>
      </div>
    );
  }

  return (
    <div className="interview-container">
      {/* Header */}
      <header className="interview-header">
        <div className="interview-info">
          <h2>{currentRoundData.name}</h2>
          <span className="question-counter">
            Question {currentQuestionIndex + 1} of {currentRoundData.questions.length}
          </span>
        </div>
        <div className="round-badges">
          {interviewData.rounds.map((round, idx) => (
            <span 
              key={round.id} 
              className={`round-badge ${idx === currentRound ? 'active' : ''} ${idx < currentRound ? 'completed' : ''}`}
            >
              Round {round.id}
            </span>
          ))}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Question Card */}
      <main className="interview-main">
        <div className="question-card">
          <div className="question-header">
            <span className="difficulty-badge">
              {currentQuestion.difficulty || "Medium"}
            </span>
            <span className="focus-badge">
              {currentQuestion.focusArea || "General"}
            </span>
          </div>
          
          <div className="question-content">
            <h3 className="question-text">
              {currentQuestion.question || "Question not available"}
            </h3>
          </div>
        </div>

        {/* Chat-style Answer Box */}
        <div className="answer-section">
          <label className="answer-label">Your Answer</label>
          <div className="chat-box">
            <textarea
              ref={answerBoxRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here... Be clear and concise."
              className="answer-textarea"
              rows={8}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSubmitAnswer();
                }
              }}
            />
            <div className="char-counter">
              {answer.length} characters
              <span className="hint">Press Ctrl+Enter to submit</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button 
              className="btn-skip"
              onClick={handleSkipQuestion}
            >
              Skip Question
            </button>
            <button 
              className="btn-submit"
              onClick={handleSubmitAnswer}
              disabled={!answer.trim()}
            >
              {currentQuestionIndex === currentRoundData.questions.length - 1
                ? currentRound === interviewData.rounds.length - 1
                  ? "Complete Interview"
                  : "Complete Round"
                : "Next Question"}
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tips Section */}
        <div className="tips-card">
          <h4>💡 Interview Tips</h4>
          <ul>
            <li>Take your time to think before answering</li>
            <li>Use examples from your experience when possible</li>
            <li>Be specific and avoid vague answers</li>
            <li>It's okay to ask for clarification (note it in your answer)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}