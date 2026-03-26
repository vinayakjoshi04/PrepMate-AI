import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { createElement as h, useState, useEffect } from "react";
import "./dashboard.css";

/* ─── Resume Upload Modal ────────────────────────────── */
function ResumeUploadModal({ user, onClose, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "uploading" | "done" | "error"
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    candidate_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "",
    college: "",
    role: "",
    location: "",
    experience: "Fresher",
    skills: "",
    visible_to_recruiters: true,
  });
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.endsWith(".pdf")) {
      setErrorMsg("Only PDF files are accepted.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setErrorMsg("File must be under 5 MB.");
      return;
    }
    setErrorMsg("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleSubmit = async () => {
    if (!form.candidate_name || !form.role) {
      setErrorMsg("Name and desired role are required.");
      return;
    }
    setStep("uploading");
    setErrorMsg("");

    try {
      let resume_url = null;
      let resume_filename = null;

      // Upload PDF to Supabase Storage if provided
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: storageError } = await supabase.storage
          .from("resumes")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (storageError) throw new Error(storageError.message);
        resume_url = path;
        resume_filename = file.name;
      }

      const skillsArray = form.skills.split(",").map(s => s.trim()).filter(Boolean);

      // Upsert resume record (one per candidate)
      const { error: dbError } = await supabase
        .from("resumes")
        .upsert({
          candidate_id: user.id,
          candidate_email: user.email,
          candidate_name: form.candidate_name,
          college: form.college,
          role: form.role,
          location: form.location,
          experience: form.experience,
          skills: skillsArray,
          visible_to_recruiters: form.visible_to_recruiters,
          ...(resume_url ? { resume_url, resume_filename } : {}),
          updated_at: new Date().toISOString(),
        }, { onConflict: "candidate_id" });

      if (dbError) throw new Error(dbError.message);
      setStep("done");
      setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong.");
      setStep("form");
    }
  };

  const experienceOpts = ["Fresher", "Intern", "1 yr", "2 yr", "3+ yr"];

  // ─── Done state ───────────────────────────────────────
  if (step === "done") {
    return h("div", { className: "ru-overlay", onClick: onClose },
      h("div", { className: "ru-modal", onClick: e => e.stopPropagation() },
        h("div", { className: "ru-done-state" },
          h("div", { className: "ru-done-icon" }, "✓"),
          h("h3", null, "Profile Saved!"),
          h("p", null, "Recruiters on PrepMate can now discover your profile.")
        )
      )
    );
  }

  // ─── Uploading state ──────────────────────────────────
  if (step === "uploading") {
    return h("div", { className: "ru-overlay", onClick: onClose },
      h("div", { className: "ru-modal", onClick: e => e.stopPropagation() },
        h("div", { className: "ru-done-state" },
          h("div", { className: "ru-spinner" }),
          h("h3", null, "Saving your profile..."),
          h("p", null, "This will just take a moment.")
        )
      )
    );
  }

  // ─── Form state ───────────────────────────────────────
  return h("div", { className: "ru-overlay", onClick: onClose },
    h("div", { className: "ru-modal", onClick: e => e.stopPropagation() },
      // Header
      h("div", { className: "ru-modal-header" },
        h("div", null,
          h("h2", { className: "ru-modal-title" }, "Upload Your Resume"),
          h("p", { className: "ru-modal-sub" }, "Make your profile visible to top recruiters on PrepMate")
        ),
        h("button", { className: "ru-close-btn", onClick: onClose }, "✕")
      ),

      // Body
      h("div", { className: "ru-modal-body" },

        // Drop zone
        h("div", {
          className: `ru-dropzone ${dragOver ? "ru-dropzone-over" : ""} ${file ? "ru-dropzone-filled" : ""}`,
          onDragOver: e => { e.preventDefault(); setDragOver(true); },
          onDragLeave: () => setDragOver(false),
          onDrop: handleDrop,
          onClick: () => document.getElementById("ru-file-input").click(),
        },
          h("input", {
            id: "ru-file-input", type: "file", accept: ".pdf", style: { display: "none" },
            onChange: e => handleFile(e.target.files[0])
          }),
          file
            ? h("div", { className: "ru-file-info" },
                h("div", { className: "ru-file-icon" }, "📄"),
                h("div", null,
                  h("div", { className: "ru-file-name" }, file.name),
                  h("div", { className: "ru-file-size" }, `${(file.size / 1024).toFixed(0)} KB`)
                ),
                h("button", {
                  className: "ru-file-remove",
                  onClick: e => { e.stopPropagation(); setFile(null); }
                }, "✕")
              )
            : h("div", { className: "ru-dropzone-inner" },
                h("div", { className: "ru-drop-icon" }, "☁"),
                h("div", { className: "ru-drop-text" }, "Drop your PDF here or click to browse"),
                h("div", { className: "ru-drop-hint" }, "PDF only · Max 5 MB · (Optional)")
              )
        ),

        // Form grid
        h("div", { className: "ru-form-grid" },
          h("div", { className: "ru-field" },
            h("label", null, "Full Name *"),
            h("input", {
              placeholder: "Your full name",
              value: form.candidate_name,
              onChange: e => setForm(f => ({ ...f, candidate_name: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", null, "Desired Role *"),
            h("input", {
              placeholder: "e.g. Frontend Developer",
              value: form.role,
              onChange: e => setForm(f => ({ ...f, role: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", null, "College / University"),
            h("input", {
              placeholder: "e.g. IIT Bombay",
              value: form.college,
              onChange: e => setForm(f => ({ ...f, college: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", null, "Location"),
            h("input", {
              placeholder: "e.g. Bengaluru",
              value: form.location,
              onChange: e => setForm(f => ({ ...f, location: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", null, "Experience"),
            h("select", {
              value: form.experience,
              onChange: e => setForm(f => ({ ...f, experience: e.target.value }))
            },
              experienceOpts.map(opt => h("option", { key: opt, value: opt }, opt))
            )
          ),
          h("div", { className: "ru-field ru-field-full" },
            h("label", null, "Skills ", h("span", { className: "ru-label-hint" }, "(comma-separated)")),
            h("input", {
              placeholder: "React, Node.js, Python, Figma...",
              value: form.skills,
              onChange: e => setForm(f => ({ ...f, skills: e.target.value }))
            })
          ),
        ),

        // Visibility toggle
        h("div", { className: "ru-visibility-row" },
          h("div", null,
            h("div", { className: "ru-vis-title" }, "Visible to Recruiters"),
            h("div", { className: "ru-vis-sub" }, "Let companies on PrepMate discover and contact you")
          ),
          h("div", {
            className: `ru-toggle ${form.visible_to_recruiters ? "ru-toggle-on" : ""}`,
            onClick: () => setForm(f => ({ ...f, visible_to_recruiters: !f.visible_to_recruiters }))
          })
        ),

        // Error
        errorMsg && h("div", { className: "ru-error" }, errorMsg)
      ),

      // Footer
      h("div", { className: "ru-modal-footer" },
        h("button", { className: "ru-btn-ghost", onClick: onClose }, "Cancel"),
        h("button", { className: "ru-btn-primary", onClick: handleSubmit },
          "Save Profile & Upload"
        )
      )
    )
  );
}

/* ─── Main Dashboard ─────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeRecord, setResumeRecord] = useState(null); // existing resume

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchMyResume(user.id);
      }
    });
  }, []);

  const fetchMyResume = async (uid) => {
    const { data } = await supabase.from("resumes").select("*").eq("candidate_id", uid).maybeSingle();
    if (data) setResumeRecord(data);
  };

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
        h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" })
      ),
      badge: "Most Popular",
    },
    {
      id: "resume",
      tag: "Module 02",
      title: "Resume Analyzer",
      subtitle: "Parse. Score. Improve.",
      description:
        "Upload your resume and let our AI dissect it from every angle. We analyze your formatting, content quality, keyword density, and ATS compatibility. You'll receive an ATS score, section-by-section feedback, and an improved version of your resume tailored for modern applicant tracking systems.",
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
        h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" })
      ),
      badge: "Smart AI",
    },
    {
      id: "roadmap",
      tag: "Module 03",
      title: "Skill Gap & Roadmap",
      subtitle: "Compare. Identify. Grow.",
      description:
        "Paste any Job Description and let our AI compare it against your resume to find exactly where you stand. It identifies missing technical skills, tools, and experiences — then generates a personalized learning roadmap with resources, milestones, and timelines to help you close the gap.",
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
        h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" })
      ),
      badge: "New",
    },
    {
      id: "recruiter-profile",
      tag: "Module 04",
      title: "Recruiter Profile",
      subtitle: "Upload. Get Discovered. Land Jobs.",
      description:
        "Upload your resume and build a profile that's visible to recruiters hiring on PrepMate. Top companies browse our student pool daily and shortlist candidates for interviews. One upload — multiple opportunities.",
      highlights: [
        "Visible to PrepMate recruiters",
        "Shortlisted for open positions",
        "Resume stored securely",
        "Update anytime",
      ],
      cta: resumeRecord ? "Update Profile" : "Upload Resume",
      path: null, // handled via modal
      accent: "#f7971e",
      accentSecondary: "#ffd200",
      icon: h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
        h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" })
      ),
      badge: resumeRecord ? "✓ Uploaded" : "Get Hired",
      isRecruiterProfile: true,
    },
  ];

  return h("div", { className: "dashboard-container" },
    h("div", { className: "orb orb-1" }),
    h("div", { className: "orb orb-2" }),
    h("div", { className: "orb orb-3" }),

    // Header
    h("header", { className: "dashboard-header" },
      h("div", { className: "dashboard-brand" },
        h("div", { className: "dashboard-brand-icon" },
          h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": "true" },
            h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" })
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
      h("div", { className: "dashboard-header-actions" },
        // Resume status pill
        resumeRecord && h("div", { className: "dashboard-resume-pill", onClick: () => setShowResumeModal(true) },
          h("span", { className: "dashboard-resume-dot" }),
          "Profile Live"
        ),
        h("button", { className: "logout-btn", onClick: handleLogout },
          h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", width: "16", height: "16" },
            h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" })
          ),
          "Logout"
        )
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
          "Four powerful modules designed to take you from applicant to offer letter. Practice interviews, perfect your resume, close skill gaps, and get discovered by recruiters."
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
        h("div", { className: "modules-grid modules-grid-4" },
          modules.map((mod, index) =>
            h("div", {
              key: mod.id,
              className: `module-card ${mod.isRecruiterProfile && resumeRecord ? "module-card-active" : ""}`,
              style: { "--accent": mod.accent, "--accent-2": mod.accentSecondary, "--delay": `${index * 0.12}s` }
            },
              h("div", { className: "module-card-glow" }),
              h("div", { className: "module-card-top" },
                h("div", { className: "module-icon-wrap", style: { background: `linear-gradient(135deg, ${mod.accent}, ${mod.accentSecondary})`, boxShadow: `0 10px 30px ${mod.accent}40` } }, mod.icon),
                h("div", { className: "module-meta" },
                  h("span", { className: "module-tag" }, mod.tag),
                  mod.badge && h("span", { className: `module-badge ${mod.isRecruiterProfile && resumeRecord ? "module-badge-success" : ""}` }, mod.badge)
                )
              ),
              h("h2", { className: "module-title" }, mod.title),
              h("p", { className: "module-subtitle" }, mod.subtitle),
              h("div", { className: "module-divider" }),
              h("p", { className: "module-description" }, mod.description),
              h("ul", { className: "module-highlights" },
                mod.highlights.map((highlight, i) =>
                  h("li", { key: i, className: "module-highlight-item" },
                    h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", className: "check-icon" },
                      h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.5, d: "M5 13l4 4L19 7" })
                    ),
                    highlight
                  )
                )
              ),
              h("button", {
                className: "module-cta",
                style: { background: `linear-gradient(135deg, ${mod.accent}, ${mod.accentSecondary})`, boxShadow: `0 10px 30px ${mod.accent}40` },
                onClick: () => {
                  if (mod.isRecruiterProfile) { setShowResumeModal(true); }
                  else if (mod.path) navigate(mod.path);
                }
              },
                mod.cta,
                h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", width: "18", height: "18" },
                  h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 7l5 5m0 0l-5 5m5-5H6" })
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
            ...(resumeRecord ? [{ label: "Resume uploaded — visible to recruiters", time: new Date(resumeRecord.updated_at || resumeRecord.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), color: "#f7971e" }] : []),
            { label: "Completed Technical Interview", time: "2 hours ago", color: "#667eea" },
            { label: "Uploaded Resume for Analysis", time: "Yesterday", color: "#f093fb" },
            { label: "Generated Skill Roadmap — Frontend Dev", time: "2 days ago", color: "#43e97b" },
          ].slice(0, 4).map((item, i) =>
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
    ),

    // Resume Upload Modal
    showResumeModal && h(ResumeUploadModal, {
      user,
      onClose: () => setShowResumeModal(false),
      onSuccess: () => user && fetchMyResume(user.id),
    })
  );
}