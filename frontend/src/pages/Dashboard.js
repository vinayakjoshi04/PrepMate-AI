import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { createElement as h, useState, useEffect, useCallback, useRef } from "react";
import "./dashboard.css";

/* ─── helpers ─────────────────────────────────────────
   Small pure helpers pulled out of the component bodies
   so the same logic isn't duplicated in three places. */
const titleCase = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const nameFromEmail = (email) => {
  if (!email) return null;
  return email
    .split("@")[0]
    .split(/[._-]/)
    .map(titleCase)
    .join(" ");
};

const companyFromEmail = (email) => {
  if (!email) return null;
  const domain = email.split("@")[1]?.split(".")[0];
  return domain ? titleCase(domain) : null;
};

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
    const isPdfExt = f.name.toLowerCase().endsWith(".pdf");
    const isPdfMime = f.type === "application/pdf";
    if (!isPdfExt || (f.type && !isPdfMime)) {
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
    if (!form.candidate_name.trim() || !form.role.trim()) {
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
          .upload(path, file, { upsert: true, contentType: file.type || "application/pdf" });
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
          candidate_name: form.candidate_name.trim(),
          college: form.college.trim(),
          role: form.role.trim(),
          location: form.location.trim(),
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
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStep("form");
    }
  };

  const experienceOpts = ["Fresher", "Intern", "1 yr", "2 yr", "3+ yr"];

  if (step === "done") {
    return h("div", { className: "ru-overlay", role: "dialog", "aria-modal": "true", onClick: onClose },
      h("div", { className: "ru-modal", onClick: e => e.stopPropagation() },
        h("div", { className: "ru-done-state" },
          h("div", { className: "ru-done-icon", "aria-hidden": "true" }, "✓"),
          h("h3", null, "Profile Saved!"),
          h("p", null, "Recruiters on PrepMate can now discover your profile.")
        )
      )
    );
  }

  if (step === "uploading") {
    return h("div", { className: "ru-overlay", role: "dialog", "aria-modal": "true", "aria-busy": "true", onClick: onClose },
      h("div", { className: "ru-modal", onClick: e => e.stopPropagation() },
        h("div", { className: "ru-done-state" },
          h("div", { className: "ru-spinner", role: "status", "aria-label": "Saving" }),
          h("h3", null, "Saving your profile..."),
          h("p", null, "This will just take a moment.")
        )
      )
    );
  }

  return h("div", { className: "ru-overlay", role: "dialog", "aria-modal": "true", "aria-labelledby": "ru-title", onClick: onClose },
    h("div", { className: "ru-modal", onClick: e => e.stopPropagation() },
      h("div", { className: "ru-modal-header" },
        h("div", null,
          h("h2", { className: "ru-modal-title", id: "ru-title" }, "Upload Your Resume"),
          h("p", { className: "ru-modal-sub" }, "Make your profile visible to top recruiters on PrepMate")
        ),
        h("button", { type: "button", className: "ru-close-btn", "aria-label": "Close dialog", onClick: onClose }, "✕")
      ),
      h("div", { className: "ru-modal-body" },
        h("div", {
          className: `ru-dropzone ${dragOver ? "ru-dropzone-over" : ""} ${file ? "ru-dropzone-filled" : ""}`,
          role: "button",
          tabIndex: 0,
          "aria-label": "Upload resume PDF",
          onDragOver: e => { e.preventDefault(); setDragOver(true); },
          onDragLeave: () => setDragOver(false),
          onDrop: handleDrop,
          onClick: () => document.getElementById("ru-file-input").click(),
          onKeyDown: e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById("ru-file-input").click();
            }
          },
        },
          h("input", {
            id: "ru-file-input", type: "file", accept: ".pdf,application/pdf", style: { display: "none" },
            onChange: e => handleFile(e.target.files[0])
          }),
          file
            ? h("div", { className: "ru-file-info" },
                h("div", { className: "ru-file-icon", "aria-hidden": "true" }, "📄"),
                h("div", null,
                  h("div", { className: "ru-file-name" }, file.name),
                  h("div", { className: "ru-file-size" }, `${(file.size / 1024).toFixed(0)} KB`)
                ),
                h("button", {
                  type: "button",
                  className: "ru-file-remove",
                  "aria-label": "Remove file",
                  onClick: e => { e.stopPropagation(); setFile(null); }
                }, "✕")
              )
            : h("div", { className: "ru-dropzone-inner" },
                h("div", { className: "ru-drop-icon", "aria-hidden": "true" }, "☁"),
                h("div", { className: "ru-drop-text" }, "Drop your PDF here or click to browse"),
                h("div", { className: "ru-drop-hint" }, "PDF only · Max 5 MB · (Optional)")
              )
        ),
        h("div", { className: "ru-form-grid" },
          h("div", { className: "ru-field" },
            h("label", { htmlFor: "ru-name" }, "Full Name *"),
            h("input", {
              id: "ru-name",
              placeholder: "Your full name",
              value: form.candidate_name,
              onChange: e => setForm(f => ({ ...f, candidate_name: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", { htmlFor: "ru-role" }, "Desired Role *"),
            h("input", {
              id: "ru-role",
              placeholder: "e.g. Frontend Developer",
              value: form.role,
              onChange: e => setForm(f => ({ ...f, role: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", { htmlFor: "ru-college" }, "College / University"),
            h("input", {
              id: "ru-college",
              placeholder: "e.g. IIT Bombay",
              value: form.college,
              onChange: e => setForm(f => ({ ...f, college: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", { htmlFor: "ru-location" }, "Location"),
            h("input", {
              id: "ru-location",
              placeholder: "e.g. Bengaluru",
              value: form.location,
              onChange: e => setForm(f => ({ ...f, location: e.target.value }))
            })
          ),
          h("div", { className: "ru-field" },
            h("label", { htmlFor: "ru-experience" }, "Experience"),
            h("select", {
              id: "ru-experience",
              value: form.experience,
              onChange: e => setForm(f => ({ ...f, experience: e.target.value }))
            },
              experienceOpts.map(opt => h("option", { key: opt, value: opt }, opt))
            )
          ),
          h("div", { className: "ru-field ru-field-full" },
            h("label", { htmlFor: "ru-skills" }, "Skills ", h("span", { className: "ru-label-hint" }, "(comma-separated)")),
            h("input", {
              id: "ru-skills",
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
            role: "switch",
            "aria-checked": form.visible_to_recruiters,
            tabIndex: 0,
            onClick: () => setForm(f => ({ ...f, visible_to_recruiters: !f.visible_to_recruiters })),
            onKeyDown: e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setForm(f => ({ ...f, visible_to_recruiters: !f.visible_to_recruiters }));
              }
            },
          })
        ),
        errorMsg && h("div", { className: "ru-error", role: "alert" }, errorMsg)
      ),
      h("div", { className: "ru-modal-footer" },
        h("button", { type: "button", className: "ru-btn-ghost", onClick: onClose }, "Cancel"),
        h("button", { type: "button", className: "ru-btn-primary", onClick: handleSubmit }, "Save Profile & Upload")
      )
    )
  );
}

/* ─── Chat / Messaging Modal ───────────────────────── */
function ChatModal({ invite, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recruiterInfo, setRecruiterInfo] = useState(null);
  const scrollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("invite_messages")
      .select("*")
      .eq("invite_id", invite.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  }, [invite.id]);

  const fetchRecruiterInfo = useCallback(async () => {
    if (!invite.recruiter_id) return;
    const { data } = await supabase
      .from("recruiters")
      .select("company_name, full_name")
      .eq("id", invite.recruiter_id)
      .maybeSingle();
    if (data) setRecruiterInfo(data);
  }, [invite.recruiter_id]);

  useEffect(() => {
    fetchMessages();
    fetchRecruiterInfo();
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

  // Auto-scroll to the latest message whenever the list changes.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (invite.status === "pending") {
      supabase.from("interview_invites")
        .update({ status: "accepted", candidate_read: true })
        .eq("id", invite.id)
        .then(() => {});
    }
  }, [invite.id, invite.status]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    const { error } = await supabase.from("invite_messages").insert({
      invite_id: invite.id,
      sender_id: user.id,
      sender_role: "candidate",
      content: text,
    });
    if (error) {
      // restore the draft so the message isn't silently lost
      setInput(text);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const recruiterName = recruiterInfo?.full_name || nameFromEmail(invite.recruiter_email) || "Recruiter";
  const companyName = recruiterInfo?.company_name || companyFromEmail(invite.recruiter_email) || "Company";
  const jobTitle = invite.job_posts?.title || "Interview Opportunity";

  return h("div", { className: "chat-overlay", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "chat-modal", onClick: e => e.stopPropagation() },
      h("div", { className: "chat-header" },
        h("div", { className: "chat-header-left" },
          h("div", { className: "chat-avatar", "aria-hidden": "true" }, recruiterName.charAt(0).toUpperCase()),
          h("div", null,
            h("div", { className: "chat-header-name" }, recruiterName),
            h("div", { className: "chat-header-role" }, `${companyName} · ${jobTitle}`)
          )
        ),
        h("button", { type: "button", className: "ru-close-btn", "aria-label": "Close chat", onClick: onClose }, "✕")
      ),
      h("div", { className: "chat-invite-banner" },
        h("div", { className: "chat-invite-icon", "aria-hidden": "true" }, "💼"),
        h("div", null,
          h("div", { className: "chat-invite-title" }, jobTitle),
          h("div", { className: "chat-invite-sub" }, `Interview invitation from ${companyName}`)
        )
      ),
      h("div", { className: "chat-messages", ref: scrollRef },
        loading
          ? h("div", { className: "chat-loading" }, h("div", { className: "ru-spinner", role: "status", "aria-label": "Loading messages" }))
          : messages.length === 0
            ? h("div", { className: "chat-empty" },
                h("div", { className: "chat-empty-icon", "aria-hidden": "true" }, "💬"),
                h("p", null, "Start the conversation by replying to the invite below")
              )
            : messages.map((msg) => {
                const isCandidate = msg.sender_role === "candidate";
                return h("div", {
                  key: msg.id,
                  className: `chat-bubble-wrap ${isCandidate ? "chat-bubble-right" : "chat-bubble-left"}`
                },
                  h("div", { className: `chat-bubble ${isCandidate ? "chat-bubble-me" : "chat-bubble-them"}` }, msg.content),
                  h("div", { className: "chat-bubble-time" },
                    new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                  )
                );
              })
      ),
      h("div", { className: "chat-input-row" },
        h("textarea", {
          className: "chat-input",
          placeholder: "Type your message… (Enter to send)",
          "aria-label": "Message",
          value: input,
          onChange: e => setInput(e.target.value),
          onKeyDown: handleKeyDown,
          rows: 2,
        }),
        h("button", {
          type: "button",
          className: `chat-send-btn ${sending ? "chat-send-sending" : ""}`,
          "aria-label": "Send message",
          onClick: handleSend,
          disabled: sending || !input.trim(),
        },
          sending
            ? h("div", { className: "ru-spinner ru-spinner-sm", role: "status", "aria-label": "Sending" })
            : h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", width: "20", height: "20" },
                h("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
                h("polygon", { points: "22 2 15 22 11 13 2 9 22 2" })
              )
        )
      )
    )
  );
}

/* ─── Invites Panel (list used inside Jobs tab) ──────── */
function InvitesPanel({ invites, loading, onOpenChat, onDecline }) {
  if (loading) {
    return h("div", { className: "invites-loading" },
      h("div", { className: "ru-spinner ru-spinner-md", role: "status", "aria-label": "Loading invites" })
    );
  }

  if (invites.length === 0) {
    return h("div", { className: "invites-empty" },
      h("div", { className: "invites-empty-icon", "aria-hidden": "true" }, "📭"),
      h("h4", null, "No invites yet"),
      h("p", null, "Once a recruiter invites you, it will appear here.")
    );
  }

  return h("div", { className: "invites-list" },
    invites.map(invite => {
      const company = companyFromEmail(invite.recruiter_email) || "Company";
      return h("div", {
        key: invite.id,
        className: `invite-item ${invite.status === "pending" ? "invite-item-new" : ""}`
      },
        invite.status === "pending" && h("div", { className: "invite-unread-dot", "aria-hidden": "true" }),
        h("div", { className: "invite-item-left" },
          h("div", { className: "invite-company-av", "aria-hidden": "true" },
            (invite.recruiter_email?.split("@")[1]?.charAt(0) || "R").toUpperCase()
          ),
          h("div", null,
            h("div", { className: "invite-company-name" }, company),
            h("div", { className: "invite-job-title" }, invite.job_posts?.title || "Interview Opportunity"),
            h("div", { className: "invite-preview" }, invite.message?.slice(0, 80) + (invite.message?.length > 80 ? "…" : "")),
            h("div", { className: "invite-time" },
              new Date(invite.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            )
          )
        ),
        h("div", { className: "invite-item-actions" },
          h("span", { className: `invite-status-badge invite-status-${invite.status}` },
            invite.status === "pending" ? "New" : invite.status === "accepted" ? "Replied" : "Declined"
          ),
          h("button", { type: "button", className: "invite-reply-btn", onClick: () => onOpenChat(invite) }, "💬 Reply"),
          invite.status === "pending" && h("button", {
            type: "button",
            className: "invite-decline-btn",
            onClick: () => onDecline(invite.id)
          }, "Decline")
        )
      );
    })
  );
}

/* ─── Job Board Section ───────────────────────────────── */
function JobBoardSection({ jobs, loading, onApply, appliedJobIds = [] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const types = ["all", "Full-time", "Part-time", "Internship", "Contract", "Freelance"];

  const filtered = jobs.filter(j => {
    const q = search.trim().toLowerCase();
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
      h("div", { className: "ru-spinner ru-spinner-lg", role: "status", "aria-label": "Loading job posts" }),
      h("p", null, "Loading job posts…")
    );
  }

  return h("div", { className: "jb-wrap" },
    h("div", { className: "jb-toolbar" },
      h("div", { className: "jb-search-wrap" },
        h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", className: "jb-search-icon", "aria-hidden": "true" },
          h("circle", { cx: "11", cy: "11", r: "8" }),
          h("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
        ),
        h("input", {
          className: "jb-search-input",
          placeholder: "Search by title, skill, or location…",
          "aria-label": "Search jobs",
          value: search,
          onChange: e => setSearch(e.target.value),
        }),
        search && h("button", { type: "button", className: "jb-search-clear", "aria-label": "Clear search", onClick: () => setSearch("") }, "✕")
      ),
      h("div", { className: "jb-type-pills", role: "group", "aria-label": "Filter by job type" },
        types.map(t =>
          h("button", {
            type: "button",
            key: t,
            className: `jb-type-pill ${typeFilter === t ? "jb-type-pill-active" : ""}`,
            "aria-pressed": typeFilter === t,
            onClick: () => setTypeFilter(t),
          }, t === "all" ? "All Types" : t)
        )
      )
    ),
    h("div", { className: "jb-count" },
      filtered.length === 0
        ? "No jobs match your filters"
        : `${filtered.length} open position${filtered.length !== 1 ? "s" : ""}`
    ),
    filtered.length === 0
      ? h("div", { className: "jb-empty" },
          h("div", { className: "jb-empty-icon", "aria-hidden": "true" }, "🔍"),
          h("h4", null, "No openings found"),
          h("p", null, "Try adjusting your search or filters.")
        )
      : h("div", { className: "jb-list" },
          filtered.map(job =>
            h("div", { key: job.id, className: `jb-card ${expanded === job.id ? "jb-card-expanded" : ""}` },
              h("div", { className: "jb-card-header" },
                h("div", { className: "jb-card-left" },
                  h("div", { className: "jb-company-av", "aria-hidden": "true" }, (job.company_name || job.title || "J").charAt(0).toUpperCase()),
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
                      (job.tags || []).slice(0, 4).map((tag, i) => h("span", { key: i, className: "jb-tag" }, tag))
                    )
                  )
                ),
                h("div", { className: "jb-card-right" },
                  job.deadline && h("div", { className: "jb-deadline" },
                    h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", width: "12", height: "12", "aria-hidden": "true" },
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
                    type: "button",
                    className: "jb-expand-btn",
                    "aria-expanded": expanded === job.id,
                    onClick: () => setExpanded(expanded === job.id ? null : job.id),
                  }, expanded === job.id ? "Show less ▲" : "View details ▼")
                )
              ),
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
                    type: "button",
                    className: `jb-apply-btn ${appliedJobIds.includes(job.id) ? "jb-apply-btn-done" : ""}`,
                    onClick: () => !appliedJobIds.includes(job.id) && onApply(job),
                    disabled: appliedJobIds.includes(job.id),
                  },
                    appliedJobIds.includes(job.id)
                      ? "✓ Applied"
                      : h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", width: "16", height: "16", "aria-hidden": "true" },
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
  return h("div", { className: "ru-overlay sc-overlay", role: "dialog", "aria-modal": "true", onClick: onClose },
    h("div", { className: "ru-modal sc-modal", onClick: e => e.stopPropagation() },
      h("div", { className: "ru-done-state sc-body" },
        h("div", { className: "sc-emoji", "aria-hidden": "true" }, "🎉"),
        h("div", { className: "sc-badge", "aria-hidden": "true" }, "⭐"),
        h("div", null,
          h("h2", { className: "sc-title" }, "You've Been Shortlisted!"),
          h("p", { className: "sc-lead" }, "Congratulations! A recruiter has shortlisted you for"),
          h("p", { className: "sc-job" }, `"${data.jobTitle}"`),
          h("p", { className: "sc-note" },
            "Check your Interview Invites for a message from the recruiter. They may be reaching out to schedule your next steps."
          )
        ),
        h("div", { className: "sc-next" },
          h("div", { className: "sc-next-label" }, "What's next?"),
          h("div", { className: "sc-next-body" }, "Watch for a message in your Invites tab. The recruiter will contact you to discuss next steps.")
        ),
        h("button", {
          type: "button",
          className: "module-cta sc-cta",
          onClick: onClose,
        }, "🎊 Amazing! Close")
      )
    )
  );
}

/* ─── Circular Sliding Module Carousel ─────────── */
function ModuleCarousel({ modules, resumeRecord, onAction }) {
  const [index, setIndex] = useState(0);
  const total = modules.length;

  const go = (dir) => {
    setIndex(prev => (prev + dir + total) % total);
  };

  const getOffsetClass = (i) => {
    const diff = (i - index + total) % total;
    if (diff === 0) return "mc-center";
    if (diff === 1) return "mc-right-1";
    if (diff === total - 1) return "mc-left-1";
    if (diff === 2) return "mc-right-2";
    if (diff === total - 2) return "mc-left-2";
    return "mc-hidden";
  };

  return h("div", { className: "mc-wrap" },
    h("div", { className: "mc-track" },
      modules.map((mod, i) => {
        const offsetClass = getOffsetClass(i);
        const isCenter = offsetClass === "mc-center";
        return h("div", {
          key: mod.id,
          className: `mc-card ${offsetClass}`,
          style: { "--accent": mod.accent, "--accent-2": mod.accentSecondary },
          "aria-hidden": !isCenter,
          onMouseEnter: () => { if (!isCenter) setIndex(i); }
        },
          h("div", { className: "module-card-glow", "aria-hidden": "true" }),
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
            mod.highlights.map((highlight, hi) =>
              h("li", { key: hi, className: "module-highlight-item" },
                h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", className: "check-icon", "aria-hidden": "true" },
                  h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.5, d: "M5 13l4 4L19 7" })
                ),
                highlight
              )
            )
          ),
          h("button", {
            type: "button",
            className: "module-cta",
            style: { background: `linear-gradient(135deg, ${mod.accent}, ${mod.accentSecondary})`, boxShadow: `0 10px 30px ${mod.accent}40` },
            onClick: (e) => { e.stopPropagation(); onAction(mod); }
          },
            mod.cta,
            h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", width: "18", height: "18", "aria-hidden": "true" },
              h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 7l5 5m0 0l-5 5m5-5H6" })
            )
          )
        );
      })
    ),
    h("div", { className: "mc-nav" },
      h("button", { type: "button", className: "mc-arrow", "aria-label": "Previous module", onClick: () => go(-1) }, "‹"),
      h("div", { className: "mc-dots", role: "tablist", "aria-label": "Modules" },
        modules.map((mod, i) =>
          h("button", {
            type: "button",
            key: mod.id,
            className: `mc-dot ${i === index ? "mc-dot-active" : ""}`,
            role: "tab",
            "aria-selected": i === index,
            onClick: () => setIndex(i),
            "aria-label": `Go to ${mod.title}`
          })
        )
      ),
      h("button", { type: "button", className: "mc-arrow", "aria-label": "Next module", onClick: () => go(1) }, "›")
    )
  );
}

/* ─── Main Dashboard ─────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeRecord, setResumeRecord] = useState(null);

  // Tabs: dashboard | jobs | history | settings
  const [activeTab, setActiveTab] = useState("dashboard");

  // invites & chat state
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Job Board
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [applyToast, setApplyToast] = useState(null);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [shortlistCelebration, setShortlistCelebration] = useState(null);

  // guard so the poller/realtime handler doesn't fire twice for the same row
  const celebrationHandledRef = useRef(new Set());

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return;
      setUser(user);
      fetchMyResume(user.id);
      fetchMyInvites(user.id);
      fetchJobs();
      fetchMyApplications(user.id);
      checkPendingCelebration(user.id);
    });
    return () => { active = false; };
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

  /* ────────────────────────────────────────────────────────────
     SHOW-ONCE SHORTLIST CELEBRATION
     Persisted on the `applications` row (`celebration_seen`) so
     it survives logout/device changes; localStorage is only a
     same-browser fallback if that column doesn't exist yet.

         alter table applications add column if not exists
           celebration_seen boolean default false;
  ──────────────────────────────────────────────────────────── */
  const localSeenKey = (appId) => `pm_shortlist_seen_${appId}`;

  const markCelebrationSeen = async (application) => {
    try { localStorage.setItem(localSeenKey(application.id), "true"); } catch (_) { /* ignore */ }
    try {
      await supabase.from("applications")
        .update({ celebration_seen: true })
        .eq("id", application.id);
    } catch (_) { /* column may not exist yet — localStorage covers us */ }
  };

  const hasSeenCelebration = (application) => {
    if (application.celebration_seen) return true;
    try { if (localStorage.getItem(localSeenKey(application.id)) === "true") return true; } catch (_) { /* ignore */ }
    return false;
  };

  const maybeShowCelebration = (application, jobTitle) => {
    if (hasSeenCelebration(application)) return;
    if (celebrationHandledRef.current.has(application.id)) return;
    celebrationHandledRef.current.add(application.id);
    setShortlistCelebration({
      applicationId: application.id,
      jobTitle: jobTitle || "a position",
      jobPostId: application.job_post_id,
    });
  };

  // On login: check if there's ANY shortlisted application not yet acknowledged
  const checkPendingCelebration = async (uid) => {
    const { data } = await supabase
      .from("applications")
      .select("*, job_posts(title)")
      .eq("candidate_id", uid)
      .eq("status", "shortlisted");
    if (!data || data.length === 0) return;
    const unseen = data.find(app => !hasSeenCelebration(app));
    if (unseen) {
      maybeShowCelebration(unseen, unseen.job_posts?.title);
    }
  };

  // Real-time invites for this candidate
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

  // Real-time watch for a NEW shortlist while the user is active in-session.
  // A short poll is kept as a safety net in case the realtime event is
  // missed (e.g. brief network drop); both paths are deduped through
  // hasSeenCelebration / celebrationHandledRef so nothing repeats.
  useEffect(() => {
    if (!user) return;

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("applications")
        .select("*, job_posts(title)")
        .eq("candidate_id", user.id)
        .eq("status", "shortlisted");
      if (!data) return;
      const unseen = data.find(app => !hasSeenCelebration(app));
      if (unseen) maybeShowCelebration(unseen, unseen.job_posts?.title);
    }, 30000); // 30s safety-net poll — realtime handles the fast path

    const channel = supabase
      .channel(`applications-watch:${user.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "applications",
      }, (payload) => {
        if (payload.new.candidate_id === user.id && payload.new.status === "shortlisted") {
          if (hasSeenCelebration(payload.new)) return;
          supabase
            .from("job_posts")
            .select("title")
            .eq("id", payload.new.job_post_id)
            .maybeSingle()
            .then(({ data: job }) => {
              maybeShowCelebration(payload.new, job?.title);
            });
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCloseCelebration = () => {
    if (shortlistCelebration) {
      markCelebrationSeen({ id: shortlistCelebration.applicationId });
    }
    setShortlistCelebration(null);
  };

  const handleDeclineInvite = async (inviteId) => {
    const prev = invites;
    setInvites(cur => cur.map(i => i.id === inviteId ? { ...i, status: "declined" } : i));
    const { error } = await supabase.from("interview_invites")
      .update({ status: "declined" })
      .eq("id", inviteId);
    if (error) setInvites(prev); // roll back optimistic update on failure
  };

  const handleOpenChat = (invite) => {
    setActiveChat(invite);
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
      setApplyToast(
        error.code === "23505"
          ? `You've already applied for "${job.title}".`
          : "Something went wrong. Please try again."
      );
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
  ];

  const handleModuleAction = (mod) => {
    if (mod.isRecruiterProfile) { setShowResumeModal(true); }
    else if (mod.path) navigate(mod.path);
  };

  const liveJobsCount = jobs.filter(j => j.active !== false).length;

  return h("div", { className: "dashboard-container" },
    h("div", { className: "orb orb-1", "aria-hidden": "true" }),
    h("div", { className: "orb orb-2", "aria-hidden": "true" }),
    h("div", { className: "orb orb-3", "aria-hidden": "true" }),

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
      h("nav", { className: "dashboard-nav", "aria-label": "Primary" },
        h("button", {
          type: "button",
          className: `dashboard-nav-item ${activeTab === "dashboard" ? "active" : ""}`,
          "aria-current": activeTab === "dashboard" ? "page" : undefined,
          onClick: () => setActiveTab("dashboard")
        }, "Dashboard"),
        h("button", {
          type: "button",
          className: `dashboard-nav-item dashboard-nav-item-jobs ${activeTab === "jobs" ? "active" : ""}`,
          "aria-current": activeTab === "jobs" ? "page" : undefined,
          onClick: () => setActiveTab("jobs")
        },
          "Jobs",
          (unreadCount > 0 || liveJobsCount > 0) && h("span", { className: "nav-jobs-badge" }, unreadCount > 0 ? unreadCount : liveJobsCount)
        ),
        h("button", {
          type: "button",
          className: `dashboard-nav-item ${activeTab === "history" ? "active" : ""}`,
          "aria-current": activeTab === "history" ? "page" : undefined,
          onClick: () => setActiveTab("history")
        }, "History"),
        h("button", {
          type: "button",
          className: `dashboard-nav-item ${activeTab === "settings" ? "active" : ""}`,
          "aria-current": activeTab === "settings" ? "page" : undefined,
          onClick: () => setActiveTab("settings")
        }, "Settings")
      ),
      h("div", { className: "dashboard-header-actions" },
        resumeRecord && h("button", { type: "button", className: "dashboard-resume-pill", onClick: () => setShowResumeModal(true) },
          h("span", { className: "dashboard-resume-dot", "aria-hidden": "true" }),
          "Profile Live"
        ),
        h("button", { type: "button", className: "logout-btn", onClick: handleLogout },
          h("svg", { fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", width: "16", height: "16", "aria-hidden": "true" },
            h("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" })
          ),
          "Logout"
        )
      )
    ),

    h("main", { className: "dashboard-main" },

      /* ── DASHBOARD TAB ─────────────────────────────── */
      activeTab === "dashboard" && h("div", { className: "tab-panel" },
        h("section", { className: "dashboard-hero" },
          h("div", { className: "hero-eyebrow" },
            h("span", { className: "hero-dot", "aria-hidden": "true" }),
            "Your Interview Preparation Hub"
          ),
          h("h1", { className: "hero-title" },
            "Land Your ",
            h("span", { className: "hero-gradient" }, "Dream Job"),
            h("br"),
            "with AI Precision"
          ),
          h("p", { className: "hero-subtitle" },
            "Swipe through your modules — practice interviews, perfect your resume, close skill gaps, and get discovered by recruiters."
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

        h("section", { className: "modules-section" },
          h("div", { className: "modules-label" }, "Choose Your Module"),
          h(ModuleCarousel, { modules, resumeRecord, onAction: handleModuleAction })
        )
      ),

      /* ── JOBS TAB (invites + job board live here now) ─ */
      activeTab === "jobs" && h("div", { className: "tab-panel" },
        h("section", { className: "jobs-tab-header" },
          h("h1", { className: "jobs-tab-title" }, "Jobs & Invites"),
          h("p", { className: "jobs-tab-sub" }, "Everything recruiters have sent you, and every open role on PrepMate.")
        ),

        h("section", { className: "invites-strip-section" },
          h("div", { className: "invites-strip-header" },
            h("div", { className: "invites-strip-title" },
              h("span", { className: "invites-strip-icon", "aria-hidden": "true" }, "🔔"),
              "Recruiter Invites",
              unreadCount > 0 && h("span", { className: "invites-strip-new" }, `${unreadCount} new`)
            )
          ),
          h(InvitesPanel, {
            invites,
            loading: invitesLoading,
            onOpenChat: handleOpenChat,
            onDecline: handleDeclineInvite,
          })
        ),

        h("section", { className: "jb-section-inline" },
          h("div", { className: "invites-strip-header" },
            h("div", { className: "invites-strip-title" },
              h("span", { className: "invites-strip-icon", "aria-hidden": "true" }, "💼"),
              "Open Jobs",
              h("span", { className: "invites-strip-new" }, `${liveJobsCount} live`)
            )
          ),
          h(JobBoardSection, { jobs, loading: jobsLoading, onApply: handleApply, appliedJobIds })
        )
      ),

      /* ── HISTORY TAB ──────────────────────────────── */
      activeTab === "history" && h("div", { className: "tab-panel" },
        h("section", { className: "activity-section" },
          h("div", { className: "activity-header" },
            h("h3", { className: "activity-title" }, "Recent Activity")
          ),
          h("div", { className: "activity-list" },
            [
              ...(resumeRecord ? [{ key: "resume", label: "Resume uploaded — visible to recruiters", time: new Date(resumeRecord.updated_at || resumeRecord.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), color: "#f7971e" }] : []),
              ...(invites.map(inv => ({
                key: `invite-${inv.id}`,
                label: `Interview invite from ${companyFromEmail(inv.recruiter_email) || "recruiter"} — ${inv.job_posts?.title || "role"}`,
                time: new Date(inv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                color: "#43e97b"
              }))),
            ].map((item) =>
              h("div", { className: "activity-item", key: item.key },
                h("div", { className: "activity-dot", style: { background: item.color }, "aria-hidden": "true" }),
                h("div", { className: "activity-content" },
                  h("span", { className: "activity-name" }, item.label),
                  h("span", { className: "activity-time" }, item.time)
                )
              )
            )
          ),
          !resumeRecord && invites.length === 0 && h("p", { className: "ru-vis-sub" }, "No activity yet — apply to a job or set up your recruiter profile to get started.")
        )
      ),

      /* ── SETTINGS TAB ─────────────────────────────── */
      activeTab === "settings" && h("div", { className: "tab-panel" },
        h("section", { className: "activity-section" },
          h("div", { className: "activity-header" },
            h("h3", { className: "activity-title" }, "Settings")
          ),
          h("div", { className: "settings-row" },
            h("div", null,
              h("div", { className: "ru-vis-title" }, "Account Email"),
              h("div", { className: "ru-vis-sub" }, user?.email || "—")
            )
          ),
          h("div", { className: "settings-row" },
            h("div", null,
              h("div", { className: "ru-vis-title" }, "Recruiter Profile"),
              h("div", { className: "ru-vis-sub" }, resumeRecord ? "Live and visible to recruiters" : "Not set up yet")
            ),
            h("button", { type: "button", className: "ru-btn-primary", onClick: () => setShowResumeModal(true) }, resumeRecord ? "Update" : "Set up")
          )
        )
      )
    ),

    applyToast && h("div", { className: "jb-toast", role: "status" },
      h("span", { "aria-hidden": "true" }, "✓ "),
      applyToast
    ),

    showResumeModal && h(ResumeUploadModal, {
      user,
      onClose: () => setShowResumeModal(false),
      onSuccess: () => user && fetchMyResume(user.id),
    }),

    shortlistCelebration && h(ShortlistCelebrationModal, {
      data: shortlistCelebration,
      onClose: handleCloseCelebration,
    }),

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