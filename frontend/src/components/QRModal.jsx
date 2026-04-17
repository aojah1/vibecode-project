import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';

export default function QRModal({ onClose }) {
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    api.getAppUrl().then(d => setAppUrl(d.url)).catch(() => setAppUrl(window.location.origin));
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-oracle-navy mb-1">Join the Q&amp;A</h2>
        <p className="text-sm text-oracle-muted mb-5">Scan with your phone to ask &amp; vote</p>

        {appUrl ? (
          <div className="flex justify-center mb-4">
            <div className="p-3 border-2 border-oracle-red rounded-xl">
              <QRCodeSVG value={appUrl} size={200} fgColor="#1A1F3C" />
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-oracle-muted">Loading…</div>
        )}

        <p className="text-xs text-oracle-muted break-all mb-5">{appUrl}</p>

        <button onClick={onClose} className="btn-primary w-full">Close</button>
      </div>
    </div>
  );
}
