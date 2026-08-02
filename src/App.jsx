import React, { useState, useEffect } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ModuleScreen from './components/ModuleScreen.jsx';

export default function App() {
  const [activeModule, setActiveModule] = useState(null); // null = home

  // Handle Android back-button / browser back gesture
  useEffect(() => {
    const handlePopState = () => {
      if (activeModule) setActiveModule(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModule]);

  const openModule = (id) => {
    // Push a history entry so the back gesture works on Android
    window.history.pushState({ module: id }, '');
    setActiveModule(id);
  };

  const closeModule = () => {
    window.history.back(); // triggers popstate → setActiveModule(null)
  };

  return (
    <div
      style={{
        height: '100dvh',
        background: '#090d16',
        color: '#f1f5f9',
        fontFamily: "'Prompt','Sarabun',sans-serif",
        overflowY: activeModule ? 'hidden' : 'auto',
        position: 'relative',
      }}
    >
      {/* Ambient glow */}
      <div className="glow-ambient-1" />
      <div className="glow-ambient-2" />

      {/* Home screen header — safe-area aware */}
      {!activeModule && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(9,13,22,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 'max(8px, env(safe-area-inset-top))',
            paddingBottom: '8px',
            paddingLeft: '16px',
            paddingRight: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              flexShrink: 0,
            }}
          >
            <img src="/logo.png" alt="SON" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>
            SON <span style={{ color: '#facc15' }}>CONTRACTOR</span>
          </div>
        </header>
      )}

      {/* Home content */}
      {!activeModule && (
        <HomeScreen onSelect={openModule} />
      )}

      {/* Full-screen module overlay */}
      {activeModule && (
        <ModuleScreen moduleId={activeModule} onBack={closeModule} />
      )}
    </div>
  );
}
