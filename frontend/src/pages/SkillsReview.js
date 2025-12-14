// frontend/src/pages/SkillsReview.js
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./skillsReview.css";

export default function SkillsReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get session data from navigation state or localStorage
    const data = location.state?.sessionData || 
                 JSON.parse(localStorage.getItem("currentInterview"));
    
    if (!data) {
      navigate("/create-interview");
      return;
    }
    
    setSessionData(data);
    setLoading(false);
  }, [location, navigate]);

  const startInterview = () => {
    const technicalQuestions = sessionData.technicalQuestions || [];
    const behavioralQuestions = sessionData.behavioralQuestions || [];
    
    // Split technical questions into 2 rounds
    const round1Questions = technicalQuestions.slice(0, 3).map((q, i) => ({
      ...q,
      id: i + 1,
      round: 1,
      roundName: "Technical Round 1"
    }));
    
    const round2Questions = technicalQuestions.slice(3, 6).map((q, i) => ({
      ...q,
      id: i + 4,
      round: 2,
      roundName: "Technical Round 2"
    }));
    
    // Use behavioral questions for HR round
    const round3Questions = behavioralQuestions.slice(0, 5).map((q, i) => ({
      ...q,
      id: i + 7,
      round: 3,
      roundName: "HR Round"
    }));

    const interviewData = {
      ...sessionData,
      rounds: [
        { 
          id: 1, 
          name: "Technical Round 1", 
          questions: round1Questions, 
          completed: false,
          description: "Core technical concepts"
        },
        { 
          id: 2, 
          name: "Technical Round 2", 
          questions: round2Questions, 
          completed: false,
          description: "Advanced technical scenarios"
        },
        { 
          id: 3, 
          name: "HR Round", 
          questions: round3Questions, 
          completed: false,
          description: "Behavioral and cultural fit"
        }
      ],
      currentRound: 0,
      startedAt: new Date().toISOString()
    };

    localStorage.setItem("activeInterview", JSON.stringify(interviewData));
    navigate("/interview");
  };

  if (loading) {
    return <div className="loading">Loading interview details...</div>;
  }

  const technicalCount = sessionData?.technicalQuestions?.length || 0;
  const behavioralCount = sessionData?.behavioralQuestions?.length || 0;

  return (
    <div className="skills-review-container">
      <header className="skills-header">
        <button 
          className="back-button"
          onClick={() => navigate("/create-interview")}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <h1>Interview Preparation</h1>
      </header>

      <main className="skills-main">
        {/* Job Info */}
        <section className="job-info-card">
          <h2>{sessionData.jobTitle}</h2>
          <div className="job-meta">
            <span className="badge">{sessionData.experienceLevel}</span>
            <span className="badge">{technicalCount} Technical Questions</span>
            <span className="badge">{behavioralCount} Behavioral Questions</span>
          </div>
        </section>

        {/* Skills Overview */}
        <section className="skills-section">
          <h3>📚 Required Skills</h3>
          
          <div className="skills-grid">
            <div className="skill-category">
              <h4>💻 Technical Skills</h4>
              <div className="skill-tags">
                {sessionData.skills.technicalSkills.map((skill, i) => (
                  <span key={i} className="skill-tag technical">{skill}</span>
                ))}
              </div>
            </div>

            <div className="skill-category">
              <h4>🤝 Soft Skills</h4>
              <div className="skill-tags">
                {sessionData.skills.softSkills.map((skill, i) => (
                  <span key={i} className="skill-tag soft">{skill}</span>
                ))}
              </div>
            </div>

            <div className="skill-category">
              <h4>🎯 Core Competencies</h4>
              <div className="skill-tags">
                {sessionData.skills.requiredCompetencies.map((comp, i) => (
                  <span key={i} className="skill-tag competency">{comp}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interview Structure */}
        <section className="interview-structure">
          <h3>📋 Interview Structure</h3>
          <div className="rounds-overview">
            <div className="round-card">
              <div className="round-icon">1</div>
              <h4>Technical Round 1</h4>
              <p>3 Questions - Core Concepts</p>
              <span className="round-duration">~15 minutes</span>
            </div>
            <div className="round-card">
              <div className="round-icon">2</div>
              <h4>Technical Round 2</h4>
              <p>3 Questions - Advanced Topics</p>
              <span className="round-duration">~15 minutes</span>
            </div>
            <div className="round-card">
              <div className="round-icon">3</div>
              <h4>HR Round</h4>
              <p>5 Questions - Behavioral</p>
              <span className="round-duration">~20 minutes</span>
            </div>
          </div>
        </section>

        {/* Start Button */}
        <div className="start-section">
          <button className="start-interview-btn" onClick={startInterview}>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Interview
          </button>
          <p className="start-note">Make sure you're in a quiet environment with stable internet</p>
        </div>
      </main>
    </div>
  );
}