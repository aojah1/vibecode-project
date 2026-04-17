import React, { useEffect, useState, useCallback } from 'react';
import Header from '../components/Header.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import QuestionForm from '../components/QuestionForm.jsx';
import { api } from '../api.js';
import { socket } from '../socket.js';

export default function QuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('likes'); // 'likes' | 'newest'

  const loadQuestions = useCallback(async () => {
    try {
      const data = await api.getQuestions();
      setQuestions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();

    socket.on('new_question', (q) => {
      setQuestions(prev => [q, ...prev]);
    });

    socket.on('like_update', ({ questionId, likeCount, liked, userId }) => {
      setQuestions(prev =>
        prev.map(q =>
          String(q.QUESTION_ID) === String(questionId)
            ? { ...q, LIKE_COUNT: likeCount }
            : q
        )
      );
    });

    socket.on('groups_updated', () => loadQuestions());

    return () => {
      socket.off('new_question');
      socket.off('like_update');
      socket.off('groups_updated');
    };
  }, [loadQuestions]);

  const handleSubmitted = (q) => {
    // Socket will also broadcast, but handle optimistically
    setQuestions(prev => {
      if (prev.find(p => String(p.QUESTION_ID) === String(q?.QUESTION_ID))) return prev;
      return [q, ...prev];
    });
  };

  const handleLikeUpdate = (questionId, likeCount) => {
    setQuestions(prev =>
      prev.map(q => String(q.QUESTION_ID) === String(questionId) ? { ...q, LIKE_COUNT: likeCount } : q)
    );
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this question?')) return;
    try {
      await api.deleteQuestion(id);
      setQuestions(prev => prev.filter(q => String(q.QUESTION_ID) !== String(id)));
    } catch (err) {
      alert(err.message);
    }
  };

  const sorted = [...questions].sort((a, b) => {
    if (sortBy === 'likes') return Number(b.LIKE_COUNT ?? 0) - Number(a.LIKE_COUNT ?? 0);
    return new Date(b.CREATED_AT ?? 0) - new Date(a.CREATED_AT ?? 0);
  });

  return (
    <div className="min-h-screen bg-oracle-gray">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Submit question */}
        <QuestionForm onSubmitted={handleSubmitted} />

        {/* Sort controls */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-oracle-muted">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-1 bg-white border border-oracle-border rounded-lg p-0.5">
            {[['likes', 'Top'], ['newest', 'New']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  sortBy === val
                    ? 'bg-oracle-navy text-white'
                    : 'text-oracle-muted hover:text-oracle-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-14 bg-oracle-gray rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-oracle-gray rounded w-full" />
                    <div className="h-4 bg-oracle-gray rounded w-3/4" />
                    <div className="h-3 bg-oracle-gray rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card text-center text-oracle-red py-8">
            <p>{error}</p>
            <button onClick={loadQuestions} className="btn-secondary mt-4 text-sm">Retry</button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-oracle-navy font-semibold">No questions yet</p>
            <p className="text-oracle-muted text-sm mt-1">Be the first to ask something!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(q => (
              <QuestionCard
                key={q.QUESTION_ID}
                question={q}
                onLikeUpdate={handleLikeUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
