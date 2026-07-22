// --- SEED MOCK DATA ---
const DEFAULT_PROJECTS = [
    {
        id: "proj-1",
        name: "โครงการ โรงเรียนนานาชาติ NASH บางบัวทอง",
        budget: 25000000,
        boq: [
            { code: "BOQ-101", name: "งานเข็มเจาะและวิศวกรรมดิน", budget: 8000000, spent: 0 },
            { code: "BOQ-102", name: "งานโครงสร้าง คสล. อาคารเรียน", budget: 10000000, spent: 0 },
            { code: "BOQ-103", name: "งานสถาปัตยกรรมและสีภายนอก", budget: 4000000, spent: 0 },
            { code: "BOQ-104", name: "งานระบบไฟฟ้าและปรับอากาศ (HVAC)", budget: 3000000, spent: 0 }
        ]
    },
    {
        id: "proj-2",
        name: "โครงการ Retail 3 ชั้น เอกมัย",
        budget: 12000000,
        boq: [
            { code: "BOQ-201", name: "งานโครงสร้างเหล็กรูปพรรณ", budget: 5000000, spent: 0 },
            { code: "BOQ-202", name: "งานผนังกระจกอลูมิเนียม Curtain Wall", budget: 4000000, spent: 0 },
            { code: "BOQ-203", name: "งานระบบสุขาภิบาลและป้องกันอัคคีภัย", budget: 3000000, spent: 0 }
        ]
    },
    {
        id: "proj-3",
        name: "โครงการ โกดังสินค้า กบินทร์บุรี",
        budget: 9000000,
        boq: [
            { code: "BOQ-301", name: "งานปรับระดับดินและพื้นคอนกรีตขัดมัน Slab on Ground", budget: 4500000, spent: 0 },
            { code: "BOQ-302", name: "งานโครงสร้างเหล็กหลังคา PEB", budget: 3500000, spent: 0 },
            { code: "BOQ-303", name: "งานระบบระบายน้ำและรั้วรอบโครงการ", budget: 1000000, spent: 0 }
        ]
    }
];

