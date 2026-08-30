# 📜 กฎเหล็กและมาตรฐานการพัฒนาโปรแกรมย่อย (Sub-App Development Rules)
> **สำหรับ Master Portal: SON CONTRACTOR**  
> เอกสารนี้ใช้เป็นคู่มือและ System Prompt สำหรับส่งให้ AI หรือทีมนักพัฒนาสร้างโปรแกรมย่อยตัวใหม่ เพื่อรับประกันว่าโปรแกรมจะทำงานได้ 100% โดย **ไม่ส่งผลกระทบหรือทำให้โปรแกรมอื่นและระบบหลักเสียหาย (Strict Isolation)**

---

## 🏛️ 1. โครงสร้างโฟลเดอร์และตำแหน่งจัดเก็บ (Folder Structure)

โปรแกรมย่อยใหม่ทั้งหมดต้องถูกจัดเก็บไว้ในตำแหน่งที่กำหนดอย่างเป็นระเบียบ:

### รูปแบบมาตรฐาน: React Sub-App (แนะนำสำหรับโปรแกรมใหม่ทุกตัว)
สร้างโฟลเดอร์ไว้ที่ `src/<app-id>/` เช่น `src/material-request/`:

```text
src/<app-id>/
├── App.jsx                 # Component หลักของโปรแกรมย่อย
├── index.css               # สไตล์ CSS ที่ครอบ Scoping คลาสแล้ว 100%
├── components/             # คอมโพเนนต์ย่อยภายในแอพ
│   ├── TableView.jsx
│   └── ModalForm.jsx
├── services/               # ระบบเชื่อมต่อ Backend / Supabase
│   └── supabaseService.js
├── utils/                  # ฟังก์ชันตัวช่วย (เช่น Export PDF, Format Date)
└── assets/                 # รูปภาพ/ไอคอนเฉพาะของแอพนี้
```

---

## 🛡️ 2. กฎเหล็กป้องกันแอพตีกัน (Strict Isolation Guidelines)

### 🔴 กฎข้อที่ 1: ห้าม CSS รั่วไหลเด็ดขาด (Strict CSS Scoping)
* ❌ **สิ่งต้องห้าม:** ห้ามเขียน Selector กว้างๆ โดดเดี่ยวลงใน `index.css` เช่น:
  ```css
  /* ❌ ห้ามทำเด็ดขาด - จะทำให้ระบบหลักและโปรแกรมอื่นพัง */
  body { background: #fff; }
  h1 { font-size: 24px; color: red; }
  button { border-radius: 8px; }
  input { padding: 10px; }
  table { width: 100%; }
  * { box-sizing: border-box; }
  ```
* ✅ **สิ่งที่ถูกต้อง:** สไตล์ทุกตัวต้องอยู่ภายใต้ Root Class ของแอพเสมอ หรือใช้ Tailwind CSS:
  ```css
  /* ✅ ถูกต้อง - สไตล์มีผลเฉพาะภายในโปรแกรมของตัวเอง */
  .<app-id>-root {
    width: 100%;
    min-height: 100%;
  }
  .<app-id>-root h1 {
    font-size: 24px;
  }
  .<app-id>-root .btn-action {
    background-color: #3b82f6;
  }
  ```

---

### 🔴 กฎข้อที่ 2: การตั้งชื่อ Table ในฐานข้อมูล (Supabase Database Conventions)
* ทุกโปรแกรมต้องใช้ตารางฐานข้อมูลที่ขึ้นต้นด้วย `<app-id>_` เสมอ เพื่อป้องกันชื่อตารางชนกัน
  * **ตัวอย่าง:**
    * ✅ `docgen_projects`, `docgen_documents`
    * ✅ `store_materials`, `store_transactions`
    * ❌ `projects`, `documents` (ห้ามใช้ชื่อสั้นที่ไม่มี prefix)
* **ต้องเตรียมไฟล์ SQL:** สร้างไฟล์ `setup_<app-id>.sql` ไว้ที่ระดับ Root ของโปรเจกต์ โดยใช้คำสั่ง `CREATE TABLE IF NOT EXISTS` พร้อมข้อมูลเริ่มต้น (Default Insert)

---

### 🔴 กฎข้อที่ 3: กุญแจจัดเก็บข้อมูล (LocalStorage & Cache Prefixing)
* หากมีการบันทึกแคช หรือการตั้งค่าลงในเบราว์เซอร์ (`localStorage` / `sessionStorage`) **ต้องมี Prefix เสมอ**:
  * ❌ `localStorage.setItem('theme', 'dark');`
  * ❌ `localStorage.setItem('cached_data', ...);`
  * ✅ `localStorage.setItem('<app-id>_theme', 'dark');`
  * ✅ `localStorage.setItem('<app-id>_cached_form', ...);`

---

### 🔴 กฎข้อที่ 4: การจัดการโหมดมืด/สว่าง (Self-Contained Theme)
* ตัวโปรแกรมย่อยต้องจัดการ Background และ Color ภายใน Wrapper ของตัวเอง
* ห้ามใส่ Event ไปเปลี่ยน Class หรือ Style ที่แท็ก `<html>` หรือ `<body>` ของหน้าต่างเบราว์เซอร์หลัก

---

### 🔴 กฎข้อที่ 5: การติดตั้ง Dependencies เพิ่มเติม
* หากโปรแกรมจำเป็นต้องใช้ Library เพิ่มเติม (เช่น `jspdf`, `html2canvas`, `xlsx`) ให้ระบุคำสั่ง `npm install <package-name>` ไว้ในรายงานส่งมอบอย่างชัดเจน
