import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";
import "./auth.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) alert(error.message);
    else alert("Signup successful! Check your email to confirm.");
  };

  return (
    <div className="auth-wrapper">
      {/* Left Side - Branding */}
      <div className="auth-branding">
        <div className="branding-content">
          <Link to="/" className="brand-logo">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="brand-svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <span className="brand-name">PrepMate</span>
              <span className="brand-ai">AI</span>
            </div>
          </Link>

          <h1 className="branding-title">
            Your AI Interview Coach
          </h1>
          <p className="branding-subtitle">
            Join 50,000+ professionals who've landed their dream jobs with PrepMate AI
          </p>

          <div className="features-list">
            <div className="feature-point">
              <div className="feature-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="feature-text">
                <h4>AI-Powered Feedback</h4>
                <p>Get instant, detailed analysis on every response</p>
              </div>
            </div>

            <div className="feature-point">
              <div className="feature-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="feature-text">
                <h4>10,000+ Practice Questions</h4>
                <p>Industry-specific scenarios and real interview questions</p>
              </div>
            </div>

            <div className="feature-point">
              <div className="feature-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="feature-text">
                <h4>Track Your Progress</h4>
                <p>Visual analytics showing your improvement over time</p>
              </div>
            </div>
          </div>

          <div className="testimonial-mini">
            <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
            <p className="testimonial-quote">
              "PrepMate AI transformed how I prepare for interviews. 
              I felt confident and ready for every question."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">SK</div>
              <div>
                <div className="author-name">Sarah Kim</div>
                <div className="author-role">Software Engineer @ Meta</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-container">
        <div className="auth-form">
          <div className="form-header">
            <h2>Create Your Account</h2>
            <p>Start your 7-day free trial. No credit card required.</p>
          </div>

          <div className="form-body">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <span className="input-hint">Must be at least 8 characters</span>
            </div>

            <button 
              onClick={handleSignup} 
              disabled={loading}
              className="submit-button"
            >
              {loading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Start Free Trial
                  <svg className="btn-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            <div className="form-divider">
              <span>or continue with</span>
            </div>

            <div className="social-buttons">
              <button className="social-button">
                <svg viewBox="0 0 24 24" className="social-icon">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button className="social-button">
                <svg viewBox="0 0 24 24" className="social-icon">
                  <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                GitHub
              </button>
            </div>

            <p className="form-footer">
              Already have an account?{" "}
              <Link to="/login" className="footer-link">
                Sign in
              </Link>
            </p>

            <p className="terms-text">
              By signing up, you agree to our{" "}
              <a href="#" className="terms-link">Terms of Service</a> and{" "}
              <a href="#" className="terms-link">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="bg-gradient gradient-1"></div>
      <div className="bg-gradient gradient-2"></div>
    </div>
  );
}