const DEFAULT_PRS = [
    {
        id: "PR-69001",
        itemName: "คอนกรีตผสมเสร็จ CPAC 240 ksc (ทรงกระบอก)",
        qty: 120,
        unit: "คิว",
        orderDate: "2026-06-25",
        needDate: "2026-07-02",
        requester: "วิศวกรสมชาย (หน้างาน)",
        projectId: "proj-1",
        boqCode: "BOQ-101",
        urgency: "high",
        remarks: "ใช้เทลานจอดรถและทางเชื่อมอาคารเรียน",
        step: 1,
        supplier: "", poNumber: "", price: 0, quoteFile: "",
        receiver: "", receiveDate: "", deliveryStatus: "", deliveryRemarks: "", deliveryFile: "",
        invoiceNumber: "", invoiceDate: "", invoiceUploader: "", invoiceFile: ""
    },
    {
        id: "PR-69002",
        itemName: "เหล็กเส้นข้ออ้อย SD40 ขนาด 16 มม. ยาว 10 ม.",
        qty: 450,
        unit: "เส้น",
        orderDate: "2026-06-26",
        needDate: "2026-07-05",
        requester: "โฟร์แมนสุรชัย (หน้างาน)",
        projectId: "proj-1",
        boqCode: "BOQ-102",
        urgency: "medium",
        remarks: "สำหรับเหล็กเสริมเสาอาคารเรียนหลัก",
        step: 2,
        supplier: "เหล็กไทยอินเตอร์ จำกัด",
        poNumber: "PO-26-0101",
        price: 185000,
        quoteFile: "mock_quotation_steel.jpg",
        receiver: "", receiveDate: "", deliveryStatus: "", deliveryRemarks: "", deliveryFile: "",
        invoiceNumber: "", invoiceDate: "", invoiceUploader: "", invoiceFile: ""
    },
    {
        id: "PR-69003",
        itemName: "เครื่องปรับอากาศติดผนัง DAIKIN 18000 BTU",
        qty: 15,
        unit: "เครื่อง",
        orderDate: "2026-06-24",
        needDate: "2026-06-29",
        requester: "วิศวกรสมชาย (หน้างาน)",
        projectId: "proj-1",
        boqCode: "BOQ-104",
        urgency: "low",
        remarks: "ใช้ติดตั้งในห้องเรียนชั้น 2 ฝั่งตะวันตก",
        step: 3,
        supplier: "ระยองแอร์คอนดิชันนิ่ง",
        poNumber: "PO-26-0105",
        price: 330000,
        quoteFile: "mock_quote_air.jpg",
        receiver: "วิศวกรสมชาย",
        receiveDate: "2026-06-29",
        deliveryStatus: "complete",
        deliveryRemarks: "ตรวจรับของเรียบร้อย สภาพกล่องสมบูรณ์ ดีทุกเครื่อง",
        deliveryFile: "mock_delivery_air.jpg",
        invoiceNumber: "", invoiceDate: "", invoiceUploader: "", invoiceFile: ""
    },
    {
        id: "PR-69004",
        itemName: "เสาเหล็กโครงสร้าง H-Beam 250x250 มม.",
        qty: 25,
        unit: "ท่อน",
        orderDate: "2026-06-20",
        needDate: "2026-06-27",
        requester: "วิศวกรธีรเดช (หน้างาน)",
        projectId: "proj-2",
        boqCode: "BOQ-201",
        urgency: "high",
        remarks: "ใช้ในงานโครงสร้างหลักชั้น 1 ด่วนที่สุด",
        step: 4,
        supplier: "เหล็กแปซิฟิก กรุงเทพ",
        poNumber: "PO-26-0088",
        price: 625000,
        quoteFile: "mock_quote_hbeam.jpg",
        receiver: "ธีรเดช",
        receiveDate: "2026-06-26",
        deliveryStatus: "complete",
        deliveryRemarks: "ตรวจรับของเรียบร้อย ครบตามจำนวน สภาพสมบูรณ์",
        deliveryFile: "mock_delivery_hbeam.jpg",
        invoiceNumber: "INV-TAX-998822",
        invoiceDate: "2026-06-28",
        invoiceUploader: "จัดซื้อ",
        invoiceFile: "mock_invoice_hbeam.jpg"
    },
    {
        id: "PR-69005",
        itemName: "ชุดกระจกนิรภัย Tempered 12 มม. พร้อมเฟรม",
        qty: 80,
        unit: "ตร.ม.",
        orderDate: "2026-06-28",
        needDate: "2026-07-10",
        requester: "วิศวกรธีรเดช (หน้างาน)",
        projectId: "proj-2",
        boqCode: "BOQ-202",
        urgency: "medium",
        remarks: "สำหรับงานผนังภายนอกด้านหน้าห้าง (Curtain Wall)",
        step: 1,
        supplier: "", poNumber: "", price: 0, quoteFile: "",
        receiver: "", receiveDate: "", deliveryStatus: "", deliveryRemarks: "", deliveryFile: "",
        invoiceNumber: "", invoiceDate: "", invoiceUploader: "", invoiceFile: ""
    },
    {
        id: "PR-69006",
        itemName: "ท่อดับเพลิงเหล็กดำไร้ตะเข็บ Schedule 40 ขนาด 4 นิ้ว",
        qty: 150,
        unit: "ท่อน",
        orderDate: "2026-06-27",
        needDate: "2026-07-06",
        requester: "โฟร์แมนกฤษณะ (หน้างาน)",
        projectId: "proj-2",
        boqCode: "BOQ-203",
        urgency: "medium",
        remarks: "ใช้ในงานระบบสปริงเกอร์ดับเพลิงอาคาร",
        step: 2,
        supplier: "สยามไพพ์ แอนด์ ฟิตติ้ง",
        poNumber: "PO-26-0120",
        price: 360000,
        quoteFile: "mock_quote_pipe.jpg",
        receiver: "", receiveDate: "", deliveryStatus: "", deliveryRemarks: "", deliveryFile: "",
        invoiceNumber: "", invoiceDate: "", invoiceUploader: "", invoiceFile: ""
    },
    {
        id: "PR-69007",
        itemName: "ตะแกรงเหล็กสำเร็จรูป Wire Mesh หนา 4 มม. ระยะ 20 ซม.",
        qty: 1500,
        unit: "ตร.ม.",
        orderDate: "2026-06-22",
        needDate: "2026-06-28",
        requester: "วิศวกรปกรณ์ (หน้างาน)",
        projectId: "proj-3",
        boqCode: "BOQ-301",
        urgency: "high",
        remarks: "ปูโครงสร้างพื้นก่อนการเทคอนกรีตโกดังเฟส B",
        step: 3,
        supplier: "ไทยตะแกรงเหล็กนิคมอุตสาหกรรม",
        poNumber: "PO-26-0095",
        price: 98000,
        quoteFile: "mock_quote_wiremesh.jpg",
        receiver: "ปกรณ์",
        receiveDate: "2026-06-28",
        deliveryStatus: "incomplete",
        deliveryRemarks: "สินค้าส่งขาดไป 50 ตร.ม. ทางร้านแจ้งจะนำมาส่งเพิ่มพรุ่งนี้เช้า",
        deliveryFile: "mock_delivery_wiremesh.jpg",
        invoiceNumber: "", invoiceDate: "", invoiceUploader: "", invoiceFile: ""
    },
    {
        id: "PR-69008",
        itemName: "แผ่นหลังคาอลูซิงค์ Bluescope หนา 0.45 มม. บุฉนวน PE",
        qty: 2400,
        unit: "เมตร",
        orderDate: "2026-06-18",
        needDate: "2026-06-25",
        requester: "วิศวกรปกรณ์ (หน้างาน)",
        projectId: "proj-3",
        boqCode: "BOQ-302",
        urgency: "high",
        remarks: "ใช้มุงหลังคาโกดังสินค้าหลักเพื่อปิดอาคาร",
        step: 4,
        supplier: "เมทัลชีท กบินทร์ค้าวัสดุ",
        poNumber: "PO-26-0080",
        price: 528000,
        quoteFile: "mock_quote_roof.jpg",
        receiver: "ปกรณ์",
        receiveDate: "2026-06-25",
        deliveryStatus: "complete",
        deliveryRemarks: "แผ่นหลังคาครบถ้วน สภาพดีมาก ไม่มีรอยบุบหรือรอยขีดข่วน",
        deliveryFile: "mock_delivery_roof.jpg",
        invoiceNumber: "INV-6901140",
        invoiceDate: "2026-06-27",
        invoiceUploader: "หน้างาน",
        invoiceFile: "mock_invoice_roof.jpg"
    }
];

