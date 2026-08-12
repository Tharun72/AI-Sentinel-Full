import { type ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import twMerge from '../../lib/twMerge';

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="focus:outline-none">
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className={twMerge(
                'absolute z-50 mt-2 min-w-[220px] glass-strong p-1.5',
                align === 'right' ? 'right-0' : 'left-0',
                className,
              )}
            >
              {children(() => setOpen(false))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({ children, onClick, icon }: { children: ReactNode; onClick?: () => void; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
    >
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">{children}</div>;
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-white/[0.06]" />;
}

export { ChevronDown };
