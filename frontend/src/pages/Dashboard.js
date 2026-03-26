import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { createElement as h } from "react";
import "./dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const modules = [
    {
      id: "interview",
      tag: "Module 01",
      title: "AI Mock Interview",
      subtitle: "Simulate. Practice. Ace It.",
      description:
        "Jump into a fully simulated AI-powered interview session tailored to your job role and experience level. Our AI interviewer asks real-world technical and behavioral questions, evaluates your answers in real time, and provides detailed feedback — just like a real interviewer would. Perfect for freshers and experienced professionals alike.",
      highlights: [
        "Role-specific question banks",
        "Real-time answer evaluation",
        "Detailed post-interview report",
        "Behavioral & technical rounds",
      ],
      cta: "Start Interview",
      path: "/create-interview",
      accent: "#667eea",
      accentSecondary: "#764ba2",
      icon: h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
        h("path", {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: 1.5,
          d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        })
      ),
      badge: "Most Popular",
    },
    {
      id: "resume",
      tag: "Module 02",
      title: "Resume Analyzer",
      subtitle: "Parse. Score. Improve.",
      description:
        "Upload your resume and let our AI dissect it from every angle. We analyze your formatting, content quality, keyword density, and ATS compatibility. You'll receive an ATS score, section-by-section feedback, and an improved version of your resume tailored for modern applicant tracking systems used by top companies.",
      highlights: [
        "ATS compatibility scoring",
        "Section-by-section feedback",
        "Keyword gap analysis",
        "AI-enhanced resume output",
      ],
      cta: "Analyze Resume",
      path: "/resume-analyzer",
      accent: "#f093fb",
      accentSecondary: "#f5576c",
      icon: h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
        h("path", {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: 1.5,
          d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        })
      ),
      badge: "Smart AI",
    },
    {
      id: "roadmap",
      tag: "Module 03",
      title: "Skill Gap & Roadmap",
      subtitle: "Compare. Identify. Grow.",
      description:
        "Paste any Job Description and let our AI compare it against your resume to find exactly where you stand. It identifies missing technical skills, tools, and experiences — then generates a personalized learning roadmap with resources, milestones, and timelines to help you close the gap and become the ideal candidate.",
      highlights: [
        "JD vs Resume gap analysis",
        "Missing skills identification",
        "Personalized learning roadmap",
        "Resource & timeline planning",
      ],
      cta: "Build My Roadmap",
      path: "/skill-roadmap",
      accent: "#43e97b",
      accentSecondary: "#38f9d7",
      icon: h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
        h("path", {
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: 1.5,
          d: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
        })
      ),
      badge: "New",
    },
  ];

  return h("div", { className: "dashboard-container" },
    // Ambient background orbs
    h("div", { className: "orb orb-1" }),
    h("div", { className: "orb orb-2" }),
    h("div", { className: "orb orb-3" }),

    // Header
    h("header", { className: "dashboard-header" },
      h("div", { className: "dashboard-brand" },
        h("div", { className: "dashboard-brand-icon" },
          h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true" },
            h("path", {
              strokeLinecap: "round",
              strokeLinejoin: "round",
              strokeWidth: 2,
              d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            })
          )
        ),
        h("div", { className: "dashboard-brand-text" },
          h("span", { className: "dashboard-brand-name" }, "PrepMate"),
          h("span", { className: "dashboard-brand-ai" }, "AI")
        )
      ),
      h("nav", { className: "dashboard-nav" },
        h("span", { className: "dashboard-nav-item active" }, "Dashboard"),
        h("span", { className: "dashboard-nav-item" }, "History"),
        h("span", { className: "dashboard-nav-item" }, "Settings")
      ),
      h("button", { className: "logout-btn", onClick: handleLogout },
        h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", width: "16", height: "16" },
          h("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: 2,
            d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          })
        ),
        "Logout"
      )
    ),

    h("main", { className: "dashboard-main" },

      // Hero
      h("section", { className: "dashboard-hero" },
        h("div", { className: "hero-eyebrow" },
          h("span", { className: "hero-dot" }),
          "Your Interview Preparation Hub"
        ),
        h("h1", { className: "hero-title" },
          "Land Your ",
          h("span", { className: "hero-gradient" }, "Dream Job"),
          h("br"),
          "with AI Precision"
        ),
        h("p", { className: "hero-subtitle" },
          "Three powerful modules designed to take you from applicant to offer letter. Practice interviews, perfect your resume, and close every skill gap."
        ),
        h("div", { className: "hero-stats" },
          h("div", { className: "hero-stat" },
            h("span", { className: "hero-stat-value" }, "24"),
            h("span", { className: "hero-stat-label" }, "Interviews Done")
          ),
          h("div", { className: "hero-stat-divider" }),
          h("div", { className: "hero-stat" },
            h("span", { className: "hero-stat-value" }, "85%"),
            h("span", { className: "hero-stat-label" }, "Avg Score")
          ),
          h("div", { className: "hero-stat-divider" }),
          h("div", { className: "hero-stat" },
            h("span", { className: "hero-stat-value" }, "6.5h"),
            h("span", { className: "hero-stat-label" }, "Practice Time")
          )
        )
      ),

      // Module Cards
      h("section", { className: "modules-section" },
        h("div", { className: "modules-label" }, "Choose Your Module"),
        h("div", { className: "modules-grid" },
          modules.map((mod, index) =>
            h("div", {
              key: mod.id,
              className: "module-card",
              style: { 
                "--accent": mod.accent, 
                "--accent-2": mod.accentSecondary, 
                "--delay": `${index * 0.12}s` 
              }
            },
              // Card glow
              h("div", { className: "module-card-glow" }),

              // Top row
              h("div", { className: "module-card-top" },
                h("div", { className: "module-icon-wrap" }, mod.icon),
                h("div", { className: "module-meta" },
                  h("span", { className: "module-tag" }, mod.tag),
                  mod.badge && h("span", { className: "module-badge" }, mod.badge)
                )
              ),

              // Title
              h("h2", { className: "module-title" }, mod.title),
              h("p", { className: "module-subtitle" }, mod.subtitle),

              // Divider
              h("div", { className: "module-divider" }),

              // Description
              h("p", { className: "module-description" }, mod.description),

              // Highlights
              h("ul", { className: "module-highlights" },
                mod.highlights.map((highlight, i) =>
                  h("li", { key: i, className: "module-highlight-item" },
                    h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", className: "check-icon" },
                      h("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2.5,
                        d: "M5 13l4 4L19 7"
                      })
                    ),
                    highlight
                  )
                )
              ),

              // CTA
              h("button", {
                className: "module-cta",
                onClick: () => navigate(mod.path)
              },
                mod.cta,
                h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", width: "18", height: "18" },
                  h("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M13 7l5 5m0 0l-5 5m5-5H6"
                  })
                )
              )
            )
          )
        )
      ),

      // Recent Activity
      h("section", { className: "activity-section" },
        h("div", { className: "activity-header" },
          h("h3", { className: "activity-title" }, "Recent Activity"),
          h("a", { href: "#", className: "activity-view-all" }, "View All →")
        ),
        h("div", { className: "activity-list" },
          [
            { label: "Completed Technical Interview", time: "2 hours ago", color: "#667eea" },
            { label: "Uploaded Resume for Analysis", time: "Yesterday", color: "#f093fb" },
            { label: "Generated Skill Roadmap — Frontend Dev", time: "2 days ago", color: "#43e97b" },
          ].map((item, i) =>
            h("div", { className: "activity-item", key: i },
              h("div", { className: "activity-dot", style: { background: item.color } }),
              h("div", { className: "activity-content" },
                h("span", { className: "activity-name" }, item.label),
                h("span", { className: "activity-time" }, item.time)
              )
            )
          )
        )
      )
    )
  );
}