// --- APP STATE MANAGER ---
let projects = [];
let prs = [];
let activeTab = "kanban"; // "kanban" or "boq"
let currentSelectedPrId = null;

// Initialize App Data
function initData() {
    const savedProjects = localStorage.getItem("construct_projects_v2");
    const savedPRs = localStorage.getItem("construct_prs_v2");
    const savedTheme = localStorage.getItem("construct_theme") || "dark";

    if (savedProjects && savedPRs) {
        projects = JSON.parse(savedProjects);
        prs = JSON.parse(savedPRs);
    } else {
        projects = JSON.parse(JSON.stringify(DEFAULT_PROJECTS));
        prs = JSON.parse(JSON.stringify(DEFAULT_PRS));
        saveState();
    }

    // Apply saved theme
    if (savedTheme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        document.getElementById("theme-text").textContent = "โหมดมืด";
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        document.getElementById("theme-text").textContent = "โหมดสว่าง";
    }

    recalculateBOQSpent();
}

function saveState() {
    localStorage.setItem("construct_projects_v2", JSON.stringify(projects));
    localStorage.setItem("construct_prs_v2", JSON.stringify(prs));
}

// Recalculate BOQ spent balances based on PRs that have PO prices
function recalculateBOQSpent() {
    // Reset all spent values
    projects.forEach(p => {
        p.boq.forEach(b => {
            b.spent = 0;
        });
    });

    // Sum PO price of items in Step 2, 3, 4 (where price is set)
    prs.forEach(pr => {
        if (pr.step >= 2 && pr.price > 0) {
            const project = projects.find(p => p.id === pr.projectId);
            if (project) {
                const boqItem = project.boq.find(b => b.code === pr.boqCode);
                if (boqItem) {
                    boqItem.spent += Number(pr.price);
                }
            }
        }
    });

    saveState();
}

// --- DOM RENDER FUNCTIONS ---

// Populates filter dropdown and modal project select options
function populateDropdowns() {
    const projectFilter = document.getElementById("project-filter");
    const newProjectSelect = document.getElementById("new-project");

    // Clear existing
    projectFilter.innerHTML = '<option value="all">ทุกโครงการ</option>';
    newProjectSelect.innerHTML = '<option value="" disabled selected>เลือกโครงการ...</option>';

    projects.forEach(proj => {
        // Filter dropdown
        const optFilter = document.createElement("option");
        optFilter.value = proj.id;
        optFilter.textContent = proj.name;
        projectFilter.appendChild(optFilter);

        // New PR modal select
        const optNew = document.createElement("option");
        optNew.value = proj.id;
        optNew.textContent = proj.name;
        newProjectSelect.appendChild(optNew);
    });
}

// Update BOQ items based on selected Project in Forms
function updateBOQDropdown(projectSelectId, boqSelectId) {
    const projSelect = document.getElementById(projectSelectId);
    const boqSelect = document.getElementById(boqSelectId);
    const selectedProjId = projSelect.value;

    boqSelect.innerHTML = '<option value="" disabled selected>เลือกรายการ BOQ...</option>';
    
    if (!selectedProjId) {
        boqSelect.disabled = true;
        return;
    }

    const project = projects.find(p => p.id === selectedProjId);
    if (project && project.boq) {
        project.boq.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.code;
            opt.textContent = `[${item.code}] ${item.name} (คงเหลือ: ${(item.budget - item.spent).toLocaleString()} บาท)`;
            boqSelect.appendChild(opt);
        });
        boqSelect.disabled = false;
    }
}

