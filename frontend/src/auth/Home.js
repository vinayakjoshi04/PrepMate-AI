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
    }, { threshold: 0.12, ...options });
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
      timeout = setTimeout(() => setCharIdx(c => c + 1), 58);
    } else if (!deleting && charIdx === current.length) {
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(c => c - 1), 32);
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    label: "AI Mock Interview",
    tagline: "Simulate. Practice. Ace It.",
    desc: "Step into a fully simulated AI-powered interview tailored to your role and experience. Real-world questions, live evaluation, and a detailed feedback report — built to feel like the real thing.",
    features: ["Role-specific question banks", "Real-time answer evaluation", "Detailed post-interview report", "Behavioral & technical rounds"],
    cta: "Start Interview",
    path: "/create-interview",
    color: "#667eea",
    accent: "#764ba2",
    glow: "rgba(102,126,234,0.35)",
  },
  {
    id: "02",
    badge: "Smart AI",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: "Resume Analyzer",
    tagline: "Parse. Score. Improve.",
    desc: "Upload your resume and let our AI break it down completely — formatting, ATS compatibility, keyword density. Walk away with a score, section feedback, and an AI-enhanced version ready to impress.",
    features: ["ATS compatibility scoring", "Section-by-section feedback", "Keyword gap analysis", "AI-enhanced resume output"],
    cta: "Analyze Resume",
    path: "/resume-analyzer",
    color: "#f093fb",
    accent: "#f5576c",
    glow: "rgba(240,147,251,0.35)",
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
    desc: "Paste any Job Description and our AI compares it against your resume — finding every missing skill, tool, and gap. Then it builds you a personalized roadmap with resources and timelines.",
    features: ["JD vs Resume gap analysis", "Missing skills identification", "Personalized learning roadmap", "Resource & timeline planning"],
    cta: "Build My Roadmap",
    path: "/skill-roadmap",
    color: "#43e97b",
    accent: "#38f9d7",
    glow: "rgba(67,233,123,0.35)",
  },
  {
    id: "04",
    badge: "Get Hired",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    label: "Recruiter Profile",
    tagline: "Upload. Get Discovered. Land Jobs.",
    desc: "Build a profile visible to top recruiters hiring on PrepMate. Companies browse our talent pool daily and shortlist candidates directly — one upload, multiple opportunities waiting for you.",
    features: ["Visible to PrepMate recruiters", "Shortlisted for open positions", "Resume stored securely", "Update anytime"],
    cta: "Upload Resume",
    path: "/dashboard",
    color: "#f7971e",
    accent: "#ffd200",
    glow: "rgba(247,151,30,0.35)",
  },
  {
    id: "05",
    badge: "Live",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="2" y="7" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
    label: "Job Board",
    tagline: "Browse. Apply. Get Hired.",
    desc: "Browse open positions posted by recruiters actively hiring on PrepMate. Filter by role type, search by skill, and express interest directly — your profile is already on file.",
    features: ["Live recruiter postings", "Filter by role & type", "One-click express interest", "Deadline reminders"],
    cta: "Browse Jobs",
    path: "/dashboard",
    color: "#4facfe",
    accent: "#00f2fe",
    glow: "rgba(79,172,254,0.35)",
  },
];

const steps = [
  { num: "01", title: "Create Your Account", desc: "Sign up in seconds. No credit card needed — just your email and ambition.", icon: "✦" },
  { num: "02", title: "Build Your Profile", desc: "Upload your resume, fill in your skills, and become discoverable to top recruiters on PrepMate.", icon: "◈" },
  { num: "03", title: "Train with AI", desc: "Run mock interviews, analyze your resume, and build a personalized skill roadmap — all powered by AI.", icon: "⬡" },
  { num: "04", title: "Land the Offer", desc: "Get shortlisted, chat directly with recruiters, and walk into interviews already prepared.", icon: "★" },
];

