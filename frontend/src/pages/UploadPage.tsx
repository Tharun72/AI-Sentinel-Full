import { FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Github, GitBranch, Radar, Upload } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { createProject, getProjects } from '../services/projectService';
import { startScan } from '../services/scanService';

function projectNameFromUrl(url: string) { const parts = url.trim().replace(/\/$/, '').replace(/\.git$/, '').split('/'); return parts[parts.length - 1] || 'Security Scan Project'; }

export function UploadPage() {
  const [projectName, setProjectName] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [submitting, setSubmitting] = useState(false);
  const [scanId, setScanId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const url = repositoryUrl.trim();
    if (!url || !branch.trim()) return;
    setSubmitting(true); setError(null); setScanId(null);
    try {
      const existing = await getProjects();
      const project = existing.find((item) => item.repository_url === url) ?? await createProject({ name: projectName.trim() || projectNameFromUrl(url), repository_url: url });
      const scan = await startScan(project.id, { branch: branch.trim() });
      setScanId(scan.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to queue the scan.');
    } finally { setSubmitting(false); }
  }

  return <div className="mx-auto max-w-4xl space-y-6">
    <PageHeader title="Add repository" subtitle="Create a monitored project and start a persisted security scan." />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    {scanId && <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 size={18} className="shrink-0" /><p>Scan <span className="font-semibold">#{scanId}</span> has been queued. Open Security Scan to view the live persisted worker status.</p></div>}
    <Card><CardHeader title="Public HTTPS repository" subtitle="The worker performs an isolated shallow clone using the configured allowlist." /><form className="space-y-5" onSubmit={submit}><label className="block"><span className="text-sm font-medium text-slate-700">Project name <span className="font-normal text-slate-500">(optional)</span></span><input className="app-input mt-1.5" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Defaults to the repository name" maxLength={255} /></label><label className="block"><span className="text-sm font-medium text-slate-700">Repository URL</span><span className="relative mt-1.5 block"><Github size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="app-input pl-10" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/organization/repository.git" required /></span></label><label className="block"><span className="text-sm font-medium text-slate-700">Branch</span><span className="relative mt-1.5 block"><GitBranch size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="app-input pl-10" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="main" required maxLength={255} /></span></label><div className="flex justify-end border-t border-slate-100 pt-5"><Button type="submit" disabled={submitting || !repositoryUrl.trim() || !branch.trim()}>{submitting ? 'Queueing scan…' : <><Radar size={15} /> Start security scan</>}</Button></div></form></Card>
    <Card className="border-dashed bg-slate-50"><div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-brand-blue shadow-sm"><Upload size={18} /></div><div><h2 className="font-semibold text-slate-900">Archive and individual-file uploads</h2><p className="mt-1 text-sm leading-6 text-slate-600">These upload mechanisms are not exposed by the current backend. The platform accepts supported public HTTPS repositories only, and does not imply local archives or source files were uploaded.</p></div></div></Card>
  </div>;
}
