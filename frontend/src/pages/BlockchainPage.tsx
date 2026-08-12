import { useState } from 'react';
import { motion } from 'framer-motion';
import { Blocks, CheckCircle2, Clock, XCircle, ShieldCheck, Copy, ExternalLink, Hash, Box } from 'lucide-react';
import { VERIFICATIONS } from '../lib/data';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import twMerge from '../lib/twMerge';

const STATUS_META = {
  Verified: { icon: CheckCircle2, color: 'text-brand-emerald', bg: 'bg-brand-emerald/10', tone: 'emerald' as const },
  Pending: { icon: Clock, color: 'text-brand-amber', bg: 'bg-brand-amber/10', tone: 'amber' as const },
  Failed: { icon: XCircle, color: 'text-brand-red', bg: 'bg-brand-red/10', tone: 'red' as const },
};

export function BlockchainPage() {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const verified = VERIFICATIONS.filter((v) => v.status === 'Verified').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blockchain Verification"
        subtitle="Tamper-proof audit trail of every applied patch"
        actions={<Button variant="primary" size="md"><Blocks size={15} /> Anchor New Patch</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Verified Patches</span>
            <CheckCircle2 size={16} className="text-brand-emerald" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{verified}</p>
          <p className="mt-1 text-xs text-slate-500">anchored on Polygon</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Pending</span>
            <Clock size={16} className="text-brand-amber" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{VERIFICATIONS.filter((v) => v.status === 'Pending').length}</p>
          <p className="mt-1 text-xs text-slate-500">awaiting confirmation</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Network</span>
            <Box size={16} className="text-brand-cyan" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">Polygon</p>
          <p className="mt-1 text-xs text-slate-500">PoS sidechain</p>
        </Card>
      </div>

      <div className="space-y-3">
        {VERIFICATIONS.map((v, i) => {
          const meta = STATUS_META[v.status];
          const Icon = meta.icon;
          return (
            <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass glass-hover">
              <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className={twMerge('grid h-12 w-12 shrink-0 place-items-center rounded-xl', meta.bg)}>
                  <Icon size={22} className={meta.color} />
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{v.project}</span>
                    <Badge tone={meta.tone}>{v.status}</Badge>
                    <Badge tone="cyan">{v.network}</Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Patch Hash" value={v.patchHash} icon={<Hash size={12} />} onCopy={() => copy(v.patchHash, `${v.id}-hash`)} copied={copied === `${v.id}-hash`} />
                    <Field label="Transaction ID" value={v.txId} icon={<ExternalLink size={12} />} onCopy={() => copy(v.txId, `${v.id}-tx`)} copied={copied === `${v.id}-tx`} />
                    <Field label="Timestamp" value={new Date(v.timestamp).toLocaleString()} icon={<Clock size={12} />} />
                    <Field label="Block" value={v.block ? `#${v.block.toLocaleString()}` : 'pending'} icon={<Box size={12} />} />
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                  {v.status === 'Verified' ? (
                    <Button variant="secondary" size="sm" onClick={() => copy(v.txId, `${v.id}-tx`)}>
                      <Copy size={13} /> Copy proof
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={verifying === v.id}
                      onClick={() => {
                        setVerifying(v.id);
                        setTimeout(() => setVerifying(null), 2000);
                      }}
                    >
                      <ShieldCheck size={13} /> {verifying === v.id ? 'Verifying…' : 'Verify now'}
                    </Button>
                  )}
                  <a className="flex items-center gap-1 text-xs text-brand-cyan hover:underline" href="#">
                    View on explorer <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="truncate font-mono text-xs text-slate-200">{value}</span>
        {onCopy && (
          <button onClick={onCopy} className="shrink-0 text-slate-500 hover:text-brand-cyan">
            {copied ? <CheckCircle2 size={12} className="text-brand-emerald" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}
