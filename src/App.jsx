import React, { useState, useEffect } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ModuleScreen from './components/ModuleScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import WeeklyTodoView from './components/WeeklyTodoView.jsx';
import StoreDragDropView from './components/StoreDragDropView.jsx';
import PrPoView from './components/PrPoView.jsx';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') return window.matchMedia(query).matches;
    return false;
  });
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

export default function App() {
  const [activeModule, setActiveModule] = useState(null); // Mobile active module (default: null to show home screen)
  const [activeTab, setActiveTab] = useState('store'); // PC active tab (default: store)
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // Tailwind 'lg' breakpoint

  // Handle Android back-button / browser back gesture for Mobile
  useEffect(() => {
    const handlePopState = () => {
      if (activeModule) setActiveModule(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModule]);

  const openModule = (id) => {
    window.history.pushState({ module: id }, '');
    setActiveModule(id);
  };

  const closeModule = () => {
    window.history.back(); // triggers popstate → setActiveModule(null)
  };

  // ------------------------------------
  // DESKTOP (PC) LAYOUT: Sidebar + Content
  // ------------------------------------
  if (isDesktop) {
    return (
      <div className="master-layout bg-[#090d16] text-[#f1f5f9]" style={{ fontFamily: "'Prompt','Sarabun',sans-serif" }}>
        <div className="glow-ambient-1" />
        <div className="glow-ambient-2" />
        
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={false} // PC sidebar is always visible statically
          setSidebarOpen={() => {}}
        />
        
        <div className="master-content-col relative z-10" style={{ display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'todo' && <WeeklyTodoView />}
          {activeTab === 'store' && <StoreDragDropView />}
          {activeTab === 'prpo' && <PrPoView />}
        </div>
      </div>
    );
  }

  // ------------------------------------
  // MOBILE LAYOUT: Home Screen + Full-Screen Takeover
  // ------------------------------------
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
