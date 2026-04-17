import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function QuestionCard({ question, onLikeUpdate, onDelete }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const liked = question.USER_LIKED === 1 || question.USER_LIKED === '1' || question.userLiked;
  const likeCount = Number(question.LIKE_COUNT ?? question.likeCount ?? 0);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.likeQuestion(question.QUESTION_ID ?? question.questionId);
      onLikeUpdate?.(question.QUESTION_ID ?? question.questionId, res.likeCount, res.liked);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const qId = question.QUESTION_ID ?? question.questionId;

  return (
    <div className="card group transition-shadow hover:shadow-md">
      <div className="flex gap-3">
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={loading}
          className={`flex flex-col items-center justify-center min-w-[52px] rounded-lg py-2 px-1 transition-colors touch-manipulation
            ${liked
              ? 'bg-oracle-red text-white'
              : 'bg-oracle-gray text-oracle-muted hover:bg-red-50 hover:text-oracle-red'
            } ${loading ? 'opacity-50' : ''}`}
        >
          <HeartIcon filled={liked} className="w-5 h-5" />
          <span className="text-sm font-bold mt-0.5">{likeCount}</span>
        </button>

        {/* Question content */}
        <div className="flex-1 min-w-0">
          <p className="text-base text-oracle-text leading-snug">
            {question.QUESTION_TEXT ?? question.questionText}
          </p>
          <div className="mt-2 flex items-center justify-between flex-wrap gap-1">
            <span className="text-xs text-oracle-muted">
              {(question.USER_EMAIL ?? question.userEmail ?? '').split('@')[0]}
            </span>
            <div className="flex items-center gap-2">
              {(question.GROUP_ID ?? question.groupId) && (
                <span className="badge bg-oracle-navy/10 text-oracle-navy">
                  grouped
                </span>
              )}
              <span className="text-xs text-oracle-muted">
                {timeAgo(question.CREATED_AT ?? question.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Admin delete */}
        {user?.isAdmin && (
          <button
            onClick={() => onDelete?.(qId)}
            className="self-start p-1 text-oracle-muted hover:text-oracle-red transition-colors opacity-0 group-hover:opacity-100"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function HeartIcon({ filled, className }) {
  return (
    <svg className={className} fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
