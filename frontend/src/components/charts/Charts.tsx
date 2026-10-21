import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface TrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface SeverityPoint {
  name: string;
  value: number;
  color: string;
}

export interface FrequencyPoint {
  day: string;
  scans: number;
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  color: '#334155',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
} as const;
const axisStyle = { fontSize: 11, fill: '#64748b' } as const;

function EmptyChart({ label }: { label: string }) {
  return <div className="grid h-[220px] place-items-center text-center text-sm text-slate-500">{label}</div>;
}

export function VulnerabilityTrendChart({ data }: { data: TrendPoint[] }) {
  if (!data.some((point) => point.critical + point.high + point.medium + point.low > 0)) {
    return <EmptyChart label="No persisted findings in the selected time period." />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="critical" name="Critical" stackId="1" stroke="#dc2626" fill="#fecaca" />
        <Area type="monotone" dataKey="high" name="High" stackId="1" stroke="#d97706" fill="#fde68a" />
        <Area type="monotone" dataKey="medium" name="Medium" stackId="1" stroke="#2563eb" fill="#bfdbfe" />
        <Area type="monotone" dataKey="low" name="Low" stackId="1" stroke="#0891b2" fill="#a5f3fc" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SeverityPieChart({ data }: { data: SeverityPoint[] }) {
  if (!data.some((point) => point.value > 0)) return <EmptyChart label="No persisted findings yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="none">
          {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" iconType="circle" formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ScanFrequencyChart({ data }: { data: FrequencyPoint[] }) {
  if (!data.some((point) => point.scans > 0)) return <EmptyChart label="No scans have been recorded in the last seven days." />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="scans" name="Scans" fill="#2563eb" radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
