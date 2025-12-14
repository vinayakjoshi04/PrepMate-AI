import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Email validation helper
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    
    // Clear previous errors
    setError("");

    // Client-side validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      
      if (authError) throw authError;
      
      // Success - navigate to dashboard
      console.log("Login successful!", data);
      navigate("/dashboard");
      
    } catch (err) {
      console.error("Login error:", err);
      
      // User-friendly error messages
      if (err.message.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (err.message.includes("Email not confirmed")) {
        setError("Please confirm your email address before logging in.");
      } else {
        setError(err.message || "An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left Side - Branding */}
      <div className="auth-branding">
        <div className="branding-content">
          <Link to="/" className="brand-logo" aria-label="PrepMate AI Home">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="brand-svg" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <span className="brand-name">PrepMate</span>
              <span className="brand-ai">AI</span>
            </div>
          </Link>

          <h1 className="branding-title">
            Welcome Back to PrepMate AI
          </h1>
          <p className="branding-subtitle">
            Continue mastering your interview skills with AI-powered coaching
          </p>

          <div className="stats-showcase">
            <div className="stat-card">
              <div className="stat-value">98%</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">50K+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">10K+</div>
              <div className="stat-label">Questions</div>
            </div>
          </div>

          <div className="branding-image" aria-hidden="true">
            <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="300" rx="20" fill="url(#paint0_linear)"/>
              <circle cx="100" cy="100" r="40" fill="rgba(255,255,255,0.1)"/>
              <circle cx="300" cy="200" r="60" fill="rgba(255,255,255,0.08)"/>
              <rect x="80" y="120" width="240" height="120" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
              <line x1="100" y1="150" x2="280" y2="150" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round"/>
              <line x1="100" y1="180" x2="240" y2="180" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round"/>
              <line x1="100" y1="210" x2="260" y2="210" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="340" cy="40" r="8" fill="#667eea"/>
              <circle cx="360" cy="60" r="6" fill="#764ba2"/>
              <defs>
                <linearGradient id="paint0_linear" x1="0" y1="0" x2="400" y2="300" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#667eea" stopOpacity="0.2"/>
                  <stop offset="1" stopColor="#764ba2" stopOpacity="0.1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-container">
        <div className="auth-form">
          <div className="form-header">
            <h2>Sign In to Your Account</h2>
            <p>Enter your credentials to continue your preparation</p>
          </div>

          <form className="form-body" onSubmit={handleLogin} noValidate>
            {/* Error Message Display */}
            {error && (
              <div className="error-message" role="alert">
                <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(""); // Clear error on input
                }}
                disabled={loading}
                autoComplete="email"
                aria-required="true"
                aria-invalid={error && !isValidEmail(email) ? "true" : "false"}
              />
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(""); // Clear error on input
                }}
                disabled={loading}
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={error && password.length < 6 ? "true" : "false"}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="submit-button"
              aria-label={loading ? "Signing in..." : "Sign in"}
            >
              {loading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="btn-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </>
              )}
            </button>

            <div className="form-divider">
              <span>or continue with</span>
            </div>

            <div className="social-buttons">
              <button type="button" className="social-button" aria-label="Sign in with Google">
                <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </button>
              <button type="button" className="social-button" aria-label="Sign in with GitHub">
                <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
                  <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
                GitHub
              </button>
            </div>

            <p className="form-footer">
              Don't have an account?{" "}
              <Link to="/signup" className="footer-link">
                Start free trial
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Background Elements */}
      <div className="bg-gradient gradient-1" aria-hidden="true"></div>
      <div className="bg-gradient gradient-2" aria-hidden="true"></div>
    </div>
  );
}