# 🎯 PrepMate-AI

<div align="center">

[![Live Demo](https://img.shields.io/badge/demo-live-success?style=for-the-badge)](https://prep-mate-ai-eight.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-45.8%25-yellow?style=for-the-badge&logo=javascript)](/)
[![Python](https://img.shields.io/badge/Python-18.2%25-blue?style=for-the-badge&logo=python)](/)

**An AI-powered interview preparation platform that helps you ace your next job interview**

[View Demo](https://prep-mate-ai-eight.vercel.app) · [Report Bug](https://github.com/vinayakjoshi04/PrepMate-AI/issues) · [Request Feature](https://github.com/vinayakjoshi04/PrepMate-AI/issues)

</div>

---

## 📋 Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

---

## 🎓 About The Project

PrepMate-AI is an intelligent interview preparation platform designed to help job seekers prepare effectively for technical and behavioral interviews. Leveraging artificial intelligence, the platform generates customized interview questions, provides real-time feedback, and tracks your progress over time.

### Why PrepMate-AI?

- **Personalized Learning**: AI-generated questions tailored to your target role and experience level
- **Real-time Feedback**: Get instant feedback on your responses to improve faster
- **Comprehensive Coverage**: Practice technical, behavioral, and situational questions
- **Progress Tracking**: Monitor your improvement with detailed analytics
- **Accessible Anywhere**: Web-based platform accessible from any device

---

## ✨ Key Features

### 🤖 AI-Powered Question Generation
Generate unlimited practice questions based on job descriptions, roles, and difficulty levels using advanced AI models.

### 💬 Interactive Practice Sessions
Engage in realistic mock interviews with AI-driven conversation flows that adapt to your responses.

### 📊 Performance Analytics
Track your progress with comprehensive dashboards showing:
- Question completion rates
- Response quality scores
- Time management metrics
- Improvement trends over time

### 🎯 Targeted Preparation
Focus on specific areas including:
- Data Structures & Algorithms
- System Design
- Behavioral Interviews
- Company-specific questions
- Technical deep-dives

### 📝 Smart Note-Taking
Save important insights, solutions, and takeaways from each practice session for future reference.

### 🔄 Continuous Improvement
Machine learning algorithms adapt to your performance, focusing on areas that need more practice.

---

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI library for building interactive interfaces
- **CSS3** - Modern styling with responsive design
- **JavaScript (ES6+)** - Core programming language
- **HTML5** - Semantic markup

### Backend
- **Python** - Server-side logic and AI integration
- **Flask/FastAPI** - RESTful API framework (inferred)
- **AI/ML Libraries** - Natural language processing and generation

### Deployment & Infrastructure
- **Vercel** - Frontend hosting and deployment
- **Git** - Version control

### Development Tools
- **npm/yarn** - Package management
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 🚀 Getting Started

Follow these steps to set up PrepMate-AI locally for development or testing.

### Prerequisites

Ensure you have the following installed:

```bash
# Node.js (v14 or higher)
node --version

# npm or yarn
npm --version

# Python (v3.8 or higher)
python --version

# pip
pip --version
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vinayakjoshi04/PrepMate-AI.git
   cd PrepMate-AI
   ```

2. **Set up the Frontend**
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   ```

3. **Set up the Backend**
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**
   
   Create a `.env` file in both frontend and backend directories:
   
   **Frontend `.env`:**
   ```env
   REACT_APP_API_URL=http://localhost:5000
   REACT_APP_ENV=development
   ```
   
   **Backend `.env`:**
   ```env
   FLASK_APP=app.py
   FLASK_ENV=development
   SECRET_KEY=your_secret_key_here
   DATABASE_URL=your_database_url
   AI_API_KEY=your_ai_api_key
   ```

5. **Run the Development Servers**
   
   **Terminal 1 - Frontend:**
   ```bash
   cd frontend
   npm start
   # or
   yarn start
   ```
   
   **Terminal 2 - Backend:**
   ```bash
   cd backend
   python app.py
   # or
   flask run
   ```

6. **Access the Application**
   
   Open your browser and navigate to:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

---

## 📖 Usage

### Starting a Practice Session

1. **Select Interview Type**: Choose from technical, behavioral, or system design
2. **Set Difficulty**: Adjust difficulty level based on your experience
3. **Begin Practice**: Start answering AI-generated questions
4. **Review Feedback**: Get instant feedback on each response
5. **Track Progress**: View your performance metrics in the dashboard

### Example Workflow

```javascript
// Example API call to generate questions
const generateQuestions = async (role, difficulty) => {
  const response = await fetch(`${API_URL}/api/questions/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role, difficulty })
  });
  return response.json();
};
```

---

## 📁 Project Structure

```
PrepMate-AI/
│
├── frontend/                  # React frontend application
│   ├── public/               # Static files
│   ├── src/                  # Source files
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   ├── styles/          # CSS styles
│   │   ├── App.js           # Main App component
│   │   └── index.js         # Entry point
│   ├── package.json         # Dependencies
│   └── README.md            # Frontend documentation
│
├── backend/                  # Python backend application
│   ├── api/                 # API routes
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   ├── utils/               # Helper functions
│   ├── config.py            # Configuration
│   ├── app.py               # Main application
│   └── requirements.txt     # Python dependencies
│
├── .gitignore               # Git ignore rules
├── LICENSE                  # MIT License
├── README.md                # This file
└── What more to add.txt     # Development notes
```

---

## 🔌 API Documentation

### Base URL
```
Production: https://prep-mate-ai-eight.vercel.app/api
Development: http://localhost:5000/api
```

### Endpoints

#### Generate Questions
```http
POST /api/questions/generate
Content-Type: application/json

{
  "role": "Software Engineer",
  "difficulty": "medium",
  "count": 10,
  "category": "algorithms"
}
```

**Response:**
```json
{
  "questions": [
    {
      "id": "q123",
      "question": "Explain the difference between...",
      "category": "algorithms",
      "difficulty": "medium"
    }
  ]
}
```

#### Submit Answer
```http
POST /api/answers/submit
Content-Type: application/json

{
  "questionId": "q123",
  "answer": "User's answer text...",
  "timeSpent": 300
}
```

**Response:**
```json
{
  "score": 85,
  "feedback": "Great answer! Consider mentioning...",
  "suggestions": ["Add more details about...", "Clarify..."]
}
```

#### Get User Progress
```http
GET /api/users/{userId}/progress
```

**Response:**
```json
{
  "totalQuestions": 150,
  "averageScore": 78,
  "weakAreas": ["system design", "databases"],
  "strengths": ["algorithms", "data structures"]
}
```

---

## 🗺️ Roadmap

### Current Version (v1.0)
- [x] AI-powered question generation
- [x] Basic progress tracking
- [x] User authentication
- [x] Responsive design

### Upcoming Features (v2.0)
- [ ] Video interview simulation with speech recognition
- [ ] Company-specific interview prep modules
- [ ] Collaborative practice with peers
- [ ] Mobile application (iOS/Android)
- [ ] Integration with job boards (LinkedIn, Indeed)
- [ ] Advanced analytics and ML-driven insights
- [ ] Interview scheduling and reminders
- [ ] Resume analysis and improvement suggestions
- [ ] Mock interview recording and playback
- [ ] Community forum for sharing experiences

See the [open issues](https://github.com/vinayakjoshi04/PrepMate-AI/issues) for a full list of proposed features and known issues.

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

### How to Contribute

1. **Fork the Project**
2. **Create your Feature Branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your Changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the Branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 📄 License

Distributed under the MIT License. See `LICENSE` file for more information.

The MIT License is a permissive license that allows for reuse with minimal restrictions. You are free to use, modify, and distribute this software for any purpose, including commercial applications.

---

## 👤 Contact

**Vinayak Vivek Joshi**

- GitHub: [@vinayakjoshi04](https://github.com/vinayakjoshi04)
- Project Link: [https://github.com/vinayakjoshi04/PrepMate-AI](https://github.com/vinayakjoshi04/PrepMate-AI)
- Live Demo: [https://prep-mate-ai-eight.vercel.app](https://prep-mate-ai-eight.vercel.app)

For questions, suggestions, or collaborations, please open an issue or reach out directly.

---

## 🙏 Acknowledgments

Special thanks to:

- [React.js](https://reactjs.org/) - For the amazing frontend framework
- [Python](https://www.python.org/) - For powerful backend capabilities
- [Vercel](https://vercel.com/) - For seamless deployment
- [OpenAI/Anthropic](https://openai.com/) - For AI capabilities
- All contributors who help improve PrepMate-AI
- The open-source community for inspiration and support

---

<div align="center">

**Made with ❤️ by Vinayak Vivek Joshi**

If you find this project helpful, please consider giving it a ⭐️!

</div>