const testimonials = [
  { init: "SR", name: "Sarah Rodriguez", role: "SWE @ Google", grad: "135deg,#667eea,#764ba2", text: "PrepMate's AI interview gave me tougher questions than the actual Google panel. I walked in completely prepared." },
  { init: "MC", name: "Michael Chen", role: "PM @ Microsoft", grad: "135deg,#f093fb,#f5576c", text: "The resume analyzer found 14 keyword gaps I had no idea about. Got 3 interview callbacks in a single week." },
  { init: "AP", name: "Aisha Patel", role: "Consultant @ McKinsey", grad: "135deg,#43e97b,#38f9d7", text: "The skill roadmap told me exactly what to learn. I followed it for 30 days and landed my McKinsey offer." },
  { init: "RK", name: "Rahul Kumar", role: "SDE @ Amazon", grad: "135deg,#f7971e,#ffd200", text: "A recruiter found me through the PrepMate Job Board and reached out within 2 days. Got the job 3 weeks later." },
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

  useEffect(() => {
    const t = setInterval(() => setActiveModule(m => (m + 1) % modules.length), 3500);
    return () => clearInterval(t);
  }, []);

  const activeMod = modules[activeModule];

  return (
    <div className="home">
      {/* Ambient background */}
      <div className="ambient">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
        <div className="grid-overlay" />
        <div className="noise-overlay" />
      </div>

      {/* NAV */}
      <nav className="nav" style={{ background: scrollY > 40 ? "rgba(5,5,10,0.94)" : "transparent" }}>
        <div className="nav-inner">
          <div className="nav-logo">
            <div className="logo-mark">
              <svg viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="11" fill="url(#navlg)" />
                <path d="M11 25L18 11L25 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 20.5H22.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="navlg" x1="0" y1="0" x2="36" y2="36">
                    <stop stopColor="#667eea"/>
                    <stop offset="1" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="logo-name">PrepMate<em>AI</em></span>
          </div>
          <div className="nav-links">
            <a href="#modules" className="nav-link">Modules</a>
            <a href="#how" className="nav-link">How it Works</a>
            <a href="#reviews" className="nav-link">Reviews</a>
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
            Your AI-Powered<br />
            <span className="grad-text">
              <TypewriterText texts={["Interview Coach", "Resume Analyzer", "Skill Roadmap", "Job Discovery"]} />
            </span>
            <br />for Getting Hired
          </h1>
          <p className="hero-sub">
            Five powerful AI tools. One platform. From mock interviews and resume analysis to recruiter discovery and live job applications — PrepMate gives you everything to go from applicant to offer.
          </p>
          <div className="hero-ctas">
            <Link to="/signup" className="cta-main">Start Free — No Card Needed</Link>
            <a href="#modules" className="cta-ghost">Explore All 5 Modules ↓</a>
          </div>
          <div className="hero-stats">
            {[
              ["5", "AI Modules"],
              ["50K+", "Users Trained"],
              ["98%", "Success Rate"],
              ["4.9★", "App Rating"],
            ].map(([num, lbl]) => (
              <div key={lbl} className="hero-stat">
                <span className="stat-val">{num}</span>
                <span className="stat-lbl">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module selector panel */}
        <div className={`hero-cards ${heroVisible ? "revealed" : ""}`}>
          <div className="hero-cards-label">5 Modules · All-in-One Platform</div>
          <div className="preview-list">
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
          </div>
          <div
            className="preview-detail"
            style={{ "--mod-color": activeMod.color, "--mod-glow": activeMod.glow }}
          >
            <p className="pd-tagline">{activeMod.tagline}</p>
            <p className="pd-desc">{activeMod.desc}</p>
            <ul className="pd-feats">
              {activeMod.features.map(f => (
                <li key={f}><span className="pd-check" style={{ color: activeMod.color }}>✓</span> {f}</li>
              ))}
            </ul>
            <Link to={activeMod.path} className="pd-cta" style={{ background: `linear-gradient(135deg, ${activeMod.color}, ${activeMod.accent})`, boxShadow: `0 8px 24px ${activeMod.glow}` }}>
              {activeMod.cta} →
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHT: Chat with Recruiter */}
      <section className="chat-feature-section">
        <div className="chat-feature-inner">
          <div className="chat-feature-text">
            <div className="section-label" style={{ textAlign: "left" }}>Exclusive Feature</div>
            <h2 className="chat-feature-h2">Chat Directly<br />with Recruiters</h2>
            <p className="chat-feature-sub">
              When a recruiter shortlists you, you get a real-time chat invitation — right inside PrepMate. No email chains, no LinkedIn DMs. Reply to interview invites, ask questions, and move the conversation forward instantly.
            </p>
            <ul className="chat-feature-list">
              {[
                ["🔔", "Real-time invite notifications"],
                ["💬", "In-app messaging with recruiters"],
                ["⭐", "Shortlist celebration alerts"],
                ["📋", "Interview invite management"],
              ].map(([icon, text]) => (
                <li key={text}><span>{icon}</span>{text}</li>
              ))}
            </ul>
            <Link to="/signup" className="cta-main" style={{ display: "inline-flex", marginTop: 8 }}>
              Get Discovered Now →
            </Link>
          </div>
          <div className="chat-feature-visual">
            {/* Mock chat UI */}
            <div className="mock-chat">
              <div className="mock-chat-header">
                <div className="mock-avatar" style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>A</div>
                <div>
                  <div className="mock-name">Amit Sharma</div>
                  <div className="mock-role">Acme Corp · Frontend Developer</div>
                </div>
                <div className="mock-live-dot" />
              </div>
              <div className="mock-invite-banner">
                <span>💼</span>
                <div>
                  <div className="mock-invite-title">Frontend Developer — Interview Invite</div>
                  <div className="mock-invite-sub">You've been shortlisted!</div>
                </div>
              </div>
              <div className="mock-messages">
                <div className="mock-bubble mock-them">
                  Hi! We loved your profile. Are you available for a call this Friday?
                </div>
                <div className="mock-bubble mock-me">
                  Absolutely! Friday works great for me. What time zone?
                </div>
                <div className="mock-bubble mock-them">
                  IST 3 PM. We'll send a Google Meet link. Excited to meet you! 🎉
                </div>
              </div>
              <div className="mock-input">
                <span>Type your reply…</span>
                <button className="mock-send">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Floating badge */}
            <div className="mock-shortlist-badge">
              <span>⭐</span>
              <div>
                <div className="mock-badge-title">You've Been Shortlisted!</div>
                <div className="mock-badge-sub">Check your Invites tab</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ALL 5 MODULES DEEP DIVE */}
      <section className="modules-section" id="modules" ref={modulesRef}>
        <div className="section-label">Everything You Need</div>
        <h2 className={`section-h2 ${modulesVisible ? "revealed" : ""}`}>
          Five Modules.<br />One Mission: Get Hired.
        </h2>
        <p className="section-sub">Each module is a standalone AI powerhouse. Use one, or use all five together for the ultimate edge.</p>

        <div className="modules-list">
          {modules.map((mod, i) => (
            <div
              key={mod.id}
              className={`module-card ${modulesVisible ? "revealed" : ""}`}
              style={{ "--mod-color": mod.color, "--mod-accent": mod.accent, "--mod-glow": mod.glow, animationDelay: `${i * 0.11}s` }}
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
      <section className="steps-section" id="how" ref={stepsRef}>
        <div className="section-label">Simple Process</div>
        <h2 className={`section-h2 ${stepsVisible ? "revealed" : ""}`}>From Zero to Offer-Ready</h2>
        <p className="section-sub">Four steps is all it takes to transform your job search with PrepMate.</p>

        <div className="steps-grid">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`step-card ${stepsVisible ? "revealed" : ""}`}
              style={{ animationDelay: `${i * 0.13}s` }}
            >
              <div className="step-top">
                <div className="step-icon">{step.icon}</div>
                <span className="step-num">{step.num}</span>
              </div>
              <h4 className="step-title">{step.title}</h4>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="proof-section" id="reviews">
        <div className="section-label" style={{ textAlign: "center" }}>Real Results</div>
        <h2 className="section-h2" style={{ opacity: 1, transform: "none" }}>50,000+ Offers and Counting</h2>
        <p className="section-sub">From FAANG to consulting to startups — PrepMate users are landing everywhere.</p>
        <div className="proof-inner">
          {testimonials.map((t, i) => (
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
          <p className="fcta-sub">Join 50,000+ professionals who used PrepMate AI to land their dream roles. 5 modules. Zero excuses.</p>
          <div className="fcta-modules-row">
            {modules.map((m) => (
              <div key={m.id} className="fcta-module-chip" style={{ "--mod-color": m.color }}>
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
          <Link to="/signup" className="cta-main large">Start Free — Instant Access</Link>
          <p className="fcta-note">No credit card · Cancel anytime · All 5 modules included</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <div className="logo-mark sm">
              <svg viewBox="0 0 36 36" fill="none">
                <rect width="36" height="36" rx="11" fill="url(#ftlg)" />
                <path d="M11 25L18 11L25 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 20.5H22.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="ftlg" x1="0" y1="0" x2="36" y2="36">
                    <stop stopColor="#667eea"/>
                    <stop offset="1" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span>PrepMate<em>AI</em></span>
          </div>
          <div className="footer-links">
            {modules.map(m => (
              <Link key={m.id} to={m.path} className="footer-link">{m.label}</Link>
            ))}
          </div>
          <p className="footer-copy">© 2026 PrepMateAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}