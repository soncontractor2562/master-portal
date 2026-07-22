import React, { useState, useEffect, useMemo } from 'react';
import KanbanBoard from './components/KanbanBoard';
import { initialData } from './data/mockData';
import { CalendarDays, LayoutDashboard, Plus, Sun, Moon, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import AddTaskForm from './components/AddTaskForm';
import EditTaskForm from './components/EditTaskForm';

const getProjectColor = (projectName) => {
  if (!projectName) return '#6366f1';
  const colors = ['#f43f5e', '#8b5cf6', '#d946ef', '#0ea5e9', '#14b8a6', '#f59e0b', '#eab308'];
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

import { supabase } from './supabaseClient';

function App() {
  const [data, setData] = useState(initialData);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data: boardData, error } = await supabase
          .from('boards')
          .select('state')
          .eq('id', 'main')
          .single();
        
        // PGRST116 is "No rows found"
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching board:', error);
        }
        
        if (boardData && boardData.state && Object.keys(boardData.state).length > 0) {
          setData(boardData.state);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    
    fetchBoard();
  }, []);

  // Save data to Supabase whenever it changes (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    
    const saveBoard = async () => {
      try {
        const { error } = await supabase
          .from('boards')
          .upsert({ id: 'main', state: data });
          
        if (error) console.error('Error saving board:', error);
      } catch (err) {
        console.error('Unexpected save error:', err);
      }
    };
    
    // Simple debounce to avoid spamming the database
    const timeoutId = setTimeout(saveBoard, 500);
    return () => clearTimeout(timeoutId);
  }, [data, isLoaded]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Week state (mock)
  const [weekOffset, setWeekOffset] = useState(0);

  // Edit State
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskColumn, setEditingTaskColumn] = useState(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleWeekChange = (offset) => {
    setWeekOffset(prev => prev + offset);
  };

  const getWeekString = () => {
    if (weekOffset === 0) return 'This Week (20-26 Jul)';
    if (weekOffset === -1) return 'Last Week (13-19 Jul)';
    if (weekOffset === 1) return 'Next Week (27 Jul - 2 Aug)';
    return `Week offset: ${weekOffset}`;
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const startColumn = data.columns.find(col => col.id === source.droppableId);
    const finishColumn = data.columns.find(col => col.id === destination.droppableId);

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      
      const isFiltered = filterProject.trim() !== '' || filterAssignee.trim() !== '';
      if (isFiltered || weekOffset !== 0) {
         // Fallback relative ordering for filtered views
         newTaskIds.splice(newTaskIds.indexOf(draggableId), 1);
         newTaskIds.splice(destination.index, 0, draggableId); 
      } else {
        newTaskIds.splice(source.index, 1);
        newTaskIds.splice(destination.index, 0, draggableId);
      }
      
      const newColumn = { ...startColumn, taskIds: newTaskIds };
      setData({
        ...data,
        columns: data.columns.map(col => col.id === newColumn.id ? newColumn : col)
      });
      return;
    }

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(startTaskIds.indexOf(draggableId), 1);
    const newStart = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    
    const isFiltered = filterProject.trim() !== '' || filterAssignee.trim() !== '' || weekOffset !== 0;
    if (isFiltered) {
       finishTaskIds.push(draggableId);
    } else {
       finishTaskIds.splice(destination.index, 0, draggableId);
    }
    
    const newFinish = { ...finishColumn, taskIds: finishTaskIds };

    // Auto set completedDate if moving to Done
    let updatedTasks = { ...data.tasks };
    if (finishColumn.id === 'column-done') {
       updatedTasks[draggableId] = { 
         ...updatedTasks[draggableId], 
         completedDate: getTodayString() 
       };
    } else if (updatedTasks[draggableId].completedDate) {
       const taskCopy = { ...updatedTasks[draggableId] };
       delete taskCopy.completedDate;
       updatedTasks[draggableId] = taskCopy;
    }

    setData({
      ...data,
      tasks: updatedTasks,
      columns: data.columns.map(col => {
        if (col.id === newStart.id) return newStart;
        if (col.id === newFinish.id) return newFinish;
        return col;
      })
    });
  };

  const handleAddTask = (newTask) => {
    const todoColumnId = data.columnOrder[0];
    const newTaskWithId = { ...newTask, id: `task-${Date.now()}` };
    
    const newTasks = { ...data.tasks, [newTaskWithId.id]: newTaskWithId };
    const column = data.columns.find(col => col.id === todoColumnId);
    const newTaskIds = Array.from(column.taskIds);
    newTaskIds.unshift(newTaskWithId.id); // Add to top
    
    const newColumn = { ...column, taskIds: newTaskIds };
    
    setData({
      ...data,
      tasks: newTasks,
      columns: data.columns.map(col => col.id === newColumn.id ? newColumn : col)
    });
    
    setIsAddModalOpen(false);
  };
  
  const handleEditTask = (updatedTask, newStatusColumnId) => {
    let finalTask = { ...updatedTask };
    
    // Check if status changed
    const currentColumn = data.columns.find(col => col.taskIds.includes(updatedTask.id));
    const statusChanged = currentColumn && currentColumn.id !== newStatusColumnId;
    
    if (statusChanged) {
      if (newStatusColumnId === 'column-done') {
         finalTask.completedDate = getTodayString();
      } else {
         delete finalTask.completedDate;
      }
    }
    
    const newTasks = { ...data.tasks, [finalTask.id]: finalTask };
    let newColumns = [...data.columns];
    
    if (statusChanged) {
      // Remove from old column
      const oldColIndex = newColumns.findIndex(c => c.id === currentColumn.id);
      const newTaskIds = Array.from(newColumns[oldColIndex].taskIds);
      newTaskIds.splice(newTaskIds.indexOf(finalTask.id), 1);
      newColumns[oldColIndex] = { ...newColumns[oldColIndex], taskIds: newTaskIds };
      
      // Add to new column (top)
      const newColIndex = newColumns.findIndex(c => c.id === newStatusColumnId);
      const newDestTaskIds = Array.from(newColumns[newColIndex].taskIds);
      newDestTaskIds.unshift(finalTask.id);
      newColumns[newColIndex] = { ...newColumns[newColIndex], taskIds: newDestTaskIds };
    }
    
    setData({
      ...data,
      tasks: newTasks,
      columns: newColumns
    });
    
    setEditingTask(null);
    setEditingTaskColumn(null);
  };

  const handleDeleteTask = (taskId) => {
    if (!data.tasks[taskId]) return;
    
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];
    
    const newColumns = data.columns.map(col => ({
      ...col,
      taskIds: col.taskIds.filter(id => id !== taskId)
    }));
    
    setData({
      ...data,
      tasks: newTasks,
      columns: newColumns
    });
    
    setEditingTask(null);
    setEditingTaskColumn(null);
  };

  const openEditModal = (task, columnId) => {
    setEditingTask(task);
    setEditingTaskColumn(columnId);
  };

  // Derive unique projects and assignees for dropdowns
  const uniqueProjects = useMemo(() => {
    const projects = Object.values(data.tasks).map(t => t.project).filter(Boolean);
    return Array.from(new Set(projects));
  }, [data.tasks]);

  const uniqueAssignees = useMemo(() => {
    const assigneesSet = new Set();
    Object.values(data.tasks).forEach(t => {
      if (t.assignee) {
        t.assignee.split(',').forEach(a => {
          const trimmed = a.trim();
          if (trimmed) assigneesSet.add(trimmed);
        });
      }
    });
    return Array.from(assigneesSet);
  }, [data.tasks]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-top">
          <div className="title-and-add">
            <div className="header-title">
              <LayoutDashboard size={28} />
              <h1>Weekly Todo List</h1>
            </div>
            <button className="add-btn mobile-add-btn" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} />
              New Task
            </button>
          </div>
          
          <div className="header-actions">
            <button className="icon-btn" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button className="icon-btn mobile-filter-btn" onClick={() => setShowFilters(!showFilters)} title="Toggle Filters">
              <Filter size={18} />
            </button>

            <div className="week-selector">
              <button className="icon-btn" onClick={() => handleWeekChange(-1)}><ChevronLeft size={18}/></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                <CalendarDays size={16} />
                <span className="week-text">{getWeekString()}</span>
              </div>
              <button className="icon-btn" onClick={() => handleWeekChange(1)}><ChevronRight size={18}/></button>
            </div>
            
            <button className="add-btn desktop-add-btn" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} />
              New Task
            </button>
          </div>
        </div>

        <div className={`filters-container ${showFilters ? 'show' : ''}`}>
          <div className="filter-group">
            <div className="filter-label">โครงการ</div>
            <div className="filter-row">
              <button 
                className={`filter-pill ${filterProject === '' ? 'active' : ''}`}
                onClick={() => setFilterProject('')}
              >ทั้งหมด</button>
              {uniqueProjects.map(proj => {
                const projColor = getProjectColor(proj);
                const isActive = filterProject === proj;
                return (
                  <button 
                    key={proj}
                    className={`filter-pill ${isActive ? 'active' : ''}`}
                    style={{
                      borderColor: isActive ? projColor : projColor,
                      backgroundColor: isActive ? projColor : 'transparent',
                      color: isActive ? 'white' : projColor,
                      opacity: isActive ? 1 : 0.8
                    }}
                    onClick={() => setFilterProject(proj)}
                  >{proj}</button>
                )
              })}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">ผู้รับผิดชอบ</div>
            <div className="filter-row">
              <button 
                className={`filter-pill ${filterAssignee === '' ? 'active' : ''}`}
                onClick={() => setFilterAssignee('')}
              >ทั้งหมด</button>
              {uniqueAssignees.map(assignee => (
                <button 
                  key={assignee}
                  className={`filter-pill ${filterAssignee === assignee ? 'active' : ''}`}
                  onClick={() => setFilterAssignee(assignee)}
                >{assignee}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <KanbanBoard 
        data={data} 
        setData={setData} 
        filterProject={filterProject} 
        filterAssignee={filterAssignee} 
        weekOffset={weekOffset}
        onEditClick={openEditModal}
        onDragEnd={onDragEnd}
        onMoveRight={(task, currentColumnId) => {
          const currentIndex = data.columnOrder.indexOf(currentColumnId);
          if (currentIndex < data.columnOrder.length - 1) {
            handleEditTask(task, data.columnOrder[currentIndex + 1]);
          }
        }}
      />

      {isAddModalOpen && (
        <AddTaskForm 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddTask} 
          existingProjects={uniqueProjects}
          existingAssignees={uniqueAssignees}
        />
      )}

      {editingTask && (
        <EditTaskForm 
          task={editingTask}
          columns={data.columns}
          currentColumnId={editingTaskColumn}
          onClose={() => setEditingTask(null)}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
          existingProjects={uniqueProjects}
          existingAssignees={uniqueAssignees}
        />
      )}
    </div>
  );
}

export default App;
