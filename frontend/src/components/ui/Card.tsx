import { type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import twMerge from '../../lib/twMerge';

export function Card({ className, children, ...props }: HTMLMotionProps<'div'> & { children: ReactNode }) {
  return (
    <motion.div
      className={twMerge('glass glass-hover p-5', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
