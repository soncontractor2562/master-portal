import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { exportToExcel } from './utils/exportExcel';
import { exportToPdf } from './utils/exportPdf';

function App() {
  const [formData, setFormData] = useState({
    projectName: 'ปรับปรุงสำนักงานศูนย์บริการรถยนต์โตโยต้า บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด',
    date: new Date().toISOString().split('T')[0],
    workDay: 'ปกติ',
    workHours: '8.00 - 17.00 น.',
    problems: '',
    reporterName: 'นางสาวกุสุมา ใจหนัก',
    reporterPosition: 'วิศวกรโครงการ',
    tasks: [{ description: '', amount: '', unit: '', remark: '' }],
    manpower: [{ position: '', amount: '' }],
    machinery: [{ item: '', amount: '' }],
    materials: [{ item: '', amount: '' }],
    photos: []
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleListChange = (listName, index, field, value) => {
    setFormData(prev => {
      const newList = [...prev[listName]];
      newList[index][field] = value;
      return { ...prev, [listName]: newList };
    });
  };

  const addListItem = (listName, defaultItem) => {
    setFormData(prev => ({ ...prev, [listName]: [...prev[listName], defaultItem] }));
  };

  const removeListItem = (listName, index) => {
    setFormData(prev => {
      const newList = prev[listName].filter((_, i) => i !== index);
      return { ...prev, [listName]: newList };
    });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, event.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleExportExcel = async () => {
    await exportToExcel(formData);
  };

  const handleExportPdf = async () => {
    await exportToPdf('pdf-preview', `Daily_Report_${formData.date}`);
  };

  const getDateBoxes = () => {
    if (!formData.date) return ['', '', '', '', '', ''];
    const parts = formData.date.split('-');
    if (parts.length !== 3) return ['', '', '', '', '', ''];
    const day = parts[2];
    const month = parts[1];
    const yearTh = (parseInt(parts[0]) + 543).toString().slice(-2);
    return [day[0], day[1], month[0], month[1], yearTh[0], yearTh[1]];
  };

  const dateBoxes = getDateBoxes();

  return (
    <div className="app-container">
      <header>
        <h1>Daily Report Generator</h1>
        <p>สร้างรายงานประจำวันได้ง่ายๆ พร้อมส่งออกเป็น PDF และ Excel</p>
      </header>

      <div className="glass-card">
        <h2 className="section-title">ข้อมูลทั่วไป (General Info)</h2>
        <div className="form-grid">
          <div className="form-group" style={{gridColumn: '1 / -1'}}>
            <label>โครงการ</label>
            <input type="text" value={formData.projectName} onChange={e => handleChange('projectName', e.target.value)} placeholder="ชื่อโครงการ..." />
          </div>
          <div className="form-group">
            <label>วันที่</label>
            <input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>วันทำงาน</label>
            <select value={formData.workDay} onChange={e => handleChange('workDay', e.target.value)}>
              <option value="ปกติ">ปกติ</option>
              <option value="วันหยุด">วันหยุด</option>
            </select>
          </div>
          <div className="form-group">
            <label>เวลาทำงาน</label>
            <input type="text" value={formData.workHours} onChange={e => handleChange('workHours', e.target.value)} />
          </div>
          <div className="form-group">
            <label>ผู้บันทึกรายงาน</label>
            <input type="text" value={formData.reporterName} onChange={e => handleChange('reporterName', e.target.value)} placeholder="ชื่อ - นามสกุล" />
          </div>
          <div className="form-group">
            <label>ตำแหน่ง</label>
            <input type="text" value={formData.reporterPosition} onChange={e => handleChange('reporterPosition', e.target.value)} placeholder="ตำแหน่ง" />
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="section-title">รายละเอียดงาน (Work Progress)</h2>
        <div className="dynamic-list">
          {formData.tasks.map((task, index) => (
            <div key={index} className="dynamic-list-item">
              <div className="item-fields wide">
                <input type="text" placeholder="รายการงาน" value={task.description} onChange={e => handleListChange('tasks', index, 'description', e.target.value)} />
                <input type="text" placeholder="ปริมาณ" value={task.amount} onChange={e => handleListChange('tasks', index, 'amount', e.target.value)} />
                <input type="text" placeholder="หน่วย" value={task.unit} onChange={e => handleListChange('tasks', index, 'unit', e.target.value)} />
                <input type="text" placeholder="หมายเหตุ" value={task.remark} onChange={e => handleListChange('tasks', index, 'remark', e.target.value)} />
              </div>
              <button className="btn-danger" onClick={() => removeListItem('tasks', index)}><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        <div className="add-btn-container">
          <button className="btn btn-secondary" onClick={() => addListItem('tasks', { description: '', amount: '', unit: '', remark: '' })}>
            <Plus size={18} /> เพิ่มรายการงาน
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="section-title">บุคลากรในการทำงาน (Manpower)</h2>
        <div className="dynamic-list">
          {formData.manpower.map((person, index) => (
            <div key={index} className="dynamic-list-item">
              <div className="item-fields narrow">
                <input type="text" placeholder="ตำแหน่ง / หน้าที่" value={person.position} onChange={e => handleListChange('manpower', index, 'position', e.target.value)} />
                <input type="text" placeholder="จำนวน (คน)" value={person.amount} onChange={e => handleListChange('manpower', index, 'amount', e.target.value)} />
              </div>
              <button className="btn-danger" onClick={() => removeListItem('manpower', index)}><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
        <div className="add-btn-container">
          <button className="btn btn-secondary" onClick={() => addListItem('manpower', { position: '', amount: '' })}>
            <Plus size={18} /> เพิ่มบุคลากร
          </button>
        </div>
      </div>

      <div className="form-grid">
        <div className="glass-card">
          <h2 className="section-title">เครื่องจักร - อุปกรณ์</h2>
          <div className="dynamic-list">
            {formData.machinery.map((item, index) => (
              <div key={index} className="dynamic-list-item">
                <div className="item-fields narrow">
                  <input type="text" placeholder="รายการ" value={item.item} onChange={e => handleListChange('machinery', index, 'item', e.target.value)} />
                  <input type="text" placeholder="จำนวน" value={item.amount} onChange={e => handleListChange('machinery', index, 'amount', e.target.value)} />
                </div>
                <button className="btn-danger" onClick={() => removeListItem('machinery', index)}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <div className="add-btn-container">
            <button className="btn btn-secondary" onClick={() => addListItem('machinery', { item: '', amount: '' })}><Plus size={18} /> เพิ่มอุปกรณ์</button>
          </div>
        </div>

        <div className="glass-card">
          <h2 className="section-title">วัสดุเข้าหน่วยงาน</h2>
          <div className="dynamic-list">
            {formData.materials.map((item, index) => (
              <div key={index} className="dynamic-list-item">
                <div className="item-fields narrow">
                  <input type="text" placeholder="รายการ" value={item.item} onChange={e => handleListChange('materials', index, 'item', e.target.value)} />
                  <input type="text" placeholder="จำนวน" value={item.amount} onChange={e => handleListChange('materials', index, 'amount', e.target.value)} />
                </div>
                <button className="btn-danger" onClick={() => removeListItem('materials', index)}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <div className="add-btn-container">
            <button className="btn btn-secondary" onClick={() => addListItem('materials', { item: '', amount: '' })}><Plus size={18} /> เพิ่มวัสดุ</button>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="section-title">ปัญหาและอุปสรรค / เหตุการณ์พิเศษ</h2>
        <div className="form-group">
          <textarea rows={4} value={formData.problems} onChange={e => handleChange('problems', e.target.value)} placeholder="ระบุปัญหาที่พบระหว่างวัน..." />
        </div>
      </div>
      
      <div className="glass-card">
        <h2 className="section-title">รูปภาพการทำงาน (Work Photos)</h2>
        <div className="form-group">
          <label className="btn btn-secondary" style={{width: 'fit-content'}}>
            <ImageIcon size={18} /> อัพโหลดรูปภาพ
            <input type="file" multiple accept="image/*" style={{display: 'none'}} onChange={handlePhotoUpload} />
          </label>
        </div>
        <div className="image-upload-grid">
          {formData.photos.map((src, index) => (
            <div key={index} className="image-preview">
              <img src={src} alt="work" />
              <button onClick={() => removePhoto(index)}><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      <div className="actions-container glass-card">
        <button className="btn btn-primary" onClick={handleExportPdf}>
          <FileText size={20} /> ส่งออกเป็น PDF
        </button>
        <button className="btn btn-primary" onClick={handleExportExcel} style={{background: 'linear-gradient(to right, #10b981, #059669)'}}>
          <FileSpreadsheet size={20} /> ส่งออกเป็น Excel
        </button>
      </div>

      {/* =========================================================================
          EXACT HTML PDF PREVIEW (STRICT TABLE BASED LAYOUT TO PREVENT FLEX BUGS)
          ========================================================================= */}
      <div id="pdf-preview" className="pdf-preview">
         {/* PAGE 1 */}
         <div style={{ width: '100%', boxSizing: 'border-box' }}>
           
           {/* Header Table */}
           <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
             <tbody>
               <tr>
                 <td style={{ width: '55px', verticalAlign: 'middle' }}>
                   <img src="/logo.png" alt="logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                 </td>
                 <td style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 'bold', verticalAlign: 'middle', fontFamily: 'Sarabun, sans-serif' }}>
                   บริษัท ซัน คอนแทรคเตอร์ จำกัด
                 </td>
                 <td style={{ width: '150px', textAlign: 'right', fontSize: '16pt', fontWeight: 'bold', verticalAlign: 'middle', fontFamily: 'Sarabun, sans-serif' }}>
                   รายงานประจำวัน
                 </td>
               </tr>
             </tbody>
           </table>
           
           <div style={{ borderBottom: '3px double #000', marginBottom: '8px' }}></div>

           {/* Project Info Table */}
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', marginBottom: '6px', fontFamily: 'Sarabun, sans-serif' }}>
             <tbody>
               <tr>
                 <td style={{ width: '75px', fontWeight: 'bold', verticalAlign: 'middle' }}>โครงการ :</td>
                 <td style={{ fontWeight: 'bold', fontSize: '11pt', verticalAlign: 'middle' }}>{formData.projectName}</td>
               </tr>
             </tbody>
           </table>

           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', marginBottom: '8px', fontFamily: 'Sarabun, sans-serif' }}>
             <tbody>
               <tr>
                 <td style={{ width: '45px', fontWeight: 'bold', verticalAlign: 'middle' }}>วันที่</td>
                 <td style={{ width: '15px', fontWeight: 'bold', verticalAlign: 'middle' }}>:</td>
                 <td style={{ width: '160px', verticalAlign: 'middle' }}>
                   <div style={{ display: 'inline-flex', gap: '2px' }}>
                     <span className="pdf-box">{dateBoxes[0]}</span>
                     <span className="pdf-box">{dateBoxes[1]}</span>
                     <span className="pdf-box-gap"></span>
                     <span className="pdf-box">{dateBoxes[2]}</span>
                     <span className="pdf-box">{dateBoxes[3]}</span>
                     <span className="pdf-box-gap"></span>
                     <span className="pdf-box">{dateBoxes[4]}</span>
                     <span className="pdf-box">{dateBoxes[5]}</span>
                   </div>
                 </td>
                 <td style={{ width: '75px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>วันทำงาน :</td>
                 <td style={{ width: '120px', verticalAlign: 'middle', paddingLeft: '5px' }}>
                   <span className="pdf-checkbox">{formData.workDay === 'ปกติ' ? '✓' : ''}</span> ปกติ
                   &nbsp;&nbsp;
                   <span className="pdf-checkbox">{formData.workDay === 'วันหยุด' ? '✓' : ''}</span> วันหยุด
                 </td>
                 <td style={{ width: '85px', fontWeight: 'bold', textAlign: 'right', verticalAlign: 'middle' }}>เวลาทำงาน :</td>
                 <td style={{ width: '120px', textAlign: 'center', verticalAlign: 'middle' }}>
                   <div style={{ border: '1px solid #000', padding: '2px 8px', fontWeight: 'bold', display: 'inline-block' }}>
                     {formData.workHours}
                   </div>
                 </td>
               </tr>
             </tbody>
           </table>

           {/* Main Tasks Table */}
           <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10pt', fontFamily: 'Sarabun, sans-serif' }}>
             <thead>
               <tr style={{ backgroundColor: '#d9d9d9' }}>
                 <th rowSpan={2} style={{ width: '6%', border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>ลำดับ</th>
                 <th rowSpan={2} style={{ width: '60%', border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>รายการ</th>
                 <th colSpan={2} style={{ width: '18%', border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>ปริมาณ</th>
                 <th rowSpan={2} style={{ width: '16%', border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>หมายเหตุ</th>
               </tr>
               <tr style={{ backgroundColor: '#d9d9d9' }}>
                 <th style={{ width: '9%', border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>จำนวน</th>
                 <th style={{ width: '9%', border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>หน่วย</th>
               </tr>
             </thead>
             <tbody>
               {Array.from({ length: 13 }).map((_, i) => {
                 const task = formData.tasks[i] || { description: '', amount: '', unit: '', remark: '' };
                 return (
                   <tr key={i} style={{ height: '22px' }}>
                     <td style={{ border: '1px solid #000', textAlign: 'center' }}>{i < formData.tasks.length ? i + 1 : ''}</td>
                     <td style={{ border: '1px solid #000', textAlign: 'left', paddingLeft: '6px' }}>{task.description}</td>
                     <td style={{ border: '1px solid #000', textAlign: 'center' }}>{task.amount}</td>
                     <td style={{ border: '1px solid #000', textAlign: 'center' }}>{task.unit}</td>
                     <td style={{ border: '1px solid #000', textAlign: 'center' }}>{task.remark}</td>
                   </tr>
                 );
               })}
             </tbody>
           </table>

           {/* Problems & Weather Table */}
           <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', border: '1px solid #000', fontSize: '10pt', fontFamily: 'Sarabun, sans-serif' }}>
             <tbody>
               <tr>
                 <td style={{ width: '70%', verticalAlign: 'top', borderRight: '1px solid #000', padding: 0 }}>
                   <div style={{ backgroundColor: '#d9d9d9', borderBottom: '1px solid #000', padding: '4px 8px', fontWeight: 'bold', fontSize: '10pt' }}>
                     ปัญหาและอุปสรรค์ / เหตุการณ์พิเศษ
                   </div>
                   <div style={{ padding: '8px', height: '110px', whiteSpace: 'pre-wrap' }}>
                     {formData.problems}
                   </div>
                 </td>
                 <td style={{ width: '30%', verticalAlign: 'middle', textAlign: 'center', padding: '6px', backgroundColor: '#fff' }}>
                   <div style={{ fontSize: '8pt', lineHeight: 1.2 }}>
                     <svg width="85" height="85" viewBox="0 0 100 100">
                       <circle cx="50" cy="50" r="45" fill="#4ade80" stroke="#000" strokeWidth="1" />
                       <text x="50" y="14" fontSize="10" textAnchor="middle" fontWeight="bold">12</text>
                       <text x="86" y="53" fontSize="10" textAnchor="middle" fontWeight="bold">3</text>
                       <text x="50" y="92" fontSize="10" textAnchor="middle" fontWeight="bold">6</text>
                       <text x="14" y="53" fontSize="10" textAnchor="middle" fontWeight="bold">9</text>
                       <line x1="50" y1="5" x2="50" y2="95" stroke="#000" strokeWidth="0.8" />
                       <line x1="5" y1="50" x2="95" y2="50" stroke="#000" strokeWidth="0.8" />
                       <line x1="18" y1="18" x2="82" y2="82" stroke="#000" strokeWidth="0.8" />
                       <line x1="82" y1="18" x2="18" y2="82" stroke="#000" strokeWidth="0.8" />
                     </svg>
                     <div style={{ textAlign: 'left', marginTop: '4px', fontSize: '8pt' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                         <span style={{ display: 'inline-block', width: '12px', height: '8px', background: '#4ade80', border: '1px solid #000' }}></span> แจ่มใส
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                         <span style={{ display: 'inline-block', width: '12px', height: '8px', background: '#fde047', border: '1px solid #000' }}></span> ฝนตกเล็กน้อย ทำงานได้
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                         <span style={{ display: 'inline-block', width: '12px', height: '8px', background: '#1e3a8a', border: '1px solid #000' }}></span> ฝนตกปานกลาง ทำงานได้เฉพาะ...
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                         <span style={{ display: 'inline-block', width: '12px', height: '8px', background: '#dc2626', border: '1px solid #000' }}></span> ฝนตกหนัก ทำงานไม่ได้
                       </div>
                     </div>
                   </div>
                 </td>
               </tr>
             </tbody>
           </table>

           {/* Bottom 3 Side-by-Side Tables */}
           <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '9.5pt', fontFamily: 'Sarabun, sans-serif' }}>
             <tbody>
               <tr>
                 {/* Table 1: Manpower */}
                 <td style={{ width: '32%', verticalAlign: 'top', padding: 0 }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                     <thead>
                       <tr style={{ backgroundColor: '#d9d9d9' }}>
                         <th colSpan={2} style={{ borderBottom: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>บุคลากรในการทำงาน</th>
                       </tr>
                       <tr style={{ backgroundColor: '#d9d9d9' }}>
                         <th style={{ width: '70%', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>ตำแหน่ง</th>
                         <th style={{ width: '30%', borderBottom: '1px solid #000', padding: '3px' }}>จำนวน</th>
                       </tr>
                     </thead>
                     <tbody>
                       {Array.from({ length: 14 }).map((_, i) => {
                         const m = formData.manpower[i] || { position: '', amount: '' };
                         return (
                           <tr key={i} style={{ height: '18px' }}>
                             <td style={{ borderBottom: i === 13 ? 'none' : '1px solid #ccc', borderRight: '1px solid #000', paddingLeft: '4px', textAlign: 'left' }}>{m.position}</td>
                             <td style={{ borderBottom: i === 13 ? 'none' : '1px solid #ccc', textAlign: 'center' }}>{m.amount}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </td>

                 {/* Divider 1 */}
                 <td style={{ width: '2%', backgroundColor: '#737373', borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>

                 {/* Table 2: Machinery */}
                 <td style={{ width: '32%', verticalAlign: 'top', padding: 0 }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                     <thead>
                       <tr style={{ backgroundColor: '#d9d9d9' }}>
                         <th colSpan={2} style={{ borderBottom: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>เครื่องจักร - อุปกรณ์</th>
                       </tr>
                       <tr style={{ backgroundColor: '#d9d9d9' }}>
                         <th style={{ width: '70%', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>รายการ</th>
                         <th style={{ width: '30%', borderBottom: '1px solid #000', padding: '3px' }}>จำนวน</th>
                       </tr>
                     </thead>
                     <tbody>
                       {Array.from({ length: 14 }).map((_, i) => {
                         const m = formData.machinery[i] || { item: '', amount: '' };
                         return (
                           <tr key={i} style={{ height: '18px' }}>
                             <td style={{ borderBottom: i === 13 ? 'none' : '1px solid #ccc', borderRight: '1px solid #000', paddingLeft: '4px', textAlign: 'left' }}>{m.item}</td>
                             <td style={{ borderBottom: i === 13 ? 'none' : '1px solid #ccc', textAlign: 'center' }}>{m.amount}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </td>

                 {/* Divider 2 */}
                 <td style={{ width: '2%', backgroundColor: '#737373', borderLeft: '1px solid #000', borderRight: '1px solid #000' }}></td>

                 {/* Table 3: Materials */}
                 <td style={{ width: '32%', verticalAlign: 'top', padding: 0 }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                     <thead>
                       <tr style={{ backgroundColor: '#d9d9d9' }}>
                         <th colSpan={2} style={{ borderBottom: '1px solid #000', padding: '3px', fontWeight: 'bold' }}>วัสดุเข้าหน่วยงาน</th>
                       </tr>
                       <tr style={{ backgroundColor: '#d9d9d9' }}>
                         <th style={{ width: '70%', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '3px' }}>รายการ</th>
                         <th style={{ width: '30%', borderBottom: '1px solid #000', padding: '3px' }}>จำนวน</th>
                       </tr>
                     </thead>
                     <tbody>
                       {Array.from({ length: 14 }).map((_, i) => {
                         const m = formData.materials[i] || { item: '', amount: '' };
                         return (
                           <tr key={i} style={{ height: '18px' }}>
                             <td style={{ borderBottom: i === 13 ? 'none' : '1px solid #ccc', borderRight: '1px solid #000', paddingLeft: '4px', textAlign: 'left' }}>{m.item}</td>
                             <td style={{ borderBottom: i === 13 ? 'none' : '1px solid #ccc', textAlign: 'center' }}>{m.amount}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </td>
               </tr>
             </tbody>
           </table>

           {/* Footer Signature */}
           <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', fontSize: '11pt', fontFamily: 'Sarabun, sans-serif' }}>
             <table style={{ borderCollapse: 'collapse', textAlign: 'center' }}>
               <tbody>
                 <tr>
                   <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', verticalAlign: 'bottom' }}>ผู้บันทึกรายงาน :</td>
                   <td style={{ width: '220px', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                     {formData.reporterName || 'นางสาวกุสุมา ใจหนัก'}
                   </td>
                 </tr>
                 <tr>
                   <td></td>
                   <td style={{ paddingTop: '4px' }}>ตำแหน่ง : {formData.reporterPosition || 'วิศวกรโครงการ'}</td>
                 </tr>
                 <tr>
                   <td></td>
                   <td style={{ paddingTop: '2px' }}>วันที่ : &nbsp;&nbsp;&nbsp;&nbsp;{formData.date ? formData.date.split('-').reverse().join('-') : '01-03-69'}</td>
                 </tr>
               </tbody>
             </table>
           </div>
         </div>

         {/* PAGE 2+: PHOTOS */}
         {formData.photos.length > 0 && (
           <div style={{ width: '100%', boxSizing: 'border-box', marginTop: '30px', pageBreakBefore: 'always' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
               <tbody>
                 <tr>
                   <td style={{ width: '55px', verticalAlign: 'middle' }}>
                     <img src="/logo.png" alt="logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                   </td>
                   <td style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 'bold', verticalAlign: 'middle', fontFamily: 'Sarabun, sans-serif' }}>
                     บริษัท ซัน คอนแทรคเตอร์ จำกัด
                   </td>
                   <td style={{ width: '150px', textAlign: 'right', fontSize: '16pt', fontWeight: 'bold', verticalAlign: 'middle', fontFamily: 'Sarabun, sans-serif' }}>
                     รายงานประจำวัน
                   </td>
                 </tr>
               </tbody>
             </table>
             
             <div style={{ borderBottom: '3px double #000', marginBottom: '12px' }}></div>

             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', marginBottom: '12px', fontFamily: 'Sarabun, sans-serif' }}>
               <tbody>
                 <tr>
                   <td style={{ width: '75px', fontWeight: 'bold', verticalAlign: 'middle' }}>โครงการ :</td>
                   <td style={{ fontWeight: 'bold', fontSize: '11pt', verticalAlign: 'middle' }}>{formData.projectName}</td>
                 </tr>
               </tbody>
             </table>
             
             <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11pt', fontFamily: 'Sarabun, sans-serif' }}>
               <thead>
                 <tr style={{ backgroundColor: '#d9d9d9' }}>
                   <th style={{ border: '1px solid #000', padding: '6px', fontWeight: 'bold' }}>รูปภาพการทำงาน</th>
                 </tr>
               </thead>
             </table>
             
             <div className="pdf-photos-grid">
               {formData.photos.map((src, i) => (
                 <div key={i} className="pdf-photo-box">
                   <img src={src} alt="work" />
                 </div>
               ))}
             </div>
             
             <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', fontSize: '11pt', fontFamily: 'Sarabun, sans-serif' }}>
               <table style={{ borderCollapse: 'collapse', textAlign: 'center' }}>
                 <tbody>
                   <tr>
                     <td style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '10px', verticalAlign: 'bottom' }}>ผู้บันทึกรายงาน :</td>
                     <td style={{ width: '220px', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                       {formData.reporterName || 'นางสาวกุสุมา ใจหนัก'}
                     </td>
                   </tr>
                   <tr>
                     <td></td>
                     <td style={{ paddingTop: '4px' }}>ตำแหน่ง : {formData.reporterPosition || 'วิศวกรโครงการ'}</td>
                   </tr>
                   <tr>
                     <td></td>
                     <td style={{ paddingTop: '2px' }}>วันที่ : &nbsp;&nbsp;&nbsp;&nbsp;{formData.date ? formData.date.split('-').reverse().join('-') : '01-03-69'}</td>
                   </tr>
                 </tbody>
               </table>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}

export default App;
