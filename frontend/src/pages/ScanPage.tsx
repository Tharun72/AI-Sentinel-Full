import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Database,
  FileCode2,
  Files,
  Filter,
  FolderGit2,
  GitBranch,
  Loader2,
  Radar,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';

import { getProjects } from '../services/projectService';
import { getProjectScans, getScan, startScan } from '../services/scanService';
import { isTerminalScan, useScanProgress } from '../hooks/useScanProgress';
import type { Project } from '../types/project';
import type { Scan, ScanProgress, Vulnerability } from '../types/scan';

const STAGES = [
  ['validating_repository', 'Repository validation', 'Validating the public repository and branch.'],
  ['cloning_repository', 'Clone & checkout', 'Creating an isolated shallow checkout.'],
  ['file_discovery', 'File discovery', 'Identifying eligible source files within scan limits.'],
  ['static_analysis', 'Static analysis', 'Inspecting eligible files with deterministic security rules.'],
  ['ai_enrichment', 'AI enrichment', 'Adding optional, bounded security context to persisted findings.'],
  ['result_persistence', 'Result persistence', 'Writing the final scan state to the database.'],
  ['completed', 'Completion', 'Scan finished.'],
] as const;

const STAGE_INDEX: Map<string, number> = new Map(STAGES.map(([key], index) => [key, index]));
const TERMINAL_COPY: Record<string, string> = {
  pending: 'Queued for the local background worker.',
  completed: 'All configured scan stages finished.',
  failed: 'The scan stopped before it could finish.',
  cancelled: 'The scan was cancelled.',
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return minutes ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : '—';
}

