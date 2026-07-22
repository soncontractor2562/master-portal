import React, { useState } from 'react';
import { X } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, format } from "date-fns";

const EditTaskForm = ({ task, columns, currentColumnId, onClose, onSave, onDelete, existingProjects = [], existingAssignees = [] }) => {
  let initialDateObj = null;
  if (task.dueDate) {
     try {
       initialDateObj = parse(task.dueDate, "dd/MM/yyyy", new Date());
     } catch (e) {}
  }
  const [selectedDate, setSelectedDate] = useState(initialDateObj);

  const [formData, setFormData] = useState({
    id: task.id,
    project: task.project,
    taskName: task.taskName,
    assignee: task.assignee || ''
  });
  
  const [status, setStatus] = useState(currentColumnId);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.taskName.trim()) return;
    
    let formattedDate = '';
    if (selectedDate) {
       formattedDate = format(selectedDate, "dd/MM/yyyy");
    }
    
    onSave({ ...formData, dueDate: formattedDate }, status);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Task</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Status (Column)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {columns.map(col => {
                const isActive = status === col.id;
                let color = '#6366f1'; // Default Indigo
                if (col.id === 'column-in-progress') color = '#f59e0b'; // Amber
                if (col.id === 'column-done') color = '#10b981'; // Green
                
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setStatus(col.id)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: `1px solid ${isActive ? color : 'var(--border-glass)'}`,
                      backgroundColor: isActive ? color : 'transparent',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                      fontWeight: isActive ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      fontSize: '0.85rem'
                    }}
                  >
                    {col.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Project Name</label>
            <input 
              type="text" 
              name="project"
              value={formData.project}
              onChange={handleChange}
              placeholder="e.g. Retail เอกมัย" 
              autoComplete="off"
            />
            {existingProjects.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                {existingProjects.map(p => (
                  <button 
                    key={p} 
                    type="button" 
                    className="filter-pill" 
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => setFormData(prev => ({ ...prev, project: p }))}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label>Task Description *</label>
            <input 
              type="text" 
              name="taskName"
              value={formData.taskName}
              onChange={handleChange}
              placeholder="e.g. สรุปงานสี" 
              autoComplete="new-password"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Assignee</label>
            <input 
              type="text" 
              name="assignee"
              value={formData.assignee}
              onChange={handleChange}
              placeholder="e.g. โฟน" 
              autoComplete="off"
            />
            {existingAssignees.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                {existingAssignees.map(a => (
                  <button 
                    key={a} 
                    type="button" 
                    className="filter-pill" 
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    onClick={() => {
                      setFormData(prev => {
                        const current = prev.assignee ? prev.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (!current.includes(a)) current.push(a);
                        return { ...prev, assignee: current.join(', ') };
                      });
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group date-picker-group">
            <label>Due Date</label>
            <DatePicker 
              selected={selectedDate} 
              onChange={(date) => setSelectedDate(date)} 
              dateFormat={["dd/MM/yyyy", "ddMMyyyy"]}
              placeholderText="e.g. 18/07/2026"
            />
          </div>
          
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => {
                if(window.confirm('คุณต้องการลบงานนี้ใช่หรือไม่?')) {
                  onDelete(task.id);
                }
              }}
            >
              Delete Task
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskForm;
