import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { UserCircle2, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';

const getProjectColor = (projectName) => {
  if (!projectName) return '#6366f1';
  const colors = ['#f43f5e', '#8b5cf6', '#d946ef', '#0ea5e9', '#14b8a6', '#f59e0b', '#eab308'];
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getStatusColor = (columnId) => {
  if (columnId === 'column-todo') return '#6366f1'; // Indigo
  if (columnId === 'column-in-progress') return '#f59e0b'; // Amber
  if (columnId === 'column-done') return '#10b981'; // Green
  return '#6366f1';
};

const TaskCard = ({ task, index, onEditClick, columnId, onMoveRight, hasNextColumn }) => {
  const projectColor = getProjectColor(task.project);
  const statusColor = getStatusColor(columnId);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          className={`task-card ${snapshot.isDragging ? 'is-dragging' : ''}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            '--status-color': statusColor
          }}
          onClick={() => onEditClick(task, columnId)}
        >
          <div className="card-project" style={{ color: projectColor }}>{task.project}</div>
          
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ paddingRight: '0.5rem' }}>{task.taskName}</span>
            {hasNextColumn && (
               <button 
                 className="icon-btn" 
                 style={{ 
                   padding: '0.2rem 0.5rem', 
                   marginTop: '-0.2rem', 
                   marginRight: '-0.2rem',
                   backgroundColor: 'var(--border-glass)',
                   borderRadius: '4px',
                   color: 'var(--text-primary)'
                 }} 
                 onClick={(e) => {
                   e.stopPropagation();
                   onMoveRight(task, columnId);
                 }}
                 title="Move to next status"
               >
                 <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Move</span>
               </button>
            )}
          </div>
          
          <div className="card-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {(task.assignee || 'Unassigned').split(',').map((a, i) => {
                  const trimmed = a.trim();
                  if (!trimmed) return null;
                  return (
                    <div key={i} className="card-assignee">
                      <UserCircle2 size={14} color="#a1a1aa" />
                      <span>{trimmed}</span>
                    </div>
                  );
                })}
              </div>
              
              {task.dueDate && (
                <div className="card-due">
                  <Calendar size={12} color="#a1a1aa" />
                  <span>{task.dueDate}</span>
                </div>
              )}
            </div>
            
            {task.completedDate && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--success)', fontWeight: '500' }}>
                <CheckCircle2 size={12} />
                <span>Done: {task.completedDate}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