function severityTone(severity: string | null) {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'border-red-200 bg-red-50 text-red-700';
    case 'high': return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'medium': return 'border-amber-200 bg-amber-50 text-amber-700';
    default: return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function statusTone(status: string) {
  if (status === 'completed') return 'border-teal-200 bg-teal-50 text-teal-700';
  if (status === 'failed' || status === 'cancelled') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'running') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function hasAiAnalysis(vulnerability: Vulnerability) {
  return Boolean(
    vulnerability.ai_explanation || vulnerability.ai_impact ||
    vulnerability.ai_attack_scenario || vulnerability.ai_remediation ||
    vulnerability.ai_secure_coding_advice
  );
}

export function ScanPage() {
  const prefersReducedMotion = useReducedMotion();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [branch, setBranch] = useState('main');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFinding, setOpenFinding] = useState<number | null>(null);
  const syncedStages = useRef(new Set<string>());

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const activeScan = scans.find((scan) => !isTerminalScan(scan.status)) ?? null;
  const focusedScan = scans.find((scan) => scan.id === selectedScanId) ?? scans[0] ?? null;

  const loadScans = useCallback(async (projectId: number) => {
    const data = await getProjectScans(projectId);
    setScans(data);
    setSelectedScanId((current) => current ?? data[0]?.id ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProjects = async () => {
      try {
        setLoading(true);
        const data = await getProjects();
        if (cancelled) return;
        setProjects(data);
        setSelectedProjectId(data[0]?.id ?? null);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) setError('Unable to load projects.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadProjects();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (selectedProjectId === null) {
      setScans([]);
      setSelectedScanId(null);
      return;
    }
    let cancelled = false;
    syncedStages.current.clear();
    void loadScans(selectedProjectId).catch((loadError) => {
      console.error(loadError);
      if (!cancelled) setError('Unable to load this project’s scans.');
    });
    return () => { cancelled = true; };
  }, [selectedProjectId, loadScans]);

  const mergeProgress = useCallback((progress: ScanProgress) => {
    setScans((current) => current.map((scan) => (
      scan.id === progress.id ? { ...scan, ...progress } : scan
    )));
  }, []);
  const { progress: liveProgress, error: pollingError } = useScanProgress(
    activeScan?.id ?? null,
    activeScan?.status,
    mergeProgress,
  );

  useEffect(() => {
    if (!liveProgress || selectedProjectId === null) return;
    const shouldSyncFindings = ['ai_enrichment', 'result_persistence', 'completed', 'failed'].includes(
      liveProgress.stage ?? ''
    );
    const syncKey = `${liveProgress.id}:${liveProgress.stage}`;
    if (!shouldSyncFindings || syncedStages.current.has(syncKey)) return;
    syncedStages.current.add(syncKey);
    void getScan(liveProgress.id)
      .then((next) => setScans((current) => current.map((scan) => scan.id === next.id ? next : scan)))
      .catch((syncError) => console.error('Unable to refresh persisted findings', syncError));
  }, [liveProgress, selectedProjectId]);

  async function handleStartScan() {
    if (!selectedProjectId || !selectedProject?.repository_url) {
      setError('Select a project with a supported public repository before starting a scan.');
      return;
    }
    try {
      setStarting(true);
      setError(null);
      const scan = await startScan(selectedProjectId, { branch: branch.trim() || 'main' });
      setScans((current) => [scan, ...current.filter((item) => item.id !== scan.id)]);
      setSelectedScanId(scan.id);
      syncedStages.current.clear();
    } catch (startError) {
      console.error(startError);
      setError('Unable to start the scan. Confirm the repository and branch, then try again.');
    } finally {
      setStarting(false);
    }
  }

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const finding of focusedScan?.vulnerabilities ?? []) {
      const severity = finding.severity?.toLowerCase() ?? 'low';
      counts[severity] = (counts[severity] ?? 0) + (finding.count ?? 1);
    }
    return counts;
  }, [focusedScan]);

  const filteredFindings = useMemo(() => (focusedScan?.vulnerabilities ?? []).filter((finding) => {
    const matchesSeverity = filter === 'all' || finding.severity?.toLowerCase() === filter;
    const haystack = `${finding.vulnerability_type} ${finding.file_path} ${finding.description}`.toLowerCase();
    return matchesSeverity && haystack.includes(search.toLowerCase());
  }), [focusedScan, filter, search]);

  const stageIndex = focusedScan?.status === 'completed'
    ? STAGES.length - 1
    : STAGE_INDEX.get(focusedScan?.stage ?? '') ?? -1;
  const progressPercent = Math.round(Math.min(100, Math.max(0,
    focusedScan?.progress_percent ?? (focusedScan?.status === 'completed' ? 100 : 0)
  )));
  const stageMessage = focusedScan
    ? (STAGES.find(([key]) => key === focusedScan.stage)?.[2] ?? TERMINAL_COPY[focusedScan.status] ?? 'Waiting for worker state.')
    : 'Choose a project to view scan activity.';

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 text-slate-900">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">AI Sentinel / Security Scan</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Repository security analysis</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Static findings are saved before optional AI enrichment, so review starts as soon as the scanner finishes.</p>
          </div>
          <button
            type="button"
            onClick={handleStartScan}
            disabled={starting || Boolean(activeScan) || !selectedProject?.repository_url}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? <Loader2 size={16} className="animate-spin" /> : <Radar size={16} />}
            {starting ? 'Starting scan…' : activeScan ? 'Scan in progress' : 'Start scan'}
          </button>
        </header>

        {(error || pollingError) && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error ?? pollingError}</span>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 p-5 md:grid-cols-[1.25fr_0.75fr_auto] md:items-end">
            <label className="block text-sm font-medium text-slate-700">
              Project
              <span className="relative mt-1.5 block">
                <FolderGit2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select value={selectedProjectId ?? ''} onChange={(event) => setSelectedProjectId(event.target.value ? Number(event.target.value) : null)} className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                  <option value="">Select a project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Branch
              <span className="relative mt-1.5 block">
                <GitBranch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="main" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
              </span>
            </label>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="block font-medium uppercase tracking-wide text-slate-500">Repository</span>
              <span className="mt-1 block max-w-72 truncate font-mono">{selectedProject?.repository_url ?? 'Not configured'}</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Loading projects and scans…</div>
        ) : !focusedScan ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Radar className="mx-auto text-blue-600" size={28} />
            <h2 className="mt-3 font-semibold text-slate-900">No scan selected</h2>
            <p className="mt-1 text-sm text-slate-600">Start a scan to see live, persisted activity here.</p>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4 sm:flex sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-slate-950">{selectedProject?.name ?? `Project ${focusedScan.project_id}`}</h2>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(focusedScan.status)}`}>
                      {focusedScan.status === 'completed' ? <CheckCircle2 size={13} /> : focusedScan.status === 'failed' ? <XCircle size={13} /> : <CircleDashed size={13} />}
                      {focusedScan.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-slate-500">{focusedScan.repository_url} · {focusedScan.branch ?? 'main'} · Scan #{focusedScan.id}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 sm:mt-0 sm:text-right">
                  <span>Started</span><time className="font-medium text-slate-700">{formatDate(focusedScan.started_at)}</time>
                  <span>Elapsed</span><span className="font-medium text-slate-700">{formatDuration(focusedScan.duration_seconds)}</span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-end justify-between gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current stage</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">{STAGES.find(([key]) => key === focusedScan.stage)?.[1] ?? focusedScan.stage ?? 'Queued'}</h3>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-slate-900">{progressPercent}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${progressPercent}% complete`}>
                  <motion.div className="h-full rounded-full bg-blue-700" initial={false} animate={{ width: `${progressPercent}%` }} transition={{ duration: prefersReducedMotion ? 0 : 0.35 }} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <Metric icon={<Files size={16} />} label="Files discovered" value={focusedScan.files_discovered ?? 0} />
                  <Metric icon={<FileCode2 size={16} />} label="Files processed" value={focusedScan.files_processed ?? focusedScan.files_scanned ?? 0} />
                  <Metric icon={<ShieldAlert size={16} />} label="Findings" value={focusedScan.vulnerabilities_found ?? 0} danger={(focusedScan.vulnerabilities_found ?? 0) > 0} />
                  <Metric icon={<Bot size={16} />} label="AI analyses" value={`${focusedScan.ai_completed ?? 0}/${focusedScan.ai_total ?? 0}`} />
                  <Metric icon={<Clock3 size={16} />} label="Elapsed" value={formatDuration(focusedScan.duration_seconds)} />
                  <Metric icon={<ShieldAlert size={16} />} label="Risk tier (CVSS)" value={focusedScan.risk_score != null ? focusedScan.risk_score.toFixed(1) : '—'} />
                </div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.55fr]">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-950">Scan timeline</h3>
                <ol className="mt-5 space-y-0">
                  {STAGES.map(([key, label], index) => {
                    const current = focusedScan.stage === key && !isTerminalScan(focusedScan.status);
                    const done = focusedScan.status === 'completed' || index < stageIndex;
                    const failed = focusedScan.status === 'failed' && index === stageIndex;
                    return <li key={key} className="relative flex gap-3 pb-5 last:pb-0">
                      {index < STAGES.length - 1 && <span className={`absolute left-[9px] top-5 h-[calc(100%-8px)] w-px ${done ? 'bg-teal-300' : 'bg-slate-200'}`} />}
                      <span className={`z-10 grid h-5 w-5 place-items-center rounded-full border ${done ? 'border-teal-500 bg-teal-500 text-white' : failed ? 'border-red-500 bg-red-500 text-white' : current ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-400'}`}>
                        {done ? <Check size={12} /> : failed ? <XCircle size={12} /> : current ? <Loader2 size={12} className={prefersReducedMotion ? '' : 'animate-spin'} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                      </span>
                      <span className="min-w-0 pt-0.5"><span className={`block text-sm font-medium ${current || done || failed ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>{current && <span className="mt-0.5 block text-xs text-blue-700">In progress</span>}</span>
                    </li>;
                  })}
                </ol>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4"><h3 className="text-sm font-semibold text-slate-950">Current activity</h3></div>
                <div className="p-5">
                  <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <motion.span animate={isTerminalScan(focusedScan.status) || prefersReducedMotion ? undefined : { rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className={`mt-0.5 shrink-0 ${focusedScan.status === 'failed' ? 'text-red-600' : focusedScan.status === 'completed' ? 'text-teal-600' : 'text-blue-700'}`}>
                      {focusedScan.status === 'failed' ? <AlertTriangle size={18} /> : focusedScan.status === 'completed' ? <CheckCircle2 size={18} /> : <Loader2 size={18} />}
                    </motion.span>
                    <div className="min-w-0"><p className="text-sm font-medium text-slate-900">{stageMessage}{!isTerminalScan(focusedScan.status) && <span className="inline-flex w-4 overflow-hidden align-bottom"><span className={prefersReducedMotion ? '' : 'animate-pulse'}>…</span></span>}</p>
                      {focusedScan.current_file ? <p className="mt-2 truncate rounded bg-white px-2 py-1.5 font-mono text-xs text-slate-700">{focusedScan.current_file}</p> : <p className="mt-2 text-xs leading-5 text-slate-500">The dashboard only displays a file path while the scanner is processing that file.</p>}
                    </div>
                  </div>
                  {focusedScan.error_message && <div className={`mt-4 flex gap-2 rounded-lg border p-3 text-sm ${focusedScan.status === 'failed' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{focusedScan.error_message}</span></div>}
                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Timing label="Clone" seconds={focusedScan.clone_duration_seconds} /><Timing label="Discovery" seconds={focusedScan.discovery_duration_seconds} /><Timing label="Static analysis" seconds={focusedScan.static_analysis_duration_seconds} /><Timing label="AI enrichment" seconds={focusedScan.ai_duration_seconds} /><Timing label="Persistence" seconds={focusedScan.persistence_duration_seconds} /></div>
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 lg:flex lg:items-center lg:justify-between">
                <div><h3 className="text-base font-semibold text-slate-950">Findings</h3><p className="mt-1 text-sm text-slate-600">Static findings remain available if AI enrichment is unavailable.</p></div>
                <div className="mt-3 flex min-w-0 items-center gap-2 lg:mt-0"><Search size={16} className="shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search findings" className="h-9 min-w-0 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
              </div>
              <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
                <Filter size={15} className="mt-1 text-slate-400" />
                {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => <button key={level} type="button" onClick={() => setFilter(level)} className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize transition ${filter === level ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>{level}{level !== 'all' ? ` ${severityCounts[level] ?? 0}` : ` ${focusedScan.vulnerabilities_found ?? 0}`}</button>)}
              </div>
              <div className="divide-y divide-slate-200">
                {filteredFindings.map((finding) => <FindingCard key={finding.id} finding={finding} expanded={openFinding === finding.id} onToggle={() => setOpenFinding((current) => current === finding.id ? null : finding.id)} />)}
                {filteredFindings.length === 0 && <div className="p-6 text-sm text-slate-600">{focusedScan.status === 'completed' && (focusedScan.vulnerabilities_found ?? 0) === 0 ? 'No configured patterns matched. This does not certify the repository is secure.' : focusedScan.status === 'failed' ? 'No persisted findings are available because this scan did not complete.' : 'Findings will appear here as soon as static analysis has been persisted.'}</div>}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h3 className="text-sm font-semibold text-slate-950">Scan history</h3><p className="mt-1 text-xs text-slate-500">Select a prior scan to inspect its persisted state.</p></div><Database size={18} className="text-slate-400" /></div>
              <div className="divide-y divide-slate-200">{scans.map((scan) => <button key={scan.id} type="button" onClick={() => setSelectedScanId(scan.id)} className={`flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-slate-50 ${focusedScan.id === scan.id ? 'bg-blue-50/60' : ''}`}><span className={`h-2 w-2 rounded-full ${scan.status === 'completed' ? 'bg-teal-500' : scan.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">Scan #{scan.id} · {scan.branch ?? 'main'}</span><span className="block text-xs text-slate-500">{formatDate(scan.created_at)}</span></span><span className="hidden text-right text-xs text-slate-600 sm:block">{scan.files_processed ?? scan.files_scanned ?? 0} files · {scan.vulnerabilities_found ?? 0} findings</span><ChevronRight size={16} className="text-slate-400" /></button>)}</div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, danger = false }: { icon: ReactNode; label: string; value: string | number; danger?: boolean }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"><div className="flex items-center gap-1.5 text-xs text-slate-500">{icon}<span>{label}</span></div><div className={`mt-1 text-lg font-semibold tabular-nums ${danger ? 'text-red-700' : 'text-slate-900'}`}>{value}</div></div>;
}

function Timing({ label, seconds }: { label: string; seconds: number | null | undefined }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-slate-500">{label}</p><p className="mt-0.5 font-semibold text-slate-800">{formatDuration(seconds)}</p></div>;
}

function FindingCard({ finding, expanded, onToggle }: { finding: Vulnerability; expanded: boolean; onToggle: () => void }) {
  const aiAvailable = hasAiAnalysis(finding);
  return <motion.article initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="p-5"><div className="flex items-start gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${severityTone(finding.severity)}`}>{finding.severity ?? 'unknown'}</span><h4 className="font-semibold text-slate-900">{finding.vulnerability_type}</h4></div><p className="mt-2 font-mono text-xs text-slate-500">{finding.file_path ?? 'Unknown file'}{finding.line_number != null ? ` : line ${finding.line_number}` : ''}</p><p className="mt-3 text-sm leading-6 text-slate-700">{finding.description}</p><p className="mt-2 text-sm leading-6 text-slate-600"><span className="font-medium text-slate-700">Recommendation: </span>{finding.recommendation}</p></div><div className="shrink-0 text-right"><span className="block text-lg font-semibold text-slate-900">{finding.count ?? 1}</span><span className="text-[11px] uppercase tracking-wide text-slate-500">matches</span>{finding.cvss != null && <span className="mt-2 block text-xs font-medium text-slate-600">CVSS {finding.cvss.toFixed(1)}</span>}</div></div><div className="mt-4 border-t border-slate-100 pt-3">{aiAvailable ? <button type="button" onClick={onToggle} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"><Sparkles size={15} />AI security context {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button> : <p className="inline-flex items-center gap-2 text-xs text-slate-500"><Bot size={14} />Static finding only — AI context is not available.</p>}<AnimatePresence>{expanded && aiAvailable && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-3 grid gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-sm text-slate-700 sm:grid-cols-2"><AiField label="Explanation" value={finding.ai_explanation} /><AiField label="Impact" value={finding.ai_impact} /><AiField label="Attack scenario" value={finding.ai_attack_scenario} /><AiField label="Remediation" value={finding.ai_remediation} /><AiField label="Secure coding advice" value={finding.ai_secure_coding_advice} /></div></motion.div>}</AnimatePresence></div></motion.article>;
}

function AiField({ label, value }: { label: string; value: string | null }) {
  return value ? <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{label}</p><p className="mt-1 leading-5">{value}</p></div> : null;
}
