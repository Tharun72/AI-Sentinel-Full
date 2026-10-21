import { FormEvent, useState } from 'react';
import { AlertCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { login } from '../services/authService';

interface LoginPageProps { onLogin: () => void; }

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); onLogin(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Invalid email or password.'); } finally { setLoading(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9"><div className="mb-8"><div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue text-white shadow-glow-blue"><ShieldCheck size={22} /></div><h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">Welcome to AI Sentinel</h1><p className="mt-2 text-sm leading-6 text-slate-600">Sign in to manage your repository security scans.</p></div><form onSubmit={handleSubmit} className="space-y-5"><label className="block"><span className="text-sm font-medium text-slate-700">Email</span><input className="app-input mt-1.5" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" /></label><label className="block"><span className="text-sm font-medium text-slate-700">Password</span><input className="app-input mt-1.5" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Your password" /></label>{error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}<button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white shadow-glow-blue transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-50"><LockKeyhole size={16} />{loading ? 'Signing in…' : 'Sign in'}</button></form></section></main>;
}
