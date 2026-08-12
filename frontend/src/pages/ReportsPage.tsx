import { FileDown, FileJson, ShieldCheck, AlertTriangle, TrendingUp, FileBarChart, Globe } from 'lucide-react';
import { SEVERITY_DIST, VULN_TREND } from '../lib/data';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ScoreRing } from '../components/ui/ScoreRing';
import { SeverityPieChart, VulnerabilityTrendChart } from '../components/charts/Charts';

export function ReportsPage() {
  const total = SEVERITY_DIST.reduce((a, s) => a + s.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Export, share, and review your security posture"
        actions={
          <>
            <Button variant="secondary" size="md"><FileJson size={15} /> Export JSON</Button>
            <Button variant="primary" size="md"><FileDown size={15} /> Export PDF</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Executive Dashboard" subtitle="Weekly security posture — Q3 W2" action={<Badge tone="emerald">Healthy</Badge>} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/[0.02] p-4">
              <ScoreRing score={84} size={120} label="Posture" />
            </div>
            <div className="space-y-3 sm:col-span-2">
              <Stat icon={<ShieldCheck size={15} className="text-brand-emerald" />} label="Projects passing" value="19 / 24" tone="emerald" />
              <Stat icon={<AlertTriangle size={15} className="text-brand-red" />} label="Open criticals" value="8" tone="red" />
              <Stat icon={<TrendingUp size={15} className="text-brand-blue" />} label="MTTR (mean time to remediate)" value="3.4 days" tone="blue" />
              <Stat icon={<FileBarChart size={15} className="text-brand-amber" />} label="Scans this week" value="109" tone="amber" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Risk Summary" subtitle="By severity" />
          <div className="space-y-2.5">
            {SEVERITY_DIST.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-sm text-slate-300">{s.name}</span>
                <span className="text-sm font-semibold text-white">{s.value}</span>
                <span className="w-12 text-right text-xs text-slate-500">{Math.round((s.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400"><Globe size={13} /> Coverage</div>
            <p className="mt-1 text-sm text-slate-200">24 repositories · 6 languages · 1,840 active rules</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Vulnerability Trend" subtitle="Last 7 days" />
          <VulnerabilityTrendChart />
        </Card>
        <Card>
          <CardHeader title="Severity Distribution" subtitle="All active findings" />
          <SeverityPieChart />
        </Card>
      </div>

      <Card>
        <CardHeader title="Export Options" subtitle="Choose a format and scope" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Executive PDF', desc: 'Board-ready summary', icon: FileDown },
            { label: 'Full JSON', desc: 'Machine-readable findings', icon: FileJson },
            { label: 'SARIF', desc: 'IDE / CI integration', icon: FileBarChart },
            { label: 'CSV', desc: 'Spreadsheet export', icon: FileJson },
          ].map((o) => {
            const Icon = o.icon;
            return (
              <button key={o.label} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue"><Icon size={18} /></div>
                <p className="mt-3 text-sm font-medium text-slate-100">{o.label}</p>
                <p className="text-xs text-slate-500">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'emerald' | 'red' | 'blue' | 'amber' }) {
  const tones = { emerald: 'text-brand-emerald', red: 'text-brand-red', blue: 'text-brand-blue', amber: 'text-brand-amber' };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04]">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm font-semibold ${tones[tone]}`}>{value}</p>
      </div>
    </div>
  );
}
