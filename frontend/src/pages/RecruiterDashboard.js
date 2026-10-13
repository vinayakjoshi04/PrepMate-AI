import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./RecruiterDashboard.css";

// Backend URL (change if your Render URL changes)
const API_BASE = "https://prepmate-ai-backend-ckrb.onrender.com";

/* ─── SVG Icon Library ───────────────────────────────── */
const mk = (children, fill = "none") => () => (
  <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const Icon = {
  Home: mk(<><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>),
  Users: mk(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>),
  Briefcase: mk(<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></>),
  BarChart: mk(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></>),
  Edit: mk(<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></>),
  Settings: mk(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>),
  LogOut: mk(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
  Plus: mk(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  Eye: mk(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>),
  Mail: mk(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>),
  Search: mk(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  X: mk(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  Check: mk(<polyline points="20 6 9 17 4 12"/>),
  Star: mk(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>, "currentColor"),
  Calendar: mk(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
  Tag: mk(<><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>),
  Send: mk(<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>),
  Trash: mk(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></>),
  Globe: mk(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>),
  MapPin: mk(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>),
  Award: mk(<><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>),
  Zap: mk(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>),
  Bell: mk(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>),
  Download: mk(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>),
  FileText: mk(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>),
  RefreshCw: mk(<><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>),
  MessageCircle: mk(<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>),
  Bookmark: mk(<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>),
  Columns: mk(<><rect x="3" y="3" width="6" height="18" rx="1"/><rect x="11" y="3" width="6" height="12" rx="1"/><line x1="21" y1="3" x2="21" y2="9"/></>),
  Clipboard: mk(<><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>),
};

/* ─── Constants & helpers ────────────────────────────── */
const STAGES = [
  { id: "new",         label: "New",         color: "#fcd34d" },
  { id: "viewed",      label: "Reviewed",    color: "#a0c4ff" },
  { id: "shortlisted", label: "Shortlisted", color: "#86efac" },
  { id: "interview",   label: "Interview",   color: "#d8b4fe" },
  { id: "offer",       label: "Offer",       color: "#f7971e" },
  { id: "hired",       label: "Hired",       color: "#43e97b" },
  { id: "rejected",    label: "Rejected",    color: "#718096" },
];
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s]));
const FILTER_PILLS = ["all", "Saved", "Fresher", "Intern", "1 yr", "React", "Python"];

function avatarColor(letter) {
  const map = { A: "#667eea, #764ba2", P: "#f093fb, #f5576c", R: "#4facfe, #00f2fe", S: "#43e97b, #38f9d7", V: "#fa709a, #fee140", B: "#a18cd1, #fbc2eb", D: "#f7971e, #ffd200", K: "#11998e, #38ef7d", M: "#834d9b, #d04ed6", N: "#1a1a2e, #16213e" };
  return map[letter?.toUpperCase()] || "#667eea, #764ba2";
}
function getInitial(name) { return name ? name.charAt(0).toUpperCase() : "?"; }
const fmtDate = (d, withYear) => new Date(d).toLocaleDateString("en-IN", withYear ? { day: "2-digit", month: "short", year: "numeric" } : { day: "2-digit", month: "short" });
const matchClass = (n) => (n >= 75 ? "rd-match-high" : n >= 50 ? "rd-match-mid" : "rd-match-low");
const daysLeft = (deadline) => deadline ? Math.ceil((new Date(deadline) - new Date()) / 86400000) : null;

// Local fallback so the UI still works if the backend is asleep (Render free tier)
const ALIAS = { js: "javascript", reactjs: "react", "react.js": "react", nodejs: "node", "node.js": "node", py: "python", postgres: "postgresql", ts: "typescript" };
const nk = (s) => { const t = String(s || "").trim().toLowerCase(); return ALIAS[t] || t; };
function localMatch(cand, post) {
  const need = new Set((post?.tags || []).map(nk).filter(Boolean));
  const have = new Set((cand?.skills || []).map(nk).filter(Boolean));
  const matched = [...need].filter(s => have.has(s));
  const missing = [...need].filter(s => !have.has(s));
  const skill = need.size ? 60 * matched.length / need.size : 30;
  const ats = cand?.ats_score ? Math.min(10, Number(cand.ats_score)) : 4;
  const words = String(post?.title || "").toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const blob = `${cand?.role || ""} ${[...have].join(" ")}`.toLowerCase();
  const role = words.length ? 20 * words.filter(w => blob.includes(w)).length / words.length : 10;
  const score = Math.round(Math.min(100, skill + role + ats + 6));
  return { score, matchedSkills: matched, missingSkills: missing.slice(0, 8), breakdown: { skills: Math.round(skill), role: Math.round(role), ats: Math.round(ats), experience: 6 } };
}

async function callApi(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE}/api/recruiter${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map(r => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Moves an application to a new stage and messages the candidate for key stages
const STAGE_MSG = {
  shortlisted: (t) => `🎉 Great news! You've been shortlisted for "${t}". We were impressed by your profile and would like to move forward. Please reply here to discuss the next steps!`,
  interview:   (t) => `📅 We'd like to schedule your interview for "${t}". Please reply with 2–3 time slots that work for you.`,
  offer:       (t) => `🏆 Congratulations! We're pleased to extend an offer for "${t}". We'll share the details here shortly.`,
};
async function changeApplicationStatus({ app, newStatus, post, user }) {
  const { error } = await supabase.from("applications").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", app.id);
  if (error) return false;
  const msgFn = STAGE_MSG[newStatus];
  if (msgFn && app.candidate_id && post) {
    try {
      let { data: inv } = await supabase.from("interview_invites").select("id").eq("candidate_id", app.candidate_id).eq("job_post_id", post.id).maybeSingle();
      if (!inv) {
        const { data: created } = await supabase.from("interview_invites").insert({
          recruiter_id: user.id, recruiter_email: user.email, candidate_id: app.candidate_id,
          candidate_name: app.candidate_name, job_post_id: post.id,
          message: msgFn(post.title), status: "pending", candidate_read: false,
        }).select().single();
        inv = created;
      }
      if (inv) await supabase.from("invite_messages").insert({ invite_id: inv.id, sender_id: user.id, sender_role: "recruiter", content: msgFn(post.title) });
    } catch { /* status already saved; messaging is best-effort */ }
  }
  return true;
}

function StatusBadge({ status }) {
  const cls = { Completed: "rd-badge-green", "In Progress": "rd-badge-amber", Scheduled: "rd-badge-purple", pending: "rd-badge-amber", accepted: "rd-badge-green", declined: "rd-badge-dim" };
  return <span className={`rd-badge ${cls[status] || "rd-badge-dim"}`}>{status}</span>;
}

const MatchBadge = ({ score }) => score == null ? null : (
  <span className={`rd-match-badge ${matchClass(score)}`}><Icon.Zap /> {score}% match</span>
);

/* ─── Post Modal (with templates + AI draft) ─────────── */
const JOB_TEMPLATES = [
  { label: "Frontend Intern", title: "Frontend Developer Intern", type: "Internship", tags: "React, JavaScript, CSS" },
  { label: "Backend Engineer", title: "Backend Engineer", type: "Full-time", tags: "Python, SQL, REST" },
  { label: "Data Analyst", title: "Data Analyst", type: "Full-time", tags: "Python, SQL, Pandas" },
  { label: "Full Stack", title: "Full Stack Developer", type: "Full-time", tags: "React, Node, SQL" },
];

function PostModal({ onClose, onSubmit, editPost, saving, user, showToast }) {
  const [form, setForm] = useState(editPost || { title: "", type: "Full-time", location: "", salary: "", deadline: "", description: "", requirements: "", perks: "" });
  const [tagInput, setTagInput] = useState(editPost?.tags?.join(", ") || "");
  const [drafting, setDrafting] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = () => {
    if (!form.title || !form.description || !form.location) { showToast("Title, location and description are required.", "error"); return; }
    onSubmit({ ...form, tags: tagInput.split(",").map(t => t.trim()).filter(Boolean) });
  };

  const draftWithAI = async () => {
    if (!form.title.trim()) { showToast("Enter a job title first.", "error"); return; }
    setDrafting(true);
    try {
      const r = await callApi("/generate-jd", {
        title: form.title, type: form.type, location: form.location,
        skills: tagInput.split(",").map(t => t.trim()).filter(Boolean),
        company: user?.user_metadata?.company || "",
      });
      setForm(f => ({ ...f, description: r.description || f.description, requirements: r.requirements || f.requirements, perks: r.perks || f.perks }));
      if (r.tags?.length) setTagInput(r.tags.join(", "));
      showToast("Draft generated — review and edit it.");
    } catch (e) { showToast(e.message || "Could not generate draft.", "error"); }
    setDrafting(false);
  };

  return (
    <div className="rd-modal-overlay" onClick={onClose}>
      <div className="rd-modal" onClick={e => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div><h2 className="rd-modal-title">{editPost ? "Edit Post" : "Create Job Post"}</h2><p className="rd-modal-sub">Reach thousands of PrepMate students</p></div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="rd-modal-body">
          {!editPost && (
            <div className="rd-chip-row">
              {JOB_TEMPLATES.map(t => (
                <button key={t.label} className="rd-filter-pill" onClick={() => { setForm(f => ({ ...f, title: t.title, type: t.type })); setTagInput(t.tags); }}>{t.label}</button>
              ))}
            </div>
          )}
          <div className="rd-field-grid">
            <div className="rd-field rd-field-full"><label>Job Title *</label><input placeholder="e.g. Senior Software Engineer" value={form.title} onChange={set("title")} /></div>
            <div className="rd-field"><label>Employment Type</label><select value={form.type} onChange={set("type")}><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option><option>Freelance</option></select></div>
            <div className="rd-field"><label>Location *</label><input placeholder="e.g. Bengaluru / Remote" value={form.location} onChange={set("location")} /></div>
            <div className="rd-field"><label>Salary / Stipend</label><input placeholder="e.g. ₹12–20 LPA" value={form.salary} onChange={set("salary")} /></div>
            <div className="rd-field"><label>Application Deadline</label><input type="date" value={form.deadline || ""} onChange={set("deadline")} /></div>
            <div className="rd-field rd-field-full"><label>Skill Tags <span className="rd-label-hint">(comma-separated — used for candidate matching)</span></label><input placeholder="React, Node.js, AWS..." value={tagInput} onChange={e => setTagInput(e.target.value)} /></div>
            <div className="rd-field rd-field-full">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Job Description *</span>
                <button type="button" className="rd-ai-btn" onClick={draftWithAI} disabled={drafting}>{drafting ? <span className="rd-btn-spinner" /> : <Icon.Zap />} Auto-draft</button>
              </label>
              <textarea rows={5} placeholder="Describe the role..." value={form.description} onChange={set("description")} />
            </div>
            <div className="rd-field rd-field-full"><label>Requirements</label><textarea rows={3} placeholder="Key qualifications..." value={form.requirements} onChange={set("requirements")} /></div>
            <div className="rd-field rd-field-full"><label>Perks & Benefits</label><textarea rows={2} placeholder="Health insurance, remote work..." value={form.perks} onChange={set("perks")} /></div>
          </div>
        </div>
        <div className="rd-modal-footer">
          <button className="rd-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="rd-btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? <span className="rd-btn-spinner" /> : <Icon.Send />}{editPost ? "Update Post" : "Publish Post"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Invite Modal (with message templates) ──────────── */
function InviteModal({ candidate, posts, onClose, onSend, user }) {
  const name = candidate?.candidate_name || candidate?.name || "there";
  const [selectedPost, setSelectedPost] = useState(posts[0]?.id || "");
  const [kind, setKind] = useState("invite");
  const [message, setMessage] = useState(`Hi ${name},\n\nWe reviewed your profile on PrepMate and are impressed by your background. We'd love to invite you for an interview for one of our open positions.\n\nLooking forward to connecting!\n\nBest regards`);
  const [sending, setSending] = useState(false);

  const loadTemplate = async (k, postId = selectedPost) => {
    setKind(k);
    const job = posts.find(p => p.id === postId);
    try {
      const r = await callApi("/message-template", { kind: k, candidateName: name, jobTitle: job?.title, recruiterName: user?.email?.split("@")[0] });
      setMessage(r.message);
    } catch { /* keep current text */ }
  };

  const handleSend = async () => {
    setSending(true);
    await onSend({ candidateId: candidate.candidate_id || candidate.id, postId: selectedPost, message });
    setSending(false);
    onClose();
  };

  return (
    <div className="rd-modal-overlay" onClick={onClose}>
      <div className="rd-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div><h2 className="rd-modal-title">Invite to Interview</h2><p className="rd-modal-sub">Send an invite to {name}</p></div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="rd-modal-body">
          <div className="rd-field" style={{ marginBottom: 16 }}>
            <label>Select Job Position</label>
            <select value={selectedPost} onChange={e => { setSelectedPost(e.target.value); loadTemplate(kind, e.target.value); }}>
              <option value="">— No specific post —</option>
              {posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="rd-chip-row">
            {["invite", "interview", "offer"].map(k => (
              <button key={k} className={`rd-filter-pill ${kind === k ? "active" : ""}`} onClick={() => loadTemplate(k)}>{k[0].toUpperCase() + k.slice(1)} template</button>
            ))}
          </div>
          <div className="rd-field"><label>Message</label><textarea rows={8} value={message} onChange={e => setMessage(e.target.value)} /></div>
        </div>
        <div className="rd-modal-footer">
          <button className="rd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="rd-btn-primary" onClick={handleSend} disabled={sending || !message.trim()}>{sending ? <span className="rd-btn-spinner" /> : <Icon.Send />} Send Invite</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Interview Kit Modal ────────────────────────────── */
function InterviewKitModal({ candidate, job, onClose }) {
  const [kit, setKit] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    callApi("/interview-questions", {
      candidate: { skills: candidate.skills || [], experience: candidate.experience, role: candidate.role },
      job: { tags: job?.tags || [], title: job?.title },
    }).then(setKit).catch(e => setErr(e.message || "Could not build the kit."));
  }, []);
  const name = candidate.candidate_name || "Candidate";
  return (
    <div className="rd-modal-overlay" onClick={onClose} style={{ zIndex: 260 }}>
      <div className="rd-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div><h2 className="rd-modal-title">Interview Kit</h2><p className="rd-modal-sub">{name}{job ? ` · ${job.title}` : ""}</p></div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="rd-modal-body">
          {err ? <p className="rd-empty-hint">{err}</p> : !kit ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="rd-loading-ring" /></div> : (
            <>
              {kit.technical?.length > 0 && <div className="kit-section"><h4>Technical</h4>{kit.technical.map((q, i) => <div key={i} className="kit-q"><span>{q.skill}</span>{q.question}</div>)}</div>}
              {kit.gapProbes?.length > 0 && <div className="kit-section"><h4>Skill gaps to probe</h4>{kit.gapProbes.map((q, i) => <div key={i} className="kit-q"><span>{q.skill}</span>{q.question}</div>)}</div>}
              <div className="kit-section"><h4>Behavioural</h4>{kit.behavioural?.map((q, i) => <div key={i} className="kit-q">{q}</div>)}</div>
              <div className="kit-section"><h4>Score each 1–5</h4><div className="rd-chip-row">{kit.scorecard?.map(s => <span key={s} className="rd-skill-tag">{s}</span>)}</div></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Recruiter Chat Modal ───────────────────────────── */
function RecruiterChatModal({ invite, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase.from("invite_messages").select("*").eq("invite_id", invite.id).order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  }, [invite.id]);

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel(`rd-chat:${invite.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "invite_messages", filter: `invite_id=eq.${invite.id}` },
        (payload) => setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchMessages, invite.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    await supabase.from("invite_messages").insert({ invite_id: invite.id, sender_id: user.id, sender_role: "recruiter", content: text });
    setSending(false);
  };

  const candidateName = invite.candidate_name || "Candidate";
  const init = getInitial(candidateName);
  const jobTitle = invite.job_posts?.title || "Interview Opportunity";
  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor(init)})` }}>{init}</div>
            <div>
              <div className="chat-header-name">{candidateName}</div>
              <div className="chat-header-role">{jobTitle} · <span style={{ color: invite.status === "accepted" ? "#43e97b" : invite.status === "declined" ? "#fca5a5" : "#fcd34d", fontWeight: 600 }}>{invite.status}</span></div>
            </div>
          </div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="chat-invite-banner">
          <div className="chat-invite-icon">💼</div>
          <div>
            <div className="chat-invite-title">{jobTitle}</div>
            <div className="chat-invite-sub">Chatting with {candidateName} · {invite.status === "pending" ? "Waiting for response" : invite.status === "accepted" ? "Candidate replied" : "Candidate declined"}</div>
          </div>
        </div>
        <div className="chat-messages">
          {loading ? <div className="chat-loading"><div className="rd-loading-ring" /></div>
            : messages.length === 0 ? <div className="chat-empty"><div className="chat-empty-icon">💬</div><p>No messages yet. Start the conversation with {candidateName}.</p></div>
            : messages.map((msg, i) => {
                const isMe = msg.sender_role === "recruiter";
                return (
                  <div key={msg.id || i} className={`chat-bubble-wrap ${isMe ? "chat-bubble-right" : "chat-bubble-left"}`}>
                    <div className={`chat-bubble ${isMe ? "chat-bubble-me" : "chat-bubble-them"}`}>{msg.content}</div>
                    <div className="chat-bubble-time">{new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                );
              })}
        </div>
        <div className="chat-input-row">
          <textarea className="chat-input" placeholder="Type a message… (Enter to send)" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} rows={2} />
          <button className={`chat-send-btn ${sending ? "chat-send-sending" : ""}`} onClick={handleSend} disabled={sending || !input.trim()}>
            {sending ? <div className="rd-loading-ring" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <Icon.Send />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Applicants Drawer ──────────────────────────────── */
function ApplicantsDrawer({ post, user, onClose, onInvite, onStatusChange, onKit, showToast }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumeUrls, setResumeUrls] = useState({});
  const [sortBy, setSortBy] = useState("match");

  useEffect(() => { if (post) fetchApplicants(); }, [post?.id]);

  const fetchApplicants = async () => {
    setLoading(true);
    const { data } = await supabase.from("applications").select("*").eq("job_post_id", post.id).order("created_at", { ascending: false });
    if (data) {
      setApplicants(data);
      const urls = {};
      await Promise.all(data.filter(a => a.resume_url).map(async (a) => {
        const { data: signed } = await supabase.storage.from("resumes").createSignedUrl(a.resume_url, 3600);
        if (signed?.signedUrl) urls[a.id] = signed.signedUrl;
      }));
      setResumeUrls(urls);
    }
    setLoading(false);
  };

  const handleStatusChange = async (app, newStatus) => {
    const ok = await changeApplicationStatus({ app, newStatus, post, user });
    if (ok) { setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a)); onStatusChange?.(); }
    else showToast("Could not update status.", "error");
  };

  const rows = useMemo(() => {
    const withM = applicants.map(a => ({ ...a, _m: localMatch(a, post).score }));
    return sortBy === "match" ? [...withM].sort((a, b) => b._m - a._m) : withM;
  }, [applicants, sortBy, post]);

  const exportCsv = () => downloadCSV(`${post.title.replace(/\W+/g, "_")}_applicants.csv`, [
    ["Name", "Email", "Role", "College", "Experience", "Location", "Status", "Match %", "Applied"],
    ...rows.map(a => [a.candidate_name, a.candidate_email, a.role, a.college, a.experience, a.location, a.status, a._m, fmtDate(a.created_at, true)]),
  ]);

  if (!post) return null;
  return (
    <div className="rd-drawer-overlay" onClick={onClose}>
      <div className="rd-drawer rd-drawer-wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px 0" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{post.title}</div>
            <div style={{ fontSize: 13, color: "#718096" }}>{post.location} · {post.type}{applicants.length > 0 && <span style={{ color: "#43e97b", marginLeft: 8 }}>· {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}</span>}</div>
          </div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        {applicants.length > 0 && (
          <div className="rd-toolbar-row" style={{ padding: "16px 28px 0", marginBottom: 0 }}>
            <select className="rd-select" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="match">Best match first</option><option value="new">Newest first</option></select>
            <button className="rd-btn-ghost rd-btn-sm" onClick={exportCsv}><Icon.Download /> Export CSV</button>
          </div>
        )}
        <div className="rd-drawer-body" style={{ gap: 12, paddingTop: 16 }}>
          {loading ? <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><div className="rd-loading-ring" /></div>
            : rows.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "60px 20px", gap: 12 }}>
                <div style={{ fontSize: 40, opacity: 0.4 }}>📭</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>No applicants yet</div>
                <div style={{ fontSize: 13, color: "#4a4a6a" }}>Share this job post to start receiving applications.</div>
              </div>
            ) : rows.map((app) => {
              const name = app.candidate_name || app.candidate_email?.split("@")[0] || "Candidate";
              const init = getInitial(name);
              const sc = STAGE_MAP[app.status] || STAGE_MAP.new;
              return (
                <div key={app.id} className="appl-card">
                  <div className="appl-card-top">
                    <div className="appl-card-left">
                      <div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(init)})`, width: 44, height: 44, fontSize: 17, borderRadius: 12 }}>{init}</div>
                      <div>
                        <div className="appl-name">{name}</div>
                        <div className="appl-meta">
                          {app.role && <span>{app.role}</span>}
                          {app.role && app.college && <span className="appl-sep">·</span>}
                          {app.college && <span>{app.college}</span>}
                          {app.experience && <><span className="appl-sep">·</span><span>{app.experience}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="appl-card-right">
                      <span className="appl-status-badge" style={{ color: sc.color, border: `1px solid ${sc.color}55`, background: `${sc.color}1f` }}>{sc.label}</span>
                      <MatchBadge score={app._m} />
                    </div>
                  </div>
                  {app.skills?.length > 0 && <div className="appl-skills">{app.skills.slice(0, 6).map((s, i) => <span key={i} className={`rd-skill-tag rd-skill-sm ${(post.tags || []).map(nk).includes(nk(s)) ? "rd-skill-match" : ""}`}>{s}</span>)}</div>}
                  <div className="appl-info-row">
                    {app.location && <span className="appl-info-chip"><Icon.MapPin /> {app.location}</span>}
                    {app.candidate_email && <span className="appl-info-chip"><Icon.Mail /> {app.candidate_email}</span>}
                    <span className="appl-info-chip"><Icon.Calendar /> Applied {fmtDate(app.created_at)}</span>
                  </div>
                  <div className="appl-actions">
                    <select className="appl-status-select" value={app.status} onChange={e => handleStatusChange(app, e.target.value)}>
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    {resumeUrls[app.id] && <a href={resumeUrls[app.id]} target="_blank" rel="noopener noreferrer" className="rd-action-btn" style={{ textDecoration: "none" }}><Icon.Download /> Resume</a>}
                    <button className="rd-action-btn" onClick={() => onKit(app, post)}><Icon.Clipboard /> Interview kit</button>
                    <button className="rd-action-btn rd-action-primary" onClick={() => onInvite(app)}><Icon.Send /> Invite</button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

/* ─── Candidate Drawer (match, notes, rating) ────────── */
function CandidateDrawer({ candidate, onClose, onInvite, resumeUrl, user, selectedPost, saved, onToggleSave, showToast }) {
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [savingNote, setSavingNote] = useState(false);
  const cid = candidate?.candidate_id;

  useEffect(() => {
    if (!cid || !user) return;
    supabase.from("candidate_notes").select("note, rating").eq("recruiter_id", user.id).eq("candidate_id", cid).maybeSingle()
      .then(({ data }) => { if (data) { setNote(data.note || ""); setRating(data.rating || 0); } });
  }, [cid, user]);

  if (!candidate) return null;
  const name = candidate.candidate_name || candidate.name || "Unknown";
  const initial = getInitial(name);
  const m = selectedPost ? localMatch(candidate, selectedPost) : null;

  const saveNote = async () => {
    if (!cid) { showToast("This candidate has no id to attach notes to.", "error"); return; }
    setSavingNote(true);
    const { error } = await supabase.from("candidate_notes").upsert(
      { recruiter_id: user.id, candidate_id: cid, note, rating: rating || null, updated_at: new Date().toISOString() },
      { onConflict: "recruiter_id,candidate_id" });
    setSavingNote(false);
    showToast(error ? "Could not save note." : "Note saved.", error ? "error" : "success");
  };

  return (
    <div className="rd-drawer-overlay" onClick={onClose}>
      <div className="rd-drawer" onClick={e => e.stopPropagation()}>
        <div className="rd-drawer-header"><button className="rd-modal-close" onClick={onClose}><Icon.X /></button></div>
        <div className="rd-drawer-body">
          <div className="rd-profile-hero">
            <div className="rd-profile-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor(initial)})` }}>{initial}</div>
            <div>
              <h2 className="rd-profile-name">{name}</h2>
              <p className="rd-profile-role">{candidate.role || "Candidate"}</p>
              <p className="rd-profile-college">{candidate.college || candidate.candidate_email || ""}</p>
            </div>
            {candidate.ats_score && <div className="rd-match-ring"><span className="rd-match-pct">{candidate.ats_score}</span><span className="rd-match-label">ATS score</span></div>}
          </div>
          <div className="rd-profile-meta">
            {candidate.location && <span className="rd-meta-chip"><Icon.MapPin />{candidate.location}</span>}
            {candidate.experience && <span className="rd-meta-chip"><Icon.Calendar />{candidate.experience}</span>}
            {candidate.ats_score && <span className="rd-meta-chip rd-chip-score"><Icon.Star />{candidate.ats_score}/10</span>}
          </div>

          {m && (
            <div className="rd-section-block">
              <h3 className="rd-block-title">Fit for “{selectedPost.title}”</h3>
              <MatchBadge score={m.score} />
              <div className="rd-breakdown">
                {[["Skills", m.breakdown.skills, 60], ["Role", m.breakdown.role, 20], ["ATS", m.breakdown.ats, 10], ["Experience", m.breakdown.experience, 10]].map(([l, v, max]) => (
                  <div key={l} className="rd-breakdown-row"><span>{l}</span><div className="rd-score-bar"><div className="rd-score-fill" style={{ width: `${(v / max) * 100}%` }} /></div><span>{v}/{max}</span></div>
                ))}
              </div>
              {m.missingSkills.length > 0 && <div className="rd-skills-wrap" style={{ marginTop: 10 }}>{m.missingSkills.map(s => <span key={s} className="rd-skill-tag rd-skill-sm rd-skill-missing">missing: {s}</span>)}</div>}
            </div>
          )}

          {candidate.skills?.length > 0 && (
            <div className="rd-section-block">
              <h3 className="rd-block-title">Skills</h3>
              <div className="rd-skills-wrap">{candidate.skills.map((s, i) => <span key={i} className={`rd-skill-tag ${m?.matchedSkills.includes(nk(s)) ? "rd-skill-match" : ""}`}>{s}</span>)}</div>
            </div>
          )}
          <div className="rd-section-block"><h3 className="rd-block-title">Contact</h3><p className="rd-contact-email"><Icon.Mail /> {candidate.candidate_email || "—"}</p></div>
          {candidate.resume_url && (
            <div className="rd-section-block">
              <h3 className="rd-block-title">Resume</h3>
              <a href={resumeUrl || "#"} target="_blank" rel="noopener noreferrer" className="rd-resume-download-btn"><Icon.Download /> Download Resume{candidate.resume_filename && <span className="rd-resume-fname">{candidate.resume_filename}</span>}</a>
            </div>
          )}

          <div className="rd-section-block">
            <h3 className="rd-block-title">Your private notes</h3>
            <div className="rd-stars">{[1, 2, 3, 4, 5].map(n => <button key={n} className={`rd-star-btn ${n <= rating ? "on" : ""}`} onClick={() => setRating(n === rating ? 0 : n)}><Icon.Star /></button>)}</div>
            <textarea className="rd-notes-area" rows={3} placeholder="Strengths, concerns, follow-ups… (only you can see this)" value={note} onChange={e => setNote(e.target.value)} />
            <button className="rd-btn-ghost rd-btn-sm" onClick={saveNote} disabled={savingNote}>{savingNote ? <span className="rd-btn-spinner" /> : <Icon.Check />} Save note</button>
          </div>

          <div className="rd-drawer-actions">
            <button className={`rd-btn-ghost rd-btn-full`} onClick={() => onToggleSave(cid)}><Icon.Bookmark /> {saved ? "Saved" : "Save to talent pool"}</button>
            <button className="rd-btn-primary rd-btn-full" onClick={() => onInvite(candidate)}><Icon.Send /> Invite to Interview</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────── */
function Toast({ msg, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose, msg]);
  return (
    <div className={`rd-toast ${type === "error" ? "rd-toast-error" : ""}`}>
      <span className="rd-toast-icon">{type === "error" ? <Icon.X /> : <Icon.Check />}</span>{msg}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────── */
export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [invites, setInvites] = useState([]);
  const [pipeApps, setPipeApps] = useState([]);

  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [savingPost, setSavingPost] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [matchPostId, setMatchPostId] = useState("");
  const [matchMap, setMatchMap] = useState({});
  const [savedIds, setSavedIds] = useState(new Set());
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [kitTarget, setKitTarget] = useState(null);

  const [activeChatInvite, setActiveChatInvite] = useState(null);
  const [inviteUnreadCounts, setInviteUnreadCounts] = useState({});
  const [applicantsPost, setApplicantsPost] = useState(null);

  const [pipeJob, setPipeJob] = useState("all");
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  useEffect(() => { checkUser(); }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      if (user.user_metadata?.role !== "recruiter") { navigate("/dashboard"); return; }
      setUser(user);
      fetchPosts(user.id);
      fetchCandidates();
      fetchInvites(user.id);
      fetchSaved(user.id);
    } catch { navigate("/login"); }
    finally { setLoading(false); }
  };

  const fetchPosts = useCallback(async (uid) => {
    setPostsLoading(true);
    const { data, error } = await supabase.from("job_posts").select("*").eq("recruiter_id", uid).order("created_at", { ascending: false });
    if (!error && data) setPosts(data);
    setPostsLoading(false);
  }, []);

  const fetchCandidates = useCallback(async () => {
    setCandidatesLoading(true);
    const { data, error } = await supabase.from("resumes").select("*").eq("visible_to_recruiters", true).order("created_at", { ascending: false });
    if (!error && data) setCandidates(data);
    setCandidatesLoading(false);
  }, []);

  const fetchInvites = useCallback(async (uid) => {
    const { data } = await supabase.from("interview_invites").select("*, job_posts(title)").eq("recruiter_id", uid).order("created_at", { ascending: false });
    if (data) setInvites(data);
  }, []);

  const fetchSaved = useCallback(async (uid) => {
    const { data } = await supabase.from("saved_candidates").select("candidate_id").eq("recruiter_id", uid);
    if (data) setSavedIds(new Set(data.map(r => r.candidate_id)));
  }, []);

  const fetchPipeline = useCallback(async (postList) => {
    const ids = (postList || []).map(p => p.id);
    if (!ids.length) { setPipeApps([]); return; }
    const { data } = await supabase.from("applications").select("*").in("job_post_id", ids).order("created_at", { ascending: false });
    if (data) setPipeApps(data);
  }, []);

  useEffect(() => { fetchPipeline(posts); }, [posts, fetchPipeline]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`recruiter-invites:${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "interview_invites", filter: `recruiter_id=eq.${user.id}` }, (payload) => {
        setInvites(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i));
        if (payload.new.status === "accepted") showToast("Candidate accepted your invite! Open chat to reply.");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "invite_messages" }, (payload) => {
        if (payload.new.sender_role === "candidate") {
          setInviteUnreadCounts(prev => ({ ...prev, [payload.new.invite_id]: (prev[payload.new.invite_id] || 0) + 1 }));
          showToast("New message from a candidate!");
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "applications" }, () => {
        fetchPosts(user.id);
        showToast("New application received!");
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  // Rank candidates for a chosen job (backend, with local fallback)
  useEffect(() => {
    const job = posts.find(p => p.id === matchPostId);
    if (!job || candidates.length === 0) { setMatchMap({}); return; }
    let cancelled = false;
    const payload = candidates.map(c => ({ id: c.id, skills: c.skills || [], role: c.role, experience: c.experience, ats_score: c.ats_score }));
    callApi("/match", { job: { title: job.title, tags: job.tags || [], requirements: job.requirements, description: job.description, type: job.type }, candidates: payload })
      .then(r => { if (!cancelled) setMatchMap(Object.fromEntries(r.results.map(x => [x.id, x]))); })
      .catch(() => { if (!cancelled) setMatchMap(Object.fromEntries(candidates.map(c => [c.id, localMatch(c, job)]))); });
    return () => { cancelled = true; };
  }, [matchPostId, candidates, posts]);

  const matchPost = posts.find(p => p.id === matchPostId) || null;

  const openCandidateDrawer = async (c) => {
    setSelectedCandidate(c);
    setResumeSignedUrl(null);
    if (c.resume_url) {
      const { data } = await supabase.storage.from("resumes").createSignedUrl(c.resume_url, 3600);
      if (data?.signedUrl) setResumeSignedUrl(data.signedUrl);
    }
  };

  const toggleSave = async (candidateId) => {
    if (!candidateId) { showToast("Candidate cannot be saved (missing id).", "error"); return; }
    const isSaved = savedIds.has(candidateId);
    const next = new Set(savedIds);
    isSaved ? next.delete(candidateId) : next.add(candidateId);
    setSavedIds(next);
    const { error } = isSaved
      ? await supabase.from("saved_candidates").delete().eq("recruiter_id", user.id).eq("candidate_id", candidateId)
      : await supabase.from("saved_candidates").insert({ recruiter_id: user.id, candidate_id: candidateId });
    if (error) { setSavedIds(savedIds); showToast("Could not update talent pool.", "error"); }
    else showToast(isSaved ? "Removed from talent pool." : "Saved to talent pool.");
  };

  const handlePublishPost = async (form) => {
    setSavingPost(true);
    const clean = { ...form, deadline: form.deadline || null };
    if (editingPost) {
      const { error } = await supabase.from("job_posts").update({ ...clean, updated_at: new Date().toISOString() }).eq("id", editingPost.id).eq("recruiter_id", user.id);
      if (!error) { setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...clean } : p)); showToast("Job post updated!"); }
      else showToast("Failed to update post.", "error");
    } else {
      const { data, error } = await supabase.from("job_posts").insert({ ...clean, recruiter_id: user.id, applicants: 0, active: true }).select().single();
      if (!error && data) { setPosts(prev => [data, ...prev]); showToast("Job post published!"); }
      else showToast("Failed to publish post.", "error");
    }
    setSavingPost(false); setShowPostModal(false); setEditingPost(null);
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm("Delete this post? Applications to it will no longer be visible here.")) return;
    const { error } = await supabase.from("job_posts").delete().eq("id", id).eq("recruiter_id", user.id);
    if (!error) { setPosts(prev => prev.filter(p => p.id !== id)); showToast("Post removed."); }
    else showToast("Failed to delete post.", "error");
  };

  const handleDuplicatePost = async (post) => {
    const { id, created_at, updated_at, applicants, ...rest } = post;
    const { data, error } = await supabase.from("job_posts").insert({ ...rest, title: `${post.title} (copy)`, recruiter_id: user.id, applicants: 0, active: false }).select().single();
    if (!error && data) { setPosts(prev => [data, ...prev]); showToast("Duplicated as a paused draft."); }
    else showToast("Failed to duplicate post.", "error");
  };

  const handleTogglePost = async (id, current) => {
    const { error } = await supabase.from("job_posts").update({ active: !current }).eq("id", id).eq("recruiter_id", user.id);
    if (!error) setPosts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handleSendInvite = async ({ candidateId, postId, message }) => {
    const candidateName = inviteTarget?.candidate_name || selectedCandidate?.candidate_name;
    const { data: inviteData, error } = await supabase.from("interview_invites").insert({
      recruiter_id: user.id, recruiter_email: user.email, candidate_id: candidateId, candidate_name: candidateName,
      job_post_id: postId || null, message, status: "pending", candidate_read: false,
    }).select("*, job_posts(title)").single();
    if (!error && inviteData) {
      showToast(`Invitation sent to ${candidateName}!`);
      fetchInvites(user.id);
      await supabase.from("invite_messages").insert({ invite_id: inviteData.id, sender_id: user.id, sender_role: "recruiter", content: message });
    } else showToast("Failed to send invite.", "error");
    setInviteTarget(null); setSelectedCandidate(null);
  };

  // Pipeline: move a card (optimistic)
  const moveApp = async (app, newStatus) => {
    if (app.status === newStatus) return;
    const post = posts.find(p => p.id === app.job_post_id);
    const prev = pipeApps;
    setPipeApps(list => list.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
    const ok = await changeApplicationStatus({ app, newStatus, post, user });
    if (!ok) { setPipeApps(prev); showToast("Could not move candidate.", "error"); }
    else showToast(`${app.candidate_name || "Candidate"} → ${STAGE_MAP[newStatus].label}`);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.toLowerCase();
    let list = candidates.filter(c => {
      const name = (c.candidate_name || "").toLowerCase();
      const role = (c.role || "").toLowerCase();
      const skills = (c.skills || []).map(s => s.toLowerCase());
      const matchesSearch = !q || name.includes(q) || role.includes(q) || skills.some(s => s.includes(q));
      const f = candidateFilter.toLowerCase();
      const matchesFilter = candidateFilter === "all"
        || (candidateFilter === "Saved" ? savedIds.has(c.candidate_id) : (c.experience || "").toLowerCase().includes(f) || role.includes(f) || skills.some(s => s.includes(f)));
      return matchesSearch && matchesFilter;
    });
    if (sortBy === "ats") list = [...list].sort((a, b) => (b.ats_score || 0) - (a.ats_score || 0));
    if (sortBy === "match" && matchPostId) list = [...list].sort((a, b) => (matchMap[b.id]?.score || 0) - (matchMap[a.id]?.score || 0));
    return list;
  }, [candidates, candidateSearch, candidateFilter, sortBy, matchMap, matchPostId, savedIds]);

  const exportCandidates = () => downloadCSV("prepmate_candidates.csv", [
    ["Name", "Email", "Role", "College", "Experience", "Location", "ATS", "Skills", ...(matchPostId ? ["Match %"] : [])],
    ...filteredCandidates.map(c => [c.candidate_name, c.candidate_email, c.role, c.college, c.experience, c.location, c.ats_score, (c.skills || []).join("; "), ...(matchPostId ? [matchMap[c.id]?.score ?? ""] : [])]),
  ]);

  const atsList = candidates.filter(c => c.ats_score);
  const stats = {
    totalInvites: invites.length,
    activePositions: posts.filter(p => p.active).length,
    candidatesPool: candidates.length,
    avgAts: atsList.length ? (atsList.reduce((s, c) => s + Number(c.ats_score || 0), 0) / atsList.length).toFixed(1) : null,
  };
  const totalUnread = Object.values(inviteUnreadCounts).reduce((a, b) => a + b, 0);

  // Funnel + action items (from applications across all posts)
  const stageCount = useMemo(() => Object.fromEntries(STAGES.map(s => [s.id, pipeApps.filter(a => (a.status || "new") === s.id).length])), [pipeApps]);
  const newApps = stageCount.new || 0;
  const staleApps = pipeApps.filter(a => (a.status || "new") === "new" && (Date.now() - new Date(a.created_at)) > 3 * 86400000).length;
  const closingSoon = posts.filter(p => p.active && daysLeft(p.deadline) != null && daysLeft(p.deadline) >= 0 && daysLeft(p.deadline) <= 3);
  const pendingInvites = invites.filter(i => i.status === "pending").length;
  const funnelSteps = [
    { id: "all", label: "Applied", n: pipeApps.length, color: "#667eea" },
    { id: "shortlisted", label: "Shortlisted", n: pipeApps.filter(a => ["shortlisted", "interview", "offer", "hired"].includes(a.status)).length, color: "#86efac" },
    { id: "interview", label: "Interview", n: pipeApps.filter(a => ["interview", "offer", "hired"].includes(a.status)).length, color: "#d8b4fe" },
    { id: "offer", label: "Offer", n: pipeApps.filter(a => ["offer", "hired"].includes(a.status)).length, color: "#f7971e" },
    { id: "hired", label: "Hired", n: stageCount.hired || 0, color: "#43e97b" },
  ];

  const NAV = [
    { id: "overview",   label: "Overview",   icon: Icon.Home },
    { id: "posts",      label: "Job Posts",  icon: Icon.Edit },
    { id: "pipeline",   label: "Pipeline",   icon: Icon.Columns },
    { id: "candidates", label: "Candidates", icon: Icon.Users },
    { id: "invites",    label: "Invites",    icon: Icon.Mail },
    { id: "analytics",  label: "Analytics",  icon: Icon.BarChart },
    { id: "settings",   label: "Settings",   icon: Icon.Settings },
  ];

  if (loading) return <div className="rd-loading"><div className="rd-loading-ring" /><p>Loading workspace...</p></div>;

  const pipeVisible = pipeApps.filter(a => pipeJob === "all" || a.job_post_id === pipeJob);

  return (
    <div className={`rd-root ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="rd-ambient rd-amb-1" />
      <div className="rd-ambient rd-amb-2" />

      <aside className="rd-sidebar">
        <div className="rd-sidebar-top">
          <div className="rd-brand">
            <div className="rd-brand-icon"><Icon.Zap /></div>
            <div className="rd-brand-text"><span className="rd-brand-name">PrepMate</span><span className="rd-brand-badge">Recruiter</span></div>
          </div>
          <nav className="rd-nav">
            {NAV.map(({ id, label, icon: Ic }) => (
              <button key={id} className={`rd-nav-item ${activeTab === id ? "active" : ""}`} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}>
                <span className="rd-nav-icon"><Ic /></span><span>{label}</span>
                {id === "posts" && posts.length > 0 && <span className="rd-nav-badge">{posts.length}</span>}
                {id === "pipeline" && newApps > 0 && <span className="rd-nav-badge rd-nav-badge-alert">{newApps}</span>}
                {id === "candidates" && candidates.length > 0 && <span className="rd-nav-badge">{candidates.length}</span>}
                {id === "invites" && (invites.length > 0 || totalUnread > 0) && <span className={`rd-nav-badge ${totalUnread > 0 ? "rd-nav-badge-alert" : ""}`}>{totalUnread > 0 ? totalUnread : invites.length}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="rd-sidebar-bottom">
          <div className="rd-user-card">
            <div className="rd-user-av">{user?.email?.charAt(0).toUpperCase()}</div>
            <div className="rd-user-info"><div className="rd-user-name">{user?.email?.split("@")[0]}</div><div className="rd-user-role">Recruiter</div></div>
          </div>
          <button className="rd-logout-btn" onClick={handleLogout}><Icon.LogOut /> Sign out</button>
        </div>
      </aside>

      {sidebarOpen && <div className="rd-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="rd-main">
        <header className="rd-topbar">
          <button className="rd-hamburger" onClick={() => setSidebarOpen(o => !o)}><span /><span /><span /></button>
          <div className="rd-topbar-title"><h1>{NAV.find(n => n.id === activeTab)?.label}</h1></div>
          <div className="rd-topbar-right">
            <button className="rd-icon-action" title="Refresh" onClick={() => { fetchCandidates(); fetchPosts(user.id); fetchInvites(user.id); }}><Icon.RefreshCw /></button>
            <button className="rd-icon-action" style={{ position: "relative" }} onClick={() => setActiveTab("invites")}>
              <Icon.Bell />
              {totalUnread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#f5576c", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{totalUnread}</span>}
            </button>
            {activeTab === "posts" && <button className="rd-btn-primary rd-btn-sm" onClick={() => { setEditingPost(null); setShowPostModal(true); }}><Icon.Plus /> New Post</button>}
          </div>
        </header>

        <div className="rd-content">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="rd-tab-anim">
              <div className="rd-welcome">
                <div>
                  <h2 className="rd-welcome-title">Good to see you, <span className="rd-highlight">{user?.email?.split("@")[0]}</span> 👋</h2>
                  <p className="rd-welcome-sub">Here's what needs your attention today.</p>
                </div>
                <button className="rd-btn-primary" onClick={() => { setEditingPost(null); setShowPostModal(true); setActiveTab("posts"); }}><Icon.Plus /> Post a Job</button>
              </div>

              <div className="rd-todo-grid">
                <div className="rd-todo" onClick={() => setActiveTab("pipeline")}><div className={`rd-todo-num ${newApps ? "hot" : ""}`}>{newApps}</div><div className="rd-todo-txt"><b>New applicants</b>{staleApps > 0 ? `${staleApps} waiting 3+ days` : "to review"}</div></div>
                <div className="rd-todo" onClick={() => setActiveTab("invites")}><div className={`rd-todo-num ${totalUnread ? "hot" : ""}`}>{totalUnread}</div><div className="rd-todo-txt"><b>Unread replies</b>from candidates</div></div>
                <div className="rd-todo" onClick={() => setActiveTab("invites")}><div className="rd-todo-num">{pendingInvites}</div><div className="rd-todo-txt"><b>Awaiting response</b>invites pending</div></div>
                <div className="rd-todo" onClick={() => setActiveTab("posts")}><div className={`rd-todo-num ${closingSoon.length ? "hot" : ""}`}>{closingSoon.length}</div><div className="rd-todo-txt"><b>Closing soon</b>deadline within 3 days</div></div>
              </div>

              <div className="rd-stats-grid">
                {[
                  { label: "Invites Sent", value: stats.totalInvites, sub: "to PrepMate candidates", icon: Icon.Mail, grad: "rd-grad-blue" },
                  { label: "Active Positions", value: stats.activePositions, sub: `${posts.length} total posts`, icon: Icon.Briefcase, grad: "rd-grad-purple" },
                  { label: "Candidate Pool", value: stats.candidatesPool, sub: `${savedIds.size} saved`, icon: Icon.Users, grad: "rd-grad-green" },
                  { label: "Avg ATS Score", value: stats.avgAts ? `${stats.avgAts}/10` : "—", sub: "across all candidates", icon: Icon.Award, grad: "rd-grad-pink" },
                ].map(({ label, value, sub, icon: Ic, grad }, i) => (
                  <div className="rd-stat-card" key={i} style={{ "--i": i }}>
                    <div className={`rd-stat-icon-wrap ${grad}`}><Ic /></div>
                    <div className="rd-stat-body"><div className="rd-stat-label">{label}</div><div className="rd-stat-value">{value}</div><div className="rd-stat-sub">{sub}</div></div>
                  </div>
                ))}
              </div>

              {totalUnread > 0 && (
                <div className="rd-reply-alert" onClick={() => setActiveTab("invites")}>
                  <div className="rd-reply-alert-icon">💬</div>
                  <div><div className="rd-reply-alert-title">You have {totalUnread} new candidate {totalUnread === 1 ? "reply" : "replies"}!</div><div className="rd-reply-alert-sub">Click to view and chat with candidates</div></div>
                  <button className="rd-btn-primary rd-btn-sm" style={{ marginLeft: "auto" }}>View Chats →</button>
                </div>
              )}

              <div className="rd-analytics-grid" style={{ marginBottom: 24 }}>
                <div className="rd-card" style={{ marginBottom: 0 }}>
                  <div className="rd-card-header"><h3 className="rd-card-title">Hiring Funnel</h3><button className="rd-text-btn" onClick={() => setActiveTab("pipeline")}>Open pipeline →</button></div>
                  {pipeApps.length === 0 ? <p className="rd-empty-hint">Applications will appear here once students apply to your posts.</p> : (
                    <div className="rd-funnel">
                      {funnelSteps.map(s => (
                        <div key={s.id} className="rd-funnel-row">
                          <span>{s.label}</span>
                          <div className="rd-funnel-track"><div className="rd-funnel-fill" style={{ width: `${pipeApps.length ? (s.n / pipeApps.length) * 100 : 0}%`, background: s.color }} /></div>
                          <span className="rd-funnel-val">{s.n}<small>{pipeApps.length ? Math.round((s.n / pipeApps.length) * 100) : 0}%</small></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rd-card" style={{ marginBottom: 0 }}>
                  <div className="rd-card-header"><h3 className="rd-card-title">Top Matches {posts.find(p => p.active) ? `· ${posts.find(p => p.active).title}` : ""}</h3><button className="rd-text-btn" onClick={() => { setMatchPostId(posts.find(p => p.active)?.id || ""); setSortBy("match"); setActiveTab("candidates"); }}>See all →</button></div>
                  {!posts.find(p => p.active) ? <p className="rd-empty-hint">Publish a job to see best-fit candidates.</p>
                    : candidates.length === 0 ? <p className="rd-empty-hint">No candidates yet.</p>
                    : [...candidates].map(c => ({ c, m: localMatch(c, posts.find(p => p.active)) })).sort((a, b) => b.m.score - a.m.score).slice(0, 4).map(({ c, m }) => (
                      <div key={c.id} className="rd-top-match-row">
                        <div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(getInitial(c.candidate_name))})` }}>{getInitial(c.candidate_name)}</div>
                        <div className="grow"><div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>{c.candidate_name || "—"}</div><div className="rd-td-muted">{c.role || "—"}</div></div>
                        <MatchBadge score={m.score} />
                        <button className="rd-mini-btn" onClick={() => openCandidateDrawer(c)}><Icon.Eye /> View</button>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rd-card">
                <div className="rd-card-header"><h3 className="rd-card-title">Your Job Posts</h3><button className="rd-text-btn" onClick={() => setActiveTab("posts")}>Manage →</button></div>
                <div className="rd-posts-mini">
                  {postsLoading && <div className="rd-loading-inline"><div className="rd-loading-ring rd-ring-sm" /></div>}
                  {!postsLoading && posts.length === 0 && <p className="rd-empty-hint">No posts yet. <button className="rd-inline-link" onClick={() => { setShowPostModal(true); setActiveTab("posts"); }}>Create your first post →</button></p>}
                  {posts.slice(0, 3).map(post => (
                    <div key={post.id} className="rd-post-mini-card">
                      <div><div className="rd-post-mini-title">{post.title}</div><div className="rd-post-mini-meta">{post.type} · {post.location} · {fmtDate(post.created_at)}</div></div>
                      <div className="rd-post-mini-right"><span className="rd-applicants-badge">{post.applicants} applicants</span><span className={`rd-live-dot ${post.active ? "live" : "paused"}`} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* JOB POSTS */}
          {activeTab === "posts" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div><h2 className="rd-section-heading">Job Posts</h2><p className="rd-section-sub">Publish openings visible to all PrepMate students</p></div>
                <button className="rd-btn-primary" onClick={() => { setEditingPost(null); setShowPostModal(true); }}><Icon.Plus /> Create Post</button>
              </div>
              {postsLoading ? <div className="rd-empty-state"><div className="rd-loading-ring" /></div>
                : posts.length === 0 ? (
                  <div className="rd-empty-state">
                    <div className="rd-empty-icon"><Icon.Briefcase /></div><h3>No posts yet</h3><p>Create your first job post to start reaching PrepMate students.</p>
                    <button className="rd-btn-primary" onClick={() => setShowPostModal(true)}><Icon.Plus /> Create Post</button>
                  </div>
                ) : (
                  <div className="rd-posts-list">
                    {posts.map(post => {
                      const dl = daysLeft(post.deadline);
                      return (
                        <div key={post.id} className={`rd-post-card ${!post.active ? "rd-post-paused" : ""}`}>
                          <div className="rd-post-card-top">
                            <div className="rd-post-card-left">
                              <div className="rd-post-live-indicator"><span className={`rd-live-dot-lg ${post.active ? "live" : "paused"}`} /><span className="rd-live-label">{post.active ? "Live" : "Paused"}</span></div>
                              <h3 className="rd-post-title">{post.title}</h3>
                              <div className="rd-post-meta-row">
                                <span><Icon.Briefcase />{post.type}</span><span><Icon.MapPin />{post.location}</span>
                                {post.salary && <span><Icon.Tag />{post.salary}</span>}
                                {post.deadline && <span className={dl != null && dl <= 3 ? "rd-deadline-warn" : ""}><Icon.Calendar />{dl != null && dl < 0 ? "Closed" : dl === 0 ? "Closes today" : `Due ${fmtDate(post.deadline)}`}</span>}
                              </div>
                              <p className="rd-post-desc">{post.description}</p>
                              <div className="rd-post-tags">{(post.tags || []).map((t, i) => <span key={i} className="rd-skill-tag">{t}</span>)}</div>
                            </div>
                            <div className="rd-post-card-right">
                              <div className="rd-applicants-ring"><span className="rd-appl-num">{post.applicants}</span><span className="rd-appl-lbl">applicants</span></div>
                              <span className="rd-posted-time">{fmtDate(post.created_at)}</span>
                            </div>
                          </div>
                          <div className="rd-post-card-actions" style={{ flexWrap: "wrap" }}>
                            <button className="rd-action-btn" onClick={() => { setEditingPost(post); setShowPostModal(true); }}><Icon.Edit /> Edit</button>
                            <button className="rd-action-btn rd-action-primary" onClick={() => setApplicantsPost(post)}><Icon.Users /> Applicants{post.applicants > 0 && <span className="rd-chat-unread-badge" style={{ background: "#667eea" }}>{post.applicants}</span>}</button>
                            <button className="rd-action-btn" onClick={() => { setMatchPostId(post.id); setSortBy("match"); setActiveTab("candidates"); }}><Icon.Zap /> Find matches</button>
                            <button className="rd-action-btn" onClick={() => handleDuplicatePost(post)}><Icon.FileText /> Duplicate</button>
                            <button className="rd-action-btn" onClick={() => handleTogglePost(post.id, post.active)}>{post.active ? <><Icon.Eye /> Pause</> : <><Icon.Globe /> Activate</>}</button>
                            <button className="rd-action-btn rd-action-danger" onClick={() => handleDeletePost(post.id)}><Icon.Trash /> Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* PIPELINE */}
          {activeTab === "pipeline" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div><h2 className="rd-section-heading">Hiring Pipeline</h2><p className="rd-section-sub">Drag candidates between stages. Shortlist, interview and offer moves message the candidate automatically.</p></div>
                <button className="rd-btn-ghost rd-btn-sm" onClick={() => downloadCSV("pipeline.csv", [
                  ["Name", "Email", "Job", "Stage", "Role", "College", "Experience", "Applied"],
                  ...pipeVisible.map(a => [a.candidate_name, a.candidate_email, posts.find(p => p.id === a.job_post_id)?.title, STAGE_MAP[a.status]?.label || a.status, a.role, a.college, a.experience, fmtDate(a.created_at, true)]),
                ])}><Icon.Download /> Export CSV</button>
              </div>
              <div className="rd-toolbar-row">
                <select className="rd-select" value={pipeJob} onChange={e => setPipeJob(e.target.value)}>
                  <option value="all">All jobs ({pipeApps.length})</option>
                  {posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <button className="rd-btn-ghost rd-btn-sm" onClick={() => fetchPipeline(posts)}><Icon.RefreshCw /> Refresh</button>
              </div>
              {posts.length === 0 ? (
                <div className="rd-empty-state"><div className="rd-empty-icon"><Icon.Columns /></div><h3>No pipeline yet</h3><p>Publish a job post and applicants will show up here.</p></div>
              ) : (
                <div className="rd-kanban">
                  {STAGES.map(stage => {
                    const items = pipeVisible.filter(a => (a.status || "new") === stage.id);
                    return (
                      <div key={stage.id} className={`rd-kcol ${overCol === stage.id ? "over" : ""}`}
                        onDragOver={e => { e.preventDefault(); setOverCol(stage.id); }}
                        onDragLeave={() => setOverCol(null)}
                        onDrop={e => { e.preventDefault(); setOverCol(null); const app = pipeApps.find(a => a.id === dragId); if (app) moveApp(app, stage.id); setDragId(null); }}>
                        <div className="rd-kcol-head"><span className="rd-kcol-dot" style={{ background: stage.color }} />{stage.label}<span className="rd-kcol-count">{items.length}</span></div>
                        {items.length === 0 && <div className="rd-kempty">Drop here</div>}
                        {items.map(app => {
                          const post = posts.find(p => p.id === app.job_post_id);
                          const name = app.candidate_name || app.candidate_email?.split("@")[0] || "Candidate";
                          const m = localMatch(app, post).score;
                          return (
                            <div key={app.id} className={`rd-kcard ${dragId === app.id ? "dragging" : ""}`} draggable
                              onDragStart={() => setDragId(app.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}>
                              <div className="rd-kcard-top">
                                <div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(getInitial(name))})` }}>{getInitial(name)}</div>
                                <div style={{ minWidth: 0 }}><div className="rd-kcard-name">{name}</div><div className="rd-kcard-sub">{post?.title || "—"}</div></div>
                              </div>
                              <div className="rd-kcard-row"><MatchBadge score={m} /><span className="rd-kcard-sub">{fmtDate(app.created_at)}</span></div>
                              <div className="rd-kcard-actions">
                                <button className="rd-mini-btn" onClick={() => setKitTarget({ candidate: app, job: post })}><Icon.Clipboard /> Kit</button>
                                <button className="rd-mini-btn" onClick={() => setInviteTarget({ candidate_id: app.candidate_id, candidate_name: app.candidate_name, candidate_email: app.candidate_email })}><Icon.Send /> Invite</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CANDIDATES */}
          {activeTab === "candidates" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div><h2 className="rd-section-heading">Candidate Pool</h2><p className="rd-section-sub">{candidatesLoading ? "Loading..." : `${filteredCandidates.length} students on PrepMate`}</p></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="rd-btn-ghost rd-btn-sm" onClick={exportCandidates}><Icon.Download /> Export</button>
                  <button className="rd-btn-ghost rd-btn-sm" onClick={fetchCandidates}><Icon.RefreshCw /> Refresh</button>
                </div>
              </div>
              <div className="rd-cand-toolbar">
                <div className="rd-search-wrap">
                  <Icon.Search />
                  <input className="rd-search-input" placeholder="Search by name, role, or skill..." value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} />
                  {candidateSearch && <button className="rd-search-clear" onClick={() => setCandidateSearch("")}><Icon.X /></button>}
                </div>
                <select className="rd-select" value={matchPostId} onChange={e => { setMatchPostId(e.target.value); if (e.target.value) setSortBy("match"); else if (sortBy === "match") setSortBy("newest"); }}>
                  <option value="">Match against a job…</option>
                  {posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <select className="rd-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="newest">Newest</option><option value="ats">Highest ATS</option>
                  {matchPostId && <option value="match">Best match</option>}
                </select>
                <div className="rd-filter-pills">
                  {FILTER_PILLS.map(f => <button key={f} className={`rd-filter-pill ${candidateFilter === f ? "active" : ""}`} onClick={() => setCandidateFilter(f)}>{f === "all" ? "All" : f === "Saved" ? `Saved (${savedIds.size})` : f}</button>)}
                </div>
              </div>
              {candidatesLoading ? <div className="rd-empty-state"><div className="rd-loading-ring" /></div>
                : filteredCandidates.length === 0 ? (
                  <div className="rd-empty-state">
                    <div className="rd-empty-icon"><Icon.Users /></div>
                    <h3>{candidateSearch || candidateFilter !== "all" ? "No matches found" : "No candidates yet"}</h3>
                    <p>{candidateSearch || candidateFilter !== "all" ? "Try a different search or filter." : "Students will appear here once they upload their resumes."}</p>
                  </div>
                ) : (
                  <div className="rd-cand-grid">
                    {filteredCandidates.map((c, i) => {
                      const name = c.candidate_name || "Unknown";
                      const init = getInitial(name);
                      const mm = matchMap[c.id];
                      const isSaved = savedIds.has(c.candidate_id);
                      return (
                        <div key={c.id} className="rd-cand-card" style={{ "--i": Math.min(i, 12) }}>
                          <div className="rd-cand-card-top">
                            <div className="rd-av rd-av-lg" style={{ background: `linear-gradient(135deg, ${avatarColor(init)})` }}>{init}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              {matchPostId && mm ? <MatchBadge score={mm.score} /> : c.ats_score ? <div className="rd-cand-match"><span className="rd-match-num">{c.ats_score}</span><span className="rd-match-lbl">ATS</span></div> : null}
                              <button className={`rd-save-btn ${isSaved ? "saved" : ""}`} title={isSaved ? "Remove from talent pool" : "Save to talent pool"} onClick={() => toggleSave(c.candidate_id)}><Icon.Bookmark /></button>
                            </div>
                          </div>
                          <h3 className="rd-cand-name">{name}</h3>
                          <p className="rd-cand-role">{c.role || "—"}</p>
                          <p className="rd-cand-college">{c.college || c.candidate_email || "—"}</p>
                          <div className="rd-cand-meta">{c.location && <span><Icon.MapPin />{c.location}</span>}{c.experience && <span><Icon.Calendar />{c.experience}</span>}</div>
                          <div className="rd-cand-skills">
                            {(c.skills || []).slice(0, 4).map((s, j) => <span key={j} className={`rd-skill-tag rd-skill-sm ${mm?.matchedSkills?.includes(nk(s)) ? "rd-skill-match" : ""}`}>{s}</span>)}
                          </div>
                          {mm?.missingSkills?.length > 0 && <div className="rd-cand-skills">{mm.missingSkills.slice(0, 2).map(s => <span key={s} className="rd-skill-tag rd-skill-sm rd-skill-missing">missing: {s}</span>)}</div>}
                          {c.ats_score && <div className="rd-cand-score-bar"><div className="rd-score-bar"><div className="rd-score-fill" style={{ width: `${c.ats_score * 10}%` }} /></div><span className="rd-score-num">{c.ats_score}/10</span></div>}
                          {c.resume_url && <div className="rd-cand-has-resume"><Icon.FileText /> Resume available</div>}
                          <div className="rd-cand-actions">
                            <button className="rd-action-btn" onClick={() => openCandidateDrawer(c)}><Icon.Eye /> Profile</button>
                            <button className="rd-action-btn rd-action-primary" onClick={() => { setSelectedCandidate(c); setInviteTarget(c); }}><Icon.Send /> Invite</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* INVITES */}
          {activeTab === "invites" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar"><div><h2 className="rd-section-heading">Interview Invites</h2><p className="rd-section-sub">Track invites & chat with candidates</p></div></div>
              <div className="rd-card">
                {invites.length === 0 ? <p className="rd-empty-hint" style={{ padding: "16px 0" }}>No invites sent yet. Go to Candidates to invite someone.</p> : (
                  <div className="rd-table-wrap">
                    <table className="rd-table">
                      <thead><tr><th>Candidate</th><th>Position</th><th>Sent</th><th>Status</th><th>Chat</th></tr></thead>
                      <tbody>
                        {invites.map(iv => {
                          const name = iv.candidate_name || (iv.candidate_id || "").slice(0, 8) + "...";
                          const hasUnread = inviteUnreadCounts[iv.id] > 0;
                          return (
                            <tr key={iv.id} style={hasUnread ? { background: "rgba(102,126,234,0.04)" } : {}}>
                              <td><div className="rd-cand-cell"><div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(getInitial(name))})` }}>{getInitial(name)}</div><span>{name}</span></div></td>
                              <td className="rd-td-muted">{iv.job_posts?.title || "—"}</td>
                              <td className="rd-td-muted">{fmtDate(iv.created_at, true)}</td>
                              <td><StatusBadge status={iv.status} /></td>
                              <td>
                                <button className={`rd-action-btn rd-action-primary ${hasUnread ? "rd-chat-btn-alert" : ""}`} onClick={() => { setActiveChatInvite(iv); setInviteUnreadCounts(prev => ({ ...prev, [iv.id]: 0 })); }}>
                                  <Icon.MessageCircle /> Chat{hasUnread && <span className="rd-chat-unread-badge">{inviteUnreadCounts[iv.id]}</span>}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar"><div><h2 className="rd-section-heading">Analytics</h2><p className="rd-section-sub">Hiring performance at a glance</p></div></div>
              <div className="rd-analytics-grid">
                <div className="rd-card">
                  <h3 className="rd-card-title" style={{ marginBottom: 18 }}>Hiring Funnel</h3>
                  {pipeApps.length === 0 ? <p className="rd-empty-hint">No applications yet.</p> : (
                    <div className="rd-funnel">
                      {funnelSteps.map(s => (
                        <div key={s.id} className="rd-funnel-row"><span>{s.label}</span>
                          <div className="rd-funnel-track"><div className="rd-funnel-fill" style={{ width: `${(s.n / pipeApps.length) * 100}%`, background: s.color }} /></div>
                          <span className="rd-funnel-val">{s.n}<small>{Math.round((s.n / pipeApps.length) * 100)}%</small></span></div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rd-card rd-analytics-card">
                  <h3 className="rd-card-title">ATS Score Distribution</h3>
                  <div className="rd-bar-chart">
                    {[...Array(10)].map((_, i) => {
                      const count = candidates.filter(c => c.ats_score && Math.ceil(Number(c.ats_score)) === i + 1).length;
                      return <div key={i} className="rd-bar-col"><div className="rd-bar" style={{ height: `${count * 40}px`, minHeight: count ? "8px" : "0" }} /><span className="rd-bar-label">{i + 1}</span></div>;
                    })}
                  </div>
                  <p className="rd-chart-hint">ATS Score (1–10) from Resume Analyzer</p>
                </div>
                <div className="rd-card rd-analytics-card">
                  <h3 className="rd-card-title" style={{ marginBottom: 18 }}>Top Skills in Pool</h3>
                  {candidates.length === 0 ? <p className="rd-empty-hint">No data yet.</p> : (
                    <div className="rd-skill-analytics">
                      {(() => {
                        const freq = candidates.flatMap(c => c.skills || []).reduce((acc, s) => { const k = nk(s); acc[k] = (acc[k] || 0) + 1; return acc; }, {});
                        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, count], i) => {
                          const pct = Math.round((count / candidates.length) * 100);
                          return <div key={skill} className="rd-skill-row"><span className="rd-skill-row-name">{skill}</span><div className="rd-skill-row-bar"><div className="rd-skill-row-fill" style={{ width: `${pct}%`, animationDelay: `${i * 0.1}s` }} /></div><span className="rd-skill-row-pct">{pct}%</span></div>;
                        });
                      })()}
                    </div>
                  )}
                </div>
                <div className="rd-card">
                  <h3 className="rd-card-title" style={{ marginBottom: 18 }}>Invite Conversion</h3>
                  <div className="rd-exp-donut-wrap">
                    {[{ label: "Pending", color: "#fcd34d", filter: "pending" }, { label: "Accepted", color: "#43e97b", filter: "accepted" }, { label: "Declined", color: "#fca5a5", filter: "declined" }].map(({ label, color, filter }) => {
                      const count = invites.filter(i => i.status === filter).length;
                      return <div key={label} className="rd-exp-row"><span className="rd-exp-dot" style={{ background: color }} /><span className="rd-exp-label">{label}</span><span className="rd-exp-count">{count}</span><div className="rd-exp-bar"><div style={{ width: invites.length ? `${(count / invites.length) * 100}%` : "0%", background: color }} /></div></div>;
                    })}
                  </div>
                  {invites.length > 0 && <p className="rd-chart-hint" style={{ marginTop: 14 }}>Acceptance rate: {Math.round((invites.filter(i => i.status === "accepted").length / invites.length) * 100)}%</p>}
                </div>
                <div className="rd-card" style={{ gridColumn: "1 / -1" }}>
                  <h3 className="rd-card-title" style={{ marginBottom: 12 }}>Post Performance</h3>
                  <div className="rd-post-perf-list">
                    {posts.length === 0 && <p className="rd-empty-hint">No posts yet.</p>}
                    {posts.map(p => {
                      const apps = pipeApps.filter(a => a.job_post_id === p.id);
                      const sl = apps.filter(a => ["shortlisted", "interview", "offer", "hired"].includes(a.status)).length;
                      return (
                        <div key={p.id} className="rd-post-perf-row">
                          <div><div className="rd-post-perf-title">{p.title}</div><div className="rd-post-perf-meta">{p.type} · {sl} shortlisted+</div></div>
                          <div className="rd-post-perf-right">
                            <button className="rd-applicants-badge" style={{ cursor: "pointer" }} onClick={() => { setApplicantsPost(p); setActiveTab("posts"); }}>{p.applicants} applicants</button>
                            <span className={`rd-live-dot ${p.active ? "live" : "paused"}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar"><div><h2 className="rd-section-heading">Settings</h2><p className="rd-section-sub">Manage your recruiter account</p></div></div>
              <div className="rd-settings-grid">
                <div className="rd-card">
                  <h3 className="rd-card-title" style={{ marginBottom: 18 }}>Company Profile</h3>
                  <div className="rd-settings-form">
                    <div className="rd-field"><label>Company Name</label><input placeholder="Your company name" /></div>
                    <div className="rd-field"><label>Industry</label><input placeholder="e.g. SaaS, Fintech, EdTech" /></div>
                    <div className="rd-field"><label>Website</label><input placeholder="https://yourcompany.com" /></div>
                    <div className="rd-field rd-field-full"><label>About</label><textarea rows={3} placeholder="Brief description of your company..." /></div>
                    <button className="rd-btn-primary rd-btn-sm" onClick={() => showToast("Company profile storage is coming soon.")}>Save Changes</button>
                  </div>
                </div>
                <div className="rd-card">
                  <h3 className="rd-card-title" style={{ marginBottom: 18 }}>Notification Preferences</h3>
                  <div className="rd-toggle-list">
                    {["New application received", "Invite accepted by candidate", "Candidate messages", "Weekly digest"].map((label, i) => <div key={i} className="rd-toggle-row"><span>{label}</span><div className="rd-toggle rd-toggle-on" /></div>)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showPostModal && <PostModal onClose={() => { setShowPostModal(false); setEditingPost(null); }} onSubmit={handlePublishPost} editPost={editingPost} saving={savingPost} user={user} showToast={showToast} />}
      {selectedCandidate && !inviteTarget && (
        <CandidateDrawer candidate={selectedCandidate} resumeUrl={resumeSignedUrl} user={user} selectedPost={matchPost}
          saved={savedIds.has(selectedCandidate.candidate_id)} onToggleSave={toggleSave} showToast={showToast}
          onClose={() => { setSelectedCandidate(null); setResumeSignedUrl(null); }} onInvite={(c) => setInviteTarget(c)} />
      )}
      {inviteTarget && <InviteModal candidate={inviteTarget} posts={posts.filter(p => p.active)} user={user} onClose={() => { setInviteTarget(null); setSelectedCandidate(null); }} onSend={handleSendInvite} />}
      {applicantsPost && (
        <ApplicantsDrawer post={applicantsPost} user={user} showToast={showToast}
          onClose={() => { setApplicantsPost(null); fetchPosts(user.id); }}
          onInvite={(app) => { setApplicantsPost(null); setInviteTarget({ candidate_id: app.candidate_id, candidate_name: app.candidate_name, candidate_email: app.candidate_email }); }}
          onKit={(app, post) => setKitTarget({ candidate: app, job: post })}
          onStatusChange={() => fetchPipeline(posts)} />
      )}
      {kitTarget && <InterviewKitModal candidate={kitTarget.candidate} job={kitTarget.job} onClose={() => setKitTarget(null)} />}
      {activeChatInvite && <RecruiterChatModal invite={activeChatInvite} user={user} onClose={() => { setActiveChatInvite(null); fetchInvites(user.id); }} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}