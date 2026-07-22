import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { CircleDashed, CheckCircle2, Clock } from 'lucide-react';

const Column = ({ column, tasks, onEditClick, onMoveRight, hasNextColumn }) => {
  
  const getIcon = (title) => {
    if (title.toLowerCase().includes('done')) return <CheckCircle2 size={18} color="#10b981" />;
    if (title.toLowerCase().includes('progress')) return <Clock size={18} color="#f59e0b" />;
    return <CircleDashed size={18} color="#6366f1" />;
  };

  return (
    <div className="column">
      <div className="column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {getIcon(column.title)}
          <h3 className="column-title">{column.title}</h3>
        </div>
        <span className="task-count">{tasks.length}</span>
      </div>
      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            className={`task-list ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {tasks.map((task, index) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                index={index} 
                onEditClick={onEditClick}
                columnId={column.id}
                onMoveRight={onMoveRight}
                hasNextColumn={hasNextColumn}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default Column;
