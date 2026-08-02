import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for PWA Offline support
const updateSW = registerSW({
  onNeedRefresh() {
    // Optional: prompt user to refresh when new update is available
    if (confirm("มีอัปเดตเวอร์ชันใหม่ ต้องการโหลดใหม่เดี๋ยวนี้หรือไม่?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App is ready to work offline");
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
