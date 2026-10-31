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
      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={twMerge(
          'app-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-blue shadow-glow-blue">
            <ShieldCheck size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="whitespace-nowrap text-sm font-semibold leading-tight text-slate-950">AI Sentinel</div>
              <div className="whitespace-nowrap text-[10px] leading-tight text-slate-500">Security Platform</div>
            </div>
          )}
          <button
            onClick={onToggle}
            className="ml-auto hidden h-7 w-7 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:grid"
          >
            <ChevronLeft size={16} className={collapsed ? 'rotate-180' : ''} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-app px-3 py-4 space-y-1">
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
                  active ? 'text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg border border-blue-200 bg-blue-50"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  />
                )}
                {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-blue" />}
                <Icon size={18} className="relative z-10 shrink-0" />
                {!collapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className={twMerge('flex items-center gap-3 rounded-lg bg-slate-50 p-3', collapsed && 'justify-center')}>
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-brand-emerald">
              <Sparkles size={15} />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="whitespace-nowrap text-xs font-medium text-slate-700">Security workspace</div>
                <div className="whitespace-nowrap text-[10px] text-slate-500">Repository scanning</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
