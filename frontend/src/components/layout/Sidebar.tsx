import { motion } from 'framer-motion';
import { ShieldCheck, ChevronLeft, Sparkles } from 'lucide-react';
import { NAV_ITEMS, type PageId } from '../../lib/nav';
import twMerge from '../../lib/twMerge';

export function Sidebar({
  current,
  onNavigate,
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  current: PageId;
  onNavigate: (id: PageId) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={twMerge(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-bg-surface/80 backdrop-blur-2xl transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center gap-3 px-4 border-b border-white/[0.06]">
          <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan shadow-glow-blue">
            <ShieldCheck size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-sm font-semibold text-white leading-tight whitespace-nowrap">AI Sentinel</div>
              <div className="text-[10px] text-slate-400 leading-tight whitespace-nowrap">Security Platform</div>
            </div>
          )}
          <button
            onClick={onToggle}
            className="ml-auto hidden lg:grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
          >
            <ChevronLeft size={16} className={collapsed ? 'rotate-180' : ''} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = current === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={twMerge(
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/[0.04]',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-blue/20 to-brand-cyan/10 border border-brand-blue/30"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  />
                )}
                {active && <span className="absolute left-0 top-1/2 h-5 -translate-y-1/2 w-0.5 rounded-full bg-brand-cyan" />}
                <Icon size={18} className="relative z-10 shrink-0" />
                {!collapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <div className={twMerge('flex items-center gap-3 rounded-xl bg-white/[0.03] p-3', collapsed && 'justify-center')}>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-emerald/30 to-brand-cyan/20 text-brand-emerald">
              <Sparkles size={15} />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-slate-200 whitespace-nowrap">Enterprise Plan</div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap">12,400 scans / mo</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
