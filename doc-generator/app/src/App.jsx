import React, { useState, useEffect } from 'react';
import { exportToExcel } from './utils/exportExcel';
import { exportToPdf } from './utils/exportPdf';
import { exportToImage } from './utils/exportImage';

const STORAGE_KEY = 'daily_reports_v1';
const COMPANY_KEY = 'daily_reports_company_v1';
const PRESET_KEY = 'daily_reports_preset_v1';
const WIDGETS_KEY = 'daily_reports_widgets_v1';

const clockColors = ['#4a8c3f', '#e0b93c', '#3f6fa8', '#b23b2f'];

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function formatThaiDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const thaiYear = y > 2400 ? y : y + 543;
  return `${d} ${THAI_MONTHS_FULL[m] || ''} ${thaiYear}`;
}

const defaultLaborList = [
  'ผู้ควบคุมงาน', 'วิศวกรโครงการ', 'วิศวกรไซต์', 'สถาปนิก', 'ช่างเขียนแบบ', 
  'ช่างสำรวจ', 'ยาม / รปภ.', 'ช่างไฟฟ้า-ประปา', 'ช่างก่อสร้าง', 'ช่างเหล็ก'
].map(name => ({ name, qty: '' }));

const defaultEquipList = [
  'รถเทเลอร์', 'รถแบคโฮ', 'รถเครน', 'เครื่องระดับ', 'กล้อง Total Station', 
  'เครื่องเชื่อม', 'เครื่องตัดเหล็ก', 'เครื่องผสมปูน'
].map(name => ({ name, qty: '' }));

const defaultWidgets = [
  { id: 'info', name: 'ข้อมูลโครงการ', visible: true },
  { id: 'tasks', name: 'รายการปฏิบัติงาน', visible: true },
  { id: 'issues', name: 'ปัญหาและอุปสรรค / ข้อคิดเห็น', visible: true },
  { id: 'clock', name: 'สภาพอากาศ', visible: true },
  { id: 'labor', name: 'แรงงาน', visible: true },
  { id: 'equip', name: 'เครื่องจักร - อุปกรณ์', visible: true },
  { id: 'mat', name: 'วัสดุที่ใช้ผ่านงาน', visible: true },
  { id: 'photos', name: 'รูปภาพการทำงาน', visible: true },
  { id: 'signer', name: 'ผู้บันทึกรายงาน', visible: true }
];

const createDefaultTasks = () => [
  { item: '', qty: '', unit: 'งาน', note: '' },
  { item: '', qty: '', unit: 'งาน', note: '' },
  { item: '', qty: '', unit: 'งาน', note: '' },
  { item: '', qty: '', unit: 'งาน', note: '' },
  { item: '', qty: '', unit: 'งาน', note: '' }
];

