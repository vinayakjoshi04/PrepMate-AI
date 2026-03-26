import { useState, useEffect, useRef } from "react";
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
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d1="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Award: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  Image: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
};

/* ─── Mock Data ──────────────────────────────────────── */
const MOCK_CANDIDATES = [
  { id: 1, name: "Arjun Mehta", email: "arjun@example.com", role: "Frontend Developer", college: "IIT Bombay", skills: ["React", "TypeScript", "Node.js"], score: 9.2, status: "available", location: "Mumbai", experience: "Fresher", avatar: "A", matchPct: 94 },
  { id: 2, name: "Priya Sharma", email: "priya@example.com", role: "Data Scientist", college: "NIT Trichy", skills: ["Python", "ML", "TensorFlow"], score: 8.7, status: "open", location: "Bengaluru", experience: "1 yr", avatar: "P", matchPct: 88 },
  { id: 3, name: "Rohan Das", email: "rohan@example.com", role: "Backend Engineer", college: "BITS Pilani", skills: ["Java", "Spring Boot", "AWS"], score: 8.1, status: "available", location: "Hyderabad", experience: "Fresher", avatar: "R", matchPct: 82 },
  { id: 4, name: "Sneha Iyer", email: "sneha@example.com", role: "Product Designer", college: "IIT Delhi", skills: ["Figma", "UX Research", "Prototyping"], score: 9.5, status: "open", location: "Pune", experience: "Intern", avatar: "S", matchPct: 91 },
  { id: 5, name: "Vikram Nair", email: "vikram@example.com", role: "DevOps Engineer", college: "VIT Vellore", skills: ["Docker", "Kubernetes", "CI/CD"], score: 7.9, status: "available", location: "Chennai", experience: "Fresher", avatar: "V", matchPct: 76 },
  { id: 6, name: "Ananya Bose", email: "ananya@example.com", role: "Full Stack Developer", college: "IIIT Hyderabad", skills: ["React", "Django", "PostgreSQL"], score: 8.4, status: "open", location: "Bengaluru", experience: "1 yr", avatar: "A", matchPct: 85 },
];

const MOCK_INTERVIEWS = [
  { id: 1, candidateName: "Arjun Mehta", position: "Senior Frontend Engineer", date: "2024-03-20", score: 9.2, status: "Completed", avatar: "A" },
  { id: 2, candidateName: "Priya Sharma", position: "Data Scientist", date: "2024-03-19", score: 8.7, status: "Completed", avatar: "P" },
  { id: 3, candidateName: "Rohan Das", position: "Backend Engineer", date: "2024-03-21", score: null, status: "Scheduled", avatar: "R" },
  { id: 4, candidateName: "Sneha Iyer", position: "Product Designer", date: "2024-03-18", score: 9.5, status: "Completed", avatar: "S" },
  { id: 5, candidateName: "Vikram Nair", position: "DevOps Engineer", date: "2024-03-22", score: null, status: "In Progress", avatar: "V" },
];

const MOCK_POSTS = [
  { id: 1, title: "Software Engineer — Full Stack", type: "Full-time", location: "Bengaluru / Remote", salary: "₹12–20 LPA", deadline: "2024-04-15", description: "We're looking for a passionate full-stack engineer to join our growing product team. You'll be building features used by millions.", tags: ["React", "Node.js", "PostgreSQL"], applicants: 37, posted: "2 days ago", active: true },
  { id: 2, title: "Product Design Intern", type: "Internship", location: "Mumbai", salary: "₹25k/month", deadline: "2024-04-01", description: "Join our design team for a 3-month internship. Work on real product challenges and ship features you can be proud of.", tags: ["Figma", "UX", "Prototyping"], applicants: 52, posted: "5 days ago", active: true },
];

