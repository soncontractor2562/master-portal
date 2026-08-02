import React from 'react';
import { CheckSquare, ShoppingBag, FileSpreadsheet, ChevronRight } from 'lucide-react';

const modules = [
  {
    id: 'todo',
    label: 'Weekly Todo List',
    desc: 'ติดตามงานรายสัปดาห์',
    icon: CheckSquare,
    gradient: 'from-indigo-600/25 to-purple-600/15',
    border: 'border-indigo-500/30',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    glow: 'shadow-indigo-500/10',
    emoji: '📋',
  },
  {
    id: 'store',
    label: 'Store Manager',
    desc: 'อัพเดทสโตร์และเช็คยอดคงเหลือ',
    icon: ShoppingBag,
    gradient: 'from-emerald-600/25 to-teal-600/15',
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
    emoji: '🏪',
  },
  {
    id: 'prpo',
    label: 'PR / PO System',
    desc: 'สั่งซื้อและติดตามสถานะ',
    icon: FileSpreadsheet,
    gradient: 'from-amber-600/25 to-orange-600/15',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    glow: 'shadow-amber-500/10',
    emoji: '📦',
  },
];

export default function HomeScreen({ onSelect }) {
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'สวัสดีตอนเช้า' :
    now.getHours() < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';

  return (
    <div className="flex flex-col min-h-full px-4 pt-6 pb-8 overflow-y-auto">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-xl flex items-center justify-center">
            <img src="/logo.png" alt="SON" className="w-full h-full object-contain" />
          </div>
        </div>
        <p className="text-slate-400 text-sm mb-1">{greeting} 👋</p>
        <h1 className="text-2xl font-bold text-white">
          SON <span className="text-yellow-400">CONTRACTOR</span>
        </h1>
        <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Control Center</p>
      </div>

      {/* Section Label */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 px-1">
        เลือกโปรแกรม
      </p>

      {/* Module Cards */}
      <div className="flex flex-col gap-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => onSelect(mod.id)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-2xl text-left
                bg-gradient-to-r ${mod.gradient}
                border ${mod.border}
                shadow-lg ${mod.glow}
                active:scale-[0.97] transition-transform duration-150
              `}
            >
              <div className={`w-12 h-12 rounded-xl ${mod.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${mod.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">{mod.label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{mod.desc}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10 text-center text-slate-700 text-[10px]">
        v2.18 · SON CONTRACTOR © 2025
      </div>
    </div>
  );
}
