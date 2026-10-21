import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Bot, CheckCircle2, FileBarChart, FolderGit2, Radar, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { KpiCard } from '../components/dashboard/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { ScanFrequencyChart, SeverityPieChart, VulnerabilityTrendChart, type FrequencyPoint, type SeverityPoint, type TrendPoint } from '../components/charts/Charts';
import { getWorkspaceData } from '../services/workspaceService';
import type { Project } from '../types/project';
import type { Scan, Vulnerability } from '../types/scan';

interface DashboardPageProps { onNavigate: (page: string) => void; }

const severityMeta: Record<string, { color: string; label: string }> = {
  critical: { color: '#dc2626', label: 'Critical' },
  high: { color: '#d97706', label: 'High' },
  medium: { color: '#2563eb', label: 'Medium' },
  low: { color: '#0891b2', label: 'Low' },
};

function formatDate(value: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function findingCount(finding: Vulnerability) { return finding.count ?? 1; }
function score(scan: Scan) { return Math.max(0, Math.round(100 - (scan.risk_score ?? 0) * 10)); }

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getWorkspaceData()
      .then((data) => { if (active) { setProjects(data.projects); setScans(data.scans); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load workspace data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const analytics = useMemo(() => {
    const latestByProject = new Map<number, Scan>();
    scans.forEach((scan) => { if (!latestByProject.has(scan.project_id)) latestByProject.set(scan.project_id, scan); });
    const findings = scans.flatMap((scan) => scan.vulnerabilities);
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach((finding) => {
      const key = finding.severity?.toLowerCase() ?? 'low';
      if (key in counts) counts[key as keyof typeof counts] += findingCount(finding);
    });
    const severity: SeverityPoint[] = Object.entries(counts).map(([key, value]) => ({ name: severityMeta[key].label, value, color: severityMeta[key].color }));
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(now); date.setDate(now.getDate() - (6 - offset)); date.setHours(0, 0, 0, 0);
      return date;
    });
    const trend: TrendPoint[] = days.map((date) => ({ date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), critical: 0, high: 0, medium: 0, low: 0 }));
    const frequency: FrequencyPoint[] = days.map((date) => ({ day: date.toLocaleDateString(undefined, { weekday: 'short' }), scans: 0 }));
    scans.forEach((scan) => {
      if (!scan.created_at) return;
      const date = new Date(scan.created_at); date.setHours(0, 0, 0, 0);
      const index = days.findIndex((day) => day.getTime() === date.getTime());
      if (index < 0) return;
      frequency[index].scans += 1;
      scan.vulnerabilities.forEach((finding) => {
        const key = finding.severity?.toLowerCase() ?? 'low';
        if (key in counts) trend[index][key as keyof Omit<TrendPoint, 'date'>] += findingCount(finding);
      });
    });
    const latest = [...latestByProject.values()];
    return { findings, severity, trend, frequency, latest, posture: latest.length ? Math.round(latest.reduce((total, scan) => total + score(scan), 0) / latest.length) : null };
  }, [scans]);

  const aiFindings = analytics.findings.filter((finding) => finding.ai_explanation || finding.ai_remediation).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader title="Security overview" subtitle="Live posture calculated from your persisted projects and scans." actions={<><Button variant="secondary" onClick={() => onNavigate('reports')}><FileBarChart size={15} /> View reports</Button><Button onClick={() => onNavigate('upload')}><Radar size={15} /> Add repository</Button></>} />
      {error && <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Projects" value={loading ? '…' : String(projects.length)} accent="blue" icon={<FolderGit2 size={18} />} />
        <KpiCard label="Findings detected" value={loading ? '…' : String(analytics.findings.reduce((total, finding) => total + findingCount(finding), 0))} accent="red" icon={<AlertCircle size={18} />} />
        <KpiCard label="Files scanned" value={loading ? '…' : String(scans.reduce((total, scan) => total + (scan.files_scanned ?? 0), 0))} accent="emerald" icon={<CheckCircle2 size={18} />} />
        <KpiCard label="Posture score" value={loading ? '…' : analytics.posture?.toString() ?? '—'} accent="cyan" icon={<ShieldCheck size={18} />} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Finding trend" subtitle="Findings from scans created in the last seven days." /><VulnerabilityTrendChart data={analytics.trend} /></Card>
        <Card><CardHeader title="Severity distribution" subtitle="All persisted findings." /><SeverityPieChart data={analytics.severity} /></Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Scan activity" subtitle="Runs created in the last seven days." /><ScanFrequencyChart data={analytics.frequency} /></Card>
        <Card><CardHeader title="Posture score" subtitle="Latest scan from each project." /><div className="flex min-h-[220px] flex-col justify-center gap-4"><p className="text-5xl font-bold tracking-tight text-slate-950">{analytics.posture ?? '—'}{analytics.posture !== null && <span className="text-xl text-slate-400">/100</span>}</p><p className="text-sm text-slate-600">{analytics.posture === null ? 'A posture score appears after the first scan completes.' : `${analytics.latest.length} project${analytics.latest.length === 1 ? '' : 's'} included.`}</p></div></Card>
        <Card><CardHeader title="Scanner coverage" subtitle="Current backend capabilities." /><div className="space-y-3 text-sm"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-brand-blue"><Activity size={16} /></span><span className="text-slate-700">Public HTTPS repositories</span></div><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-brand-emerald"><ShieldCheck size={16} /></span><span className="text-slate-700">Static security rules</span></div><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-50 text-brand-cyan"><Bot size={16} /></span><span className="text-slate-700">Optional local AI enrichment</span></div></div></Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Recent scans" subtitle="Latest activity across your projects." action={<Button size="sm" variant="ghost" onClick={() => onNavigate('history')}>View all</Button>} />
          {scans.length === 0 && !loading ? <EmptyState onNavigate={onNavigate} /> : <div className="-mx-5 overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="px-5 py-2.5 font-medium">Project</th><th className="px-5 py-2.5 font-medium">Status</th><th className="px-5 py-2.5 font-medium">Findings</th><th className="px-5 py-2.5 font-medium">Score</th><th className="px-5 py-2.5 font-medium">Created</th></tr></thead><tbody>{scans.slice(0, 6).map((scan) => <tr key={scan.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-5 py-3 font-medium text-slate-900">{projects.find((project) => project.id === scan.project_id)?.name ?? `Project ${scan.project_id}`}</td><td className="px-5 py-3"><Badge tone={scan.status === 'completed' ? 'emerald' : scan.status === 'failed' ? 'red' : scan.status === 'running' ? 'blue' : 'amber'}>{scan.status}</Badge></td><td className="px-5 py-3 text-slate-700">{scan.vulnerabilities_found ?? 0}</td><td className="px-5 py-3"><div className="flex items-center gap-2"><Progress value={score(scan)} tone={score(scan) >= 70 ? 'emerald' : score(scan) >= 40 ? 'amber' : 'red'} className="w-16" /><span className="text-xs text-slate-600">{score(scan)}</span></div></td><td className="px-5 py-3 text-slate-600">{formatDate(scan.created_at)}</td></tr>)}</tbody></table></div>}</Card>
        <Card><CardHeader title="AI-enriched findings" subtitle="Only analysis returned by the configured model." />{aiFindings.length ? <div className="space-y-3">{aiFindings.map((finding) => <div key={finding.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium text-slate-900">{finding.vulnerability_type}</p><Badge tone={(finding.severity?.toLowerCase() as 'critical' | 'high' | 'medium' | 'low') ?? 'slate'}>{finding.severity ?? 'unknown'}</Badge></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{finding.ai_remediation || finding.ai_explanation}</p></div>)}</div> : <p className="text-sm leading-6 text-slate-600">No AI enrichment is stored yet. Static findings remain available from Security Scan even if the local model is offline.</p>}</Card>
      </div>
    </div>
  );
}

function EmptyState({ onNavigate }: DashboardPageProps) { return <div className="p-10 text-center"><Radar className="mx-auto text-brand-blue" size={28} /><h2 className="mt-3 font-semibold text-slate-900">No scans yet</h2><p className="mt-1 text-sm text-slate-600">Add a public repository to begin collecting persisted security results.</p><Button className="mt-4" onClick={() => onNavigate('upload')}>Add repository</Button></div>; }
