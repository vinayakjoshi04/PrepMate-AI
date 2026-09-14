import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import "./auth.css";

const EyeIcon = ({ open }) =>
  open ? (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

const MailIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="social-icon" aria-hidden="true">
    <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: "", color: "" },
    { label: "Weak", color: "weak" },
    { label: "Fair", color: "fair" },
    { label: "Good", color: "good" },
    { label: "Strong", color: "strong" },
  ];
  return { score, ...map[score] };
}

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function AuthPage({ initialMode = "login" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [mounted, setMounted] = useState(false);

  // Shared UI state
  const [showPassword, setShowPassword] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [role, setRole] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Keep the URL in sync so /login and /signup both work and are shareable
  useEffect(() => {
    const target = mode === "signup" ? "/signup" : "/login";
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [mode]);

  const switchTo = (nextMode) => {
    setShowPassword(false);
    setLoginError("");
    setSignupError("");
    setMode(nextMode);
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginError("");

    if (!loginEmail.trim()) return setLoginError("Please enter your email address");
    if (!isValidEmail(loginEmail)) return setLoginError("Please enter a valid email address");
    if (!loginPassword) return setLoginError("Please enter your password");
    if (loginPassword.length < 6) return setLoginError("Password must be at least 6 characters");

    setLoginLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (authError) throw authError;

      const userRole = data.user?.user_metadata?.role;
      navigate(userRole === "recruiter" ? "/recruiter-dashboard" : "/dashboard");
    } catch (err) {
      if (err.message.includes("Invalid login credentials")) {
        setLoginError("Invalid email or password. Please try again.");
      } else if (err.message.includes("Email not confirmed")) {
        setLoginError("Please confirm your email address before logging in.");
      } else {
        setLoginError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e?.preventDefault();
    setSignupError("");

    if (!role) return setSignupError("Please select your role to continue");
    if (!signupEmail.trim()) return setSignupError("Please enter your email address");
    if (!isValidEmail(signupEmail)) return setSignupError("Please enter a valid email address");
    if (!signupPassword) return setSignupError("Please enter a password");
    if (signupPassword.length < 8) return setSignupError("Password must be at least 8 characters");

    setSignupLoading(true);
    const { error: signupErr } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: { data: { role } },
    });
    setSignupLoading(false);

    if (signupErr) {
      setSignupError(signupErr.message);
    } else {
      setSignupSuccess(true);
    }
  };

  const strength = getPasswordStrength(signupPassword);

  if (signupSuccess) {
    return (
      <div className={`authpage-wrapper ${mounted ? "mounted" : ""}`}>
        <div className="bg-canvas">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="grid-lines" />
          <div className="noise-overlay" />
        </div>
        <div className="success-screen">
          <div className="success-icon-wrap">
            <div className="success-ring" />
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="success-title">Account Created</h2>
          <p className="success-subtitle">
            We've sent a confirmation link to <strong>{signupEmail}</strong>. Check your inbox to activate your account.
          </p>
          <Link to="/login" className="success-cta" onClick={() => { setSignupSuccess(false); switchTo("login"); }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`authpage-wrapper ${mounted ? "mounted" : ""}`}>

      {/* Animated Background */}
      <div className="bg-canvas">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-lines" />
        <div className="noise-overlay" />
      </div>

      <Link to="/" className="floating-logo" aria-label="PrepMate AI Home">
        <div className="brand-icon sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="brand-svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <span className="floating-logo-text">PrepMate<em>AI</em></span>
      </Link>

      {/* Sliding Card */}
      <div className={`auth-card ${mode === "signup" ? "right-panel-active" : ""}`}>

        {/* SIGN UP FORM */}
        <div className="form-panel signup-panel">
          <form className="form-body" onSubmit={handleSignup} noValidate>
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Start with the tools you need — no card required.</p>
            </div>

            {signupError && (
              <div className="error-message" role="alert">
                <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {signupError}
              </div>
            )}

            <div className="input-group">
              <label>I am a</label>
              <div className="role-selection">
                {[
                  {
                    value: "candidate",
                    title: "Candidate",
                    desc: "Prepare for interviews",
                    icon: (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                  },
                  {
                    value: "recruiter",
                    title: "Recruiter",
                    desc: "Conduct AI interviews",
                    icon: (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    ),
                  },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`role-button ${role === r.value ? "active" : ""}`}
                    onClick={() => { setRole(r.value); setSignupError(""); }}
                    disabled={signupLoading}
                  >
                    <div className="role-icon">{r.icon}</div>
                    <div className="role-content">
                      <h4>{r.title}</h4>
                      <p>{r.desc}</p>
                    </div>
                    {role === r.value && (
                      <div className="role-check">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><MailIcon /></span>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => { setSignupEmail(e.target.value); setSignupError(""); }}
                  disabled={signupLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon"><LockIcon /></span>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={signupPassword}
                  onChange={(e) => { setSignupPassword(e.target.value); setSignupError(""); }}
                  disabled={signupLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {signupPassword.length > 0 && (
                <div className="password-strength-wrap">
                  <div className="strength-bars">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className={`strength-bar ${strength.score >= n ? `active ${strength.color}` : ""}`} />
                    ))}
                  </div>
                  {strength.label && <span className={`strength-label ${strength.color}`}>{strength.label}</span>}
                </div>
              )}
            </div>

            <button type="submit" disabled={signupLoading} className="submit-button">
              {signupLoading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <svg className="btn-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            <div className="form-divider"><span>or continue with</span></div>

            <div className="social-buttons">
              <button type="button" className="social-button" aria-label="Sign up with Google"><GoogleIcon />Google</button>
              <button type="button" className="social-button" aria-label="Sign up with GitHub"><GitHubIcon />GitHub</button>
            </div>

            <p className="mobile-switch">
              Already have an account?{" "}
              <button type="button" className="footer-link-btn" onClick={() => switchTo("login")}>Sign in</button>
            </p>

            <p className="terms-text">
              By signing up, you agree to our{" "}
              <a href="#" className="terms-link">Terms of Service</a> and{" "}
              <a href="#" className="terms-link">Privacy Policy</a>
            </p>
          </form>
        </div>

        {/* SIGN IN FORM */}
        <div className="form-panel login-panel">
          <form className="form-body" onSubmit={handleLogin} noValidate>
            <div className="form-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to continue.</p>
            </div>

            {loginError && (
              <div className="error-message" role="alert">
                <svg className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {loginError}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><MailIcon /></span>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }}
                  disabled={loginLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="login-password">Password</label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>
              <div className="input-wrapper">
                <span className="input-icon"><LockIcon /></span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                  disabled={loginLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loginLoading} className="submit-button">
              {loginLoading ? (
                <>
                  <svg className="spinner" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <svg className="btn-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            <div className="form-divider"><span>or continue with</span></div>

            <div className="social-buttons">
              <button type="button" className="social-button" aria-label="Sign in with Google"><GoogleIcon />Google</button>
              <button type="button" className="social-button" aria-label="Sign in with GitHub"><GitHubIcon />GitHub</button>
            </div>

            <p className="mobile-switch">
              Don't have an account?{" "}
              <button type="button" className="footer-link-btn" onClick={() => switchTo("signup")}>Create one</button>
            </p>
          </form>
        </div>

        {/* OVERLAY (desktop only) */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h2 className="overlay-title">Welcome Back</h2>
              <p className="overlay-text">
                Already building your interview edge with PrepMate? Sign in to pick up where you left off.
              </p>
              <button type="button" className="overlay-button" onClick={() => switchTo("login")}>
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h2 className="overlay-title">New Here?</h2>
              <p className="overlay-text">
                Create an account to run AI mock interviews, analyze your resume, and get discovered by recruiters.
              </p>
              <button type="button" className="overlay-button" onClick={() => switchTo("signup")}>
                Create Account
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}