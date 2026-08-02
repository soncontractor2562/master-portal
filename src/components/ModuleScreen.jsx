import React from 'react';
import { ChevronLeft } from 'lucide-react';

/** กำหนด src ของแต่ละ module */
const MODULE_SRCS = {
  todo:  '/apps/weekly-todo/index.html?v=1',
  store: '/apps/store-dragdrop/index.html?v=2.18',
  prpo:  '/apps/prpo/index.html?v=1',
};

const MODULE_LABELS = {
  todo:  'Weekly Todo List',
  store: 'Store Manager',
  prpo:  'PR / PO System',
};

/**
 * ModuleScreen — renders the selected module as a truly full-screen iframe.
 * The iframe uses `position: fixed; inset: 0` so it becomes the sole owner of
 * the viewport. This removes the parent React shell from the keyboard/scroll
 * equation, eliminating the "push-up" and cursor-lag issues on mobile.
 */
export default function ModuleScreen({ moduleId, onBack }) {
  const src = MODULE_SRCS[moduleId];
  const label = MODULE_LABELS[moduleId];

  if (!src) return null;

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
        {/* Spacer to balance the back button */}
        <div style={{ width: '80px' }} />
      </div>

      {/* iframe — takes all remaining space */}
      <iframe
        src={src}
        title={label}
        scrolling="yes"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          background: '#090d16',
          /* No overflow:hidden wrapper here — let the iframe manage its own scroll */
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