function uid() {
  return 'r_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function compressImage(file, maxWidth = 1000, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [currentEditId, setCurrentEditId] = useState(null);
  const [reportTheme, setReportTheme] = useState('modern');
  
  const [company, setCompany] = useState({ name: 'บริษัท ซัน คอนแทรคเตอร์ จำกัด', logo: '' });
  const [preset, setPreset] = useState({
    defaultProject: 'ปรับปรุงสำนักงานศูนย์บริการรถยนต์โตโยต้า บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด',
    defaultOwner: 'บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด',
    defaultTime: '8.00 - 17.00 น.',
    defaultSignerRole: 'วิศวกรโครงการ',
    defaultSignerName: ''
  });

  const [widgets, setWidgets] = useState(defaultWidgets);
  const [reports, setReports] = useState([]);

  const [formData, setFormData] = useState({
    project: '',
    owner: '',
    date: todayStr(),
    workType: 'ปกติ',
    time: '8.00 - 17.00 น.',
    tasks: createDefaultTasks(),
    issues: '',
    clock: new Array(12).fill(0),
    labor: defaultLaborList,
    equip: defaultEquipList,
    mat: [{ name: '', qty: '' }],
    photos: [],
    signerName: '',
    signerRole: 'วิศวกรโครงการ',
    signerDate: todayStr()
  });

  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    try {
      const storedComp = JSON.parse(localStorage.getItem(COMPANY_KEY));
      if (storedComp) setCompany(storedComp);

      const storedPreset = JSON.parse(localStorage.getItem(PRESET_KEY));
      if (storedPreset) {
        setPreset(storedPreset);
        setFormData(prev => ({
          ...prev,
          project: storedPreset.defaultProject || prev.project,
          owner: storedPreset.defaultOwner || prev.owner,
          time: storedPreset.defaultTime || prev.time,
          signerRole: storedPreset.defaultSignerRole || prev.signerRole,
          signerName: storedPreset.defaultSignerName || prev.signerName
        }));
      }

      const storedWidgets = JSON.parse(localStorage.getItem(WIDGETS_KEY));
      if (storedWidgets && Array.isArray(storedWidgets)) setWidgets(storedWidgets);

      const storedReports = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      setReports(storedReports);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveCompany = () => {
    try {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
      localStorage.setItem(PRESET_KEY, JSON.stringify(preset));
      alert('บันทึกการตั้งค่าบริษัทและแม่แบบโครงการแล้ว');
    } catch (e) {
      alert('เกิดข้อผิดพลาด: พื้นที่จัดเก็บเต็ม กรุณาลดขนาดโลโก้');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file, 400, 0.8);
    const updated = { ...company, logo: compressed };
    setCompany(updated);
    localStorage.setItem(COMPANY_KEY, JSON.stringify(updated));
  };

  const handleSaveWidgets = (newWidgets) => {
    setWidgets(newWidgets);
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(newWidgets));
  };

  const moveWidget = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;
    const next = [...widgets];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    handleSaveWidgets(next);
  };

  const toggleWidget = (idx) => {
    const next = [...widgets];
    next[idx].visible = !next[idx].visible;
    handleSaveWidgets(next);
  };

  const handleClearAllStorage = () => {
    if (window.confirm('คุณต้องการลบข้อมูลทั้งหมดที่บันทึกไว้ในเครื่องใช่หรือไม่?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COMPANY_KEY);
      localStorage.removeItem(PRESET_KEY);
      localStorage.removeItem(WIDGETS_KEY);
      setReports([]);
      setCompany({ name: '', logo: '' });
      setWidgets(defaultWidgets);
      alert('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
    }
  };

  const handleClearForm = () => {
    setCurrentEditId(null);
    setFormData({
      project: preset.defaultProject || '',
      owner: preset.defaultOwner || '',
      date: todayStr(),
      workType: 'ปกติ',
      time: preset.defaultTime || '8.00 - 17.00 น.',
      tasks: createDefaultTasks(),
      issues: '',
      clock: new Array(12).fill(0),
      labor: defaultLaborList,
      equip: defaultEquipList,
      mat: [{ name: '', qty: '' }],
      photos: [],
      signerName: preset.defaultSignerName || '',
      signerRole: preset.defaultSignerRole || 'วิศวกรโครงการ',
      signerDate: todayStr()
    });
  };

  const handleSaveReport = () => {
    try {
      const reportData = {
        ...formData,
        id: currentEditId || uid(),
        savedAt: new Date().toISOString()
      };
      let list = [...reports];
      const idx = list.findIndex(r => r.id === reportData.id);
      if (idx >= 0) {
        list[idx] = reportData;
      } else {
        list.push(reportData);
      }
      setReports(list);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      setCurrentEditId(reportData.id);
      alert('บันทึกรายงานเรียบร้อยแล้ว');
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึก: พื้นที่ในเครื่องเต็ม (แนะนำให้ลดจำนวนรูปภาพ)');
    }
  };

  const handleEditReport = (r) => {
    setCurrentEditId(r.id);
    setFormData({
      ...r,
      tasks: r.tasks && r.tasks.length >= 5 ? r.tasks : [...(r.tasks || []), ...createDefaultTasks()].slice(0, Math.max(5, (r.tasks || []).length)),
      labor: r.labor && r.labor.length ? r.labor : defaultLaborList,
      equip: r.equip && r.equip.length ? r.equip : defaultEquipList,
      mat: r.mat && r.mat.length ? r.mat : [{ name: '', qty: '' }],
      photos: r.photos || [],
      clock: r.clock ? [...r.clock] : new Array(12).fill(0)
    });
    setActiveTab('form');
  };

  const handleDeleteReport = (id) => {
    if (!window.confirm('ลบรายงานนี้ใช่หรือไม่?')) return;
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handlePreview = (r = formData) => {
    setPreviewData(r);
    setShowPreview(true);
    setTimeout(() => {
      document.getElementById('previewCard')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleExportPdfA4 = () => {
    const targetId = reportTheme === 'modern' ? 'active-report-modern' : 'active-report-classic';
    exportToPdf(targetId, `Daily_Report_${previewData?.date || formData.date}`);
  };

  const handleExportImageA4 = () => {
    const targetId = reportTheme === 'modern' ? 'active-report-modern' : 'active-report-classic';
    exportToImage(targetId, `Daily_Report_${previewData?.date || formData.date}`);
  };

  const handleClockClick = (index) => {
    setFormData(prev => {
      const nextClock = [...prev.clock];
      nextClock[index] = (nextClock[index] + 1) % 4;
      return { ...prev, clock: nextClock };
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const compressedUrl = await compressImage(file, 1000, 0.7);
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, { url: compressedUrl, caption: file.name.replace(/\.[^/.]+$/, "") }]
      }));
    }
  };

  const removePhoto = (idx) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx)
    }));
  };

  const updatePhotoCaption = (idx, caption) => {
    setFormData(prev => {
      const next = [...prev.photos];
      next[idx].caption = caption;
      return { ...prev, photos: next };
    });
  };

  const handleTaskChange = (idx, field, val) => {
    setFormData(prev => {
      const next = [...prev.tasks];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, tasks: next };
    });
  };

  const addTaskRow = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { item: '', qty: '', unit: 'งาน', note: '' }]
    }));
  };

  const removeTaskRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== idx)
    }));
  };

  const handlePairChange = (kind, idx, field, val) => {
    setFormData(prev => {
      const next = [...prev[kind]];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, [kind]: next };
    });
  };

  const addPairRow = (kind) => {
    setFormData(prev => ({
      ...prev,
      [kind]: [...prev[kind], { name: '', qty: '' }]
    }));
  };

  const removePairRow = (kind, idx) => {
    setFormData(prev => ({
      ...prev,
      [kind]: prev[kind].filter((_, i) => i !== idx)
    }));
  };

  const renderClockSvg = (clockArr, size = 100) => {
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = size * 0.36;
    const rInner = size * 0.15;
    const rLabel = size * 0.44;
    const slices = [];

    for (let i = 0; i < 12; i++) {
      const startAngle = (i * 30 - 90) * Math.PI / 180;
      const endAngle = ((i + 1) * 30 - 90) * Math.PI / 180;
      const x1 = cx + rInner * Math.cos(startAngle);
      const y1 = cy + rInner * Math.sin(startAngle);
      const x2 = cx + rOuter * Math.cos(startAngle);
      const y2 = cy + rOuter * Math.sin(startAngle);
      const x3 = cx + rOuter * Math.cos(endAngle);
      const y3 = cy + rOuter * Math.sin(endAngle);
      const x4 = cx + rInner * Math.cos(endAngle);
      const y4 = cy + rInner * Math.sin(endAngle);

      const d = `M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rInner} ${rInner} 0 0 0 ${x1} ${y1} Z`;

      const hourNum = i + 1;
      const hourAngle = ((hourNum * 30) - 90) * Math.PI / 180;
      const lx = cx + rLabel * Math.cos(hourAngle);
      const ly = cy + rLabel * Math.sin(hourAngle);

      slices.push(
        <g key={i}>
          <path
            d={d}
            fill={clockColors[clockArr[i] || 0]}
            stroke="#fff"
            strokeWidth="1.2"
            style={{ cursor: 'pointer' }}
            onClick={() => handleClockClick(i)}
          />
          <text
            x={lx}
            y={ly + 3}
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#333"
          >
            {hourNum}
          </text>
        </g>
      );
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
        <circle cx={cx} cy={cy} r={rInner - 1} fill="#fff" stroke="#ccc" />
      </svg>
    );
  };

  const renderWidgetCard = (w) => {
    if (!w.visible) return null;

    switch (w.id) {
      case 'info':
        return (
          <div className="card" key="info">
            <h2>ข้อมูลโครงการ</h2>
            <div className="grid">
              <div className="field">
                <label>ชื่อโครงการ</label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={e => setFormData({ ...formData, project: e.target.value })}
                  placeholder="เช่น ปรับปรุงอาคารสำนักงาน..."
                />
              </div>
              <div className="field">
                <label>เจ้าของโครงการ (Owner / Client)</label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={e => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="เช่น บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด"
                />
              </div>
              <div className="field">
                <label>วันที่</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="field">
                <label>ประเภทวันทำงาน</label>
                <div className="radio-row">
                  <label>
                    <input
                      type="radio"
                      name="worktype"
                      value="ปกติ"
                      checked={formData.workType === 'ปกติ'}
                      onChange={e => setFormData({ ...formData, workType: e.target.value })}
                    /> วันปกติ
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="worktype"
                      value="วันหยุด"
                      checked={formData.workType === 'วันหยุด'}
                      onChange={e => setFormData({ ...formData, workType: e.target.value })}
                    /> วันหยุด
                  </label>
                </div>
              </div>
              <div className="field">
                <label>เวลาทำงาน</label>
                <input
                  type="text"
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  placeholder="เช่น 8.00 - 17.00 น."
                />
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="card" key="tasks">
            <h2>รายการปฏิบัติงาน</h2>
            <table className="entry-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>ลำดับ</th>
                  <th>รายการ</th>
                  <th style={{ width: '90px' }}>จำนวน</th>
                  <th style={{ width: '80px' }}>หน่วย</th>
                  <th>หมายเหตุ</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {formData.tasks.map((t, i) => (
                  <tr key={i}>
                    <td style={{ textAnchor: 'middle', textAlign: 'center' }}>{i + 1}</td>
                    <td>
                      <input
                        type="text"
                        value={t.item}
                        onChange={e => handleTaskChange(i, 'item', e.target.value)}
                        placeholder="รายละเอียดงาน"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={t.qty}
                        onChange={e => handleTaskChange(i, 'qty', e.target.value)}
                        placeholder="1"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={t.unit}
                        onChange={e => handleTaskChange(i, 'unit', e.target.value)}
                        placeholder="งาน"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={t.note}
                        onChange={e => handleTaskChange(i, 'note', e.target.value)}
                      />
                    </td>
                    <td className="row-actions">
                      <button className="icon-btn danger" onClick={() => removeTaskRow(i)}>X</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-row-btn" onClick={addTaskRow}>+ เพิ่มรายการ</button>
          </div>
        );

      case 'issues':
        return (
          <div className="card" key="issues">
            <h2>ปัญหาและอุปสรรค / ข้อคิดเห็น</h2>
            <textarea
              value={formData.issues}
              onChange={e => setFormData({ ...formData, issues: e.target.value })}
              placeholder="ระบุปัญหาที่พบระหว่างวัน..."
            />
          </div>
        );

      case 'clock':
        return (
          <div className="card" key="clock">
            <h2>สภาพอากาศ (คลิกเพื่อไล่สีแต่ละช่วงเวลา)</h2>
            <div className="clock-wrap">
              {renderClockSvg(formData.clock, 140)}
              <div className="legend">
                <div className="item"><span className="swatch" style={{ background: '#4a8c3f' }}></span> ทำงานได้ปกติ</div>
                <div className="item"><span className="swatch" style={{ background: '#e0b93c' }}></span> ฝนตกเล็กน้อย ทำงานได้บางส่วน</div>
                <div className="item"><span className="swatch" style={{ background: '#3f6fa8' }}></span> ฝนตกปานกลาง ทำงานได้น้อย</div>
                <div className="item"><span className="swatch" style={{ background: '#b23b2f' }}></span> ฝนตกหนัก / ทำงานไม่ได้</div>
              </div>
            </div>
          </div>
        );

      case 'labor':
        return (
          <div className="card" key="labor">
            <h2>แรงงาน</h2>
            <table className="entry-table">
              <thead>
                <tr><th>ตำแหน่ง</th><th style={{ width: '100px' }}>จำนวน</th><th style={{ width: '40px' }}></th></tr>
              </thead>
              <tbody>
                {formData.labor.map((x, i) => (
                  <tr key={i}>
                    <td><input type="text" value={x.name} onChange={e => handlePairChange('labor', i, 'name', e.target.value)} /></td>
                    <td><input type="text" value={x.qty} onChange={e => handlePairChange('labor', i, 'qty', e.target.value)} /></td>
                    <td className="row-actions"><button className="icon-btn danger" onClick={() => removePairRow('labor', i)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-row-btn" onClick={() => addPairRow('labor')}>+ เพิ่มตำแหน่ง</button>
          </div>
        );

      case 'equip':
        return (
          <div className="card" key="equip">
            <h2>เครื่องจักร - อุปกรณ์</h2>
            <table className="entry-table">
              <thead>
                <tr><th>รายการ</th><th style={{ width: '100px' }}>จำนวน</th><th style={{ width: '40px' }}></th></tr>
              </thead>
              <tbody>
                {formData.equip.map((x, i) => (
                  <tr key={i}>
                    <td><input type="text" value={x.name} onChange={e => handlePairChange('equip', i, 'name', e.target.value)} /></td>
                    <td><input type="text" value={x.qty} onChange={e => handlePairChange('equip', i, 'qty', e.target.value)} /></td>
                    <td className="row-actions"><button className="icon-btn danger" onClick={() => removePairRow('equip', i)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-row-btn" onClick={() => addPairRow('equip')}>+ เพิ่มรายการ</button>
          </div>
        );

      case 'mat':
        return (
          <div className="card" key="mat">
            <h2>วัสดุที่ใช้ผ่านงาน</h2>
            <table className="entry-table">
              <thead>
                <tr><th>รายการ</th><th style={{ width: '100px' }}>จำนวน</th><th style={{ width: '40px' }}></th></tr>
              </thead>
              <tbody>
                {formData.mat.map((x, i) => (
                  <tr key={i}>
                    <td><input type="text" value={x.name} onChange={e => handlePairChange('mat', i, 'name', e.target.value)} /></td>
                    <td><input type="text" value={x.qty} onChange={e => handlePairChange('mat', i, 'qty', e.target.value)} /></td>
                    <td className="row-actions"><button className="icon-btn danger" onClick={() => removePairRow('mat', i)}>X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="add-row-btn" onClick={() => addPairRow('mat')}>+ เพิ่มรายการ</button>
          </div>
        );

      case 'photos':
        return (
          <div className="card" key="photos">
            <h2>รูปภาพการทำงาน (Work Photos)</h2>
            <div className="photo-uploader">
              {formData.photos.map((p, i) => (
                <div key={i} className="photo-card">
                  <img src={p.url} alt={`work-${i}`} />
                  <button className="del-btn" onClick={() => removePhoto(i)}>X</button>
                  <input
                    type="text"
                    value={p.caption || ''}
                    onChange={e => updatePhotoCaption(i, e.target.value)}
                    placeholder="คำบรรยายรูปภาพ..."
                  />
                </div>
              ))}
              <label className="photo-upload-box">
                <span style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>+</span>
                <span>เพิ่มรูปภาพ</span>
                <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              </label>
            </div>
          </div>
        );

      case 'signer':
        return (
          <div className="card" key="signer">
            <h2>ผู้บันทึกรายงาน</h2>
            <div className="grid">
              <div className="field">
                <label>ชื่อ-สกุล</label>
                <input
                  type="text"
                  value={formData.signerName}
                  onChange={e => setFormData({ ...formData, signerName: e.target.value })}
                  placeholder="ชื่อผู้บันทึก"
                />
              </div>
              <div className="field">
                <label>ตำแหน่ง</label>
                <input
                  type="text"
                  value={formData.signerRole}
                  onChange={e => setFormData({ ...formData, signerRole: e.target.value })}
                  placeholder="เช่น วิศวกรโครงการ"
                />
              </div>
              <div className="field">
                <label>วันที่บันทึก</label>
                <input
                  type="date"
                  value={formData.signerDate}
                  onChange={e => setFormData({ ...formData, signerDate: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const render10ResourceRows = (list, isQtyWithUnit = false, unitStr = '') => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      const item = (list || [])[i] || { name: '', qty: '' };
      const displayQty = item.qty ? (isQtyWithUnit ? `${item.qty} ${unitStr}` : item.qty) : '';
      rows.push(
        <tr key={i}>
          <td style={{ height: '22px' }}>{item.name || '\u00A0'}</td>
          <td style={{ textAlign: 'right', fontWeight: 'bold', width: '80px' }}>{displayQty}</td>
        </tr>
      );
    }
    return rows;
  };

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar no-print">
        <div>
          <h1>ระบบบันทึกรายงานประจำวันหน้างาน</h1>
          <div className="sub">กรอกข้อมูล -&gt; บันทึก -&gt; ส่งออก A4 PDF / รูปภาพ หรือ Excel</div>
        </div>
        <div className="tabs">
          <button
            className={activeTab === 'form' ? 'active' : ''}
            onClick={() => { setActiveTab('form'); setShowPreview(false); }}
          >
            กรอกข้อมูล
          </button>
          <button
            className={activeTab === 'list' ? 'active' : ''}
            onClick={() => { setActiveTab('list'); setShowPreview(false); }}
          >
            รายงานที่บันทึกไว้
          </button>
          <button
            className={activeTab === 'widgets' ? 'active' : ''}
            onClick={() => { setActiveTab('widgets'); setShowPreview(false); }}
          >
            ปรับแต่งการจัดวาง
          </button>
          <button
            className={activeTab === 'company' ? 'active' : ''}
            onClick={() => { setActiveTab('company'); setShowPreview(false); }}
          >
            ตั้งค่าแม่แบบ &amp; บริษัท
          </button>
        </div>
      </div>

      {/* FORM TAB */}
      {activeTab === 'form' && (
        <div id="formTab">
          {widgets.map(w => renderWidgetCard(w))}

          <div className="btnbar no-print">
            <button className="btn ghost" onClick={handleClearForm}>ล้างฟอร์ม</button>
            <button className="btn primary" onClick={handleSaveReport}>บันทึกรายงาน</button>
            <button className="btn primary" onClick={() => exportToExcel(formData)} style={{ background: '#10b981' }}>
              ส่งออกเป็น Excel (Template)
            </button>
            <button className="btn primary" onClick={() => handlePreview(formData)}>
              ดูตัวอย่างและส่งออก PDF / PNG A4
            </button>
          </div>
        </div>
      )}

      {/* LIST TAB */}
      {activeTab === 'list' && (
        <div id="listTab">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, border: 'none' }}>รายงานที่บันทึกไว้</h2>
              {reports.length > 0 && (
                <button className="btn ghost" onClick={handleClearAllStorage} style={{ color: '#a13a2f', borderColor: '#e2b6ab' }}>
                  ล้างข้อมูลประวัติทั้งหมด
                </button>
              )}
            </div>
            {!reports.length ? (
              <div className="empty">ยังไม่มีรายงานที่บันทึกไว้</div>
            ) : (
              reports
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .map(r => (
                  <div key={r.id} className="list-card">
                    <div className="meta">
                      <b>{r.project || '(ไม่ระบุชื่อโครงการ)'}</b>
                      <span>วันที่ {formatThaiDate(r.date)} · {r.workType || ''} · บันทึกโดย {r.signerName || '-'}</span>
                    </div>
                    <div className="actions">
                      <button className="btn ghost" onClick={() => handleEditReport(r)}>แก้ไข</button>
                      <button className="btn primary" onClick={() => handlePreview(r)}>ดู/พิมพ์/ส่งออก</button>
                      <button className="btn ghost" onClick={() => handleDeleteReport(r.id)} style={{ color: '#a13a2f' }}>ลบ</button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* WIDGET CUSTOMIZER TAB */}
      {activeTab === 'widgets' && (
        <div id="widgetsTab">
          <div className="card">
            <h2>ปรับแต่งตำแหน่งและการแสดงผล Widget</h2>
            <p className="sub" style={{ marginBottom: '14px' }}>
              คุณสามารถเลื่อนลำดับขึ้น-ลง หรือปิดการแสดงผลบาง Widget ที่ไม่ต้องการได้เลยครับ
            </p>

            <table className="entry-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>แสดง</th>
                  <th>ชื่อ Widget</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>จัดลำดับ</th>
                </tr>
              </thead>
              <tbody>
                {widgets.map((w, idx) => (
                  <tr key={w.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={w.visible}
                        onChange={() => toggleWidget(idx)}
                      />
                    </td>
                    <td style={{ fontWeight: w.visible ? 'bold' : 'normal', opacity: w.visible ? 1 : 0.5 }}>
                      {w.name}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="widget-btn" onClick={() => moveWidget(idx, -1)} disabled={idx === 0}>ขึ้น</button>
                      &nbsp;
                      <button className="widget-btn" onClick={() => moveWidget(idx, 1)} disabled={idx === widgets.length - 1}>ลง</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPANY & PRESET TAB */}
      {activeTab === 'company' && (
        <div id="companyTab">
          <div className="card">
            <h2>ตั้งค่าแม่แบบโครงการ</h2>
            <div className="grid">
              <div className="field">
                <label>ชื่อโครงการเริ่มต้น</label>
                <input
                  type="text"
                  value={preset.defaultProject}
                  onChange={e => setPreset({ ...preset, defaultProject: e.target.value })}
                  placeholder="เช่น ปรับปรุงอาคารสำนักงาน..."
                />
              </div>
              <div className="field">
                <label>เจ้าของโครงการเริ่มต้น (Owner / Client)</label>
                <input
                  type="text"
                  value={preset.defaultOwner}
                  onChange={e => setPreset({ ...preset, defaultOwner: e.target.value })}
                  placeholder="เช่น บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด"
                />
              </div>
              <div className="field">
                <label>เวลาทำงานเริ่มต้น</label>
                <input
                  type="text"
                  value={preset.defaultTime}
                  onChange={e => setPreset({ ...preset, defaultTime: e.target.value })}
                />
              </div>
              <div className="field">
                <label>ตำแหน่งผู้บันทึกเริ่มต้น</label>
                <input
                  type="text"
                  value={preset.defaultSignerRole}
                  onChange={e => setPreset({ ...preset, defaultSignerRole: e.target.value })}
                />
              </div>
              <div className="field">
                <label>ชื่อผู้บันทึกเริ่มต้น</label>
                <input
                  type="text"
                  value={preset.defaultSignerName}
                  onChange={e => setPreset({ ...preset, defaultSignerName: e.target.value })}
                  placeholder="ชื่อ - นามสกุล"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2>ตั้งค่าบริษัท (ใช้แสดงบนหัวรายงาน)</h2>
            <div className="grid">
              <div className="field">
                <label>ชื่อบริษัท</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={e => setCompany({ ...company, name: e.target.value })}
                  placeholder="เช่น บริษัท ซัน คอนแทรคเตอร์ จำกัด"
                />
              </div>
              <div className="field">
                <label>โลโก้บริษัท (รูปภาพ)</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </div>
            {company.logo && (
              <div style={{ marginTop: '14px' }}>
                <label>ตัวอย่างโลโก้:</label>
                <img src={company.logo} alt="logo" style={{ height: '50px', objectFit: 'contain' }} />
              </div>
            )}
            <div className="btnbar no-print" style={{ marginTop: '14px', justifyContent: 'space-between' }}>
              <button className="btn ghost" onClick={handleClearAllStorage} style={{ color: '#a13a2f', borderColor: '#e2b6ab' }}>
                ล้าง LocalStorage ทั้งหมด
              </button>
              <button className="btn primary" onClick={handleSaveCompany}>บันทึกการตั้งค่าแม่แบบ &amp; บริษัท</button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW / PRINT / EXPORT AREA */}
      {showPreview && previewData && (
        <div className="card no-print" id="previewCard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, border: 'none' }}>ตัวอย่างและส่งออกรายงาน</h2>
            
            <div className="tabs" style={{ gap: '4px' }}>
              <button
                className={reportTheme === 'modern' ? 'active' : ''}
                onClick={() => setReportTheme('modern')}
              >
                สไตล์โมเดิร์น (Executive)
              </button>
              <button
                className={reportTheme === 'classic' ? 'active' : ''}
                onClick={() => setReportTheme('classic')}
              >
                สไตล์คลาสสิก (Standard Form)
              </button>
            </div>
          </div>

          {/* EXPORT ACTION BUTTONS */}
          <div className="btnbar" style={{ justifyContent: 'flex-start', marginBottom: '14px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <button className="btn primary" onClick={handleExportPdfA4} style={{ background: '#2f5233' }}>
              ส่งออกเป็น PDF (ขนาด A4)
            </button>
            <button className="btn primary" onClick={handleExportImageA4} style={{ background: '#0284c7' }}>
              ส่งออกเป็นรูปภาพ PNG (ขนาด A4)
            </button>
            <button className="btn primary" onClick={() => exportToExcel(previewData)} style={{ background: '#10b981' }}>
              ส่งออกเป็น Excel (Template)
            </button>
            <button className="btn ghost" onClick={() => window.print()}>
              พิมพ์เอกสาร
            </button>
          </div>

          {/* CENTERED CANVAS CONTAINER MATCHING A4 FIXED WIDTH EXACTLY */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', background: '#cbd5e1', padding: '20px 10px', borderRadius: '8px', overflowX: 'auto' }}>
            
            {/* CLASSIC STYLE PREVIEW */}
            {reportTheme === 'classic' && (
              <div className="report-page" id="active-report-classic">
                <div className="rp-header">
                  <div className="logo">
                    {company.logo && <img src={company.logo} alt="Company Logo" />}
                    <div className="company">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
                  </div>
                  <div className="title">DAILY REPORT</div>
                </div>
                <div className="rp-meta-row">
                  <div><b>โครงการ:</b> {previewData.project}</div>
                  {previewData.owner && <div><b>เจ้าของโครงการ:</b> {previewData.owner}</div>}
                  <div><b>วันที่:</b> {formatThaiDate(previewData.date)}</div>
                  <div><b>ประเภทวัน:</b> {previewData.workType}</div>
                  <div><b>เวลาทำงาน:</b> {previewData.time}</div>
                </div>

                <table className="rp-table">
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ width: '32px' }}>ลำดับ</th>
                      <th rowSpan="2">รายการ</th>
                      <th colSpan="2">ปริมาณ</th>
                      <th rowSpan="2">หมายเหตุ</th>
                    </tr>
                    <tr>
                      <th style={{ width: '60px' }}>จำนวน</th>
                      <th style={{ width: '60px' }}>หน่วย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(5, (previewData.tasks || []).length) }).map((_, i) => {
                      const t = (previewData.tasks || [])[i] || { item: '', qty: '', unit: 'งาน', note: '' };
                      return (
                        <tr key={i}>
                          <td style={{ textAlign: 'center' }}>{i + 1}</td>
                          <td>{t.item}</td>
                          <td style={{ textAlign: 'center' }}>{t.qty}</td>
                          <td style={{ textAlign: 'center' }}>{t.item || t.qty ? t.unit : ''}</td>
                          <td>{t.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="rp-two-col">
                  <div>
                    <div className="rp-section-title">ปัญหาและอุปสรรค / ข้อคิดเห็น</div>
                    <div className="rp-issues">{previewData.issues || '-'}</div>
                  </div>
                  <div style={{ maxWidth: '210px' }}>
                    <div className="rp-section-title">สภาพอากาศ</div>
                    <div className="rp-clock-box">
                      {renderClockSvg(previewData.clock || new Array(12).fill(0), 120)}
                      <div className="rp-legend">
                        <div><span className="sw" style={{ background: '#4a8c3f' }}></span>ทำงานได้ปกติ</div>
                        <div><span className="sw" style={{ background: '#e0b93c' }}></span>ทำงานได้บางส่วน</div>
                        <div><span className="sw" style={{ background: '#3f6fa8' }}></span>ทำงานได้น้อย</div>
                        <div><span className="sw" style={{ background: '#b23b2f' }}></span>ทำงานไม่ได้</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rp-three">
                  <div>
                    <div className="rp-section-title">แรงงาน</div>
                    <table className="rp-table">
                      <thead><tr><th>ตำแหน่ง</th><th style={{ width: '50px' }}>จำนวน</th></tr></thead>
                      <tbody>
                        {render10ResourceRows(previewData.labor, true, 'คน')}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="rp-section-title">เครื่องจักร-อุปกรณ์</div>
                    <table className="rp-table">
                      <thead><tr><th>รายการ</th><th style={{ width: '50px' }}>จำนวน</th></tr></thead>
                      <tbody>
                        {render10ResourceRows(previewData.equip, true, 'คัน/ชุด')}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="rp-section-title">วัสดุที่ใช้ผ่านงาน</div>
                    <table className="rp-table">
                      <thead><tr><th>รายการ</th><th style={{ width: '50px' }}>จำนวน</th></tr></thead>
                      <tbody>
                        {render10ResourceRows(previewData.mat, false)}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rp-sign">
                  <div className="line">({previewData.signerName || '....................................................'})</div>
                  <div className="line">ตำแหน่ง: {previewData.signerRole || 'วิศวกรโครงการ'}</div>
                  <div className="line">วันที่: {formatThaiDate(previewData.signerDate || previewData.date)}</div>
                </div>

                {previewData.photos && previewData.photos.length > 0 && (
                  <div className="rp-photo-page">
                    <div className="rp-header">
                      <div className="logo">
                        {company.logo && <img src={company.logo} alt="Company Logo" />}
                        <div className="company">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
                      </div>
                      <div className="title">รูปภาพการทำงาน</div>
                    </div>
                    <div className="rp-meta-row">
                      <div><b>โครงการ:</b> {previewData.project}</div>
                      <div><b>วันที่:</b> {formatThaiDate(previewData.date)}</div>
                    </div>

                    <div className="rp-photo-grid">
                      {previewData.photos.map((p, idx) => (
                        <div key={idx} className="rp-photo-box">
                          <img src={p.url} alt={`photo-${idx}`} />
                          {p.caption && <div className="caption">{p.caption}</div>}
                        </div>
                      ))}
                    </div>

                    <div className="rp-sign" style={{ marginTop: '20px' }}>
                      <div className="line">({previewData.signerName || ''})</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODERN EXECUTIVE STYLE PREVIEW */}
            {reportTheme === 'modern' && (
              <div className="modern-report" id="active-report-modern">
                <div className="m-brand-bar">
                  <div className="m-company-brand">
                    {company.logo && <img src={company.logo} alt="Logo" />}
                    <div className="m-company-name">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
                  </div>
                  <div className="m-doc-title-badge">
                    <h1>DAILY REPORT</h1>
                    <div className="sub-title">รายงานประจำวัน</div>
                  </div>
                </div>

                <div className="m-kpi-banner">
                  <div className="m-project-title">โครงการ / Project: {previewData.project || '-'}</div>
                  {previewData.owner && (
                    <div style={{ fontSize: '12px', opacity: 0.95, marginBottom: '4px' }}>
                      เจ้าของโครงการ / Owner: <strong>{previewData.owner}</strong>
                    </div>
                  )}
                  <div className="m-kpi-grid">
                    <div className="m-kpi-item">
                      <span>วันที่รายงาน / Date</span>
                      <strong>{formatThaiDate(previewData.date)}</strong>
                    </div>
                    <div className="m-kpi-item">
                      <span>ประเภทวัน / Status</span>
                      <strong>{previewData.workType}</strong>
                    </div>
                    <div className="m-kpi-item">
                      <span>เวลาทำงาน / Working Hours</span>
                      <strong>{previewData.time}</strong>
                    </div>
                  </div>
                </div>

                <div className="m-section-header">รายการปฏิบัติงานประจำวัน (Daily Progress Log)</div>
                <table className="m-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px' }}>#</th>
                      <th style={{ textAlign: 'left' }}>รายละเอียดงาน</th>
                      <th style={{ width: '80px' }}>จำนวน</th>
                      <th style={{ width: '70px' }}>หน่วย</th>
                      <th style={{ textAlign: 'left', width: '180px' }}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(5, (previewData.tasks || []).length) }).map((_, i) => {
                      const t = (previewData.tasks || [])[i] || { item: '', qty: '', unit: 'งาน', note: '' };
                      return (
                        <tr key={i}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', height: '22px' }}>{i + 1}</td>
                          <td>{t.item}</td>
                          <td style={{ textAlign: 'center', fontWeight: '600' }}>{t.qty}</td>
                          <td style={{ textAlign: 'center' }}>{t.item || t.qty ? t.unit : ''}</td>
                          <td>{t.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Issues & Weather Single Card Side-by-Side Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '10px', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="m-section-header">ปัญหา อุปสรรค และข้อเสนอแนะ (Issues &amp; Site Observations)</div>
                    <div className="m-issues-card" style={{ flex: 1, boxSizing: 'border-box', margin: 0 }}>
                      {previewData.issues || '-'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="m-section-header">สภาพอากาศ (Weather Conditions)</div>
                    <div style={{ 
                      background: '#f8fafc', 
                      border: '1px solid #cbd5e1', 
                      borderRadius: '4px', 
                      padding: '8px 12px', 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {renderClockSvg(previewData.clock || new Array(12).fill(0), 100)}
                      </div>
                      <div className="rp-legend" style={{ fontSize: '10px', lineHeight: '1.55', flex: 1 }}>
                        <div><span className="sw" style={{ background: '#4a8c3f' }}></span>ทำงานได้ปกติ (08:00-17:00 น.)</div>
                        <div><span className="sw" style={{ background: '#e0b93c' }}></span>ฝนตกเล็กน้อย ทำงานได้บางส่วน</div>
                        <div><span className="sw" style={{ background: '#3f6fa8' }}></span>ฝนตกปานกลาง ทำงานได้น้อย</div>
                        <div><span className="sw" style={{ background: '#b23b2f' }}></span>ฝนตกหนัก / หยุดทำงาน</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="m-section-header">สรุปทรัพยากรหน้างาน (Site Resources Overview)</div>
                <div className="m-resources-grid">
                  <div className="m-resource-box">
                    <div className="head">แรงงาน (Manpower)</div>
                    <table className="m-resource-table">
                      <tbody>
                        {render10ResourceRows(previewData.labor, true, 'คน')}
                      </tbody>
                    </table>
                  </div>

                  <div className="m-resource-box">
                    <div className="head">เครื่องจักร - อุปกรณ์ (Machinery)</div>
                    <table className="m-resource-table">
                      <tbody>
                        {render10ResourceRows(previewData.equip, true, 'คัน/ชุด')}
                      </tbody>
                    </table>
                  </div>

                  <div className="m-resource-box">
                    <div className="head">วัสดุเข้าหน่วยงาน (Materials)</div>
                    <table className="m-resource-table">
                      <tbody>
                        {render10ResourceRows(previewData.mat, false)}
                      </tbody>
                    </table>
                  </div>
                </div>

                {previewData.photos && previewData.photos.length > 0 && (
                  <div style={{ pageBreakBefore: 'always', paddingTop: '16px' }}>
                    <div className="m-section-header">รูปภาพบันทึกการทำงานหน้างาน (Site Progress Photos)</div>
                    <div className="rp-photo-grid">
                      {previewData.photos.map((p, idx) => (
                        <div key={idx} className="rp-photo-box" style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                          <img src={p.url} alt={`photo-${idx}`} />
                          {p.caption && <div className="caption" style={{ background: '#f8fafc', fontWeight: '500', padding: '4px' }}>{p.caption}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="m-sign-block">
                  <div className="m-sign-card">
                    <div className="m-sign-line"></div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>({previewData.signerName || '....................................................'})</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>ตำแหน่ง: {previewData.signerRole || 'วิศวกรโครงการ'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>วันที่: {formatThaiDate(previewData.signerDate || previewData.date)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="btnbar" style={{ marginTop: '12px' }}>
            <button className="btn ghost" onClick={() => setShowPreview(false)}>ปิด</button>
          </div>
        </div>
      )}

      {/* PRINT AREA FOR BROWSER PRINTING */}
      {previewData && (
        <div id="printableCard" style={{ display: 'none' }}>
          {reportTheme === 'classic' ? (
            <div className="report-page">
              <div className="rp-header">
                <div className="logo">
                  {company.logo && <img src={company.logo} alt="Company Logo" />}
                  <div className="company">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
                </div>
                <div className="title">DAILY REPORT</div>
              </div>
              <div className="rp-meta-row">
                <div><b>โครงการ:</b> {previewData.project}</div>
                {previewData.owner && <div><b>เจ้าของโครงการ:</b> {previewData.owner}</div>}
                <div><b>วันที่:</b> {formatThaiDate(previewData.date)}</div>
                <div><b>ประเภทวัน:</b> {previewData.workType}</div>
                <div><b>เวลาทำงาน:</b> {previewData.time}</div>
              </div>

              <table className="rp-table">
                <thead>
                  <tr>
                    <th rowSpan="2" style={{ width: '32px' }}>ลำดับ</th>
                    <th rowSpan="2">รายการ</th>
                    <th colSpan="2">ปริมาณ</th>
                    <th rowSpan="2">หมายเหตุ</th>
                  </tr>
                  <tr>
                    <th style={{ width: '60px' }}>จำนวน</th>
                    <th style={{ width: '60px' }}>หน่วย</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(5, (previewData.tasks || []).length) }).map((_, i) => {
                    const t = (previewData.tasks || [])[i] || { item: '', qty: '', unit: 'งาน', note: '' };
                    return (
                      <tr key={i}>
                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                        <td>{t.item}</td>
                        <td style={{ textAlign: 'center' }}>{t.qty}</td>
                        <td style={{ textAlign: 'center' }}>{t.item || t.qty ? t.unit : ''}</td>
                        <td>{t.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="rp-two-col">
                <div>
                  <div className="rp-section-title">ปัญหาและอุปสรรค / ข้อคิดเห็น</div>
                  <div className="rp-issues">{previewData.issues || '-'}</div>
                </div>
                <div style={{ maxWidth: '210px' }}>
                  <div className="rp-section-title">สภาพอากาศ</div>
                  <div className="rp-clock-box">
                    {renderClockSvg(previewData.clock || new Array(12).fill(0), 120)}
                    <div className="rp-legend">
                      <div><span className="sw" style={{ background: '#4a8c3f' }}></span>ทำงานได้ปกติ</div>
                      <div><span className="sw" style={{ background: '#e0b93c' }}></span>ทำงานได้บางส่วน</div>
                      <div><span className="sw" style={{ background: '#3f6fa8' }}></span>ทำงานได้น้อย</div>
                      <div><span className="sw" style={{ background: '#b23b2f' }}></span>ทำงานไม่ได้</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rp-three">
                <div>
                  <div className="rp-section-title">แรงงาน</div>
                  <table className="rp-table">
                    <thead><tr><th>ตำแหน่ง</th><th style={{ width: '50px' }}>จำนวน</th></tr></thead>
                    <tbody>
                      {render10ResourceRows(previewData.labor, true, 'คน')}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="rp-section-title">เครื่องจักร-อุปกรณ์</div>
                  <table className="rp-table">
                    <thead><tr><th>รายการ</th><th style={{ width: '50px' }}>จำนวน</th></tr></thead>
                    <tbody>
                      {render10ResourceRows(previewData.equip, true, 'คัน/ชุด')}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="rp-section-title">วัสดุที่ใช้ผ่านงาน</div>
                  <table className="rp-table">
                    <thead><tr><th>รายการ</th><th style={{ width: '50px' }}>จำนวน</th></tr></thead>
                    <tbody>
                      {render10ResourceRows(previewData.mat, false)}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rp-sign">
                <div className="line">({previewData.signerName || '....................................................'})</div>
                <div className="line">ตำแหน่ง: {previewData.signerRole || 'วิศวกรโครงการ'}</div>
                <div className="line">วันที่: {formatThaiDate(previewData.signerDate || previewData.date)}</div>
              </div>

              {previewData.photos && previewData.photos.length > 0 && (
                <div className="rp-photo-page">
                  <div className="rp-header">
                    <div className="logo">
                      {company.logo && <img src={company.logo} alt="Company Logo" />}
                      <div className="company">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
                    </div>
                    <div className="title">รูปภาพการทำงาน</div>
                  </div>
                  <div className="rp-meta-row">
                    <div><b>โครงการ:</b> {previewData.project}</div>
                    <div><b>วันที่:</b> {formatThaiDate(previewData.date)}</div>
                  </div>

                  <div className="rp-photo-grid">
                    {previewData.photos.map((p, idx) => (
                      <div key={idx} className="rp-photo-box">
                        <img src={p.url} alt={`photo-${idx}`} />
                        {p.caption && <div className="caption">{p.caption}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="rp-sign" style={{ marginTop: '20px' }}>
                    <div className="line">({previewData.signerName || ''})</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="modern-report">
              <div className="m-brand-bar">
                <div className="m-company-brand">
                  {company.logo && <img src={company.logo} alt="Logo" />}
                  <div className="m-company-name">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
                </div>
                <div className="m-doc-title-badge">
                  <h1>DAILY REPORT</h1>
                  <div className="sub-title">รายงานประจำวัน</div>
                </div>
              </div>

              <div className="m-kpi-banner">
                <div className="m-project-title">โครงการ / Project: {previewData.project || '-'}</div>
                {previewData.owner && (
                  <div style={{ fontSize: '12px', opacity: 0.95, marginBottom: '4px' }}>
                    เจ้าของโครงการ / Owner: <strong>{previewData.owner}</strong>
                  </div>
                )}
                <div className="m-kpi-grid">
                  <div className="m-kpi-item">
                    <span>วันที่รายงาน / Date</span>
                    <strong>{formatThaiDate(previewData.date)}</strong>
                  </div>
                  <div className="m-kpi-item">
                    <span>ประเภทวัน / Status</span>
                    <strong>{previewData.workType}</strong>
                  </div>
                  <div className="m-kpi-item">
                    <span>เวลาทำงาน / Working Hours</span>
                    <strong>{previewData.time}</strong>
                  </div>
                </div>
              </div>

              <div className="m-section-header">รายการปฏิบัติงานประจำวัน (Daily Progress Log)</div>
              <table className="m-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>#</th>
                    <th style={{ textAlign: 'left' }}>รายละเอียดงาน</th>
                    <th style={{ width: '80px' }}>จำนวน</th>
                    <th style={{ width: '70px' }}>หน่วย</th>
                    <th style={{ textAlign: 'left', width: '180px' }}>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(5, (previewData.tasks || []).length) }).map((_, i) => {
                    const t = (previewData.tasks || [])[i] || { item: '', qty: '', unit: 'งาน', note: '' };
                    return (
                      <tr key={i}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', height: '22px' }}>{i + 1}</td>
                        <td>{t.item}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{t.qty}</td>
                        <td style={{ textAlign: 'center' }}>{t.item || t.qty ? t.unit : ''}</td>
                        <td>{t.note}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Issues & Weather Single Card Side-by-Side Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '10px', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="m-section-header">ปัญหา อุปสรรค และข้อเสนอแนะ (Issues &amp; Site Observations)</div>
                  <div className="m-issues-card" style={{ flex: 1, boxSizing: 'border-box', margin: 0 }}>
                    {previewData.issues || '-'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="m-section-header">สภาพอากาศ (Weather Conditions)</div>
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '4px', 
                    padding: '8px 12px', 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {renderClockSvg(previewData.clock || new Array(12).fill(0), 100)}
                    </div>
                    <div className="rp-legend" style={{ fontSize: '10px', lineHeight: '1.55', flex: 1 }}>
                      <div><span className="sw" style={{ background: '#4a8c3f' }}></span>ทำงานได้ปกติ (08:00-17:00 น.)</div>
                      <div><span className="sw" style={{ background: '#e0b93c' }}></span>ฝนตกเล็กน้อย ทำงานได้บางส่วน</div>
                      <div><span className="sw" style={{ background: '#3f6fa8' }}></span>ฝนตกปานกลาง ทำงานได้น้อย</div>
                      <div><span className="sw" style={{ background: '#b23b2f' }}></span>ฝนตกหนัก / หยุดทำงาน</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="m-section-header">สรุปทรัพยากรหน้างาน (Site Resources Overview)</div>
              <div className="m-resources-grid">
                <div className="m-resource-box">
                  <div className="head">แรงงาน (Manpower)</div>
                  <table className="m-resource-table">
                    <tbody>
                      {render10ResourceRows(previewData.labor, true, 'คน')}
                    </tbody>
                  </table>
                </div>

                <div className="m-resource-box">
                  <div className="head">เครื่องจักร - อุปกรณ์ (Machinery)</div>
                  <table className="m-resource-table">
                    <tbody>
                      {render10ResourceRows(previewData.equip, true, 'คัน/ชุด')}
                    </tbody>
                  </table>
                </div>

                <div className="m-resource-box">
                  <div className="head">วัสดุเข้าหน่วยงาน (Materials)</div>
                  <table className="m-resource-table">
                    <tbody>
                      {render10ResourceRows(previewData.mat, false)}
                    </tbody>
                  </table>
                </div>
              </div>

              {previewData.photos && previewData.photos.length > 0 && (
                <div style={{ pageBreakBefore: 'always', paddingTop: '16px' }}>
                  <div className="m-section-header">รูปภาพบันทึกการทำงานหน้างาน (Site Progress Photos)</div>
                  <div className="rp-photo-grid">
                    {previewData.photos.map((p, idx) => (
                      <div key={idx} className="rp-photo-box" style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <img src={p.url} alt={`photo-${idx}`} />
                        {p.caption && <div className="caption" style={{ background: '#f8fafc', fontWeight: '500', padding: '4px' }}>{p.caption}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="m-sign-block">
                <div className="m-sign-card">
                  <div className="m-sign-line"></div>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>({previewData.signerName || '....................................................'})</div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>ตำแหน่ง: {previewData.signerRole || 'วิศวกรโครงการ'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>วันที่: {formatThaiDate(previewData.signerDate || previewData.date)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
