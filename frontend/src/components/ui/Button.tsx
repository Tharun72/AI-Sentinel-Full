import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import twMerge from '../../lib/twMerge';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-blue text-white hover:bg-brand-blue/90 shadow-glow-blue',
  secondary: 'bg-white/[0.06] text-slate-100 hover:bg-white/[0.1] border border-white/[0.08]',
  ghost: 'text-slate-300 hover:bg-white/[0.05] hover:text-white',
  danger: 'bg-brand-red/90 text-white hover:bg-brand-red',
  success: 'bg-brand-emerald/90 text-white hover:bg-brand-emerald',
  outline: 'border border-white/[0.12] text-slate-200 hover:bg-white/[0.04] hover:border-white/20',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      className={twMerge(
        'inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-blue/40',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