/* ─── Post Modal Component ───────────────────────────── */
function PostModal({ onClose, onSubmit, editPost }) {
  const [form, setForm] = useState(editPost || {
    title: "", type: "Full-time", location: "", salary: "", deadline: "",
    description: "", tags: "", requirements: "", perks: "",
  });
  const [tagInput, setTagInput] = useState(editPost?.tags?.join(", ") || "");

  const handleSubmit = () => {
    if (!form.title || !form.description || !form.location) return;
    onSubmit({ ...form, tags: tagInput.split(",").map(t => t.trim()).filter(Boolean) });
    onClose();
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
            <div className="rd-field rd-field-full">
              <label>Job Title *</label>
              <input placeholder="e.g. Senior Software Engineer" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="rd-field">
              <label>Employment Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Internship</option>
                <option>Contract</option>
                <option>Freelance</option>
              </select>
            </div>

            <div className="rd-field">
              <label>Location *</label>
              <input placeholder="e.g. Bengaluru / Remote" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>

            <div className="rd-field">
              <label>Salary / Stipend</label>
              <input placeholder="e.g. ₹12–20 LPA or ₹25k/month" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
            </div>

            <div className="rd-field">
              <label>Application Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </div>

            <div className="rd-field rd-field-full">
              <label>Job Description *</label>
              <textarea rows={4} placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="rd-field rd-field-full">
              <label>Requirements</label>
              <textarea rows={3} placeholder="List key qualifications, skills, and experience required..." value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
            </div>

            <div className="rd-field rd-field-full">
              <label>Perks & Benefits</label>
              <textarea rows={2} placeholder="Health insurance, remote work, learning budget, stock options..." value={form.perks} onChange={e => setForm(f => ({ ...f, perks: e.target.value }))} />
            </div>

            <div className="rd-field rd-field-full">
              <label>Skill Tags <span className="rd-label-hint">(comma-separated)</span></label>
              <input placeholder="React, Node.js, AWS, Python..." value={tagInput} onChange={e => setTagInput(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rd-modal-footer">
          <button className="rd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="rd-btn-primary" onClick={handleSubmit}>
            <Icon.Send />
            {editPost ? "Update Post" : "Publish Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Candidate Profile Drawer ───────────────────────── */
function CandidateDrawer({ candidate, onClose, onInvite }) {
  if (!candidate) return null;
  return (
    <div className="rd-drawer-overlay" onClick={onClose}>
      <div className="rd-drawer" onClick={e => e.stopPropagation()}>
        <div className="rd-drawer-header">
          <button className="rd-modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="rd-drawer-body">
          <div className="rd-profile-hero">
            <div className="rd-profile-avatar" style={{ background: `linear-gradient(135deg, ${avatarColor(candidate.avatar)})` }}>
              {candidate.avatar}
            </div>
            <div>
              <h2 className="rd-profile-name">{candidate.name}</h2>
              <p className="rd-profile-role">{candidate.role}</p>
              <p className="rd-profile-college">{candidate.college}</p>
            </div>
            <div className="rd-match-ring">
              <span className="rd-match-pct">{candidate.matchPct}%</span>
              <span className="rd-match-label">match</span>
            </div>
          </div>

          <div className="rd-profile-meta">
            <span className="rd-meta-chip"><Icon.MapPin />{candidate.location}</span>
            <span className="rd-meta-chip"><Icon.Calendar />{candidate.experience}</span>
            <span className="rd-meta-chip rd-chip-score"><Icon.Star />{candidate.score}/10</span>
          </div>

          <div className="rd-section-block">
            <h3 className="rd-block-title">Skills</h3>
            <div className="rd-skills-wrap">
              {candidate.skills.map((s, i) => <span key={i} className="rd-skill-tag">{s}</span>)}
            </div>
          </div>

          <div className="rd-section-block">
            <h3 className="rd-block-title">Interview Performance</h3>
            <div className="rd-score-bar-wrap">
              <div className="rd-score-bar">
                <div className="rd-score-fill" style={{ width: `${candidate.score * 10}%` }} />
              </div>
              <span className="rd-score-num">{candidate.score}/10</span>
            </div>
          </div>

          <div className="rd-section-block">
            <h3 className="rd-block-title">Contact</h3>
            <p className="rd-contact-email"><Icon.Mail /> {candidate.email}</p>
          </div>

          <div className="rd-drawer-actions">
            <button className="rd-btn-ghost rd-btn-full" onClick={onClose}>Close</button>
            <button className="rd-btn-primary rd-btn-full" onClick={() => { onInvite(candidate); onClose(); }}>
              <Icon.Send /> Invite to Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Invite Toast ───────────────────────────────────── */
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="rd-toast">
      <span className="rd-toast-icon"><Icon.Check /></span>
      {msg}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────── */
function avatarColor(letter) {
  const map = { A: "#667eea, #764ba2", P: "#f093fb, #f5576c", R: "#4facfe, #00f2fe", S: "#43e97b, #38f9d7", V: "#fa709a, #fee140", B: "#a18cd1, #fbc2eb" };
  return map[letter] || "#667eea, #764ba2";
}

function StatusBadge({ status }) {
  const cls = { Completed: "rd-badge-green", "In Progress": "rd-badge-amber", Scheduled: "rd-badge-purple", Pending: "rd-badge-dim" };
  return <span className={`rd-badge ${cls[status] || "rd-badge-dim"}`}>{status}</span>;
}

/* ─── Main Dashboard ─────────────────────────────────── */
export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Posts
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // Candidates
  const [candidates] = useState(MOCK_CANDIDATES);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Interviews
  const [interviews] = useState(MOCK_INTERVIEWS);

  // Toast
  const [toast, setToast] = useState(null);

  const stats = {
    totalInterviews: interviews.length,
    activePositions: posts.filter(p => p.active).length,
    candidatesReviewed: candidates.length,
    avgScore: (candidates.reduce((s, c) => s + c.score, 0) / candidates.length).toFixed(1),
  };

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      if (user.user_metadata?.role !== "recruiter") { navigate("/dashboard"); return; }
      setUser(user);
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handlePublishPost = (post) => {
    if (editingPost) {
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...post } : p));
      setToast("Job post updated successfully!");
    } else {
      setPosts(prev => [{ ...post, id: Date.now(), applicants: 0, posted: "Just now", active: true }, ...prev]);
      setToast("Job post published! Students will see it now.");
    }
    setEditingPost(null);
  };

  const handleDeletePost = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    setToast("Post removed.");
  };

  const handleTogglePost = (id) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const handleInvite = (candidate) => {
    setToast(`Invitation sent to ${candidate.name}!`);
  };

  const filteredCandidates = candidates.filter(c => {
    const q = candidateSearch.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q));
    const matchesFilter = candidateFilter === "all" || c.status === candidateFilter || c.experience.toLowerCase().includes(candidateFilter);
    return matchesSearch && matchesFilter;
  });

  const NAV = [
    { id: "overview", label: "Overview", icon: Icon.Home },
    { id: "posts", label: "Job Posts", icon: Icon.Edit },
    { id: "candidates", label: "Candidates", icon: Icon.Users },
    { id: "interviews", label: "Interviews", icon: Icon.Calendar },
    { id: "analytics", label: "Analytics", icon: Icon.BarChart },
    { id: "settings", label: "Settings", icon: Icon.Settings },
  ];

  if (loading) return (
    <div className="rd-loading">
      <div className="rd-loading-ring" />
      <p>Loading workspace...</p>
    </div>
  );

  return (
    <div className={`rd-root ${sidebarOpen ? "sidebar-open" : ""}`}>
      {/* Background ambient blobs */}
      <div className="rd-ambient rd-amb-1" />
      <div className="rd-ambient rd-amb-2" />

      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className="rd-sidebar">
        <div className="rd-sidebar-top">
          <div className="rd-brand">
            <div className="rd-brand-icon">
              <Icon.Zap />
            </div>
            <div className="rd-brand-text">
              <span className="rd-brand-name">PrepMate</span>
              <span className="rd-brand-badge">Recruiter</span>
            </div>
          </div>

          <nav className="rd-nav">
            {NAV.map(({ id, label, icon: Ic }) => (
              <button
                key={id}
                className={`rd-nav-item ${activeTab === id ? "active" : ""}`}
                onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              >
                <span className="rd-nav-icon"><Ic /></span>
                <span>{label}</span>
                {id === "posts" && <span className="rd-nav-badge">{posts.length}</span>}
                {id === "candidates" && <span className="rd-nav-badge">{candidates.length}</span>}
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
          <button className="rd-logout-btn" onClick={handleLogout}>
            <Icon.LogOut /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="rd-sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ─────────────────────────────────────── */}
      <main className="rd-main">

        {/* Topbar */}
        <header className="rd-topbar">
          <button className="rd-hamburger" onClick={() => setSidebarOpen(o => !o)}>
            <span /><span /><span />
          </button>
          <div className="rd-topbar-title">
            <h1>{NAV.find(n => n.id === activeTab)?.label}</h1>
          </div>
          <div className="rd-topbar-right">
            <button className="rd-icon-action"><Icon.Bell /></button>
            {activeTab === "posts" && (
              <button className="rd-btn-primary rd-btn-sm" onClick={() => { setEditingPost(null); setShowPostModal(true); }}>
                <Icon.Plus /> New Post
              </button>
            )}
          </div>
        </header>

        <div className="rd-content">

          {/* ════ OVERVIEW ════ */}
          {activeTab === "overview" && (
            <div className="rd-tab-anim">
              {/* Welcome */}
              <div className="rd-welcome">
                <div>
                  <h2 className="rd-welcome-title">Good to see you, <span className="rd-highlight">{user?.email?.split("@")[0]}</span> 👋</h2>
                  <p className="rd-welcome-sub">Your hiring workspace is active. Here's your snapshot.</p>
                </div>
                <button className="rd-btn-primary" onClick={() => { setEditingPost(null); setShowPostModal(true); setActiveTab("posts"); }}>
                  <Icon.Plus /> Post a Job
                </button>
              </div>

              {/* Stats */}
              <div className="rd-stats-grid">
                {[
                  { label: "Total Interviews", value: stats.totalInterviews, sub: "+5 this week", icon: Icon.Calendar, grad: "rd-grad-blue" },
                  { label: "Active Positions", value: stats.activePositions, sub: `${posts.filter(p=>p.active).length} live posts`, icon: Icon.Briefcase, grad: "rd-grad-purple" },
                  { label: "Candidates Pool", value: stats.candidatesReviewed, sub: "PrepMate students", icon: Icon.Users, grad: "rd-grad-green" },
                  { label: "Avg. Score", value: `${stats.avgScore}/10`, sub: "+0.4 vs last month", icon: Icon.Award, grad: "rd-grad-pink" },
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

              {/* Quick: Recent Interviews */}
              <div className="rd-card">
                <div className="rd-card-header">
                  <h3 className="rd-card-title">Recent Interviews</h3>
                  <button className="rd-text-btn" onClick={() => setActiveTab("interviews")}>View all →</button>
                </div>
                <div className="rd-table-wrap">
                  <table className="rd-table">
                    <thead><tr><th>Candidate</th><th>Position</th><th>Date</th><th>Score</th><th>Status</th></tr></thead>
                    <tbody>
                      {interviews.slice(0, 4).map(iv => (
                        <tr key={iv.id}>
                          <td>
                            <div className="rd-cand-cell">
                              <div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(iv.avatar)})` }}>{iv.avatar}</div>
                              <span>{iv.candidateName}</span>
                            </div>
                          </td>
                          <td className="rd-td-muted">{iv.position}</td>
                          <td className="rd-td-muted">{new Date(iv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                          <td>{iv.score ? <span className="rd-score-pill">{iv.score}</span> : <span className="rd-td-muted">—</span>}</td>
                          <td><StatusBadge status={iv.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick: Active Posts */}
              <div className="rd-card">
                <div className="rd-card-header">
                  <h3 className="rd-card-title">Your Job Posts</h3>
                  <button className="rd-text-btn" onClick={() => setActiveTab("posts")}>Manage →</button>
                </div>
                <div className="rd-posts-mini">
                  {posts.slice(0, 3).map(post => (
                    <div key={post.id} className="rd-post-mini-card">
                      <div>
                        <div className="rd-post-mini-title">{post.title}</div>
                        <div className="rd-post-mini-meta">{post.type} · {post.location} · {post.posted}</div>
                      </div>
                      <div className="rd-post-mini-right">
                        <span className="rd-applicants-badge">{post.applicants} applicants</span>
                        <span className={`rd-live-dot ${post.active ? "live" : "paused"}`} />
                      </div>
                    </div>
                  ))}
                  {posts.length === 0 && <p className="rd-empty-hint">No posts yet. <button className="rd-inline-link" onClick={() => { setShowPostModal(true); setActiveTab("posts"); }}>Create your first post →</button></p>}
                </div>
              </div>
            </div>
          )}

          {/* ════ JOB POSTS ════ */}
          {activeTab === "posts" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div>
                  <h2 className="rd-section-heading">Job Posts</h2>
                  <p className="rd-section-sub">Publish openings visible to all PrepMate students</p>
                </div>
                <button className="rd-btn-primary" onClick={() => { setEditingPost(null); setShowPostModal(true); }}>
                  <Icon.Plus /> Create Post
                </button>
              </div>

              {posts.length === 0 ? (
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
                          <div className="rd-post-tags">
                            {(post.tags || []).map((t, i) => <span key={i} className="rd-skill-tag">{t}</span>)}
                          </div>
                        </div>
                        <div className="rd-post-card-right">
                          <div className="rd-applicants-ring">
                            <span className="rd-appl-num">{post.applicants}</span>
                            <span className="rd-appl-lbl">applicants</span>
                          </div>
                          <span className="rd-posted-time">{post.posted}</span>
                        </div>
                      </div>
                      <div className="rd-post-card-actions">
                        <button className="rd-action-btn" onClick={() => { setEditingPost(post); setShowPostModal(true); }}><Icon.Edit /> Edit</button>
                        <button className="rd-action-btn" onClick={() => handleTogglePost(post.id)}>
                          {post.active ? <><Icon.Eye /> Pause</> : <><Icon.Globe /> Activate</>}
                        </button>
                        <button className="rd-action-btn rd-action-danger" onClick={() => handleDeletePost(post.id)}><Icon.Trash /> Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════ CANDIDATES ════ */}
          {activeTab === "candidates" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div>
                  <h2 className="rd-section-heading">Candidate Pool</h2>
                  <p className="rd-section-sub">{filteredCandidates.length} students available on PrepMate</p>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="rd-cand-toolbar">
                <div className="rd-search-wrap">
                  <Icon.Search />
                  <input
                    className="rd-search-input"
                    placeholder="Search by name, role, or skill..."
                    value={candidateSearch}
                    onChange={e => setCandidateSearch(e.target.value)}
                  />
                  {candidateSearch && <button className="rd-search-clear" onClick={() => setCandidateSearch("")}><Icon.X /></button>}
                </div>
                <div className="rd-filter-pills">
                  {["all", "available", "open", "Fresher", "Intern"].map(f => (
                    <button key={f} className={`rd-filter-pill ${candidateFilter === f ? "active" : ""}`} onClick={() => setCandidateFilter(f)}>
                      {f === "all" ? "All" : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Candidate Grid */}
              <div className="rd-cand-grid">
                {filteredCandidates.map((c, i) => (
                  <div key={c.id} className="rd-cand-card" style={{ "--i": i }}>
                    <div className="rd-cand-card-top">
                      <div className="rd-av rd-av-lg" style={{ background: `linear-gradient(135deg, ${avatarColor(c.avatar)})` }}>{c.avatar}</div>
                      <div className="rd-cand-match">
                        <span className="rd-match-num">{c.matchPct}%</span>
                        <span className="rd-match-lbl">match</span>
                      </div>
                    </div>
                    <h3 className="rd-cand-name">{c.name}</h3>
                    <p className="rd-cand-role">{c.role}</p>
                    <p className="rd-cand-college">{c.college}</p>
                    <div className="rd-cand-meta">
                      <span><Icon.MapPin />{c.location}</span>
                      <span><Icon.Calendar />{c.experience}</span>
                    </div>
                    <div className="rd-cand-skills">
                      {c.skills.slice(0, 3).map((s, i) => <span key={i} className="rd-skill-tag rd-skill-sm">{s}</span>)}
                    </div>
                    <div className="rd-cand-score-bar">
                      <div className="rd-score-bar">
                        <div className="rd-score-fill" style={{ width: `${c.score * 10}%` }} />
                      </div>
                      <span className="rd-score-num">{c.score}/10</span>
                    </div>
                    <div className="rd-cand-actions">
                      <button className="rd-action-btn" onClick={() => setSelectedCandidate(c)}><Icon.Eye /> Profile</button>
                      <button className="rd-action-btn rd-action-primary" onClick={() => { handleInvite(c); }}><Icon.Send /> Invite</button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredCandidates.length === 0 && (
                <div className="rd-empty-state">
                  <div className="rd-empty-icon"><Icon.Search /></div>
                  <h3>No candidates found</h3>
                  <p>Try a different search term or filter.</p>
                </div>
              )}
            </div>
          )}

          {/* ════ INTERVIEWS ════ */}
          {activeTab === "interviews" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div>
                  <h2 className="rd-section-heading">Interview Tracker</h2>
                  <p className="rd-section-sub">Track candidate interviews and scores</p>
                </div>
              </div>
              <div className="rd-card">
                <div className="rd-table-wrap">
                  <table className="rd-table">
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Position</th>
                        <th>Date</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviews.map(iv => (
                        <tr key={iv.id}>
                          <td>
                            <div className="rd-cand-cell">
                              <div className="rd-av rd-av-sm" style={{ background: `linear-gradient(135deg, ${avatarColor(iv.avatar)})` }}>{iv.avatar}</div>
                              <div>
                                <div className="rd-cand-cell-name">{iv.candidateName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="rd-td-muted">{iv.position}</td>
                          <td className="rd-td-muted">{new Date(iv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td>{iv.score ? <span className="rd-score-pill">{iv.score}</span> : <span className="rd-td-muted">Pending</span>}</td>
                          <td><StatusBadge status={iv.status} /></td>
                          <td>
                            <button className="rd-action-btn" onClick={() => {
                              const c = candidates.find(c => c.name === iv.candidateName);
                              if (c) setSelectedCandidate(c);
                            }}><Icon.Eye /> View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ ANALYTICS ════ */}
          {activeTab === "analytics" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div>
                  <h2 className="rd-section-heading">Analytics</h2>
                  <p className="rd-section-sub">Hiring performance at a glance</p>
                </div>
              </div>
              <div className="rd-analytics-grid">
                <div className="rd-card rd-analytics-card">
                  <h3 className="rd-card-title">Score Distribution</h3>
                  <div className="rd-bar-chart">
                    {[...Array(10)].map((_, i) => {
                      const count = candidates.filter(c => Math.floor(c.score) === i + 1).length;
                      return (
                        <div key={i} className="rd-bar-col">
                          <div className="rd-bar" style={{ height: `${count * 40}px`, minHeight: count ? "8px" : "0" }} />
                          <span className="rd-bar-label">{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="rd-chart-hint">Score (out of 10) — based on PrepMate interviews</p>
                </div>

                <div className="rd-card rd-analytics-card">
                  <h3 className="rd-card-title">Top Skills in Pool</h3>
                  <div className="rd-skill-analytics">
                    {["React", "Python", "Node.js", "AWS", "Java", "Figma"].map((skill, i) => {
                      const count = candidates.filter(c => c.skills.includes(skill)).length;
                      const pct = Math.round((count / candidates.length) * 100);
                      return (
                        <div key={skill} className="rd-skill-row">
                          <span className="rd-skill-row-name">{skill}</span>
                          <div className="rd-skill-row-bar">
                            <div className="rd-skill-row-fill" style={{ width: `${pct}%`, animationDelay: `${i * 0.1}s` }} />
                          </div>
                          <span className="rd-skill-row-pct">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rd-card">
                  <h3 className="rd-card-title">Candidates by Experience</h3>
                  <div className="rd-exp-donut-wrap">
                    {[
                      { label: "Fresher", color: "#667eea" },
                      { label: "Intern", color: "#f093fb" },
                      { label: "1 yr", color: "#43e97b" },
                    ].map(({ label, color }) => {
                      const count = candidates.filter(c => c.experience === label || c.experience.startsWith(label)).length;
                      return (
                        <div key={label} className="rd-exp-row">
                          <span className="rd-exp-dot" style={{ background: color }} />
                          <span className="rd-exp-label">{label}</span>
                          <span className="rd-exp-count">{count}</span>
                          <div className="rd-exp-bar"><div style={{ width: `${(count / candidates.length) * 100}%`, background: color }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rd-card">
                  <h3 className="rd-card-title">Post Performance</h3>
                  <div className="rd-post-perf-list">
                    {posts.map(p => (
                      <div key={p.id} className="rd-post-perf-row">
                        <div>
                          <div className="rd-post-perf-title">{p.title}</div>
                          <div className="rd-post-perf-meta">{p.type}</div>
                        </div>
                        <div className="rd-post-perf-right">
                          <span className="rd-applicants-badge">{p.applicants} applied</span>
                          <span className={`rd-live-dot ${p.active ? "live" : "paused"}`} />
                        </div>
                      </div>
                    ))}
                    {posts.length === 0 && <p className="rd-empty-hint">No posts yet.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════ SETTINGS ════ */}
          {activeTab === "settings" && (
            <div className="rd-tab-anim">
              <div className="rd-section-toolbar">
                <div>
                  <h2 className="rd-section-heading">Settings</h2>
                  <p className="rd-section-sub">Manage your recruiter account</p>
                </div>
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
                    {["New application received", "Interview completed", "Candidate score available", "Weekly digest"].map((label, i) => (
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

      {/* ── Modals & Drawers ─────────────────────────── */}
      {showPostModal && (
        <PostModal
          onClose={() => { setShowPostModal(false); setEditingPost(null); }}
          onSubmit={handlePublishPost}
          editPost={editingPost}
        />
      )}

      {selectedCandidate && (
        <CandidateDrawer
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onInvite={handleInvite}
        />
      )}

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}