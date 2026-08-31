import './index.css';
import React, { useState, useEffect, useRef } from 'react';
import { exportToPdf, generatePdfBase64 } from './utils/exportPdf';
import { uploadToGoogleDrive, testGoogleDriveWebhook } from './utils/googleDriveService';
import { exportToImage } from './utils/exportImage';
import SignaturePad from './components/SignaturePad';
import { DailyRequestView, createDefaultRequestTasks } from './components/DailyRequest';
import { PurchaseRequisitionView, createDefaultPrItems } from './components/PurchaseRequisition';
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
  { name: 'รถเทเลอร์', qty: '', unit: 'คัน' },
  { name: 'รถแบคโฮ', qty: '', unit: 'คัน' },
  { name: 'รถเครน', qty: '', unit: 'คัน' },
  { name: 'เครื่องระดับ', qty: '', unit: 'ชุด' },
  { name: 'กล้อง Total Station', qty: '', unit: 'ชุด' },
  { name: 'เครื่องเชื่อม', qty: '', unit: 'เครื่อง' },
  { name: 'เครื่องตัดเหล็ก', qty: '', unit: 'เครื่อง' },
  { name: 'เครื่องดัดเหล็ก', qty: '', unit: 'เครื่อง' },
  { name: 'เครื่องผสมปูน', qty: '', unit: 'เครื่อง' },
  { name: 'เครื่องสูบน้ำ', qty: '', unit: 'เครื่อง' },
  { name: 'รถกระบะ', qty: '', unit: 'คัน' },
  { name: 'อื่นๆ', qty: '', unit: '' }
];

const createDefaultTasks = () => [{ item: '', qty: '', unit: '', note: '' }];

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

function ScaledA4Page({ children, scale = 1 }) {
  if (scale >= 0.99) {
    return (
      <div className="a4-page-wrapper">
        {children}
      </div>
    );
  }
  return (
    <div
      className="a4-page-wrapper"
      style={{
        width: `${Math.round(794 * scale)}px`,
        height: `${Math.round(1123 * scale)}px`,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
        background: "#ffffff",
        borderRadius: "4px"
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: "794px",
          height: "1123px",
          position: "absolute",
          top: 0,
          left: 0
        }}
      >
        {children}
      </div>
    </div>
  );
}

