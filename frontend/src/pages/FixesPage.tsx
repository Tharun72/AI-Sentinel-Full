import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, RotateCcw, CheckCircle2, ShieldCheck, History, FileCode2 } from 'lucide-react';
import { PATCHES } from '../lib/data';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Progress } from '../components/ui/Progress';
import twMerge from '../lib/twMerge';

export function FixesPage() {
  const [rollback, setRollback] = useState<string | null>(null);
  const [rolledBack, setRolledBack] = useState<Set<string>>(new Set());

  const fixed = PATCHES.filter((p) => p.status === 'Applied' && !rolledBack.has(p.id)).length;
  const avgConfidence = Math.round(PATCHES.reduce((a, p) => a + p.confidence, 0) / PATCHES.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Secure Fixes" subtitle="Applied patches, patch history, and rollback controls" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Fixed Vulnerabilities</span>
            <CheckCircle2 size={16} className="text-brand-emerald" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{fixed}</p>
          <p className="mt-1 text-xs text-brand-emerald">+3 this week</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Avg Confidence</span>
            <ShieldCheck size={16} className="text-brand-blue" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{avgConfidence}%</p>
          <Progress value={avgConfidence} tone="blue" className="mt-2" />
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Rollbacks</span>
            <RotateCcw size={16} className="text-brand-amber" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{rolledBack.size}</p>
          <p className="mt-1 text-xs text-slate-500">reverted patches</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Patch History" subtitle="Chronological list of applied and reverted fixes" action={<History size={15} className="text-slate-400" />} />
        <div className="space-y-3">
          <AnimatePresence>
            {PATCHES.map((p) => {
              const reverted = rolledBack.has(p.id);
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={twMerge(
                    'flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center',
                    reverted ? 'border-brand-amber/30 bg-brand-amber/5' : 'border-white/[0.06] bg-white/[0.02]',
                  )}
                >
                  <div className={twMerge('grid h-10 w-10 shrink-0 place-items-center rounded-xl', reverted ? 'bg-brand-amber/10 text-brand-amber' : 'bg-brand-emerald/10 text-brand-emerald')}>
                    {reverted ? <RotateCcw size={18} /> : <Wrench size={18} />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-100">{p.vulnerability}</p>
                      <Badge tone={reverted ? 'amber' : 'emerald'}>{reverted ? 'Rolled Back' : 'Applied'}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{p.project}</span>
                      <span>·</span>
                      <span>{p.appliedAt}</span>
                      <span>·</span>
                      <span className="font-mono">{p.patchHash}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-sm font-bold text-brand-emerald">{p.confidence}%</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">confidence</div>
                    </div>
                    {!reverted && (
                      <Button size="sm" variant="outline" onClick={() => setRollback(p.id)}>
                        <RotateCcw size={13} /> Rollback
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </Card>

      <Card>
        <CardHeader title="Patch Integrity" subtitle="Each patch is cryptographically hashed and anchored on-chain" action={<FileCode2 size={15} className="text-slate-400" />} />
        <div className="grid gap-3 sm:grid-cols-2">
          {PATCHES.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <p className="truncate text-xs font-medium text-slate-200">{p.vulnerability}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">{p.patchHash}</span>
                <Badge tone="cyan">anchored</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={!!rollback}
        onClose={() => setRollback(null)}
        title="Rollback patch?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRollback(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (rollback) setRolledBack((prev) => new Set(prev).add(rollback));
                setRollback(null);
              }}
            >
              <RotateCcw size={15} /> Confirm Rollback
            </Button>
          </>
        }
      >
        <p>Rolling back will revert the applied fix and reopen the vulnerability in Security Scan. The original patch hash remains on-chain for audit purposes.</p>
      </Modal>
    </div>
  );
}
