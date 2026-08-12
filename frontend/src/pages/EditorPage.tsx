import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  File as FileIcon,
  Folder,
  Play,
  Radar,
  Sparkles,
  Terminal as TerminalIcon,
  Send,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../components/shared/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import twMerge from '../lib/twMerge';

type FileNode = { name: string; type: 'file' | 'folder'; children?: FileNode[]; active?: boolean };

const TREE: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'auth',
        type: 'folder',
        children: [
          { name: 'login.ts', type: 'file' },
          { name: 'hash.ts', type: 'file' },
          { name: 'oauth.ts', type: 'file' },
        ],
      },
      {
        name: 'db',
        type: 'folder',
        children: [
          { name: 'queries.ts', type: 'file' },
          { name: 'pool.ts', type: 'file' },
        ],
      },
      { name: 'routes', type: 'folder', children: [{ name: 'admin.ts', type: 'file' }, { name: 'recover.ts', type: 'file' }] },
      { name: 'middleware', type: 'folder', children: [{ name: 'error.ts', type: 'file' }] },
    ],
  },
  { name: 'config', type: 'folder', children: [{ name: 'clients.ts', type: 'file' }] },
  { name: 'package.json', type: 'file' },
  { name: 'tsconfig.json', type: 'file' },
];

const CODE = `import { db } from './pool';
import { hashPassword } from '../auth/hash';

export async function login(email: string, password: string) {
  // VULNERABLE: SQL injection via string concatenation
  const query = "SELECT id, hash FROM users WHERE email = '" + email + "'";
  const result = await db.query(query);

  if (result.rows.length === 0) return null;

  const user = result.rows[0];
  const ok = hashPassword(password) === user.hash; // VULNERABLE: MD5 compare
  return ok ? user : null;
}`;

const TERMINAL = [
  { t: '$ sentinel scan --file src/auth/login.ts', tone: 'cmd' as const },
  { t: '→ Loading 1,840 rules across 6 languages…', tone: 'dim' as const },
  { t: '✓ SAST analysis complete (3.2s)', tone: 'ok' as const },
  { t: '✓ Dependency graph built (142 modules)', tone: 'ok' as const },
  { t: '✗ 2 vulnerabilities found', tone: 'err' as const },
  { t: '  • CWE-89  SQL Injection          src/auth/login.ts:6  CRITICAL', tone: 'warn' as const },
  { t: '  • CWE-327 Weak Hash (MD5)        src/auth/login.ts:10 HIGH', tone: 'warn' as const },
  { t: '$ _', tone: 'cmd' as const },
];

export function EditorPage() {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['src', 'src/auth']));
  const [activeFile, setActiveFile] = useState('src/auth/login.ts');

  const toggle = (path: string) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const renderTree = (nodes: FileNode[], path = '') => (
    <ul className="space-y-0.5">
      {nodes.map((node) => {
        const full = path ? `${path}/${node.name}` : node.name;
        const isOpen = openFolders.has(full);
        if (node.type === 'folder') {
          return (
            <li key={full}>
              <button
                onClick={() => toggle(full)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-white/[0.04]"
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} className="text-brand-amber" />
                <span className="truncate">{node.name}</span>
              </button>
              {isOpen && node.children && <ul className="ml-3 border-l border-white/[0.06] pl-1.5">{renderTree(node.children, full)}</ul>}
            </li>
          );
        }
        return (
          <li key={full}>
            <button
              onClick={() => setActiveFile(full)}
              className={twMerge(
                'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
                activeFile === full ? 'bg-brand-blue/15 text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
              )}
            >
              <FileIcon size={14} className="text-slate-500" />
              <span className="truncate">{node.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Code Editor"
        subtitle="Review findings inline and request AI remediation"
        actions={
          <>
            <Button variant="secondary" size="md"><Play size={15} /> Run</Button>
            <Button variant="primary" size="md"><Radar size={15} /> Run Scan</Button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)] min-h-[560px]">
        {/* File explorer */}
        <Card className="col-span-12 md:col-span-3 lg:col-span-2 flex flex-col overflow-hidden p-3">
          <div className="px-2 pb-2 text-[10px] uppercase tracking-wider text-slate-500">Explorer</div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">{renderTree(TREE)}</div>
        </Card>

        {/* Editor + Terminal */}
        <div className="col-span-12 md:col-span-9 lg:col-span-7 flex flex-col gap-4 min-h-0">
          <Card className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-red/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-amber/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-emerald/70" />
              </div>
              <span className="ml-2 text-xs text-slate-400">{activeFile}</span>
              <Badge tone="red" className="ml-auto">2 vulns</Badge>
            </div>
            <div className="flex-1 overflow-auto bg-[#070B14] font-mono text-[13px] leading-relaxed scrollbar-thin">
              <pre className="p-4">
                {CODE.split('\n').map((line, i) => {
                  const isVuln = line.includes('VULNERABLE');
                  return (
                    <div key={i} className={twMerge('flex', isVuln && 'bg-brand-red/5')}>
                      <span className="mr-4 w-8 shrink-0 select-none text-right text-slate-600">{i + 1}</span>
                      <span className={twMerge('text-slate-300', isVuln && 'text-brand-red/90')}>{line || ' '}</span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </Card>

          <Card className="flex h-44 flex-col overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <TerminalIcon size={14} className="text-brand-emerald" />
              <span className="text-xs font-medium text-slate-300">Terminal</span>
              <Badge tone="emerald" className="ml-auto">connected</Badge>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#070B14] p-3 font-mono text-xs scrollbar-thin">
              {TERMINAL.map((l, i) => (
                <div
                  key={i}
                  className={twMerge(
                    l.tone === 'ok' && 'text-brand-emerald',
                    l.tone === 'err' && 'text-brand-red',
                    l.tone === 'warn' && 'text-brand-amber',
                    l.tone === 'dim' && 'text-slate-500',
                    l.tone === 'cmd' && 'text-slate-200',
                  )}
                >
                  {l.t}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* AI assistant */}
        <Card className="col-span-12 lg:col-span-3 flex flex-col overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <Sparkles size={16} className="text-brand-cyan" />
            <span className="text-sm font-semibold text-slate-100">AI Assistant</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-brand-blue/10 border border-brand-blue/20 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-brand-blue"><AlertTriangle size={13} /> 2 issues detected</div>
              <p className="mt-2 text-xs text-slate-300">I found a SQL injection on line 6 and a weak hash comparison on line 10. Want me to generate a secure patch?</p>
            </motion.div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200"><CheckCircle2 size={13} className="text-brand-emerald" /> Suggested fix</div>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-[#070B14] p-2.5 font-mono text-[11px] text-slate-300 scrollbar-thin">{`const query = 'SELECT id, hash FROM users WHERE email = $1';
const result = await db.query(query, [email]);`}</pre>
              <div className="mt-2 flex items-center justify-between">
                <Badge tone="emerald">97% confidence</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">Reject</Button>
                  <Button size="sm" variant="success">Apply</Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-200"><CheckCircle2 size={13} className="text-brand-emerald" /> Suggested fix</div>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-[#070B14] p-2.5 font-mono text-[11px] text-slate-300 scrollbar-thin">{`import bcrypt from 'bcrypt';
const ok = await bcrypt.compare(password, user.hash);`}</pre>
              <div className="mt-2 flex items-center justify-between">
                <Badge tone="emerald">94% confidence</Badge>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost">Reject</Button>
                  <Button size="sm" variant="success">Apply</Button>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3">
              <input placeholder="Ask the AI…" className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
              <Button size="icon" variant="ghost"><Send size={15} /></Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
