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

function JobBoardSection({ jobs, loading, onApply, appliedJobIds = [] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
 
  const types = ["all", "Full-time", "Part-time", "Internship", "Contract", "Freelance"];
 
  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (j.title || "").toLowerCase().includes(q) ||
      (j.location || "").toLowerCase().includes(q) ||
      (j.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (j.description || "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || j.type === typeFilter;
    return matchesSearch && matchesType && j.active !== false;
  });
 
  if (loading) {
    return h("div", { className: "jb-loading" },
      h("div", { className: "ru-spinner", style: { width: "32px", height: "32px" } }),
      h("p", null, "Loading job posts…")
    );
  }
 
  return h("div", { className: "jb-wrap" },
 
    // ── Toolbar
    h("div", { className: "jb-toolbar" },
      h("div", { className: "jb-search-wrap" },
        h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", className: "jb-search-icon" },
          h("circle", { cx: "11", cy: "11", r: "8" }),
          h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
        ),
        h("input", {
          className: "jb-search-input",
          placeholder: "Search by title, skill, or location…",
          value: search,
          onChange: e => setSearch(e.target.value),
        }),
        search && h("button", {
          className: "jb-search-clear",
          onClick: () => setSearch(""),
        }, "✕")
      ),
      h("div", { className: "jb-type-pills" },
        types.map(t =>
          h("button", {
            key: t,
            className: `jb-type-pill ${typeFilter === t ? "jb-type-pill-active" : ""}`,
            onClick: () => setTypeFilter(t),
          }, t === "all" ? "All Types" : t)
        )
      )
    ),
 
    // ── Results count
    h("div", { className: "jb-count" },
      filtered.length === 0
        ? "No jobs match your filters"
        : `${filtered.length} open position${filtered.length !== 1 ? "s" : ""}`
    ),
 
    // ── Cards
    filtered.length === 0
      ? h("div", { className: "jb-empty" },
          h("div", { className: "jb-empty-icon" }, "🔍"),
          h("h4", null, "No openings found"),
          h("p", null, "Try adjusting your search or filters.")
        )
      : h("div", { className: "jb-list" },
          filtered.map(job =>
            h("div", {
              key: job.id,
              className: `jb-card ${expanded === job.id ? "jb-card-expanded" : ""}`,
            },
              // Card Header
              h("div", { className: "jb-card-header" },
                h("div", { className: "jb-card-left" },
                  h("div", { className: "jb-company-av" },
                    (() => {
                      // Try to derive initial from recruiter email domain or title
                      const letter = (job.company_name || job.title || "J").charAt(0).toUpperCase();
                      return letter;
                    })()
                  ),
                  h("div", null,
                    h("div", { className: "jb-job-title" }, job.title),
                    h("div", { className: "jb-job-meta" },
                      job.company_name && h("span", null, job.company_name),
                      job.company_name && h("span", { className: "jb-dot" }, "·"),
                      h("span", null, job.location || "Location not specified"),
                      h("span", { className: "jb-dot" }, "·"),
                      h("span", null, job.type || "Full-time"),
                      job.salary && h("span", { className: "jb-dot" }, "·"),
                      job.salary && h("span", { className: "jb-salary" }, job.salary)
                    ),
                    h("div", { className: "jb-tags" },
                      (job.tags || []).slice(0, 4).map((tag, i) =>
                        h("span", { key: i, className: "jb-tag" }, tag)
                      )
                    )
                  )
                ),
                h("div", { className: "jb-card-right" },
                  job.deadline && h("div", { className: "jb-deadline" },
                    h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", width: "12", height: "12" },
                      h("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }),
                      h("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
                      h("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
                      h("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
                    ),
                    "Due " + new Date(job.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                  ),
                  h("div", { className: "jb-posted-time" },
                    new Date(job.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  ),
                  h("button", {
                    className: "jb-expand-btn",
                    onClick: () => setExpanded(expanded === job.id ? null : job.id),
                  }, expanded === job.id ? "Show less ▲" : "View details ▼")
                )
              ),
 
              // Expanded Details
              expanded === job.id && h("div", { className: "jb-card-body" },
                h("div", { className: "jb-detail-grid" },
                  job.description && h("div", { className: "jb-detail-block" },
                    h("div", { className: "jb-detail-label" }, "About the role"),
                    h("p", { className: "jb-detail-text" }, job.description)
                  ),
                  job.requirements && h("div", { className: "jb-detail-block" },
                    h("div", { className: "jb-detail-label" }, "Requirements"),
                    h("p", { className: "jb-detail-text" }, job.requirements)
                  ),
                  job.perks && h("div", { className: "jb-detail-block" },
                    h("div", { className: "jb-detail-label" }, "Perks & benefits"),
                    h("p", { className: "jb-detail-text" }, job.perks)
                  )
                ),
                h("div", { className: "jb-card-footer" },
                  h("div", { className: "jb-footer-left" },
                    job.salary && h("span", { className: "jb-salary-big" }, "💰 " + job.salary),
                    h("span", { className: "jb-type-badge" }, job.type || "Full-time")
                  ),
                  h("button", {
                    className: `jb-apply-btn ${appliedJobIds.includes(job.id) ? "jb-apply-btn-done" : ""}`,
                    onClick: () => !appliedJobIds.includes(job.id) && onApply(job),
                    disabled: appliedJobIds.includes(job.id),
                  },
                    appliedJobIds.includes(job.id)
                      ? "✓ Applied"
                      : h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", width: "16", height: "16" },
                          h("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
                          h("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })
                        ),
                    appliedJobIds.includes(job.id) ? null : "Express Interest"
                  )
                )
              )
            )
          )
        )
  );
}

/* ─── Shortlist Celebration Modal ───────────────────── */
function ShortlistCelebrationModal({ data, onClose }) {
  return h("div", {
    className: "ru-overlay",
    onClick: onClose,
    style: { zIndex: 600 }
  },
    h("div", {
      className: "ru-modal",
      onClick: e => e.stopPropagation(),
      style: { maxWidth: 500, textAlign: "center" }
    },
      h("div", { className: "ru-done-state", style: { padding: "48px 36px", gap: 20 } },
        // Animated stars
        h("div", { style: { fontSize: 56, lineHeight: 1 } }, "🎉"),
        h("div", {
          style: {
            width: 80, height: 80,
            background: "linear-gradient(135deg, rgba(67,233,123,0.2), rgba(67,233,123,0.05))",
            border: "2px solid rgba(67,233,123,0.5)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, margin: "0 auto",
          }
        }, "⭐"),
        h("div", null,
          h("h2", {
            style: {
              fontSize: 26, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.5px", marginBottom: 10,
              fontFamily: "Inter, sans-serif",
              background: "linear-gradient(135deg, #43e97b, #38f9d7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }
          }, "You've Been Shortlisted!"),
          h("p", {
            style: {
              fontSize: 16, color: "#a0aec0",
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.6, marginBottom: 8,
            }
          },
            "Congratulations! A recruiter has shortlisted you for "
          ),
          h("p", {
            style: {
              fontSize: 18, fontWeight: 700, color: "#fff",
              fontFamily: "Inter, sans-serif", marginBottom: 16,
            }
          }, `"${data.jobTitle}"`),
          h("p", {
            style: {
              fontSize: 14, color: "#718096",
              fontFamily: "Inter, sans-serif", lineHeight: 1.6,
            }
          },
            "Check your Interview Invites for a message from the recruiter. They may be reaching out to schedule your next steps."
          )
        ),
        h("div", {
          style: {
            background: "rgba(67,233,123,0.06)",
            border: "1px solid rgba(67,233,123,0.2)",
            borderRadius: 12, padding: "14px 20px",
            width: "100%",
          }
        },
          h("div", {
            style: { fontSize: 12, color: "#43e97b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4, fontFamily: "Inter, sans-serif" }
          }, "What's next?"),
          h("div", {
            style: { fontSize: 14, color: "#a0aec0", fontFamily: "Inter, sans-serif" }
          }, "Watch for a message in your Invites tab. The recruiter will contact you to discuss next steps.")
        ),
        h("button", {
          className: "module-cta",
          style: {
            background: "linear-gradient(135deg, #43e97b, #38f9d7)",
            boxShadow: "0 10px 30px rgba(67,233,123,0.3)",
            width: "100%", marginTop: 4,
          },
          onClick: onClose,
        }, "🎊 Amazing! Close")
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

  // Job Board
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showJobBoard, setShowJobBoard] = useState(false);
  const [applyToast, setApplyToast] = useState(null);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [shortlistCelebration, setShortlistCelebration] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchMyResume(user.id);
        fetchMyInvites(user.id);
        fetchJobs();
        fetchMyApplications(user.id);
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

  const fetchJobs = async () => {
    setJobsLoading(true);
    const { data } = await supabase
      .from("job_posts")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (data) setJobs(data);
    setJobsLoading(false);
  };

  const fetchMyApplications = async (uid) => {
    if (!uid) return;
    const { data } = await supabase
      .from("applications")
      .select("job_post_id")
      .eq("candidate_id", uid);
    if (data) setAppliedJobIds(data.map(a => a.job_post_id));
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

  // Real-time: watch for shortlist via new invite INSERT (more reliable)
  useEffect(() => {
    if (!user) return;

    // Poll every 8 seconds as fallback for realtime
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, job_posts(title)")
        .eq("candidate_id", user.id)
        .eq("status", "shortlisted");
      
      if (data && data.length > 0) {
        const latest = data[data.length - 1];
        // Only show if we haven't shown it already (track in sessionStorage)
        const shownKey = `shortlist_shown_${latest.id}`;
        if (!sessionStorage.getItem(shownKey)) {
          sessionStorage.setItem(shownKey, "true");
          setShortlistCelebration({
            jobTitle: latest.job_posts?.title || "a position",
            jobPostId: latest.job_post_id,
          });
        }
      }
    }, 8000);

    // Also keep realtime as primary (no filter — more reliable)
    const channel = supabase
      .channel(`applications-watch:${user.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "applications",
      }, (payload) => {
        if (
          payload.new.candidate_id === user.id &&
          payload.new.status === "shortlisted"
        ) {
          const shownKey = `shortlist_shown_${payload.new.id}`;
          if (!sessionStorage.getItem(shownKey)) {
            sessionStorage.setItem(shownKey, "true");
            supabase
              .from("job_posts")
              .select("title")
              .eq("id", payload.new.job_post_id)
              .maybeSingle()
              .then(({ data: job }) => {
                setShortlistCelebration({
                  jobTitle: job?.title || "a position",
                  jobPostId: payload.new.job_post_id,
                });
              });
          }
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
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

  const handleApply = async (job) => {
    if (!user) return;
    const { data: resume } = await supabase
      .from("resumes")
      .select("*")
      .eq("candidate_id", user.id)
      .maybeSingle();

    const { error } = await supabase.from("applications").insert({
      job_post_id:     job.id,
      candidate_id:    user.id,
      candidate_name:  resume?.candidate_name  || user.user_metadata?.full_name || user.email.split("@")[0],
      candidate_email: user.email,
      resume_url:      resume?.resume_url      || null,
      resume_filename: resume?.resume_filename || null,
      skills:          resume?.skills          || [],
      experience:      resume?.experience      || null,
      college:         resume?.college         || null,
      location:        resume?.location        || null,
      role:            resume?.role            || null,
      status:          "new",
    });

    if (error) {
      if (error.code === "23505") {
        setApplyToast(`You've already applied for "${job.title}".`);
      } else {
        setApplyToast(`Something went wrong. Please try again.`);
      }
    } else {
      setAppliedJobIds(prev => [...prev, job.id]);
      setApplyToast(`Interest sent for "${job.title}"! The recruiter will be notified.`);
    }
    setTimeout(() => setApplyToast(null), 3500);
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
    {
      id: "job-board",
      tag: "Module 05",
      title: "Job Board",
      subtitle: "Browse. Apply. Get Hired.",
      description:
        "Browse all open positions posted by recruiters actively hiring on PrepMate. Filter by type, search by skill, and express interest directly — your profile is already on file.",
      highlights: [
        "Live recruiter postings",
        "Filter by role & type",
        "One-click express interest",
        "Deadline reminders",
      ],
      cta: "Browse Jobs",
      path: null,
      accent: "#4facfe",
      accentSecondary: "#00f2fe",
      icon: h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
        h("rect", { x: "2", y: "7", width: "20", height: "14", rx: "2", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5 }),
        h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" })
      ),
      badge: jobs.length > 0 ? `${jobs.length} Live` : "New",
      isJobBoard: true,
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

      // Job Board Quick Strip
      jobs.filter(j => j.active !== false).length > 0 &&
        h("section", { className: "jb-strip-section" },
          h("div", { className: "invites-strip-header" },
            h("div", { className: "invites-strip-title" },
              h("span", { className: "invites-strip-icon" }, "💼"),
              "Open Jobs",
              h("span", { className: "invites-strip-new" },
                `${jobs.filter(j => j.active !== false).length} live`
              )
            ),
            h("button", {
              className: "invites-strip-view-all",
              onClick: () => setShowJobBoard(true),
            }, "Browse All →")
          ),
          h("div", { className: "jb-strip-grid" },
            jobs.filter(j => j.active !== false).slice(0, 3).map(job =>
              h("div", {
                key: job.id,
                className: "jb-strip-card",
                onClick: () => setShowJobBoard(true),
              },
                h("div", { className: "jb-strip-av" },
                  (job.title || "J").charAt(0).toUpperCase()
                ),
                h("div", { className: "jb-strip-info" },
                  h("div", { className: "jb-strip-title" }, job.title),
                  h("div", { className: "jb-strip-meta" },
                    (job.location || "Remote") + " · " + (job.type || "Full-time") + (job.salary ? ` · ${job.salary}` : "")
                  ),
                  h("div", { className: "jb-strip-tags" },
                    (job.tags || []).slice(0, 3).map((t, i) =>
                      h("span", { key: i, className: "jb-tag" }, t)
                    )
                  )
                ),
                h("button", { className: "invites-strip-reply" }, "View →")
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
                  else if (mod.isJobBoard) { setShowJobBoard(true); }
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

    // Job Board Modal
    showJobBoard && h("div", { className: "jb-overlay", onClick: () => setShowJobBoard(false) },
      h("div", { className: "jb-modal", onClick: e => e.stopPropagation() },
        h("div", { className: "jb-modal-header" },
          h("div", null,
            h("h2", { className: "ru-modal-title" }, "Job Board"),
            h("p", { className: "ru-modal-sub" }, `${jobs.filter(j => j.active !== false).length} open positions from PrepMate recruiters`)
          ),
          h("button", { className: "ru-close-btn", onClick: () => setShowJobBoard(false) }, "✕")
        ),
        h("div", { className: "jb-modal-body" },
          h(JobBoardSection, {
            jobs,
            loading: jobsLoading,
            onApply: handleApply,
            appliedJobIds,
          })
        )
      )
    ),

    applyToast && h("div", { className: "jb-toast" },
      h("span", null, "✓ "),
      applyToast
    ),

    // Resume Upload Modal
    showResumeModal && h(ResumeUploadModal, {
      user,
      onClose: () => setShowResumeModal(false),
      onSuccess: () => user && fetchMyResume(user.id),
    }),

    // Shortlist Celebration
    shortlistCelebration && h(ShortlistCelebrationModal, {
      data: shortlistCelebration,
      onClose: () => setShortlistCelebration(null),
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