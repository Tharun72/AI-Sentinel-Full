import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getProjects } from '../services/projectService';
import { getProjectScans } from '../services/scanService';
import type { Project } from '../types/project';
import type { Scan } from '../types/scan';
import { Activity, Bug, CheckCircle2, FolderGit2, ShieldCheck, Sparkles, Wrench, FileBarChart, Blocks } from 'lucide-react';
import { ACTIVITIES, AI_SUGGESTIONS, } from '../lib/data';
import { PageHeader } from '../components/shared/PageHeader';
import { KpiCard } from '../components/dashboard/KpiCard';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Progress } from '../components/ui/Progress';
import { ScoreRing } from '../components/ui/ScoreRing';
import { AIFixAccuracyChart, ScanFrequencyChart, SeverityPieChart, VulnerabilityTrendChart } from '../components/charts/Charts';

const ACTIVITY_META = {
  'scan-started': { icon: Activity, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
  'ai-completed': { icon: Sparkles, color: 'text-brand-cyan', bg: 'bg-brand-cyan/10' },
  'blockchain-verified': { icon: Blocks, color: 'text-brand-emerald', bg: 'bg-brand-emerald/10' },
  'report-generated': { icon: FileBarChart, color: 'text-brand-amber', bg: 'bg-brand-amber/10' },
} as const;

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const projectData = await getProjects();

        setProjects(projectData);

        const scanResults = await Promise.all(
          projectData.map((project) =>
            getProjectScans(project.id)
          )
        );

        const allScans = scanResults
          .flat()
          .sort(
            (a, b) =>
              new Date(b.created_at ?? 0).getTime() -
              new Date(a.created_at ?? 0).getTime()
          );

        setScans(allScans);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Overview"
        subtitle="Real-time posture across all monitored repositories"
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onNavigate('scan')}
            >
              <Activity size={15} />
              New Scan
            </Button>

            <Button
              variant="primary"
              size="md"
            >
              <ShieldCheck size={15} />
              Generate Report
            </Button>
          </>
        }
      />

<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <KpiCard
    label="Total Projects"
    value={projects.length.toString()}
    delta=""
    trend="up"
    accent="blue"
    icon={<FolderGit2 size={18} />}
  />

  <KpiCard
    label="Vulnerabilities Detected"
    value={scans
      .reduce(
        (total, scan) =>
          total + (scan.vulnerabilities_found ?? 0),
        0
      )
      .toString()}
    delta=""
    trend="down"
    accent="red"
    icon={<Bug size={18} />}
  />

  <KpiCard
    label="Files Scanned"
    value={scans
      .reduce(
        (total, scan) =>
          total + (scan.files_scanned ?? 0),
        0
      )
      .toString()}
    delta=""
    trend="up"
    accent="emerald"
    icon={<CheckCircle2 size={18} />}
  />

  <KpiCard
    label="Security Score"
    value={(() => {
      if (scans.length === 0) {
        return "100";
      }

      // Keep only the latest scan for each project
      const latestScans = new Map<number, Scan>();

      for (const scan of scans) {
        const existing = latestScans.get(scan.project_id);

        if (
          !existing ||
          new Date(scan.created_at ?? 0).getTime() >
            new Date(existing.created_at ?? 0).getTime()
        ) {
          latestScans.set(scan.project_id, scan);
        }
      }

      // Convert risk score (0-10) into security score (0-100)
      const totalScore = Array.from(latestScans.values()).reduce(
        (total, scan) =>
          total + Math.max(
            0,
            Math.round(100 - (scan.risk_score ?? 0) * 10)
          ),
        0
      );

      return Math.round(
        totalScore / latestScans.size
      ).toString();
    })()}
    delta=""
    trend="up"
    accent="cyan"
    icon={<ShieldCheck size={18} />}
  />
