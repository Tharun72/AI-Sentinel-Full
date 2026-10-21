import { useState } from 'react';
import { History, Search, Filter, Radar } from 'lucide-react';
import { SCAN_HISTORY } from '../lib/data';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import twMerge from '../lib/twMerge';

export function HistoryPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Failed' | 'Running'>('all');

  const filtered = SCAN_HISTORY.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (query && !`${s.project} ${s.triggeredBy}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Scan History" subtitle="Every scan run across all projects" actions={<Button variant="primary" size="md"><Radar size={15} /> New Scan</Button>} />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3">
            <Search size={15} className="text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by project or user…" className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Filter size={14} className="shrink-0 text-slate-500" />
            {(['all', 'Completed', 'Failed', 'Running'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={twMerge(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === f ? 'bg-brand-blue/15 text-white border border-brand-blue/30' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
                )}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Scan Runs" subtitle={`${filtered.length} runs`} action={<History size={15} className="text-slate-400" />} />
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-5 py-2 font-medium">Project</th>
                <th className="px-5 py-2 font-medium">Started</th>
                <th className="px-5 py-2 font-medium">Duration</th>
                <th className="px-5 py-2 font-medium">Rules</th>
                <th className="px-5 py-2 font-medium">Findings</th>
                <th className="px-5 py-2 font-medium">Triggered By</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-medium text-slate-100">{s.project}</td>
                  <td className="px-5 py-3 text-slate-400">{s.startedAt}</td>
                  <td className="px-5 py-3 text-slate-400">{s.duration}</td>
                  <td className="px-5 py-3 text-slate-400">{s.rules.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={s.findings > 0 ? 'text-brand-amber' : 'text-brand-emerald'}>{s.findings}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{s.triggeredBy}</td>
                  <td className="px-5 py-3">
                    <Badge tone={s.status === 'Completed' ? 'emerald' : s.status === 'Failed' ? 'red' : 'blue'}>
                      {s.status === 'Running' && <span className="h-1.5 w-1.5 rounded-full bg-brand-blue animate-pulse" />}
                      {s.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
