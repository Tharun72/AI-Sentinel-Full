import twMerge from '../../lib/twMerge';

export function Progress({ value, tone = 'blue', className }: { value: number; tone?: 'blue' | 'emerald' | 'amber' | 'red'; className?: string }) {
  const tones = {
    blue: 'bg-brand-blue',
    emerald: 'bg-brand-emerald',
    amber: 'bg-brand-amber',
    red: 'bg-brand-red',
  };
  return (
    <div className={twMerge('h-2 w-full rounded-full bg-white/[0.06] overflow-hidden', className)}>
      <div
        className={twMerge('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
