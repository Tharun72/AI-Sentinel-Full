import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import twMerge from '../../lib/twMerge';

export function KpiCard({
  label,
  value,
  delta,
  trend,
  icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down';
  icon: ReactNode;
  accent: 'blue' | 'cyan' | 'emerald' | 'red' | 'amber';
}) {
  const accents = {
    blue: 'from-brand-blue/20 to-brand-blue/0 text-brand-blue',
    cyan: 'from-brand-cyan/20 to-brand-cyan/0 text-brand-cyan',
    emerald: 'from-brand-emerald/20 to-brand-emerald/0 text-brand-emerald',
    red: 'from-brand-red/20 to-brand-red/0 text-brand-red',
    amber: 'from-brand-amber/20 to-brand-amber/0 text-brand-amber',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass glass-hover group relative overflow-hidden p-5"
    >
      <div className={twMerge('absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition-opacity group-hover:opacity-60', accents[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
        </div>
        <div className={twMerge('grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br', accents[accent])}>
          {icon}
        </div>
      </div>
      {delta && (
        <div className="relative mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={twMerge(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium',
              trend === 'up' ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-brand-red/10 text-brand-red',
            )}
          >
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {delta}
          </span>
          <span className="text-slate-500">vs last week</span>
        </div>
      )}
    </motion.div>
  );
}