// Render Kanban Cards
function renderKanban() {
    const filterProj = document.getElementById("project-filter").value;
    const searchVal = document.getElementById("search-input").value.toLowerCase();

    // Clear all card columns
    for (let s = 1; s <= 4; s++) {
        document.getElementById(`cards-col-${s}`).innerHTML = "";
    }

    const colCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    prs.forEach(pr => {
        // Apply Project Filter
        if (filterProj !== "all" && pr.projectId !== filterProj) return;

        // Apply Search Filter
        const matchesSearch = 
            pr.itemName.toLowerCase().includes(searchVal) ||
            pr.id.toLowerCase().includes(searchVal) ||
            pr.requester.toLowerCase().includes(searchVal) ||
            (pr.poNumber && pr.poNumber.toLowerCase().includes(searchVal)) ||
            (pr.supplier && pr.supplier.toLowerCase().includes(searchVal));

        if (!matchesSearch) return;

        // Get Project Name
        const proj = projects.find(p => p.id === pr.projectId);
        const projName = proj ? proj.name.split(" ")[1] || proj.name : "-";

        // Create card element
        const card = document.createElement("div");
        card.className = "pr-card";
        card.draggable = true;
        card.setAttribute("id", pr.id);
        card.setAttribute("ondragstart", "drag(event)");
        card.setAttribute("onclick", `openPrDetailsModal('${pr.id}')`);

        // Check which files are attached
        let attachmentsHTML = "";
        if (pr.quoteFile) attachmentsHTML += `<span class="attachment-dot dot-quote" title="มีเสนอราคา/PO">Q</span>`;
        if (pr.deliveryFile) attachmentsHTML += `<span class="attachment-dot dot-delivery" title="มีใบส่งของ/รูปถ่าย">D</span>`;
        if (pr.invoiceFile) attachmentsHTML += `<span class="attachment-dot dot-invoice" title="มีใบกำกับภาษี">I</span>`;

        card.innerHTML = `
            <div class="card-top">
                <span class="project-tag" title="${proj ? proj.name : ''}">${projName}</span>
                <span class="urgency-indicator urgency-${pr.urgency}" title="ระดับความเร่งด่วน: ${pr.urgency}"></span>
            </div>
            <h3 class="card-item-title">${pr.itemName}</h3>
            <div class="card-qty">จำนวน: <strong>${pr.qty} ${pr.unit}</strong></div>
            <div class="card-meta-info">
                <div>
                    <i data-lucide="user"></i>
                    <span>${pr.requester.split(" ")[0]}</span>
                </div>
                <div class="card-attachments">
                    ${attachmentsHTML}
                </div>
            </div>
        `;

        const column = document.getElementById(`cards-col-${pr.step}`);
        if (column) {
            column.appendChild(card);
            colCounts[pr.step]++;
        }
    });

    // Update Counts
    for (let s = 1; s <= 4; s++) {
        document.getElementById(`count-col-${s}`).textContent = colCounts[s];
    }

    // Refresh Icons for newly injected dynamic HTML
    lucide.createIcons();
}

