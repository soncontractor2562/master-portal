import React, { Suspense, lazy } from 'react';
import { ChevronLeft } from 'lucide-react';
import LoadingFallback from './LoadingFallback.jsx';

const WeeklyTodoView = lazy(() => import('./WeeklyTodoView.jsx'));
const StoreDragDropView = lazy(() => import('./StoreDragDropView.jsx'));
const PrPoView = lazy(() => import('./PrPoView.jsx'));
const DocGeneratorView = lazy(() => import('./DocGeneratorView.jsx'));

const MODULE_LABELS = {
  todo:  'Weekly Todo List',
  store: 'Store Manager',
  prpo:  'PR / PO System',
  docgen: 'Request Report',
};

export default function ModuleScreen({ moduleId, onBack }) {
  const label = MODULE_LABELS[moduleId];

  if (!label) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#090d16',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar — safe area aware */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          paddingTop: 'max(10px, env(safe-area-inset-top))',
          background: '#0f172a',
          borderBottom: '1px solid rgba(51,65,85,0.6)',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            borderRadius: '12px',
            background: 'rgba(59,130,246,0.15)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#60a5fa',
            fontSize: '14px',
            fontFamily: "'Prompt','Sarabun',sans-serif",
            fontWeight: 600,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Back to Home"
        >
          <ChevronLeft size={18} />
          หน้าหลัก
        </button>
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: '#e2e8f0',
            fontFamily: "'Prompt','Sarabun',sans-serif",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
        <div style={{ width: '80px' }} />
      </div>

      {/* Module Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Suspense fallback={<LoadingFallback />}>
          {moduleId === 'todo' && <WeeklyTodoView />}
          {moduleId === 'store' && <StoreDragDropView />}
          {moduleId === 'prpo' && <PrPoView />}
          {moduleId === 'docgen' && <DocGeneratorView />}
        </Suspense>
      </div>
    </div>
  );
}
