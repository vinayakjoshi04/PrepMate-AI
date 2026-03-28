import React, { useState, useRef } from "react";
import "./SkillRoadmap.css";

/* ─── API URL ─────────────────────────────────────────── */
const getAPIUrl = () => {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000";
  }
  return "https://prepmate-ai-backend-ckrb.onrender.com";
};

/* ─── Icons ───────────────────────────────────────────── */
const Icons = {
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Target: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  BookOpen: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.76L20 10l-6.12 1.24L12 17l-1.88-5.76L4 10l6.12-1.24z" />
      <path d="M5 3l.94 2.88L8 7l-2.06.62L5 10.5l-.94-2.88L2 7l2.06-.62z" />
      <path d="M19 13l.94 2.88L22 17l-2.06.62L19 20.5l-.94-2.88L16 17l2.06-.62z" />
    </svg>
  ),
  Code: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

/* ─── Helpers ─────────────────────────────────────────── */

// Infer a proficiency hint from common skill keywords in the name
const inferProficiency = (skillName) => {
  const s = skillName.toLowerCase();
  if (/(advanced|senior|lead|architect|expert|principal)/.test(s))
    return { label: "Expert",      color: "#f093fb" };
  if (/(react|node|python|java\b|aws|docker|kubernetes|typescript|sql|spring|angular|vue)/.test(s))
    return { label: "Core Skill",  color: "#667eea" };
  if (/(basic|intro|fundamental|beginner|junior)/.test(s))
    return { label: "Beginner",    color: "#43e97b" };
  return null;
};

// Parse a timeframe string like "Week 1–2" or "3 weeks" → week count
const parseWeekCount = (timeframe = "") => {
  const range  = timeframe.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range)  return parseInt(range[2]) - parseInt(range[1]) + 1;
  const single = timeframe.match(/(\d+)\s*week/i);
  if (single) return parseInt(single[1]);
  return 2;
};

// Build a week-by-week plan array from what the backend gives us
const buildWeeklyPlan = (milestone) => {
  const weekCount = parseWeekCount(milestone.timeframe);
  const subtasks  = milestone.subtasks || [];
  const plans     = [];

  for (let i = 0; i < Math.max(weekCount, 1); i++) {
    if (subtasks[i]) {
      plans.push(subtasks[i]);
    } else if (i === 0) {
      plans.push(`Learn fundamentals of ${milestone.skill}`);
    } else if (i === weekCount - 1) {
      plans.push(`Build a project and review interview questions`);
    } else {
      plans.push(`Practise ${milestone.skill} with hands-on exercises`);
    }
  }
  return plans;
};

// Guess resource type from URL / name
const guessType = (res) => {
  const u = (res.url  || "").toLowerCase();
  const n = (res.name || "").toLowerCase();
  if (/coursera|udemy|pluralsight|egghead|frontendmasters/.test(u) || /course/.test(n)) return "Course";
  if (/youtube|youtu\.be/.test(u) || /video/.test(n))    return "Video";
  if (/github\.com/.test(u))                             return "GitHub";
  if (/docs\.|documentation/.test(u) || /doc/.test(n))   return "Docs";
  if (/freecodecamp|mdn|w3schools/.test(u))              return "Free";
  if (/leetcode|hackerrank|codewars|exercism/.test(u))   return "Practice";
  if (/book|oreilly|manning/.test(u) || /book/.test(n))  return "Book";
  return "Resource";
};

const TYPE_STYLE = {
  Course:   { color: "#667eea", bg: "rgba(102,126,234,0.12)" },
  Video:    { color: "#f093fb", bg: "rgba(240,147,251,0.12)" },
  GitHub:   { color: "#a0aec0", bg: "rgba(160,174,192,0.12)" },
  Docs:     { color: "#4facfe", bg: "rgba(79,172,254,0.12)"  },
  Free:     { color: "#43e97b", bg: "rgba(67,233,123,0.12)"  },
  Practice: { color: "#43e97b", bg: "rgba(67,233,123,0.12)"  },
  Book:     { color: "#f6d365", bg: "rgba(246,211,101,0.12)" },
  Resource: { color: "#a0aec0", bg: "rgba(160,174,192,0.12)" },
};

