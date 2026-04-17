import React, { useEffect, useState } from 'react';
import Header from '../components/Header.jsx';
import GroupCard from '../components/GroupCard.jsx';
import { api } from '../api.js';
import { socket } from '../socket.js';
import { useAuth } from '../App.jsx';

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');

  const loadGroups = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    socket.on('groups_updated', () => loadGroups());
    return () => socket.off('groups_updated');
  }, []);

  const handleRunGrouping = async () => {
    setRunning(true);
    setMsg('');
    try {
      const res = await api.runGrouping();
      setMsg(`Done — ${res.grouped} questions grouped, ${res.newGroups} new topics created.`);
      await loadGroups();
    } catch (err) {
      setMsg(err.message || 'Grouping failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-oracle-gray">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-oracle-navy">Question Topics</h2>
            <p className="text-xs text-oracle-muted">Similar questions grouped automatically every 15 min</p>
          </div>
          {user?.isAdmin && (
            <button
              onClick={handleRunGrouping}
              disabled={running}
              className="btn-primary py-2 px-4 text-sm disabled:opacity-50"
            >
              {running ? 'Grouping…' : 'Group Now'}
            </button>
          )}
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <p className="text-sm text-green-700">{msg}</p>
          </div>
        )}

        {/* Next auto-run indicator */}
        <div className="flex items-center gap-2 text-xs text-oracle-muted bg-white rounded-lg border border-oracle-border px-4 py-2">
          <ClockIcon className="w-4 h-4 text-oracle-navy" />
          <span>Auto-groups similar questions every 15 minutes</span>
        </div>

        {/* Groups list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-oracle-gray rounded w-2/3 mb-2" />
                <div className="h-4 bg-oracle-gray rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">🗂️</div>
            <p className="text-oracle-navy font-semibold">No topics yet</p>
            <p className="text-oracle-muted text-sm mt-1">
              Topics appear once enough similar questions are submitted.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => (
              <GroupCard key={g.GROUP_ID} group={g} isAdmin={user?.isAdmin} onGroupsChange={loadGroups} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}
