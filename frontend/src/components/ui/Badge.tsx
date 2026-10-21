import { type ReactNode } from 'react';
import twMerge from '../../lib/twMerge';
import { SEVERITY, type Severity } from '../../lib/nav';

type Tone = 'blue' | 'cyan' | 'emerald' | 'red' | 'amber' | 'slate' | Severity;

const TONES: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  critical: `${SEVERITY.critical.bg} ${SEVERITY.critical.text} ${SEVERITY.critical.border}`,
  high: `${SEVERITY.high.bg} ${SEVERITY.high.text} ${SEVERITY.high.border}`,
  medium: `${SEVERITY.medium.bg} ${SEVERITY.medium.text} ${SEVERITY.medium.border}`,
  low: `${SEVERITY.low.bg} ${SEVERITY.low.text} ${SEVERITY.low.border}`,
};

export function Badge({ tone = 'slate', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
