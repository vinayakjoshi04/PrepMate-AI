import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Home.css";

function useIntersection(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15, ...options });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function TypewriterText({ texts }) {
  const [displayed, setDisplayed] = useState("");
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIdx];
    let timeout;
    if (!deleting && charIdx < current.length) {
      timeout = setTimeout(() => setCharIdx(c => c + 1), 60);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(c => c - 1), 35);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setTextIdx(i => (i + 1) % texts.length);
    }
    setDisplayed(current.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, textIdx, texts]);

  return (
    <span className="typewriter">
      {displayed}<span className="cursor">|</span>
    </span>
  );
}

const modules = [
  {
    id: "01",
    badge: "Most Popular",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    label: "AI Mock Interview",
    tagline: "Simulate. Practice. Ace It.",
    desc: "Jump into a fully simulated AI-powered interview tailored to your job role. Our AI interviewer asks real-world questions, evaluates your answers in real time, and gives detailed feedback — just like a real interviewer.",
    features: ["Role-specific question banks", "Real-time answer evaluation", "Detailed post-interview report", "Behavioral & technical rounds"],
    cta: "Start Interview",
    path: "/interview",
    color: "#7c3aed",
    accent: "#a78bfa",
    glow: "rgba(124,58,237,0.35)",
  },
  {
    id: "02",
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: "Smart Resume Analyzer",
    tagline: "Parse. Score. Improve.",
    desc: "Upload your resume and let our AI dissect it from every angle — formatting, keyword density, ATS compatibility. You'll get an ATS score, section-by-section feedback, and an AI-enhanced version ready for top companies.",
    features: ["ATS compatibility scoring", "Section-by-section feedback", "Keyword gap analysis", "AI-enhanced resume output"],
    cta: "Analyze Resume",
    path: "/resume",
    color: "#0ea5e9",
    accent: "#38bdf8",
    glow: "rgba(14,165,233,0.35)",
  },
  {
    id: "03",
    badge: "New",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 13l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
      </svg>
    ),
    label: "Skill Gap & Roadmap",
    tagline: "Compare. Identify. Grow.",
    desc: "Paste any Job Description and our AI compares it to your resume, identifies missing skills, tools, and experiences — then generates a personalized learning roadmap with resources, milestones, and timelines.",
    features: ["JD vs Resume gap analysis", "Missing skills identification", "Personalized learning roadmap", "Resource & timeline planning"],
    cta: "Build My Roadmap",
    path: "/roadmap",
    color: "#10b981",
    accent: "#34d399",
    glow: "rgba(16,185,129,0.35)",
  },
];

const steps = [
  { num: "01", title: "Pick Your Module", desc: "Choose from Mock Interview, Resume Analyzer, or Skill Roadmap based on what you need most." },
  { num: "02", title: "Input Your Details", desc: "Tell the AI your role, experience, and goals. Upload a resume or paste a job description." },
  { num: "03", title: "AI Does the Work", desc: "Our AI analyzes, simulates, and evaluates in real time with precision and depth." },
  { num: "04", title: "Land the Offer", desc: "Walk into interviews confident. Apply smarter. Grow faster." },
];

