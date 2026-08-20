import React, { createContext, useState, useContext, useEffect } from 'react';

const translations = {
  th: {
    title: 'ตารางงานประจำสัปดาห์',
    newTask: 'เพิ่มงานใหม่',
    thisWeek: 'สัปดาห์นี้',
    lastWeek: 'สัปดาห์ที่แล้ว',
    nextWeek: 'สัปดาห์หน้า',
    project: 'โครงการ',
    allProjects: 'ทั้งหมด',
    assignee: 'ผู้รับผิดชอบ',
    allAssignees: 'ทุกคน',
    todo: 'งานที่ต้องทำ',
    inProgress: 'กำลังดำเนินการ',
    done: 'เสร็จสิ้น',
    move: 'ย้าย',
    unassigned: 'ไม่ระบุ',
    'To Do': 'งานที่ต้องทำ',
    'In Progress': 'กำลังดำเนินการ',
    'Done': 'เสร็จสิ้น',
    'IN PROGRESS TODAY': 'กำลังดำเนินการวันนี้',
    'In Progress Today': 'กำลังดำเนินการวันนี้',
    addTaskTitle: 'เพิ่มงานใหม่',
    editTaskTitle: 'แก้ไขงาน',
    taskDesc: 'รายละเอียดงาน *',
    dueDate: 'กำหนดส่ง',
    cancel: 'ยกเลิก',
    addBtn: 'เพิ่มงาน',
    saveBtn: 'บันทึก',
    deleteBtn: 'ลบงาน',
    confirmDelete: 'คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?',
    overdue: 'เลยกำหนด',
    dueToday: 'ครบกำหนดวันนี้',
    dueSoon: 'ใกล้ถึงกำหนด',
    dbError: 'ข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ',
    fallbackMsg: 'สลับไปใช้ข้อมูลจำลองชั่วคราว',
    // ... add more as needed
  },
  en: {
    title: 'Weekly Todo List',
    newTask: 'New Task',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    nextWeek: 'Next Week',
    project: 'Project',
    allProjects: 'All',
    assignee: 'Assignee',
    allAssignees: 'All',
    todo: 'To Do',
    inProgress: 'In Progress',
    done: 'Done',
    move: 'Move',
    unassigned: 'Unassigned',
    'To Do': 'To Do',
    'In Progress': 'In Progress',
    'Done': 'Done',
    'IN PROGRESS TODAY': 'IN PROGRESS TODAY',
    'In Progress Today': 'In Progress Today',
    addTaskTitle: 'Add New Task',
    editTaskTitle: 'Edit Task',
    taskDesc: 'Task Description *',
    dueDate: 'Due Date',
    cancel: 'Cancel',
    addBtn: 'Add Task',
    saveBtn: 'Save',
    deleteBtn: 'Delete',
    confirmDelete: 'Are you sure you want to delete this task?',
    overdue: 'Overdue',
    dueToday: 'Due Today',
    dueSoon: 'Due Soon',
    dbError: 'Database Connection Error: ',
    fallbackMsg: 'Falling back to sample data.',
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('th'); // Default to Thai

  // Persist language preference
  useEffect(() => {
    const saved = localStorage.getItem('weeklyTodoLang');
    if (saved && (saved === 'th' || saved === 'en')) {
      setLang(saved);
    }
  }, []);

  const toggleLang = () => {
    const nextLang = lang === 'th' ? 'en' : 'th';
    setLang(nextLang);
    localStorage.setItem('weeklyTodoLang', nextLang);
  };

  const t = (key) => {
    return translations[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
