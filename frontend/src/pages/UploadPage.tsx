import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileArchive, File as FileIcon, FolderOpen, Github, Radar, CheckCircle2 } from 'lucide-react';

import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import twMerge from '../lib/twMerge';
import { createProject, getProjects } from '../services/projectService';
import { startScan } from '../services/scanService';

type Tab = 'zip' | 'github' | 'files';
type Stage = 'idle' | 'submitting' | 'queued' | 'failed';

function inferProjectName(repositoryUrl: string): string {
  const segments = repositoryUrl.replace(/\/$/, '').replace(/\.git$/, '').split('/');
  return segments[segments.length - 1] || 'Security Scan Project';
}

export function UploadPage() {
  const [tab, setTab] = useState<Tab>('github');
  const [stage, setStage] = useState<Stage>('idle');
  const [repoUrl, setRepoUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [branch, setBranch] = useState('main');
  const [scanId, setScanId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStage('idle');
    setRepoUrl('');
    setProjectName('');
    setBranch('main');
    setScanId(null);
    setError(null);
  };

  const startFlow = async () => {
    const normalizedUrl = repoUrl.trim();
    const normalizedBranch = branch.trim();
    if (!normalizedUrl || !normalizedBranch) return;

    setStage('submitting');
    setError(null);
    setScanId(null);

    try {
      const existingProjects = await getProjects();
      const project = existingProjects.find(
        (item) => item.repository_url === normalizedUrl
      ) ?? await createProject({
        name: projectName.trim() || inferProjectName(normalizedUrl),
        repository_url: normalizedUrl,
      });
      const scan = await startScan(project.id, { branch: normalizedBranch });
      setScanId(scan.id);
      setStage('queued');
    } catch (requestError) {
      setStage('failed');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to queue the repository scan.'
      );
    }
  };

  const repositorySelected = tab === 'github';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Repository"
        subtitle="Create a monitored project and queue a static security scan"
        actions={<Button variant="secondary" size="md" onClick={reset}>Reset</Button>}
      />

      <div className="grid w-full grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5">
        {([
          { id: 'zip', label: 'Upload ZIP', icon: FileArchive },
          { id: 'github', label: 'Repository', icon: Github },
          { id: 'files', label: 'Individual Files', icon: FileIcon },
        ] as const).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={twMerge(
                'relative flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                tab === item.id ? 'text-white' : 'text-slate-400 hover:text-white',
              )}
            >
              {tab === item.id && <motion.div layoutId="upload-tab" className="absolute inset-0 rounded-lg border border-brand-blue/30 bg-brand-blue/15" />}
              <Icon size={15} className="relative z-10" />
              <span className="relative z-10 hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {repositorySelected ? (
            <Card>
              <CardHeader title="Connect a public repository" subtitle="The worker clones a shallow HTTPS copy into a temporary workspace" />
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-wider text-slate-500">Project name</label>
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="Defaults to the repository name"
                    className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 text-sm text-white placeholder:text-slate-500 focus:border-brand-blue/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-wider text-slate-500">Repository URL</label>
                  <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4">
                    <Github size={18} className="text-slate-400" />
                    <input
                      value={repoUrl}
                      onChange={(event) => setRepoUrl(event.target.value)}
                      placeholder="https://github.com/org/repository.git"
                      className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
                <label className="block rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">Branch</span>
                  <input value={branch} onChange={(event) => setBranch(event.target.value)} className="mt-0.5 w-full bg-transparent text-sm text-white focus:outline-none" />
                </label>
                <p className="text-xs leading-5 text-slate-500">
                  Public HTTPS repositories on configured Git providers are supported. Private-repository authentication and archive/file uploads are not configured by this API.
                </p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title={tab === 'zip' ? 'Archive upload' : 'Individual file upload'} subtitle="Not enabled by the current backend API" />
              <div className="rounded-2xl border border-brand-amber/20 bg-brand-amber/5 p-8 text-center">
                {tab === 'zip' ? <FileArchive size={24} className="mx-auto text-brand-amber" /> : <FileIcon size={24} className="mx-auto text-brand-amber" />}
                <p className="mt-4 text-sm font-medium text-slate-100">Use a public repository for this deployment</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">No local source code is selected or transmitted from this page because the API currently supports repository scans only.</p>
              </div>
            </Card>
          )}

          {stage !== 'idle' && (
            <Card className={stage === 'failed' ? 'border-brand-red/30' : undefined}>
              <div className="flex items-center gap-3">
                {stage === 'queued' ? <CheckCircle2 size={20} className="text-brand-emerald" /> : <Radar size={20} className="animate-pulse text-brand-blue" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-100">
                    {stage === 'submitting' && 'Creating the project and queueing its scan...'}
                    {stage === 'queued' && `Scan #${scanId} is queued.`}
                    {stage === 'failed' && 'The repository scan could not be queued.'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {stage === 'queued' && 'Open Security Scan to follow live status and review results.'}
                    {stage === 'failed' && error}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Scan configuration" subtitle="Enabled capabilities" />
            <div className="space-y-3">
              {[
                { label: 'Pattern-based SAST', on: true },
                { label: 'Secret detection', on: true },
                { label: 'Local Ollama analysis', on: true },
              ].map((option) => (
                <div key={option.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                  <span className="text-sm text-slate-200">{option.label}</span>
                  <span className={twMerge('relative h-5 w-9 rounded-full', option.on ? 'bg-brand-blue' : 'bg-white/10')}>
                    <span className={twMerge('absolute top-0.5 h-4 w-4 rounded-full bg-white', option.on ? 'left-4' : 'left-0.5')} />
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Summary" />
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Source</span><span className="text-slate-100">{repositorySelected ? 'Repository' : 'Unavailable'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Repository</span><span className="max-w-40 truncate text-slate-100">{repoUrl || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Processing</span><span className="text-slate-100">Background worker</span></div>
            </div>
            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={stage === 'submitting' || !repositorySelected || !repoUrl.trim() || !branch.trim()}
              onClick={startFlow}
            >
              <Radar size={16} /> {stage === 'submitting' ? 'Queueing scan...' : 'Queue Scan'}
            </Button>
          </Card>

          <div className="glass p-4">
            <div className="flex items-center gap-2 text-brand-cyan">
              <FolderOpen size={15} />
              <span className="text-xs font-medium">Temporary checkout</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">The scan worker removes its shallow repository checkout after the scan succeeds or fails.</p>
            <Badge tone="blue" className="mt-3">HTTPS repositories</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
