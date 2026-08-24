import './index.css';
import React, { useState, useEffect } from 'react';
import { exportToPdf } from './utils/exportPdf';
import { exportToImage } from './utils/exportImage';
import SignaturePad from './components/SignaturePad';
import { DailyRequestView, createDefaultRequestTasks } from './components/DailyRequest';
import { docGeneratorService } from './services/supabaseService';

const STORAGE_KEY = 'daily_reports_v1';
const COMPANY_KEY = 'daily_reports_company_v1';
const PRESET_KEY = 'daily_reports_preset_v1';
const PROJECTS_KEY = 'daily_reports_projects_v1';

const clockColors = ['#4a8c3f', '#e0b93c', '#b23b2f'];

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
  'ช่างสำรวจ', 'ยาม / รปภ.', 'ช่างไฟฟ้า-ประปา', 'ช่างก่อสร้าง', 'ช่างเหล็ก', 'กรรมกร', 'อื่นๆ'
].map(name => ({ name, qty: '' }));

const defaultEquipList = [
  'รถเทเลอร์', 'รถแบคโฮ', 'รถเครน', 'เครื่องระดับ', 'กล้อง Total Station', 
  'เครื่องเชื่อม', 'เครื่องตัดเหล็ก', 'เครื่องดัดเหล็ก', 'เครื่องผสมปูน', 'เครื่องสูบน้ำ', 'รถกระบะ', 'อื่นๆ'
].map(name => ({ name, qty: '' }));

const createDefaultTasks = () => [{ item: '', qty: '', unit: 'งาน', note: '' }];

function uid() {
  return 'r_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
}

function todayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compressImage(file, maxWidth = 1000, quality = 0.75, outputFormat = null) {
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
        const isPng = (file && file.type === 'image/png') || outputFormat === 'image/png';
        const format = outputFormat || (isPng ? 'image/png' : 'image/jpeg');
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(format, quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function App() {
  const [docType, setDocType] = useState('report'); 
  const [activeTab, setActiveTab] = useState('form');
  const [currentEditId, setCurrentEditId] = useState(null);
  const [reportTheme, setReportTheme] = useState('modern');
  
  const [company, setCompany] = useState({ name: 'บริษัท ซัน คอนแทรคเตอร์ จำกัด', logo: '/logo.png' });
  
  const [projects, setProjects] = useState([]);

  const [preset, setPreset] = useState({
    defaultProject: '',
    defaultOwner: '',
    defaultWorkType: 'ปกติ',
    defaultTime: '8.00 - 17.00 น.',
    defaultSignerRole: 'วิศวกรโครงการ',
    defaultSignerName: '',
    defaultSignatureImage: null,
    defaultTasks: createDefaultTasks(),
    defaultLabor: defaultLaborList,
    defaultEquip: defaultEquipList,
    defaultMat: [{ name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }],
    defaultClock: new Array(12).fill(0),
    defaultIssues: '',
    reqDefaultProject: '',
    reqDefaultOwner: '',
    reqDefaultWorkType: 'ปกติ',
    reqDefaultTime: '8.00 - 17.00 น.',
    reqDefaultTasks: createDefaultRequestTasks(),
    reqDefaultRequesterName: '',
    reqDefaultRequesterRole: 'ผู้จัดการโครงการ',
    reqDefaultRequesterSignature: null,
    reqDefaultApproverName: '',
    reqDefaultApproverRole: 'ที่ปรึกษาโครงการฯ'
  });

  const [reports, setReports] = useState([]);

  const [formData, setFormData] = useState({
    project: '', owner: '', date: todayStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
    tasks: createDefaultTasks(), issues: '', clock: new Array(12).fill(0),
    labor: defaultLaborList, equip: defaultEquipList,
    mat: [{ name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }],
    photos: [], signerName: '', signerRole: 'วิศวกรโครงการ', signerDate: todayStr(), signatureImage: null
  });

  const [reqData, setReqData] = useState({
    project: '', owner: '', date: tomorrowStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
    tasks: defaultFormCache?.tasks ? JSON.parse(JSON.stringify(defaultFormCache.tasks)) : createDefaultRequestTasks(), requesterName: '', requesterRole: 'ผู้จัดการโครงการ', requesterDate: todayStr(), requesterSignature: null,
    approverName: '', approverRole: 'ที่ปรึกษาโครงการฯ'
  });

  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [presetsList, setPresetsList] = useState([]);
  const [selectedPresetName, setSelectedPresetName] = useState('');
  const [defaultFormCache, setDefaultFormCache] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let comp = await docGeneratorService.getCompanySettings();
        if (comp) setCompany(comp);

        let projs = await docGeneratorService.getProjects();
        setProjects(projs);

        const currentPresetType = docType === 'report' ? 'report_preset' : 'request_preset';
        let pList = await docGeneratorService.getPresets(currentPresetType);

        // --- Migrate old LocalStorage data to Supabase (Run Once) ---
        try {
          // 1. Migrate Presets
          const oldPresetStr = localStorage.getItem(PRESET_KEY);
          if (oldPresetStr) {
            const oldPreset = JSON.parse(oldPresetStr);
            const hasMigrated = pList.some(p => p.name === 'ค่าเริ่มต้นเดิม (Local Storage)');
            if (!hasMigrated) {
              await docGeneratorService.savePreset('report_preset', 'ค่าเริ่มต้นเดิม (Local Storage)', oldPreset);
              // Also save as request preset just in case they used both
              await docGeneratorService.savePreset('request_preset', 'ค่าเริ่มต้นเดิม (Local Storage)', oldPreset);
              pList = await docGeneratorService.getPresets(currentPresetType);
            }
          }

          // 2. Migrate Company (only if Supabase company is default)
          const oldCompStr = localStorage.getItem(COMPANY_KEY);
          if (oldCompStr) {
            const oldComp = JSON.parse(oldCompStr);
            // If Supabase doesn't have a logo yet or is using default name, override it
            if (!comp || (comp.name === 'บริษัท ซัน คอนแทรคเตอร์ จำกัด' && !comp.logo)) {
              await docGeneratorService.saveCompanySettings(oldComp);
              setCompany(oldComp);
              comp = oldComp;
            }
          }

          // 3. Migrate Projects (if Supabase projects are empty)
          const oldProjStr = localStorage.getItem(PROJECTS_KEY);
          if (oldProjStr && projs.length === 0) {
            const oldProjs = JSON.parse(oldProjStr);
            if (Array.isArray(oldProjs) && oldProjs.length > 0) {
              for (const pr of oldProjs) {
                await docGeneratorService.saveProject({ name: pr.name, owner: pr.owner });
              }
              projs = await docGeneratorService.getProjects();
              setProjects(projs);
            }
          }
        } catch(err) {
          console.error("Migration error:", err);
        }
        // -----------------------------------------------------------

        setPresetsList(pList);

        // Load hidden default tasks
        try {
          const defTasks = await docGeneratorService.getDefaultTasks(docType);
          if (defTasks && defTasks.tasks) setDefaultTasksList(defTasks.tasks);
        } catch(e) {}

        const docs = await docGeneratorService.getDocuments();
        setReports(docs.map(d => ({
          ...d.document_data,
          id: d.id,
          docType: d.doc_type,
          savedAt: d.created_at,
          date: d.date,
          project: d.project_name
        })));
      } catch (e) {
        console.error('Error fetching data:', e);
      }
    };
    fetchData();
  }, [docType]);

  // Load a named preset into form
  const applyPresetToForm = (presetData) => {
    if (!presetData) return;
    if (docType === 'report') {
      setFormData(prev => ({
        ...prev,
        project: presetData.defaultProject || prev.project,
        owner: presetData.defaultOwner || prev.owner,
        workType: presetData.defaultWorkType || prev.workType,
        time: presetData.defaultTime || prev.time,
        tasks: presetData.defaultTasks ? JSON.parse(JSON.stringify(presetData.defaultTasks)) : prev.tasks,
        issues: presetData.defaultIssues !== undefined ? presetData.defaultIssues : prev.issues,
        clock: presetData.defaultClock ? [...presetData.defaultClock] : prev.clock,
        labor: presetData.defaultLabor ? JSON.parse(JSON.stringify(presetData.defaultLabor)) : prev.labor,
        equip: presetData.defaultEquip ? JSON.parse(JSON.stringify(presetData.defaultEquip)) : prev.equip,
        mat: presetData.defaultMat ? JSON.parse(JSON.stringify(presetData.defaultMat)) : prev.mat,
        signerRole: presetData.defaultSignerRole || prev.signerRole,
        signerName: presetData.defaultSignerName || prev.signerName,
        signatureImage: presetData.defaultSignatureImage || prev.signatureImage,
        date: todayStr(),
        signerDate: todayStr()
      }));
    } else {
      setReqData(prev => ({
        ...prev,
        project: presetData.reqDefaultProject || prev.project,
        owner: presetData.reqDefaultOwner || prev.owner,
        workType: presetData.reqDefaultWorkType || prev.workType,
        time: presetData.reqDefaultTime || prev.time,
        tasks: presetData.reqDefaultTasks ? JSON.parse(JSON.stringify(presetData.reqDefaultTasks)) : prev.tasks,
        requesterName: presetData.reqDefaultRequesterName || prev.requesterName,
        requesterRole: presetData.reqDefaultRequesterRole || prev.requesterRole,
        requesterSignature: presetData.reqDefaultRequesterSignature || prev.requesterSignature,
        approverName: presetData.reqDefaultApproverName || prev.approverName,
        approverRole: presetData.reqDefaultApproverRole || prev.approverRole,
        date: tomorrowStr(),
        requesterDate: todayStr()
      }));
    }
  };

  const handleSaveCompany = async () => {
    try {
      await docGeneratorService.saveCompanySettings(company);
      alert('บันทึกการตั้งค่าบริษัทแล้ว');
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึกบริษัทลง Cloud');
    }
  };

  const handleSavePreset = async () => {
    try {
      const presetName = prompt('กรุณาตั้งชื่อข้อมูลเริ่มต้นชุดนี้ (เช่น ทีมโครงสร้าง-A, ช่างไฟ):', '');
      if (!presetName) return;

      const isReq = docType === 'request';
      const newPreset = { ...preset };
      if (isReq) {
        newPreset.reqDefaultProject = reqData.project;
        newPreset.reqDefaultOwner = reqData.owner;
        newPreset.reqDefaultWorkType = reqData.workType;
        newPreset.reqDefaultTime = reqData.time;
        newPreset.reqDefaultTasks = reqData.tasks;
        newPreset.reqDefaultRequesterName = reqData.requesterName;
        newPreset.reqDefaultRequesterRole = reqData.requesterRole;
        newPreset.reqDefaultRequesterSignature = reqData.requesterSignature;
        newPreset.reqDefaultApproverName = reqData.approverName;
        newPreset.reqDefaultApproverRole = reqData.approverRole;
      } else {
        newPreset.defaultProject = formData.project;
        newPreset.defaultOwner = formData.owner;
        newPreset.defaultWorkType = formData.workType;
        newPreset.defaultTime = formData.time;
        newPreset.defaultTasks = formData.tasks;
        newPreset.defaultLabor = formData.labor;
        newPreset.defaultEquip = formData.equip;
        newPreset.defaultMat = formData.mat;
        newPreset.defaultClock = formData.clock;
        newPreset.defaultIssues = formData.issues;
        newPreset.defaultSignerRole = formData.signerRole;
        newPreset.defaultSignerName = formData.signerName;
        newPreset.defaultSignatureImage = formData.signatureImage;
      }
      
      const currentPresetType = docType === 'report' ? 'report_preset' : 'request_preset';
      await docGeneratorService.savePreset(currentPresetType, presetName, newPreset);
      
      // Refresh presets list
      const pList = await docGeneratorService.getPresets(currentPresetType);
      setPresetsList(pList);
      setSelectedPresetName(presetName);
      
      alert(`บันทึกข้อมูลตั้งต้นชุด "${presetName}" เรียบร้อยแล้ว`);
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลตั้งต้น (อาจเกิดจากขนาดรูปลายเซ็นใหญ่เกินไป)');
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPresetName) return;
    if (!window.confirm(`ต้องการลบข้อมูลตั้งต้นชุด "${selectedPresetName}" ใช่หรือไม่?`)) return;
    
    const presetObj = presetsList.find(p => p.name === selectedPresetName);
    if (presetObj) {
      await docGeneratorService.deletePreset(presetObj.id);
      const currentPresetType = docType === 'report' ? 'report_preset' : 'request_preset';
      const pList = await docGeneratorService.getPresets(currentPresetType);
      setPresetsList(pList);
      setSelectedPresetName('');
      alert('ลบเรียบร้อยแล้ว');
    }
  };

  const handleRenamePreset = async () => {
    if (!selectedPresetName) return;
    const newName = prompt(`กรุณาใส่ชื่อใหม่สำหรับ "${selectedPresetName}":`, selectedPresetName);
    if (!newName || newName === selectedPresetName) return;
    
    const presetObj = presetsList.find(p => p.name === selectedPresetName);
    if (presetObj) {
      try {
        const currentPresetType = docType === 'report' ? 'report_preset' : 'request_preset';
        await docGeneratorService.renamePreset(presetObj.id, newName);
        const pList = await docGeneratorService.getPresets(currentPresetType);
        setPresetsList(pList);
        setSelectedPresetName(newName);
        alert('เปลี่ยนชื่อเรียบร้อยแล้ว');
      } catch (e) {
        alert('เกิดข้อผิดพลาดในการเปลี่ยนชื่อ หรือชื่อนี้อาจมีอยู่แล้ว');
      }
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file, 400, 0.9, 'image/png');
    const updated = { ...company, logo: compressed };
    setCompany(updated);
    await docGeneratorService.saveCompanySettings(updated);
  };

  const handleClearAllStorage = async () => {
    if (window.confirm('คุณต้องการลบข้อมูลประวัติทั้งหมดที่บันทึกไว้ใช่หรือไม่? (ลบจาก Cloud)')) {
      for (const r of reports) {
        await docGeneratorService.deleteDocument(r.id);
      }
      setReports([]);
      alert('ลบข้อมูลประวัติเรียบร้อยแล้ว');
    }
  };

  const handleClearForm = () => {
    if (!window.confirm('ต้องการล้างข้อมูลในฟอร์มเพื่อกลับไปเป็นฟอร์มว่างหรือไม่?')) return;
    setCurrentEditId(null);
    setSelectedPresetName('');
    if (docType === 'report') {
      setFormData({
        project: '', owner: '', date: todayStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
        tasks: defaultTasksList ? JSON.parse(JSON.stringify(defaultTasksList)) : createDefaultTasks(), issues: '', clock: new Array(12).fill(0),
        labor: defaultLaborList, equip: defaultEquipList,
        mat: [{ name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }],
        photos: [], signerName: '', signerRole: 'วิศวกรโครงการ', signerDate: todayStr(), signatureImage: null
      });
    } else {
      setReqData({
        project: '', owner: '', date: tomorrowStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
        tasks: createDefaultRequestTasks(), requesterName: '', requesterRole: 'ผู้จัดการโครงการ', requesterDate: todayStr(), requesterSignature: null,
        approverName: '', approverRole: 'ที่ปรึกษาโครงการฯ'
      });
    }
  };

  const handleSaveDefaultForm = async () => {
    if (!window.confirm('บันทึกรายการปฏิบัติงานชุดนี้เป็นค่าเริ่มต้น?\nเมื่อล้างฟอร์ม จะได้รายการนี้โดยอัตโนมัติ')) return;
    try {
      await docGeneratorService.saveDefaultTasks(docType, formData.tasks);
      setDefaultTasksList(JSON.parse(JSON.stringify(formData.tasks)));
      alert('บันทึกรายการเริ่มต้นเรียบร้อยแล้ว!');
    } catch(e) {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleSaveDoc = async () => {
    try {
      const currentData = docType === 'report' ? formData : reqData;
      const dataToSave = { ...currentData, docType, savedAt: new Date().toISOString() };
      
      const savedObj = await docGeneratorService.saveDocument(
        docType, 
        currentData.date, 
        currentData.project, 
        dataToSave,
        currentEditId
      );
      
      if (savedObj) {
        setCurrentEditId(savedObj.id);
        const docs = await docGeneratorService.getDocuments();
        setReports(docs.map(d => ({
          ...d.document_data, id: d.id, docType: d.doc_type, savedAt: d.created_at, date: d.date, project: d.project_name
        })));
        alert(`บันทึก ${docType === 'report' ? 'Daily Report' : 'Daily Request'} ลงในระบบ (Cloud) เรียบร้อยแล้ว`);
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึก: พื้นที่ข้อมูลใหญ่เกินไป');
    }
  };

  const handleEditDoc = (r) => {
    setCurrentEditId(r.id);
    if (r.docType === 'request') {
      setReqData({
        ...r,
        tasks: r.tasks || createDefaultRequestTasks()
      });
      setDocType('request');
    } else {
      setFormData({
        ...r,
        tasks: r.tasks || createDefaultTasks(),
        labor: r.labor && r.labor.length ? r.labor : defaultLaborList,
        equip: r.equip && r.equip.length ? r.equip : defaultEquipList,
        mat: r.mat && r.mat.length ? r.mat : [{ name: '', qty: '', unit: '' }],
        photos: r.photos || [],
        clock: r.clock ? [...r.clock] : new Array(12).fill(0)
      });
      setDocType('report');
    }
    setActiveTab('form');
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('ลบเอกสารนี้ใช่หรือไม่?')) return;
    await docGeneratorService.deleteDocument(id);
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
  };

  const handlePreview = () => {
    setPreviewData(docType === 'report' ? formData : reqData);
    setShowPreview(true);
    setTimeout(() => document.getElementById('previewCard')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handlePreviewHistory = (r) => {
    setDocType(r.docType || 'report');
    setPreviewData(r);
    setShowPreview(true);
    setTimeout(() => document.getElementById('previewCard')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleExportPdfA4 = () => {
    const targetId = reportTheme === 'modern' ? 'active-report-modern' : 'active-report-classic';
    exportToPdf(targetId, `${docType === 'report' ? 'Daily_Report' : 'Daily_Request'}_${previewData?.date}`);
  };

  const handleExportImageA4 = () => {
    const targetId = reportTheme === 'modern' ? 'active-report-modern' : 'active-report-classic';
    exportToImage(targetId, `${docType === 'report' ? 'Daily_Report' : 'Daily_Request'}_${previewData?.date}`);
  };

  const renderGeneralInfo = (data, setData) => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <h2 style={{ margin: 0 }}>ข้อมูลทั่วไป ({docType === 'report' ? 'Daily Report' : 'Daily Request'})</h2>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select 
            value={selectedPresetName} 
            onChange={(e) => {
              const val = e.target.value;
              setSelectedPresetName(val);
              const p = presetsList.find(x => x.name === val);
              if (p) applyPresetToForm(p.data);
            }}
            style={{ padding: '4px 8px', fontSize: '11.5px', maxWidth: '160px' }}
          >
            <option value="">-- ไม่ใช้ข้อมูลเริ่มต้น --</option>
            {presetsList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <button className="btn primary" onClick={handleSavePreset} style={{ fontSize: '11px', padding: '4px 8px' }}>บันทึกตั้งต้น</button>
          {selectedPresetName && (
             <>
               <button className="btn ghost" onClick={handleRenamePreset} style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--primary)' }}>เปลี่ยนชื่อ</button>
               <button className="btn ghost" onClick={handleDeletePreset} style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--danger)', borderColor: '#e2b6ab' }}>ลบ</button>
             </>
          )}
        </div>
      </div>
      <div className="grid">
        <div className="field">
          <label>โครงการ (เลือกจากทะเบียนโครงการ)</label>
          <select value={data.project} onChange={e => {
            const val = e.target.value;
            const p = projects.find(x => x.name === val);
            setData({ ...data, project: val, owner: p ? p.owner : '' });
          }}>
            <option value="">-- เลือกโครงการ --</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>เจ้าของโครงการ</label>
          <input type="text" value={(!data.owner || data.owner.trim() === '-' || data.owner.trim() === '') ? '' : data.owner} disabled style={{ background: '#f8fafc', color: '#64748b' }} placeholder="ดึงข้อมูลจากโครงการอัตโนมัติ" />
        </div>
        <div className="field">
          <label>{docType === 'report' ? 'วันที่' : 'วันที่ขออนุมัติ'}</label>
          <input type="date" value={data.date} onChange={e => setData({ ...data, date: e.target.value })} />
        </div>
        <div className="field">
          <label>ประเภทวันทำงาน</label>
          <select value={data.workType} onChange={e => setData({ ...data, workType: e.target.value })}>
            <option value="ปกติ">วันปกติ (Normal)</option>
            <option value="วันหยุด">วันหยุด (Holiday)</option>
          </select>
        </div>
        <div className="field">
          <label>เวลาทำงาน</label>
          <input type="text" value={data.time} onChange={e => setData({ ...data, time: e.target.value })} placeholder="เช่น 8.00 - 17.00 น." />
        </div>
      </div>
    </div>
  );

  const renderClockSvg = (clockArr, size = 95) => {
    const cx = size / 2; const cy = size / 2; const rOuter = size * 0.36; const rInner = size * 0.15; const rLabel = size * 0.44;
    const slices = [];
    for (let i = 0; i < 12; i++) {
      const startAngle = (i * 30 - 90) * Math.PI / 180; const endAngle = ((i + 1) * 30 - 90) * Math.PI / 180;
      const x1 = cx + rInner * Math.cos(startAngle); const y1 = cy + rInner * Math.sin(startAngle);
      const x2 = cx + rOuter * Math.cos(startAngle); const y2 = cy + rOuter * Math.sin(startAngle);
      const x3 = cx + rOuter * Math.cos(endAngle); const y3 = cy + rOuter * Math.sin(endAngle);
      const x4 = cx + rInner * Math.cos(endAngle); const y4 = cy + rInner * Math.sin(endAngle);
      const d = `M ${x1} ${y1} L ${x2} ${y2} A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${rInner} ${rInner} 0 0 0 ${x1} ${y1} Z`;
      const hourNum = i + 1; const hourAngle = ((hourNum * 30) - 90) * Math.PI / 180;
      const lx = cx + rLabel * Math.cos(hourAngle); const ly = cy + rLabel * Math.sin(hourAngle);
      slices.push(
        <g key={i}>
          <path d={d} fill={clockColors[clockArr[i] || 0]} stroke="#fff" strokeWidth="1.2" style={{ cursor: 'pointer' }} onClick={() => {
            setFormData(prev => { const nextClock = [...prev.clock]; nextClock[i] = (nextClock[i] + 1) % 3; return { ...prev, clock: nextClock }; });
          }} />
          <text x={lx} y={ly + 3} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#333">{hourNum}</text>
        </g>
      );
    }
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{slices}<circle cx={cx} cy={cy} r={rInner - 1} fill="#fff" stroke="#ccc" /></svg>;
  };

  const render12ResourceRows = (list, isQtyWithUnit = false, unitStr = '') => {
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const item = (list || [])[i] || { name: '', qty: '' };
      const displayQty = item.qty ? (isQtyWithUnit ? `${item.qty} ${unitStr}` : (item.unit ? `${item.qty} ${item.unit}` : item.qty)) : '';
      rows.push(<tr key={i}><td style={{ height: '19px' }}>{item.name || '\u00A0'}</td><td style={{ textAlign: 'right', fontWeight: 'bold', width: '70px' }}>{displayQty}</td></tr>);
    }
    return rows;
  };

  const renderFullReportPages = (data, themeClass) => {
    const chunkPhotos = (arr, size = 6) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };
    const photoChunks = chunkPhotos(data.photos || [], 6);
    return (
      <>
        {/* PAGE 1: MAIN DAILY REPORT */}
        <div className={`a4-page ${themeClass}`}>
          <div className="report-header">
            <div className="header-top">
              <div className="logo-company">
                {company.logo && <img src={company.logo} alt="Company Logo" />}
                <div className="company-name">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
              </div>
              <div className="doc-header-title">
                <div className="doc-main-title">DAILY REPORT</div>
                <div className="doc-sub-title">รายงานการปฏิบัติงานประจำวัน</div>
              </div>
            </div>
            <div className="header-divider"></div>
            <div className="header-meta-grid">
              <div className="meta-left">
                <div className="meta-item"><b>โครงการ:</b> {data.project || '-'}</div>
                <div className="meta-item"><b>เจ้าของโครงการ:</b> {data.owner || '-'}</div>
              </div>
              <div className="meta-right">
                <div className="meta-right-inline">
                  <div className="meta-item"><b>วันที่:</b> {formatThaiDate(data.date)}</div>
                  <div className="meta-item"><b>ประเภทวัน:</b> {data.workType || 'ปกติ'}</div>
                </div>
                <div className="meta-item" style={{ marginTop: '2px' }}><b>เวลาทำงาน:</b> {data.time || '8.00 - 17.00 น.'}</div>
              </div>
            </div>
          </div>

          <div className="section-title-wrap">
            <div className="section-title-text">รายการปฏิบัติงานประจำวัน (Daily Progress Log)</div>
          </div>
          <table className="report-tasks-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}>ลำดับ</th>
                <th>รายการ</th>
                <th style={{ width: '50px' }}>จำนวน</th>
                <th style={{ width: '40px' }}>หน่วย</th>
                <th style={{ width: '200px' }}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {(data.tasks || []).map((t, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td>{t.item}</td>
                  <td style={{ textAlign: 'center' }}>{t.qty}</td>
                  <td style={{ textAlign: 'center' }}>{t.unit}</td>
                  <td>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="issues-weather-row">
            <div className="issues-col">
              <div className="section-title-wrap">
                <div className="section-title-text">ปัญหาและอุปสรรค (Issues & Comments)</div>
              </div>
              <div className="issues-content-box">{data.issues || '-'}</div>
            </div>
            <div className="weather-col">
              <div className="section-title-wrap">
                <div className="section-title-text">สภาพอากาศ (Weather Conditions)</div>
              </div>
              <div className="weather-content-box">
                <div className="clock-dial-wrap">
                  {renderClockSvg(data.clock || new Array(12).fill(0), 95)}
                </div>
                <div className="weather-legend-wrap">
                  <div><span className="swatch-legend" style={{ background: '#4a8c3f' }}></span> ไม่มีฝนตก</div>
                  <div><span className="swatch-legend" style={{ background: '#e0b93c' }}></span> ฝนตกเบา</div>
                  <div><span className="swatch-legend" style={{ background: '#b23b2f' }}></span> ฝนตกหนัก</div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-title-wrap">
            <div className="section-title-text">สรุปทรัพยากรหน้างาน (Site Resources Overview)</div>
          </div>
          <div className="resources-3col-grid">
            <div className="resource-col">
              <div className="resource-col-header">แรงงาน (Manpower)</div>
              <table className="resource-col-table">
                <tbody>{render12ResourceRows(data.labor, true, 'คน')}</tbody>
              </table>
            </div>
            <div className="resource-col">
              <div className="resource-col-header">เครื่องจักร - อุปกรณ์ (Machinery)</div>
              <table className="resource-col-table">
                <tbody>{render12ResourceRows(data.equip, true, 'คัน/ชุด')}</tbody>
              </table>
            </div>
            <div className="resource-col">
              <div className="resource-col-header">วัสดุเข้าหน่วยงาน (Materials)</div>
              <table className="resource-col-table">
                <tbody>{render12ResourceRows(data.mat, false)}</tbody>
              </table>
            </div>
          </div>

          <div className="page-signer-row">
            <div className="signer-box" style={{ position: 'relative' }}>
              {data.signatureImage && (
                <img src={data.signatureImage} alt="signature" style={{ position: 'absolute', bottom: '35px', left: '50%', transform: 'translateX(-50%)', maxHeight: '55px', maxWidth: '100%', objectFit: 'contain' }} />
              )}
              <div className="signer-line" style={{ marginTop: '24px' }}></div>
              <div className="signer-name">({data.signerName || '....................................................'})</div>
              <div className="signer-role">ตำแหน่ง: {data.signerRole || 'วิศวกรโครงการ'}</div>
              <div className="signer-date">วันที่: {formatThaiDate(data.signerDate || data.date)}</div>
            </div>
          </div>
        </div>

        {photoChunks.map((chunk, pageIndex) => (
          <div key={`photo-page-${pageIndex}`} className={`a4-page ${themeClass}`}>
            <div className="report-header">
              <div className="header-top">
                <div className="logo-company">
                  {company.logo && <img src={company.logo} alt="Company Logo" />}
                  <div className="company-name">{company.name || 'บริษัท ซัน คอนแทรคเตอร์ จำกัด'}</div>
                </div>
                <div className="doc-header-title">
                  <div className="doc-main-title">DAILY REPORT</div>
                  <div className="doc-sub-title">เอกสารแนบ: รูปภาพการทำงาน (แผ่นที่ {pageIndex + 1}/{photoChunks.length})</div>
                </div>
              </div>
              <div className="header-divider"></div>
              <div className="header-meta-grid">
                <div className="meta-left">
                  <div className="meta-item"><b>โครงการ:</b> {data.project || '-'}</div>
                  <div className="meta-item"><b>เจ้าของโครงการ:</b> {data.owner || '-'}</div>
                </div>
                <div className="meta-right">
                  <div className="meta-right-inline">
                    <div className="meta-item"><b>วันที่:</b> {formatThaiDate(data.date)}</div>
                    <div className="meta-item"><b>ประเภทวัน:</b> {data.workType || 'ปกติ'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="photo-grid-6">
              {chunk.map((url, i) => (
                <div key={i} className="photo-frame">
                  <img src={url} alt={`attachment-${pageIndex}-${i}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="doc-gen-root app">
      <div className="topbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1>Daily Request - Report</h1>
            <div className="sub">ระบบสร้างรายงานประจำวัน และขออนุมัติปฏิบัติงานประจำวัน</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: '#fff', padding: '4px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button className={`btn ${docType === 'report' ? 'primary' : 'ghost'}`} style={{ border: 'none' }} onClick={() => { setDocType('report'); setActiveTab('form'); setShowPreview(false); }}>Daily Report</button>
            <button className={`btn ${docType === 'request' ? 'primary' : 'ghost'}`} style={{ border: 'none' }} onClick={() => { setDocType('request'); setActiveTab('form'); setShowPreview(false); }}>Daily Request</button>
          </div>
        </div>
        <div className="tabs">
          <button className={activeTab === 'form' ? 'active' : ''} onClick={() => { setActiveTab('form'); setShowPreview(false); }}>ฟอร์มข้อมูล</button>
          <button className={activeTab === 'list' ? 'active' : ''} onClick={() => { setActiveTab('list'); setShowPreview(false); }}>ประวัติรายการ ({reports.length})</button>
          <button className={activeTab === 'company' ? 'active' : ''} onClick={() => { setActiveTab('company'); setShowPreview(false); }}>ตั้งค่า / ทะเบียน</button>
        </div>
      </div>

      {activeTab === 'form' && (
        <div id="formTab">
          {docType === 'report' ? (
            <>
              {renderGeneralInfo(formData, setFormData)}

              <div className="card">
                <h2>รายการปฏิบัติงานประจำวัน</h2>

                {/* PC Table */}
                <div className="table-scroll-wrap task-table-desktop">
                  <table className="entry-table" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>ลำดับ</th>
                      <th>รายการ</th>
                      <th style={{ width: '80px' }}>จำนวน</th>
                      <th style={{ width: '80px' }}>หน่วย</th>
                      <th>หมายเหตุ</th>
                      <th style={{ width: '36px' }}></th>
                    </tr></thead>
                    <tbody>
                      {formData.tasks.map((t, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: 'center' }}>{i + 1}</td>
                          <td><input type="text" value={t.item} onChange={e => {
                            const n = [...formData.tasks]; n[i].item = e.target.value; setFormData({ ...formData, tasks: n });
                          }} /></td>
                          <td><input type="text" value={t.qty} onChange={e => {
                            const n = [...formData.tasks]; n[i].qty = e.target.value; setFormData({ ...formData, tasks: n });
                          }} /></td>
                          <td><input type="text" value={t.unit} onChange={e => {
                            const n = [...formData.tasks]; n[i].unit = e.target.value; setFormData({ ...formData, tasks: n });
                          }} /></td>
                          <td><input type="text" value={t.note} onChange={e => {
                            const n = [...formData.tasks]; n[i].note = e.target.value; setFormData({ ...formData, tasks: n });
                          }} /></td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="icon-btn danger" onClick={() => {
                              setFormData({ ...formData, tasks: formData.tasks.filter((_, idx) => idx !== i) });
                            }} title="ลบแถว">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="task-cards-mobile">
                  {formData.tasks.map((t, i) => (
                    <div key={i} className="task-mobile-card">
                      <div className="task-mobile-card-header">
                        <span>รายการที่ {i + 1}</span>
                        <button className="icon-btn danger" onClick={() => {
                          setFormData({ ...formData, tasks: formData.tasks.filter((_, idx) => idx !== i) });
                        }}>✕</button>
                      </div>
                      <div className="field">
                        <label>รายการงาน</label>
                        <input type="text" value={t.item} placeholder="ระบุรายการงาน" onChange={e => {
                          const n = [...formData.tasks]; n[i].item = e.target.value; setFormData({ ...formData, tasks: n });
                        }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="field">
                          <label>จำนวน</label>
                          <input type="text" value={t.qty} placeholder="เช่น 150" onChange={e => {
                            const n = [...formData.tasks]; n[i].qty = e.target.value; setFormData({ ...formData, tasks: n });
                          }} />
                        </div>
                        <div className="field">
                          <label>หน่วย</label>
                          <input type="text" value={t.unit} placeholder="งาน / ตร.ม." onChange={e => {
                            const n = [...formData.tasks]; n[i].unit = e.target.value; setFormData({ ...formData, tasks: n });
                          }} />
                        </div>
                      </div>
                      <div className="field">
                        <label>หมายเหตุ</label>
                        <input type="text" value={t.note} placeholder="หมายเหตุ (ถ้ามี)" onChange={e => {
                          const n = [...formData.tasks]; n[i].note = e.target.value; setFormData({ ...formData, tasks: n });
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shared buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="add-row-btn" onClick={() => {
                    setFormData({ ...formData, tasks: [...formData.tasks, { item: '', qty: '', unit: 'งาน', note: '' }] });
                  }}>+ เพิ่มรายการ</button>
                  <button className="btn ghost" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={handleSaveDefaultForm}
                    title="บันทึกรายการชุดนี้เป็นค่าเริ่มต้น เมื่อล้างฟอร์มจะได้รายการนี้">
                    💾 บันทึกเป็นรายการเริ่มต้น
                  </button>
                  {defaultFormCache && (
                    <span style={{ fontSize: '11px', color: '#6b6558' }}>✅ มีรายการเริ่มต้นบันทึกไว้แล้ว</span>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>ปัญหาและอุปสรรค</label>
                    <textarea rows="4" value={formData.issues} onChange={e => setFormData({ ...formData, issues: e.target.value })} placeholder="กรอกปัญหาและอุปสรรค หรือ '-' หากไม่มี" style={{ minHeight: '125px', resize: 'vertical' }} />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: '13px', fontWeight: 'bold' }}>สภาพอากาศ (คลิกที่เข็มนาฬิกาเพื่อเปลี่ยนสี)</label>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px 16px', minHeight: '125px' }}>
                      <div className="clock-dial-wrap">{renderClockSvg(formData.clock, 115)}</div>
                      <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4a8c3f', borderRadius: '50%' }}></span> ไม่มีฝนตก</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#e0b93c', borderRadius: '50%' }}></span> ฝนตกเบา</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#b23b2f', borderRadius: '50%' }}></span> ฝนตกหนัก</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid">
                <div className="card">
                  <h2>แรงงาน</h2>
                  <div className="table-scroll-wrap"><table className="entry-table">
                    <thead><tr><th>รายการ</th><th style={{ width: '100px' }}>จำนวน (คน)</th><th style={{ width: '40px' }}></th></tr></thead>
                    <tbody>
                      {formData.labor.map((x, i) => (
                        <tr key={i}>
                          <td><input type="text" value={x.name} onChange={e => {
                            const n = [...formData.labor]; n[i].name = e.target.value; setFormData({ ...formData, labor: n });
                          }} /></td>
                          <td><input type="text" value={x.qty} onChange={e => {
                            const n = [...formData.labor]; n[i].qty = e.target.value; setFormData({ ...formData, labor: n });
                          }} /></td>
                          <td className="row-actions"><button className="icon-btn danger" onClick={() => setFormData({ ...formData, labor: formData.labor.filter((_, idx) => idx !== i) })}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                  <button className="add-row-btn" style={{ marginTop: '10px' }} onClick={() => setFormData({ ...formData, labor: [...formData.labor, { name: '', qty: '' }] })}>+ เพิ่มรายการ</button>
                </div>
                
                <div className="card">
                  <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '15px' }}>เครื่องจักร - อุปกรณ์</h3>
                  <div className="table-scroll-wrap"><table className="entry-table">
                    <thead><tr><th>รายการ</th><th style={{ width: '100px' }}>จำนวน</th><th style={{ width: '40px' }}></th></tr></thead>
                    <tbody>
                      {formData.equip.map((x, i) => (
                        <tr key={i}>
                          <td><input type="text" value={x.name} onChange={e => {
                            const n = [...formData.equip]; n[i].name = e.target.value; setFormData({ ...formData, equip: n });
                          }} /></td>
                          <td><input type="text" value={x.qty} onChange={e => {
                            const n = [...formData.equip]; n[i].qty = e.target.value; setFormData({ ...formData, equip: n });
                          }} /></td>
                          <td className="row-actions"><button className="icon-btn danger" onClick={() => setFormData({ ...formData, equip: formData.equip.filter((_, idx) => idx !== i) })}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                  <button className="add-row-btn" style={{ marginTop: '10px' }} onClick={() => setFormData({ ...formData, equip: [...formData.equip, { name: '', qty: '' }] })}>+ เพิ่มรายการ</button>
                </div>
              </div>

              <div className="card">
                <h2>วัสดุที่เข้าหน่วยงาน</h2>
                  
                  {/* PC Table */}
                  <div className="table-scroll-wrap task-table-desktop">
                    <table className="entry-table" style={{ width: '100%' }}>
                      <thead><tr><th>รายการ</th><th style={{ width: '100px' }}>จำนวน</th><th style={{ width: '80px' }}>หน่วย</th><th style={{ width: '40px' }}></th></tr></thead>
                      <tbody>
                        {formData.mat.map((x, i) => (
                          <tr key={i}>
                            <td><input type="text" value={x.name} onChange={e => {
                              const n = [...formData.mat]; n[i].name = e.target.value; setFormData({ ...formData, mat: n });
                            }} /></td>
                            <td><input type="text" value={x.qty} onChange={e => {
                              const n = [...formData.mat]; n[i].qty = e.target.value; setFormData({ ...formData, mat: n });
                            }} /></td>
                            <td><input type="text" value={x.unit} onChange={e => {
                              const n = [...formData.mat]; n[i].unit = e.target.value; setFormData({ ...formData, mat: n });
                            }} /></td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="icon-btn danger" onClick={() => {
                                setFormData({ ...formData, mat: formData.mat.filter((_, idx) => idx !== i) });
                              }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="task-cards-mobile">
                    {formData.mat.map((x, i) => (
                      <div key={i} className="task-mobile-card">
                        <div className="task-mobile-card-header">
                          <span>รายการวัสดุที่ {i + 1}</span>
                          <button className="icon-btn danger" onClick={() => {
                            setFormData({ ...formData, mat: formData.mat.filter((_, idx) => idx !== i) });
                          }}>✕</button>
                        </div>
                        <div className="field">
                          <label>ชื่อวัสดุ</label>
                          <input type="text" value={x.name} placeholder="เช่น ปูนซีเมนต์" onChange={e => {
                            const n = [...formData.mat]; n[i].name = e.target.value; setFormData({ ...formData, mat: n });
                          }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div className="field">
                            <label>จำนวน</label>
                            <input type="text" value={x.qty} placeholder="เช่น 10" onChange={e => {
                              const n = [...formData.mat]; n[i].qty = e.target.value; setFormData({ ...formData, mat: n });
                            }} />
                          </div>
                          <div className="field">
                            <label>หน่วย</label>
                            <input type="text" value={x.unit} placeholder="เช่น ถุง" onChange={e => {
                              const n = [...formData.mat]; n[i].unit = e.target.value; setFormData({ ...formData, mat: n });
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="add-row-btn" style={{ marginTop: '10px' }} onClick={() => setFormData({ ...formData, mat: [...formData.mat, { name: '', qty: '', unit: '' }] })}>+ เพิ่มรายการ</button>
              </div>

              <div className="card">
                <h2>รูปภาพการทำงาน (Work Photos - แสดงแผ่นละ 6 รูปในเอกสารแนบ)</h2>
                <div className="photo-uploader">
                  {formData.photos.map((url, i) => (
                    <div key={i} className="photo-card">
                      <img src={url} alt={`work-${i}`} />
                      <button className="del-btn" onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_, idx) => idx !== i) })}>X</button>
                    </div>
                  ))}
                  <label className="photo-upload-box" onDrop={async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
                      for (const file of files) {
                        const compressedUrl = await compressImage(file, 1000, 0.75);
                        setFormData(prev => ({ ...prev, photos: [...prev.photos, compressedUrl] }));
                      }
                    }
                  }} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} title="คลิกเพื่อเลือกไฟล์ หรือลากรูปภาพมาวางที่นี่ (Drag & Drop)">
                    <span style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>+</span>
                    <span>คลิก หรือ ลากรูปภาพมาวางที่นี่</span>
                    <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                      const files = Array.from(e.target.files);
                      for (const file of files) {
                        const compressedUrl = await compressImage(file, 1000, 0.75);
                        setFormData(prev => ({ ...prev, photos: [...prev.photos, compressedUrl] }));
                      }
                    }} />
                  </label>
                </div>
              </div>

              <div className="card">
                <h2>ผู้บันทึกรายงาน</h2>
                <div className="grid">
                  <div className="field"><label>ชื่อ-สกุล</label><input type="text" value={formData.signerName} onChange={e => setFormData({ ...formData, signerName: e.target.value })} placeholder="ชื่อผู้บันทึก" /></div>
                  <div className="field"><label>ตำแหน่ง</label><input type="text" value={formData.signerRole} onChange={e => setFormData({ ...formData, signerRole: e.target.value })} placeholder="เช่น วิศวกรโครงการ" /></div>
                  <div className="field"><label>วันที่บันทึก</label><input type="date" value={formData.signerDate} onChange={e => setFormData({ ...formData, signerDate: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <SignaturePad currentSignature={formData.signatureImage} onSave={(imgBase64) => setFormData({ ...formData, signatureImage: imgBase64 })} />
                </div>
              </div>
            </>
          ) : (
            <>
              {renderGeneralInfo(reqData, setReqData)}
              
              <div className="card">
                <h2>รายการขอปฏิบัติงาน</h2>
                <div className="table-scroll-wrap"><table className="entry-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>ลำดับ</th>
                      <th>รายละเอียดงาน</th>
                      <th style={{ width: '200px' }}>ผู้ควบคุมงาน</th>
                      <th style={{ width: '200px' }}>หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqData.tasks.map((t, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                        <td><input type="text" value={t.item} onChange={e => {
                          const n = [...reqData.tasks]; n[i].item = e.target.value; setReqData({ ...reqData, tasks: n });
                        }} /></td>
                        <td><input type="text" value={t.supervisor} onChange={e => {
                          const n = [...reqData.tasks]; n[i].supervisor = e.target.value; setReqData({ ...reqData, tasks: n });
                        }} /></td>
                        <td><input type="text" value={t.note} onChange={e => {
                          const n = [...reqData.tasks]; n[i].note = e.target.value; setReqData({ ...reqData, tasks: n });
                        }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>

              <div className="card">
                <h2>ข้อมูลผู้ขออนุมัติ</h2>
                <div className="grid">
                  <div className="field">
                    <label>ชื่อ-สกุล</label>
                    <input type="text" value={reqData.requesterName} onChange={e => setReqData({ ...reqData, requesterName: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>ตำแหน่ง</label>
                    <input type="text" value={reqData.requesterRole} onChange={e => setReqData({ ...reqData, requesterRole: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>วันที่ขออนุมัติ</label>
                    <input type="date" value={reqData.requesterDate} onChange={e => setReqData({ ...reqData, requesterDate: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <SignaturePad currentSignature={reqData.requesterSignature} onSave={(imgBase64) => setReqData({ ...reqData, requesterSignature: imgBase64 })} />
                </div>
                
                <h2 style={{ marginTop: '32px' }}>ผู้อนุมัติ (เว้นว่างไว้ให้เซ็นภายหลังได้)</h2>
                <div className="grid">
                  <div className="field">
                    <label>ชื่อ-สกุล</label>
                    <input type="text" value={reqData.approverName} onChange={e => setReqData({ ...reqData, approverName: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>ตำแหน่ง</label>
                    <input type="text" value={reqData.approverRole} onChange={e => setReqData({ ...reqData, approverRole: e.target.value })} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="btnbar no-print">
            <button className="btn ghost" onClick={handleClearForm}>ล้างฟอร์ม</button>
            <button className="btn primary" onClick={handleSaveDoc}>บันทึกรายการ</button>
            <button className="btn primary" onClick={handlePreview}>ดูตัวอย่างและส่งออก PDF / PNG A4</button>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div id="listTab">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: 0, border: 'none' }}>รายงานที่บันทึกไว้</h2>
              {reports.length > 0 && <button className="btn ghost" onClick={handleClearAllStorage} style={{ color: '#a13a2f', borderColor: '#e2b6ab' }}>ล้างข้อมูลประวัติทั้งหมด</button>}
            </div>
            {reports.length === 0 ? <p style={{ color: 'var(--gray)', fontSize: '13px' }}>ยังไม่มีรายการ</p> : (
              reports.slice().reverse().map(r => (
                <div key={r.id} className="list-card">
                  <div className="meta">
                    <b>
                       <span style={{
                         display: 'inline-block',
                         padding: '2px 6px',
                         background: r.docType === 'request' ? '#dbeafe' : '#f0fdf4',
                         color: r.docType === 'request' ? '#1e40af' : '#166534',
                         borderRadius: '4px',
                         fontSize: '11px',
                         marginRight: '8px'
                       }}>
                         {r.docType === 'request' ? 'Request' : 'Report'}
                       </span>
                       {r.project || '(ไม่ระบุชื่อโครงการ)'}
                    </b>
                    <span>วันที่ {formatThaiDate(r.date)} · {r.workType || ''} · บันทึกโดย {r.signerName || r.requesterName || '-'}</span>
                  </div>
                  <div className="actions">
                    <button className="btn ghost" onClick={() => handleEditDoc(r)}>แก้ไข</button>
                    <button className="btn primary" onClick={() => handlePreviewHistory(r)}>ดู/พิมพ์/ส่งออก</button>
                    <button className="btn ghost" onClick={() => handleDeleteDoc(r.id)} style={{ color: '#a13a2f' }}>ลบ</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div id="companyTab">
          <div className="card">
            <h2>ตั้งค่าบริษัท (ใช้แสดงบนหัวรายงาน)</h2>
            <div className="grid">
              <div className="field"><label>ชื่อบริษัท</label><input type="text" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} placeholder="เช่น บริษัท ซัน คอนแทรคเตอร์ จำกัด" /></div>
              <div className="field"><label>โลโก้บริษัท (รูปภาพ PNG / JPG)</label><input type="file" accept="image/*" onChange={handleLogoUpload} /></div>
            </div>
            {company.logo && (
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div><label>ตัวอย่างโลโก้:</label><img src={company.logo} alt="logo" style={{ height: '50px', objectFit: 'contain', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px' }} /></div>
                <button className="btn ghost" type="button" onClick={() => { const updated = { ...company, logo: '/logo.png' }; setCompany(updated); localStorage.setItem(COMPANY_KEY, JSON.stringify(updated)); alert('รีเซ็ตเป็นโลโก้เริ่มต้น (logo.png) เรียบร้อยแล้ว'); }} style={{ fontSize: '12px', padding: '6px 12px', marginTop: '14px' }}>ใช้โลโก้เริ่มต้น (logo.png)</button>
              </div>
            )}
            <div className="btnbar no-print" style={{ marginTop: '14px', justifyContent: 'flex-end' }}><button className="btn primary" onClick={handleSaveCompany}>บันทึกการตั้งค่าบริษัท</button></div>
            
            <div className="header-divider" style={{ margin: '24px 0' }}></div>
            
            <h2>ทะเบียนโครงการ (Projects Registry)</h2>
            <div className="grid" style={{ gridTemplateColumns: '1.5fr 1.2fr auto', gap: '12px', alignItems: 'flex-end', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div className="field" style={{ margin: 0 }}>
                <label>ชื่อโครงการใหม่</label>
                <input type="text" id="newProjName" placeholder="เช่น ปรับปรุงสำนักงานศูนย์บริการรถยนต์..." />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>เจ้าของโครงการ</label>
                <input type="text" id="newProjOwner" placeholder="เช่น บริษัท โตโยต้า นครพิงค์ เชียงใหม่ จำกัด" />
              </div>
              <div>
                <button className="btn primary" style={{ height: '38px', whiteSpace: 'nowrap' }} onClick={async () => {
                  const n = document.getElementById('newProjName').value.trim();
                  const o = document.getElementById('newProjOwner').value.trim();
                  if(n){
                    const newProj = await docGeneratorService.addProject(n, o);
                    if (newProj) setProjects([...projects, newProj]);
                    document.getElementById('newProjName').value = '';
                    document.getElementById('newProjOwner').value = '';
                  } else {
                    alert('กรุณากรอกชื่อโครงการ');
                  }
                }}>+ เพิ่มโครงการ</button>
              </div>
            </div>

            <div className="table-scroll-wrap"><table className="entry-table" style={{ width: '100%' }}>
               <thead>
                 <tr>
                   <th style={{ width: '45px', textAlign: 'center' }}>ลำดับ</th>
                   <th style={{ width: '55%' }}>ชื่อโครงการ (แก้ไขได้โดยตรง)</th>
                   <th style={{ width: '35%' }}>เจ้าของโครงการ (แก้ไขได้โดยตรง)</th>
                   <th style={{ width: '70px', textAlign: 'center' }}>จัดการ</th>
                 </tr>
               </thead>
               <tbody>
                  {projects.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>ยังไม่มีข้อมูลโครงการในทะเบียน</td></tr>}
                  {projects.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>{idx + 1}</td>
                      <td>
                        <input
                          type="text"
                          value={p.name}
                          onChange={e => {
                            const val = e.target.value;
                            setProjects(projects.map(x => x.id === p.id ? { ...x, name: val } : x));
                          }}
                          onBlur={async e => {
                            const val = e.target.value;
                            await docGeneratorService.updateProject(p.id, { name: val });
                          }}
                          placeholder="ชื่อโครงการ"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={p.owner}
                          onChange={e => {
                            const val = e.target.value;
                            setProjects(projects.map(x => x.id === p.id ? { ...x, owner: val } : x));
                          }}
                          onBlur={async e => {
                            const val = e.target.value;
                            await docGeneratorService.updateProject(p.id, { owner: val });
                          }}
                          placeholder="เจ้าของโครงการ"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="icon-btn danger"
                          title="ลบโครงการ"
                          onClick={async () => {
                            if(window.confirm(`ลบโครงการ "${p.name}" ออกจากทะเบียน?`)) {
                              await docGeneratorService.deleteProject(p.id);
                              setProjects(projects.filter(x => x.id !== p.id));
                            }
                          }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table></div>

          </div>
        </div>
      )}

      {showPreview && previewData && (
        <div className="card no-print" id="previewCard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, border: 'none' }}>ตัวอย่างและส่งออกรายงาน</h2>
            <div className="tabs" style={{ gap: '4px' }}>
              <button className={reportTheme === 'modern' ? 'active' : ''} onClick={() => setReportTheme('modern')}>สไตล์โมเดิร์น (Executive)</button>
              <button className={reportTheme === 'classic' ? 'active' : ''} onClick={() => setReportTheme('classic')}>สไตล์คลาสสิก (Standard Form)</button>
            </div>
          </div>
          <div className="btnbar" style={{ justifyContent: 'flex-start', marginBottom: '14px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <button className="btn primary" onClick={handleExportPdfA4} style={{ background: '#2f5233' }}>ส่งออกเป็น PDF (ขนาด A4)</button>
            <button className="btn primary" onClick={handleExportImageA4} style={{ background: '#0284c7' }}>ส่งออกเป็นรูปภาพ PNG (ขนาด A4)</button>
            <button className="btn ghost" onClick={() => window.print()}>พิมพ์เอกสาร</button>
          </div>
          <div className="a4-container">
            <div id={`active-report-${reportTheme}`} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {docType === 'report' 
                ? renderFullReportPages(previewData, reportTheme === 'modern' ? 'modern-theme' : 'classic-theme') 
                : <DailyRequestView data={previewData} company={company} themeClass={reportTheme === 'modern' ? 'modern-theme' : 'classic-theme'} formatThaiDate={formatThaiDate} />}
            </div>
          </div>
          <div className="btnbar" style={{ marginTop: '12px' }}><button className="btn ghost" onClick={() => setShowPreview(false)}>ปิด</button></div>
        </div>
      )}

      {previewData && (
        <div id="printableCard" style={{ display: 'none' }}>
          <div className="a4-container">
            {docType === 'report' 
                ? renderFullReportPages(previewData, reportTheme === 'modern' ? 'modern-theme' : 'classic-theme') 
                : <DailyRequestView data={previewData} company={company} themeClass={reportTheme === 'modern' ? 'modern-theme' : 'classic-theme'} formatThaiDate={formatThaiDate} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
