import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// Auth Pages
import Home from "./auth/Home";
import Login from "./auth/Login";
import Signup from "./auth/Signup";

// Protected Pages
import Dashboard from "./pages/Dashboard";
import CreateInterview from "./pages/CreateInterview";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import ResumeAnalyzer from "./pages/ResumeAnalyzer";
import SkillRoadmap from "./pages/SkillRoadmap";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0a0f',
        color: '#fff',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(102, 126, 234, 0.2)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const userRole = session?.user?.user_metadata?.role;
  const defaultRedirect = userRole === "recruiter" ? "/recruiter-dashboard" : "/dashboard";

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Authentication Routes */}
        <Route
          path="/login"
          element={session ? <Navigate to={defaultRedirect} replace /> : <Login />}
        />
        <Route
          path="/signup"
          element={session ? <Navigate to={defaultRedirect} replace /> : <Signup />}
        />

        {/* Protected Candidate Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/create-interview" element={<ProtectedRoute><CreateInterview /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/resume-analyzer" element={<ProtectedRoute><ResumeAnalyzer /></ProtectedRoute>} />
        <Route path="/skill-roadmap" element={<ProtectedRoute><SkillRoadmap /></ProtectedRoute>} />

        {/* Recruiter Route */}
        <Route
          path="/recruiter-dashboard"
          element={<ProtectedRoute requiredRole="recruiter"><RecruiterDashboard /></ProtectedRoute>}
        />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;