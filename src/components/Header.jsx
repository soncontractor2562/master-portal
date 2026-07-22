import React from 'react';
import { Menu, LayoutDashboard, CheckSquare, ShoppingBag, FileSpreadsheet, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, toggleSidebar }) {
  const getTabDetails = (tab) => {
    switch (tab) {
      case 'overview':
        return { title: 'ภาพรวมระบบทั้งหมด', subtitle: 'Executive Dashboard & System Status', icon: LayoutDashboard, color: 'text-cyan-400' };
      case 'todo':
        return { title: 'Weekly Todo List', subtitle: 'จัดการงานและติดตามเป้าหมายรายสัปดาห์', icon: CheckSquare, color: 'text-indigo-400' };
      case 'store':
        return { title: 'Store (Drag & Drop)', subtitle: 'จัดการวัสดุอุปกรณ์ คลังสินค้า และไซต์งาน', icon: ShoppingBag, color: 'text-emerald-400' };
      case 'prpo':
        return { title: 'PR / PO System', subtitle: 'ระบบขอซื้อหน้างานก่อสร้าง และควบคุมงบ BOQ', icon: FileSpreadsheet, color: 'text-amber-400' };
      default:
        return { title: 'Master Portal', subtitle: 'ศูนย์รวมระบบปฏิบัติการ', icon: Sparkles, color: 'text-blue-400' };
    }
  };

  const current = getTabDetails(activeTab);
  const IconComponent = current.icon;

  const todayStr = new Date().toLocaleDateString('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="sticky top-0 z-30 glass-header px-4 lg:px-8 py-3 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Toggle for Mobile / Tablet (< lg) */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle Navigation Drawer"
          className="lg:hidden p-2 rounded-xl bg-slate-800/60 text-slate-200 hover:text-white border border-white/10 hover:bg-slate-700/60 transition active:scale-95"
        >
          <Menu className="w-6 h-6 text-blue-400" />
        </button>

        {/* Title & Icon Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl bg-slate-900/80 border border-white/10 ${current.color} shadow-lg shadow-black/40`}>
            <IconComponent className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div>
            <h1 className="text-base lg:text-xl font-bold text-white tracking-wide flex items-center gap-2">
              {current.title}
              <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <ShieldCheck className="w-3 h-3" /> Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              {current.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right Quick Nav Controls & Date */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Mobile Quick Pills */}
        <div className="hidden xl:flex items-center bg-slate-900/60 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'overview' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ภาพรวม
          </button>
          <button
            onClick={() => setActiveTab('todo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'todo' ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todo List
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'store' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Store
          </button>
          <button
            onClick={() => setActiveTab('prpo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'prpo' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PR/PO
          </button>
        </div>

        {/* Date Indicator */}
        <div className="text-right px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-medium text-slate-300 hidden md:block">
          <span className="text-slate-400 block text-[10px]">วันนี้</span>
          {todayStr}
        </div>

        {/* Mobile Device Optimization Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mobile Optimized</span>
        </div>
      </div>
    </header>
  );
}
