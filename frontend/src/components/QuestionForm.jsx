import React, { useState } from 'react';
import { api } from '../api.js';

export default function QuestionForm({ onSubmitted }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const MAX = 2000;
  const remaining = MAX - text.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const q = await api.postQuestion(trimmed);
      setText('');
      onSubmitted?.(q);
    } catch (err) {
      setError(err.message || 'Failed to submit question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <label className="block text-sm font-semibold text-oracle-navy mb-2">
        Ask a Question
      </label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What would you like to ask? (e.g. How does OCI compete with AWS on pricing?)"
        rows={3}
        maxLength={MAX}
        className="input resize-none text-sm"
        disabled={loading}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs ${remaining < 100 ? 'text-oracle-red' : 'text-oracle-muted'}`}>
          {remaining} characters left
        </span>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="btn-primary py-2 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Submitting…' : 'Submit'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-oracle-red">{error}</p>}
    </form>
  );
}
