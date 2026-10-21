import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Command } from 'lucide-react';
import { NAV_ITEMS, type PageId } from '../../lib/nav';
import twMerge from '../../lib/twMerge';

const ALL_PAGES = NAV_ITEMS.map((n) => n.label);

export function SearchModal({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (id: PageId) => void }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
        else document.dispatchEvent(new CustomEvent('open-search'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[15vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-xl glass-strong overflow-hidden p-0"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
              <Search size={18} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, projects, CVEs…"
                className="h-14 flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
              />
              <kbd className="hidden items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline-flex">
                <Command size={10} /> K
              </kbd>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
              <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">Navigation</div>
              {results.map((n) => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => { onNavigate(n.id); onClose(); }}
                    className={twMerge('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white')}
                  >
                    <Icon size={16} className="text-slate-400" /> {n.label}
                  </button>
                );
              })}
              {results.length === 0 && <div className="px-3 py-6 text-center text-sm text-slate-500">No results for "{query}"</div>}
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-slate-500">
              <span>{ALL_PAGES.length} pages</span>
              <span>Press Enter to open · Esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
