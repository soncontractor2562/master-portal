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
            
            // Date parsing helper
            const getTaskWeekOffset = (dueDateStr) => {
              if (!dueDateStr) return 0; // Default to current week
              const parts = dueDateStr.split('/');
              if (parts.length !== 3) return 0;
              
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              const y = parseInt(parts[2], 10);
              
              const taskDate = new Date(y, m, d);
              const anchorDate = new Date(2026, 6, 20); // 20 July 2026
              
              const diffTime = taskDate.getTime() - anchorDate.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              return Math.floor(diffDays / 7);
            };

            const tasks = column.taskIds
              .map(taskId => data.tasks[taskId])
              .filter(task => {
                // 1. Filter by Week
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
                  if (!dateStr) return Infinity;
                  const parts = dateStr.split('/');
                  if (parts.length !== 3) return Infinity;
                  return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
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
