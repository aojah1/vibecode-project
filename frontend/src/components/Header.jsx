import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, OracleLogo } from '../App.jsx';
import { api } from '../api.js';
import QRModal from './QRModal.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-oracle-navy text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo + Event name */}
          <div className="flex items-center gap-3">
            <OracleLogo className="h-7 w-auto" />
            <div className="hidden sm:block border-l border-white/30 pl-3">
              <p className="text-xs font-semibold text-oracle-red leading-none">SKO 2026 · Las Vegas</p>
              <p className="text-xs text-white/70 leading-none mt-0.5">Q&amp;A Live</p>
            </div>
          </div>

          {/* Nav + actions */}
          <div className="flex items-center gap-1">
            <NavLink
              to="/questions"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-oracle-red text-white' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              Questions
            </NavLink>
            <NavLink
              to="/groups"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-oracle-red text-white' : 'text-white/80 hover:bg-white/10'
                }`
              }
            >
              Topics
            </NavLink>

            <button
              onClick={() => setShowQR(true)}
              className="p-2 rounded-md text-white/80 hover:bg-white/10 transition-colors"
              title="Share QR Code"
            >
              <QrIcon />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-2 rounded-md text-white/80 hover:bg-white/10 transition-colors"
              >
                <UserIcon />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-oracle-border text-oracle-text py-1 z-50">
                  <p className="px-4 py-2 text-xs text-oracle-muted truncate">{user?.email}</p>
                  {user?.isAdmin && (
                    <p className="px-4 py-1 text-xs font-semibold text-oracle-red">Admin</p>
                  )}
                  <hr className="my-1 border-oracle-border" />
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-oracle-gray transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showQR && <QRModal onClose={() => setShowQR(false)} />}
    </>
  );
}

function QrIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4v1m0 14v1M4 12h1m14 0h1M5.636 5.636l.707.707M17.657 17.657l.707.707M5.636 18.364l.707-.707M17.657 6.343l.707-.707" />
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
      <rect x="16" y="16" width="2" height="2" fill="currentColor" />
      <rect x="16" y="20" width="2" height="2" fill="currentColor" />
      <rect x="20" y="16" width="2" height="2" fill="currentColor" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
