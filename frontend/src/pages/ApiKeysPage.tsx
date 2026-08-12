import { useState } from 'react';
import { KeyRound, Plus, Copy, Eye, EyeOff, Trash2, Check } from 'lucide-react';
import { API_KEYS } from '../lib/data';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import twMerge from '../lib/twMerge';

export function ApiKeysPage() {
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revoke, setRevoke] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="API Keys" subtitle="Programmatic access to the Sentinel API" actions={<Button variant="primary" size="md" onClick={() => setCreateOpen(true)}><Plus size={15} /> Create Key</Button>} />

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-amber/10 text-brand-amber"><KeyRound size={16} /></div>
          <div>
            <p className="text-sm font-medium text-slate-100">Keep your keys secret</p>
            <p className="mt-1 text-xs text-slate-400">Keys grant full access to the scopes they are assigned. Never commit them to source control. Rotate immediately if exposed.</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Active Keys" subtitle={`${API_KEYS.length} keys`} />
        <div className="space-y-3">
          {API_KEYS.map((k) => {
            const visible = show[k.id];
            const masked = `${k.prefix}${'•'.repeat(20)}`;
            return (
              <div key={k.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue"><KeyRound size={16} /></div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-100">{k.name}</p>
                      {k.scopes.map((s) => <Badge key={s} tone="cyan">{s}</Badge>)}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="truncate font-mono text-xs text-slate-400">{visible ? `${k.prefix}_sk_live_xxxxxxxxxxxx` : masked}</code>
                      <button onClick={() => setShow((p) => ({ ...p, [k.id]: !p[k.id] }))} className="text-slate-500 hover:text-slate-200">
                        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button onClick={() => copy(`${k.prefix}_sk_live_xxxxxxxxxxxx`, k.id)} className="text-slate-500 hover:text-brand-cyan">
                        {copied === k.id ? <Check size={13} className="text-brand-emerald" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="hidden text-center sm:block">
                    <p className="text-xs text-slate-400">Created</p>
                    <p className="text-sm text-slate-200">{k.created}</p>
                  </div>
                  <div className="hidden text-center sm:block">
                    <p className="text-xs text-slate-400">Last used</p>
                    <p className="text-sm text-slate-200">{k.lastUsed}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-brand-red hover:bg-brand-red/10" onClick={() => setRevoke(k.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create API Key"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setCreateOpen(false)}>Generate Key</Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-slate-500">Name</span>
            <input placeholder="e.g. CI Pipeline" className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-blue/40 focus:outline-none" />
          </label>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500">Scopes</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['scan:run', 'scan:read', 'reports:read', 'projects:write'].map((s) => (
                <label key={s} className={twMerge('flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-200')}>
                  <input type="checkbox" defaultChecked className="accent-brand-blue" /> {s}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!revoke}
        onClose={() => setRevoke(null)}
        title="Revoke API key?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoke(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => setRevoke(null)}>Revoke Key</Button>
          </>
        }
      >
        <p>Revoking this key is permanent. Any service using it will lose access immediately. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
