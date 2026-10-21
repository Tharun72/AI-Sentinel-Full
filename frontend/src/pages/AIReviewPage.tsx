import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bot, FileCode2, Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getWorkspaceData } from '../services/workspaceService';
import type { Scan, Vulnerability } from '../types/scan';

type FindingItem = { finding: Vulnerability; scan: Scan };

function tone(severity: string | null): 'critical' | 'high' | 'medium' | 'low' | 'slate' {
  const value = severity?.toLowerCase();
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low' ? value : 'slate';
}

export function AIReviewPage() {
  const [items, setItems] = useState<FindingItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getWorkspaceData().then(({ scans }) => {
      const findings = scans.flatMap((scan) => scan.vulnerabilities.map((finding) => ({ scan, finding })))
        .filter(({ finding }) => finding.ai_explanation || finding.ai_impact || finding.ai_attack_scenario || finding.ai_remediation || finding.ai_secure_coding_advice);
      setItems(findings);
      setSelectedId(findings[0]?.finding.id ?? null);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load AI review data.'));
  }, []);

  const selected = useMemo(() => items.find(({ finding }) => finding.id === selectedId) ?? items[0] ?? null, [items, selectedId]);

  return <div className="space-y-6">
    <PageHeader title="AI review" subtitle="Model-generated analysis attached to persisted scanner findings." />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    {items.length === 0 ? <Card className="p-10 text-center"><Bot className="mx-auto text-brand-blue" size={30} /><h2 className="mt-3 font-semibold text-slate-900">No AI-enriched findings</h2><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-600">The scanner still saves static findings when Ollama is unavailable. Configure the local model and complete a scan to display its persisted explanation and remediation guidance here.</p></Card> : <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <Card className="h-fit p-3"><p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{items.length} AI analyses</p><div className="space-y-1.5">{items.map(({ finding }) => <button key={finding.id} onClick={() => setSelectedId(finding.id)} className={finding.id === selected?.finding.id ? 'w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left' : 'w-full rounded-lg border border-transparent p-3 text-left hover:bg-slate-50'}><div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-slate-800">{finding.vulnerability_type}</span><Badge tone={tone(finding.severity)}>{finding.severity ?? 'unknown'}</Badge></div><p className="mt-1 truncate font-mono text-[11px] text-slate-500">{finding.file_path ?? 'Path unavailable'}{finding.line_number ? `:${finding.line_number}` : ''}</p></button>)}</div></Card>
      {selected && <div className="space-y-4"><Card><div className="flex flex-wrap items-center gap-3"><Badge tone={tone(selected.finding.severity)}>{selected.finding.severity ?? 'unknown'}</Badge><h2 className="text-lg font-semibold text-slate-950">{selected.finding.vulnerability_type}</h2></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600"><span className="inline-flex items-center gap-1.5"><FileCode2 size={13} />{selected.finding.file_path ?? 'Path unavailable'}{selected.finding.line_number ? `:${selected.finding.line_number}` : ''}</span><span>Scan #{selected.scan.id}</span>{selected.finding.cvss != null && <span>CVSS {selected.finding.cvss.toFixed(1)}</span>}</div>{selected.finding.description && <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700">{selected.finding.description}</p>}</Card>
        <div className="grid gap-4 md:grid-cols-2"><Insight title="AI explanation" value={selected.finding.ai_explanation} icon={Sparkles} /><Insight title="Impact" value={selected.finding.ai_impact} icon={ShieldAlert} /><Insight title="Attack scenario" value={selected.finding.ai_attack_scenario} icon={AlertCircle} /><Insight title="Remediation" value={selected.finding.ai_remediation || selected.finding.recommendation} icon={Lightbulb} /><Insight title="Secure coding advice" value={selected.finding.ai_secure_coding_advice} icon={Bot} /></div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Applying or rejecting a patch is not exposed by the current API, so this view is intentionally read-only. The displayed AI content is the exact persisted result returned by the configured model.</div>
      </div>}
    </div>}
  </div>;
}

function Insight({ title, value, icon: Icon }: { title: string; value: string | null; icon: typeof Sparkles }) {
  return <Card><CardHeader title={title} action={<Icon size={16} className="text-brand-blue" />} /><p className="text-sm leading-6 text-slate-700">{value || 'The configured model did not return this analysis field.'}</p></Card>;
}
