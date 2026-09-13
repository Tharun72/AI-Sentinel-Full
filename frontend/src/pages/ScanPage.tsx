import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  ShieldAlert,
  Bug,
  Filter,
  Radar,
  FolderGit2,
  Play,
  ChevronUp,
  Brain,
} from 'lucide-react';

import { getProjects } from '../services/projectService';
import {
  getProjectScans,
  startScan,
} from '../services/scanService';

import type { Project } from '../types/project';
import type { Scan } from '../types/scan';

import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import twMerge from '../lib/twMerge';

export function ScanPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );

  const [branch, setBranch] = useState('main');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [expandedAI, setExpandedAI] = useState<number | null>(null);
  // --------------------------------------------------
  // Load projects
  // --------------------------------------------------

  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);

        const data = await getProjects();

        setProjects(data);

        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load projects.');
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, []);

  // --------------------------------------------------
  // Load scans for selected project
  // --------------------------------------------------

useEffect(() => {
  if (selectedProjectId === null) {
    setScans([]);
    return;
  }

  const projectId = selectedProjectId;

  async function loadScans() {
    try {
      setError(null);

      const data = await getProjectScans(projectId);

      setScans(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load scans.');
    }
  }

  loadScans();
}, [selectedProjectId]);
  // --------------------------------------------------
  // Start scan
  // --------------------------------------------------

  async function handleStartScan() {
    if (!selectedProjectId) {
      setError('Please select a project first.');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const scan = await startScan(selectedProjectId, {
        branch,
      });

      // Add newest scan to the beginning
      setScans((previous) => [
        scan,
        ...previous.filter((item) => item.id !== scan.id),
      ]);

      setExpanded(scan.id);
    } catch (err) {
      console.error(err);
      setError('Failed to start security scan.');
    } finally {
      setScanning(false);
    }
  }

  // --------------------------------------------------
  // Current project
  // --------------------------------------------------

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  );

  // --------------------------------------------------
  // Latest scan
  // --------------------------------------------------

  const latestScan = scans.length > 0 ? scans[0] : null;

  // --------------------------------------------------
  // Filter scans
  // --------------------------------------------------

  const filteredScans = scans.filter((scan) => {
    const project = projects.find(
      (project) => project.id === scan.project_id
    );

    const text = `
      ${project?.name ?? ''}
      ${scan.status}
      ${scan.branch ?? ''}
      ${scan.repository_url ?? ''}
    `.toLowerCase();

    return text.includes(query.toLowerCase());
  });

  // --------------------------------------------------
  // Statistics
  // --------------------------------------------------

  const totalVulnerabilities = scans.reduce(
    (total, scan) => total + (scan.vulnerabilities_found ?? 0),
    0
  );

  const totalFiles = scans.reduce(
    (total, scan) => total + (scan.files_scanned ?? 0),
    0
  );

  const latestRiskScore = latestScan?.risk_score ?? 0;

  const securityScore = Math.max(
    0,
    Math.round(100 - latestRiskScore * 10)
  );

  return (
    <div className="space-y-6">

      {/* --------------------------------------------- */}
      {/* Header */}
      {/* --------------------------------------------- */}

      <PageHeader
        title="Security Scan"
        subtitle={
          selectedProject
            ? `Security analysis for ${selectedProject.name}`
            : 'Run and review repository security scans'
        }
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={handleStartScan}
            disabled={scanning || !selectedProjectId}
          >
            <Radar size={15} />

            {scanning ? 'Scanning...' : 'Start Scan'}
          </Button>
        }
      />

      {/* --------------------------------------------- */}
      {/* Error */}
      {/* --------------------------------------------- */}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* --------------------------------------------- */}
      {/* Project selector */}
      {/* --------------------------------------------- */}

      <Card>
        <CardHeader
          title="Scan Configuration"
          subtitle="Select a project and branch to scan"
        />

        <div className="grid gap-4 p-5 md:grid-cols-2">

          {/* Project */}

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Project
            </label>

            <div className="relative">
              <FolderGit2
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <select
                value={selectedProjectId ?? ''}
                onChange={(event) =>
                  setSelectedProjectId(
                    event.target.value
                      ? Number(event.target.value)
                      : null
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-10 text-sm text-white focus:border-brand-blue/50 focus:outline-none"
              >
                <option value="" className="bg-slate-900">
                  Select project
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                    className="bg-slate-900"
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Branch */}

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Branch
            </label>

            <input
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder="main"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white placeholder:text-slate-500 focus:border-brand-blue/50 focus:outline-none"
            />
          </div>

        </div>

        {selectedProject && (
          <div className="border-t border-white/[0.06] px-5 py-4">

            <div className="text-xs uppercase tracking-wider text-slate-500">
              Repository
            </div>

            <div className="mt-1 font-mono text-sm text-slate-300">
              {selectedProject.repository_url ?? 'No repository configured'}
            </div>

          </div>
        )}
      </Card>

      {/* --------------------------------------------- */}
      {/* Statistics */}
      {/* --------------------------------------------- */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Scans
            </span>

            <Radar size={17} className="text-brand-blue" />
          </div>

          <p className="mt-2 text-3xl font-bold text-white">
            {scans.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            project scans
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Files Scanned
            </span>

            <FolderGit2 size={17} className="text-brand-emerald" />
          </div>

          <p className="mt-2 text-3xl font-bold text-white">
            {totalFiles}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            total files
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Vulnerabilities
            </span>

            <Bug size={17} className="text-brand-red" />
          </div>

          <p className="mt-2 text-3xl font-bold text-white">
            {totalVulnerabilities}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            findings
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Security Score
            </span>

            <ShieldAlert size={17} className="text-brand-cyan" />
          </div>

          <p className="mt-2 text-3xl font-bold text-white">
            {securityScore}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            latest scan
          </p>
        </Card>

      </div>

      {/* --------------------------------------------- */}
      {/* Search */}
      {/* --------------------------------------------- */}

      <Card>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3">

          <Search size={15} className="text-slate-400" />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search scans..."
            className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />

        </div>
      </Card>

      {/* --------------------------------------------- */}
      {/* Scan results */}
      {/* --------------------------------------------- */}

      <Card>

        <CardHeader
          title="Security Scan History"
          subtitle="Real scan results stored in PostgreSQL"
        />

        {loading ? (
          <div className="p-6 text-sm text-slate-400">
            Loading projects...
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="p-8 text-center">

            <Radar
              size={32}
              className="mx-auto text-slate-600"
            />

            <p className="mt-3 text-sm font-medium text-slate-300">
              No scans found
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Start a scan to see real security results here.
            </p>

          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">

            <AnimatePresence>
              {filteredScans.map((scan) => {

                const project = projects.find(
                  (item) => item.id === scan.project_id
                );

                const isOpen = expanded === scan.id;

                const score = Math.max(
                  0,
                  100 - (scan.risk_score ?? 0) * 10
                );

                return (
                  <motion.div
                    key={scan.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >

                    {/* Scan row */}

                    <button
                      onClick={() =>
                        setExpanded(
                          isOpen ? null : scan.id
                        )
                      }
                      className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-white/[0.02]"
                    >

                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blue/10">
                        <Radar
                          size={18}
                          className="text-brand-blue"
                        />
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <span className="font-medium text-slate-100">
                            {project?.name ??
                              `Project ${scan.project_id}`}
                          </span>

                          <Badge
                            tone={
                              scan.status === 'completed'
                                ? 'emerald'
                                : scan.status === 'failed'
                                ? 'red'
                                : scan.status === 'running'
                                ? 'blue'
                                : 'amber'
                            }
                          >
                            {scan.status}
                          </Badge>

                        </div>

                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {scan.branch ?? 'main'}
                          {' · '}
                          {scan.repository_url}
                        </p>

                      </div>

                      <div className="hidden text-center sm:block">

                        <div className="text-lg font-bold text-white">
                          {scan.files_scanned ?? 0}
                        </div>

                        <div className="text-[10px] uppercase tracking-wider text-slate-500">
                          Files
                        </div>

                      </div>

                      <div className="hidden text-center sm:block">

                        <div
                          className={twMerge(
                            'text-lg font-bold',
                            (scan.vulnerabilities_found ?? 0) > 0
                              ? 'text-brand-red'
                              : 'text-brand-emerald'
                          )}
                        >
                          {scan.vulnerabilities_found ?? 0}
                        </div>

                        <div className="text-[10px] uppercase tracking-wider text-slate-500">
                          Vulns
                        </div>

                      </div>

                      <div className="hidden text-center sm:block">

                        <div className="text-lg font-bold text-white">
                          {score}
                        </div>

                        <div className="text-[10px] uppercase tracking-wider text-slate-500">
                          Score
                        </div>

                      </div>

                      <ChevronDown
                        size={18}
                        className={twMerge(
                          'shrink-0 text-slate-400 transition-transform',
                          isOpen && 'rotate-180'
                        )}
                      />

                    </button>

                    {/* Expanded details */}

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{
                            height: 0,
                            opacity: 0,
                          }}
                          animate={{
                            height: 'auto',
                            opacity: 1,
                          }}
                          exit={{
                            height: 0,
                            opacity: 0,
                          }}
                          className="overflow-hidden"
                        >

                          <div className="border-t border-white/[0.06] p-5">

                            <div className="grid gap-4 md:grid-cols-4">

                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                                  Scan ID
                                </div>

                                <div className="mt-1 font-mono text-sm text-slate-200">
                                  #{scan.id}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                                  Started
                                </div>

                                <div className="mt-1 text-sm text-slate-300">
                                  {scan.started_at
                                    ? new Date(
                                        scan.started_at
                                      ).toLocaleString()
                                    : '-'}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                                  Completed
                                </div>

                                <div className="mt-1 text-sm text-slate-300">
                                  {scan.completed_at
                                    ? new Date(
                                        scan.completed_at
                                      ).toLocaleString()
                                    : '-'}
                                </div>
                              </div>

                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                                  Risk Score
                                </div>

                                <div className="mt-1 text-sm font-bold text-white">
                                  {scan.risk_score ?? 0}
                                </div>
                              </div>

                            </div>

{/* Vulnerabilities */}

<div className="mt-6">

  <div className="mb-3 flex items-center gap-2">

    <ShieldAlert
      size={15}
      className="text-brand-red"
    />

    <h3 className="text-sm font-semibold text-white">
      Vulnerabilities
    </h3>

  </div>

  {!scan.vulnerabilities ||
  scan.vulnerabilities.length === 0 ? (

    <div className="rounded-xl border border-brand-emerald/20 bg-brand-emerald/5 p-4 text-sm text-brand-emerald">
      No vulnerabilities detected in this scan.
    </div>

  ) : (

    <div className="space-y-2">

      {scan.vulnerabilities.map((vulnerability) => (

        <div
          key={vulnerability.id}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
        >

          {/* ========================================= */}
          {/* MAIN VULNERABILITY INFORMATION */}
          {/* ========================================= */}

          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0 flex-1">

              {/* Vulnerability title */}

              <div className="flex flex-wrap items-center gap-2">

                <Badge
                  tone={
                    vulnerability.severity === "critical"
                      ? "red"
                      : vulnerability.severity === "high"
                      ? "amber"
                      : vulnerability.severity === "medium"
                      ? "blue"
                      : "slate"
                  }
                >
                  {vulnerability.severity?.toUpperCase() ?? "UNKNOWN"}
                </Badge>

                <span className="font-medium text-slate-100">
                  {vulnerability.vulnerability_type}
                </span>

              </div>

              {/* File + line */}

              <p className="mt-2 font-mono text-xs text-slate-400">
                {vulnerability.file_path ?? "Unknown file"}

                {vulnerability.line_number != null &&
                  ` : Line ${vulnerability.line_number}`}
              </p>

              {/* CVSS */}

              {vulnerability.cvss != null && (

                <div className="mt-3">

                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    CVSS
                  </span>

                  <span className="ml-2 text-sm font-bold text-white">
                    {vulnerability.cvss.toFixed(1)}
                  </span>

                </div>

              )}

              {/* Description */}

              {vulnerability.description && (

                <div className="mt-4">

                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Description
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {vulnerability.description}
                  </p>

                </div>

              )}

              {/* Recommendation */}

              {vulnerability.recommendation && (

                <div className="mt-4">

                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Recommendation
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {vulnerability.recommendation}
                  </p>

                </div>

              )}

            </div>

            {/* Count */}

            <div className="shrink-0 text-right">

              <div className="text-lg font-bold text-brand-red">
                {vulnerability.count ?? 1}
              </div>

              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Count
              </div>

            </div>

          </div>

          {/* ========================================= */}
          {/* AI SECURITY ANALYSIS */}
          {/* ========================================= */}

          {(
            vulnerability.ai_explanation ||
            vulnerability.ai_impact ||
            vulnerability.ai_attack_scenario ||
            vulnerability.ai_remediation ||
            vulnerability.ai_secure_coding_advice
          ) && (

            <div className="mt-5 border-t border-white/[0.06] pt-4">

              {/* AI Toggle */}

              <button
                type="button"
                onClick={() =>
                  setExpandedAI(
                    expandedAI === vulnerability.id
                      ? null
                      : vulnerability.id
                  )
                }
                className="flex w-full items-center justify-between rounded-lg border border-brand-cyan/20 bg-brand-cyan/5 px-4 py-3 text-left transition hover:bg-brand-cyan/10"
              >

                <div className="flex items-center gap-2">

                  <Brain
                    size={16}
                    className="text-brand-cyan"
                  />

                  <span className="text-sm font-semibold text-brand-cyan">
                    AI Security Analysis
                  </span>

                </div>

                {expandedAI === vulnerability.id ? (

                  <ChevronUp
                    size={16}
                    className="text-slate-400"
                  />

                ) : (

                  <ChevronDown
                    size={16}
                    className="text-slate-400"
                  />

                )}

              </button>

              {/* AI Content */}

              {expandedAI === vulnerability.id && (

                <div className="mt-3 space-y-4 rounded-lg border border-white/[0.06] bg-black/10 p-4">

                  {/* Explanation */}

                  {vulnerability.ai_explanation && (

                    <div>

                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        Explanation
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {vulnerability.ai_explanation}
                      </p>

                    </div>

                  )}

                  {/* Impact */}

                  {vulnerability.ai_impact && (

                    <div>

                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        Impact
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {vulnerability.ai_impact}
                      </p>

                    </div>

                  )}

                  {/* Attack Scenario */}

                  {vulnerability.ai_attack_scenario && (

                    <div>

                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        Attack Scenario
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {vulnerability.ai_attack_scenario}
                      </p>

                    </div>

                  )}

                  {/* AI Remediation */}

                  {vulnerability.ai_remediation && (

                    <div>

                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        AI Remediation
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {vulnerability.ai_remediation}
                      </p>

                    </div>

                  )}

                  {/* Secure Coding Advice */}

                  {vulnerability.ai_secure_coding_advice && (

                    <div>

                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        Secure Coding Advice
                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-300">
                        {vulnerability.ai_secure_coding_advice}
                      </p>

                    </div>

                  )}

                </div>

              )}

            </div>

          )}

        </div>

      ))}

    </div>

  )}

</div>

                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

            </motion.div>
          );
        })}
      </AnimatePresence>

    </div>
  )}

</Card>

</div>
);
}