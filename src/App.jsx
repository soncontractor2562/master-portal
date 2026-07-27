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
    const resetScroll = () => {
      setTimeout(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      }, 50);
    };

    window.addEventListener('focusout', resetScroll);
    window.addEventListener('blur', resetScroll);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resetScroll);
      window.visualViewport.addEventListener('scroll', resetScroll);
    }

    return () => {
      window.removeEventListener('focusout', resetScroll);
      window.removeEventListener('blur', resetScroll);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', resetScroll);
        window.visualViewport.removeEventListener('scroll', resetScroll);
      }
    };
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
