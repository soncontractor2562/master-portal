import React from 'react';
import { CheckSquare, ShoppingBag, FileSpreadsheet, ArrowRight, Sparkles, ShieldCheck, Zap, Layers, RefreshCw, BarChart3 } from 'lucide-react';

export default function OverviewDashboard({ setActiveTab }) {
  const modules = [
    {
      id: 'todo',
      title: 'Weekly Todo List',
      subtitle: 'ระบบบริหารจัดการงานและเป้าหมายรายสัปดาห์',
      icon: CheckSquare,
      color: 'from-indigo-500 to-purple-600',
      badge: 'React App',
      badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      features: [
        'บอร์ดคันบังแยกสถานะ (To Do, In Progress, Review, Done)',
        'ตัวกรองตามโครงการและผู้รับผิดชอบงาน',
        'การคำนวณและแสดงผลความคืบหน้ารวม',
        'เชื่อมต่อข้อมูลแบบเรียลไทม์',
      ],
      metrics: [
        { label: 'มุมมอง', value: 'Kanban Board' },
        { label: 'สถานะ', value: 'พร้อมใช้งาน' },
      ],
    },
    {
      id: 'store',
      title: 'Store (Drag & Drop)',
      titleTh: 'ระบบจัดการคลังและไซต์งาน',
      subtitle: 'บริหารจัดการวัสดุอุปกรณ์แบบย้ายไซต์ลากวาง',
      icon: ShoppingBag,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Interactive UI',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      features: [
        'การย้ายของระหว่างสโตร์และไซต์งานด้วย Drag & Drop',
        'ระบบค้นหาครุภัณฑ์และวัสดุรวดเร็ว',
        'รายงานความย้ายคลังพร้อมฟังก์ชัน Export/Import',
        'การ์ดแสดงสถานะคลังวัสดุแยกตามพื้นที่',
      ],
      metrics: [
        { label: 'รูปแบบ', value: 'Interactive Mobile' },
        { label: 'สถานะ', value: 'พร้อมใช้งาน' },
      ],
    },
    {
      id: 'prpo',
      title: 'PR / PO System',
      titleTh: 'ระบบขอซื้อหน้างานก่อสร้าง',
      subtitle: 'ขั้นตอนการออก PR และควบคุมงบประมาณ BOQ',
      icon: FileSpreadsheet,
      color: 'from-amber-500 to-orange-600',
      badge: 'Procurement Workflow',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      features: [
        'ขั้นตอนการขอซื้อ 4 สเต็ป (หน้างานขอซื้อ -> จัดซื้อ -> อนุมัติ -> ส่งมอบ)',
        'คำนวณงบประมาณ BOQ คงเหลืออัตโนมัติ',
        'การค้นหาและฟิลเตอร์ใบขอซื้อตามโครงการ',
        'แบบฟอร์มการสร้าง PR หน้างานแบบละเอียด',
      ],
      metrics: [
        { label: 'เวิร์กโฟลว์', value: '4 Steps Kanban' },
        { label: 'สถานะ', value: 'พร้อมใช้งาน' },
      ],
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in pb-8">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 lg:p-8 border border-white/10 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Antigravity Master Portal
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              ศูนย์รวมระบบปฏิบัติการ <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Dark & Glass Edition</span>
            </h2>
            <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
              ยินดีต้อนรับสู่ Portal ควบคุม 3 ระบบย่อย ออกแบบเพื่อการใช้งานบนมือถือ iPhone, Android และคอมพิวเตอร์อย่างลื่นไหล
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-center flex-1 md:flex-none">
              <div className="text-xl font-bold text-cyan-400">3 / 3</div>
              <div className="text-[11px] text-slate-400 font-medium">โมดูลที่เชื่อมต่อ</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-center flex-1 md:flex-none">
              <div className="text-xl font-bold text-emerald-400">100%</div>
              <div className="text-[11px] text-slate-400 font-medium">พร้อมใช้งาน</div>
            </div>
          </div>
        </div>
      </div>

      {/* Module Overview Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" /> ระบบย่อยทั้งหมด (Integrated Modules)
          </h3>
          <span className="text-xs text-slate-400 font-medium hidden sm:block">
            เลือกคลิกการ์ดเพื่อสลับเข้าสู่ระบบนั้นๆ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className="glass-panel glass-panel-hover rounded-3xl p-6 flex flex-col justify-between cursor-pointer border border-white/10 relative overflow-hidden group"
              >
                <div className="space-y-4">
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${mod.color} text-white shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${mod.badgeStyle}`}>
                      {mod.badge}
                    </span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h4 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                      {mod.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {mod.subtitle}
                    </p>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2 pt-2 border-t border-white/5 text-xs text-slate-300">
                    {mod.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>พร้อมใช้งาน</span>
                  </div>
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-xl bg-blue-600/30 group-hover:bg-blue-600 border border-blue-500/30 transition-all">
                    <span>เปิดใช้งานระบบ</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Specs & Feature Matrix */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10">
        <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> คุณสมบัติของ Master Portal (Features & Specs)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <div className="text-xs text-slate-400">Navigation Menu</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">Responsive Drawer (☰)</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <div className="text-xs text-slate-400">Design Aesthetic</div>
            <div className="text-sm font-semibold text-slate-200 mt-1">Dark Glassmorphism</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <div className="text-xs text-slate-400">Mobile Devices</div>
            <div className="text-sm font-semibold text-emerald-400 mt-1">iPhone & Android</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <div className="text-xs text-slate-400">Tech Stack</div>
            <div className="text-sm font-semibold text-cyan-400 mt-1">React + Vite</div>
          </div>
        </div>
      </div>
    </div>
  );
}
