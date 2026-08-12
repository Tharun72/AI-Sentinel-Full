import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileArchive, Github, UploadCloud, File as FileIcon, X, Radar, CheckCircle2, FolderOpen } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import twMerge from '../lib/twMerge';

type Tab = 'zip' | 'github' | 'files';
type Stage = 'idle' | 'uploading' | 'scanning' | 'done';

export function UploadPage() {
  const [tab, setTab] = useState<Tab>('zip');
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [repoUrl, setRepoUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((f) => ({ name: f.name, size: f.size }));
    setFiles((prev) => [...prev, ...next]);
  };

  const startFlow = () => {
    setStage('uploading');
    setProgress(0);
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setStage('scanning');
          setTimeout(() => setStage('done'), 2200);
          return 100;
        }
        return p + 8;
      });
    }, 120);
  };

  const reset = () => {
    setStage('idle');
    setProgress(0);
    setFiles([]);
    setRepoUrl('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Code"
        subtitle="Submit a repository, archive, or individual files for security analysis"
        actions={<Button variant="secondary" size="md" onClick={reset}>Reset</Button>}
      />

      <div className="grid w-full grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1.5">
        {([
          { id: 'zip', label: 'Upload ZIP', icon: FileArchive },
          { id: 'github', label: 'GitHub Repo', icon: Github },
          { id: 'files', label: 'Individual Files', icon: FileIcon },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={twMerge(
                'relative flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                tab === t.id ? 'text-white' : 'text-slate-400 hover:text-white',
              )}
            >
              {tab === t.id && <motion.div layoutId="upload-tab" className="absolute inset-0 rounded-lg bg-brand-blue/15 border border-brand-blue/30" />}
              <Icon size={15} className="relative z-10" />
              <span className="relative z-10 hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {tab === 'github' ? (
            <Card>
              <CardHeader title="Connect a repository" subtitle="We clone a shallow copy and run a deep SAST scan" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4">
                  <Github size={18} className="text-slate-400" />
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/org/repository"
                    className="h-12 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Branch</span>
                    <input defaultValue="main" className="mt-0.5 w-full bg-transparent text-sm text-white focus:outline-none" />
                  </label>
                  <label className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Token (optional)</span>
                    <input type="password" placeholder="ghp_…" className="mt-0.5 w-full bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none" />
                  </label>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title={tab === 'zip' ? 'Drop your archive' : 'Drop your files'} subtitle={tab === 'zip' ? 'ZIP, TAR, or GZ up to 500 MB' : 'Any source file — .ts, .py, .go, .rs, .java, .c, …'} />
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className={twMerge(
                  'grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
                  dragOver ? 'border-brand-blue bg-brand-blue/5' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]',
                )}
              >
                <input ref={inputRef} type="file" multiple={tab === 'files'} accept={tab === 'zip' ? '.zip,.tar,.gz' : undefined} className="hidden" onChange={(e) => addFiles(e.target.files)} />
                <motion.div animate={{ y: dragOver ? -4 : 0 }} className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                  {tab === 'zip' ? <FileArchive size={24} /> : <UploadCloud size={24} />}
                </motion.div>
                <p className="mt-4 text-sm font-medium text-slate-100">{dragOver ? 'Release to upload' : 'Drag & drop here, or click to browse'}</p>
                <p className="mt-1 text-xs text-slate-500">Files are scanned in an isolated sandbox and never stored.</p>
              </div>
            </Card>
          )}

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card>
                  <CardHeader title="Queued files" subtitle={`${files.length} file${files.length > 1 ? 's' : ''}`} action={<Button variant="ghost" size="sm" onClick={() => setFiles([])}>Clear</Button>} />
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] text-slate-300"><FileIcon size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm text-slate-100">{f.name}</p>
                          <p className="text-xs text-slate-500">{(f.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-brand-red"><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {stage !== 'idle' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <div className="flex items-center gap-3">
                    {stage === 'done' ? <CheckCircle2 size={20} className="text-brand-emerald" /> : <Radar size={20} className="text-brand-blue animate-pulse" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-100">
                        {stage === 'uploading' && 'Uploading files…'}
                        {stage === 'scanning' && 'Running deep security scan…'}
                        {stage === 'done' && 'Scan complete — 14 vulnerabilities found'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {stage === 'uploading' && 'Encrypting and transferring to sandbox'}
                        {stage === 'scanning' && 'Analyzing 1,840 rules across 6 languages'}
                        {stage === 'done' && 'Review results in the Security Scan tab'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-white">{progress}%</span>
                  </div>
                  <Progress value={progress} tone={stage === 'done' ? 'emerald' : 'blue'} className="mt-3" />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Scan configuration" subtitle="Tune this run" />
            <div className="space-y-3">
              {[
                { label: 'SAST (static analysis)', on: true },
                { label: 'Dependency & license scan', on: true },
                { label: 'Secret detection', on: true },
                { label: 'IaC configuration scan', on: false },
                { label: 'AI auto-fix generation', on: true },
              ].map((opt) => (
                <label key={opt.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                  <span className="text-sm text-slate-200">{opt.label}</span>
                  <span className={twMerge('relative h-5 w-9 rounded-full transition-colors', opt.on ? 'bg-brand-blue' : 'bg-white/10')}>
                    <span className={twMerge('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', opt.on ? 'left-4' : 'left-0.5')} />
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Summary" />
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Source</span><span className="text-slate-100 capitalize">{tab === 'zip' ? 'Archive' : tab === 'github' ? 'Repository' : 'Files'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Items</span><span className="text-slate-100">{files.length || (repoUrl ? 1 : 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Est. duration</span><span className="text-slate-100">~4 min</span></div>
            </div>
            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={stage === 'uploading' || stage === 'scanning' || (tab !== 'github' && files.length === 0) || (tab === 'github' && !repoUrl)}
              onClick={startFlow}
            >
              <Radar size={16} /> {stage === 'done' ? 'Re-run Scan' : 'Start Scan'}
            </Button>
          </Card>

          <div className="glass p-4">
            <div className="flex items-center gap-2 text-brand-cyan">
              <FolderOpen size={15} />
              <span className="text-xs font-medium">Sandbox isolation</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">All uploads execute in an ephemeral, network-isolated container that is destroyed after the scan completes.</p>
            <Badge tone="emerald" className="mt-3">SOC 2 Type II</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
