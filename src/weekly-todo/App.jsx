import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const sanitizeBoardData = (rawState) => {
  if (!rawState || typeof rawState !== 'object') return initialData;
  
  const tasks = (rawState.tasks && typeof rawState.tasks === 'object') ? rawState.tasks : initialData.tasks;
  const columns = (Array.isArray(rawState.columns) && rawState.columns.length > 0) ? rawState.columns : initialData.columns;
  const columnOrder = (Array.isArray(rawState.columnOrder) && rawState.columnOrder.length > 0) ? rawState.columnOrder : initialData.columnOrder;
  
  const sanitizedColumns = columns.map(col => ({
    ...col,
    taskIds: Array.isArray(col.taskIds) ? col.taskIds : []
  }));

  return {
    tasks,
    columns: sanitizedColumns,
    columnOrder
  };
};

function App() {
  const [data, setData] = useState(() => sanitizeBoardData(initialData));
  const [fetchError, setFetchError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasFetchedRef = useRef(false);

  // Fetch initial data from Supabase with retry
  useEffect(() => {
    let isMounted = true;
    
    const fetchBoard = async (retries = 3) => {
      try {
        const { data: boardRows, error } = await supabase
          .from('boards')
          .select('state')
          .eq('id', 'main');
        
        if (error) {
          console.error('Error fetching board:', error);
          if (retries > 0 && isMounted) {
            setTimeout(() => fetchBoard(retries - 1), 1000);
            return;
          }
          if (isMounted) setFetchError(error.message || 'Unknown fetch error');
        } else if (boardRows && boardRows.length > 0 && boardRows[0].state) {
          if (isMounted) {
            setData(sanitizeBoardData(boardRows[0].state));
            setFetchError(null);
          }
        } else {
           if (isMounted) setFetchError('No data found in Supabase');
        }
      } catch (err) {
        console.error('Unexpected error fetching board:', err);
        if (retries > 0 && isMounted) {
          setTimeout(() => fetchBoard(retries - 1), 1000);
          return;
        }
        if (isMounted) setFetchError(err.message || 'Unexpected fetch error');
      } finally {
        if (isMounted) {
          hasFetchedRef.current = true;
          setIsLoaded(true);
        }
      }
    };
    
    fetchBoard();
    return () => { isMounted = false; };
  }, []);

  // Save data to Supabase whenever it changes (after initial load and fetch)
  useEffect(() => {
    if (!isLoaded || !hasFetchedRef.current) return;
    
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
  
  // Default to weekOffset = -1 (20-26 Jul week) so all user tasks are immediately visible
  const [weekOffset, setWeekOffset] = useState(-1);

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

  const getWeekRange = (offset = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday + (offset * 7));
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    
    return { monday, sunday };
  };

  const formatShortDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const getWeekString = () => {
    const { monday, sunday } = getWeekRange(weekOffset);
    const startStr = formatShortDate(monday);
    const endStr = formatShortDate(sunday);
    
    if (weekOffset === 0) return `This Week (${startStr} - ${endStr})`;
    if (weekOffset === -1) return `Last Week (${startStr} - ${endStr})`;
    if (weekOffset === 1) return `Next Week (${startStr} - ${endStr})`;
    return `${startStr} - ${endStr}`;
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination || !data || !data.columns) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const startColumn = data.columns.find(col => col.id === source.droppableId);
    const finishColumn = data.columns.find(col => col.id === destination.droppableId);

    if (!startColumn || !finishColumn) return;

    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds || []);
      
      const isFiltered = filterProject.trim() !== '' || filterAssignee.trim() !== '';
      if (isFiltered || weekOffset !== 0) {
         // Fallback relative ordering for filtered views
         const idx = newTaskIds.indexOf(draggableId);
         if (idx !== -1) newTaskIds.splice(idx, 1);
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

    const startTaskIds = Array.from(startColumn.taskIds || []);
    const idx = startTaskIds.indexOf(draggableId);
    if (idx !== -1) startTaskIds.splice(idx, 1);
    const newStart = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds || []);
    
    const isFiltered = filterProject.trim() !== '' || filterAssignee.trim() !== '' || weekOffset !== 0;
    if (isFiltered) {
       finishTaskIds.push(draggableId);
    } else {
       finishTaskIds.splice(destination.index, 0, draggableId);
    }
    
    const newFinish = { ...finishColumn, taskIds: finishTaskIds };

    // Auto set completedDate if moving to Done
    let updatedTasks = { ...(data.tasks || {}) };
    if (updatedTasks[draggableId]) {
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
    const todoColumnId = (data.columnOrder && data.columnOrder[0]) || 'column-todo';
    const newTaskWithId = { ...newTask, id: `task-${Date.now()}` };
    
    const newTasks = { ...(data.tasks || {}), [newTaskWithId.id]: newTaskWithId };
    const columns = data.columns || initialData.columns;
    const column = columns.find(col => col.id === todoColumnId) || columns[0];
    const newTaskIds = Array.from(column.taskIds || []);
    newTaskIds.unshift(newTaskWithId.id); // Add to top
    
    const newColumn = { ...column, taskIds: newTaskIds };
    
    setData({
      ...data,
      tasks: newTasks,
      columns: columns.map(col => col.id === newColumn.id ? newColumn : col)
    });
    
    setIsAddModalOpen(false);
  };
  
  const handleEditTask = (updatedTask, newStatusColumnId) => {
    if (!updatedTask || !updatedTask.id) {
      setEditingTask(null);
      setEditingTaskColumn(null);
      return;
    }

    let finalTask = { ...updatedTask };
    const columns = data.columns || initialData.columns;
    
    // Check if status changed
    const currentColumn = columns.find(col => (col.taskIds || []).includes(updatedTask.id));
    const statusChanged = currentColumn && currentColumn.id !== newStatusColumnId;
    
    if (statusChanged) {
      if (newStatusColumnId === 'column-done') {
         finalTask.completedDate = getTodayString();
      } else {
         delete finalTask.completedDate;
      }
    }
    
    const newTasks = { ...(data.tasks || {}), [finalTask.id]: finalTask };
    let newColumns = [...columns];
    
    if (statusChanged && currentColumn) {
      // Remove from old column
      const oldColIndex = newColumns.findIndex(c => c.id === currentColumn.id);
      if (oldColIndex !== -1) {
        const newTaskIds = Array.from(newColumns[oldColIndex].taskIds || []);
        const idx = newTaskIds.indexOf(finalTask.id);
        if (idx !== -1) newTaskIds.splice(idx, 1);
        newColumns[oldColIndex] = { ...newColumns[oldColIndex], taskIds: newTaskIds };
      }
      
      // Add to new column (top)
      const newColIndex = newColumns.findIndex(c => c.id === newStatusColumnId);
      if (newColIndex !== -1) {
        const newDestTaskIds = Array.from(newColumns[newColIndex].taskIds || []);
        newDestTaskIds.unshift(finalTask.id);
        newColumns[newColIndex] = { ...newColumns[newColIndex], taskIds: newDestTaskIds };
      }
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
    if (!data || !data.tasks || !data.tasks[taskId]) return;
    
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];
    
    const newColumns = (data.columns || []).map(col => ({
      ...col,
      taskIds: (col.taskIds || []).filter(id => id !== taskId)
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
    if (!data || !data.tasks) return [];
    const projects = Object.values(data.tasks)
      .filter(Boolean)
      .map(t => t.project)
      .filter(Boolean);
    return Array.from(new Set(projects));
  }, [data]);

  const uniqueAssignees = useMemo(() => {
    if (!data || !data.tasks) return [];
    const assigneesSet = new Set();
    Object.values(data.tasks).forEach(t => {
      if (t && t.assignee) {
        t.assignee.split(',').forEach(a => {
          const trimmed = a.trim();
          if (trimmed) assigneesSet.add(trimmed);
        });
      }
    });
    return Array.from(assigneesSet);
  }, [data]);

  return (
    <div className="app-container">
      {fetchError && (
        <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '1rem', textAlign: 'center', fontWeight: 'bold' }}>
          Database Connection Error: {fetchError}. Falling back to sample data.
        </div>
      )}
      <header className="app-header">
        <div className="header-top">
          <div className="title-and-add">
            <div className="header-title">
              <LayoutDashboard size={28} />
              <h1>Weekly Todo List</h1>
            </div>
            <button type="button" className="add-btn mobile-add-btn" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={18} />
              New Task
            </button>
          </div>
          
          <div className="header-actions">
            <button type="button" className="icon-btn" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button type="button" className="icon-btn mobile-filter-btn" onClick={() => setShowFilters(!showFilters)} title="Toggle Filters">
              <Filter size={18} />
            </button>

            <div className="week-selector">
              <button type="button" className="icon-btn" onClick={() => handleWeekChange(-1)}><ChevronLeft size={18}/></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                <CalendarDays size={16} />
                <span className="week-text">{getWeekString()}</span>
              </div>
              <button type="button" className="icon-btn" onClick={() => handleWeekChange(1)}><ChevronRight size={18}/></button>
            </div>
            
            <button type="button" className="add-btn desktop-add-btn" onClick={() => setIsAddModalOpen(true)}>
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