</div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Vulnerability Trend" subtitle="Findings by severity over the last 7 days" action={<Badge tone="slate">7d</Badge>} />
          <VulnerabilityTrendChart />
        </Card>
        <Card>
          <CardHeader title="Severity Distribution" subtitle="Active findings across projects" />
          <SeverityPieChart />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Scan Frequency" subtitle="Scans per day this week" />
          <ScanFrequencyChart />
        </Card>
        <Card>
          <CardHeader title="AI Fix Accuracy" subtitle="Accepted vs rejected suggestions" />
          <AIFixAccuracyChart />
        </Card>
        <Card>
          <CardHeader title="Posture Score" subtitle="Weighted by severity & fix rate" />
          <div className="flex flex-col items-center justify-center gap-4 py-2">
            <ScoreRing score={84} size={140} label="Score" />
            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-bold text-brand-emerald">91%</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Fix Rate</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-bold text-brand-amber">14</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Open Critical</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent Security Scans" subtitle="Latest scans across all projects" action={<Button variant="ghost" size="sm">View all</Button>} />
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2 font-medium">Project</th>
                  <th className="px-5 py-2 font-medium">Language</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Vulns</th>
                  <th className="px-5 py-2 font-medium">Score</th>
                  <th className="px-5 py-2 font-medium">Last Scan</th>
                </tr>
              </thead>
              <tbody>
{scans.slice(0, 6).map((scan) => {
  const project = projects.find(
    (p) => p.id === scan.project_id
  );

  return (
    <tr
      key={scan.id}
      className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <FolderGit2
            size={14}
            className="text-slate-500"
          />

          <span className="font-medium text-slate-100">
            {project?.name ?? `Project ${scan.project_id}`}
          </span>
        </div>
      </td>

      <td className="px-5 py-3 text-slate-400">
        Git
      </td>

      <td className="px-5 py-3">
        <Badge
          tone={
            scan.status === "completed"
              ? "emerald"
              : scan.status === "failed"
              ? "red"
              : scan.status === "running"
              ? "blue"
              : "amber"
          }
        >
          {scan.status}
        </Badge>
      </td>

      <td className="px-5 py-3">
        <span
          className={
            (scan.vulnerabilities_found ?? 0) > 0
              ? "text-brand-red"
              : "text-brand-emerald"
          }
        >
          {scan.vulnerabilities_found ?? 0}
        </span>
      </td>

      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <Progress
            value={
              Math.max(
                0,
                100 - (scan.risk_score ?? 0) * 10
              )
            }
            tone={
              (scan.risk_score ?? 0) <= 3
                ? "emerald"
                : (scan.risk_score ?? 0) <= 6
                ? "blue"
                : "amber"
            }
            className="w-16"
          />

          <span className="text-xs text-slate-400">
            {Math.max(
              0,
              100 - (scan.risk_score ?? 0) * 10
            )}
          </span>
        </div>
      </td>

      <td className="px-5 py-3 text-slate-400">
        {scan.created_at
          ? new Date(scan.created_at).toLocaleString()
          : "-"}
      </td>
    </tr>
  );
})}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent AI Suggestions" subtitle="Top recommendations" action={<Sparkles size={15} className="text-brand-cyan" />} />
          <div className="space-y-3">
            {AI_SUGGESTIONS.slice(0, 4).map((s) => (
              <div key={s.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge tone={s.severity}>{s.severity}</Badge>
                      <span className="text-[10px] font-mono text-slate-500">{s.cwe}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-100">{s.vulnerability}</p>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{s.recommendation}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-emerald" style={{ width: `${s.confidence}%` }} />
                      </div>
                      <span className="font-medium text-brand-emerald">{s.confidence}%</span>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary"><Wrench size={13} /> Fix</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Activity Timeline" subtitle="Recent platform events" />
        <div className="relative space-y-5 pl-2">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.08]" />
          {ACTIVITIES.map((a, i) => {
            const meta = ACTIVITY_META[a.type];
            const Icon = meta.icon;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative flex items-start gap-4"
              >
                <div className={`relative z-10 grid h-4 w-4 shrink-0 place-items-center rounded-full ${meta.bg} ring-4 ring-bg-base`}>
                  <Icon size={10} className={meta.color} />
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100">{a.message}</p>
                    <span className="text-xs text-slate-500">{a.time}</span>
                  </div>
                  <p className="text-xs text-slate-400">{a.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