// Render BOQ Dashboard View
function renderBOQDashboard() {
    let totalBudget = 0;
    let totalSpent = 0;

    projects.forEach(p => {
        totalBudget += p.budget;
        p.boq.forEach(b => {
            totalSpent += b.spent;
        });
    });

    const totalRemaining = totalBudget - totalSpent;

    document.getElementById("total-boq-budget").textContent = totalBudget.toLocaleString() + " บาท";
    document.getElementById("total-po-spent").textContent = totalSpent.toLocaleString() + " บาท";
    document.getElementById("total-boq-remaining").textContent = totalRemaining.toLocaleString() + " บาท";

    // Setup project tabs
    const tabList = document.getElementById("boq-project-tabs");
    const activeTab = tabList.querySelector(".active");
    let activeProjectId = activeTab ? activeTab.getAttribute("data-project-id") : projects[0].id;

    tabList.innerHTML = "";
    projects.forEach((proj, idx) => {
        const btn = document.createElement("button");
        btn.className = `project-tab-btn ${proj.id === activeProjectId ? 'active' : ''}`;
        btn.setAttribute("data-project-id", proj.id);
        btn.textContent = proj.name;
        btn.onclick = () => {
            tabList.querySelectorAll(".project-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderProjectBOQTable(proj.id);
        };
        tabList.appendChild(btn);
    });

    // Render detailed table for the active project
    renderProjectBOQTable(activeProjectId);
}

function renderProjectBOQTable(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    document.getElementById("selected-project-title").textContent = `รายละเอียดงบประมาณ BOQ: ${project.name}`;
    
    let projBudget = project.budget;
    let projSpent = 0;
    project.boq.forEach(b => { projSpent += b.spent; });

    document.getElementById("proj-spent-text").textContent = projSpent.toLocaleString();
    document.getElementById("proj-budget-text").textContent = projBudget.toLocaleString();

    const percent = projBudget > 0 ? Math.round((projSpent / projBudget) * 100) : 0;
    const progressFill = document.getElementById("project-progress-fill");
    progressFill.style.width = `${percent}%`;
    
    const usageBadge = document.getElementById("project-usage-badge");
    usageBadge.textContent = `${percent}% ถูกใช้งาน`;
    
    // Choose status color for usage badge
    if (percent > 90) {
        usageBadge.style.backgroundColor = "var(--danger-light)";
        usageBadge.style.color = "var(--danger)";
    } else if (percent > 60) {
        usageBadge.style.backgroundColor = "var(--warning-light)";
        usageBadge.style.color = "var(--warning)";
    } else {
        usageBadge.style.backgroundColor = "var(--success-light)";
        usageBadge.style.color = "var(--success)";
    }

    // Render table rows
    const tbody = document.getElementById("boq-table-rows");
    tbody.innerHTML = "";

    project.boq.forEach(b => {
        const tr = document.createElement("tr");
        const remaining = b.budget - b.spent;
        const rowPercent = b.budget > 0 ? Math.min(Math.round((b.spent / b.budget) * 100), 100) : 0;

        let fillClass = "var(--success)";
        if (rowPercent > 90) fillClass = "var(--danger)";
        else if (rowPercent > 60) fillClass = "var(--warning)";

        tr.innerHTML = `
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${b.code}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary);">${b.name}</div>
            </td>
            <td><strong>${b.budget.toLocaleString()}</strong> บาท</td>
            <td><span style="color: ${b.spent > 0 ? 'var(--warning)' : 'var(--text-muted)'}">${b.spent.toLocaleString()}</span> บาท</td>
            <td><span style="color: ${remaining >= 0 ? 'var(--success)' : 'var(--danger)'}">${remaining.toLocaleString()}</span> บาท</td>
            <td>
                <div class="row-progress-container">
                    <span style="font-size: 0.8rem; font-weight:600; width:35px; text-align:right;">${rowPercent}%</span>
                    <div class="row-progress-bar">
                        <div class="row-progress-fill" style="width: ${rowPercent}%; background-color: ${fillClass};"></div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- MODAL UTILITIES ---

function openModal(modalId) {
    document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("active");
}

// Update Detail Modal pipeline layout
function updatePipelineIndicator(step) {
    for (let s = 1; s <= 4; s++) {
        const pipe = document.getElementById(`pipe-${s}`);
        pipe.classList.remove("active", "passed");
        if (s < step) {
            pipe.classList.add("passed");
        } else if (s === step) {
            pipe.classList.add("active");
        }
    }
}

// Open and load PR Detail Modal
function openPrDetailsModal(prId) {
    const pr = prs.find(p => p.id === prId);
    if (!pr) return;

    currentSelectedPrId = prId;

    // Load static values
    document.getElementById("detail-pr-id").textContent = pr.id;
    document.getElementById("detail-item-name").textContent = pr.itemName;

    const project = projects.find(p => p.id === pr.projectId);
    document.getElementById("detail-project").textContent = project ? project.name : pr.projectId;

    const boqItem = project ? project.boq.find(b => b.code === pr.boqCode) : null;
    document.getElementById("detail-boq").textContent = boqItem ? `[${boqItem.code}] ${boqItem.name}` : pr.boqCode;

    document.getElementById("detail-requester").textContent = pr.requester;
    document.getElementById("detail-order-date").textContent = pr.orderDate;
    document.getElementById("detail-qty").textContent = `${pr.qty} ${pr.unit}`;
    document.getElementById("detail-need-date").textContent = pr.needDate;
    document.getElementById("detail-remarks").textContent = pr.remarks || "ไม่มี";

    // Display delivery remarks if they exist
    const deliveryRemarksContainer = document.getElementById("detail-delivery-remarks-container");
    const deliveryRemarksText = document.getElementById("detail-delivery-remarks");
    if (pr.deliveryRemarks) {
        deliveryRemarksText.textContent = pr.deliveryRemarks;
        deliveryRemarksContainer.style.display = "block";
    } else {
        deliveryRemarksContainer.style.display = "none";
    }

    // Set Urgency Badge
    const uBadge = document.getElementById("detail-urgency-badge");
    uBadge.className = `urgency-badge ${pr.urgency}`;
    uBadge.textContent = pr.urgency === "high" ? "ด่วนที่สุด" : pr.urgency === "medium" ? "ด่วน" : "ปกติ";

    // Update Pipeline
    updatePipelineIndicator(pr.step);

    // Setup Documents list status and view buttons
    setupAttachmentStatus("doc-step2-status", "btn-view-quote", pr.quoteFile);
    setupAttachmentStatus("doc-step3-status", "btn-view-delivery", pr.deliveryFile);
    setupAttachmentStatus("doc-step4-status", "btn-view-invoice", pr.invoiceFile);

    // Hide all step action forms
    document.getElementById("action-form-step2").style.display = "none";
    document.getElementById("action-form-step3").style.display = "none";
    document.getElementById("action-form-step4").style.display = "none";
    document.getElementById("pr-completed-message").style.display = "none";

    // Show appropriate action form based on current step
    const actionTitle = document.getElementById("action-step-title");
    
    if (pr.step === 1) {
        actionTitle.style.display = "block";
        actionTitle.querySelector("h3").textContent = "ดำเนินการขั้นตอนที่ 2: จัดซื้อสั่งซื้อ & แปะเสนอราคา";
        
        // Reset form inputs
        document.getElementById("step2-supplier").value = "";
        document.getElementById("step2-po-number").value = "";
        document.getElementById("step2-price").value = "";
        document.getElementById("step2-file").value = "";
        document.getElementById("step2-file-name").textContent = "ไม่ได้เลือกไฟล์";
        
        document.getElementById("action-form-step2").style.display = "flex";
    } 
    else if (pr.step === 2) {
        actionTitle.style.display = "block";
        actionTitle.querySelector("h3").textContent = "ดำเนินการขั้นตอนที่ 3: รับของหน้างาน & แปะใบส่งมอบ";
        
        // Reset form inputs
        document.getElementById("step3-receiver").value = pr.requester.split(" ")[0]; // default to requester
        document.getElementById("step3-receive-date").value = new Date().toISOString().substring(0, 10);
        document.getElementById("step3-status").value = "complete";
        document.getElementById("step3-remarks").value = ""; // Reset remarks field
        document.getElementById("step3-file").value = "";
        document.getElementById("step3-file-name").textContent = "ไม่ได้เลือกไฟล์";
        
        document.getElementById("action-form-step3").style.display = "flex";
    } 
    else if (pr.step === 3) {
        actionTitle.style.display = "block";
        actionTitle.querySelector("h3").textContent = "ดำเนินการขั้นตอนที่ 4: บันทึกใบกำกับภาษี";
        
        // Reset form inputs
        document.getElementById("step4-invoice-number").value = "";
        document.getElementById("step4-invoice-date").value = new Date().toISOString().substring(0, 10);
        document.getElementById("step4-uploader").value = "จัดซื้อ";
        document.getElementById("step4-file").value = "";
        document.getElementById("step4-file-name").textContent = "ไม่ได้เลือกไฟล์";
        
        document.getElementById("action-form-step4").style.display = "flex";
    } 
    else if (pr.step === 4) {
        // Complete state
        actionTitle.style.display = "none";
        
        document.getElementById("comp-receiver").textContent = pr.receiver;
        
        // Translate status
        let statusText = "ถูกต้องครบถ้วนและสภาพดี";
        if (pr.deliveryStatus === "incomplete") statusText = "ได้ของไม่ครบ";
        else if (pr.deliveryStatus === "damaged") statusText = "ของเสียหาย ชำรุด";
        document.getElementById("comp-status").textContent = statusText;

        const compDelRemarksContainer = document.getElementById("comp-del-remarks-container");
        if (pr.deliveryRemarks) {
            document.getElementById("comp-del-remarks").textContent = pr.deliveryRemarks;
            compDelRemarksContainer.style.display = "flex";
        } else {
            compDelRemarksContainer.style.display = "none";
        }

        document.getElementById("comp-po").textContent = pr.poNumber;
        document.getElementById("comp-inv").textContent = pr.invoiceNumber;
        document.getElementById("comp-price").textContent = pr.price.toLocaleString();
        
        document.getElementById("pr-completed-message").style.display = "flex";
    }

    openModal("pr-detail-modal");
}

function setupAttachmentStatus(statusId, btnId, fileData) {
    const statusLabel = document.getElementById(statusId);
    const viewBtn = document.getElementById(btnId);

    if (fileData) {
        statusLabel.textContent = "อัปโหลดแล้ว";
        statusLabel.className = "doc-status uploaded";
        viewBtn.removeAttribute("disabled");
        viewBtn.onclick = () => openDocPreview(fileData);
    } else {
        statusLabel.textContent = "ยังไม่ได้แนบ";
        statusLabel.className = "doc-status";
        viewBtn.setAttribute("disabled", "true");
        viewBtn.onclick = null;
    }
}

// File dropzone trigger click
function triggerFileInput(fileInputId) {
    document.getElementById(fileInputId).click();
}

// Handle showing selected file name
function handleFileSelected(inputElement, labelId) {
    const label = document.getElementById(labelId);
    if (inputElement.files && inputElement.files.length > 0) {
        label.textContent = inputElement.files[0].name;
        label.style.color = "var(--primary)";
    } else {
        label.textContent = "ไม่ได้เลือกไฟล์";
        label.style.color = "";
    }
}

// Convert files to base64 image strings (or simulate if too large)
function getFileData(fileInputId, defaultFallback) {
    const fileInput = document.getElementById(fileInputId);
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Since it's a demo, if it is an image, we can store it.
        // But for safety, we return a mock file path string if file is too large or we return a placeholder.
        // We'll read as data URL if small, else return a mock file name.
        if (file.size < 500 * 1024 && file.type.startsWith("image/")) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        } else {
            return Promise.resolve(file.name);
        }
    }
    return Promise.resolve(defaultFallback);
}

// Mock doc preview modal
function openDocPreview(fileData) {
    const previewModal = document.getElementById("doc-preview-modal");
    const contentArea = document.getElementById("preview-content-area");
    const previewTitle = document.getElementById("preview-title");

    contentArea.innerHTML = "";

    if (fileData.startsWith("data:image/")) {
        previewTitle.textContent = "เอกสารแนบ (รูปถ่าย)";
        const img = document.createElement("img");
        img.src = fileData;
        img.className = "preview-img";
        contentArea.appendChild(img);
    } else {
        previewTitle.textContent = "เอกสารระบบก่อสร้าง (จำลอง)";
        // Render a beautiful simulated invoice/quotation/delivery receipt
        const docName = fileData || "document.pdf";
        const isPO = docName.toLowerCase().includes("quote") || docName.toLowerCase().includes("steel");
        const isDelivery = docName.toLowerCase().includes("delivery");
        
        let docType = "ใบกำกับภาษี / Tax Invoice";
        if (isPO) docType = "ใบเสนอราคา & ใบสั่งซื้อ (Quotation & PO)";
        else if (isDelivery) docType = "ใบตรวจรับสิ่งของ / Delivery Receipt";

        const div = document.createElement("div");
        div.className = "preview-placeholder";
        div.innerHTML = `
            <div style="border: 2px solid var(--border-color); border-radius: var(--radius-md); padding: 30px; text-align: center; width: 100%; max-width:350px; background-color: var(--bg-secondary);">
                <i data-lucide="file-check" style="width:48px; height:48px; color:var(--success); margin-bottom:16px;"></i>
                <h4 style="margin-bottom:8px;">${docType}</h4>
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:16px;">${docName}</p>
                <div style="font-size:0.75rem; text-align:left; border-top:1px dashed var(--border-color); padding-top:12px; display:flex; flex-direction:column; gap:6px;">
                    <div>• ตรวจสอบไฟล์ลายเซ็นดิจิทัลแล้ว</div>
                    <div>• บันทึกเข้าระบบ: ${new Date().toLocaleDateString('th-TH')}</div>
                    <div>• รหัสยืนยัน: SEC-CON-${Math.floor(100000 + Math.random() * 900000)}</div>
                </div>
            </div>
        `;
        contentArea.appendChild(div);
        lucide.createIcons();
    }

    openModal("doc-preview-modal");
}

// --- DRAG AND DROP LOGIC ---

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.classList.add("dragging");
}

// Clear visual states on drag end
document.addEventListener("dragend", function(event) {
    if (event.target.classList.contains("pr-card")) {
        event.target.classList.remove("dragging");
    }
    document.querySelectorAll(".kanban-column").forEach(col => {
        col.classList.remove("dragover");
    });
});

// Column highlight on drag over
document.querySelectorAll(".column-cards-container").forEach(container => {
    container.addEventListener("dragenter", function(e) {
        this.closest(".kanban-column").classList.add("dragover");
    });
    container.addEventListener("dragleave", function(e) {
        // Only remove if we actually left the column
        const column = this.closest(".kanban-column");
        const rect = column.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
            column.classList.remove("dragover");
        }
    });
});

async function drop(ev, destStep) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text");
    const pr = prs.find(p => p.id === id);
    if (!pr) return;

    const sourceStep = pr.step;

    // Moving card flow rules:
    // Can only move forward by 1 step at a time, or remain in the same step.
    // Must fill out the form of the destination step to move.
    if (destStep === sourceStep) return;

    if (destStep < sourceStep) {
        // Optional: Move backwards is allowed in some systems, but we can just move it back directly.
        pr.step = destStep;
        saveState();
        recalculateBOQSpent();
        renderKanban();
        return;
    }

    if (destStep > sourceStep + 1) {
        alert("กรุณาดำเนินการตามลำดับขั้นตอน ไม่สามารถข้ามขั้นตอนได้");
        return;
    }

    // Dropping to destStep = sourceStep + 1 triggers the Details modal action form
    // Let's open the details modal so they fill out the form for that step!
    openPrDetailsModal(id);
}

// --- FORM SUBMISSIONS ---

// Form 1: Site Issues New PR
document.getElementById("new-pr-form").addEventListener("submit", function(e) {
    e.preventDefault();

    const projId = document.getElementById("new-project").value;
    const boqCode = document.getElementById("new-boq").value;
    const itemName = document.getElementById("new-item-name").value;
    const qty = Number(document.getElementById("new-qty").value);
    const unit = document.getElementById("new-unit").value;
    const orderDate = document.getElementById("new-order-date").value;
    const needDate = document.getElementById("new-need-date").value;
    const requester = document.getElementById("new-requester").value;
    const urgency = document.getElementById("new-urgency").value;
    const remarks = document.getElementById("new-remarks").value;

    // Create unique PR ID
    const nextPrNum = prs.length > 0 ? Math.max(...prs.map(p => Number(p.id.split("-")[1] || 0))) + 1 : 69001;
    const newPrId = `PR-${nextPrNum}`;

    const newPr = {
        id: newPrId,
        itemName,
        qty,
        unit,
        orderDate,
        needDate,
        requester,
        projectId: projId,
        boqCode,
        urgency,
        remarks,
        step: 1,
        supplier: "",
        poNumber: "",
        price: 0,
        quoteFile: "",
        receiver: "",
        receiveDate: "",
        deliveryStatus: "",
        deliveryRemarks: "",
        deliveryFile: "",
        invoiceNumber: "",
        invoiceDate: "",
        invoiceUploader: "",
        invoiceFile: ""
    };

    prs.push(newPr);
    saveState();
    recalculateBOQSpent();
    renderKanban();
    closeModal("new-pr-modal");
    
    // Reset Form
    document.getElementById("new-pr-form").reset();
    document.getElementById("new-boq").disabled = true;
});

// Auto detect if embedded in iframe (Master Portal)
if (window.self !== window.top || new URLSearchParams(window.location.search).get('embedded') === 'true') {
    document.body.classList.add('embedded');
}

function switchTab(tabName) {
    activeTab = tabName;
    const isKanban = tabName === "kanban";

    ["nav-kanban", "nav-kanban-top"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("active", isKanban);
    });

    ["nav-boq", "nav-boq-top"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("active", !isKanban);
    });

    const panelKanban = document.getElementById("panel-kanban");
    const panelBoq = document.getElementById("panel-boq");
    if (panelKanban) panelKanban.classList.toggle("active", isKanban);
    if (panelBoq) panelBoq.classList.toggle("active", !isKanban);

    if (!isKanban) {
        renderBOQDashboard();
    }
}

["nav-kanban", "nav-kanban-top"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => switchTab("kanban"));
});

["nav-boq", "nav-boq-top"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => switchTab("boq"));
});

// Form 2: Procurement issues PO & Quote
document.getElementById("action-form-step2").addEventListener("submit", async function(e) {
    e.preventDefault();

    const pr = prs.find(p => p.id === currentSelectedPrId);
    if (!pr) return;

    const supplier = document.getElementById("step2-supplier").value;
    const poNumber = document.getElementById("step2-po-number").value;
    const price = Number(document.getElementById("step2-price").value);

    // Check if the price will exceed the remaining BOQ budget
    const project = projects.find(p => p.id === pr.projectId);
    const boqItem = project ? project.boq.find(b => b.code === pr.boqCode) : null;
    if (boqItem) {
        const remainingBudget = boqItem.budget - boqItem.spent;
        if (price > remainingBudget) {
            const proceed = confirm(`คำเตือน: ราคาสั่งซื้อ (${price.toLocaleString()} บาท) สูงกว่างบประมาณคงเหลือใน BOQ (${remainingBudget.toLocaleString()} บาท) คุณยังต้องการดำเนินการต่อหรือไม่?`);
            if (!proceed) return;
        }
    }

    const quoteFile = await getFileData("step2-file", "mock_quotation.jpg");

    pr.supplier = supplier;
    pr.poNumber = poNumber;
    pr.price = price;
    pr.quoteFile = quoteFile;
    pr.step = 2; // Move to Step 2 (Column 2)

    saveState();
    recalculateBOQSpent();
    renderKanban();
    closeModal("pr-detail-modal");
});

// Form 3: Site checks delivery & uploads receiving slip
document.getElementById("action-form-step3").addEventListener("submit", async function(e) {
    e.preventDefault();

    const pr = prs.find(p => p.id === currentSelectedPrId);
    if (!pr) return;

    const receiver = document.getElementById("step3-receiver").value;
    const receiveDate = document.getElementById("step3-receive-date").value;
    const deliveryStatus = document.getElementById("step3-status").value;
    const deliveryRemarks = document.getElementById("step3-remarks").value;
    const deliveryFile = await getFileData("step3-file", "mock_delivery_slip.jpg");

    pr.receiver = receiver;
    pr.receiveDate = receiveDate;
    pr.deliveryStatus = deliveryStatus;
    pr.deliveryRemarks = deliveryRemarks;
    pr.deliveryFile = deliveryFile;
    pr.step = 3; // Move to Step 3 (Column 3)

    saveState();
    recalculateBOQSpent();
    renderKanban();
    closeModal("pr-detail-modal");
});

// Form 4: Tax Invoice details
document.getElementById("action-form-step4").addEventListener("submit", async function(e) {
    e.preventDefault();

    const pr = prs.find(p => p.id === currentSelectedPrId);
    if (!pr) return;

    const invoiceNumber = document.getElementById("step4-invoice-number").value;
    const invoiceDate = document.getElementById("step4-invoice-date").value;
    const invoiceUploader = document.getElementById("step4-uploader").value;
    const invoiceFile = await getFileData("step4-file", "mock_tax_invoice.jpg");

    pr.invoiceNumber = invoiceNumber;
    pr.invoiceDate = invoiceDate;
    pr.invoiceUploader = invoiceUploader;
    pr.invoiceFile = invoiceFile;
    pr.step = 4; // Move to Step 4 (Column 4 - Complete)

    saveState();
    recalculateBOQSpent();
    renderKanban();
    closeModal("pr-detail-modal");
});

// --- NAVIGATION & TABS ---

document.getElementById("nav-kanban").addEventListener("click", function() {
    this.classList.add("active");
    document.getElementById("nav-boq").classList.remove("active");
    document.getElementById("panel-kanban").classList.add("active");
    document.getElementById("panel-boq").classList.remove("active");
    activeTab = "kanban";
});

document.getElementById("nav-boq").addEventListener("click", function() {
    this.classList.add("active");
    document.getElementById("nav-kanban").classList.remove("active");
    document.getElementById("panel-boq").classList.add("active");
    document.getElementById("panel-kanban").classList.remove("active");
    activeTab = "boq";
    renderBOQDashboard();
});

// Project selection filter change
document.getElementById("project-filter").addEventListener("change", function() {
    renderKanban();
});

// Search input keyup
document.getElementById("search-input").addEventListener("keyup", function() {
    renderKanban();
});

// Create PR button click
document.getElementById("create-pr-btn").addEventListener("click", function() {
    // Set default date as today
    document.getElementById("new-order-date").value = new Date().toISOString().substring(0, 10);
    document.getElementById("new-need-date").value = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 10);
    openModal("new-pr-modal");
});

// Reset data button
document.getElementById("reset-data-btn").addEventListener("click", function() {
    const confirmReset = confirm("คุณต้องการล้างข้อมูลและรีเซ็ตระบบเป็นค่าเริ่มต้นใช่หรือไม่?");
    if (confirmReset) {
        localStorage.removeItem("construct_projects_v2");
        localStorage.removeItem("construct_prs_v2");
        initData();
        populateDropdowns();
        renderKanban();
        if (activeTab === "boq") renderBOQDashboard();
    }
});

// Dark/Light theme toggle
document.getElementById("theme-toggle-btn").addEventListener("click", function() {
    const isDark = document.body.classList.contains("dark-theme");
    if (isDark) {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        document.getElementById("theme-text").textContent = "โหมดมืด";
        localStorage.setItem("construct_theme", "light");
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        document.getElementById("theme-text").textContent = "โหมดสว่าง";
        localStorage.setItem("construct_theme", "dark");
    }
});

// --- INITIAL START ---
window.onload = function() {
    initData();
    populateDropdowns();
    renderKanban();
    
    // Set custom styles and load icons
    lucide.createIcons();
};