function calculateNextPrNo(projectName, projectsList, reportsList) {
  if (!projectName) return '';
  const proj = (projectsList || []).find(p => p.name === projectName);
  let prefix = proj?.pr_prefix ? proj.pr_prefix.trim() : 'PR-';
  if (!prefix.endsWith('-')) {
    prefix = prefix + '-';
  }
  const startNo = parseInt(proj?.pr_start_no || '1', 10) || 1;
  const prDocs = (reportsList || []).filter(r => r.docType === 'pr' && r.project === projectName && r.prNo);
  let maxSeq = startNo - 1;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escaped}(\\d+)`, 'i');

  prDocs.forEach(d => {
    const match = String(d.prNo).trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(3, '0');
  return `${prefix}${padded}`;
}

function App() {
  const [docType, setDocType] = useState('report'); 
  const [activeTab, setActiveTab] = useState('hub');
  const [currentEditId, setCurrentEditId] = useState(null);
  const [reportTheme, setReportTheme] = useState('modern');
  const [previewScale, setPreviewScale] = useState(0.85);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [currentDocStatus, setCurrentDocStatus] = useState('completed');
  const [hubFilter, setHubFilter] = useState('all');
  const [hubSearch, setHubSearch] = useState('');
  const [hubProject, setHubProject] = useState('');
  const [isNewDocMenuOpen, setIsNewDocMenuOpen] = useState(false);
  const [driveSettings, setDriveSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('doc_generator_google_drive_v1');
      return raw ? JSON.parse(raw) : { webhookUrl: '', folderId: '', autoUpload: true };
    } catch(e) {
      return { webhookUrl: '', folderId: '', autoUpload: true };
    }
  });
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveTestStatus, setDriveTestStatus] = useState(null);
  const [showDriveGuideModal, setShowDriveGuideModal] = useState(false);
  
  const [company, setCompany] = useState(() => {
    try {
      const cached = localStorage.getItem(COMPANY_KEY);
      return cached ? JSON.parse(cached) : { name: 'บริษัท ซัน คอนแทรคเตอร์ จำกัด', logo: '/logo.png' };
    } catch(e) {
      return { name: 'บริษัท ซัน คอนแทรคเตอร์ จำกัด', logo: '/logo.png' };
    }
  });
  
  const [projects, setProjects] = useState(() => {
    try {
      const cached = localStorage.getItem(PROJECTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch(e) {
      return [];
    }
  });

  const [allPresetsCache, setAllPresetsCache] = useState({ report: [], request: [], pr: [] });
  const [defaultFormsMap, setDefaultFormsMap] = useState({ report: null, request: null, pr: null });

  const [preset, setPreset] = useState({
    defaultProject: '',
    defaultOwner: '',
    defaultWorkType: 'ปกติ',
    defaultTime: '8.00 - 17.00 น.',
    defaultSignerRole: '',
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
    reqDefaultRequesterRole: '',
    reqDefaultRequesterSignature: null,
    reqDefaultApproverName: '',
    reqDefaultApproverRole: '',
    reqDefaultHasApprover: true
  });

  const [reports, setReports] = useState(() => {
    try {
      const raw = localStorage.getItem('doc_generator_local_documents_v1');
      if (!raw) return [];
      const docs = JSON.parse(raw);
      return docs.map(d => {
        const docData = d.document_data || {};
        return {
          ...docData,
          id: d.id,
          docType: d.doc_type || docData.docType || 'report',
          savedAt: d.created_at || docData.savedAt,
          date: d.date || docData.date || todayStr(),
          project: d.project_name || docData.project || '',
          status: docData.status || d.status || 'completed'
        };
      });
    } catch(e) {
      return [];
    }
  });

  const [formData, setFormData] = useState({
    project: '', owner: '', date: todayStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
    tasks: createDefaultTasks(), issues: '', clock: new Array(12).fill(0),
    labor: defaultLaborList, equip: defaultEquipList,
    mat: [{ name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }],
    photos: [], signerName: '', signerRole: '', signerDate: todayStr(), signatureImage: null
  });

  const [prData, setPrData] = useState({
    project: '', prNo: '', date: todayStr(), requiredDate: todayStr(),
    requesterName: 'วิศวกรโครงการ', requesterDate: todayStr(),
    approverName: '', approverDate: '',
    items: createDefaultPrItems()
  });

  const [reqData, setReqData] = useState({
    project: '', owner: '', date: tomorrowStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
    tasks: createDefaultRequestTasks(), requesterName: '', requesterRole: '', requesterDate: todayStr(), requesterSignature: null,
    approverName: '', approverRole: '', hasApprover: true
  });

  const a4ContainerRef = useRef(null);

  useEffect(() => {
    if (!showPreview) return;
    const calcScale = () => {
      if (a4ContainerRef.current) {
        const containerWidth = a4ContainerRef.current.clientWidth;
        const availableWidth = containerWidth - 16;
        if (availableWidth > 0 && availableWidth < 794) {
          setPreviewScale(availableWidth / 794);
          return;
        }
      }
      const w = window.innerWidth;
      if (w < 830) {
        const availableWidth = Math.min(w - 24, 794);
        setPreviewScale(Math.min(1, Math.max(0.3, availableWidth / 794)));
      } else {
        setPreviewScale(1);
      }
    };

    calcScale();
    const timer = setTimeout(calcScale, 60);
    window.addEventListener('resize', calcScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calcScale);
    };
  }, [showPreview, previewData, reportTheme, docType]);

  const [presetsList, setPresetsList] = useState([]);
  const [selectedPresetName, setSelectedPresetName] = useState('');
  const [defaultFormCache, setDefaultFormCache] = useState(null);

  // Parallel Initial Mount Fetching (Promise.all - Ultra Fast)
  useEffect(() => {
    let isMounted = true;

    const fetchAllDataParallel = async () => {
      try {
        const [comp, projs, repPresets, reqPresets, prPresets, defReport, defRequest, defPr, docs, driveCfg] = await Promise.all([
          docGeneratorService.getCompanySettings().catch(() => null),
          docGeneratorService.getProjects().catch(() => []),
          docGeneratorService.getPresets('report_preset').catch(() => []),
          docGeneratorService.getPresets('request_preset').catch(() => []),
          docGeneratorService.getPresets('pr_preset').catch(() => []),
          docGeneratorService.getDefaultForm('report').catch(() => null),
          docGeneratorService.getDefaultForm('request').catch(() => null),
          docGeneratorService.getDefaultForm('pr').catch(() => null),
          docGeneratorService.getDocuments().catch(() => []),
          docGeneratorService.getGoogleDriveSettings().catch(() => null)
        ]);

        if (!isMounted) return;

        if (comp) {
          setCompany(comp);
          try { localStorage.setItem(COMPANY_KEY, JSON.stringify(comp)); } catch(e) {}
        }
        if (driveCfg) {
          setDriveSettings(driveCfg);
        }
        if (projs && projs.length > 0) {
          setProjects(projs);
          try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projs)); } catch(e) {}
        }

        const presetsMap = {
          report: repPresets || [],
          request: reqPresets || [],
          pr: prPresets || []
        };
        setAllPresetsCache(presetsMap);
        setPresetsList(presetsMap[docType] || []);

        const defMap = {
          report: defReport,
          request: defRequest,
          pr: defPr
        };
        setDefaultFormsMap(defMap);

        if (docs && docs.length > 0) {
          setReports(docs.map(d => {
            const docData = d.document_data || {};
            return {
              ...docData,
              id: d.id,
              docType: d.doc_type || docData.docType || 'report',
              savedAt: d.created_at || docData.savedAt,
              date: d.date || docData.date || todayStr(),
              project: d.project_name || docData.project || '',
              status: docData.status || d.status || 'completed'
            };
          }));
        }
      } catch (err) {
        console.error('Fast parallel fetch error:', err);
      }
    };

    fetchAllDataParallel();
    return () => { isMounted = false; };
  }, []);

  // Update presets list instantly in 0ms when docType switches
  useEffect(() => {
    if (allPresetsCache && allPresetsCache[docType]) {
      setPresetsList(allPresetsCache[docType]);
    }
  }, [docType, allPresetsCache]);

  // Apply a preset data object to current form
  const applyPresetToForm = (presetData, isGlobal = false) => {
    if (!presetData) return;
    if (docType === "report") {
      setFormData(prev => ({
        ...prev,
        project: isGlobal ? "" : (presetData.defaultProject || prev.project),
        owner: isGlobal ? "" : (presetData.defaultOwner || prev.owner),
        workType: presetData.defaultWorkType || "ปกติ",
        time: presetData.defaultTime || "8.00 - 17.00 น.",
        tasks: presetData.defaultTasks ? JSON.parse(JSON.stringify(presetData.defaultTasks)) : createDefaultTasks(),
        issues: presetData.defaultIssues !== undefined ? presetData.defaultIssues : "",
        clock: presetData.defaultClock ? [...presetData.defaultClock] : new Array(12).fill(0),
        labor: presetData.defaultLabor ? JSON.parse(JSON.stringify(presetData.defaultLabor)) : defaultLaborList,
        equip: presetData.defaultEquip ? JSON.parse(JSON.stringify(presetData.defaultEquip)) : defaultEquipList,
        mat: presetData.defaultMat ? JSON.parse(JSON.stringify(presetData.defaultMat)) : [{ name: "", qty: "", unit: "" }, { name: "", qty: "", unit: "" }, { name: "", qty: "", unit: "" }],
        signerRole: presetData.defaultSignerRole !== undefined ? presetData.defaultSignerRole : "",
        signerName: presetData.defaultSignerName !== undefined ? presetData.defaultSignerName : "",
        signatureImage: presetData.defaultSignatureImage || null,
        date: todayStr(),
        signerDate: todayStr()
      }));
    } else {
      setReqData(prev => ({
        ...prev,
        project: isGlobal ? "" : (presetData.reqDefaultProject || prev.project),
        owner: isGlobal ? "" : (presetData.reqDefaultOwner || prev.owner),
        workType: presetData.reqDefaultWorkType || "ปกติ",
        time: presetData.reqDefaultTime || "8.00 - 17.00 น.",
        tasks: presetData.reqDefaultTasks ? JSON.parse(JSON.stringify(presetData.reqDefaultTasks)) : createDefaultRequestTasks(),
        requesterName: presetData.reqDefaultRequesterName !== undefined ? presetData.reqDefaultRequesterName : "",
        requesterRole: presetData.reqDefaultRequesterRole !== undefined ? presetData.reqDefaultRequesterRole : "",
        requesterSignature: presetData.reqDefaultRequesterSignature || null,
        approverName: presetData.reqDefaultApproverName !== undefined ? presetData.reqDefaultApproverName : "",
        approverRole: presetData.reqDefaultApproverRole !== undefined ? presetData.reqDefaultApproverRole : "",
        date: tomorrowStr(),
        requesterDate: todayStr()
      }));
    }
  };

  const handleSaveCompany = async () => {
    try {
      await docGeneratorService.saveCompanySettings(company);
      alert("บันทึกการตั้งค่าบริษัทแล้ว");
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึกบริษัทลง Cloud");
    }
  };

  // Handle project dropdown change (Auto load project preset or global default)
  const handleProjectChange = (projectName) => {
    if (docType === "report") {
      if (!projectName) {
        // Switched to Global Default
        const globalPreset = presetsList.find(p => p.name === "__global_default__" || p.name === "ค่าตั้งต้นกลาง");
        if (globalPreset) {
          applyPresetToForm(globalPreset.data, true);
        } else {
          setFormData(prev => ({
            ...prev,
            project: "",
            owner: "",
            tasks: createDefaultTasks(),
            labor: defaultLaborList,
            equip: defaultEquipList,
            mat: [{ name: "", qty: "", unit: "" }, { name: "", qty: "", unit: "" }, { name: "", qty: "", unit: "" }],
            issues: "",
            clock: new Array(12).fill(0)
          }));
        }
        return;
      }

      const p = projects.find(x => x.name === projectName);
      const owner = p ? p.owner : "";
      const projPreset = presetsList.find(x => x.name === projectName);

      if (projPreset) {
        applyPresetToForm(projPreset.data, false);
      } else {
        // Base on global default + set project and owner
        const globalPreset = presetsList.find(x => x.name === "__global_default__" || x.name === "ค่าตั้งต้นกลาง");
        setFormData(prev => ({
          ...prev,
          project: projectName,
          owner: owner,
          tasks: globalPreset?.data?.defaultTasks ? JSON.parse(JSON.stringify(globalPreset.data.defaultTasks)) : createDefaultTasks(),
          labor: globalPreset?.data?.defaultLabor ? JSON.parse(JSON.stringify(globalPreset.data.defaultLabor)) : defaultLaborList,
          equip: globalPreset?.data?.defaultEquip ? JSON.parse(JSON.stringify(globalPreset.data.defaultEquip)) : defaultEquipList,
          mat: globalPreset?.data?.defaultMat ? JSON.parse(JSON.stringify(globalPreset.data.defaultMat)) : [{ name: "", qty: "", unit: "" }, { name: "", qty: "", unit: "" }, { name: "", qty: "", unit: "" }],
          issues: globalPreset?.data?.defaultIssues || "",
          clock: globalPreset?.data?.defaultClock ? [...globalPreset.data.defaultClock] : new Array(12).fill(0),
          signerRole: globalPreset?.data?.defaultSignerRole !== undefined ? globalPreset.data.defaultSignerRole : prev.signerRole,
          signerName: globalPreset?.data?.defaultSignerName !== undefined ? globalPreset.data.defaultSignerName : prev.signerName,
          signatureImage: globalPreset?.data?.defaultSignatureImage || prev.signatureImage
        }));
      }
    } else if (docType === "request") {
      // Daily Request
      if (!projectName) {
        const globalPreset = presetsList.find(p => p.name === "__global_default__" || p.name === "ค่าตั้งต้นกลาง");
        if (globalPreset) {
          applyPresetToForm(globalPreset.data, true);
        } else {
          setReqData(prev => ({
            ...prev,
            project: "",
            owner: "",
            tasks: createDefaultRequestTasks(),
            hasApprover: true
          }));
        }
        return;
      }

      const p = projects.find(x => x.name === projectName);
      const owner = p ? p.owner : "";
      const projPreset = presetsList.find(x => x.name === projectName);

      if (projPreset) {
        applyPresetToForm(projPreset.data, false);
      } else {
        const globalPreset = presetsList.find(x => x.name === "__global_default__" || x.name === "ค่าตั้งต้นกลาง");
        setReqData(prev => ({
          ...prev,
          project: projectName,
          owner: owner,
          tasks: globalPreset?.data?.reqDefaultTasks ? JSON.parse(JSON.stringify(globalPreset.data.reqDefaultTasks)) : createDefaultRequestTasks(),
          requesterName: globalPreset?.data?.reqDefaultRequesterName !== undefined ? globalPreset.data.reqDefaultRequesterName : prev.requesterName,
          requesterRole: globalPreset?.data?.reqDefaultRequesterRole !== undefined ? globalPreset.data.reqDefaultRequesterRole : prev.requesterRole,
          requesterSignature: globalPreset?.data?.reqDefaultRequesterSignature || prev.requesterSignature,
          approverName: globalPreset?.data?.reqDefaultApproverName !== undefined ? globalPreset.data.reqDefaultApproverName : prev.approverName,
          approverRole: globalPreset?.data?.reqDefaultApproverRole !== undefined ? globalPreset.data.reqDefaultApproverRole : prev.approverRole,
          hasApprover: globalPreset?.data?.reqDefaultHasApprover !== undefined ? globalPreset.data.reqDefaultHasApprover : (prev.hasApprover !== undefined ? prev.hasApprover : true)
        }));
      }
    } else {
      // PR
      if (!projectName) {
        setPrData(prev => ({
          ...prev,
          project: "",
          prNo: ""
        }));
        return;
      }
      const nextPr = calculateNextPrNo(projectName, projects, reports);
      setPrData(prev => ({
        ...prev,
        project: projectName,
        prNo: nextPr || prev.prNo
      }));
    }
  };

  // Save form as Default Preset (tied to Project Name or Global Default)
  const handleSaveDefaultForm = async () => {
    const currentProject = docType === "report" ? formData.project : (docType === "request" ? reqData.project : prData.project);
    const isGlobal = !currentProject || currentProject.trim() === "";
    const presetName = isGlobal ? "__global_default__" : currentProject;
    const confirmMsg = isGlobal
      ? "ต้องการบันทึกรายการชุดนี้เป็น \"ค่าตั้งต้นกลาง\" ใช่หรือไม่?\n(จะถูกใช้เป็นค่าพื้นฐานสำหรับทุกโครงการที่ยังไม่มีค่าเริ่มต้นเฉพาะ)"
      : `ต้องการบันทึกรายการชุดนี้เป็นค่าเริ่มต้นสำหรับโครงการ "${currentProject}" ใช่หรือไม่?\n(เมื่อเลือกโครงการนี้หรือกดล้างฟอร์ม ระบบจะดึงรายการชุดนี้มาใช้โดยอัตโนมัติ)`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const currentPresetType = docType === "report" ? "report_preset" : (docType === "request" ? "request_preset" : "pr_preset");
      let presetData = {};

      if (docType === "report") {
        presetData = {
          defaultProject: formData.project,
          defaultOwner: formData.owner,
          defaultWorkType: formData.workType,
          defaultTime: formData.time,
          defaultTasks: formData.tasks,
          defaultLabor: formData.labor,
          defaultEquip: formData.equip,
          defaultMat: formData.mat,
          defaultClock: formData.clock,
          defaultIssues: formData.issues,
          defaultSignerRole: formData.signerRole,
          defaultSignerName: formData.signerName,
          defaultSignatureImage: formData.signatureImage
        };
      } else {
        presetData = {
          reqDefaultProject: reqData.project,
          reqDefaultOwner: reqData.owner,
          reqDefaultWorkType: reqData.workType,
          reqDefaultTime: reqData.time,
          reqDefaultTasks: reqData.tasks,
          reqDefaultRequesterName: reqData.requesterName,
          reqDefaultRequesterRole: reqData.requesterRole,
          reqDefaultRequesterSignature: reqData.requesterSignature,
          reqDefaultApproverName: reqData.approverName,
          reqDefaultApproverRole: reqData.approverRole,
          reqDefaultHasApprover: reqData.hasApprover !== false
        };
      }

      await docGeneratorService.savePreset(currentPresetType, presetName, presetData);
      
      const pList = await docGeneratorService.getPresets(currentPresetType);
      setPresetsList(pList);

      alert(isGlobal
        ? "💾 บันทึก \"ค่าตั้งต้นกลาง\" เรียบร้อยแล้ว (จะถูกใช้เป็นค่าพื้นฐานเมื่อไม่มีการเลือกโครงการ)"
        : `💾 บันทึกค่าเริ่มต้นสำหรับโครงการ "${currentProject}" เรียบร้อยแล้ว`
      );
    } catch (e) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการบันทึกค่าเริ่มต้น (อาจเกิดจากขนาดรูปลายเซ็นใหญ่เกินไป)");
    }
  };

  // Reset a project custom preset to revert back to global default
  const handleResetProjectPreset = async (projectName) => {
    if (!projectName) return;
    if (!window.confirm(`ต้องการลบค่าเริ่มต้นเฉพาะของโครงการ "${projectName}" และกลับไปใช้ค่าตั้งต้นกลางใช่หรือไม่?`)) return;

    const currentPresetType = docType === "report" ? "report_preset" : (docType === "request" ? "request_preset" : "pr_preset");
    const presetObj = presetsList.find(p => p.name === projectName);
    if (presetObj) {
      await docGeneratorService.deletePreset(presetObj.id);
      const pList = await docGeneratorService.getPresets(currentPresetType);
      setPresetsList(pList);
      handleProjectChange(projectName);
      alert(`ลบค่าเริ่มต้นของโครงการ "${projectName}" แล้ว (กลับมาใช้ค่าตั้งต้นกลาง)`);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file, 400, 0.9, "image/png");
    const updated = { ...company, logo: compressed };
    setCompany(updated);
    await docGeneratorService.saveCompanySettings(updated);
  };

  const handleClearAllStorage = async () => {
    if (window.confirm("คุณต้องการลบข้อมูลประวัติทั้งหมดที่บันทึกไว้ใช่หรือไม่? (ลบจาก Cloud)")) {
      for (const r of reports) {
        await docGeneratorService.deleteDocument(r.id);
      }
      setReports([]);
      alert("ลบข้อมูลประวัติเรียบร้อยแล้ว");
    }
  };

  // Create a new document and open editor form
  const handleCreateNewDoc = (type) => {
    setDocType(type);
    setCurrentEditId(null);
    setCurrentDocStatus('draft');
    setShowPreview(false);
    setIsNewDocMenuOpen(false);

    if (type === 'report') {
      const gPreset = presetsList.find(p => p.name === '__global_default__' || p.name === 'ค่าตั้งต้นกลาง');
      setFormData({
        project: '', owner: '', date: todayStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
        tasks: gPreset?.data?.defaultTasks ? JSON.parse(JSON.stringify(gPreset.data.defaultTasks)) : createDefaultTasks(),
        issues: gPreset?.data?.defaultIssues || '',
        clock: gPreset?.data?.defaultClock ? [...gPreset.data.defaultClock] : new Array(12).fill(0),
        labor: gPreset?.data?.defaultLabor ? JSON.parse(JSON.stringify(gPreset.data.defaultLabor)) : defaultLaborList,
        equip: gPreset?.data?.defaultEquip ? JSON.parse(JSON.stringify(gPreset.data.defaultEquip)) : defaultEquipList,
        mat: gPreset?.data?.defaultMat ? JSON.parse(JSON.stringify(gPreset.data.defaultMat)) : [{ name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }, { name: '', qty: '', unit: '' }],
        photos: [],
        signerRole: gPreset?.data?.defaultSignerRole !== undefined ? gPreset.data.defaultSignerRole : 'วิศวกรโครงการ',
        signerName: gPreset?.data?.defaultSignerName !== undefined ? gPreset.data.defaultSignerName : '',
        signerDate: todayStr(),
        signatureImage: gPreset?.data?.defaultSignatureImage || null,
        status: 'draft'
      });
    } else if (type === 'request') {
      const gPreset = presetsList.find(p => p.name === '__global_default__' || p.name === 'ค่าตั้งต้นกลาง');
      setReqData({
        project: '', owner: '', date: tomorrowStr(), workType: 'ปกติ', time: '8.00 - 17.00 น.',
        tasks: gPreset?.data?.reqDefaultTasks ? JSON.parse(JSON.stringify(gPreset.data.reqDefaultTasks)) : createDefaultRequestTasks(),
        requesterName: gPreset?.data?.reqDefaultRequesterName !== undefined ? gPreset.data.reqDefaultRequesterName : '',
        requesterRole: gPreset?.data?.reqDefaultRequesterRole !== undefined ? gPreset.data.reqDefaultRequesterRole : 'ผู้จัดการโครงการ',
        requesterDate: todayStr(),
        requesterSignature: gPreset?.data?.reqDefaultRequesterSignature || null,
        approverName: gPreset?.data?.reqDefaultApproverName !== undefined ? gPreset.data.reqDefaultApproverName : '',
        approverRole: gPreset?.data?.reqDefaultApproverRole !== undefined ? gPreset.data.reqDefaultApproverRole : 'ที่ปรึกษาโครงการฯ',
        hasApprover: gPreset?.data?.reqDefaultHasApprover !== undefined ? gPreset.data.reqDefaultHasApprover : true,
        status: 'draft'
      });
    } else if (type === 'pr') {
      setPrData({
        project: '', prNo: '', date: todayStr(), requiredDate: todayStr(),
        requesterName: 'วิศวกรโครงการ', requesterDate: todayStr(),
        approverName: '', approverDate: '',
        items: createDefaultPrItems(),
        status: 'draft'
      });
    }
    setActiveTab('form');
  };

  // Duplicate an existing document into a new Draft with today's date
  const handleDuplicateDoc = (r) => {
    setCurrentEditId(null);
    setCurrentDocStatus('draft');
    setShowPreview(false);

    if (r.docType === 'request') {
      setReqData({
        ...r,
        id: uid(),
        date: tomorrowStr(),
        requesterDate: todayStr(),
        status: 'draft',
        tasks: r.tasks ? JSON.parse(JSON.stringify(r.tasks)) : createDefaultRequestTasks()
      });
      setDocType('request');
    } else if (r.docType === 'pr') {
      const nextPr = calculateNextPrNo(r.project, projects, reports);
      setPrData({
        ...r,
        id: uid(),
        prNo: nextPr || r.prNo || '',
        date: todayStr(),
        requiredDate: todayStr(),
        status: 'draft',
        items: r.items ? JSON.parse(JSON.stringify(r.items)) : createDefaultPrItems()
      });
      setDocType('pr');
    } else {
      setFormData({
        ...r,
        id: uid(),
        date: todayStr(),
        signerDate: todayStr(),
        status: 'draft',
        tasks: r.tasks ? JSON.parse(JSON.stringify(r.tasks)) : createDefaultTasks(),
        labor: r.labor ? JSON.parse(JSON.stringify(r.labor)) : defaultLaborList,
        equip: r.equip ? JSON.parse(JSON.stringify(r.equip)) : defaultEquipList,
        mat: r.mat ? JSON.parse(JSON.stringify(r.mat)) : [{ name: '', qty: '', unit: '' }],
        photos: r.photos ? JSON.parse(JSON.stringify(r.photos)) : [],
        clock: r.clock ? [...r.clock] : new Array(12).fill(0)
      });
      setDocType('report');
    }
    setActiveTab('form');
  };

  // Clear form action -> reloads preset for currently selected project (or global default)
  const handleClearForm = () => {
    const currentProject = docType === "report" ? formData.project : (docType === "request" ? reqData.project : prData.project);
    const confirmMsg = currentProject
      ? `ต้องการล้างข้อมูลและโหลดค่าเริ่มต้นของโครงการ "${currentProject}" ใช่หรือไม่?`
      : "ต้องการล้างข้อมูลและโหลด \"ค่าตั้งต้นกลาง\" ใช่หรือไม่?";

    if (!window.confirm(confirmMsg)) return;
    setCurrentEditId(null);
    handleProjectChange(currentProject);
  };
  // Upload single document to Google Drive on demand
  const handleUploadDocToDrive = async (docRecord) => {
    if (!driveSettings.webhookUrl) {
      alert('กรุณาระบุ Google Drive Webhook URL ในแท็บ "⚙️ ตั้งค่า / ทะเบียน" ก่อน');
      setActiveTab('company');
      return;
    }

    try {
      setIsUploadingDrive(true);
      setPreviewData(docRecord);
      
      // Wait briefly for render
      await new Promise(r => setTimeout(r, 200));
      const base64Pdf = await generatePdfBase64('exportStagingContainer');
      
      if (!base64Pdf) {
        throw new Error('ไม่สามารถสร้างไฟล์ PDF สำหรับอัปโหลดได้');
      }

      const prefix = docRecord.docType === 'report' ? 'Daily_Report' : (docRecord.docType === 'request' ? 'Daily_Request' : (docRecord.prNo || 'PR_Requisition'));
      const filename = `${prefix}_${docRecord.date || todayStr()}`;

      const uploadRes = await uploadToGoogleDrive({
        webhookUrl: driveSettings.webhookUrl,
        folderId: driveSettings.folderId,
        filename,
        base64Data: base64Pdf,
        projectName: docRecord.project || 'ทั่วไป',
        docType: docRecord.docType
      });

      if (uploadRes.fileUrl) {
        // Save driveUrl back to document
        const updatedData = {
          ...(docRecord.document_data || docRecord),
          driveUrl: uploadRes.fileUrl,
          driveFileId: uploadRes.fileId,
          driveUploadedAt: new Date().toISOString()
        };

        await docGeneratorService.saveDocument(
          docRecord.docType || 'report',
          docRecord.date || todayStr(),
          docRecord.project || '',
          updatedData,
          docRecord.id
        );

        const docs = await docGeneratorService.getDocuments();
        setReports(docs.map(d => {
          const docData = d.document_data || {};
          return {
            ...docData,
            id: d.id,
            docType: d.doc_type || docData.docType || 'report',
            savedAt: d.created_at || docData.savedAt,
            date: d.date || docData.date || todayStr(),
            project: d.project_name || docData.project || '',
            status: docData.status || d.status || 'completed',
            driveUrl: docData.driveUrl || d.drive_url || null
          };
        }));

        alert(`✅ ส่งไฟล์ขึ้น Google Drive เรียบร้อยแล้ว!\n\n🔗 ลิงก์ไฟล์: ${uploadRes.fileUrl}`);
      }
    } catch(err) {
      alert(`เกิดข้อผิดพลาดในการส่ง Google Drive: ${err.message}`);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleSaveDoc = async (isDraft = false) => {
    try {
      const currentData = docType === 'report' ? formData : (docType === 'request' ? reqData : prData);
      const saveStatus = isDraft ? 'draft' : 'completed';
      let driveUrl = currentData.driveUrl || null;
      let driveFileId = currentData.driveFileId || null;

      // Auto upload to Google Drive if completed and enabled
      if (!isDraft && driveSettings.webhookUrl && driveSettings.autoUpload !== false) {
        try {
          setIsUploadingDrive(true);
          setPreviewData(currentData);
          await new Promise(r => setTimeout(r, 200));
          const base64Pdf = await generatePdfBase64('exportStagingContainer');
          if (base64Pdf) {
            const prefix = docType === 'report' ? 'Daily_Report' : (docType === 'request' ? 'Daily_Request' : (currentData.prNo || 'PR_Requisition'));
            const filename = `${prefix}_${currentData.date || todayStr()}`;
            const uploadRes = await uploadToGoogleDrive({
              webhookUrl: driveSettings.webhookUrl,
              folderId: driveSettings.folderId,
              filename,
              base64Data: base64Pdf,
              projectName: currentData.project || 'ทั่วไป',
              docType
            });
            if (uploadRes.fileUrl) {
              driveUrl = uploadRes.fileUrl;
              driveFileId = uploadRes.fileId;
            }
          }
        } catch(uploadErr) {
          console.warn('Google Drive auto upload skipped:', uploadErr.message);
        } finally {
          setIsUploadingDrive(false);
        }
      }

      const dataToSave = { 
        ...currentData, 
        docType, 
        status: saveStatus, 
        driveUrl, 
        driveFileId,
        savedAt: new Date().toISOString() 
      };
      
      const savedObj = await docGeneratorService.saveDocument(
        docType, 
        currentData.date, 
        currentData.project, 
        dataToSave,
        currentEditId
      );
      
      if (savedObj) {
        setCurrentEditId(savedObj.id);
        setCurrentDocStatus(saveStatus);
        const docs = await docGeneratorService.getDocuments();
        setReports(docs.map(d => {
          const docData = d.document_data || {};
          return {
            ...docData,
            id: d.id,
            docType: d.doc_type || docData.docType || 'report',
            savedAt: d.created_at || docData.savedAt,
            date: d.date || docData.date || todayStr(),
            project: d.project_name || docData.project || '',
            status: docData.status || d.status || 'completed',
            driveUrl: docData.driveUrl || d.drive_url || null
          };
        }));
        const typeLabel = docType === 'report' ? 'Daily Report' : (docType === 'request' ? 'Daily Request' : 'PR / ใบขออนุมัติสั่งซื้อ');
        if (isDraft) {
          alert(`💾 บันทึก ${typeLabel} เป็น "ฉบับร่าง (Draft)" เรียบร้อยแล้ว`);
        } else {
          if (driveUrl) {
            alert(`✅ บันทึก ${typeLabel} เสร็จสมบูรณ์ และส่งขึ้น Google Drive เรียบร้อยแล้ว!\n\n🔗 เปิดบน Drive: ${driveUrl}`);
          } else {
            alert(`✅ บันทึก ${typeLabel} เสร็จสมบูรณ์ (Cloud) เรียบร้อยแล้ว`);
          }
        }
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการบันทึก: พื้นที่ข้อมูลใหญ่เกินไป');
    }
  };

  const handleEditDoc = (r) => {
    setCurrentEditId(r.id);
    setCurrentDocStatus(r.status || 'completed');
    if (r.docType === 'request') {
      setReqData({
        ...r,
        tasks: r.tasks || createDefaultRequestTasks()
      });
      setDocType('request');
    } else if (r.docType === 'pr') {
      setPrData({
        ...r,
        items: r.items || createDefaultPrItems()
      });
      setDocType('pr');
    } else {
      setFormData({
        ...r,
        tasks: r.tasks || createDefaultTasks(),
        labor: r.labor && r.labor.length ? r.labor : defaultLaborList,
        equip: (r.equip && r.equip.length ? r.equip : defaultEquipList).map(e => ({ name: e.name || '', qty: e.qty || '', unit: e.unit !== undefined ? e.unit : '' })),
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
    setPreviewData(docType === 'report' ? formData : (docType === 'request' ? reqData : prData));
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
    const prefix = docType === 'report' ? 'Daily_Report' : (docType === 'request' ? 'Daily_Request' : 'PR_Requisition');
    exportToPdf('exportStagingContainer', `${prefix}_${previewData?.date || ''}`);
    exportToPdf(targetId, `${docType === 'report' ? 'Daily_Report' : 'Daily_Request'}_${previewData?.date}`);
  };

  const handleExportImageA4 = () => {
    const prefix = docType === 'report' ? 'Daily_Report' : (docType === 'request' ? 'Daily_Request' : 'PR_Requisition');
    exportToImage('exportStagingContainer', `${prefix}_${previewData?.date || ''}`);
    exportToImage(targetId, `${docType === 'report' ? 'Daily_Report' : 'Daily_Request'}_${previewData?.date}`);
  };

  const renderGeneralInfo = (data, setData) => {
    const currentProject = data.project;
    const hasProjectPreset = currentProject && presetsList.some(p => p.name === currentProject);

    return (
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
          <h2 style={{ margin: 0 }}>ข้อมูลทั่วไป ({docType === "report" ? "Daily Report" : (docType === "request" ? "Daily Request" : "PR / ใบขออนุมัติสั่งซื้อ")})</h2>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "12px" }}>
            {currentProject ? (
              hasProjectPreset ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#2f5233", background: "#eef8ee", padding: "3px 8px", borderRadius: "4px", border: "1px solid #c7e8c7", fontWeight: "500" }}>
                    ✨ ค่าเริ่มต้นเฉพาะ: {currentProject}
                  </span>
                  <button 
                    className="btn ghost" 
                    type="button"
                    onClick={() => handleResetProjectPreset(currentProject)} 
                    style={{ fontSize: "11px", padding: "3px 6px", color: "#b23b2f", borderColor: "#f3c1ba" }}
                    title="ลบค่าเริ่มต้นของโครงการนี้และกลับไปใช้ค่าตั้งต้นกลาง"
                  >
                    คืนค่ากลาง
                  </button>
                </div>
              ) : (
                <span style={{ color: "#64748b", background: "#f8fafc", padding: "3px 8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                  ⚙️ ค่าตั้งต้นกลาง
                </span>
              )
            ) : (
              <span style={{ color: "#0369a1", background: "#f0f9ff", padding: "3px 8px", borderRadius: "4px", border: "1px solid #bae6fd", fontWeight: "500" }}>
                ⚙️ กำลังตั้งค่า: ค่าตั้งต้นกลาง (ไม่มีโครงการ)
              </span>
            )}
          </div>
        </div>
        <div className="grid">
          <div className="field" style={{ gridColumn: docType === "pr" ? "span 2" : "auto" }}>
            <label>โครงการ (เลือกจากทะเบียนโครงการ)</label>
            <select value={data.project} onChange={e => handleProjectChange(e.target.value)}>
              <option value="">-- ไม่ระบุโครงการ (ใช้ค่าตั้งต้นกลาง) --</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          {docType !== "pr" && (
            <div className="field">
              <label>เจ้าของโครงการ</label>
              <input type="text" value={(!data.owner || data.owner.trim() === "-" || data.owner.trim() === "") ? "" : data.owner} disabled style={{ background: "#f8fafc", color: "#64748b" }} placeholder="ดึงข้อมูลจากโครงการอัตโนมัติ" />
            </div>
          )}
          <div className="field">
            <label>{docType === "report" ? "วันที่" : "วัน/เดือน/ปี ที่ขออนุมัติ"}</label>
            <input type="date" value={data.date} onChange={e => setData({ ...data, date: e.target.value })} />
          </div>
          {docType === "pr" ? (
            <>
              <div className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ margin: 0 }}>เลขที่ PR</label>
                  {data.project && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ fontSize: "11px", padding: "1px 6px", height: "22px", borderColor: "#cbd5e1", background: "#fff", cursor: "pointer" }}
                      onClick={() => {
                        const nextPr = calculateNextPrNo(data.project, projects, reports);
                        if (nextPr) setData({ ...data, prNo: nextPr });
                      }}
                      title="รันเลขที่ถัดไปให้อัตโนมัติตามการตั้งค่าโครงการ"
                    >
                      🔄 รันเลขอัตโนมัติ
                    </button>
                  )}
                </div>
                <input type="text" value={data.prNo || ""} onChange={e => setData({ ...data, prNo: e.target.value })} placeholder="เช่น PR-ICN-001 หรือพิมพ์แก้ไขได้" />
              </div>
              <div className="field">
                <label>วันที่ต้องการใช้วัสดุ</label>
                <input type="date" value={data.requiredDate || ""} onChange={e => setData({ ...data, requiredDate: e.target.value })} />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    );
  };

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

  const render12ResourceRows = (list, defaultUnit = '') => {
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const item = (list || [])[i] || { name: '', qty: '', unit: '' };
      const unitText = item.unit !== undefined && item.unit !== '' ? item.unit.trim() : defaultUnit;
      const displayQty = item.qty ? (unitText ? `${item.qty} ${unitText}` : item.qty) : '';
      rows.push(
        <tr key={i}>
          <td style={{ height: '19px' }}>{item.name || '\u00A0'}</td>
          <td style={{ textAlign: 'right', fontWeight: 'bold', width: '75px', whiteSpace: 'nowrap' }}>{displayQty}</td>
        </tr>
      );
    }
    return rows;
  };

  const renderFullReportPages = (data, themeClass, scale = 1) => {
    const chunkPhotos = (arr, size = 6) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
      return chunks;
    };
    const photoChunks = chunkPhotos(data.photos || [], 6);
    return (
      <>
        {/* PAGE 1: MAIN DAILY REPORT */}
        <ScaledA4Page scale={scale}>
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
              {([...(data.tasks || []), ...new Array(8).fill({ item: '', qty: '', unit: '', note: '' })].slice(0, Math.max(8, (data.tasks || []).length))).map((t, i) => (
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
                <tbody>{render12ResourceRows(data.labor, 'คน')}</tbody>
              </table>
            </div>
            <div className="resource-col">
              <div className="resource-col-header">เครื่องจักร - อุปกรณ์ (Machinery)</div>
              <table className="resource-col-table">
                <tbody>{render12ResourceRows(data.equip, '')}</tbody>
              </table>
            </div>
            <div className="resource-col">
              <div className="resource-col-header">วัสดุเข้าหน่วยงาน (Materials)</div>
              <table className="resource-col-table">
                <tbody>{render12ResourceRows(data.mat, '')}</tbody>
              </table>
            </div>
          </div>

          <div className="page-signer-row">
            <div className="signer-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '220px' }}>
              <div style={{ height: '52px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%', marginBottom: '4px' }}>
                {data.signatureImage ? (
                  <img src={data.signatureImage} alt="signature" style={{ maxHeight: '48px', maxWidth: '170px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ height: '24px' }}></div>
                )}
              </div>
              <div className="signer-line" style={{ width: '180px', margin: '0 auto 4px' }}></div>
              <div className="signer-name">({data.signerName || '....................................................'})</div>
              <div className="signer-role">ตำแหน่ง: {data.signerRole || 'วิศวกรโครงการ'}</div>
              <div className="signer-date">วันที่: {formatThaiDate(data.signerDate || data.date)}</div>
            </div>
          </div>
        </div>
        </ScaledA4Page>

        {photoChunks.map((chunk, pageIndex) => (
          <ScaledA4Page key={`photo-page-${pageIndex}`} scale={scale}>
          <div className={`a4-page ${themeClass}`}>
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
          </ScaledA4Page>
        ))}
      </>
    );
  };

  return (
    <div className="doc-gen-root app">
      <div className="topbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📑 Documents Center</span>
            </h1>
            <div className="sub">ระบบสร้างรายงานประจำวัน, ขออนุมัติงาน และใบขอซื้อ (PR)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="tabs">
            <button className={activeTab === 'hub' ? 'active' : ''} onClick={() => { setActiveTab('hub'); setShowPreview(false); }}>
              📑 ศูนย์รวมเอกสาร ({reports.length})
            </button>
            {activeTab === 'form' && (
              <button className="active" onClick={() => setShowPreview(false)}>
                ✏️ ฟอร์มแก้ไข ({docType === 'report' ? 'Report' : (docType === 'request' ? 'Request' : 'PR')})
              </button>
            )}
            <button className={activeTab === 'company' ? 'active' : ''} onClick={() => { setActiveTab('company'); setShowPreview(false); }}>
              ⚙️ ตั้งค่า / ทะเบียน
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'form' && (
        <div id="formTab">
          {/* Breadcrumb Editor Header */}
          <div className="editor-nav-bar no-print">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                className="btn ghost" 
                onClick={() => { setActiveTab('hub'); setShowPreview(false); }}
                style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                ← กลับหน้ารวมเอกสาร
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                  {docType === 'report' ? '📋 Daily Report' : (docType === 'request' ? '📝 Daily Request' : '🛒 PR / ใบขออนุมัติสั่งซื้อ')}
                </span>
                <span className={`status-badge ${currentDocStatus === 'draft' ? 'draft' : 'completed'}`}>
                  {currentDocStatus === 'draft' ? '📝 ฉบับร่าง (Draft)' : '✅ บันทึกสมบูรณ์'}
                </span>
              </div>
            </div>

            {/* Doc Type Switcher */}
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
              <button 
                className={`btn ${docType === 'report' ? 'primary' : 'ghost'}`} 
                style={{ border: 'none', padding: '4px 10px', fontSize: '12px' }} 
                onClick={() => { setDocType('report'); setShowPreview(false); }}
              >
                Report
              </button>
              <button 
                className={`btn ${docType === 'request' ? 'primary' : 'ghost'}`} 
                style={{ border: 'none', padding: '4px 10px', fontSize: '12px' }} 
                onClick={() => { setDocType('request'); setShowPreview(false); }}
              >
                Request
              </button>
              <button 
                className={`btn ${docType === 'pr' ? 'primary' : 'ghost'}`} 
                style={{ border: 'none', padding: '4px 10px', fontSize: '12px' }} 
                onClick={() => { setDocType('pr'); setShowPreview(false); }}
              >
                PR
              </button>
            </div>
          </div>
          {docType === 'report' && (
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
                    setFormData({ ...formData, tasks: [...formData.tasks, { item: '', qty: '', unit: '', note: '' }] });
                  }}>+ เพิ่มรายการ</button>
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
                    <thead>
                      <tr>
                        <th>รายการ</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>จำนวน</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>หน่วย</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.equip.map((x, i) => (
                        <tr key={i}>
                          <td><input type="text" value={x.name} placeholder="ชื่อเครื่องจักร / อุปกรณ์" onChange={e => {
                            const n = [...formData.equip]; n[i].name = e.target.value; setFormData({ ...formData, equip: n });
                          }} /></td>
                          <td><input type="text" value={x.qty} placeholder="จำนวน" style={{ textAlign: 'center' }} onChange={e => {
                            const n = [...formData.equip]; n[i].qty = e.target.value; setFormData({ ...formData, equip: n });
                          }} /></td>
                          <td><input type="text" value={x.unit !== undefined ? x.unit : ''} placeholder="เช่น คัน, เครื่อง" style={{ textAlign: 'center' }} onChange={e => {
                            const n = [...formData.equip]; n[i].unit = e.target.value; setFormData({ ...formData, equip: n });
                          }} /></td>
                          <td className="row-actions"><button className="icon-btn danger" onClick={() => setFormData({ ...formData, equip: formData.equip.filter((_, idx) => idx !== i) })}>X</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                  <button className="add-row-btn" style={{ marginTop: '10px' }} onClick={() => setFormData({ ...formData, equip: [...formData.equip, { name: '', qty: '', unit: '' }] })}>+ เพิ่มรายการ</button>
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
                  <div className="field"><label>ตำแหน่ง</label><input type="text" value={formData.signerRole} onChange={e => setFormData({ ...formData, signerRole: e.target.value })} placeholder="ระบุตำแหน่ง เช่น วิศวกรโครงการ" /></div>
                  <div className="field"><label>วันที่บันทึก</label><input type="date" value={formData.signerDate} onChange={e => setFormData({ ...formData, signerDate: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <SignaturePad currentSignature={formData.signatureImage} onSave={(imgBase64) => setFormData({ ...formData, signatureImage: imgBase64 })} />
                </div>
              </div>
            </>
          )}

          {docType === 'request' && (
            <>
              {renderGeneralInfo(reqData, setReqData)}
              
              <div className="card">
                <h2>รายการขอปฏิบัติงาน</h2>
                
                {/* Desktop View */}
                <div className="table-scroll-wrap task-table-desktop">
                  <table className="entry-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "40px", textAlign: "center" }}>ลำดับ</th>
                        <th>รายละเอียดงาน</th>
                        <th style={{ width: "200px" }}>ผู้ควบคุมงาน</th>
                        <th style={{ width: "200px" }}>หมายเหตุ</th>
                        <th style={{ width: "40px", textAlign: "center" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reqData.tasks.map((t, i) => (
                        <tr key={i}>
                          <td style={{ textAlign: "center" }}>{i + 1}</td>
                          <td><input type="text" value={t.item} placeholder="ระบุรายละเอียดงาน" onChange={e => {
                            const n = [...reqData.tasks]; n[i].item = e.target.value; setReqData({ ...reqData, tasks: n });
                          }} /></td>
                          <td><input type="text" value={t.supervisor} placeholder="เช่น นายสมชาย ช่างควบคุม" onChange={e => {
                            const n = [...reqData.tasks]; n[i].supervisor = e.target.value; setReqData({ ...reqData, tasks: n });
                          }} /></td>
                          <td><input type="text" value={t.note} placeholder="หมายเหตุ (ถ้ามี)" onChange={e => {
                            const n = [...reqData.tasks]; n[i].note = e.target.value; setReqData({ ...reqData, tasks: n });
                          }} /></td>
                          <td style={{ textAlign: "center" }}>
                            <button className="icon-btn danger" onClick={() => {
                              setReqData({ ...reqData, tasks: reqData.tasks.filter((_, idx) => idx !== i) });
                            }} title="ลบแถว">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="task-cards-mobile">
                  {reqData.tasks.map((t, i) => (
                    <div key={i} className="task-mobile-card">
                      <div className="task-mobile-card-header">
                        <span>รายการที่ {i + 1}</span>
                        <button className="icon-btn danger" onClick={() => {
                          setReqData({ ...reqData, tasks: reqData.tasks.filter((_, idx) => idx !== i) });
                        }}>✕</button>
                      </div>
                      <div className="field">
                        <label>รายละเอียดงาน</label>
                        <input type="text" value={t.item} placeholder="ระบุรายละเอียดงาน" onChange={e => {
                          const n = [...reqData.tasks]; n[i].item = e.target.value; setReqData({ ...reqData, tasks: n });
                        }} />
                      </div>
                      <div className="field">
                        <label>ผู้ควบคุมงาน</label>
                        <input type="text" value={t.supervisor} placeholder="เช่น นายสมชาย ช่างควบคุม" onChange={e => {
                          const n = [...reqData.tasks]; n[i].supervisor = e.target.value; setReqData({ ...reqData, tasks: n });
                        }} />
                      </div>
                      <div className="field">
                        <label>หมายเหตุ</label>
                        <input type="text" value={t.note} placeholder="หมายเหตุ (ถ้ามี)" onChange={e => {
                          const n = [...reqData.tasks]; n[i].note = e.target.value; setReqData({ ...reqData, tasks: n });
                        }} />
                      </div>
                    </div>
                  ))} 
                </div>

                {/* Shared Add Button */}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <button className="add-row-btn" onClick={() => {
                    setReqData({ ...reqData, tasks: [...reqData.tasks, { item: "", supervisor: "", note: "" }] });
                  }}>+ เพิ่มรายการ</button>
                </div>
              </div>

              <div className="card">
                <h2>ข้อมูลผู้ขออนุมัติ</h2>
                <div className="grid">
                  <div className="field">
                    <label>ชื่อ-สกุล</label>
                    <input type="text" value={reqData.requesterName} onChange={e => setReqData({ ...reqData, requesterName: e.target.value })} placeholder="ชื่อ-สกุล ผู้ขออนุมัติ" />
                  </div>
                  <div className="field">
                    <label>ตำแหน่ง</label>
                    <input type="text" value={reqData.requesterRole} onChange={e => setReqData({ ...reqData, requesterRole: e.target.value })} placeholder="ระบุตำแหน่ง เช่น ผู้จัดการโครงการ" />
                  </div>
                  <div className="field">
                    <label>วันที่ขออนุมัติ</label>
                    <input type="date" value={reqData.requesterDate} onChange={e => setReqData({ ...reqData, requesterDate: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <SignaturePad currentSignature={reqData.requesterSignature} onSave={(imgBase64) => setReqData({ ...reqData, requesterSignature: imgBase64 })} />
                </div>

                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px", color: "var(--primary)" }}>
                    <input 
                      type="checkbox" 
                      checked={reqData.hasApprover !== false} 
                      onChange={e => setReqData({ ...reqData, hasApprover: e.target.checked })} 
                    />
                    ต้องการระบุส่วนผู้อนุมัติในเอกสาร (Approver Section)
                  </label>
                </div>

                {reqData.hasApprover !== false && (
                  <div style={{ marginTop: "16px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                      ✍️ ข้อมูลผู้อนุมัติ (สามารถระบุล่วงหน้า หรือเว้นว่างไว้ให้เซ็นมือภายหลังได้)
                    </h3>
                    <div className="grid">
                      <div className="field">
                        <label>ชื่อ-สกุล ผู้อนุมัติ</label>
                        <input type="text" value={reqData.approverName || ''} onChange={e => setReqData({ ...reqData, approverName: e.target.value })} placeholder="เช่น นายวิศวกร ควบคุมงาน (หรือเว้นว่าง)" />
                      </div>
                      <div className="field">
                        <label>ตำแหน่ง ผู้อนุมัติ</label>
                        <input type="text" value={reqData.approverRole || ''} onChange={e => setReqData({ ...reqData, approverRole: e.target.value })} placeholder="เช่น ที่ปรึกษาโครงการฯ / ผู้จัดการโครงการ" />
                      </div>
                      <div className="field">
                        <label>วันที่อนุมัติ (เว้นว่างได้)</label>
                        <input type="date" value={reqData.approverDate || ''} onChange={e => setReqData({ ...reqData, approverDate: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <label style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px", display: "block" }}>แปะรูปลายเซ็นผู้อนุมัติ (ทางเลือก - เว้นว่างไว้เซ็นสดได้):</label>
                      <SignaturePad currentSignature={reqData.approverSignature} onSave={(imgBase64) => setReqData({ ...reqData, approverSignature: imgBase64 })} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {docType === 'pr' && (
            <>
              {renderGeneralInfo(prData, setPrData)}

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h2 style={{ margin: 0 }}>รายการขออนุมัติสั่งซื้อวัสดุ/ของ (PR Items)</h2>
                  <button 
                    className="btn ghost" 
                    type="button" 
                    onClick={() => setPrData(prev => ({ ...prev, items: [...prev.items, { item: '', qty: '', unit: '', boqRef: '', usageArea: '' }] }))}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    + เพิ่มรายการ
                  </button>
                </div>

                {/* PC Table */}
                <div className="table-scroll-wrap task-table-desktop">
                  <table className="entry-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', textAlign: 'center' }}>ลำดับ</th>
                        <th>รายการวัสดุ / ของ</th>
                        <th style={{ width: '80px' }}>จำนวน</th>
                        <th style={{ width: '80px' }}>หน่วย</th>
                        <th style={{ width: '180px' }}>วัสดุในหมวดงาน / ข้อที่ (BOQ)</th>
                        <th style={{ width: '180px' }}>นำไปใช้ในส่วนงาน / บริเวณ</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>ลบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prData.items.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                          <td>
                            <input 
                              type="text" 
                              value={row.item} 
                              onChange={e => {
                                const newItems = [...prData.items];
                                newItems[idx].item = e.target.value;
                                setPrData({ ...prData, items: newItems });
                              }}
                              placeholder="เช่น ปูนซีเมนต์ปอร์ตแลนด์, เสาเข็ม 0.35x0.35"
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              value={row.qty} 
                              onChange={e => {
                                const newItems = [...prData.items];
                                newItems[idx].qty = e.target.value;
                                setPrData({ ...prData, items: newItems });
                              }}
                              placeholder="เช่น 10"
                              style={{ textAlign: 'center' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              value={row.unit} 
                              onChange={e => {
                                const newItems = [...prData.items];
                                newItems[idx].unit = e.target.value;
                                setPrData({ ...prData, items: newItems });
                              }}
                              placeholder="เช่น ถุง, ต้น"
                              style={{ textAlign: 'center' }}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              value={row.boqRef} 
                              onChange={e => {
                                const newItems = [...prData.items];
                                newItems[idx].boqRef = e.target.value;
                                setPrData({ ...prData, items: newItems });
                              }}
                              placeholder="เช่น งานโครงสร้าง ข้อ 1.2"
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              value={row.usageArea} 
                              onChange={e => {
                                const newItems = [...prData.items];
                                newItems[idx].usageArea = e.target.value;
                                setPrData({ ...prData, items: newItems });
                              }}
                              placeholder="เช่น ฐานราก F1 โซน A"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn ghost" 
                              type="button" 
                              onClick={() => {
                                if (prData.items.length <= 1) {
                                  setPrData({ ...prData, items: [{ item: '', qty: '', unit: '', boqRef: '', usageArea: '' }] });
                                } else {
                                  setPrData({ ...prData, items: prData.items.filter((_, i) => i !== idx) });
                                }
                              }}
                              style={{ color: '#ef4444', padding: '2px 6px' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="task-cards-mobile">
                  {prData.items.map((row, idx) => (
                    <div key={idx} className="task-item-card" style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>ลำดับที่ {idx + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            if (prData.items.length <= 1) {
                              setPrData({ ...prData, items: [{ item: '', qty: '', unit: '', boqRef: '', usageArea: '' }] });
                            } else {
                              setPrData({ ...prData, items: prData.items.filter((_, i) => i !== idx) });
                            }
                          }} 
                          style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer' }}
                        >
                          ✕ ลบ
                        </button>
                      </div>
                      <div className="field" style={{ marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px' }}>รายการวัสดุ/ของ</label>
                        <input 
                          type="text" 
                          value={row.item} 
                          onChange={e => {
                            const newItems = [...prData.items];
                            newItems[idx].item = e.target.value;
                            setPrData({ ...prData, items: newItems });
                          }}
                          placeholder="ชื่อวัสดุ / ของ" 
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                        <div className="field">
                          <label style={{ fontSize: '11px' }}>จำนวน</label>
                          <input 
                            type="text" 
                            value={row.qty} 
                            onChange={e => {
                              const newItems = [...prData.items];
                              newItems[idx].qty = e.target.value;
                              setPrData({ ...prData, items: newItems });
                            }} 
                            placeholder="จำนวน" 
                          />
                        </div>
                        <div className="field">
                          <label style={{ fontSize: '11px' }}>หน่วย</label>
                          <input 
                            type="text" 
                            value={row.unit} 
                            onChange={e => {
                              const newItems = [...prData.items];
                              newItems[idx].unit = e.target.value;
                              setPrData({ ...prData, items: newItems });
                            }} 
                            placeholder="หน่วย" 
                          />
                        </div>
                      </div>
                      <div className="field" style={{ marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px' }}>วัสดุในหมวดงาน / ข้อที่ (BOQ)</label>
                        <input 
                          type="text" 
                          value={row.boqRef} 
                          onChange={e => {
                            const newItems = [...prData.items];
                            newItems[idx].boqRef = e.target.value;
                            setPrData({ ...prData, items: newItems });
                          }}
                          placeholder="เช่น งานโครงสร้าง ข้อ 1.2" 
                        />
                      </div>
                      <div className="field">
                        <label style={{ fontSize: '11px' }}>นำไปใช้ในส่วนงาน / บริเวณ</label>
                        <input 
                          type="text" 
                          value={row.usageArea} 
                          onChange={e => {
                            const newItems = [...prData.items];
                            newItems[idx].usageArea = e.target.value;
                            setPrData({ ...prData, items: newItems });
                          }}
                          placeholder="เช่น ฐานราก F1 โซน A" 
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    className="btn ghost" 
                    type="button" 
                    onClick={() => setPrData(prev => ({ ...prev, items: [...prev.items, { item: '', qty: '', unit: '', boqRef: '', usageArea: '' }] }))}
                    style={{ width: '100%', marginTop: '6px', fontSize: '12px' }}
                  >
                    + เพิ่มรายการสั่งซื้อ
                  </button>
                </div>
              </div>

              {/* Signatures Card */}
              <div className="card">
                <h2>ผู้ลงนามในเอกสาร PR</h2>
                <div className="grid">
                  <div className="field">
                    <label>ผู้ขออนุมัติ / สั่งซื้อ (ชื่อ-นามสกุล หรือ ตำแหน่ง)</label>
                    <input 
                      type="text" 
                      value={prData.requesterName} 
                      onChange={e => setPrData({ ...prData, requesterName: e.target.value })} 
                      placeholder="เช่น วิศวกรโครงการ / นายกวิน"
                    />
                  </div>
                  <div className="field">
                    <label>วันที่ขออนุมัติ</label>
                    <input 
                      type="date" 
                      value={prData.requesterDate || prData.date} 
                      onChange={e => setPrData({ ...prData, requesterDate: e.target.value })} 
                    />
                  </div>
                  <div className="field">
                    <label>ผู้อนุมัติ / ผู้จัดการโครงการ (ระบุชื่อ หรือเว้นว่างไว้เซ็นมือ)</label>
                    <input 
                      type="text" 
                      value={prData.approverName} 
                      onChange={e => setPrData({ ...prData, approverName: e.target.value })} 
                      placeholder="เว้นว่างไว้เพื่อเซ็นสด หรือระบุชื่อ"
                    />
                  </div>
                  <div className="field">
                    <label>วันที่อนุมัติ</label>
                    <input 
                      type="date" 
                      value={prData.approverDate || ''} 
                      onChange={e => setPrData({ ...prData, approverDate: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="btnbar no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn ghost" onClick={() => { setActiveTab('hub'); setShowPreview(false); }}>← กลับหน้ารวม</button>
              <button className="btn ghost" onClick={handleClearForm} title="ล้างฟอร์มและโหลดค่าเริ่มต้นตามโครงการที่เลือก (หรือค่าตั้งต้นกลาง)">ล้างฟอร์ม</button>
              <button className="btn ghost" onClick={handleSaveDefaultForm} title={(docType === 'report' ? formData.project : (docType === 'request' ? reqData.project : prData.project)) ? `บันทึกค่าในตารางเป็นค่าเริ่มต้นของโครงการ "${docType === 'report' ? formData.project : reqData.project}"` : 'บันทึกค่าในตารางเป็นค่าตั้งต้นกลาง (Global Default)'}>💾 บันทึกเป็นรายการเริ่มต้น</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className="btn ghost" 
                onClick={() => handleSaveDoc(true)}
                style={{ color: '#92400e', borderColor: '#fcd34d', background: '#fffbeb' }}
                title="บันทึกเป็นฉบับร่างเพื่อกลับมาแก้ไขต่อภายหลัง"
              >
                💾 บันทึกฉบับร่าง
              </button>
              <button 
                className="btn primary" 
                onClick={() => handleSaveDoc(false)}
                title="บันทึกเอกสารเสร็จสมบูรณ์"
              >
                ✅ บันทึกเสร็จสมบูรณ์
              </button>
              <button className="btn primary" onClick={handlePreview} style={{ background: '#0f766e', borderColor: '#0f766e' }}>
                👁️ ดูตัวอย่าง / ส่งออก A4
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hub' && (() => {
        // Computed filter counts
        const countAll = reports.length;
        const countReport = reports.filter(r => r.docType === 'report').length;
        const countRequest = reports.filter(r => r.docType === 'request').length;
        const countPr = reports.filter(r => r.docType === 'pr').length;
        const countDraft = reports.filter(r => r.status === 'draft').length;

        // Filtered list
        const filteredReports = reports.filter(r => {
          // 1. Type / Status filter
          if (hubFilter === 'report' && r.docType !== 'report') return false;
          if (hubFilter === 'request' && r.docType !== 'request') return false;
          if (hubFilter === 'pr' && r.docType !== 'pr') return false;
          if (hubFilter === 'draft' && r.status !== 'draft') return false;

          // 2. Project filter
          if (hubProject && r.project !== hubProject) return false;

          // 3. Search query
          if (hubSearch.trim()) {
            const q = hubSearch.toLowerCase().trim();
            const projMatch = (r.project || '').toLowerCase().includes(q);
            const signerMatch = (r.signerName || r.requesterName || '').toLowerCase().includes(q);
            const prMatch = (r.prNo || '').toLowerCase().includes(q);
            const dateMatch = (r.date || '').toLowerCase().includes(q);
            if (!projMatch && !signerMatch && !prMatch && !dateMatch) return false;
          }

          return true;
        });

        return (
          <div id="hubTab">
            {/* 1. Header & Filter Pills */}
            <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
              <div className="hub-header">
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>ศูนย์รวมเอกสาร (Documents Hub)</h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    จัดการเอกสารทั้งหมด, ฉบับร่าง (Drafts) และดาวน์โหลดส่งออก PDF / PNG
                  </div>
                </div>

                {/* Single Primary "+ สร้างเอกสารใหม่" Dropdown */}
                <div className="new-doc-menu-wrapper">
                  <button 
                    className="btn primary"
                    type="button"
                    onClick={() => setIsNewDocMenuOpen(!isNewDocMenuOpen)}
                    style={{ padding: '9px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' }}
                  >
                    + สร้างเอกสารใหม่ <span style={{ fontSize: '10px' }}>▼</span>
                  </button>

                  {isNewDocMenuOpen && (
                    <>
                      <div className="new-doc-backdrop" onClick={() => setIsNewDocMenuOpen(false)} />
                      <div className="new-doc-dropdown" onClick={() => setIsNewDocMenuOpen(false)}>
                        <button className="new-doc-dropdown-item" type="button" onClick={() => handleCreateNewDoc('report')}>
                          <span style={{ fontSize: '18px' }}>📋</span>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>Daily Report</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>รายงานการปฏิบัติงานประจำวัน</div>
                          </div>
                        </button>
                        <button className="new-doc-dropdown-item" type="button" onClick={() => handleCreateNewDoc('request')}>
                          <span style={{ fontSize: '18px' }}>📝</span>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>Daily Request</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>ใบขออนุมัติปฏิบัติงานประจำวัน</div>
                          </div>
                        </button>
                        <button className="new-doc-dropdown-item" type="button" onClick={() => handleCreateNewDoc('pr')}>
                          <span style={{ fontSize: '18px' }}>🛒</span>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>PR / ใบสั่งซื้อ</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>ใบขออนุมัติสั่งซื้อวัสดุ/ของ</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Filter Pills */}
              <div className="hub-stats-bar">
                <button 
                  className={`hub-filter-pill ${hubFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setHubFilter('all')}
                >
                  ทั้งหมด <span className="pill-count">{countAll}</span>
                </button>
                <button 
                  className={`hub-filter-pill ${hubFilter === 'report' ? 'active' : ''}`}
                  onClick={() => setHubFilter('report')}
                >
                  📋 Daily Report <span className="pill-count">{countReport}</span>
                </button>
                <button 
                  className={`hub-filter-pill ${hubFilter === 'request' ? 'active' : ''}`}
                  onClick={() => setHubFilter('request')}
                >
                  📝 Daily Request <span className="pill-count">{countRequest}</span>
                </button>
                <button 
                  className={`hub-filter-pill ${hubFilter === 'pr' ? 'active' : ''}`}
                  onClick={() => setHubFilter('pr')}
                >
                  🛒 PR / ใบสั่งซื้อ <span className="pill-count">{countPr}</span>
                </button>
                <button 
                  className={`hub-filter-pill ${hubFilter === 'draft' ? 'active' : ''}`}
                  onClick={() => setHubFilter('draft')}
                  style={hubFilter !== 'draft' && countDraft > 0 ? { borderColor: '#f59e0b', color: '#b45309', background: '#fffbeb' } : {}}
                >
                  📝 ฉบับร่าง (Drafts) <span className="pill-count">{countDraft}</span>
                </button>
              </div>

              {/* Search & Project Controls */}
              <div className="hub-controls">
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text"
                    value={hubSearch}
                    onChange={e => setHubSearch(e.target.value)}
                    placeholder="🔍 ค้นหาตามชื่อโครงการ, เลขที่ PR, วันที่, หรือผู้จัดทำ..."
                    style={{ width: '100%', paddingLeft: '12px' }}
                  />
                  {hubSearch && (
                    <button 
                      onClick={() => setHubSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <select 
                  value={hubProject} 
                  onChange={e => setHubProject(e.target.value)}
                  style={{ minWidth: '220px' }}
                >
                  <option value="">🏢 ทุกโครงการ</option>
                  {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* 2. Documents List */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>
                  รายการเอกสาร ({filteredReports.length} รายการ)
                </h3>
                {reports.length > 0 && (
                  <button className="btn ghost" onClick={handleClearAllStorage} style={{ color: '#a13a2f', borderColor: '#e2b6ab', fontSize: '12px', padding: '4px 10px' }}>
                    ล้างประวัติทั้งหมด
                  </button>
                )}
              </div>

              {filteredReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b', marginBottom: '4px' }}>
                    {hubSearch || hubProject || hubFilter !== 'all' ? 'ไม่พบเอกสารตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีเอกสารในระบบ'}
                  </div>
                  <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                    {hubSearch || hubProject || hubFilter !== 'all' ? 'ลองปรับตัวกรองหรือล้างคำค้นหา' : 'กดปุ่มด้านล่างเพื่อเริ่มสร้างเอกสารใหม่'}
                  </div>
                  <button 
                    className="btn primary"
                    onClick={() => setIsNewDocMenuOpen(true)}
                  >
                    + สร้างเอกสารใหม่ทันที
                  </button>
                </div>
              ) : (
                filteredReports.slice().reverse().map(r => (
                  <div key={r.id} className="list-card" style={{ borderLeft: r.status === 'draft' ? '4px solid #f59e0b' : '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div className="meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          background: r.docType === 'pr' ? '#fef3c7' : (r.docType === 'request' ? '#dbeafe' : '#f0fdf4'),
                          color: r.docType === 'pr' ? '#92400e' : (r.docType === 'request' ? '#1e40af' : '#166534'),
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {r.docType === 'pr' ? 'PR' : (r.docType === 'request' ? 'Request' : 'Report')}
                        </span>
                        <span className={`status-badge ${r.status === 'draft' ? 'draft' : 'completed'}`}>
                          {r.status === 'draft' ? '📝 ฉบับร่าง' : '✅ บันทึกแล้ว'}
                        </span>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                          {r.project || '(ไม่ระบุชื่อโครงการ)'}
                        </span>
                        {r.docType === 'pr' && r.prNo && (
                          <span style={{ color: '#92400e', fontWeight: 'bold', fontSize: '12px', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                            {r.prNo}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        <span>📅 วันที่: {formatThaiDate(r.date)}</span>
                        {r.docType === 'pr' && r.requiredDate ? ` · วันที่ต้องการใช้: ${formatThaiDate(r.requiredDate)}` : ''}
                        {r.workType ? ` · ${r.workType}` : ''}
                        {` · ${r.signerName || r.requesterName ? `โดย ${r.signerName || r.requesterName}` : ''}`}
                      </div>
                    </div>
                    <div className="actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {r.driveUrl ? (
                        <a 
                          href={r.driveUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ padding: '5px 10px', fontSize: '12px', background: '#059669', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', borderRadius: '4px' }}
                          title="คลิกเพื่อเปิดไฟล์ PDF บน Google Drive ทันที"
                        >
                          📂 Google Drive ↗
                        </a>
                      ) : (
                        <button 
                          className="btn ghost" 
                          onClick={() => handleUploadDocToDrive(r)}
                          style={{ padding: '5px 10px', fontSize: '12px', color: '#059669', borderColor: '#a7f3d0', background: '#f0fdf4' }}
                          title="แปลงเป็น PDF และส่งขึ้น Google Drive"
                        >
                          📤 ส่งขึ้น Drive
                        </button>
                      )}
                      <button className="btn primary" onClick={() => handlePreviewHistory(r)} style={{ padding: '5px 10px', fontSize: '12px' }}>
                        👁️ ดูตัวอย่าง A4
                      </button>
                      <button 
                        className="btn ghost" 
                        onClick={() => {
                          setDocType(r.docType || 'report');
                          setPreviewData(r);
                          setTimeout(() => {
                            const prefix = r.docType === 'report' ? 'Daily_Report' : (r.docType === 'request' ? 'Daily_Request' : 'PR_Requisition');
                            exportToPdf('exportStagingContainer', `${prefix}_${r.date || ''}`);
                          }, 100);
                        }}
                        style={{ padding: '5px 10px', fontSize: '12px', color: '#2f5233', borderColor: '#c7e8c7', background: '#f0fdf4' }}
                        title="ส่งออกเป็นไฟล์ PDF ทันที"
                      >
                        📄 PDF
                      </button>
                      <button 
                        className="btn ghost" 
                        onClick={() => {
                          setDocType(r.docType || 'report');
                          setPreviewData(r);
                          setTimeout(() => {
                            const prefix = r.docType === 'report' ? 'Daily_Report' : (r.docType === 'request' ? 'Daily_Request' : 'PR_Requisition');
                            exportToImage('exportStagingContainer', `${prefix}_${r.date || ''}`);
                          }, 100);
                        }}
                        style={{ padding: '5px 10px', fontSize: '12px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                        title="ส่งออกเป็นรูปภาพ PNG ทันที"
                      >
                        🖼️ PNG
                      </button>
                      <button 
                        className="btn ghost" 
                        onClick={() => handleEditDoc(r)} 
                        style={{ padding: '5px 10px', fontSize: '12px', color: '#1e293b' }}
                        title="เปิดแก้ไขเอกสาร"
                      >
                        ✏️ {r.status === 'draft' ? 'แก้ไขต่อ' : 'แก้ไข'}
                      </button>
                      <button 
                        className="btn ghost" 
                        onClick={() => handleDuplicateDoc(r)} 
                        style={{ padding: '5px 10px', fontSize: '12px', color: '#4338ca', borderColor: '#c7d2fe', background: '#eef2ff' }}
                        title="ทำซ้ำเอกสารนี้เป็นฉบับร่างใหม่"
                      >
                        📋 ทำซ้ำ
                      </button>
                      <button className="btn ghost" onClick={() => handleDeleteDoc(r.id)} style={{ color: '#a13a2f', padding: '5px 10px', fontSize: '12px' }}>ลบ</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}
      {activeTab === 'company' && (
        <div id="companyTab">
          {/* Google Drive Integration Card */}
          <div className="card" style={{ border: '2px solid #059669', background: '#f0fdf4', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '26px' }}>📂</span>
                <div>
                  <h2 style={{ margin: 0, color: '#065f46', fontSize: '16px', fontWeight: 'bold' }}>การเชื่อมต่อ Google Drive (Auto-Sync PDF)</h2>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                    ส่งไฟล์ PDF ไปยังโฟลเดอร์ Google Drive อัตโนมัติ พร้อมสร้างลิงก์สำหรับกดเปิดดูได้ทันที
                  </div>
                </div>
              </div>
              <button 
                className="btn ghost"
                type="button"
                onClick={() => setShowDriveGuideModal(true)}
                style={{ fontSize: '12px', padding: '6px 12px', borderColor: '#059669', color: '#065f46', background: '#fff', fontWeight: '500' }}
              >
                📖 ดูวิธีติดตั้ง Google Apps Script (คู่มือ)
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="field">
                <label style={{ fontWeight: 'bold', color: '#065f46', marginBottom: '4px' }}>Google Apps Script Webhook URL</label>
                <input 
                  type="text" 
                  value={driveSettings.webhookUrl || ''} 
                  onChange={e => setDriveSettings({ ...driveSettings, webhookUrl: e.target.value })} 
                  placeholder="เช่น https://script.google.com/macros/s/AKfycbx.../exec"
                  style={{ background: '#fff', width: '100%' }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 'bold', color: '#065f46', marginBottom: '4px' }}>Google Drive Folder ID (รหัสโฟลเดอร์หลักบน Google Drive)</label>
                <input 
                  type="text" 
                  value={driveSettings.folderId || ''} 
                  onChange={e => setDriveSettings({ ...driveSettings, folderId: e.target.value })} 
                  placeholder="เช่น 1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW (หรือเว้นว่างไว้ให้บันทึกลง Root Folder)"
                  style={{ background: '#fff', width: '100%' }}
                />
                <div style={{ fontSize: '11px', color: '#047857', marginTop: '4px' }}>
                  💡 นำมาจาก URL โฟลเดอร์ใน Drive เช่น drive.google.com/drive/folders/<strong>[รหัส ID ตรงนี้]</strong>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #a7f3d0', padding: '12px 14px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', color: '#065f46', fontSize: '13px', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={driveSettings.autoUpload !== false} 
                    onChange={e => setDriveSettings({ ...driveSettings, autoUpload: e.target.checked })} 
                  />
                  ส่งไฟล์ PDF ขึ้น Google Drive อัตโนมัติเมื่อกด "บันทึกเสร็จสมบูรณ์"
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn primary" 
                type="button"
                onClick={async () => {
                  await docGeneratorService.saveGoogleDriveSettings(driveSettings);
                  alert('💾 บันทึกการตั้งค่า Google Drive เรียบร้อยแล้ว');
                }}
                style={{ background: '#059669', borderColor: '#059669', padding: '8px 16px', fontSize: '13px' }}
              >
                💾 บันทึกการตั้งค่า Google Drive
              </button>
              <button 
                className="btn ghost" 
                type="button"
                onClick={async () => {
                  try {
                    setDriveTestStatus('testing');
                    const res = await testGoogleDriveWebhook(driveSettings.webhookUrl);
                    alert('✅ ' + res.message);
                    setDriveTestStatus('success');
                  } catch(err) {
                    alert('❌ ' + err.message);
                    setDriveTestStatus('error');
                  }
                }}
                style={{ background: '#fff', borderColor: '#059669', color: '#065f46', padding: '8px 16px', fontSize: '13px' }}
              >
                ⚡ ทดสอบการเชื่อมต่อ
              </button>
            </div>
          </div>

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
            <div className="proj-reg-grid" style={{ gap: "10px", alignItems: "flex-end", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
              <div className="field" style={{ margin: 0 }}>
                <label>ชื่อโครงการใหม่</label>
                <input type="text" id="newProjName" placeholder="เช่น งานก่อสร้างอาคาร ICN" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>เจ้าของโครงการ</label>
                <input type="text" id="newProjOwner" placeholder="เช่น บริษัท ไคลเอนท์ จำกัด" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Prefix PR (รหัสใบสั่งซื้อ)</label>
                <input type="text" id="newProjPrPrefix" placeholder="เช่น PR-ICN-" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>เลขเริ่มต้น</label>
                <input type="number" id="newProjPrStartNo" defaultValue="1" min="1" placeholder="1" style={{ textAlign: "center" }} />
              </div>
              <div>
                <button className="btn primary" style={{ height: "38px", whiteSpace: "nowrap", width: "100%" }} onClick={async () => {
                  const n = document.getElementById("newProjName").value.trim();
                  const o = document.getElementById("newProjOwner").value.trim();
                  const prPre = document.getElementById("newProjPrPrefix").value.trim() || "PR-";
                  const prStart = parseInt(document.getElementById("newProjPrStartNo").value.trim(), 10) || 1;
                  if(n){
                    const newProj = await docGeneratorService.addProject({ name: n, owner: o, pr_prefix: prPre, pr_start_no: prStart });
                    if (newProj) setProjects([...projects, newProj]);
                    document.getElementById("newProjName").value = "";
                    document.getElementById("newProjOwner").value = "";
                    document.getElementById("newProjPrPrefix").value = "";
                    document.getElementById("newProjPrStartNo").value = "1";
                  } else {
                    alert("กรุณากรอกชื่อโครงการ");
                  }
                }}>+ เพิ่มโครงการ</button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="table-scroll-wrap task-table-desktop">
              <table className="entry-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>ลำดับ</th>
                    <th style={{ width: "35%" }}>ชื่อโครงการ (แก้ไขได้)</th>
                    <th style={{ width: "25%" }}>เจ้าของโครงการ (แก้ไขได้)</th>
                    <th style={{ width: "140px" }}>Prefix PR</th>
                    <th style={{ width: "90px", textAlign: "center" }}>เลขเริ่มต้น</th>
                    <th style={{ width: "50px", textAlign: "center" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 && <tr><td colSpan="6" style={{ textAlign: "center", color: "#64748b", padding: "16px" }}>ยังไม่มีข้อมูลโครงการในทะเบียน</td></tr>}
                  {projects.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={{ textAlign: "center", color: "#64748b", fontWeight: "bold" }}>{idx + 1}</td>
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
                      <td>
                        <input
                          type="text"
                          value={p.pr_prefix !== undefined ? p.pr_prefix : "PR-"}
                          onChange={e => {
                            const val = e.target.value;
                            setProjects(projects.map(x => x.id === p.id ? { ...x, pr_prefix: val } : x));
                          }}
                          onBlur={async e => {
                            const val = e.target.value;
                            await docGeneratorService.updateProject(p.id, { pr_prefix: val });
                          }}
                          placeholder="เช่น PR-ICN-"
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          value={p.pr_start_no !== undefined ? p.pr_start_no : 1}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setProjects(projects.map(x => x.id === p.id ? { ...x, pr_start_no: val } : x));
                          }}
                          onBlur={async e => {
                            const val = parseInt(e.target.value, 10) || 1;
                            await docGeneratorService.updateProject(p.id, { pr_start_no: val });
                          }}
                          style={{ textAlign: "center" }}
                          min="1"
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
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
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="task-cards-mobile">
              {projects.length === 0 && <p style={{ color: "#64748b", textAlign: "center", padding: "16px" }}>ยังไม่มีข้อมูลโครงการในทะเบียน</p>}
              {projects.map((p, idx) => (
                <div key={p.id} className="task-mobile-card">
                  <div className="task-mobile-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: "bold", color: "var(--primary)" }}>โครงการที่ {idx + 1}</span>
                    <button
                      className="btn ghost"
                      style={{ color: "var(--danger)", borderColor: "#e2b6ab", fontSize: "12px", padding: "3px 8px", height: "28px", display: "inline-flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                      title="ลบโครงการ"
                      onClick={async () => {
                        if(window.confirm(`ลบโครงการ "${p.name}" ออกจากทะเบียน?`)) {
                          await docGeneratorService.deleteProject(p.id);
                          setProjects(projects.filter(x => x.id !== p.id));
                        }
                      }}
                    >
                      ✕ ลบ
                    </button>
                  </div>
                  <div className="field">
                    <label>ชื่อโครงการ</label>
                    <textarea
                      rows={2}
                      value={p.name}
                      onChange={e => {
                        const val = e.target.value;
                        setProjects(projects.map(x => x.id === p.id ? { ...x, name: val } : x));
                      }}
                      onBlur={async e => {
                        const val = e.target.value;
                        await docGeneratorService.updateProject(p.id, { name: val });
                      }}
                      placeholder="เช่น งานก่อสร้างอาคาร A"
                      style={{ minHeight: "50px", resize: "vertical", lineHeight: "1.4", padding: "6px 10px", width: "100%", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                  <div className="field">
                    <label>เจ้าของโครงการ</label>
                    <textarea
                      rows={2}
                      value={p.owner}
                      onChange={e => {
                        const val = e.target.value;
                        setProjects(projects.map(x => x.id === p.id ? { ...x, owner: val } : x));
                      }}
                      onBlur={async e => {
                        const val = e.target.value;
                        await docGeneratorService.updateProject(p.id, { owner: val });
                      }}
                      placeholder="เช่น บริษัท B จำกัด"
                      style={{ minHeight: "50px", resize: "vertical", lineHeight: "1.4", padding: "6px 10px", width: "100%", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "8px" }}>
                    <div className="field">
                      <label style={{ fontSize: "11px" }}>Prefix PR</label>
                      <input
                        type="text"
                        value={p.pr_prefix !== undefined ? p.pr_prefix : "PR-"}
                        onChange={e => {
                          const val = e.target.value;
                          setProjects(projects.map(x => x.id === p.id ? { ...x, pr_prefix: val } : x));
                        }}
                        onBlur={async e => {
                          const val = e.target.value;
                          await docGeneratorService.updateProject(p.id, { pr_prefix: val });
                        }}
                        placeholder="เช่น PR-ICN-"
                      />
                    </div>
                    <div className="field">
                      <label style={{ fontSize: "11px" }}>เลขเริ่มต้น</label>
                      <input
                        type="number"
                        value={p.pr_start_no !== undefined ? p.pr_start_no : 1}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setProjects(projects.map(x => x.id === p.id ? { ...x, pr_start_no: val } : x));
                        }}
                        onBlur={async e => {
                          const val = parseInt(e.target.value, 10) || 1;
                          await docGeneratorService.updateProject(p.id, { pr_start_no: val });
                        }}
                        min="1"
                        style={{ textAlign: "center" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          </div>
          <div className="a4-container" ref={a4ContainerRef}>
            <div id={`active-report-${reportTheme}`} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {docType === 'report' 
                ? renderFullReportPages(previewData, reportTheme === 'modern' ? 'modern-theme' : 'classic-theme', previewScale) 
                : (docType === 'request' ? <ScaledA4Page scale={previewScale}><DailyRequestView data={previewData} company={company} themeClass={reportTheme === 'modern' ? 'modern-theme' : 'classic-theme'} formatThaiDate={formatThaiDate} /></ScaledA4Page> : <ScaledA4Page scale={previewScale}><PurchaseRequisitionView data={previewData} company={company} themeClass={reportTheme === 'modern' ? 'modern-theme' : 'classic-theme'} formatThaiDate={formatThaiDate} /></ScaledA4Page>)}
            </div>
          </div>
          <div className="btnbar" style={{ marginTop: '12px' }}><button className="btn ghost" onClick={() => setShowPreview(false)}>ปิด</button></div>
        </div>
      )}

      {previewData && (
        <div 
          id="exportStagingContainer" 
          style={{ 
            position: "fixed", 
            left: "-9999px", 
            top: 0, 
            width: "794px", 
            zIndex: -9999, 
            opacity: 1, 
            pointerEvents: "none", 
            background: "#ffffff" 
          }}
        >
          <div className="a4-container" style={{ padding: 0, background: "transparent" }}>
            {docType === "report" 
                ? renderFullReportPages(previewData, reportTheme === "modern" ? "modern-theme" : "classic-theme", 1) 
                : (docType === "request" ? <ScaledA4Page scale={1}><DailyRequestView data={previewData} company={company} themeClass={reportTheme === "modern" ? "modern-theme" : "classic-theme"} formatThaiDate={formatThaiDate} /></ScaledA4Page> : <ScaledA4Page scale={1}><PurchaseRequisitionView data={previewData} company={company} themeClass={reportTheme === "modern" ? "modern-theme" : "classic-theme"} formatThaiDate={formatThaiDate} /></ScaledA4Page>)}
          </div>
        </div>
      )}
      {/* Google Apps Script Guide Modal */}
      {showDriveGuideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDriveGuideModal(false)}>
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#065f46' }}>📖 คู่มือติดตั้ง Google Apps Script สำหรับเชื่อมต่อ Google Drive</h3>
              <button className="btn ghost" onClick={() => setShowDriveGuideModal(false)} style={{ border: 'none', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155' }}>
              <p><strong>ขั้นตอนที่ 1:</strong> เปิดเว็บ <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: '#059669', fontWeight: 'bold' }}>script.google.com</a> ด้วยบัญชี Google ของบริษัท แล้วกด <strong>"+ New project"</strong></p>
              
              <p><strong>ขั้นตอนที่ 2:</strong> ลบโค้ดเดิมทั้งหมดออก แล้ววางโค้ดด้านล่างนี้ลงในไฟล์ <code>Code.gs</code>:</p>
              
              <div style={{ position: 'relative' }}>
                <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '11px', overflowX: 'auto', maxHeight: '250px' }}>
{`const DEFAULT_ROOT_FOLDER_ID = ""; // ใส่ Folder ID หรือปล่อยว่างไว้ให้ลง Root

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const body = JSON.parse(rawData);

    if (body.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'เชื่อมต่อ Google Drive สำเร็จ 100%!' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const folderId = body.folderId || DEFAULT_ROOT_FOLDER_ID;
    let targetFolder;
    try {
      targetFolder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    } catch(err) {
      targetFolder = DriveApp.getRootFolder();
    }

    // สร้างโฟลเดอร์ย่อยตามชื่อโครงการอัตโนมัติ
    if (body.projectName && body.projectName !== 'ทั่วไป') {
      const subfolders = targetFolder.getFoldersByName(body.projectName);
      if (subfolders.hasNext()) {
        targetFolder = subfolders.next();
      } else {
        targetFolder = targetFolder.createFolder(body.projectName);
      }
    }

    // แปลง Base64 เป็นไฟล์ PDF
    const decodedBytes = Utilities.base64Decode(body.base64Data);
    const blob = Utilities.newBlob(decodedBytes, body.mimeType || "application/pdf", body.filename || "document.pdf");

    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      filename: file.getName(),
      folderName: targetFolder.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Google Drive Webhook Active' }))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                </pre>
                <button 
                  className="btn primary"
                  style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '11px', padding: '4px 8px', background: '#059669', border: 'none' }}
                  onClick={() => {
                    const code = `const DEFAULT_ROOT_FOLDER_ID = "";

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const body = JSON.parse(rawData);

    if (body.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'เชื่อมต่อ Google Drive สำเร็จ 100%!' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const folderId = body.folderId || DEFAULT_ROOT_FOLDER_ID;
    let targetFolder;
    try {
      targetFolder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    } catch(err) {
      targetFolder = DriveApp.getRootFolder();
    }

    if (body.projectName && body.projectName !== 'ทั่วไป') {
      const subfolders = targetFolder.getFoldersByName(body.projectName);
      if (subfolders.hasNext()) {
        targetFolder = subfolders.next();
      } else {
        targetFolder = targetFolder.createFolder(body.projectName);
      }
    }

    const decodedBytes = Utilities.base64Decode(body.base64Data);
    const blob = Utilities.newBlob(decodedBytes, body.mimeType || "application/pdf", body.filename || "document.pdf");

    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      filename: file.getName(),
      folderName: targetFolder.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Google Drive Webhook Active' }))
    .setMimeType(ContentService.MimeType.JSON);
}`;
                    navigator.clipboard.writeText(code);
                    alert('คัดลอกโค้ด Google Apps Script เรียบร้อยแล้ว!');
                  }}
                >
                  📋 คัดลอกโค้ด
                </button>
              </div>

              <p style={{ marginTop: '12px' }}><strong>ขั้นตอนที่ 3:</strong> กดปุ่มสีน้ำเงิน <strong>"Deploy" ➡️ "New deployment"</strong> ทางมุมขวาบน:</p>
              <ul>
                <li>เลือกประเภท: <strong>Web app</strong> (กดรูปเฟือง)</li>
                <li>Execute as: <strong>Me (บัญชีของคุณ)</strong></li>
                <li>Who has access: <strong>Anyone (ทุกคนที่มีลิงก์)</strong> <span style={{ color: '#dc2626', fontWeight: 'bold' }}>*สำคัญมาก</span></li>
              </ul>

              <p><strong>ขั้นตอนที่ 4:</strong> กด Deploy แล้วคัดลอก <strong>Web app URL</strong> มาวางในช่องตั้งค่าด้านบน แล้วกด <strong>"⚡ ทดสอบการเชื่อมต่อ"</strong> ได้เลยครับ!</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay when uploading to drive */}
      {isUploadingDrive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>กำลังสร้างไฟล์ PDF และส่งขึ้น Google Drive...</div>
          <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '4px' }}>กรุณารอสักครู่</div>
        </div>
      )}

    </div>
  );
}

export default App;
