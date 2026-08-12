import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AI_FIX_ACCURACY, SCAN_FREQUENCY, SEVERITY_DIST, VULN_TREND } from '../../lib/data';

const tooltipStyle = {
  backgroundColor: 'rgba(11,17,32,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  fontSize: '12px',
  padding: '8px 12px',
  backdropFilter: 'blur(8px)',
} as const;

const axisStyle = { fontSize: 11, fill: '#64748b' } as const;

export function VulnerabilityTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={VULN_TREND} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="g-crit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-high" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-med" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-low" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} fill="url(#g-crit)" />
        <Area type="monotone" dataKey="high" stroke="#F59E0B" strokeWidth={2} fill="url(#g-high)" />
        <Area type="monotone" dataKey="medium" stroke="#3B82F6" strokeWidth={2} fill="url(#g-med)" />
        <Area type="monotone" dataKey="low" stroke="#06B6D4" strokeWidth={2} fill="url(#g-low)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SeverityPieChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={SEVERITY_DIST}
          dataKey="value"
          nameKey="name"
          innerRadius={62}
          outerRadius={96}
          paddingAngle={3}
          stroke="none"
        >
          {SEVERITY_DIST.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(v) => <span className="text-xs text-slate-400">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScanFrequencyChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={SCAN_FREQUENCY} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="bar-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="scans" fill="url(#bar-blue)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AIFixAccuracyChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={AI_FIX_ACCURACY} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="week" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="accepted" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
        <Line type="monotone" dataKey="rejected" stroke="#EF4444" strokeWidth={2} dot={{ r: 3, fill: '#EF4444' }} strokeDasharray="4 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}
