import React, { useState } from 'react';
import { useAuth } from '../App.jsx';
import jayIcon from '/jay_icon.png';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-oracle-navy flex flex-col">
      {/* Hero banner */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <img src={jayIcon} alt="App icon" className="h-32 w-auto mb-6" />

        <div className="w-full max-w-sm">
          {/* Event title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-oracle-red/20 border border-oracle-red/40 rounded-full px-4 py-1.5 mb-4">
              <span className="w-2 h-2 rounded-full bg-oracle-red animate-pulse" />
              <span className="text-oracle-red text-xs font-semibold uppercase tracking-wider">Live Event</span>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Sales Kick-Off<br />
              <span className="text-oracle-red">2026</span>
            </h1>
            <p className="text-white/60 text-sm mt-2">Las Vegas · Ask questions. Vote on what matters.</p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-bold text-oracle-navy mb-5 text-center">Sign In</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-oracle-text mb-1">
                  Oracle Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.name@oracle.com"
                  className="input"
                  autoComplete="email"
                  inputMode="email"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-oracle-text mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-oracle-red">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-xs text-oracle-muted mt-4">
              Only @oracle.com email addresses are permitted
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-white/30 text-xs">
        Oracle Corporation · SKO 2026 Las Vegas · Confidential
      </footer>
    </div>
  );
}
