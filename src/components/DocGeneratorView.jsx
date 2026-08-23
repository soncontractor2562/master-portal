import React from 'react';
import DocGeneratorApp from '../doc-generator/App.jsx';
import '../doc-generator/index.css';
import '../doc-generator/App.css'; // If exists

export default function DocGeneratorView() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '0.75rem 1rem' }}>
      <DocGeneratorApp />
    </div>
  );
}
