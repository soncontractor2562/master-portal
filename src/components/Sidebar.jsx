import React from 'react';
import { CheckSquare, ShoppingBag, FileSpreadsheet, X, Hexagon, ChevronRight, Menu } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen }) {
  const navItems = [
    {
      id: 'todo',
      label: 'Weekly Todo List',
      icon: CheckSquare,
      desc: 'ติดตามงานรายสัปดาห์',
      color: 'text-indigo-400',
      activeBg: 'from-indigo-600/30 to-purple-600/20 border-indigo-500/40',
      activeIcon: 'bg-indigo-500',
    },
    {
      id: 'store',
      label: 'Store Manager',
      icon: ShoppingBag,
      desc: 'อัพเดทสโตร์และเช็คยอดคงเหลือ',
      color: 'text-emerald-400',
      activeBg: 'from-emerald-600/30 to-teal-600/20 border-emerald-500/40',
      activeIcon: 'bg-emerald-500',
    },
    {
      id: 'prpo',
      label: 'PR / PO System',
      icon: FileSpreadsheet,
      desc: 'สั่งซื้อและติดตามสถานะ',
      color: 'text-amber-400',
      activeBg: 'from-amber-600/30 to-orange-600/20 border-amber-500/40',
      activeIcon: 'bg-amber-500',
    },
  ];

  const handleSelect = (tabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Overlay สำหรับ mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 xl:w-72 glass-drawer flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static`}
      >
        {/* Brand */}
        <div>
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white p-0.5 shadow-lg shadow-blue-500/20 border border-yellow-400/40 flex items-center justify-center flex-shrink-0">
                <img src="/logo.png" alt="SON CONTRACTOR" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h2 className="font-bold text-sm xl:text-base text-white tracking-wider leading-tight">
                  SON <span className="text-yellow-400">CONTRACTOR</span>
                </h2>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Control Center</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white border border-white/10"
              aria-label="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile hamburger hint row — แสดงบนมือถือเหนือปุ่ม menu */}

          {/* Nav Items */}
          <div className="p-3 space-y-1.5 mt-2">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              เมนู
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 group text-left ${
                    isActive
                      ? `bg-gradient-to-r ${item.activeBg} border text-white shadow-md`
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isActive ? `${item.activeIcon} text-white shadow-sm` : 'bg-slate-800/60 text-slate-400 group-hover:' + item.color
                      }`}
                    >
                      <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${
                      isActive ? 'text-white/60 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>


      </aside>

      {/* Mobile Floating Hamburger — แสดงเฉพาะ mobile และ Sidebar ปิดอยู่ */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open Menu"
          className="lg:hidden fixed bottom-6 left-4 z-30 p-3 rounded-2xl bg-blue-600/90 text-white shadow-lg shadow-blue-500/40 backdrop-blur-sm border border-blue-500/50 active:scale-95 transition-transform"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
