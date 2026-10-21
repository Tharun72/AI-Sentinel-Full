import { type LucideIcon, AlertCircle, Database, PlugZap } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Card } from '../ui/Card';

export function CapabilityNotice({
  title,
  description,
  icon: Icon = PlugZap,
  dependency,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  dependency: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={title} subtitle={description} />
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon size={17} className="text-brand-blue" />
            Capability not configured
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>This workspace does not expose a backend endpoint for this feature. No sample records are shown as live data.</p>
          </div>
          <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <Database size={18} className="mt-0.5 shrink-0 text-slate-500" />
            <p><span className="font-semibold">Required integration:</span> {dependency}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
