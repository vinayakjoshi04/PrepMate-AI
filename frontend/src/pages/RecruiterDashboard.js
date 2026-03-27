import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./RecruiterDashboard.css";

/* ─── SVG Icon Library ───────────────────────────────── */
const Icon = {
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Briefcase: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  BarChart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  LogOut: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Eye: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Mail: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Star: () => <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Calendar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Tag: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Send: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Filter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Award: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  FileText: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  RefreshCw: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  MessageCircle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
};

/* ─── Helpers ────────────────────────────────────────── */
function avatarColor(letter) {
  const map = { A: "#667eea, #764ba2", P: "#f093fb, #f5576c", R: "#4facfe, #00f2fe", S: "#43e97b, #38f9d7", V: "#fa709a, #fee140", B: "#a18cd1, #fbc2eb", D: "#f7971e, #ffd200", K: "#11998e, #38ef7d", M: "#834d9b, #d04ed6", N: "#1a1a2e, #16213e" };
  return map[letter?.toUpperCase()] || "#667eea, #764ba2";
}
function getInitial(name) { return name ? name.charAt(0).toUpperCase() : "?"; }

function StatusBadge({ status }) {
  const cls = { Completed: "rd-badge-green", "In Progress": "rd-badge-amber", Scheduled: "rd-badge-purple", pending: "rd-badge-amber", accepted: "rd-badge-green", declined: "rd-badge-dim" };
  return <span className={`rd-badge ${cls[status] || "rd-badge-dim"}`}>{status}</span>;
}

