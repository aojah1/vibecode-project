import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api.js';
import LoginPage from './pages/LoginPage.jsx';
import QuestionsPage from './pages/QuestionsPage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null));
  }, []);

  const login = async (email, password) => {
    const u = await api.login(email, password);
    setUser(u);
    navigate('/questions');
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    navigate('/login');
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oracle-navy">
        <OracleLogo className="w-32 opacity-80 animate-pulse" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/questions" replace />} />
        <Route path="/questions" element={user ? <QuestionsPage /> : <Navigate to="/login" replace />} />
        <Route path="/groups" element={user ? <GroupsPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={user ? '/questions' : '/login'} replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export function OracleLogo({ className = 'w-28' }) {
  return (
    <svg className={className} viewBox="0 0 260 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large red oval — the iconic Oracle "O" */}
      <ellipse cx="35" cy="35" rx="33" ry="33" fill="none" stroke="#CC0000" strokeWidth="11"/>
      {/* RACLE text beside the oval */}
      <text
        x="78"
        y="52"
        fontFamily="'Arial Black','Arial',Helvetica,sans-serif"
        fontWeight="900"
        fontSize="46"
        fill="#CC0000"
        letterSpacing="-1"
      >RACLE</text>
    </svg>
  );
}
