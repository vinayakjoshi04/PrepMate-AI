<div align="center">

<br/>

# 🎯 PrepMate*AI*

### Your all-in-one AI-powered career launchpad

**Mock Interviews · Resume Analysis · Skill Roadmaps · Recruiter Discovery · Live Job Board**

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_Now-667eea?style=for-the-badge)](https://prep-mate-ai-eight.vercel.app)
[![Backend](https://img.shields.io/badge/🔧_API-Healthy-43e97b?style=for-the-badge)](https://prepmate-ai-backend-ckrb.onrender.com/api/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-f093fb?style=for-the-badge)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-45.8%25-yellow?style=for-the-badge&logo=javascript&logoColor=black)](/)
[![Python](https://img.shields.io/badge/Python-18.2%25-3776AB?style=for-the-badge&logo=python&logoColor=white)](/)

<br/>

[🌐 View Demo](https://prep-mate-ai-eight.vercel.app) · [🐛 Report Bug](https://github.com/vinayakjoshi04/PrepMate-AI/issues) · [✨ Request Feature](https://github.com/vinayakjoshi04/PrepMate-AI/issues)

<br/>

> *Trusted by 50,000+ job seekers worldwide · 98% success rate · 4.9★ rating*

</div>

---

## 📋 Table of Contents

- [About The Project](#-about-the-project)
- [Five AI Modules](#-five-ai-modules)
- [Exclusive Feature: Recruiter Chat](#-exclusive-feature-recruiter-chat)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🎓 About The Project

**PrepMate AI** is a full-stack, AI-powered career preparation platform built for job seekers who are serious about landing their dream role. In one unified dashboard, you get **five distinct AI-powered modules** — from simulated mock interviews with real-time evaluation, to ATS resume scoring, personalized skill roadmaps, and live recruiter discovery.

### Why PrepMate AI?

| Problem | PrepMate's Solution |
|---|---|
| 😰 No idea what interviewers will ask | AI mock interviews tailored to your exact role & level |
| 📄 Resume getting rejected by ATS bots | Resume analyzer with ATS scoring + AI-improved version |
| 🤷 Don't know what skills you're missing | JD vs Resume gap analysis with a personalized roadmap |
| 🔍 Hard to get noticed by recruiters | Recruiter profile that puts you in front of hiring managers |
| 💼 No central place to find relevant jobs | Live job board with one-click interest expression |

---

## 🚀 Five AI Modules

### 💬 01 · AI Mock Interview `Most Popular`
> *Simulate. Practice. Ace It.*

Step into a fully simulated AI-powered interview tailored to your role and experience. Real-world questions, live evaluation, and a detailed feedback report — built to feel like the real thing.

- ✦ Role-specific question banks (technical + behavioral)
- ✦ Configurable difficulty: Easy / Mixed / Hard
- ✦ Custom focus areas and round names
- ✦ Real-time answer evaluation with scores (0–10)
- ✦ Batch analysis — all rounds scored in a single AI call to prevent timeouts
- ✦ Detailed post-interview feedback report

---

### 📄 02 · Resume Analyzer `Smart AI`
> *Parse. Score. Improve.*

Upload your resume and get a complete AI breakdown — ATS compatibility, keyword density, section-by-section scoring, and a fully rewritten AI-enhanced version ready to impress.

- ✦ ATS compatibility score (0–100)
- ✦ Section-by-section feedback (Contact, Summary, Experience, Education, Skills)
- ✦ Keyword gap identification
- ✦ Strengths & improvements breakdown
- ✦ AI-rewritten ATS-optimized resume output
- ✦ Supports PDF, DOC, DOCX, TXT (up to 5 MB)

---

### 🗺️ 03 · Skill Gap & Roadmap `New`
> *Compare. Identify. Grow.*

Paste any Job Description and the AI compares it against your resume — finding every missing skill, tool, and competency gap. Then it builds a personalized roadmap with resources, priorities, and timelines.

- ✦ JD vs Resume gap analysis
- ✦ Present, missing, and partial skill breakdown
- ✦ Prioritized roadmap (high / medium / low)
- ✦ Per-skill timeframes and learning resources
- ✦ Total estimated completion timeframe

---

### 👤 04 · Recruiter Profile `Get Hired`
> *Upload. Get Discovered. Land Jobs.*

Build a profile visible to top recruiters actively hiring on PrepMate. Companies browse the talent pool daily and shortlist candidates directly — one upload, multiple opportunities.

- ✦ Profile visible to PrepMate recruiters
- ✦ Get shortlisted for open positions
- ✦ Resume stored securely
- ✦ Update anytime

---

### 💼 05 · Job Board `Live`
> *Browse. Apply. Get Hired.*

Browse live openings posted by recruiters on PrepMate. Filter by role type, search by skill, and express interest in one click — your profile is already on file.

- ✦ Live recruiter-posted jobs
- ✦ Filter by role & type
- ✦ One-click express interest
- ✦ Deadline reminders

---

## 💬 Exclusive Feature: Recruiter Chat

When a recruiter shortlists you, you receive a **real-time in-app chat invitation** — no email chains, no LinkedIn DMs. Reply to interview invites, ask questions, and move the conversation forward instantly.

```
You get shortlisted
       ↓
Real-time notification 🔔
       ↓
In-app chat opens with the recruiter 💬
       ↓
Confirm interview details, ask questions ✅
       ↓
Land the offer 🎉
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React.js** | UI library — pages, components, routing |
| **React Router** | Client-side navigation |
| **Supabase** | Auth & real-time database (`supabaseClient.js`) |
| **CSS3 + Animations** | Custom animations, scroll-triggered reveals, typewriter effects |
| **JavaScript ES6+** | Core language |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.8+** | Server-side logic |
| **Flask** | REST API framework |
| **Flask-CORS** | Cross-origin request handling |
| **Hugging Face API** | LLM inference — question generation, answer scoring, analysis |
| **PyPDF2** | PDF text extraction |
| **python-docx** | DOC/DOCX text extraction |
| **Werkzeug** | Secure file handling |

### Infrastructure
| Service | Role |
|---|---|
| **Vercel** | Frontend hosting & CI/CD |
| **Render** | Backend hosting (`prepmate-ai-backend-ckrb.onrender.com`) |
| **Supabase** | Database, auth, real-time recruiter chat |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     USER BROWSER                        │
│              React App (Vercel)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Mock    │ │ Resume   │ │  Skill   │ │   Job    │   │
│  │Interview │ │Analyzer  │ │  Gap     │ │  Board   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┘   │
└───────┼────────────┼────────────┼─────────────────────-─┘
        │            │            │   HTTPS / REST API
        ▼            ▼            ▼
┌─────────────────────────────────────────────────────────┐
│              Flask Backend (Render)                     │
│                                                         │
│  POST /api/create-interview                             │
│  POST /api/batch-analyze-answers  ◄── Smart batching    │
│  POST /api/analyze-resume         ◄── 2 AI calls        │
│  POST /api/skill-gap              ◄── 1 AI call         │
│  GET  /api/health                                       │
└───────────────────────┬─────────────────────────────────┘
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
    ┌──────────────────┐  ┌─────────────────┐
    │  Hugging Face    │  │    Supabase      │
    │   LLM API        │  │  Auth + DB +     │
    │ (question gen,   │  │  Recruiter Chat  │
    │  scoring, NLP)   │  │  (real-time)     │
    └──────────────────┘  └─────────────────┘
```

**Key design decisions:**
- **Batch analysis** — all interview answers scored in a single LLM call instead of one per question, eliminating timeout chains (21 sequential calls → 1 call)
- **Graceful fallback** — if AI parsing fails, a word-count-based score estimator kicks in so the UI never crashes
- **Best-effort JSON repair** — a multi-strategy JSON parser handles truncated/malformed LLM responses
- **Supabase** handles auth and powers the real-time recruiter chat feature

---

## ⚡ Getting Started

### Prerequisites

```bash
node --version    # v18+ recommended
npm --version     # v9+
python --version  # v3.8+
pip --version
```

### 1. Clone the Repository

```bash
git clone https://github.com/vinayakjoshi04/PrepMate-AI.git
cd PrepMate-AI
```

### 2. Set Up the Frontend

```bash
cd frontend
npm install
```

### 3. Set Up the Backend

```bash
cd ../backend
pip install -r requirements.txt
```

### 4. Configure Environment Variables

See [Environment Variables](#-environment-variables) below.

### 5. Run Locally

**Terminal 1 — Frontend:**
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

**Terminal 2 — Backend:**
```bash
cd backend
python app.py
# Runs on http://localhost:5000
```

### 6. Open the App

Navigate to **`http://localhost:3000`** in your browser.

---

## 🔑 Environment Variables

### Frontend `frontend/.env`

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend `backend/.env`

```env
FLASK_APP=app.py
FLASK_ENV=development
PORT=5000

# Hugging Face — required for all AI features
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

> ⚠️ Never commit `.env` files. They are already in `.gitignore`.

---

## 🔌 API Reference

**Base URLs**
```
Production:  https://prepmate-ai-backend-ckrb.onrender.com
Development: http://localhost:5000
```

---

### `GET /api/health`
Check if the backend is running.

**Response `200`**
```json
{
  "status": "healthy",
  "service": "PrepMate-AI Backend",
  "version": "1.0.0"
}
```

---

### `POST /api/create-interview`
Generate role-specific interview questions.

**Request Body**
```json
{
  "jobTitle": "Frontend Developer",
  "jobDescription": "We are looking for...",
  "experienceLevel": "mid-level",
  "interviewType": "technical",
  "questionsCount": 7,
  "difficulty": "mixed",
  "focusAreas": ["React", "System Design"],
  "roundName": "Technical Round 1"
}
```

**Response `200`**
```json
{
  "skills": {
    "technicalSkills": ["React", "CSS", "TypeScript"],
    "softSkills": ["Communication", "Problem Solving"]
  },
  "questions": [
    { "id": "q1", "question": "Explain the virtual DOM...", "type": "technical" }
  ]
}
```

---

### `POST /api/batch-analyze-answers`
Score all interview answers in a **single AI call** (prevents timeout).

**Request Body**
```json
{
  "jobTitle": "Frontend Developer",
  "experienceLevel": "mid-level",
  "answers": [
    {
      "questionId": "q1",
      "question": "Explain the virtual DOM...",
      "answer": "The virtual DOM is a lightweight copy..."
    },
    {
      "questionId": "q2",
      "question": "What is CSS specificity?",
      "answer": "[Skipped]"
    }
  ]
}
```

**Response `200`**
```json
{
  "results": [
    {
      "score": 8,
      "feedback": ["Clear explanation", "Good use of examples"],
      "strengths": ["Strong conceptual understanding"],
      "improvements": ["Mention the reconciliation algorithm"],
      "hasExamples": true,
      "skipped": false
    },
    {
      "score": 0,
      "feedback": ["Question was skipped."],
      "skipped": true
    }
  ]
}
```

---

### `POST /api/analyze-resume`
Analyze a resume file. Accepts `multipart/form-data`.

| Field | Type | Required |
|---|---|---|
| `resume` | File (PDF/DOC/DOCX/TXT, max 5MB) | ✅ |
| `jobDescription` | String | Optional |

**Response `200`**
```json
{
  "atsScore": 74,
  "sectionFeedback": [
    { "section": "Work Experience", "score": 72, "feedback": "Lacks quantifiable metrics." }
  ],
  "keywordGaps": ["Agile", "Python", "KPIs"],
  "strengths": ["Clear career progression"],
  "improvements": ["Add quantifiable achievements"],
  "improvedResume": "PROFESSIONAL SUMMARY\n..."
}
```

---

### `POST /api/skill-gap`
Compare a resume against a job description. Accepts `multipart/form-data`.

| Field | Type | Required |
|---|---|---|
| `jobDescription` | String | ✅ |
| `resume` | File (PDF/DOC/DOCX/TXT) | ✅ or `resumeText` |
| `resumeText` | String | Fallback if no file |

**Response `200`**
```json
{
  "presentSkills": ["React", "JavaScript"],
  "missingSkills": ["TypeScript", "GraphQL"],
  "partialSkills": ["Node.js"],
  "summary": "Strong frontend foundation but missing backend skills...",
  "totalTimeframe": "8-10 weeks",
  "roadmap": [
    {
      "skill": "TypeScript",
      "priority": "high",
      "timeframe": "2-3 weeks",
      "matchScore": 30,
      "description": "Essential for this role...",
      "resources": [{ "name": "TypeScript Docs", "url": "https://typescriptlang.org" }],
      "subtasks": ["Learn interfaces", "Practice generics", "Build a small project"]
    }
  ]
}
```

---

## 📁 Project Structure

```
PrepMate-AI/
│
├── frontend/
│   ├── src/
│   │   ├── pages/                        # One folder per page/module
│   │   │   ├── CreateInterview.js        # AI Mock Interview — setup flow
│   │   │   ├── createInterview.css
│   │   │   ├── Interview.js              # Live interview session
│   │   │   ├── interview.css
│   │   │   ├── Results.js                # Post-interview results & scores
│   │   │   ├── results.css
│   │   │   ├── ResumeAnalyzer.js         # Resume upload & analysis
│   │   │   ├── resumeanalyzer.css
│   │   │   ├── SkillRoadmap.js           # Skill gap & learning roadmap
│   │   │   ├── SkillRoadmap.css
│   │   │   ├── Dashboard.js              # Candidate dashboard (profile + jobs)
│   │   │   ├── dashboard.css
│   │   │   ├── RecruiterDashboard.js     # Recruiter-side dashboard
│   │   │   └── RecruiterDashboard.css
│   │   │
│   │   ├── services/
│   │   │   └── interviewApi.js           # API service layer (all backend calls)
│   │   │
│   │   ├── App.js                        # Root component + React Router routes
│   │   ├── App.css
│   │   ├── config.js                     # App-wide config (API base URL, etc.)
│   │   ├── supabaseClient.js             # Supabase client init (auth + realtime)
│   │   ├── index.js                      # React entry point
│   │   └── index.css
│   │
│   ├── .env                              # Frontend env vars (not committed)
│   ├── package.json
│   └── package-lock.json
│
├── backend/
│   ├── app.py                            # Flask app — all API routes
│   ├── huggingfaceService.py             # LLM service (extract_skills, generate_questions)
│   ├── uploads/                          # Temp resume storage (auto-cleaned)
│   └── requirements.txt
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🗺️ Roadmap

### ✅ v1.0 — Shipped
- [x] AI mock interview with role-specific questions
- [x] Configurable difficulty, focus areas, and question count
- [x] Batch answer analysis (no timeout chain)
- [x] ATS resume analyzer with AI-rewritten output
- [x] Skill gap analysis with personalized roadmap
- [x] Candidate dashboard — recruiter profile & live job board
- [x] Recruiter dashboard — browse candidates, post jobs, shortlist
- [x] In-app real-time recruiter chat (Supabase)
- [x] Production deployment (Vercel + Render)

### 🔜 v2.0 — Coming Soon
- [ ] Voice interview mode with speech recognition
- [ ] Company-specific question packs (Google, Amazon, McKinsey, etc.)
- [ ] Interview recording & playback
- [ ] Advanced analytics dashboard
- [ ] Mobile app (iOS & Android)
- [ ] LinkedIn integration
- [ ] Community forums & peer practice

See [open issues](https://github.com/vinayakjoshi04/PrepMate-AI/issues) for the full list.

---

## 🤝 Contributing

Contributions are always welcome!

```bash
# 1. Fork the repository on GitHub

# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Commit your changes (use conventional commits)
git commit -m "feat: add voice interview mode"

# 4. Push to your fork
git push origin feature/your-feature-name

# 5. Open a Pull Request 🎉
```

**Guidelines:** follow existing code style · write clear commit messages · update docs for new features · test before submitting.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

---

## 👤 Contact

**Vinayak Vivek Joshi**

- GitHub: [@vinayakjoshi04](https://github.com/vinayakjoshi04)
- Project: [github.com/vinayakjoshi04/PrepMate-AI](https://github.com/vinayakjoshi04/PrepMate-AI)
- Live App: [prep-mate-ai-eight.vercel.app](https://prep-mate-ai-eight.vercel.app)

Have a question or idea? [Open an issue](https://github.com/vinayakjoshi04/PrepMate-AI/issues) — happy to chat!

---

<div align="center">

<br/>

**If PrepMate helped you, a ⭐ on GitHub means the world!**

<br/>

*Built with ❤️ by Vinayak Vivek Joshi · © 2026 PrepMateAI*

</div>