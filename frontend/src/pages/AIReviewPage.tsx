import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, X, FileCode2, GitCompare, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { AI_SUGGESTIONS } from '../lib/data';
import { SEVERITY } from '../lib/nav';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import twMerge from '../lib/twMerge';

const BEFORE = `const query = "SELECT id, hash FROM users WHERE email = '" + email + "'";
const result = await db.query(query);`;

const AFTER = `const query = 'SELECT id, hash FROM users WHERE email = $1';
const result = await db.query(query, [email]);`;

export function AIReviewPage() {
  const [active, setActive] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const s = AI_SUGGESTIONS[active];
  const meta = SEVERITY[s.severity];

  const decide = (d: 'accepted' | 'rejected') => setDecisions((prev) => ({ ...prev, [s.id]: d }));

  return (
    <div className="space-y-6">
      <PageHeader title="AI Review" subtitle="Explain, diff, and accept or reject AI-generated fixes" />

      <div className="grid grid-cols-12 gap-4">
        {/* Suggestion list */}
        <Card className="col-span-12 lg:col-span-3 p-3">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-slate-500">{AI_SUGGESTIONS.length} suggestions</div>
          <div className="space-y-1.5">
            {AI_SUGGESTIONS.map((item, i) => {
              const m = SEVERITY[item.severity];
              const d = decisions[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(i)}
                  className={twMerge(
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    active === i ? 'border-brand-blue/40 bg-brand-blue/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/12',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                    <span className="truncate text-xs font-medium text-slate-200">{item.vulnerability}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-500">{item.cwe}</span>
                    {d ? (
                      <Badge tone={d === 'accepted' ? 'emerald' : 'red'}>{d}</Badge>
                    ) : (
                      <span className="text-[10px] text-brand-emerald">{item.confidence}%</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Main review */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={s.severity}>{meta.label}</Badge>
              <span className="font-mono text-xs text-slate-500">{s.cwe}</span>
              <h2 className="text-lg font-semibold text-white">{s.vulnerability}</h2>
              <div className="ml-auto flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => setActive((a) => Math.max(0, a - 1))} disabled={active === 0}><ChevronLeft size={16} /></Button>
                <Button size="icon" variant="ghost" onClick={() => setActive((a) => Math.min(AI_SUGGESTIONS.length - 1, a + 1))} disabled={active === AI_SUGGESTIONS.length - 1}><ChevronRight size={16} /></Button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><FileCode2 size={13} /> <span className="font-mono">{s.file}</span></div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* AI explanation */}
            <Card className="lg:col-span-1">
              <CardHeader title="AI Explanation" subtitle="Why this is a risk" action={<Sparkles size={15} className="text-brand-cyan" />} />
              <div className="space-y-3">
                <div className="rounded-xl bg-brand-amber/10 border border-brand-amber/20 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-brand-amber"><Lightbulb size={13} /> Risk</div>
                  <p className="mt-1.5 text-xs text-slate-300">{s.recommendation}</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-brand-emerald" style={{ width: `${s.confidence}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-brand-emerald">{s.confidence}%</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Validated against 4,200 known patterns and 312 similar fixes.</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Impact if unfixed</div>
                  <p className="mt-1 text-xs text-slate-300">Data breach, authentication bypass, or remote code execution depending on exploitability.</p>
                </div>
              </div>
            </Card>

            {/* Diff */}
            <Card className="lg:col-span-2 p-0 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
                <GitCompare size={15} className="text-brand-blue" />
                <span className="text-sm font-medium text-slate-100">Side-by-side diff</span>
                <Badge tone="red" className="ml-auto">-2</Badge>
                <Badge tone="emerald">+2</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-white/[0.06]">
                <div>
                  <div className="border-b border-white/[0.06] px-4 py-2 text-[10px] uppercase tracking-wider text-brand-red">Original</div>
                  <pre className="overflow-x-auto bg-[#070B14] p-4 font-mono text-xs leading-relaxed scrollbar-thin">
                    {BEFORE.split('\n').map((line, i) => (
                      <div key={i} className="flex"><span className="mr-3 w-6 shrink-0 select-none text-right text-slate-600">{i + 1}</span><span className="text-brand-red/80">- {line}</span></div>
                    ))}
                  </pre>
                </div>
                <div>
                  <div className="border-b border-white/[0.06] px-4 py-2 text-[10px] uppercase tracking-wider text-brand-emerald">AI Fix</div>
                  <pre className="overflow-x-auto bg-[#070B14] p-4 font-mono text-xs leading-relaxed scrollbar-thin">
                    {AFTER.split('\n').map((line, i) => (
                      <div key={i} className="flex"><span className="mr-3 w-6 shrink-0 select-none text-right text-slate-600">{i + 1}</span><span className="text-brand-emerald/90">+ {line}</span></div>
                    ))}
                  </pre>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] p-4">
                <span className="text-xs text-slate-500">Apply the fix to create a patch and anchor it on-chain.</span>
                <div className="flex gap-2">
                  <Button variant="danger" size="md" onClick={() => decide('rejected')} disabled={!!decisions[s.id]}>
                    <X size={15} /> Reject
                  </Button>
                  <Button variant="success" size="md" onClick={() => decide('accepted')} disabled={!!decisions[s.id]}>
                    <Check size={15} /> Accept Fix
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <AnimatePresence>
            {decisions[s.id] && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className={twMerge('flex items-center gap-3', decisions[s.id] === 'accepted' ? 'border-brand-emerald/30' : 'border-brand-red/30')}>
                  {decisions[s.id] === 'accepted' ? <Check size={18} className="text-brand-emerald" /> : <X size={18} className="text-brand-red" />}
                  <p className="text-sm text-slate-200">
                    {decisions[s.id] === 'accepted'
                      ? 'Fix accepted. Patch queued for Secure Fixes and blockchain verification.'
                      : 'Fix rejected. The finding remains open in Security Scan.'}
                  </p>
                  <Button variant="secondary" size="sm" className="ml-auto" onClick={() => setDecisions((p) => { const n = { ...p }; delete n[s.id]; return n; })}>
                    Undo
                  </Button>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
