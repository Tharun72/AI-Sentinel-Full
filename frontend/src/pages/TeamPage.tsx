import { UserPlus, Mail, Shield } from 'lucide-react';
import { TEAM } from '../lib/data';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const ROLE_TONE = { Owner: 'amber', Admin: 'blue', Analyst: 'cyan', Developer: 'slate' } as const;

export function TeamPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Team" subtitle="Manage members and access controls" actions={<Button variant="primary" size="md"><UserPlus size={15} /> Invite Member</Button>} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Members', value: TEAM.length },
          { label: 'Owners', value: TEAM.filter((t) => t.role === 'Owner').length },
          { label: 'Admins', value: TEAM.filter((t) => t.role === 'Admin').length },
          { label: 'Total Scans', value: TEAM.reduce((a, t) => a + t.scans, 0) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Members" subtitle="People with access to this workspace" />
        <div className="space-y-2">
          {TEAM.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/12">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-sm font-semibold text-white">
                {m.avatar}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-slate-100">{m.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-slate-400"><Mail size={11} /> {m.email}</p>
              </div>
              <div className="hidden text-center sm:block">
                <p className="text-sm font-semibold text-slate-200">{m.scans}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">scans</p>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${m.lastActive === 'online' ? 'bg-brand-emerald animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs text-slate-400">{m.lastActive}</span>
              </div>
              <Badge tone={ROLE_TONE[m.role]}>{m.role}</Badge>
              <Button size="sm" variant="ghost"><Shield size={14} /></Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
