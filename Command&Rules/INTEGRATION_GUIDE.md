# 🔌 คู่มือขั้นตอนการประกอบร่างโปรแกรมย่อย (Master Portal Integration Guide)
> **สำหรับ AI ผู้จัดการระบบ หรือผู้พัฒนาที่ทำหน้าที่นำโปรแกรมย่อยมาเชื่อมต่อเข้า Master Portal**

---

## 🛠️ ขั้นตอนการประกอบร่างมาตรฐาน 6 ขั้นตอน

เมื่อได้รับโปรแกรมย่อยใหม่อยู่ในโฟลเดอร์ `src/<app-id>/` ให้ดำเนินการตามขั้นตอนต่อไปนี้:

### ขั้นตอนที่ 1: ติดตั้ง Dependencies (ถ้ามี)
```bash
npm install <package-names>
```

---

### ขั้นตอนที่ 2: สร้างไฟล์ View Wrapper
สร้างไฟล์ที่ `src/components/<AppIdPascalCase>View.jsx` เช่น `src/components/MaterialRequestView.jsx`:

```jsx
import React from 'react';
import App from '../<app-id>/App.jsx';
import '../<app-id>/index.css';

export default function <AppIdPascalCase>View() {
  return (
    <div className="<app-id>-root" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '0.75rem 1rem', background: '#f8fafc', color: '#0f172a' }}>
      <App />
    </div>
  );
}
```

---

### ขั้นตอนที่ 3: เชื่อมต่อใน `src/App.jsx`
1. เพิ่ม `React.lazy` โหลด View Wrapper:
   ```jsx
   const <AppIdPascalCase>View = lazy(() => import('./components/<AppIdPascalCase>View.jsx'));
   ```
2. เพิ่ม `<app-id>` ในอาเรย์ `VALID_MODULES`:
   ```jsx
   const VALID_MODULES = ['todo', 'store', 'prpo', 'docgen', '<app-id>'];
   ```
3. เพิ่มการ Render ภายใต้ `<Suspense>` ใน Desktop Layout:
   ```jsx
   {activeTab === '<app-id>' && <<AppIdPascalCase>View />}
   ```

---

### ขั้นตอนที่ 4: เพิ่มเมนูใน `src/components/Sidebar.jsx` (Desktop)
เพิ่ม Object เมนูใหม่ในอาเรย์ `navItems`:
```jsx
{
  id: '<app-id>',
  label: '<ชื่อภาษาอังกฤษ>',
  icon: <LucideIconComponent>,
  desc: '<คำอธิบายภาษาไทย>',
  color: 'text-amber-400',
  activeBg: 'from-amber-600/30 to-orange-600/20 border-amber-500/40',
  activeIcon: 'bg-amber-500',
},
```

---

### ขั้นตอนที่ 5: เพิ่มการ์ดใน `src/components/HomeScreen.jsx` & `src/components/ModuleScreen.jsx` (Mobile)
1. ใน `src/components/HomeScreen.jsx`: เพิ่ม Object ในอาเรย์ `modules`:
   ```jsx
   {
     id: '<app-id>',
     label: '<ชื่อภาษาอังกฤษ>',
     desc: '<คำอธิบายภาษาไทย>',
     icon: <LucideIconComponent>,
     gradient: 'from-amber-600/25 to-orange-600/15',
     border: 'border-amber-500/30',
     iconBg: 'bg-amber-500/20',
     iconColor: 'text-amber-400',
     glow: 'shadow-amber-500/10',
     emoji: '📦',
   },
   ```
2. ใน `src/components/ModuleScreen.jsx`:
   - เพิ่ม `lazy` import View Wrapper
   - เพิ่มชื่อใน `MODULE_LABELS`:
     ```jsx
     '<app-id>': '<ชื่อภาษาอังกฤษ>',
     ```
   - เพิ่มการ Render ในส่วน Module Content:
     ```jsx
     {moduleId === '<app-id>' && <<AppIdPascalCase>View />}
     ```

---

### ขั้นตอนที่ 6: ทดสอบ Build และ Deploy
```bash
npm run build
git add .
git commit -m "feat(<app-id>): integrate <app-id> sub-app"
git push origin main
```
