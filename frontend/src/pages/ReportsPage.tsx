import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileJson, FolderGit2, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { SeverityPieChart, VulnerabilityTrendChart, type SeverityPoint, type TrendPoint } from '../components/charts/Charts';
import { getWorkspaceData } from '../services/workspaceService';
import type { Project } from '../types/project';
import type { Scan, Vulnerability } from '../types/scan';

const meta: Record<string, { color: string; label: string }> = { critical: { color: '#dc2626', label: 'Critical' }, high: { color: '#d97706', label: 'High' }, medium: { color: '#2563eb', label: 'Medium' }, low: { color: '#0891b2', label: 'Low' } };
function count(finding: Vulnerability) { return finding.count ?? 1; }

export function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void getWorkspaceData().then((data) => { setProjects(data.projects); setScans(data.scans); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to prepare the report.')); }, []);

  const report = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    scans.flatMap((scan) => scan.vulnerabilities).forEach((finding) => { const severity = finding.severity?.toLowerCase() ?? 'low'; if (severity in counts) counts[severity as keyof typeof counts] += count(finding); });
    const severity: SeverityPoint[] = Object.entries(counts).map(([key, value]) => ({ name: meta[key].label, value, color: meta[key].color }));
    const days = Array.from({ length: 7 }, (_, offset) => { const date = new Date(); date.setDate(date.getDate() - (6 - offset)); date.setHours(0, 0, 0, 0); return date; });
    const trend: TrendPoint[] = days.map((date) => ({ date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), critical: 0, high: 0, medium: 0, low: 0 }));
    scans.forEach((scan) => { if (!scan.created_at) return; const date = new Date(scan.created_at); date.setHours(0, 0, 0, 0); const index = days.findIndex((day) => day.getTime() === date.getTime()); if (index === -1) return; scan.vulnerabilities.forEach((finding) => { const severity = finding.severity?.toLowerCase() ?? 'low'; if (severity in counts) trend[index][severity as keyof Omit<TrendPoint, 'date'>] += count(finding); }); });
    const totalFindings = Object.values(counts).reduce((total, value) => total + value, 0);
    const completed = scans.filter((scan) => scan.status === 'completed');
    const latest = new Map<number, Scan>(); scans.forEach((scan) => { if (!latest.has(scan.project_id)) latest.set(scan.project_id, scan); });
    const posture = latest.size ? Math.round([...latest.values()].reduce((total, scan) => total + Math.max(0, 100 - (scan.risk_score ?? 0) * 10), 0) / latest.size) : null;
    return { counts, severity, trend, totalFindings, completed: completed.length, posture };
  }, [scans]);

  function exportJson() {
    const payload = { generated_at: new Date().toISOString(), projects, scans };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ai-sentinel-security-report.json'; link.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-6">
    <PageHeader title="Reports" subtitle="A live report derived only from persisted project and scan records." actions={<Button onClick={exportJson} disabled={!scans.length}><FileJson size={15} /> Export JSON</Button>} />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Projects" value={String(projects.length)} icon={FolderGit2} /><Metric label="Completed scans" value={String(report.completed)} icon={ShieldCheck} /><Metric label="Findings" value={String(report.totalFindings)} icon={AlertCircle} /><Metric label="Posture score" value={report.posture?.toString() ?? '—'} icon={ShieldCheck} /></div>
    <div className="grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader title="Finding trend" subtitle="Findings grouped by scan creation date." /><VulnerabilityTrendChart data={report.trend} /></Card><Card><CardHeader title="Severity distribution" subtitle="All persisted scanner findings." /><SeverityPieChart data={report.severity} /></Card></div>
    <Card><CardHeader title="Risk summary" subtitle="Counts are direct totals from the completed and historical scans available to this account." action={<Badge tone={report.counts.critical > 0 ? 'red' : 'emerald'}>{report.counts.critical > 0 ? 'Action required' : 'No critical findings'}</Badge>} /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(report.counts).map(([severity, value]) => <div key={severity} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{severity}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></div>)}</div><div className="mt-5 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><Download size={18} className="shrink-0" /><p>JSON export is available client-side using the exact records displayed here. PDF, CSV, SARIF, and saved-report APIs are not configured by this backend.</p></div></Card>
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) { return <Card className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><Icon size={17} className="text-brand-blue" /></div><p className="mt-3 text-3xl font-bold text-slate-950">{value}</p></Card>; }
