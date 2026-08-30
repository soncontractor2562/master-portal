import React from 'react';

export default function LoadingFallback({ title = 'กำลังโหลดข้อมูล...' }) {
  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: '280px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#94a3b8',
        fontFamily: "'Prompt', 'Sarabun', sans-serif",
      }}
    >
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(59, 130, 246, 0.15)',
            borderTopColor: '#3b82f6',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em', color: '#cbd5e1' }}>
        {title}
      </div>
    </div>
  );
}
