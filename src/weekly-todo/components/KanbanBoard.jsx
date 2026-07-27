import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';

const KanbanBoard = ({ data, setData, filterProject, filterAssignee, weekOffset, onEditClick, onDragEnd, onMoveRight }) => {
  const [activeTab, setActiveTab] = useState(data.columnOrder[0]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <div className="mobile-tabs">
        {data.columnOrder.map(columnId => {
          const column = data.columns.find(c => c.id === columnId);
          return (
            <button
              key={`tab-${column.id}`}
              className={`tab-btn ${activeTab === column.id ? 'active' : ''}`}
              onClick={() => setActiveTab(column.id)}
            >
              {column.title}
            </button>
          );
        })}
      </div>
      <div className="board-container">
        <DragDropContext onDragEnd={isMobile ? () => {} : onDragEnd}>
          {data.columnOrder.map((columnId, index) => {
            const column = data.columns.find(c => c.id === columnId);
            const hasNextColumn = index < data.columnOrder.length - 1;
            
            // Date parsing helper relative to current week
            const getTaskWeekOffset = (dueDateStr) => {
              if (!dueDateStr || typeof dueDateStr !== 'string') return 0;
              const parts = dueDateStr.split('/');
              if (parts.length !== 3) return 0;
              
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              const y = parseInt(parts[2], 10);
              if (isNaN(d) || isNaN(m) || isNaN(y)) return 0;
              
              const taskDate = new Date(y, m, d);
              if (isNaN(taskDate.getTime())) return 0;

              const now = new Date();
              const dayOfWeek = now.getDay();
              const distanceToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
              const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday);

              const tTime = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate()).getTime();
              const mTime = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate()).getTime();

              const diffDays = Math.floor((tTime - mTime) / (1000 * 60 * 60 * 24));
              return Math.floor(diffDays / 7);
            };

            const tasks = (column.taskIds || [])
              .map(taskId => data.tasks && data.tasks[taskId])
              .filter(Boolean)
              .filter(task => {
                // 1. Filter strictly by task's week (based on dueDate)
                const taskWeek = getTaskWeekOffset(task.dueDate);
                if (taskWeek !== weekOffset) return false;

                // 2. Filter by Project & Assignee
                const matchesProject = filterProject === '' || task.project === filterProject;
                
                // Assignee Logic (Supports multiple assignees split by comma)
                let matchesAssignee = true;
                if (filterAssignee !== '') {
                   const assigneesList = (task.assignee || '').split(',').map(a => a.trim()).filter(Boolean);
                   matchesAssignee = assigneesList.includes(filterAssignee);
                }
                
                return matchesProject && matchesAssignee;
              })
              .sort((a, b) => {
                const parseDateForSort = (dateStr) => {
                  if (!dateStr || typeof dateStr !== 'string') return Infinity;
                  const parts = dateStr.split('/');
                  if (parts.length !== 3) return Infinity;
                  const d = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1;
                  const y = parseInt(parts[2], 10);
                  if (isNaN(d) || isNaN(m) || isNaN(y)) return Infinity;
                  const time = new Date(y, m, d).getTime();
                  return isNaN(time) ? Infinity : time;
                };
                return parseDateForSort(a.dueDate) - parseDateForSort(b.dueDate);
              });

            return (
              <div key={column.id} className={`column-wrapper ${activeTab !== column.id ? 'mobile-hidden' : ''}`} style={{ height: '100%' }}>
                <Column 
                  column={column} 
                  tasks={tasks} 
                  onEditClick={onEditClick}
                  onMoveRight={onMoveRight}
                  hasNextColumn={hasNextColumn}
                />
              </div>
            );
          })}
        </DragDropContext>
      </div>
    </>
  );
};

export default KanbanBoard;
