import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bot, FileCode2, Lightbulb, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getWorkspaceData } from '../services/workspaceService';
import { generateFix } from '../services/fixService';
import type { PageId } from '../lib/nav';
import type { Scan, Vulnerability } from '../types/scan';

type FindingItem = { finding: Vulnerability; scan: Scan };

function tone(severity: string | null): 'critical' | 'high' | 'medium' | 'low' | 'slate' {
  const value = severity?.toLowerCase();
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low' ? value : 'slate';
}

export function AIReviewPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const [items, setItems] = useState<FindingItem[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [scanId, setScanId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [severity, setSeverity] = useState('all');
  const [query, setQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getWorkspaceData().then(({ scans: loadedScans }) => {
      setScans(loadedScans);
      const selectedScan = loadedScans.find((scan) => scan.status === 'completed') ?? loadedScans[0];
      setScanId(selectedScan?.id ?? null);
      const findings = selectedScan?.vulnerabilities.map((finding) => ({ scan: selectedScan, finding })) ?? [];
      setItems(findings); setSelectedId(findings[0]?.finding.id ?? null);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load AI review data.'));
  }, []);

  useEffect(() => { const scan = scans.find((candidate) => candidate.id === scanId); const findings = scan?.vulnerabilities.map((finding) => ({ scan, finding })) ?? []; setItems(findings); setSelectedId(findings[0]?.finding.id ?? null); }, [scanId, scans]);

  const filtered = useMemo(() => items.filter(({ finding }) => (severity === 'all' || finding.severity?.toLowerCase() === severity) && `${finding.vulnerability_type} ${finding.file_path || ''}`.toLowerCase().includes(query.toLowerCase())), [items, severity, query]);
  const selected = useMemo(() => filtered.find(({ finding }) => finding.id === selectedId) ?? filtered[0] ?? null, [filtered, selectedId]);

  async function handleGenerateFix() { if (!selected) return; setGenerating(true); setError(null); try { const fix = await generateFix(selected.scan.project_id, selected.finding.id); setNotice(`Proposal #${fix.id} was saved. Validate and approve it before any external application.`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to generate a secure-fix proposal.'); } finally { setGenerating(false); } }

  return <div className="flex min-h-0 flex-col gap-6 lg:h-full">
    <PageHeader title="AI review" subtitle="Model-generated analysis attached to persisted scanner findings." />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}{notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice} <button className="underline" onClick={() => onNavigate('fixes')}>Open Secure Fixes</button></div>}
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-3"><select className="app-input" value={scanId ?? ''} onChange={(event) => setScanId(Number(event.target.value))}><option value="">Select a scan</option>{scans.map((scan) => <option key={scan.id} value={scan.id}>Scan #{scan.id} · {scan.status}</option>)}</select><select className="app-input" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">All severities</option>{['critical', 'high', 'medium', 'low'].map((value) => <option key={value}>{value}</option>)}</select><input className="app-input" placeholder="Filter by type or path" value={query} onChange={(event) => setQuery(event.target.value)} /></div></Card>
    {items.length === 0 ? <Card className="p-10 text-center"><Bot className="mx-auto text-brand-blue" size={30} /><h2 className="mt-3 font-semibold text-slate-900">No findings for this scan</h2><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">Select a completed scan to inspect its persisted static and AI-enriched findings.</p></Card> : <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="flex min-h-0 flex-col p-3"><p className="shrink-0 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{filtered.length} of {items.length} findings</p><div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-app">{filtered.map(({ finding }) => <button key={finding.id} onClick={() => setSelectedId(finding.id)} className={finding.id === selected?.finding.id ? 'w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left' : 'w-full rounded-lg border border-transparent p-3 text-left hover:bg-slate-50'}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-slate-800">{finding.vulnerability_type}</span><Badge tone={tone(finding.severity)}>{finding.severity ?? 'unknown'}</Badge></div><p className="mt-1 truncate font-mono text-[11px] text-slate-500">{finding.file_path ?? 'Path unavailable'}{finding.line_number ? `:${finding.line_number}` : ''}</p></button>)}</div></Card>
      {selected && <div className="min-h-0 overflow-y-auto pr-1 scrollbar-app"><div className="space-y-4"><Card><div className="flex flex-wrap items-center gap-3"><Badge tone={tone(selected.finding.severity)}>{selected.finding.severity ?? 'unknown'}</Badge><h2 className="text-lg font-semibold text-slate-950">{selected.finding.vulnerability_type}</h2></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><FileCode2 size={13} />{selected.finding.file_path ?? 'Path unavailable'}{selected.finding.line_number ? `:${selected.finding.line_number}` : ''}</span><span>Scan #{selected.scan.id}</span>{selected.finding.cvss != null && <span>CVSS {selected.finding.cvss.toFixed(1)}</span>}</div>{selected.finding.description && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700">{selected.finding.description}</p>}</Card>
        <div className="grid gap-4 md:grid-cols-2"><Insight title="AI explanation" value={selected.finding.ai_explanation} icon={Sparkles} /><Insight title="Impact" value={selected.finding.ai_impact} icon={ShieldAlert} /><Insight title="Attack scenario" value={selected.finding.ai_attack_scenario} icon={AlertCircle} /><Insight title="Remediation" value={selected.finding.ai_remediation || selected.finding.recommendation} icon={Lightbulb} /><Insight title="Secure coding advice" value={selected.finding.ai_secure_coding_advice} icon={Bot} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>AI guidance is persisted when available; CWE mapping is not currently stored by the scanner. Generated proposals are never applied automatically.</span><button onClick={() => void handleGenerateFix()} disabled={generating || selected.scan.status !== 'completed'} className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-2 text-xs font-medium text-white disabled:opacity-50"><Wand2 size={14}/>{generating ? 'Generating…' : 'Generate Fix'}</button></div>
      </div></div>}
    </div>}
  </div>;
}

function Insight({ title, value, icon: Icon }: { title: string; value: string | null; icon: typeof Sparkles }) {
  return <Card><CardHeader title={title} action={<Icon size={16} className="text-brand-blue" />} /><p className="text-sm leading-6 text-slate-700">{value || 'The configured model did not return this analysis field.'}</p></Card>;
}