/* ─── Post Modal ─────────────────────────────────────── */
function PostModal({ onClose, onSubmit, editPost, saving }) {
  const [form, setForm] = useState(editPost || {
    title: "", type: "Full-time", location: "", salary: "", deadline: "",
    description: "", requirements: "", perks: "",
  });
  const [tagInput, setTagInput] = useState(editPost?.tags?.join(", ") || "");
  const handleSubmit = () => {
    if (!form.title || !form.description || !form.location) return;
    onSubmit({ ...form, tags: tagInput.split(",").map(t => t.trim()).filter(Boolean) });
  };
  return (
    <div className="rd-modal-overlay" onClick={onClose}>
      <div className="rd-modal" onClick={e => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div>
            <h2 className="rd-modal-title">{editPost ? "Edit Post" : "Create Job Post"}</h2>
            <p className="rd-modal-sub">Reach thousands of PrepMate students</p>
          </div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="rd-modal-body">
          <div className="rd-field-grid">
            <div className="rd-field rd-field-full"><label>Job Title *</label><input placeholder="e.g. Senior Software Engineer" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="rd-field"><label>Employment Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option><option>Freelance</option></select></div>
            <div className="rd-field"><label>Location *</label><input placeholder="e.g. Bengaluru / Remote" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div className="rd-field"><label>Salary / Stipend</label><input placeholder="e.g. ₹12–20 LPA" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} /></div>
            <div className="rd-field"><label>Application Deadline</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
            <div className="rd-field rd-field-full"><label>Job Description *</label><textarea rows={4} placeholder="Describe the role..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="rd-field rd-field-full"><label>Requirements</label><textarea rows={3} placeholder="Key qualifications..." value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} /></div>
            <div className="rd-field rd-field-full"><label>Perks & Benefits</label><textarea rows={2} placeholder="Health insurance, remote work..." value={form.perks} onChange={e => setForm(f => ({ ...f, perks: e.target.value }))} /></div>
            <div className="rd-field rd-field-full"><label>Skill Tags <span className="rd-label-hint">(comma-separated)</span></label><input placeholder="React, Node.js, AWS..." value={tagInput} onChange={e => setTagInput(e.target.value)} /></div>
          </div>
        </div>
        <div className="rd-modal-footer">
          <button className="rd-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="rd-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="rd-btn-spinner" /> : <Icon.Send />}
            {editPost ? "Update Post" : "Publish Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Invite Modal ───────────────────────────────────── */
function InviteModal({ candidate, posts, onClose, onSend }) {
  const [selectedPost, setSelectedPost] = useState(posts[0]?.id || "");
  const [message, setMessage] = useState(`Hi ${candidate?.candidate_name || candidate?.name},\n\nWe reviewed your profile on PrepMate and are impressed by your background. We'd love to invite you for an interview for one of our open positions.\n\nLooking forward to connecting!\n\nBest regards`);
  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    setSending(true);
    await onSend({ candidateId: candidate.candidate_id || candidate.id, postId: selectedPost, message });
    setSending(false);
    onClose();
  };
  return (
    <div className="rd-modal-overlay" onClick={onClose}>
      <div className="rd-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="rd-modal-header">
          <div><h2 className="rd-modal-title">Invite to Interview</h2><p className="rd-modal-sub">Send an invite to {candidate?.candidate_name || candidate?.name}</p></div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="rd-modal-body">
          <div className="rd-field" style={{ marginBottom: 16 }}>
            <label>Select Job Position</label>
            <select value={selectedPost} onChange={e => setSelectedPost(e.target.value)}>
              <option value="">— No specific post —</option>
              {posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="rd-field"><label>Message</label><textarea rows={7} value={message} onChange={e => setMessage(e.target.value)} /></div>
        </div>
        <div className="rd-modal-footer">
          <button className="rd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="rd-btn-primary" onClick={handleSend} disabled={sending}>
            {sending ? <span className="rd-btn-spinner" /> : <Icon.Send />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── NEW: Recruiter Chat Modal ──────────────────────── */
function RecruiterChatModal({ invite, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("invite_messages")
      .select("*")
      .eq("invite_id", invite.id)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  }, [invite.id]);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`rd-chat:${invite.id}`)
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
  }, [fetchMessages, invite.id]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    await supabase.from("invite_messages").insert({
      invite_id: invite.id,
      sender_id: user.id,
      sender_role: "recruiter",
      content: text,
    });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Get candidate name - use the actual name from the invite
  const candidateName = invite.candidate_name || "Candidate";
  const init = getInitial(candidateName);
  const jobTitle = invite.job_posts?.title || "Interview Opportunity";

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor(init)})` }}>
              {init}
            </div>
            <div>
              <div className="chat-header-name">{candidateName}</div>
              <div className="chat-header-role">
                {jobTitle}
                {" · "}
                <span style={{
                  color: invite.status === "accepted" ? "#43e97b" : invite.status === "declined" ? "#fca5a5" : "#fcd34d",
                  fontWeight: 600
                }}>{invite.status}</span>
              </div>
            </div>
          </div>
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>

        {/* Invite banner */}
        <div className="chat-invite-banner">
          <div className="chat-invite-icon">💼</div>
          <div>
            <div className="chat-invite-title">{jobTitle}</div>
            <div className="chat-invite-sub">
              Chatting with {candidateName}
              {" · "}
              {invite.status === "pending"
                ? "Waiting for response"
                : invite.status === "accepted"
                  ? "Candidate replied"
                  : "Candidate declined"}
            </div>
          </div>
        </div>

        {/* Messages - rest remains the same */}
        <div className="chat-messages">
          {loading
            ? <div className="chat-loading"><div className="rd-loading-ring" /></div>
            : messages.length === 0
              ? <div className="chat-empty">
                  <div className="chat-empty-icon">💬</div>
                  <p>No messages yet. Start the conversation with {candidateName}.</p>
                </div>
              : messages.map((msg, i) => {
                  const isMe = msg.sender_role === "recruiter";
                  return (
                    <div key={msg.id || i} className={`chat-bubble-wrap ${isMe ? "chat-bubble-right" : "chat-bubble-left"}`}>
                      <div className={`chat-bubble ${isMe ? "chat-bubble-me" : "chat-bubble-them"}`}>
                        {msg.content}
                      </div>
                      <div className="chat-bubble-time">
                        {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Input */}
        <div className="chat-input-row">
          <textarea
            className="chat-input"
            placeholder="Type a message… (Enter to send)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button
            className={`chat-send-btn ${sending ? "chat-send-sending" : ""}`}
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            {sending
              ? <div className="rd-loading-ring" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : <Icon.Send />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Candidate / Resume Drawer ──────────────────────── */
function CandidateDrawer({ candidate, onClose, onInvite, resumeUrl }) {
  if (!candidate) return null;
  const name = candidate.candidate_name || candidate.name || "Unknown";
  const initial = getInitial(name);
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
            {candidate.ats_score && (
              <div className="rd-match-ring">
                <span className="rd-match-pct">{candidate.ats_score}</span>
                <span className="rd-match-label">ATS score</span>
              </div>
            )}
          </div>
          <div className="rd-profile-meta">
            {candidate.location && <span className="rd-meta-chip"><Icon.MapPin />{candidate.location}</span>}
            {candidate.experience && <span className="rd-meta-chip"><Icon.Calendar />{candidate.experience}</span>}
            {candidate.ats_score && <span className="rd-meta-chip rd-chip-score"><Icon.Star />{candidate.ats_score}/10</span>}
          </div>
          {candidate.skills?.length > 0 && (
            <div className="rd-section-block">
              <h3 className="rd-block-title">Skills</h3>
              <div className="rd-skills-wrap">{candidate.skills.map((s, i) => <span key={i} className="rd-skill-tag">{s}</span>)}</div>
            </div>
          )}
          <div className="rd-section-block">
            <h3 className="rd-block-title">Contact</h3>
            <p className="rd-contact-email"><Icon.Mail /> {candidate.candidate_email || "—"}</p>
          </div>
          {candidate.resume_url && (
            <div className="rd-section-block">
              <h3 className="rd-block-title">Resume</h3>
              <a href={resumeUrl || "#"} target="_blank" rel="noopener noreferrer" className="rd-resume-download-btn">
                <Icon.Download /> Download Resume
                {candidate.resume_filename && <span className="rd-resume-fname">{candidate.resume_filename}</span>}
              </a>
            </div>
          )}
          <div className="rd-drawer-actions">
            <button className="rd-btn-ghost rd-btn-full" onClick={onClose}>Close</button>
            <button className="rd-btn-primary rd-btn-full" onClick={() => onInvite(candidate)}><Icon.Send /> Invite to Interview</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Toast ──────────────────────────────────────────── */
function Toast({ msg, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`rd-toast ${type === "error" ? "rd-toast-error" : ""}`}>
      <span className="rd-toast-icon">{type === "error" ? <Icon.X /> : <Icon.Check />}</span>
      {msg}
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

  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [savingPost, setSavingPost] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [resumeSignedUrl, setResumeSignedUrl] = useState(null);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  // NEW: chat state
  const [activeChatInvite, setActiveChatInvite] = useState(null);
  const [inviteUnreadCounts, setInviteUnreadCounts] = useState({});

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
    const { data } = await supabase
      .from("interview_invites")
      .select("*, job_posts(title)")
      .eq("recruiter_id", uid)
      .order("created_at", { ascending: false });
    if (data) setInvites(data);
  }, []);

  // Real-time: listen for candidate replies (status changes & new messages)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`recruiter-invites:${user.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "interview_invites",
        filter: `recruiter_id=eq.${user.id}`,
      }, (payload) => {
        setInvites(prev => prev.map(i => i.id === payload.new.id ? { ...i, ...payload.new } : i));
        if (payload.new.status === "accepted") {
          showToast(`Candidate accepted your invite! Open chat to reply.`);
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "invite_messages",
      }, (payload) => {
        if (payload.new.sender_role === "candidate") {
          setInviteUnreadCounts(prev => ({
            ...prev,
            [payload.new.invite_id]: (prev[payload.new.invite_id] || 0) + 1
          }));
          showToast("New message from a candidate!");
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  const openCandidateDrawer = async (c) => {
    setSelectedCandidate(c);
    setResumeSignedUrl(null);
    if (c.resume_url) {
      const { data } = await supabase.storage.from("resumes").createSignedUrl(c.resume_url, 3600);
      if (data?.signedUrl) setResumeSignedUrl(data.signedUrl);
    }
  };

  const handlePublishPost = async (form) => {
    setSavingPost(true);
    if (editingPost) {
      const { error } = await supabase.from("job_posts").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editingPost.id).eq("recruiter_id", user.id);
      if (!error) { setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...form } : p)); showToast("Job post updated!"); }
      else showToast("Failed to update post.", "error");
    } else {
      const { data, error } = await supabase.from("job_posts").insert({ ...form, recruiter_id: user.id, applicants: 0, active: true }).select().single();
      if (!error && data) { setPosts(prev => [data, ...prev]); showToast("Job post published!"); }
      else showToast("Failed to publish post.", "error");
    }
    setSavingPost(false); setShowPostModal(false); setEditingPost(null);
  };

  const handleDeletePost = async (id) => {
    const { error } = await supabase.from("job_posts").delete().eq("id", id).eq("recruiter_id", user.id);
    if (!error) { setPosts(prev => prev.filter(p => p.id !== id)); showToast("Post removed."); }
    else showToast("Failed to delete post.", "error");
  };

  const handleTogglePost = async (id, current) => {
    const { error } = await supabase.from("job_posts").update({ active: !current }).eq("id", id).eq("recruiter_id", user.id);
    if (!error) setPosts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handleSendInvite = async ({ candidateId, postId, message }) => {
    const candidateName = selectedCandidate?.candidate_name || inviteTarget?.candidate_name;
    const { data: inviteData, error } = await supabase.from("interview_invites").insert({
      recruiter_id: user.id,
      recruiter_email: user.email,
      candidate_id: candidateId,
      candidate_name: candidateName,
      job_post_id: postId || null,
      message,
      status: "pending",
      candidate_read: false,
    }).select("*, job_posts(title)").single();

    if (!error && inviteData) {
      showToast(`Invitation sent to ${candidateName}!`);
      fetchInvites(user.id);
      // Auto-open chat for the initial message
      await supabase.from("invite_messages").insert({
        invite_id: inviteData.id,
        sender_id: user.id,
        sender_role: "recruiter",
        content: message,
      });
    } else {
      showToast("Failed to send invite.", "error");
    }
    setInviteTarget(null);
    setSelectedCandidate(null);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };
  const showToast = (msg, type = "success") => setToast({ msg, type });

  const filteredCandidates = candidates.filter(c => {
    const q = candidateSearch.toLowerCase();
    const name = (c.candidate_name || "").toLowerCase();
    const role = (c.role || "").toLowerCase();
    const skills = (c.skills || []).map(s => s.toLowerCase());
    const matchesSearch = !q || name.includes(q) || role.includes(q) || skills.some(s => s.includes(q));
    const matchesFilter = candidateFilter === "all" || (c.experience || "").toLowerCase().includes(candidateFilter.toLowerCase()) || (c.role || "").toLowerCase().includes(candidateFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalInvites: invites.length,
    activePositions: posts.filter(p => p.active).length,
    candidatesPool: candidates.length,
    avgAts: candidates.filter(c => c.ats_score).length
      ? (candidates.reduce((s, c) => s + (c.ats_score || 0), 0) / candidates.filter(c => c.ats_score).length).toFixed(1)
      : "—",
  };

  const totalUnread = Object.values(inviteUnreadCounts).reduce((a, b) => a + b, 0);

  const NAV = [
    { id: "overview",   label: "Overview",   icon: Icon.Home },
    { id: "posts",      label: "Job Posts",  icon: Icon.Edit },
    { id: "candidates", label: "Candidates", icon: Icon.Users },
    { id: "invites",    label: "Invites",    icon: Icon.Mail },
    { id: "analytics",  label: "Analytics",  icon: Icon.BarChart },
    { id: "settings",   label: "Settings",   icon: Icon.Settings },
  ];

  if (loading) return (
    <div className="rd-loading"><div className="rd-loading-ring" /><p>Loading workspace...</p></div>
  );

  return (
    <div className={`rd-root ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="rd-ambient rd-amb-1" />
      <div className="rd-ambient rd-amb-2" />

      {/* Sidebar */}
      <aside className="rd-sidebar">
        <div className="rd-sidebar-top">
          <div className="rd-brand">
            <div className="rd-brand-icon"><Icon.Zap /></div>
            <div className="rd-brand-text">
              <span className="rd-brand-name">PrepMate</span>
              <span className="rd-brand-badge">Recruiter</span>
            </div>
          </div>
          <nav className="rd-nav">
            {NAV.map(({ id, label, icon: Ic }) => (
              <button key={id} className={`rd-nav-item ${activeTab === id ? "active" : ""}`}
                onClick={() => { setActiveTab(id); setSidebarOpen(false); }}>
                <span className="rd-nav-icon"><Ic /></span>
                <span>{label}</span>
                {id === "posts" && posts.length > 0 && <span className="rd-nav-badge">{posts.length}</span>}
                {id === "candidates" && candidates.length > 0 && <span className="rd-nav-badge">{candidates.length}</span>}
                {id === "invites" && (invites.length > 0 || totalUnread > 0) && (
                  <span className={`rd-nav-badge ${totalUnread > 0 ? "rd-nav-badge-alert" : ""}`}>
                    {totalUnread > 0 ? totalUnread : invites.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="rd-sidebar-bottom">
          <div className="rd-user-card">
            <div className="rd-user-av">{user?.email?.charAt(0).toUpperCase()}</div>
            <div className="rd-user-info">
              <div className="rd-user-name">{user?.email?.split("@")[0]}</div>
              <div className="rd-user-role">Recruiter</div>
            </div>
          </div>
          <button className="rd-logout-btn" onClick={handleLogout}><Icon.LogOut /> Sign out</button>
        </div>
      </aside>

      {sidebarOpen && <div className="rd-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="rd-main">
        <header className="rd-topbar">
          <button className="rd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
            <span /><span /><span />
          </button>
          <div className="rd-topbar-title"><h1>{NAV.find(n => n.id === activeTab)?.label}</h1></div>
          <div className="rd-topbar-right">
            <button className="rd-icon-action" onClick={() => { fetchCandidates(); fetchPosts(user.id); fetchInvites(user.id); }}><Icon.RefreshCw /></button>
            <button className="rd-icon-action" style={{ position: "relative" }} onClick={() => setActiveTab("invites")}>
              <Icon.Bell />
              {totalUnread > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "#f5576c", color: "#fff",
                  fontSize: 10, fontWeight: 700,
                  borderRadius: "50%", width: 16, height: 16,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>{totalUnread}</span>
              )}
            </button>
            {activeTab === "posts" && (
              <button className="rd-btn-primary rd-btn-sm" onClick={() => { setEditingPost(null); setShowPostModal(true); }}>
                <Icon.Plus /> New Post
              </button>
            )}
          </div>
        </header>

        <div className="rd-content">

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="rd-tab-anim">
              <div className="rd-welcome">
                <div>
                  <h2 className="rd-welcome-title">Good to see you, <span className="rd-highlight">{user?.email?.split("@")[0]}</span> 👋</h2>
                  <p className="rd-welcome-sub">Your hiring workspace is active. Here's your snapshot.</p>
                </div>
                <button className="rd-btn-primary" onClick={() => { setEditingPost(null); setShowPostModal(true); setActiveTab("posts"); }}>
                  <Icon.Plus /> Post a Job
                </button>
              </div>
              <div className="rd-stats-grid">
                {[
                  { label: "Invites Sent",     value: stats.totalInvites,     sub: "to PrepMate candidates",   icon: Icon.Mail,      grad: "rd-grad-blue"   },
                  { label: "Active Positions", value: stats.activePositions,  sub: `${posts.length} total posts`, icon: Icon.Briefcase, grad: "rd-grad-purple" },
                  { label: "Candidate Pool",   value: stats.candidatesPool,   sub: "resumes visible",           icon: Icon.Users,     grad: "rd-grad-green"  },
                  { label: "Avg ATS Score",    value: stats.avgAts !== "NaN" ? `${stats.avgAts}/10` : "—", sub: "across all candidates", icon: Icon.Award, grad: "rd-grad-pink" },
                ].map(({ label, value, sub, icon: Ic, grad }, i) => (
                  <div className="rd-stat-card" key={i} style={{ "--i": i }}>
                    <div className={`rd-stat-icon-wrap ${grad}`}><Ic /></div>
                    <div className="rd-stat-body">
                      <div className="rd-stat-label">{label}</div>
                      <div className="rd-stat-value">{value}</div>
                      <div className="rd-stat-sub">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* NEW: Candidate replies alert */}
              {totalUnread > 0 && (
                <div className="rd-reply-alert" onClick={() => setActiveTab("invites")}>
                  <div className="rd-reply-alert-icon">💬</div>
                  <div>
                    <div className="rd-reply-alert-title">You have {totalUnread} new candidate {totalUnread === 1 ? "reply" : "replies"}!</div>
                    <div className="rd-reply-alert-sub">Click to view and chat with candidates</div>
                  </div>
                  <button className="rd-btn-primary rd-btn-sm">View Chats →</button>
                </div>
              )}

              <div className="rd-card">
                <div className="rd-card-header">
                  <h3 className="rd-card-title">Recent Candidates</h3>
                  <button className="rd-text-btn" onClick={() => setActiveTab("candidates")}>View all →</button>
                </div>
                {candidatesLoading ? (
                  <div className="rd-loading-inline"><div className="rd-loading-ring rd-ring-sm" /><span>Loading...</span></div>
                ) : candidates.length === 0 ? (
                  <p className="rd-empty-hint">No candidates have uploaded resumes yet.</p>
                ) : (
                  <div className="rd-table-wrap">
                    <table className="rd-table">
                      <thead><tr><th>Candidate</th><th>Role</th><th>College</th><th>ATS Score</th><th>Action</th></tr></thead>
                      <tbody>
                        {candidates.slice(0, 5).map(c => {
                          const name = c.candidate_name || "—";
                          const init = getInitial(name);
                          return (
                            <tr key={c.id}>
                              <td><div className="rd-cand-cell"><div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(init)})` }}>{init}</div><span>{name}</span></div></td>
                              <td className="rd-td-muted">{c.role || "—"}</td>
                              <td className="rd-td-muted">{c.college || "—"}</td>
                              <td>{c.ats_score ? <span className="rd-score-pill">{c.ats_score}</span> : <span className="rd-td-muted">—</span>}</td>
                              <td><button className="rd-action-btn" onClick={() => openCandidateDrawer(c)}><Icon.Eye /> View</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rd-card">
                <div className="rd-card-header">
                  <h3 className="rd-card-title">Your Job Posts</h3>
                  <button className="rd-text-btn" onClick={() => setActiveTab("posts")}>Manage →</button>
                </div>
                <div className="rd-posts-mini">
                  {postsLoading && <div className="rd-loading-inline"><div className="rd-loading-ring rd-ring-sm" /></div>}
                  {!postsLoading && posts.length === 0 && <p className="rd-empty-hint">No posts yet. <button className="rd-inline-link" onClick={() => { setShowPostModal(true); setActiveTab("posts"); }}>Create your first post →</button></p>}
                  {posts.slice(0, 3).map(post => (
                    <div key={post.id} className="rd-post-mini-card">
                      <div>
                        <div className="rd-post-mini-title">{post.title}</div>
                        <div className="rd-post-mini-meta">{post.type} · {post.location} · {new Date(post.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                      </div>
                      <div className="rd-post-mini-right">
                        <span className="rd-applicants-badge">{post.applicants} applicants</span>
                        <span className={`rd-live-dot ${post.active ? "live" : "paused"}`} />
                      </div>
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
                    <div className="rd-empty-icon"><Icon.Briefcase /></div>
                    <h3>No posts yet</h3>
                    <p>Create your first job post to start reaching PrepMate students.</p>
                    <button className="rd-btn-primary" onClick={() => setShowPostModal(true)}><Icon.Plus /> Create Post</button>
                  </div>
                ) : (
                  <div className="rd-posts-list">
                    {posts.map(post => (
                      <div key={post.id} className={`rd-post-card ${!post.active ? "rd-post-paused" : ""}`}>
                        <div className="rd-post-card-top">
                          <div className="rd-post-card-left">
                            <div className="rd-post-live-indicator">
                              <span className={`rd-live-dot-lg ${post.active ? "live" : "paused"}`} />
                              <span className="rd-live-label">{post.active ? "Live" : "Paused"}</span>
                            </div>
                            <h3 className="rd-post-title">{post.title}</h3>
                            <div className="rd-post-meta-row">
                              <span><Icon.Briefcase />{post.type}</span>
                              <span><Icon.MapPin />{post.location}</span>
                              {post.salary && <span><Icon.Tag />{post.salary}</span>}
                              {post.deadline && <span><Icon.Calendar />Due {new Date(post.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>}
                            </div>
                            <p className="rd-post-desc">{post.description}</p>
                            <div className="rd-post-tags">{(post.tags || []).map((t, i) => <span key={i} className="rd-skill-tag">{t}</span>)}</div>
                          </div>
                          <div className="rd-post-card-right">
                            <div className="rd-applicants-ring">
                              <span className="rd-appl-num">{post.applicants}</span>
                              <span className="rd-appl-lbl">applicants</span>
                            </div>
                            <span className="rd-posted-time">{new Date(post.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                          </div>
                        </div>
                        <div className="rd-post-card-actions">
                          <button className="rd-action-btn" onClick={() => { setEditingPost(post); setShowPostModal(true); }}><Icon.Edit /> Edit</button>
                          <button className="rd-action-btn" onClick={() => handleTogglePost(post.id, post.active)}>{post.active ? <><Icon.Eye /> Pause</> : <><Icon.Globe /> Activate</>}</button>
                          <button className="rd-action-btn rd-action-danger" onClick={() => handleDeletePost(post.id)}><Icon.Trash /> Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* CANDIDATES */}
          {activeTab === "candidates" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div><h2 className="rd-section-heading">Candidate Pool</h2><p className="rd-section-sub">{candidatesLoading ? "Loading..." : `${filteredCandidates.length} students on PrepMate`}</p></div>
                <button className="rd-btn-ghost rd-btn-sm" onClick={fetchCandidates}><Icon.RefreshCw /> Refresh</button>
              </div>
              <div className="rd-cand-toolbar">
                <div className="rd-search-wrap">
                  <Icon.Search />
                  <input className="rd-search-input" placeholder="Search by name, role, or skill..." value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} />
                  {candidateSearch && <button className="rd-search-clear" onClick={() => setCandidateSearch("")}><Icon.X /></button>}
                </div>
                <div className="rd-filter-pills">
                  {["all", "Fresher", "Intern", "1 yr", "React", "Python"].map(f => (
                    <button key={f} className={`rd-filter-pill ${candidateFilter === f ? "active" : ""}`} onClick={() => setCandidateFilter(f)}>{f === "all" ? "All" : f}</button>
                  ))}
                </div>
              </div>
              {candidatesLoading ? <div className="rd-empty-state"><div className="rd-loading-ring" /></div>
                : filteredCandidates.length === 0 ? (
                  <div className="rd-empty-state">
                    <div className="rd-empty-icon"><Icon.Users /></div>
                    <h3>{candidateSearch ? "No matches found" : "No candidates yet"}</h3>
                    <p>{candidateSearch ? "Try a different search term." : "Students will appear here once they upload their resumes."}</p>
                  </div>
                ) : (
                  <div className="rd-cand-grid">
                    {filteredCandidates.map((c, i) => {
                      const name = c.candidate_name || "Unknown";
                      const init = getInitial(name);
                      return (
                        <div key={c.id} className="rd-cand-card" style={{ "--i": i }}>
                          <div className="rd-cand-card-top">
                            <div className="rd-av rd-av-lg" style={{ background: `linear-gradient(135deg, ${avatarColor(init)})` }}>{init}</div>
                            {c.ats_score && <div className="rd-cand-match"><span className="rd-match-num">{c.ats_score}</span><span className="rd-match-lbl">ATS</span></div>}
                          </div>
                          <h3 className="rd-cand-name">{name}</h3>
                          <p className="rd-cand-role">{c.role || "—"}</p>
                          <p className="rd-cand-college">{c.college || c.candidate_email || "—"}</p>
                          <div className="rd-cand-meta">
                            {c.location && <span><Icon.MapPin />{c.location}</span>}
                            {c.experience && <span><Icon.Calendar />{c.experience}</span>}
                          </div>
                          <div className="rd-cand-skills">{(c.skills || []).slice(0, 3).map((s, j) => <span key={j} className="rd-skill-tag rd-skill-sm">{s}</span>)}</div>
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
                )
              }
            </div>
          )}

          {/* INVITES — with chat button */}
          {activeTab === "invites" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div><h2 className="rd-section-heading">Interview Invites</h2><p className="rd-section-sub">Track invites & chat with candidates</p></div>
              </div>
              <div className="rd-card">
                {invites.length === 0 ? (
                  <p className="rd-empty-hint" style={{ padding: "16px 0" }}>No invites sent yet. Go to Candidates to invite someone.</p>
                ) : (
                  <div className="rd-table-wrap">
                    <table className="rd-table">
                      <thead>
                        <tr><th>Candidate</th><th>Position</th><th>Sent</th><th>Status</th><th>Chat</th></tr>
                      </thead>
                      <tbody>
                        {invites.map(iv => {
                          const name = iv.candidate_name || iv.candidate_id?.slice(0, 8) + "...";
                          const hasUnread = inviteUnreadCounts[iv.id] > 0;
                          return (
                            <tr key={iv.id} style={hasUnread ? { background: "rgba(102,126,234,0.04)" } : {}}>
                              <td>
                                <div className="rd-cand-cell">
                                  <div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(getInitial(name))})` }}>{getInitial(name)}</div>
                                  <span>{name}</span>
                                </div>
                              </td>
                              <td className="rd-td-muted">{iv.job_posts?.title || "—"}</td>
                              <td className="rd-td-muted">{new Date(iv.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                              <td><StatusBadge status={iv.status} /></td>
                              <td>
                                <button
                                  className={`rd-action-btn rd-action-primary ${hasUnread ? "rd-chat-btn-alert" : ""}`}
                                  onClick={() => {
                                    setActiveChatInvite(iv);
                                    setInviteUnreadCounts(prev => ({ ...prev, [iv.id]: 0 }));
                                  }}
                                >
                                  <Icon.MessageCircle />
                                  Chat
                                  {hasUnread && <span className="rd-chat-unread-badge">{inviteUnreadCounts[iv.id]}</span>}
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
              <div className="rd-section-toolbar">
                <div><h2 className="rd-section-heading">Analytics</h2><p className="rd-section-sub">Hiring performance at a glance</p></div>
              </div>
              <div className="rd-analytics-grid">
                <div className="rd-card rd-analytics-card">
                  <h3 className="rd-card-title">ATS Score Distribution</h3>
                  <div className="rd-bar-chart">
                    {[...Array(10)].map((_, i) => {
                      const count = candidates.filter(c => c.ats_score && Math.floor(c.ats_score) === i + 1).length;
                      return (
                        <div key={i} className="rd-bar-col">
                          <div className="rd-bar" style={{ height: `${count * 40}px`, minHeight: count ? "8px" : "0" }} />
                          <span className="rd-bar-label">{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="rd-chart-hint">ATS Score (1–10) from Resume Analyzer</p>
                </div>
                <div className="rd-card rd-analytics-card">
                  <h3 className="rd-card-title">Top Skills in Pool</h3>
                  {candidates.length === 0 ? <p className="rd-empty-hint">No data yet.</p> : (
                    <div className="rd-skill-analytics">
                      {(() => {
                        const allSkills = candidates.flatMap(c => c.skills || []);
                        const freq = allSkills.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
                        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, count], i) => {
                          const pct = Math.round((count / candidates.length) * 100);
                          return (
                            <div key={skill} className="rd-skill-row">
                              <span className="rd-skill-row-name">{skill}</span>
                              <div className="rd-skill-row-bar"><div className="rd-skill-row-fill" style={{ width: `${pct}%`, animationDelay: `${i * 0.1}s` }} /></div>
                              <span className="rd-skill-row-pct">{pct}%</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
                <div className="rd-card">
                  <h3 className="rd-card-title">Invite Conversion</h3>
                  <div className="rd-exp-donut-wrap">
                    {[
                      { label: "Pending",  color: "#fcd34d", filter: "pending"  },
                      { label: "Accepted", color: "#43e97b", filter: "accepted" },
                      { label: "Declined", color: "#fca5a5", filter: "declined" },
                    ].map(({ label, color, filter }) => {
                      const count = invites.filter(i => i.status === filter).length;
                      return (
                        <div key={label} className="rd-exp-row">
                          <span className="rd-exp-dot" style={{ background: color }} />
                          <span className="rd-exp-label">{label}</span>
                          <span className="rd-exp-count">{count}</span>
                          <div className="rd-exp-bar"><div style={{ width: invites.length ? `${(count / invites.length) * 100}%` : "0%", background: color }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rd-card">
                  <h3 className="rd-card-title">Post Performance</h3>
                  <div className="rd-post-perf-list">
                    {posts.length === 0 && <p className="rd-empty-hint">No posts yet.</p>}
                    {posts.map(p => (
                      <div key={p.id} className="rd-post-perf-row">
                        <div><div className="rd-post-perf-title">{p.title}</div><div className="rd-post-perf-meta">{p.type}</div></div>
                        <div className="rd-post-perf-right">
                          <span className="rd-applicants-badge">{p.applicants} applied</span>
                          <span className={`rd-live-dot ${p.active ? "live" : "paused"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div><h2 className="rd-section-heading">Settings</h2><p className="rd-section-sub">Manage your recruiter account</p></div>
              </div>
              <div className="rd-settings-grid">
                <div className="rd-card">
                  <h3 className="rd-card-title">Company Profile</h3>
                  <div className="rd-settings-form">
                    <div className="rd-field"><label>Company Name</label><input placeholder="Your company name" /></div>
                    <div className="rd-field"><label>Industry</label><input placeholder="e.g. SaaS, Fintech, EdTech" /></div>
                    <div className="rd-field"><label>Website</label><input placeholder="https://yourcompany.com" /></div>
                    <div className="rd-field rd-field-full"><label>About</label><textarea rows={3} placeholder="Brief description of your company..." /></div>
                    <button className="rd-btn-primary rd-btn-sm">Save Changes</button>
                  </div>
                </div>
                <div className="rd-card">
                  <h3 className="rd-card-title">Notification Preferences</h3>
                  <div className="rd-toggle-list">
                    {["New resume uploaded", "Invite accepted by candidate", "New PrepMate student joined", "Weekly digest"].map((label, i) => (
                      <div key={i} className="rd-toggle-row">
                        <span>{label}</span>
                        <div className="rd-toggle rd-toggle-on" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Modals & Drawers */}
      {showPostModal && (
        <PostModal onClose={() => { setShowPostModal(false); setEditingPost(null); }} onSubmit={handlePublishPost} editPost={editingPost} saving={savingPost} />
      )}
      {selectedCandidate && !inviteTarget && (
        <CandidateDrawer candidate={selectedCandidate} resumeUrl={resumeSignedUrl} onClose={() => { setSelectedCandidate(null); setResumeSignedUrl(null); }} onInvite={(c) => { setInviteTarget(c); }} />
      )}
      {inviteTarget && (
        <InviteModal candidate={inviteTarget} posts={posts.filter(p => p.active)} onClose={() => { setInviteTarget(null); setSelectedCandidate(null); }} onSend={handleSendInvite} />
      )}

      {/* NEW: Recruiter Chat Modal */}
      {activeChatInvite && (
        <RecruiterChatModal invite={activeChatInvite} user={user} onClose={() => { setActiveChatInvite(null); fetchInvites(user.id); }} />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}