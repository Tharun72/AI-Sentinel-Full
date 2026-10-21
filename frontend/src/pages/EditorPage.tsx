import { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, Code2, FileCode2, FolderGit2, Search } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getProjects } from '../services/projectService';
import { getRepositorySource, type RepositorySource } from '../services/sourceService';
import type { Project } from '../types/project';

export function EditorPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [branch, setBranch] = useState('main');
  const [path, setPath] = useState('');
  const [source, setSource] = useState<RepositorySource | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getProjects()
      .then((nextProjects) => {
        setProjects(nextProjects);
        setProjectId(nextProjects[0]?.id ?? null);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (projectId === null || !path.trim()) return;
    setLoadingSource(true);
    setError(null);
    try {
      setSource(await getRepositorySource(projectId, path.trim(), branch.trim() || 'main'));
    } catch (reason) {
      setSource(null);
      setError(reason instanceof Error ? reason.message : 'Unable to retrieve repository source.');
    } finally {
      setLoadingSource(false);
    }
  }

  return <div className="space-y-6">
    <PageHeader title="Code editor" subtitle="Retrieve a bounded, read-only source file from an authenticated repository." />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" />{error}</div>}
    <Card>
      <CardHeader title="Repository source" subtitle="The backend performs a temporary shallow clone and never executes repository code." />
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_1.5fr_auto] md:items-end">
        <label className="block text-sm font-medium text-slate-700">Project
          <span className="relative mt-1.5 block"><FolderGit2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><select className="app-input pl-9" value={projectId ?? ''} onChange={(event) => setProjectId(event.target.value ? Number(event.target.value) : null)} disabled={loading}><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></span>
        </label>
        <label className="block text-sm font-medium text-slate-700">Branch<input className="app-input mt-1.5" value={branch} onChange={(event) => setBranch(event.target.value)} maxLength={255} /></label>
        <label className="block text-sm font-medium text-slate-700">Relative file path<span className="relative mt-1.5 block"><FileCode2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="app-input pl-9" value={path} onChange={(event) => setPath(event.target.value)} placeholder="src/app.py" required maxLength={1024} /></span></label>
        <Button type="submit" disabled={loadingSource || projectId === null || !path.trim()}>{loadingSource ? 'Loading…' : <><Search size={15} /> Retrieve</>}</Button>
      </form>
    </Card>
    {source ? <Card className="overflow-hidden p-0"><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3"><span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Code2 size={16} className="text-brand-blue" />{source.path}</span><span className="text-xs text-slate-500">{source.branch} · {source.size_bytes.toLocaleString()} bytes</span></div><pre className="max-h-[60vh] overflow-auto bg-slate-950 p-5 font-mono text-xs leading-6 text-slate-100"><code>{source.content}</code></pre></Card> : <Card className="border-dashed bg-slate-50 p-10 text-center"><Code2 className="mx-auto text-brand-blue" size={30} /><h2 className="mt-3 font-semibold text-slate-900">No source file selected</h2><p className="mt-1 text-sm text-slate-600">Choose a project and enter a relative source path to inspect its current branch.</p></Card>}
  </div>;
}
