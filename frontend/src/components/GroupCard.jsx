import React, { useState } from 'react';
import { api } from '../api.js';

export default function GroupCard({ group, isAdmin, onGroupsChange }) {
  const [expanded, setExpanded] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const questions = group.questions || [];
  const hasAnswer = !!group.ADMIN_ANSWER;

  const openEditor = () => {
    setDraft(group.ADMIN_ANSWER || '');
    setAnswering(true);
    setError('');
    if (!expanded) setExpanded(true);
  };

  const cancelEditor = () => {
    setAnswering(false);
    setDraft('');
    setError('');
  };

  const submitAnswer = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.answerGroup(group.GROUP_ID, draft.trim());
      setAnswering(false);
      setDraft('');
      onGroupsChange?.();
    } catch (err) {
      setError(err.message || 'Failed to save answer');
    } finally {
      setSaving(false);
    }
  };

  const removeAnswer = async () => {
    if (!confirm('Remove this answer?')) return;
    setSaving(true);
    try {
      await api.deleteAnswer(group.GROUP_ID);
      onGroupsChange?.();
    } catch (err) {
      setError(err.message || 'Failed to remove answer');
    } finally {
      setSaving(false);
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="card">
      {/* Header row — always visible */}
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => setExpanded(o => !o)} className="flex-1 text-left min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-oracle-navy text-base leading-snug">
                {group.GROUP_TITLE}
              </h3>
              {group.GROUP_SUMMARY && (
                <p className="text-sm text-oracle-muted mt-0.5 line-clamp-1">{group.GROUP_SUMMARY}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasAnswer && (
                <span className="badge bg-green-100 text-green-700 font-medium">Answered</span>
              )}
              <span className="badge bg-oracle-red/10 text-oracle-red font-semibold">
                <HeartIcon className="w-3 h-3" />
                {Number(group.TOTAL_LIKES ?? 0)}
              </span>
              <span className="badge bg-oracle-navy/10 text-oracle-navy">
                {questions.length} Q
              </span>
              <ChevronIcon expanded={expanded} />
            </div>
          </div>
        </button>

        {/* Admin answer button */}
        {isAdmin && !answering && (
          <button
            onClick={openEditor}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-oracle-navy/30 text-oracle-navy hover:bg-oracle-navy hover:text-white transition-colors"
          >
            <PenIcon className="w-3.5 h-3.5" />
            {hasAnswer ? 'Edit Answer' : 'Answer'}
          </button>
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-oracle-border pt-3">
          {/* Questions list */}
          {questions.length > 0 && (
            <ul className="space-y-2">
              {questions.map(q => (
                <li key={q.QUESTION_ID} className="flex items-start gap-2 text-sm text-oracle-text">
                  <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-oracle-red/10 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-oracle-red" />
                  </span>
                  <span className="leading-snug flex-1">{q.QUESTION_TEXT}</span>
                  <span className="ml-auto shrink-0 flex items-center gap-1 text-xs text-oracle-muted">
                    <HeartIcon className="w-3 h-3 text-oracle-red" />
                    {Number(q.LIKE_COUNT ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Existing answer display */}
          {hasAnswer && !answering && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-oracle-red flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">A</span>
                  </span>
                  <span className="text-xs font-semibold text-oracle-navy">
                    {group.ANSWERED_BY?.split('@')[0] ?? 'Admin'}
                    <span className="font-normal text-oracle-muted ml-1">· {timeAgo(group.ANSWERED_AT)}</span>
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={removeAnswer}
                    disabled={saving}
                    className="text-xs text-red-400 hover:text-oracle-red transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-sm text-oracle-text leading-relaxed whitespace-pre-wrap">
                {group.ADMIN_ANSWER}
              </p>
            </div>
          )}

          {/* Admin answer editor */}
          {answering && (
            <div className="bg-oracle-navy/5 border border-oracle-navy/20 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-oracle-navy uppercase tracking-wide">
                Admin Response
              </p>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Type your answer to this topic…"
                rows={4}
                className="w-full text-sm text-oracle-text bg-white border border-oracle-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-oracle-red/40"
                autoFocus
              />
              {error && <p className="text-xs text-oracle-red">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEditor}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg text-sm text-oracle-muted hover:text-oracle-text border border-oracle-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={saving || !draft.trim()}
                  className="btn-primary py-1.5 px-4 text-sm disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Post Answer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeartIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function ChevronIcon({ expanded }) {
  return (
    <svg className={`w-4 h-4 text-oracle-muted transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PenIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
    </svg>
  );
}
