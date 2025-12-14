import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-container">
      {/* Navigation Header */}
      <nav className="home-nav">
        <div className="nav-content">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="logo-svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="logo-text-container">
              <span className="logo-text">PrepMate</span>
              <span className="logo-ai">AI</span>
            </div>
          </div>
          <div className="nav-links">
            <Link to="/login" className="nav-link">Sign In</Link>
            <Link to="/signup" className="nav-button">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            <span>Trusted by 50,000+ job seekers worldwide</span>
          </div>
          
          <h1 className="hero-title">
            Ace Your Next Interview with
            <span className="gradient-text"> AI-Powered Preparation</span>
          </h1>
          
          <p className="hero-description">
            Master behavioral questions, technical challenges, and case studies with 
            personalized AI coaching. Real-time feedback, industry-specific scenarios, 
            and proven strategies to land your dream job.
          </p>

          <div className="hero-buttons">
            <Link to="/signup" className="btn-primary">
              Start Practicing Free
              <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link to="/login" className="btn-secondary">
              <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Demo
            </Link>
          </div>

          <div className="social-proof">
            <div className="stats-group">
              <div className="stat-item">
                <div className="stat-number">98%</div>
                <div className="stat-label">Success Rate</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">50K+</div>
                <div className="stat-label">Users</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-number">4.9/5</div>
                <div className="stat-label">Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="hero-visual">
          <div className="floating-card card-1">
            <div className="card-icon purple">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="card-content">
              <h4>AI Mock Interviews</h4>
              <p>Practice with intelligent AI interviewer</p>
              <div className="card-progress">
                <div className="progress-bar" style={{width: '85%'}}></div>
              </div>
            </div>
          </div>

          <div className="floating-card card-2">
            <div className="card-icon blue">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="card-content">
              <h4>Performance Analytics</h4>
              <p>Track improvement over time</p>
              <div className="mini-chart">
                <div className="chart-bar" style={{height: '40%'}}></div>
                <div className="chart-bar" style={{height: '60%'}}></div>
                <div className="chart-bar" style={{height: '80%'}}></div>
                <div className="chart-bar" style={{height: '95%'}}></div>
              </div>
            </div>
          </div>

          <div className="floating-card card-3">
            <div className="card-icon green">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="card-content">
              <h4>Question Bank</h4>
              <p>10,000+ curated questions</p>
              <div className="card-tags">
                <span className="tag">Behavioral</span>
                <span className="tag">Technical</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Everything You Need to Succeed</h2>
          <p className="section-subtitle">Comprehensive interview preparation powered by advanced AI</p>
        </div>
        
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3>AI-Powered Feedback</h3>
            <p>Get instant, detailed feedback on your answers with actionable insights to improve your performance</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>Real-Time Practice</h3>
            <p>Simulate actual interview conditions with timed responses and pressure scenarios</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3>Industry-Specific</h3>
            <p>Tailored questions for tech, finance, consulting, healthcare, and 50+ other industries</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3>Progress Tracking</h3>
            <p>Visualize your improvement with detailed analytics and personalized learning paths</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3>Voice Recognition</h3>
            <p>Practice speaking naturally with advanced speech-to-text technology</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3>STAR Framework</h3>
            <p>Master the proven STAR method for behavioral interviews with guided examples</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="section-header">
          <h2 className="section-title">Success Stories</h2>
          <p className="section-subtitle">Join thousands who landed their dream jobs</p>
        </div>
        
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar" style={{background: 'linear-gradient(135deg, #667eea, #764ba2)'}}>SR</div>
              <div className="testimonial-info">
                <h4>Sarah Rodriguez</h4>
                <p>Software Engineer @ Google</p>
              </div>
            </div>
            <div className="testimonial-rating">
              ⭐⭐⭐⭐⭐
            </div>
            <p className="testimonial-text">
              "PrepMate AI helped me nail my Google interview. The AI feedback was incredibly detailed 
              and helped me improve my communication skills significantly."
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar" style={{background: 'linear-gradient(135deg, #f093fb, #f5576c)'}}>MC</div>
              <div className="testimonial-info">
                <h4>Michael Chen</h4>
                <p>Product Manager @ Microsoft</p>
              </div>
            </div>
            <div className="testimonial-rating">
              ⭐⭐⭐⭐⭐
            </div>
            <p className="testimonial-text">
              "The industry-specific questions were spot-on. I felt completely prepared 
              for every scenario they threw at me. Highly recommend!"
            </p>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar" style={{background: 'linear-gradient(135deg, #4facfe, #00f2fe)'}}>AP</div>
              <div className="testimonial-info">
                <h4>Aisha Patel</h4>
                <p>Consultant @ McKinsey</p>
              </div>
            </div>
            <div className="testimonial-rating">
              ⭐⭐⭐⭐⭐
            </div>
            <p className="testimonial-text">
              "The case study practice was invaluable. PrepMate AI's structured approach 
              helped me think more clearly under pressure."
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Land Your Dream Job?</h2>
          <p className="cta-subtitle">Start practicing today with our AI-powered interview coach</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn-primary">
              Start Free Trial
              <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          <p className="cta-note">No credit card required • 7-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Background Elements */}
      <div className="bg-gradient gradient-1"></div>
      <div className="bg-gradient gradient-2"></div>
      <div className="bg-gradient gradient-3"></div>
    </div>
  );
}