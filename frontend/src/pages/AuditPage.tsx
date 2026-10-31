import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Link2, RefreshCw, Search, ShieldCheck } from 'lucide-react';

import { getAuditEvents, verifyAuditHistory, type AuditEvent, type AuditEventPage, type AuditVerification } from '../services/auditService';
import { getProjects } from '../services/projectService';
import type { Project } from '../types/project';
import { PageHeader } from '../components/shared/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';

const PAGE_SIZE = 25;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));
}

function displayEvent(eventType: string) {
  return eventType.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metadataSummary(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata);
  if (!entries.length) return 'No additional metadata.';
  return entries.map(([key, value]) => `${key.replace(/_/g, ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ');
}

export function AuditPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState<AuditEventPage | null>(null);
  const [verification, setVerification] = useState<AuditVerification | null>(null);
  const [projectId, setProjectId] = useState<number | undefined>();
  const [outcome, setOutcome] = useState<'' | AuditEvent['outcome']>('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [availableProjects, auditEvents, auditVerification] = await Promise.all([
        getProjects(),
        getAuditEvents({ projectId, outcome: outcome || undefined, limit: PAGE_SIZE, offset }),
        verifyAuditHistory(projectId),
      ]);
      setProjects(availableProjects);
      setPage(auditEvents);
      setVerification(auditVerification);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load audit history.');
    } finally {
      setLoading(false);
    }
  }, [offset, outcome, projectId]);

  useEffect(() => { void load(); }, [load]);

  async function reverify() {
    setVerifying(true);
    setError(null);
    try {
      setVerification(await verifyAuditHistory(projectId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify audit history.');
    } finally {
      setVerifying(false);
    }
  }

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return page?.events ?? [];
    return (page?.events ?? []).filter((event) => [event.event_type, event.resource_type, event.resource_id, metadataSummary(event.metadata)].join(' ').toLowerCase().includes(normalized));
  }, [page, query]);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasNext = page ? offset + page.limit < page.total : false;

  return <div className="mx-auto max-w-6xl space-y-6">
    <PageHeader title="Audit history & verification" subtitle="Owner-scoped security events, with locally verifiable hash-chain integrity." />
    {error && <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
    <Card className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${verification?.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><ShieldCheck size={19} /></div><div><h2 className="text-sm font-semibold text-slate-950">{verification?.verified ? 'Visible audit chains verified' : loading ? 'Loading verification status…' : 'Verification needs attention'}</h2><p className="mt-1 text-sm text-slate-600">{verification ? `${verification.verified_events} event${verification.verified_events === 1 ? '' : 's'} across ${verification.scopes} scope${verification.scopes === 1 ? '' : 's'} checked.` : 'Checks event sequence, prior hashes, event hashes, and each chain head.'}</p>{verification && !verification.verified && <p className="mt-2 text-xs text-red-700">{verification.errors[0] ?? 'An integrity mismatch was reported.'}</p>}</div></div><Button variant="secondary" size="sm" onClick={() => void reverify()} disabled={verifying}><RefreshCw size={15} className={verifying ? 'animate-spin' : ''} />{verifying ? 'Verifying…' : 'Verify now'}</Button></div><div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600"><Link2 size={14} className="mr-1 inline text-slate-500" />Hash chaining is tamper-evident within this database; it is not blockchain-backed or independently immutable. A database administrator could still rewrite every record and recompute the chain.</div></Card>
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]"><label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3"><Search size={15} className="text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search visible events" /></label><select value={projectId ?? ''} onChange={(event) => { setProjectId(event.target.value ? Number(event.target.value) : undefined); setOffset(0); }} className="rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select value={outcome} onChange={(event) => { setOutcome(event.target.value as '' | AuditEvent['outcome']); setOffset(0); }} className="rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"><option value="">All outcomes</option><option value="success">Success</option><option value="failure">Failure</option><option value="pending">Pending</option></select></div></Card>
    <Card><CardHeader title="Security events" subtitle={page ? `${page.total} event${page.total === 1 ? '' : 's'} available to this account.` : 'Loading persisted audit events.'} action={<CheckCircle2 size={16} className="text-slate-500" />} />
      {loading ? <div className="p-6 text-sm text-slate-600">Loading audit history…</div> : filteredEvents.length === 0 ? <div className="p-6 text-sm text-slate-600">{page?.events.length ? 'No loaded event matches the search.' : 'No audit events match the current filters.'}</div> : <div className="divide-y divide-slate-100">{filteredEvents.map((event) => <AuditRow key={event.id} event={event} projects={projects} />)}</div>}
      {page && page.total > PAGE_SIZE && <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3"><span className="text-xs text-slate-500">Page {currentPage} of {Math.ceil(page.total / PAGE_SIZE)}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft size={15} />Previous</Button><Button size="sm" variant="secondary" disabled={!hasNext} onClick={() => setOffset(offset + PAGE_SIZE)}>Next<ChevronRight size={15} /></Button></div></div>}
    </Card>
  </div>;
}

function AuditRow({ event, projects }: { event: AuditEvent; projects: Project[] }) {
  const project = event.project_id ? projects.find((item) => item.id === event.project_id) : undefined;
  return <article className="px-5 py-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">{displayEvent(event.event_type)}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${event.outcome === 'failure' ? 'bg-red-50 text-red-700' : event.outcome === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{event.outcome}</span></div><p className="mt-1 text-xs text-slate-500">{project?.name ?? (event.project_id ? `Project #${event.project_id}` : 'Account event')} · {event.resource_type}{event.resource_id ? ` #${event.resource_id}` : ''}</p><p className="mt-2 break-words text-xs leading-5 text-slate-600">{metadataSummary(event.metadata)}</p></div><div className="shrink-0 text-left sm:text-right"><time className="block text-xs text-slate-500">{formatDate(event.created_at)}</time><span className="mt-1 block font-mono text-[10px] text-slate-400">#{event.sequence} · {event.event_hash.slice(0, 12)}…</span></div></div></article>;
}
