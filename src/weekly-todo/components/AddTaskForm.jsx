import React, { useState } from 'react';
import { X } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

const AddTaskForm = ({ onClose, onAdd, existingProjects = [], existingAssignees = [] }) => {
  const [formData, setFormData] = useState({
    project: '',
    taskName: '',
    assignee: ''
  });
  const [selectedDate, setSelectedDate] = useState(null);

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
    
    onAdd({ ...formData, dueDate: formattedDate });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Task</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
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
          
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskForm;
