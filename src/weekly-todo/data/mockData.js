import { v4 as uuidv4 } from 'uuid';

export const initialColumns = [
  { id: 'column-todo', title: 'To Do', taskIds: ['task-1', 'task-2', 'task-3', 'task-4'] },
  { id: 'column-in-progress', title: 'In Progress Today', taskIds: [] },
  { id: 'column-done', title: 'Done', taskIds: [] },
];

export const initialTasks = {
  'task-1': { id: 'task-1', project: 'Retail เอกมัย', taskName: 'สรุปงานสี', assignee: 'โฟน', dueDate: '21/7/2026' },
  'task-2': { id: 'task-2', project: 'VPK', taskName: 'สรุปงานรางน้ำ', assignee: 'โฟน', dueDate: '20/7/2026' },
  'task-3': { id: 'task-3', project: 'กบินทร์บุรี', taskName: 'สรุปงานสี', assignee: 'ใบตอง', dueDate: '20/7/2026' },
  'task-4': { id: 'task-4', project: 'VPK', taskName: 'สั่งซื้อเหล็ก', assignee: 'โจ๋น', dueDate: '20/7/2026' },
};

export const initialData = {
  tasks: initialTasks,
  columns: initialColumns,
  columnOrder: ['column-todo', 'column-in-progress', 'column-done']
};
