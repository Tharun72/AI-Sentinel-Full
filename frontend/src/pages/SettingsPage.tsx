import { useState } from 'react';
import { Moon, Bell, KeyRound, User, Shield, Check } from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import twMerge from '../lib/twMerge';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: Moon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api', label: 'API Keys', icon: KeyRound },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

function Toggle({ on, onChange }: { on: boolean; onChange?: () => void }) {
  return (
    <button onClick={onChange} className={twMerge('relative h-5 w-9 rounded-full transition-colors', on ? 'bg-brand-blue' : 'bg-white/10')}>
      <span className={twMerge('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-4' : 'left-0.5')} />
    </button>
  );
}

export function SettingsPage() {
  const [section, setSection] = useState<SectionId>('appearance');
  const [theme, setTheme] = useState<'dark' | 'midnight' | 'system'>('dark');
  const [notif, setNotif] = useState({ critical: true, weekly: true, fixes: true, team: false, product: true });
  const [twoFA, setTwoFA] = useState(true);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your workspace and preferences" actions={<Button variant="primary" size="md" onClick={save}>{saved ? <><Check size={15} /> Saved</> : 'Save Changes'}</Button>} />

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-3 p-3 h-fit">
          <nav className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={twMerge(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    section === s.id ? 'bg-brand-blue/15 text-white border border-brand-blue/30' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  <Icon size={16} /> {s.label}
                </button>
              );
            })}
          </nav>
        </Card>

        <div className="col-span-12 lg:col-span-9 space-y-4">
          {section === 'appearance' && (
            <Card>
              <CardHeader title="Theme" subtitle="Choose how Sentinel looks for you" />
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'dark', label: 'Dark', bg: 'bg-[#070B14]' },
                  { id: 'midnight', label: 'Midnight', bg: 'bg-[#0B1120]' },
                  { id: 'system', label: 'System', bg: 'bg-gradient-to-br from-[#070B14] to-[#1E2A44]' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={twMerge('rounded-xl border-2 p-3 transition-colors', theme === t.id ? 'border-brand-blue' : 'border-white/[0.06] hover:border-white/15')}
                  >
                    <div className={twMerge('h-16 w-full rounded-lg', t.bg)} />
                    <p className="mt-2 text-sm font-medium text-slate-200">{t.label}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-slate-200">Reduce motion</p><p className="text-xs text-slate-400">Minimize animations across the app</p></div>
                  <Toggle on={false} />
                </div>
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card>
              <CardHeader title="Notifications" subtitle="Choose what you want to be notified about" />
              <div className="space-y-2">
                {[
                  { key: 'critical', label: 'Critical vulnerabilities', desc: 'Immediate alerts for critical-severity findings' },
                  { key: 'weekly', label: 'Weekly digest', desc: 'Summary of your security posture every Monday' },
                  { key: 'fixes', label: 'AI fix suggestions', desc: 'When a new AI fix is ready for review' },
                  { key: 'team', label: 'Team activity', desc: 'Member joins, role changes, and invites' },
                  { key: 'product', label: 'Product updates', desc: 'New features and platform announcements' },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <div><p className="text-sm font-medium text-slate-200">{n.label}</p><p className="text-xs text-slate-400">{n.desc}</p></div>
                    <Toggle on={notif[n.key as keyof typeof notif]} onChange={() => setNotif((p) => ({ ...p, [n.key]: !p[n.key as keyof typeof notif] }))} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === 'profile' && (
            <Card>
              <CardHeader title="Profile" subtitle="Your personal information" />
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan text-xl font-semibold text-white">MO</div>
                <Button variant="secondary" size="md">Change avatar</Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value="Maya Okafor" />
                <Field label="Email" value="maya.okafor@sentinel.io" />
                <Field label="Role" value="Owner" />
                <Field label="Timezone" value="UTC+01:00 Lagos" />
              </div>
            </Card>
          )}

          {section === 'security' && (
            <Card>
              <CardHeader title="Security Preferences" subtitle="Protect your account" />
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div><p className="text-sm font-medium text-slate-200">Two-factor authentication</p><p className="text-xs text-slate-400">Require a second factor on every sign-in</p></div>
                  <div className="flex items-center gap-3">
                    <Badge tone={twoFA ? 'emerald' : 'amber'}>{twoFA ? 'Enabled' : 'Disabled'}</Badge>
                    <Toggle on={twoFA} onChange={() => setTwoFA((v) => !v)} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div><p className="text-sm font-medium text-slate-200">Session timeout</p><p className="text-xs text-slate-400">Automatically sign out after inactivity</p></div>
                  <select className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-sm text-slate-200 focus:outline-none">
                    <option>30 minutes</option><option>1 hour</option><option>4 hours</option><option>Never</option>
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div><p className="text-sm font-medium text-slate-200">IP allowlist</p><p className="text-xs text-slate-400">Restrict API access to known IP ranges</p></div>
                  <Button variant="secondary" size="sm">Configure</Button>
                </div>
              </div>
            </Card>
          )}

          {section === 'api' && (
            <Card>
              <CardHeader title="API Keys" subtitle="Programmatic access tokens" action={<Button variant="secondary" size="sm">Manage</Button>} />
              <p className="text-sm text-slate-400">You have 3 active API keys. Manage them in the dedicated API Keys section.</p>
              <div className="mt-3 rounded-xl border border-brand-amber/20 bg-brand-amber/5 p-3.5">
                <p className="text-xs text-slate-300">Tip: rotate keys every 90 days and scope each key to the minimum required permissions.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <input defaultValue={value} className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white focus:border-brand-blue/40 focus:outline-none" />
    </label>
  );
}
