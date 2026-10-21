import { type ReactNode } from 'react';
import twMerge from '../../lib/twMerge';
import { SEVERITY, type Severity } from '../../lib/nav';

type Tone = 'blue' | 'cyan' | 'emerald' | 'red' | 'amber' | 'slate' | Severity;

const TONES: Record<Tone, string> = {
  blue: 'bg-brand-blue/10 text-brand-blue border-brand-blue/25',
  cyan: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/25',
  emerald: 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/25',
  red: 'bg-brand-red/10 text-brand-red border-brand-red/25',
  amber: 'bg-brand-amber/10 text-brand-amber border-brand-amber/25',
  slate: 'bg-white/[0.06] text-slate-300 border-white/10',
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
