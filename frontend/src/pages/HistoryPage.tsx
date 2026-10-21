import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, History, Radar, Search } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getWorkspaceData } from '../services/workspaceService';
import type { Project } from '../types/project';
import type { Scan } from '../types/scan';

function duration(scan: Scan) {
  if (scan.duration_seconds == null) return scan.status === 'running' ? 'In progress' : '—';
  const seconds = Math.max(0, Math.floor(scan.duration_seconds));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

export function HistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'running' | 'completed' | 'failed'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getWorkspaceData().then(({ projects: nextProjects, scans: nextScans }) => {
      setProjects(nextProjects); setScans(nextScans);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load scan history.'));
  }, []);

  const rows = useMemo(() => scans.filter((scan) => {
    const project = projects.find((item) => item.id === scan.project_id);
    return (status === 'all' || scan.status === status) && `${project?.name ?? ''} ${scan.branch ?? ''} ${scan.repository_url ?? ''}`.toLowerCase().includes(query.toLowerCase());
  }), [projects, query, scans, status]);

  return <div className="space-y-6">
    <PageHeader title="Scan history" subtitle="Every persisted scan run in your workspace." />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    <Card className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3"><Search size={15} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, branch, or repository" className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400" /></label><div className="flex gap-1 overflow-x-auto">{(['all', 'pending', 'running', 'completed', 'failed'] as const).map((item) => <button key={item} onClick={() => setStatus(item)} className={status === item ? 'rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700' : 'rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100'}>{item === 'all' ? 'All' : item}</button>)}</div></div></Card>
    <Card><CardHeader title="Scan runs" subtitle={`${rows.length} ${rows.length === 1 ? 'run' : 'runs'} matching the current filters.`} action={<History size={16} className="text-slate-500" />} />
      {rows.length === 0 ? <div className="border-t border-slate-100 p-10 text-center"><Radar className="mx-auto text-brand-blue" size={28} /><h2 className="mt-3 font-semibold text-slate-900">No matching scans</h2><p className="mt-1 text-sm text-slate-600">Start a repository scan or adjust your filters.</p></div> : <div className="-mx-5 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="px-5 py-2.5 font-medium">Project</th><th className="px-5 py-2.5 font-medium">Started</th><th className="px-5 py-2.5 font-medium">Duration</th><th className="px-5 py-2.5 font-medium">Files</th><th className="px-5 py-2.5 font-medium">Findings</th><th className="px-5 py-2.5 font-medium">Branch</th><th className="px-5 py-2.5 font-medium">Status</th></tr></thead><tbody>{rows.map((scan) => <tr key={scan.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-5 py-3 font-medium text-slate-900">{projects.find((project) => project.id === scan.project_id)?.name ?? `Project ${scan.project_id}`}</td><td className="px-5 py-3 text-slate-600">{scan.started_at ? new Date(scan.started_at).toLocaleString() : 'Queued'}</td><td className="px-5 py-3 text-slate-600">{duration(scan)}</td><td className="px-5 py-3 text-slate-700">{scan.files_scanned ?? 0}</td><td className="px-5 py-3 font-medium text-slate-700">{scan.vulnerabilities_found ?? 0}</td><td className="px-5 py-3 font-mono text-xs text-slate-600">{scan.branch ?? '—'}</td><td className="px-5 py-3"><Badge tone={scan.status === 'completed' ? 'emerald' : scan.status === 'failed' ? 'red' : scan.status === 'running' ? 'blue' : 'amber'}>{scan.status}</Badge></td></tr>)}</tbody></table></div>}</Card>
  </div>;
}