export default function Home() {
  const [heroRef, heroVisible] = useIntersection();
  const [modulesRef, modulesVisible] = useIntersection();
  const [stepsRef, stepsVisible] = useIntersection();
  const [ctaRef, ctaVisible] = useIntersection();
  const [activeModule, setActiveModule] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-rotate active module
  useEffect(() => {
    const t = setInterval(() => setActiveModule(m => (m + 1) % modules.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="home">
      {/* Ambient background */}
      <div className="ambient">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      {/* NAV */}
      <nav className="nav" style={{ background: scrollY > 40 ? "rgba(6,6,12,0.92)" : "transparent" }}>
        <div className="nav-inner">
          <div className="nav-logo">
            <div className="logo-mark">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="url(#lg)" />
                <path d="M10 22L16 10L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.5 18H19.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#7c3aed"/>
                    <stop offset="1" stopColor="#4f46e5"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="logo-name">PrepMate<em>AI</em></span>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-ghost">Sign In</Link>
            <Link to="/signup" className="nav-pill">Get Started →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" ref={heroRef}>
        <div className={`hero-inner ${heroVisible ? "revealed" : ""}`}>
          <div className="hero-eyebrow">
            <span className="dot-live" />
            Trusted by 50,000+ job seekers worldwide
          </div>
          <h1 className="hero-h1">
            Land Your Dream Job<br />
            with{" "}
            <span className="grad-text">
              <TypewriterText texts={["AI Mock Interviews", "Resume Analysis", "Skill Roadmaps", "Real-Time Feedback"]} />
            </span>
          </h1>
          <p className="hero-sub">
            Three powerful AI tools. One mission — get you hired. Practice interviews, fix your resume, and close every skill gap standing between you and your next offer.
          </p>
          <div className="hero-ctas">
            <Link to="/signup" className="cta-main">Start Free — No Card Needed</Link>
            <a href="#modules" className="cta-ghost">See How It Works ↓</a>
          </div>
          <div className="hero-stats">
            {[["98%", "Success Rate"], ["50K+", "Users Trained"], ["4.9★", "App Rating"]].map(([num, lbl]) => (
              <div key={lbl} className="hero-stat">
                <span className="stat-val">{num}</span>
                <span className="stat-lbl">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module preview cards floating */}
        <div className={`hero-cards ${heroVisible ? "revealed" : ""}`}>
          {modules.map((mod, i) => (
            <button
              key={mod.id}
              className={`preview-card ${activeModule === i ? "active" : ""}`}
              style={{ "--mod-color": mod.color, "--mod-glow": mod.glow }}
              onClick={() => setActiveModule(i)}
            >
              <span className="preview-num">{mod.id}</span>
              <span className="preview-icon">{mod.icon}</span>
              <span className="preview-label">{mod.label}</span>
              {mod.badge && <span className="preview-badge">{mod.badge}</span>}
            </button>
          ))}
          {/* Detail panel */}
          <div
            className="preview-detail"
            style={{ "--mod-color": modules[activeModule].color, "--mod-glow": modules[activeModule].glow }}
          >
            <p className="pd-tagline">{modules[activeModule].tagline}</p>
            <ul className="pd-feats">
              {modules[activeModule].features.map(f => (
                <li key={f}><span className="pd-check">✓</span> {f}</li>
              ))}
            </ul>
            <Link to={modules[activeModule].path} className="pd-cta">
              {modules[activeModule].cta} →
            </Link>
          </div>
        </div>
      </section>

      {/* MODULES DEEP DIVE */}
      <section className="modules-section" id="modules" ref={modulesRef}>
        <div className="section-label">Three Tools. One Goal.</div>
        <h2 className={`section-h2 ${modulesVisible ? "revealed" : ""}`}>
          Choose Your Module
        </h2>
        <p className="section-sub">Each module is a standalone AI powerhouse — use one or all three.</p>

        <div className="modules-list">
          {modules.map((mod, i) => (
            <div
              key={mod.id}
              className={`module-card ${modulesVisible ? "revealed" : ""}`}
              style={{ "--mod-color": mod.color, "--mod-accent": mod.accent, "--mod-glow": mod.glow, animationDelay: `${i * 0.15}s` }}
            >
              <div className="mc-header">
                <div className="mc-num-wrap">
                  <span className="mc-num">{mod.id}</span>
                  {mod.badge && <span className="mc-badge">{mod.badge}</span>}
                </div>
                <div className="mc-icon">{mod.icon}</div>
              </div>
              <h3 className="mc-title">{mod.label}</h3>
              <p className="mc-tagline">{mod.tagline}</p>
              <p className="mc-desc">{mod.desc}</p>
              <ul className="mc-features">
                {mod.features.map(f => (
                  <li key={f}>
                    <span className="mc-check">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={mod.path} className="mc-cta">
                {mod.cta}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <div className="mc-glow-bg" />
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="steps-section" ref={stepsRef}>
        <div className="section-label">Simple Process</div>
        <h2 className={`section-h2 ${stepsVisible ? "revealed" : ""}`}>From Zero to Offer-Ready</h2>
        <p className="section-sub">Four steps is all it takes to transform your interview game.</p>

        <div className="steps-track">
          <div className="steps-line" />
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`step-item ${stepsVisible ? "revealed" : ""}`}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className="step-circle">
                <span>{step.num}</span>
              </div>
              <div className="step-body">
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="proof-section">
        <div className="proof-inner">
          {[
            { init: "SR", name: "Sarah Rodriguez", role: "SWE @ Google", grad: "135deg,#7c3aed,#4f46e5", text: "PrepMate's AI interview gave me tougher questions than the actual Google panel. I was completely prepared." },
            { init: "MC", name: "Michael Chen", role: "PM @ Microsoft", grad: "135deg,#0ea5e9,#0284c7", text: "The resume analyzer found 14 keyword gaps I had no idea about. Got 3 callbacks in one week after fixing them." },
            { init: "AP", name: "Aisha Patel", role: "Consultant @ McKinsey", grad: "135deg,#10b981,#059669", text: "The skill roadmap told me exactly what to learn in 30 days. Landed my McKinsey offer on the first try." },
          ].map((t, i) => (
            <div key={t.name} className="proof-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="proof-stars">★★★★★</div>
              <p className="proof-text">"{t.text}"</p>
              <div className="proof-author">
                <div className="proof-avatar" style={{ background: `linear-gradient(${t.grad})` }}>{t.init}</div>
                <div>
                  <div className="proof-name">{t.name}</div>
                  <div className="proof-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="final-cta" ref={ctaRef}>
        <div className={`fcta-inner ${ctaVisible ? "revealed" : ""}`}>
          <div className="fcta-orb" />
          <div className="section-label">Your Next Chapter Starts Now</div>
          <h2 className="fcta-h2">Ready to Get Hired?</h2>
          <p className="fcta-sub">Join 50,000+ professionals who used PrepMate AI to land their dream roles.</p>
          <Link to="/signup" className="cta-main large">Start Free Trial — 7 Days</Link>
          <p className="fcta-note">No credit card · Cancel anytime · Instant access</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <div className="logo-mark sm">
              <svg viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="10" fill="url(#lg2)" />
                <path d="M10 22L16 10L22 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.5 18H19.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="lg2" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#7c3aed"/>
                    <stop offset="1" stopColor="#4f46e5"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span>PrepMate<em>AI</em></span>
          </div>
          <p className="footer-copy">© 2026 PrepMateAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}