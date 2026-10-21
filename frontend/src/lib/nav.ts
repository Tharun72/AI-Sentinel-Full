import {
  ShieldCheck,
  Upload,
  Code2,
  Radar,
  Sparkles,
  Wrench,
  Blocks,
  FileBarChart,
  History,
  Users,
  KeyRound,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'upload'
  | 'editor'
  | 'scan'
  | 'ai-review'
  | 'fixes'
  | 'blockchain'
  | 'reports'
  | 'history'
  | 'team'
  | 'api-keys'
  | 'settings';

export const NAV_ITEMS: { id: PageId; label: string; icon: typeof ShieldCheck }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload Code', icon: Upload },
  { id: 'editor', label: 'Code Editor', icon: Code2 },
  { id: 'scan', label: 'Security Scan', icon: Radar },
  { id: 'ai-review', label: 'AI Review', icon: Sparkles },
  { id: 'fixes', label: 'Secure Fixes', icon: Wrench },
  { id: 'blockchain', label: 'Blockchain Verification', icon: Blocks },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'history', label: 'Scan History', icon: History },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const SEVERITY = {
  critical: { label: 'Critical', color: '#EF4444', bg: 'bg-brand-red/10', text: 'text-brand-red', border: 'border-brand-red/30' },
  high: { label: 'High', color: '#F59E0B', bg: 'bg-brand-amber/10', text: 'text-brand-amber', border: 'border-brand-amber/30' },
  medium: { label: 'Medium', color: '#3B82F6', bg: 'bg-brand-blue/10', text: 'text-brand-blue', border: 'border-brand-blue/30' },
  low: { label: 'Low', color: '#06B6D4', bg: 'bg-brand-cyan/10', text: 'text-brand-cyan', border: 'border-brand-cyan/30' },
} as const;

export type Severity = keyof typeof SEVERITY;
