import React, { useState } from 'react';

export default function GroupCard({ group }) {
  const [expanded, setExpanded] = useState(false);
  const questions = group.questions || [];

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-oracle-navy text-base leading-snug">
              {group.GROUP_TITLE}
            </h3>
            {group.GROUP_SUMMARY && (
              <p className="text-sm text-oracle-muted mt-0.5 line-clamp-1">{group.GROUP_SUMMARY}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

      {expanded && questions.length > 0 && (
        <ul className="mt-3 space-y-2 border-t border-oracle-border pt-3">
          {questions.map(q => (
            <li key={q.QUESTION_ID} className="flex items-start gap-2 text-sm text-oracle-text">
              <span className="mt-1 shrink-0 w-4 h-4 rounded-full bg-oracle-red/10 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-oracle-red" />
              </span>
              <span className="leading-snug">{q.QUESTION_TEXT}</span>
              <span className="ml-auto shrink-0 flex items-center gap-1 text-xs text-oracle-muted">
                <HeartIcon className="w-3 h-3 text-oracle-red" />
                {Number(q.LIKE_COUNT ?? 0)}
              </span>
            </li>
          ))}
        </ul>
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
