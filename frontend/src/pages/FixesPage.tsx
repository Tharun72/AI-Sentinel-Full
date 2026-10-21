import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileCode2, ShieldCheck, Wrench } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { getProjects } from '../services/projectService';
import { approveFix, getProjectFixes, validateFix, type SecureFix } from '../services/fixService';
import type { Project } from '../types/project';

function tone(status: SecureFix['status']): 'blue' | 'emerald' | 'amber' | 'red' | 'slate' {
  if (status === 'validated') return 'blue';
  if (status === 'approved') return 'emerald';
  if (status === 'rejected') return 'red';
  if (status === 'proposed') return 'amber';
  return 'slate';
}

export function FixesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [fixes, setFixes] = useState<SecureFix[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getProjects().then((next) => {
      setProjects(next);
      setProjectId(next[0]?.id ?? null);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load projects.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (projectId === null) return;
    void getProjectFixes(projectId).then(setFixes).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load secure-fix proposals.'));
  }, [projectId]);

  async function runAction(action: 'validate' | 'approve', fix: SecureFix) {
    if (projectId === null) return;
    setWorking(fix.id);
    setError(null);
    try {
      const updated = action === 'validate' ? await validateFix(projectId, fix.id) : await approveFix(projectId, fix.id);
      setFixes((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Secure-fix action failed.');
    } finally {
      setWorking(null);
    }
  }

  return <div className="space-y-6">
    <PageHeader title="Secure fixes" subtitle="Review, validate, and explicitly approve persisted patch proposals. No repository is modified by this workflow." />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    <Card><CardHeader title="Project" subtitle="Fix proposals are isolated by project ownership." /><select className="app-input max-w-md" value={projectId ?? ''} onChange={(event) => setProjectId(event.target.value ? Number(event.target.value) : null)} disabled={loading}><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Card>
    <Card><CardHeader title="Patch proposals" subtitle={`${fixes.length} persisted proposal${fixes.length === 1 ? '' : 's'}`} />{fixes.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><Wrench className="mx-auto text-brand-blue" size={28} /><h2 className="mt-3 font-semibold text-slate-900">No secure-fix proposals</h2><p className="mt-1 text-sm text-slate-600">Proposals must be created from a completed scan and remain untrusted until validated and reviewed.</p></div> : <div className="space-y-4">{fixes.map((fix) => <article key={fix.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileCode2 size={16} className="text-brand-blue" /><h3 className="font-semibold text-slate-900">{fix.file_path}</h3><Badge tone={tone(fix.status)}>{fix.status}</Badge></div><p className="mt-1 text-xs text-slate-500">Finding #{fix.vulnerability_id} · Scan #{fix.scan_id} · Revision <span className="font-mono">{fix.source_revision}</span></p></div><div className="flex gap-2">{fix.status === 'proposed' && <Button size="sm" onClick={() => void runAction('validate', fix)} disabled={working === fix.id}><ShieldCheck size={14} />{working === fix.id ? 'Validating…' : 'Validate patch'}</Button>}{fix.status === 'validated' && <Button size="sm" variant="success" onClick={() => void runAction('approve', fix)} disabled={working === fix.id}><CheckCircle2 size={14} />Approve proposal</Button>}</div></div><pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">{fix.patch_text}</pre>{fix.validation_message && <p className="mt-3 text-sm text-slate-600">{fix.validation_message}</p>}</article>)}</div>}</Card>
    <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>Approval records user intent but does not apply code. Applying patches and rollback require a separately isolated execution service, repository write credentials, post-apply rescanning, and an auditable rollback mechanism.</p></div>
  </div>;
}
