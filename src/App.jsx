import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import WeeklyTodoView from './components/WeeklyTodoView.jsx';
import StoreDragDropView from './components/StoreDragDropView.jsx';
import PrPoView from './components/PrPoView.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('todo');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'MODAL_STATE') {
        if (e.data.open) {
          document.body.classList.add('modal-open');
        } else {
          document.body.classList.remove('modal-open');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);


  useEffect(() => {
    const handleBlur = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        setTimeout(() => {
          const active = document.activeElement;
          // If the next focused element is still an input, don't reset the scroll
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
            return;
          }
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
        }, 150);
      }
    };

    window.addEventListener('focusout', handleBlur, true);
    return () => window.removeEventListener('focusout', handleBlur, true);
  }, []);


  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#090d16',
      color: '#f1f5f9',
      fontFamily: "'Prompt','Sarabun',sans-serif",
      position: 'relative'
    }}>
      <div className="glow-ambient-1" />
      <div className="glow-ambient-2" />

      <div className="master-layout">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="master-content-col">
          {/* Mobile Header Bar */}
          <div className="lg:hidden flex items-center justify-between p-3 bg-[#0f172a] border-b border-slate-800 z-30">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 active:scale-95 transition-transform"
                aria-label="Open Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
              </button>
              <div className="font-bold text-sm tracking-wide text-slate-200">
                SON <span className="text-yellow-400">CONTRACTOR</span>
              </div>
            </div>
          </div>

          <div className="main-iframe-area">
            {activeTab === 'todo'  && <WeeklyTodoView />}
            {activeTab === 'store' && <StoreDragDropView />}
            {activeTab === 'prpo'  && <PrPoView />}
          </div>
        </div>
      </div>
    </div>
  );
}
