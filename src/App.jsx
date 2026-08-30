import React, { useState, useEffect, Suspense, lazy } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import ModuleScreen from './components/ModuleScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import LoadingFallback from './components/LoadingFallback.jsx';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';

const WeeklyTodoView = lazy(() => import('./components/WeeklyTodoView.jsx'));
const StoreDragDropView = lazy(() => import('./components/StoreDragDropView.jsx'));
const PrPoView = lazy(() => import('./components/PrPoView.jsx'));
const DocGeneratorView = lazy(() => import('./components/DocGeneratorView.jsx'));

const VALID_MODULES = ['todo', 'store', 'prpo', 'docgen'];

function getModuleFromHash() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  return VALID_MODULES.includes(hash) ? hash : null;
}

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
  const isDesktop = useMediaQuery('(min-width: 1024px)'); // Tailwind 'lg' breakpoint
  const initialModule = getModuleFromHash();

  const [activeModule, setActiveModule] = useState(initialModule); // Mobile active module (null = Home Screen)
  const [activeTab, setActiveTab] = useState(initialModule || 'todo'); // PC active tab (default: 'todo')
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sync state with URL Hash changes (back/forward button, direct hash edit)
  useEffect(() => {
    const handleHashChange = () => {
      const mod = getModuleFromHash();
      if (isDesktop) {
        if (mod) setActiveTab(mod);
      } else {
        setActiveModule(mod);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isDesktop]);

  // Sync URL hash when Desktop activeTab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (window.location.hash.replace(/^#\/?/, '') !== tabId) {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  // Mobile Open & Close module
  const openModule = (id) => {
    window.location.hash = `#${id}`;
    setActiveModule(id);
  };

  const closeModule = () => {
    if (window.location.hash) {
      window.history.back();
    } else {
      setActiveModule(null);
    }
  };

  // Re-broadcast theme to newly mounted iframes when tab changes
  useEffect(() => {
    const theme = localStorage.getItem('app_theme') || 'dark';
    setTimeout(() => {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(f => {
        try { f.contentWindow.postMessage({ type: 'SET_THEME', theme }, '*'); } catch (_) {}
      });
    }, 300);
  }, [activeTab]);

  // ------------------------------------
  // DESKTOP (PC) LAYOUT: Sidebar + Content
  // ------------------------------------
  if (isDesktop) {
    return (
      <ThemeProvider>
        <div className="master-layout bg-[#090d16] text-[#f1f5f9]" style={{ fontFamily: "'Prompt','Sarabun',sans-serif" }}>
          <div className="glow-ambient-1" />
          <div className="glow-ambient-2" />
          
          <Sidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
          
          <div className="master-content-col relative z-10" style={{ display: 'flex', flexDirection: 'column' }}>
            <Suspense fallback={<LoadingFallback />}>
              {activeTab === 'todo' && <WeeklyTodoView />}
              {activeTab === 'store' && <StoreDragDropView />}
              {activeTab === 'prpo' && <PrPoView />}
              {activeTab === 'docgen' && <DocGeneratorView />}
            </Suspense>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // ------------------------------------
  // MOBILE LAYOUT: Home Screen + Full-Screen Takeover
  // ------------------------------------
  return (
    <ThemeProvider>
      <div
        className="mobile-layout-container"
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
            className="mobile-header-container"
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
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }} className="mobile-header-title">
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
    </ThemeProvider>
  );
}