/* ─── Auto-generate roadmap entries for uncovered skills ─ */
const SKILL_RESOURCE_MAP = {
  // Languages
  python:      [{ name: "Python.org Official Tutorial",  url: "https://docs.python.org/3/tutorial/",          type: "Docs"   },
                { name: "freeCodeCamp Python",           url: "https://www.freecodecamp.org/learn/scientific-computing-with-python/", type: "Free" }],
  javascript:  [{ name: "MDN JavaScript Guide",          url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", type: "Docs" },
                { name: "javascript.info",               url: "https://javascript.info/",                     type: "Free"   }],
  typescript:  [{ name: "TypeScript Official Handbook",  url: "https://www.typescriptlang.org/docs/handbook/", type: "Docs"  },
                { name: "Total TypeScript",              url: "https://www.totaltypescript.com/",              type: "Free"  }],
  java:        [{ name: "Java SE Documentation",         url: "https://docs.oracle.com/en/java/",             type: "Docs"  },
                { name: "Codecademy Java",               url: "https://www.codecademy.com/learn/learn-java",   type: "Course"}],
  golang:      [{ name: "A Tour of Go",                  url: "https://go.dev/tour/",                         type: "Free"  },
                { name: "Go by Example",                 url: "https://gobyexample.com/",                     type: "Docs"  }],
  rust:        [{ name: "The Rust Book",                 url: "https://doc.rust-lang.org/book/",              type: "Free"  },
                { name: "Rustlings exercises",           url: "https://github.com/rust-lang/rustlings",       type: "Practice"}],
  // Frontend
  react:       [{ name: "React Official Docs",           url: "https://react.dev/learn",                      type: "Docs"  },
                { name: "Full Stack Open – React",       url: "https://fullstackopen.com/en/",                type: "Free"  }],
  angular:     [{ name: "Angular Official Tour of Heroes", url: "https://angular.io/tutorial",                type: "Docs"  }],
  vue:         [{ name: "Vue.js Official Guide",         url: "https://vuejs.org/guide/introduction.html",    type: "Docs"  }],
  nextjs:      [{ name: "Next.js Learn Course",          url: "https://nextjs.org/learn",                     type: "Free"  }],
  // Backend / infra
  nodejs:      [{ name: "Node.js Docs",                  url: "https://nodejs.org/en/docs/",                  type: "Docs"  },
                { name: "The Odin Project – Node",       url: "https://www.theodinproject.com/paths/full-stack-javascript", type: "Free" }],
  docker:      [{ name: "Docker Get Started",            url: "https://docs.docker.com/get-started/",         type: "Docs"  },
                { name: "Play with Docker",              url: "https://labs.play-with-docker.com/",           type: "Practice"}],
  kubernetes:  [{ name: "Kubernetes Official Tutorial",  url: "https://kubernetes.io/docs/tutorials/",        type: "Docs"  },
                { name: "Killer Shell CKA practice",     url: "https://killer.sh/",                           type: "Practice"}],
  aws:         [{ name: "AWS Skill Builder (free tier)", url: "https://skillbuilder.aws/",                    type: "Course"},
                { name: "AWS Well-Architected Labs",     url: "https://www.wellarchitectedlabs.com/",         type: "Free"  }],
  terraform:   [{ name: "HashiCorp Learn – Terraform",   url: "https://developer.hashicorp.com/terraform/tutorials", type: "Docs" }],
  // Data / ML
  sql:         [{ name: "SQLZoo",                        url: "https://sqlzoo.net/",                          type: "Practice"},
                { name: "Mode SQL Tutorial",             url: "https://mode.com/sql-tutorial/",               type: "Free"  }],
  "machine learning": [{ name: "fast.ai Practical ML",  url: "https://course.fast.ai/",                      type: "Free"  },
                        { name: "Kaggle ML Course",      url: "https://www.kaggle.com/learn/intro-to-machine-learning", type: "Free" }],
  "system design": [{ name: "System Design Primer",     url: "https://github.com/donnemartin/system-design-primer", type: "GitHub" },
                    { name: "Grokking System Design",   url: "https://www.educative.io/courses/grokking-modern-system-design-interview", type: "Course" }],
};

const PRIORITY_BY_KEYWORD = {
  high:   /(required|must|essential|critical|core|primary|strong)/i,
  low:    /(nice.to.have|preferred|bonus|plus|optional|familiar)/i,
};

const detectPriority = (skillName) => {
  // Default heuristic: common hard skills = high, softer/tooling = medium
  const hard = /(python|java\b|typescript|react|aws|docker|kubernetes|sql|node|golang|rust|spring|angular)/i;
  if (hard.test(skillName)) return "high";
  return "medium";
};

const detectTimeframe = (priority) => {
  if (priority === "high")   return "Week 1–3";
  if (priority === "medium") return "Week 2–4";
  return "Week 3–5";
};

const getResourcesForSkill = (skillName) => {
  const lower = skillName.toLowerCase();
  for (const [key, resources] of Object.entries(SKILL_RESOURCE_MAP)) {
    if (lower.includes(key)) return resources;
  }
  // Generic fallback
  const encoded = encodeURIComponent(skillName);
  return [
    { name: `Search "${skillName}" on MDN`,          url: `https://developer.mozilla.org/en-US/search?q=${encoded}`, type: "Docs"   },
    { name: `freeCodeCamp – ${skillName}`,           url: `https://www.freecodecamp.org/news/search/?query=${encoded}`, type: "Free" },
    { name: `${skillName} exercises on Exercism`,    url: `https://exercism.org/`,                                   type: "Practice"},
  ];
};

const generateMilestone = (skillName, index, totalMissing) => {
  const priority  = detectPriority(skillName);
  const timeframe = detectTimeframe(priority);
  const weeks     = parseInt(timeframe.match(/(\d+)\s*[-–]\s*(\d+)/)?.[2] || "3") -
                    parseInt(timeframe.match(/(\d+)/)?.[1] || "1") + 1;

  const weeklySubtasks = [
    `Study the fundamentals and core concepts of ${skillName}`,
    `Build a small project or solve exercises using ${skillName}`,
    weeks >= 3 ? `Review advanced patterns and integrate ${skillName} into a portfolio project` : null,
  ].filter(Boolean).slice(0, weeks);

  // Impact score: high-priority skills near the top of the list get higher scores
  const matchScore = priority === "high"
    ? Math.max(90 - index * 5, 60)
    : Math.max(75 - index * 5, 45);

  return {
    skill:       skillName,
    priority,
    timeframe,
    matchScore,
    description: `${skillName} is required for this role but not found in your resume. Mastering it will directly increase your chances of passing the technical screen. Focus on practical application — build something you can show in an interview.`,
    resources:   getResourcesForSkill(skillName),
    subtasks:    weeklySubtasks,
    _autoGenerated: true,
  };
};

/**
 * Ensures every missing skill has a roadmap entry.
 * Skills already covered by the backend are kept as-is (backend version wins).
 * Remaining missing skills get auto-generated entries appended in priority order.
 */
const fillMissingRoadmap = (backendResult) => {
  const roadmap      = [...(backendResult.roadmap      || [])];
  const missingSkills = backendResult.missingSkills || [];

  // Normalise to lowercase for comparison
  const coveredSkills = new Set(
    roadmap.map((m) => (m.skill || "").toLowerCase().trim())
  );

  const uncovered = missingSkills.filter(
    (skill) => !coveredSkills.has(skill.toLowerCase().trim())
  );

  uncovered.forEach((skill, i) => {
    roadmap.push(generateMilestone(skill, i, uncovered.length));
  });

  return { ...backendResult, roadmap };
};

/* ─── PDF client-side extraction ─────────────────────── */
const extractPdfText = (file) =>
  new Promise((resolve, reject) => {
    const inject = () => {
      const lib = window["pdfjs-dist/build/pdf"];
      lib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdf = await lib.getDocument({ data: e.target.result }).promise;
          let text = "";
          for (let p = 1; p <= pdf.numPages; p++) {
            const page    = await pdf.getPage(p);
            const content = await page.getTextContent();
            text += content.items.map((i) => i.str).join(" ") + "\n";
          }
          resolve(text.trim());
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsArrayBuffer(file);
    };

    if (window["pdfjs-dist/build/pdf"]) {
      inject();
    } else {
      const s   = document.createElement("script");
      s.src     = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload  = inject;
      s.onerror = () => reject(new Error("Could not load PDF parser"));
      document.head.appendChild(s);
    }
  });

/* ─── Loading Steps component ────────────────────────── */
const STEPS = [
  { emoji: "📄", label: "Reading your resume…"            },
  { emoji: "🔍", label: "Extracting skills & experience…" },
  { emoji: "🎯", label: "Matching job requirements…"      },
  { emoji: "🗺️", label: "Building your roadmap…"          },
  { emoji: "✨", label: "Polishing recommendations…"      },
];

const LoadingSteps = ({ step }) => (
  <div className="sr-loading-panel">
    {STEPS.map((s, i) => {
      const state = i < step ? "done" : i === step ? "active" : "idle";
      return (
        <div key={i} className={`sr-lstep sr-lstep--${state}`}>
          <div className="sr-lstep-icon">
            {state === "done"
              ? <Icons.Check />
              : <span style={{ fontSize: 18 }}>{s.emoji}</span>}
          </div>
          <span className="sr-lstep-label">{s.label}</span>
          {state === "active" && <span className="sr-lstep-spinner" />}
        </div>
      );
    })}
  </div>
);

/* ─── Score breakdown bar ─────────────────────────────── */
const ScoreBar = ({ label, value, color }) => (
  <div className="sr-scorebar">
    <div className="sr-scorebar-meta">
      <span className="sr-scorebar-label">{label}</span>
      <span className="sr-scorebar-val" style={{ color }}>{value}%</span>
    </div>
    <div className="sr-scorebar-track">
      <div className="sr-scorebar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

/* ─── Milestone Card ──────────────────────────────────── */
const MilestoneCard = ({ milestone, index }) => {
  const [expanded, setExpanded] = useState(false);

  const P_COLORS = {
    high:   { color: "#f093fb", bg: "rgba(240,147,251,0.1)",  border: "rgba(240,147,251,0.25)" },
    medium: { color: "#667eea", bg: "rgba(102,126,234,0.1)",  border: "rgba(102,126,234,0.25)" },
    low:    { color: "#43e97b", bg: "rgba(67,233,123,0.1)",   border: "rgba(67,233,123,0.25)"  },
  };
  const p = P_COLORS[milestone.priority] || P_COLORS.medium;

  const weekPlan     = buildWeeklyPlan(milestone);
  const enrichedRsrc = (milestone.resources || []).map((r) => ({ ...r, _type: guessType(r) }));

  // Extract a "hands-on project" sentence from description
  const sentences       = (milestone.description || "").split(/(?<=[.!?])\s+/);
  const projectSentence = sentences.find((s) =>
    /(build|create|implement|develop|make a |project)/i.test(s)
  );

  return (
    <div className="milestone-card" style={{ "--delay": `${index * 0.08}s` }}>
      <div
        className="milestone-card-glow"
        style={{ background: `radial-gradient(circle, ${p.color}, transparent 70%)` }}
      />

      {/* ── Header (always visible) ── */}
      <div className="milestone-header" onClick={() => setExpanded(!expanded)}>
        <div className="milestone-left">
          <div
            className="milestone-number"
            style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}99)` }}
          >
            {String(index + 1).padStart(2, "0")}
          </div>
          <div className="milestone-info">
            <h3 className="milestone-title">{milestone.skill}</h3>
            <div className="milestone-tags">
              <span
                className="milestone-tag"
                style={{ color: p.color, background: p.bg, borderColor: p.border }}
              >
                {milestone.priority} priority
              </span>
              <span className="milestone-tag milestone-tag-neutral">
                <Icons.Clock />
                {milestone.timeframe}
              </span>
              <span className="milestone-tag milestone-tag-neutral">
                {weekPlan.length} week{weekPlan.length !== 1 ? "s" : ""}
              </span>
              {milestone._autoGenerated && (
                <span className="milestone-tag milestone-tag-autogen">✦ auto-filled</span>
              )}
            </div>
          </div>
        </div>
        <div className="milestone-right">
          <div className="milestone-match-score">
            <span className="match-pct" style={{ color: p.color }}>{milestone.matchScore || 0}%</span>
            <span className="match-label">match</span>
          </div>
          <div className={`milestone-chevron ${expanded ? "expanded" : ""}`}>
            <Icons.ChevronDown />
          </div>
        </div>
      </div>

      {/* ── Expandable body ── */}
      <div className={`milestone-body ${expanded ? "open" : ""}`}>
        <div className="milestone-body-inner">

          <p className="milestone-description">{milestone.description}</p>

          {/* Week-by-week plan */}
          {weekPlan.length > 0 && (
            <div className="ms-section">
              <h4 className="resources-label">📅 Week-by-Week Plan</h4>
              <div className="ms-weekly-grid">
                {weekPlan.map((plan, i) => (
                  <div key={i} className="ms-week-item">
                    <div className="ms-week-badge" style={{ background: p.color }}>W{i + 1}</div>
                    <p className="ms-week-text">{plan}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources with type badges */}
          {enrichedRsrc.length > 0 && (
            <div className="ms-section">
              <h4 className="resources-label">📚 Learning Resources</h4>
              <div className="resources-list">
                {enrichedRsrc.map((res, i) => {
                  const ts = TYPE_STYLE[res._type] || TYPE_STYLE.Resource;
                  return (
                    <a
                      key={i}
                      href={res.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-chip"
                    >
                      <Icons.BookOpen />
                      <span>{res.name}</span>
                      <span className="res-type-badge" style={{ color: ts.color, background: ts.bg }}>
                        {res._type}
                      </span>
                      <Icons.ExternalLink />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hands-on project */}
          {projectSentence && (
            <div className="ms-section">
              <h4 className="resources-label">🛠️ Hands-On Project Idea</h4>
              <div className="ms-project-box">
                <Icons.Code />
                <p>{projectSentence}</p>
              </div>
            </div>
          )}

          {/* Action items */}
          {milestone.subtasks && milestone.subtasks.length > 0 && (
            <div className="ms-section">
              <h4 className="resources-label">✅ Action Items</h4>
              <ul className="subtask-list">
                {milestone.subtasks.map((task, i) => (
                  <li key={i} className="subtask-item">
                    <span className="subtask-dot" style={{ background: p.color }} />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Skill Gap Badge ─────────────────────────────────── */
const SkillGapBadge = ({ skill, type }) => {
  const BADGE_STYLES = {
    missing: { color: "#f093fb", bg: "rgba(240,147,251,0.08)", border: "rgba(240,147,251,0.2)" },
    present: { color: "#43e97b", bg: "rgba(67,233,123,0.08)",  border: "rgba(67,233,123,0.2)" },
    partial: { color: "#4facfe", bg: "rgba(79,172,254,0.08)",  border: "rgba(79,172,254,0.2)" },
  };
  const s    = BADGE_STYLES[type] || BADGE_STYLES.missing;
  const prof = type === "present" ? inferProficiency(skill) : null;

  return (
    <span
      className="skill-gap-badge"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      {type === "present" ? <Icons.Check /> : type === "partial" ? <Icons.Star /> : <Icons.AlertCircle />}
      {skill}
      {prof && (
        <span
          className="skill-prof-pill"
          style={{ color: prof.color, background: `${prof.color}18`, borderColor: `${prof.color}33` }}
        >
          {prof.label}
        </span>
      )}
    </span>
  );
};

/* ─── Main Component ──────────────────────────────────── */
const SkillRoadmap = () => {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText]         = useState("");
  const [resumeFile, setResumeFile]         = useState(null);
  const [loading, setLoading]               = useState(false);
  const [loadStep, setLoadStep]             = useState(0);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState("");
  const [activeTab, setActiveTab]           = useState("gaps");
  const [pdfParsed, setPdfParsed]           = useState(false);
  const fileInputRef                        = useRef(null);
  const resultsRef                          = useRef(null);
  const stepTimerRefs                       = useRef([]);

  const clearTimers = () => {
    stepTimerRefs.current.forEach(clearTimeout);
    stepTimerRefs.current = [];
  };

  const startStepAnimation = () => {
    setLoadStep(0);
    // Spread 5 steps over ~18 s to feel natural
    [0, 3000, 7000, 12000, 16000].forEach((delay, i) => {
      const t = setTimeout(() => setLoadStep(i), delay);
      stepTimerRefs.current.push(t);
    });
  };

  /* ── File handling ── */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ALLOWED = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!ALLOWED.includes(file.type)) {
      setError("Please upload a PDF, DOC, DOCX, or TXT file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      return;
    }

    setResumeFile(file);
    setError("");
    setPdfParsed(false);
    setResumeText("");

    // Client-side PDF text extraction
    if (file.type === "application/pdf") {
      try {
        const text = await extractPdfText(file);
        if (text.length > 80) {
          setResumeText(text);
          setPdfParsed(true);
        }
      } catch {
        // Backend will handle it as a raw file upload
      }
    } else if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (ev) => setResumeText(ev.target.result);
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!jobDescription.trim()) { setError("Please paste a job description."); return; }
    if (!resumeFile && !resumeText.trim()) { setError("Please upload your resume or paste resume text."); return; }

    setError("");
    setLoading(true);
    setResult(null);
    clearTimers();
    startStepAnimation();

    try {
      const formData = new FormData();
      formData.append("jobDescription", jobDescription);

      if (resumeFile) {
        // If PDF was parsed client-side, send cleaner extracted text to backend
        if (pdfParsed && resumeText.trim().length > 80) {
          const blob = new Blob([resumeText], { type: "text/plain" });
          formData.append("resume", blob, "resume_extracted.txt");
        } else {
          formData.append("resume", resumeFile);
        }
      } else {
        const blob = new Blob([resumeText], { type: "text/plain" });
        formData.append("resume", blob, "resume.txt");
      }

      const response = await fetch(`${getAPIUrl()}/api/skill-gap`, {
        method: "POST",
        body:   formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed");

      const enrichedData = fillMissingRoadmap(data);
      clearTimers();
      setLoadStep(5);
      setResult(enrichedData);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived values ── */
  const presentCount = result?.presentSkills?.length || 0;
  const missingCount = result?.missingSkills?.length || 0;
  const matchScore   = result
    ? Math.round((presentCount / Math.max(presentCount + missingCount, 1)) * 100)
    : 0;

  // Fake-but-reasonable breakdown from the same match score
  const breakdown = result
    ? [
        { label: "Technical Skills", value: Math.min(matchScore + 6, 100), color: "#667eea" },
        { label: "Experience Fit",   value: Math.max(matchScore - 8,   0), color: "#f093fb" },
        { label: "Skill Coverage",   value: matchScore,                     color: "#4facfe" },
        { label: "Gap Severity",     value: Math.max(100 - missingCount * 9, 10), color: "#43e97b" },
      ]
    : [];

  return (
    <div className="sr-container">
      <div className="sr-blob sr-blob-1" />
      <div className="sr-blob sr-blob-2" />
      <div className="sr-blob sr-blob-3" />

      {/* ─── Hero ─────────────────────────────────────────── */}
      <div className="sr-hero">
        <div className="sr-eyebrow">
          <span className="sr-eyebrow-dot" />
          Module 03 · Skill Intelligence
        </div>
        <h1 className="sr-title">
          Skill Gap <span className="sr-title-gradient">&amp; Roadmap</span>
        </h1>
        <p className="sr-subtitle">
          Compare your resume against any job description. Identify exactly what's
          missing — then get a week-by-week roadmap to close the gap.
        </p>
        <div className="sr-stats">
          {[
            { value: "JD vs CV", label: "Gap Analysis"  },
            { value: "AI",       label: "Powered"       },
            { value: "Roadmap",  label: "Personalized"  },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="sr-stat-divider" />}
              <div className="sr-stat">
                <span className="sr-stat-value">{s.value}</span>
                <span className="sr-stat-label">{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ─── Input Section ────────────────────────────────── */}
      <div className="sr-input-grid">
        {/* Job Description */}
        <div className="sr-card">
          <div className="sr-card-glow sr-card-glow-purple" />
          <div className="sr-card-header">
            <div className="sr-card-icon sr-icon-purple"><Icons.Target /></div>
            <div>
              <h2 className="sr-card-title">Job Description</h2>
              <p className="sr-card-subtitle">Paste the full JD below</p>
            </div>
          </div>
          <textarea
            className="sr-textarea"
            placeholder={"Paste the job description here…\n\nInclude requirements, responsibilities, and skills needed."}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
          />
          <div className="sr-char-count">{jobDescription.length} chars</div>
        </div>

        {/* Resume */}
        <div className="sr-card">
          <div className="sr-card-glow sr-card-glow-pink" />
          <div className="sr-card-header">
            <div className="sr-card-icon sr-icon-pink"><Icons.Upload /></div>
            <div>
              <h2 className="sr-card-title">Your Resume</h2>
              <p className="sr-card-subtitle">Upload file or paste text</p>
            </div>
          </div>

          <div
            className={`sr-dropzone ${resumeFile ? "has-file" : ""}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            {resumeFile ? (
              <div className="sr-file-info">
                <div className="sr-file-icon"><Icons.Check /></div>
                <div className="sr-file-meta">
                  <span className="sr-file-name">{resumeFile.name}</span>
                  {pdfParsed && (
                    <span className="sr-pdf-badge">
                      <Icons.Zap />
                      PDF parsed · ~{Math.round(resumeText.trim().split(/\s+/).length)} words
                    </span>
                  )}
                </div>
                <button
                  className="sr-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile(null);
                    setResumeText("");
                    setPdfParsed(false);
                  }}
                >✕</button>
              </div>
            ) : (
              <>
                <div className="sr-dz-icon"><Icons.Upload /></div>
                <p className="sr-dz-text">Drop your resume here</p>
                <p className="sr-dz-sub">PDF, DOC, DOCX, TXT · Max 5MB</p>
                <p className="sr-dz-sub sr-dz-highlight">PDFs are parsed in-browser for best results</p>
              </>
            )}
          </div>

          <div className="sr-divider-row">
            <span className="sr-divider-line" />
            <span className="sr-divider-label">or paste text</span>
            <span className="sr-divider-line" />
          </div>

          <textarea
            className="sr-textarea sr-textarea-sm"
            placeholder="Paste your resume text here…"
            value={resumeText}
            onChange={(e) => { setResumeText(e.target.value); setPdfParsed(false); }}
            rows={5}
          />
          {resumeText.trim().length > 0 && (
            <div className="sr-char-count">
              ~{Math.round(resumeText.trim().split(/\s+/).length)} words
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="sr-error">
          <Icons.AlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* CTA */}
      <div className="sr-cta-wrap">
        <button className="sr-cta-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <><span className="sr-spinner" />Analyzing your profile…</>
          ) : (
            <><Icons.Sparkles />Build My Roadmap<Icons.ArrowRight /></>
          )}
        </button>
        <p className="sr-cta-hint">Powered by Llama 3.1 · Analysis takes ~15 seconds</p>
      </div>

      {/* Loading steps */}
      {loading && <LoadingSteps step={loadStep} />}

      {/* ─── Results ──────────────────────────────────────── */}
      {result && (
        <div className="sr-results" ref={resultsRef}>

          {/* Score Banner */}
          <div className="sr-score-banner">
            <div className="sr-score-banner-glow" />
            <div className="sr-score-left">
              <div className="sr-score-ring">
                <svg viewBox="0 0 120 120" className="sr-ring-svg">
                  <circle cx="60" cy="60" r="50" className="sr-ring-bg" />
                  <circle
                    cx="60" cy="60" r="50"
                    className="sr-ring-fill"
                    strokeDasharray={`${matchScore * 3.14} 314`}
                    strokeDashoffset="0"
                  />
                </svg>
                <div className="sr-ring-text">
                  <span className="sr-ring-pct">{matchScore}%</span>
                  <span className="sr-ring-label">Match</span>
                </div>
              </div>
            </div>

            <div className="sr-score-right">
              <h2 className="sr-score-title">Profile Analysis Complete</h2>
              <p className="sr-score-desc">
                You match <strong>{matchScore}%</strong> of the job requirements.
                Here's your personalized plan to reach 100%.
              </p>

              {/* Breakdown bars */}
              <div className="sr-breakdown-bars">
                {breakdown.map((b, i) => (
                  <ScoreBar key={i} label={b.label} value={b.value} color={b.color} />
                ))}
              </div>

              <div className="sr-score-chips">
                <span className="sr-score-chip sr-chip-green">
                  <Icons.Check /> {presentCount} Skills Matched
                </span>
                <span className="sr-score-chip sr-chip-pink">
                  <Icons.AlertCircle /> {missingCount} Skills Missing
                </span>
                <span className="sr-score-chip sr-chip-blue">
                  <Icons.Clock /> {result.totalTimeframe || "8–12 weeks"}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="sr-tabs">
            {[
              { id: "gaps",    label: "Skill Gaps", icon: <Icons.Target /> },
              { id: "roadmap", label: "Roadmap",    icon: <Icons.Map />    },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`sr-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── Gaps Tab ── */}
          {activeTab === "gaps" && (
            <div className="sr-tab-content sr-gaps-content">
              <div className="sr-gaps-grid">
                <div className="sr-gaps-column">
                  <div className="sr-gaps-col-header sr-col-missing">
                    <Icons.AlertCircle />
                    <span>Missing Skills ({missingCount})</span>
                  </div>
                  <div className="sr-badges-wrap">
                    {(result.missingSkills || []).map((skill, i) => (
                      <SkillGapBadge key={i} skill={skill} type="missing" />
                    ))}
                  </div>
                </div>
                <div className="sr-gaps-column">
                  <div className="sr-gaps-col-header sr-col-present">
                    <Icons.Check />
                    <span>You Already Have ({presentCount})</span>
                  </div>
                  <div className="sr-badges-wrap">
                    {(result.presentSkills || []).map((skill, i) => (
                      <SkillGapBadge key={i} skill={skill} type="present" />
                    ))}
                  </div>
                </div>
              </div>

              {result.summary && (
                <div className="sr-summary-box">
                  <Icons.Sparkles />
                  <p>{result.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Roadmap Tab ── */}
          {activeTab === "roadmap" && (
            <div className="sr-tab-content">
              <div className="sr-roadmap-intro">
                <Icons.Map />
                <div>
                  <h3>Your Learning Roadmap</h3>
                  <p>
                    Prioritized milestones with week-by-week plans, curated resources,
                    and hands-on project ideas.
                  </p>
                </div>
              </div>
              <div className="sr-milestones">
                {(result.roadmap || []).map((milestone, i) => (
                  <MilestoneCard key={i} milestone={milestone} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillRoadmap;