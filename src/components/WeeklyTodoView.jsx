import React from 'react';
import WeeklyTodoApp from '../weekly-todo/App.jsx';
import '../weekly-todo/index.css';

export default function WeeklyTodoView() {
  return (
    // overflow-y:auto here so the weekly todo scrolls within the flex container
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '0.75rem 1rem' }}>
      <WeeklyTodoApp />
    </div>
  );
}
