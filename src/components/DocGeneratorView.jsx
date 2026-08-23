import React from 'react';
import DocGeneratorApp from '../doc-generator/App.jsx';

export default function DocGeneratorView() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '0.75rem 1rem', background: '#f1f5f9' }}>
      <DocGeneratorApp />
    </div>
  );
}
