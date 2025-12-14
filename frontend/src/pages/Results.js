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

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("completedInterview"));
    if (!data) {
      navigate("/dashboard");
      return;
    }
    
    setInterviewData(data);
    analyzeInterview(data);
  }, [navigate]);

  const analyzeInterview = async (data) => {
    const answers = data.answers || [];
    const analysisResults = [];
    
    // Analyze each answer using your Flask backend
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      setAnalysisProgress(((i + 1) / answers.length) * 100);
      
      try {
        const aiResult = await analyzeAnswer(answer, {
          jobTitle: data.jobTitle,
          experienceLevel: data.experienceLevel
        });
        
        analysisResults.push({
          questionId: answer.questionId,
          question: answer.question,
          userAnswer: answer.answer,
          score: aiResult.score,
          feedback: aiResult.feedback,
          strengths: aiResult.strengths,
          improvements: aiResult.improvements,
          hasExamples: aiResult.hasExamples,
          round: answer.round,
          expectedPoints: generateExpectedPoints(answer.question, answer.round)
        });
      } catch (error) {
        console.error("Error analyzing answer:", error);
        // Fallback to basic analysis
        analysisResults.push(basicAnalysis(answer));
      }
    }

    // Calculate overall statistics
    const totalScore = analysisResults.reduce((sum, item) => sum + item.score, 0);
    const maxScore = analysisResults.length * 10;
    const percentage = ((totalScore / maxScore) * 100).toFixed(1);
    
    // Round-wise performance
    const roundScores = {};
    analysisResults.forEach(item => {
      if (!roundScores[item.round]) {
        roundScores[item.round] = { total: 0, count: 0 };
      }
      roundScores[item.round].total += item.score;
      roundScores[item.round].count += 1;
    });

    setAnalysis({
      results: analysisResults,
      totalScore,
      maxScore,
      percentage,
      roundScores,
      strengths: identifyStrengths(analysisResults),
      improvements: identifyImprovements(analysisResults)
    });
    
    setLoading(false);
  };

  const basicAnalysis = (answer) => {
    // Fallback analysis if backend fails
    const wordCount = answer.answer.split(/\s+/).length;
    const hasExamples = answer.answer.toLowerCase().includes("example") || 
                       answer.answer.toLowerCase().includes("experience") ||
                       answer.answer.toLowerCase().includes("project");
    
    let score = 5;
    let feedback = [];
    
    if (wordCount < 20) {
      score = 3;
      feedback.push("Answer is too brief. Provide more details.");
    } else if (wordCount < 50) {
      score = 5;
      feedback.push("Good attempt, but could be more comprehensive.");
    } else if (wordCount < 100) {
      score = 7;
      feedback.push("Well-structured answer with good detail.");
    } else {
      score = 8;
      feedback.push("Excellent detailed response!");
    }
    
    if (hasExamples) {
      score += 1;
      feedback.push("Good use of examples from experience");
    }

    return {
      questionId: answer.questionId,
      question: answer.question,
      userAnswer: answer.answer,
      score: Math.min(score, 10),
      feedback: feedback,
      strengths: ["Completed the answer"],
      improvements: ["Add more specific examples"],
      hasExamples: hasExamples,
      round: answer.round,
      expectedPoints: generateExpectedPoints(answer.question, answer.round)
    };
  };

  const generateExpectedPoints = (question, round) => {
    if (round <= 2) {
      return [
        "Clear explanation of core concepts",
        "Mention of relevant technologies/frameworks",
        "Practical examples or use cases",
        "Discussion of best practices",
        "Consideration of trade-offs or alternatives"
      ];
    } else {
      return [
        "Specific situation/context from past experience",
        "Clear description of your role and actions",
        "Measurable outcomes or results",
        "Lessons learned or skills demonstrated",
        "Relevance to the target role"
      ];
    }
  };

  const identifyStrengths = (results) => {
    const strengths = [];
    
    const highScorers = results.filter(r => r.score >= 8);
    if (highScorers.length > 0) {
      strengths.push(`Excellent performance on ${highScorers.length} question(s)`);
    }
    
    const withExamples = results.filter(r => r.hasExamples);
    if (withExamples.length > results.length / 2) {
      strengths.push("Good use of real-world examples and experience");
    }
    
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (avgScore >= 7) {
      strengths.push("Consistent quality across answers");
    }
    
    if (strengths.length === 0) {
      strengths.push("Shows willingness to engage with questions");
    }
    
    return strengths;
  };

  const identifyImprovements = (results) => {
    const improvements = [];
    
    const lowScorers = results.filter(r => r.score < 5);
    if (lowScorers.length > 0) {
      improvements.push(`Focus on improving depth and detail in ${lowScorers.length} answer(s)`);
    }
    
    const withoutExamples = results.filter(r => !r.hasExamples);
    if (withoutExamples.length > results.length / 2) {
      improvements.push("Include more concrete examples from your experience");
    }
    
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    if (avgScore < 6) {
      improvements.push("Work on providing more comprehensive answers");
    }
    
    if (improvements.length === 0) {
      improvements.push("Continue practicing to refine your responses");
    }
    
    return improvements;
  };

  const getPerformanceLevel = (percentage) => {
    if (percentage >= 80) return { label: "Excellent", color: "#10b981", emoji: "🎉" };
    if (percentage >= 70) return { label: "Very Good", color: "#3b82f6", emoji: "👏" };
    if (percentage >= 60) return { label: "Good", color: "#8b5cf6", emoji: "👍" };
    if (percentage >= 50) return { label: "Fair", color: "#f59e0b", emoji: "💪" };
    return { label: "Needs Improvement", color: "#ef4444", emoji: "📚" };
  };

  const handleRetakeInterview = () => {
    localStorage.removeItem("completedInterview");
    navigate("/create-interview");
  };

  const handleDownloadReport = () => {
    const report = {
      interviewInfo: {
        jobTitle: interviewData.jobTitle,
        experienceLevel: interviewData.experienceLevel,
        completedAt: interviewData.completedAt
      },
      overallScore: {
        percentage: analysis.percentage,
        totalScore: analysis.totalScore,
        maxScore: analysis.maxScore
      },
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      detailedAnalysis: analysis.results.map(r => ({
        question: r.question,
        answer: r.userAnswer,
        score: r.score,
        feedback: r.feedback
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Analyzing your interview performance with AI...</p>
        <div className="progress-indicator">
          <div className="progress-bar-loading" style={{ width: `${analysisProgress}%` }}></div>
        </div>
        <p className="progress-text">{Math.round(analysisProgress)}% complete</p>
      </div>
    );
  }

  const performance = getPerformanceLevel(analysis.percentage);

  return (
    <div className="results-container">
      {/* Header */}
      <header className="results-header">
        <div className="header-content">
          <h1>🎯 AI-Powered Interview Results</h1>
          <p>{interviewData.jobTitle} - {interviewData.experienceLevel}</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </header>

      {/* Overall Score Card */}
      <section className="score-card">
        <div className="score-circle" style={{ borderColor: performance.color }}>
          <div className="score-value" style={{ color: performance.color }}>
            {analysis.percentage}%
          </div>
          <div className="score-label">{performance.label}</div>
          <div className="score-emoji">{performance.emoji}</div>
        </div>
        
        <div className="score-details">
          <div className="score-stat">
            <span className="stat-label">Total Score</span>
            <span className="stat-value">{analysis.totalScore}/{analysis.maxScore}</span>
          </div>
          <div className="score-stat">
            <span className="stat-label">Questions Answered</span>
            <span className="stat-value">{analysis.results.length}</span>
          </div>
          <div className="score-stat">
            <span className="stat-label">Completed At</span>
            <span className="stat-value">
              {new Date(interviewData.completedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* Round-wise Performance */}
      <section className="round-performance">
        <h2>Round-wise Performance</h2>
        <div className="round-cards">
          {Object.entries(analysis.roundScores).map(([round, data]) => {
            const roundPercentage = ((data.total / (data.count * 10)) * 100).toFixed(1);
            const roundNames = {
              1: "Technical Round 1",
              2: "Technical Round 2",
              3: "HR Round"
            };
            return (
              <div key={round} className="round-performance-card">
                <h3>{roundNames[round]}</h3>
                <div className="round-score">{roundPercentage}%</div>
                <div className="round-details">
                  {data.total}/{data.count * 10} points
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${roundPercentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Strengths and Improvements */}
      <section className="feedback-section">
        <div className="feedback-card strengths">
          <h2>💪 Your Strengths</h2>
          <ul>
            {analysis.strengths.map((strength, i) => (
              <li key={i}>{strength}</li>
            ))}
          </ul>
        </div>
        
        <div className="feedback-card improvements">
          <h2>📈 Areas for Improvement</h2>
          <ul>
            {analysis.improvements.map((improvement, i) => (
              <li key={i}>{improvement}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Detailed Question Analysis */}
      <section className="detailed-analysis">
        <h2>AI-Powered Detailed Analysis</h2>
        {analysis.results.map((result, index) => (
          <div key={result.questionId} className="question-analysis-card">
            <div className="question-header">
              <div className="question-number">Question {index + 1}</div>
              <div className="question-score">
                <span className="score-number">{result.score}/10</span>
                <span className={`score-badge ${result.score >= 8 ? 'excellent' : result.score >= 6 ? 'good' : 'needs-work'}`}>
                  {result.score >= 8 ? 'Excellent' : result.score >= 6 ? 'Good' : 'Needs Work'}
                </span>
              </div>
            </div>
            
            <div className="question-content">
              <h3>{result.question}</h3>
              
              <div className="answer-section">
                <h4>Your Answer:</h4>
                <div className="user-answer">{result.userAnswer}</div>
                <div className="answer-stats">
                  <span>📝 {result.userAnswer.split(/\s+/).length} words</span>
                  <span>🎯 Round {result.round}</span>
                  {result.hasExamples && <span className="has-examples">✅ Includes Examples</span>}
                </div>
              </div>
              
              <div className="ai-feedback-section">
                <h4>🤖 AI Feedback:</h4>
                <ul className="feedback-list">
                  {result.feedback.map((fb, i) => (
                    <li key={i}>{fb}</li>
                  ))}
                </ul>
              </div>

              {result.strengths && result.strengths.length > 0 && (
                <div className="strengths-section">
                  <h4>✅ Strengths Identified:</h4>
                  <ul className="strengths-list">
                    {result.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.improvements && result.improvements.length > 0 && (
                <div className="improvements-section">
                  <h4>💡 Suggestions for Improvement:</h4>
                  <ul className="improvements-list">
                    {result.improvements.map((improvement, i) => (
                      <li key={i}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="expected-section">
                <h4>Expected Key Points:</h4>
                <ul className="expected-list">
                  {result.expectedPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Action Buttons */}
      <section className="action-section">
        <button className="btn-download" onClick={handleDownloadReport}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Report
        </button>
        
        <button className="btn-primary" onClick={handleRetakeInterview}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Start New Interview
        </button>
      </section>
    </div>
  );
}