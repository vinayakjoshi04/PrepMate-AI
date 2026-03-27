import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { createElement as h, useState, useEffect, useCallback } from "react";
import "./dashboard.css";

/* ─── Resume Upload Modal ────────────────────────────── */
function ResumeUploadModal({ user, onClose, onSuccess }) {
  const [step, setStep] = useState("form");
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

  return h("div", { className: "ru-overlay", onClick: onClose },
    h("div", { className: "ru-modal", onClick: e => e.stopPropagation() },
      h("div", { className: "ru-modal-header" },
        h("div", null,
          h("h2", { className: "ru-modal-title" }, "Upload Your Resume"),
          h("p", { className: "ru-modal-sub" }, "Make your profile visible to top recruiters on PrepMate")
        ),
        h("button", { className: "ru-close-btn", onClick: onClose }, "✕")
      ),
      h("div", { className: "ru-modal-body" },
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
        errorMsg && h("div", { className: "ru-error" }, errorMsg)
      ),
      h("div", { className: "ru-modal-footer" },
        h("button", { className: "ru-btn-ghost", onClick: onClose }, "Cancel"),
        h("button", { className: "ru-btn-primary", onClick: handleSubmit }, "Save Profile & Upload")
      )
    )
  );
}

/* ─── NEW: Chat / Messaging Modal ───────────────────── */
function ChatModal({ invite, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recruiterInfo, setRecruiterInfo] = useState(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("invite_messages")
      .select("*")
      .eq("invite_id", invite.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  }, [invite.id]);

  // NEW: Fetch recruiter information
  const fetchRecruiterInfo = useCallback(async () => {
    if (!invite.recruiter_id) return;
    
    const { data } = await supabase
      .from("recruiters")
      .select("company_name, full_name")
      .eq("id", invite.recruiter_id)
      .maybeSingle();
    
    if (data) {
      setRecruiterInfo(data);
    }
  }, [invite.recruiter_id]);

  useEffect(() => {
    fetchMessages();
    fetchRecruiterInfo();
    // Real-time subscription
    const channel = supabase
      .channel(`chat:${invite.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "invite_messages",
        filter: `invite_id=eq.${invite.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchMessages, fetchRecruiterInfo, invite.id]);

  // Mark invite as read when candidate opens chat
  useEffect(() => {
    if (invite.status === "pending") {
      supabase.from("interview_invites")
        .update({ status: "accepted", candidate_read: true })
        .eq("id", invite.id)
        .then(() => {});
    }
  }, [invite.id, invite.status]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    await supabase.from("invite_messages").insert({
      invite_id: invite.id,
      sender_id: user.id,
      sender_role: "candidate",
      content: text,
    });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get recruiter display name and company
  const getRecruiterDisplayName = () => {
    if (recruiterInfo?.full_name) return recruiterInfo.full_name;
    if (invite.recruiter_email) {
      return invite.recruiter_email.split("@")[0]
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return "Recruiter";
  };

  const getCompanyName = () => {
    if (recruiterInfo?.company_name) return recruiterInfo.company_name;
    if (invite.recruiter_email) {
      const domain = invite.recruiter_email.split("@")[1]?.split(".")[0] || "Company";
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return "Company";
  };

  const recruiterName = getRecruiterDisplayName();
  const companyName = getCompanyName();
  const jobTitle = invite.job_posts?.title || "Interview Opportunity";

  return h("div", { className: "chat-overlay", onClick: onClose },
    h("div", { className: "chat-modal", onClick: e => e.stopPropagation() },
      // Header
      h("div", { className: "chat-header" },
        h("div", { className: "chat-header-left" },
          h("div", { className: "chat-avatar" },
            recruiterName.charAt(0).toUpperCase()
          ),
          h("div", null,
            h("div", { className: "chat-header-name" }, recruiterName),
            h("div", { className: "chat-header-role" }, `${companyName} · ${jobTitle}`)
          )
        ),
        h("button", { className: "ru-close-btn", onClick: onClose }, "✕")
      ),

      // Invite context banner
      h("div", { className: "chat-invite-banner" },
        h("div", { className: "chat-invite-icon" }, "💼"),
        h("div", null,
          h("div", { className: "chat-invite-title" }, jobTitle),
          h("div", { className: "chat-invite-sub" }, `Interview invitation from ${companyName}`)
        )
      ),

      // Messages (rest remains the same)
      h("div", { className: "chat-messages", id: "chat-scroll" },
        loading
          ? h("div", { className: "chat-loading" },
              h("div", { className: "ru-spinner" })
            )
          : messages.length === 0
            ? h("div", { className: "chat-empty" },
                h("div", { className: "chat-empty-icon" }, "💬"),
                h("p", null, "Start the conversation by replying to the invite below")
              )
            : messages.map((msg, i) => {
                const isCandidate = msg.sender_role === "candidate";
                return h("div", {
                  key: msg.id || i,
                  className: `chat-bubble-wrap ${isCandidate ? "chat-bubble-right" : "chat-bubble-left"}`
                },
                  h("div", { className: `chat-bubble ${isCandidate ? "chat-bubble-me" : "chat-bubble-them"}` },
                    msg.content
                  ),
                  h("div", { className: "chat-bubble-time" },
                    new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                  )
                );
              })
      ),

      // Input (rest remains the same)
      h("div", { className: "chat-input-row" },
        h("textarea", {
          className: "chat-input",
          placeholder: "Type your message… (Enter to send)",
          value: input,
          onChange: e => setInput(e.target.value),
          onKeyDown: handleKeyDown,
          rows: 2,
        }),
        h("button", {
          className: `chat-send-btn ${sending ? "chat-send-sending" : ""}`,
          onClick: handleSend,
          disabled: sending || !input.trim(),
        },
          sending
            ? h("div", { className: "ru-spinner", style: { width: "18px", height: "18px", borderWidth: "2px" } })
            : h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", width: "20", height: "20" },
                h("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
                h("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })
              )
        )
      )
    )
  );
}

/* ─── NEW: Invites Panel ─────────────────────────────── */
function InvitesPanel({ invites, loading, onOpenChat, onDecline }) {
  if (loading) {
    return h("div", { className: "invites-loading" },
      h("div", { className: "ru-spinner", style: { width: "28px", height: "28px" } })
    );
  }

  if (invites.length === 0) {
    return h("div", { className: "invites-empty" },
      h("div", { className: "invites-empty-icon" }, "📭"),
      h("h4", null, "No invites yet"),
      h("p", null, "Once a recruiter invites you, it will appear here.")
    );
  }

  return h("div", { className: "invites-list" },
    invites.map(invite =>
      h("div", {
        key: invite.id,
        className: `invite-item ${invite.status === "pending" ? "invite-item-new" : ""}`
      },
        // Status dot
        invite.status === "pending" && h("div", { className: "invite-unread-dot" }),

        h("div", { className: "invite-item-left" },
          h("div", { className: "invite-company-av" },
            (invite.recruiter_email?.split("@")[1]?.charAt(0) || "R").toUpperCase()
          ),
          h("div", null,
            h("div", { className: "invite-company-name" },
              (() => {
                const domain = invite.recruiter_email?.split("@")[1]?.split(".")[0] || "Company";
                return domain.charAt(0).toUpperCase() + domain.slice(1);
              })()
            ),
            h("div", { className: "invite-job-title" }, invite.job_posts?.title || "Interview Opportunity"),
            h("div", { className: "invite-preview" }, invite.message?.slice(0, 80) + (invite.message?.length > 80 ? "…" : "")),
            h("div", { className: "invite-time" },
              new Date(invite.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            )
          )
        ),

        h("div", { className: "invite-item-actions" },
          h("span", {
            className: `invite-status-badge invite-status-${invite.status}`
          }, invite.status === "pending" ? "New" : invite.status === "accepted" ? "Replied" : "Declined"),
          h("button", {
            className: "invite-reply-btn",
            onClick: () => onOpenChat(invite)
          }, "💬 Reply"),
          invite.status === "pending" && h("button", {
            className: "invite-decline-btn",
            onClick: () => onDecline(invite.id)
          }, "Decline")
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
  const [resumeRecord, setResumeRecord] = useState(null);

  // NEW: invites & chat state
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [showInvitesPanel, setShowInvitesPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchMyResume(user.id);
        fetchMyInvites(user.id);
      }
    });
  }, []);

  const fetchMyResume = async (uid) => {
    const { data } = await supabase.from("resumes").select("*").eq("candidate_id", uid).maybeSingle();
    if (data) setResumeRecord(data);
  };

  const fetchMyInvites = async (uid) => {
    setInvitesLoading(true);
    const { data } = await supabase
      .from("interview_invites")
      .select("*, job_posts(title)")
      .eq("candidate_id", uid)
      .order("created_at", { ascending: false });
    if (data) {
      setInvites(data);
      setUnreadCount(data.filter(i => i.status === "pending" && !i.candidate_read).length);
    }
    setInvitesLoading(false);
  };

  // Real-time: new invites for this candidate
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`invites:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "interview_invites",
        filter: `candidate_id=eq.${user.id}`,
      }, (payload) => {
        setInvites(prev => [payload.new, ...prev]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleDeclineInvite = async (inviteId) => {
    await supabase.from("interview_invites")
      .update({ status: "declined" })
      .eq("id", inviteId);
    setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, status: "declined" } : i));
  };

  const handleOpenChat = (invite) => {
    setActiveChat(invite);
    // Mark unread cleared
    if (invite.status === "pending") {
      setUnreadCount(c => Math.max(0, c - 1));
    }
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
        "Jump into a fully simulated AI-powered interview session tailored to your job role and experience level. Our AI interviewer asks real-world technical and behavioral questions, evaluates your answers in real time, and provides detailed feedback — just like a real interviewer would.",
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
        "Upload your resume and let our AI dissect it from every angle. We analyze your formatting, content quality, keyword density, and ATS compatibility. You'll receive an ATS score, section-by-section feedback, and an improved version of your resume.",
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
        "Paste any Job Description and let our AI compare it against your resume to find exactly where you stand. It identifies missing technical skills, tools, and experiences — then generates a personalized learning roadmap.",
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
      path: null,
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
        // NEW: Invites bell
        h("button", {
          className: "invites-bell-btn",
          onClick: () => setShowInvitesPanel(p => !p),
          title: "Interview Invites"
        },
          h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", width: "20", height: "20" },
            h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" }),
            h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13.73 21a2 2 0 01-3.46 0" })
          ),
          unreadCount > 0 && h("span", { className: "invites-bell-badge" }, unreadCount)
        ),
        h("button", { className: "logout-btn", onClick: handleLogout },
          h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", width: "16", height: "16" },
            h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" })
          ),
          "Logout"
        )
      )
    ),

    // NEW: Invites Sidebar Panel
    showInvitesPanel && h("div", {
      className: "invites-panel-overlay",
      onClick: () => setShowInvitesPanel(false)
    }),
    h("aside", { className: `invites-panel ${showInvitesPanel ? "invites-panel-open" : ""}` },
      h("div", { className: "invites-panel-header" },
        h("div", null,
          h("h3", { className: "invites-panel-title" }, "Interview Invites"),
          h("p", { className: "invites-panel-sub" }, `${invites.length} total · ${unreadCount} new`)
        ),
        h("button", { className: "ru-close-btn", onClick: () => setShowInvitesPanel(false) }, "✕")
      ),
      h(InvitesPanel, {
        invites,
        loading: invitesLoading,
        onOpenChat: (invite) => {
          handleOpenChat(invite);
          setShowInvitesPanel(false);
        },
        onDecline: handleDeclineInvite,
      })
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
            h("span", { className: "hero-stat-value" }, invites.length || "0"),
            h("span", { className: "hero-stat-label" }, "Invites Received")
          )
        )
      ),

      // NEW: Invites quick strip (if any)
      invites.length > 0 && h("section", { className: "invites-strip-section" },
        h("div", { className: "invites-strip-header" },
          h("div", { className: "invites-strip-title" },
            h("span", { className: "invites-strip-icon" }, "🔔"),
            "Recruiter Invites",
            unreadCount > 0 && h("span", { className: "invites-strip-new" }, `${unreadCount} new`)
          ),
          h("button", {
            className: "invites-strip-view-all",
            onClick: () => setShowInvitesPanel(true)
          }, "View All →")
        ),
        h("div", { className: "invites-strip-list" },
          invites.slice(0, 3).map(invite =>
            h("div", {
              key: invite.id,
              className: `invites-strip-card ${invite.status === "pending" ? "invites-strip-card-new" : ""}`,
              onClick: () => handleOpenChat(invite)
            },
              h("div", { className: "invites-strip-card-left" },
                h("div", { className: "invites-strip-av" },
                  (invite.recruiter_email?.split("@")[1]?.charAt(0) || "R").toUpperCase()
                ),
                h("div", null,
                  h("div", { className: "invites-strip-company" },
                    (() => {
                      const d = invite.recruiter_email?.split("@")[1]?.split(".")[0] || "Company";
                      return d.charAt(0).toUpperCase() + d.slice(1);
                    })()
                  ),
                  h("div", { className: "invites-strip-job" }, invite.job_posts?.title || "Interview Opportunity"),
                  h("div", { className: "invites-strip-date" },
                    new Date(invite.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                  )
                )
              ),
              h("div", { className: "invites-strip-card-right" },
                h("span", { className: `invites-strip-status invites-strip-status-${invite.status}` },
                  invite.status === "pending" ? "New" : invite.status === "accepted" ? "Replied" : "Declined"
                ),
                h("button", { className: "invites-strip-reply" }, "💬 Reply")
              ),
              invite.status === "pending" && h("div", { className: "invites-strip-dot" })
            )
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
            ...(invites.slice(0, 2).map(inv => ({
              label: `Interview invite from ${(inv.recruiter_email?.split("@")[1]?.split(".")[0] || "recruiter")} — ${inv.job_posts?.title || "role"}`,
              time: new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
              color: "#43e97b"
            }))),
            { label: "Completed Technical Interview", time: "2 hours ago", color: "#667eea" },
            { label: "Uploaded Resume for Analysis", time: "Yesterday", color: "#f093fb" },
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
    }),

    // NEW: Chat Modal
    activeChat && h(ChatModal, {
      invite: activeChat,
      user,
      onClose: () => {
        setActiveChat(null);
        fetchMyInvites(user.id);
      }
    })
  );
}