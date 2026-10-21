import type { Severity } from './nav';

export type Project = {
  id: string;
  name: string;
  language: string;
  status: 'Passed' | 'Failed' | 'Scanning' | 'Pending';
  vulnerabilities: number;
  securityScore: number;
  lastScan: string;
};

export const PROJECTS: Project[] = [
  { id: 'p1', name: 'payment-gateway', language: 'TypeScript', status: 'Failed', vulnerabilities: 14, securityScore: 62, lastScan: '2m ago' },
  { id: 'p2', name: 'auth-service', language: 'Go', status: 'Passed', vulnerabilities: 0, securityScore: 98, lastScan: '1h ago' },
  { id: 'p3', name: 'user-profile-api', language: 'Python', status: 'Scanning', vulnerabilities: 7, securityScore: 74, lastScan: 'now' },
  { id: 'p4', name: 'inventory-svc', language: 'Rust', status: 'Passed', vulnerabilities: 1, securityScore: 94, lastScan: '3h ago' },
  { id: 'p5', name: 'notifications-fanout', language: 'Node.js', status: 'Failed', vulnerabilities: 9, securityScore: 58, lastScan: '5h ago' },
  { id: 'p6', name: 'billing-engine', language: 'Java', status: 'Pending', vulnerabilities: 5, securityScore: 81, lastScan: '8h ago' },
  { id: 'p7', name: 'search-indexer', language: 'Python', status: 'Passed', vulnerabilities: 2, securityScore: 89, lastScan: '1d ago' },
  { id: 'p8', name: 'edge-proxy', language: 'C', status: 'Failed', vulnerabilities: 22, securityScore: 41, lastScan: '1d ago' },
];

export type AISuggestion = {
  id: string;
  vulnerability: string;
  cwe: string;
  severity: Severity;
  recommendation: string;
  confidence: number;
  file: string;
};

export const AI_SUGGESTIONS: AISuggestion[] = [
  {
    id: 's1',
    vulnerability: 'SQL Injection via dynamic query string',
    cwe: 'CWE-89',
    severity: 'critical',
    recommendation: 'Parameterize the query using prepared statements instead of string concatenation. Bind user input as query parameters.',
    confidence: 97,
    file: 'src/db/queries.ts:142',
  },
  {
    id: 's2',
    vulnerability: 'Hardcoded AWS secret key in source',
    cwe: 'CWE-798',
    severity: 'critical',
    recommendation: 'Move the credential to a secret manager (AWS Secrets Manager / Vault) and reference it via environment variable at runtime.',
    confidence: 99,
    file: 'config/clients.ts:23',
  },
  {
    id: 's3',
    vulnerability: 'Weak password hashing with MD5',
    cwe: 'CWE-327',
    severity: 'high',
    recommendation: 'Replace MD5 with bcrypt or argon2id using a work factor of at least 12. Migrate existing hashes on next login.',
    confidence: 94,
    file: 'src/auth/hash.ts:58',
  },
  {
    id: 's4',
    vulnerability: 'Missing CSRF token on state-changing route',
    cwe: 'CWE-352',
    severity: 'high',
    recommendation: 'Add double-submit CSRF tokens to all POST/PUT/DELETE handlers and validate the token server-side.',
    confidence: 88,
    file: 'src/routes/admin.ts:204',
  },
  {
    id: 's5',
    vulnerability: 'Verbose error message leaks stack trace',
    cwe: 'CWE-209',
    severity: 'medium',
    recommendation: 'Return a generic error envelope to the client and log the full stack trace only server-side.',
    confidence: 91,
    file: 'src/middleware/error.ts:33',
  },
  {
    id: 's6',
    vulnerability: 'Insecure deserialization of untrusted JSON',
    cwe: 'CWE-502',
    severity: 'high',
    recommendation: 'Validate the payload against a schema before parsing and avoid reviving functions. Use a typed decoder.',
    confidence: 86,
    file: 'src/queue/consumer.ts:77',
  },
];

export type Activity = {
  id: string;
  type: 'scan-started' | 'ai-completed' | 'blockchain-verified' | 'report-generated';
  message: string;
  detail: string;
  time: string;
};

export const ACTIVITIES: Activity[] = [
  { id: 'a1', type: 'scan-started', message: 'Scan started on payment-gateway', detail: 'Deep SAST + dependency analysis', time: '2 min ago' },
  { id: 'a2', type: 'ai-completed', message: 'AI analysis completed on user-profile-api', detail: '7 vulnerabilities triaged, 6 fixes generated', time: '14 min ago' },
  { id: 'a3', type: 'blockchain-verified', message: 'Blockchain verification completed', detail: 'Patch 0x9f2a…b1c7 anchored to Polygon', time: '38 min ago' },
  { id: 'a4', type: 'report-generated', message: 'Executive report generated', detail: 'Weekly security posture — Q3 W2', time: '1h ago' },
  { id: 'a5', type: 'scan-started', message: 'Scan started on edge-proxy', detail: 'Memory-safety + buffer overflow ruleset', time: '2h ago' },
];

export const VULN_TREND = [
  { date: 'Jul 15', critical: 8, high: 14, medium: 22, low: 31 },
  { date: 'Jul 16', critical: 6, high: 12, medium: 19, low: 28 },
  { date: 'Jul 17', critical: 9, high: 16, medium: 24, low: 30 },
  { date: 'Jul 18', critical: 5, high: 10, medium: 17, low: 26 },
  { date: 'Jul 19', critical: 4, high: 8, medium: 15, low: 24 },
  { date: 'Jul 20', critical: 3, high: 7, medium: 13, low: 21 },
  { date: 'Jul 21', critical: 2, high: 6, medium: 11, low: 19 },
];

export const SCAN_FREQUENCY = [
  { day: 'Mon', scans: 12 },
  { day: 'Tue', scans: 18 },
  { day: 'Wed', scans: 15 },
  { day: 'Thu', scans: 22 },
  { day: 'Fri', scans: 27 },
  { day: 'Sat', scans: 9 },
  { day: 'Sun', scans: 6 },
];

export const AI_FIX_ACCURACY = [
  { week: 'W1', accepted: 82, rejected: 18 },
  { week: 'W2', accepted: 86, rejected: 14 },
  { week: 'W3', accepted: 89, rejected: 11 },
  { week: 'W4', accepted: 91, rejected: 9 },
  { week: 'W5', accepted: 93, rejected: 7 },
  { week: 'W6', accepted: 95, rejected: 5 },
];

export const SEVERITY_DIST = [
  { name: 'Critical', value: 8, color: '#EF4444' },
  { name: 'High', value: 19, color: '#F59E0B' },
  { name: 'Medium', value: 34, color: '#3B82F6' },
  { name: 'Low', value: 52, color: '#06B6D4' },
];

export type Vulnerability = {
  id: string;
  title: string;
  cve: string;
  cwe: string;
  severity: Severity;
  status: 'Open' | 'Fixed' | 'Ignored' | 'In Review';
  cvss: number;
  file: string;
  description: string;
  recommendation: string;
};

export const VULNERABILITIES: Vulnerability[] = [
  {
    id: 'v1',
    title: 'SQL Injection in login handler',
    cve: 'CVE-2024-3147',
    cwe: 'CWE-89',
    severity: 'critical',
    status: 'Open',
    cvss: 9.8,
    file: 'src/auth/login.ts:88',
    description: 'User-supplied email is concatenated directly into a SQL query used for authentication. An attacker can bypass the login check and exfiltrate the user table via a UNION-based payload.',
    recommendation: 'Replace the string-built query with a parameterized prepared statement. Bind email and password hash as parameters and never interpolate request input into SQL text.',
  },
  {
    id: 'v2',
    title: 'Hardcoded credentials in repository',
    cve: 'CVE-2024-2911',
    cwe: 'CWE-798',
    severity: 'critical',
    status: 'In Review',
    cvss: 9.1,
    file: 'config/clients.ts:23',
    description: 'A live AWS access key and secret are committed in plaintext. Anyone with read access to the repo can impersonate the service account.',
    recommendation: 'Rotate the exposed key immediately, move credentials to a secrets manager, and reference them via environment variables. Add a pre-commit secret scanner.',
  },
  {
    id: 'v3',
    title: 'Weak password hashing (MD5)',
    cve: 'CVE-2024-2204',
    cwe: 'CWE-327',
    severity: 'high',
    status: 'Open',
    cvss: 7.5,
    file: 'src/auth/hash.ts:58',
    description: 'Passwords are hashed with MD5, which is cryptographically broken and trivially brute-forced with modern GPUs.',
    recommendation: 'Migrate to argon2id with a memory cost of 64MiB and time cost of 3. Re-hash on next successful login for each user.',
  },
  {
    id: 'v4',
    title: 'Missing CSRF protection on admin endpoints',
    cve: 'CVE-2024-3320',
    cwe: 'CWE-352',
    severity: 'high',
    status: 'Fixed',
    cvss: 7.1,
    file: 'src/routes/admin.ts:204',
    description: 'State-changing admin routes accept cross-site requests without validating an anti-CSRF token, enabling a forced-browse attack.',
    recommendation: 'Issue double-submit CSRF tokens and validate them server-side on every POST/PUT/DELETE. Set SameSite=Lax on session cookies.',
  },
  {
    id: 'v5',
    title: 'Insecure deserialization of queue payload',
    cve: 'CVE-2024-3018',
    cwe: 'CWE-502',
    severity: 'high',
    status: 'Open',
    cvss: 8.2,
    file: 'src/queue/consumer.ts:77',
    description: 'The consumer revives functions from untrusted JSON payloads, allowing arbitrary code execution if a malicious message reaches the queue.',
    recommendation: 'Parse with a strict schema decoder and never revive functions. Reject payloads that fail validation.',
  },
  {
    id: 'v6',
    title: 'Verbose error leaks internal paths',
    cve: 'CVE-2024-1180',
    cwe: 'CWE-209',
    severity: 'medium',
    status: 'Ignored',
    cvss: 5.3,
    file: 'src/middleware/error.ts:33',
    description: 'Unhandled exceptions return the full stack trace and absolute file paths to the client, aiding reconnaissance.',
    recommendation: 'Return a generic error envelope with a correlation ID. Log the full trace server-side only.',
  },
  {
    id: 'v7',
    title: 'Outdated dependency with known RCE',
    cve: 'CVE-2024-2902',
    cwe: 'CWE-1104',
    severity: 'critical',
    status: 'Open',
    cvss: 9.4,
    file: 'package.json → lodash@4.17.20',
    description: 'A transitive dependency ships a prototype pollution vulnerability that is exploitable via crafted merge operations.',
    recommendation: 'Upgrade lodash to ^4.17.21 or replace with a maintained alternative. Run a fresh lockfile audit.',
  },
  {
    id: 'v8',
    title: 'Missing rate limit on password reset',
    cve: 'CVE-2024-2055',
    cwe: 'CWE-307',
    severity: 'medium',
    status: 'Open',
    cvss: 5.9,
    file: 'src/routes/recover.ts:41',
    description: 'The password-reset endpoint has no rate limit, enabling user-enumeration and email-bombing via repeated requests.',
    recommendation: 'Add a sliding-window rate limiter (5 requests / 15 min / IP) and a constant-time response for unknown emails.',
  },
  {
    id: 'v9',
    title: 'Open redirect in OAuth callback',
    cve: 'CVE-2024-1572',
    cwe: 'CWE-601',
    severity: 'low',
    status: 'Fixed',
    cvss: 3.7,
    file: 'src/auth/oauth.ts:120',
    description: 'The state redirect_uri is taken from the query string without an allowlist, enabling phishing via a trusted domain.',
    recommendation: 'Validate redirect targets against a configured allowlist and reject untrusted hosts.',
  },
];

export type Patch = {
  id: string;
  vulnerability: string;
  project: string;
  appliedAt: string;
  confidence: number;
  status: 'Applied' | 'Rolled Back';
  patchHash: string;
};

export const PATCHES: Patch[] = [
  { id: 'f1', vulnerability: 'Missing CSRF protection on admin endpoints', project: 'payment-gateway', appliedAt: 'Jul 21, 09:14', confidence: 96, status: 'Applied', patchHash: '0x9f2a…b1c7' },
  { id: 'f2', vulnerability: 'Open redirect in OAuth callback', project: 'auth-service', appliedAt: 'Jul 20, 16:02', confidence: 93, status: 'Applied', patchHash: '0x4e1d…8a0f' },
  { id: 'f3', vulnerability: 'Verbose error leaks internal paths', project: 'notifications-fanout', appliedAt: 'Jul 19, 11:48', confidence: 89, status: 'Applied', patchHash: '0x7b3c…22e9' },
  { id: 'f4', vulnerability: 'Weak password hashing (MD5)', project: 'billing-engine', appliedAt: 'Jul 18, 14:21', confidence: 91, status: 'Rolled Back', patchHash: '0x1a9f…cc04' },
];

export type Verification = {
  id: string;
  project: string;
  patchHash: string;
  txId: string;
  timestamp: string;
  network: string;
  status: 'Verified' | 'Pending' | 'Failed';
  block: number;
};

export const VERIFICATIONS: Verification[] = [
  { id: 'b1', project: 'payment-gateway', patchHash: '0x9f2a…b1c7', txId: '0x4f2c91ab…7e10', timestamp: '2024-07-21T09:14:22Z', network: 'Polygon', status: 'Verified', block: 64218903 },
  { id: 'b2', project: 'auth-service', patchHash: '0x4e1d…8a0f', txId: '0x8a1b3c04…1f22', timestamp: '2024-07-20T16:02:11Z', network: 'Polygon', status: 'Verified', block: 64201144 },
  { id: 'b3', project: 'notifications-fanout', patchHash: '0x7b3c…22e9', txId: '0x2c9d7e1a…44b0', timestamp: '2024-07-19T11:48:39Z', network: 'Polygon', status: 'Verified', block: 64177820 },
  { id: 'b4', project: 'billing-engine', patchHash: '0x1a9f…cc04', txId: 'pending', timestamp: '2024-07-21T10:02:00Z', network: 'Polygon', status: 'Pending', block: 0 },
];

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Analyst' | 'Developer';
  avatar: string;
  lastActive: string;
  scans: number;
};

export const TEAM: TeamMember[] = [
  { id: 't1', name: 'Maya Okafor', email: 'maya.okafor@sentinel.io', role: 'Owner', avatar: 'MO', lastActive: 'online', scans: 142 },
  { id: 't2', name: 'Daniel Reyes', email: 'daniel.reyes@sentinel.io', role: 'Admin', avatar: 'DR', lastActive: '12m ago', scans: 98 },
  { id: 't3', name: 'Priya Nair', email: 'priya.nair@sentinel.io', role: 'Analyst', avatar: 'PN', lastActive: '1h ago', scans: 211 },
  { id: 't4', name: 'Liam Walsh', email: 'liam.walsh@sentinel.io', role: 'Developer', avatar: 'LW', lastActive: '3h ago', scans: 54 },
  { id: 't5', name: 'Sofia Bianchi', email: 'sofia.bianchi@sentinel.io', role: 'Developer', avatar: 'SB', lastActive: '1d ago', scans: 37 },
];

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
  scopes: string[];
};

export const API_KEYS: ApiKey[] = [
  { id: 'k1', name: 'CI Pipeline', prefix: 'sent_live_8f2a', created: 'Jul 02, 2024', lastUsed: '2m ago', scopes: ['scan:run', 'scan:read'] },
  { id: 'k2', name: 'Reporting Bot', prefix: 'sent_live_2c91', created: 'Jun 18, 2024', lastUsed: '6h ago', scopes: ['reports:read'] },
  { id: 'k3', name: 'Terraform Provisioner', prefix: 'sent_live_a1b4', created: 'May 30, 2024', lastUsed: '2d ago', scopes: ['projects:write', 'scan:run'] },
];

export type ScanRecord = {
  id: string;
  project: string;
  startedAt: string;
  duration: string;
  rules: number;
  findings: number;
  status: 'Completed' | 'Failed' | 'Running';
  triggeredBy: string;
};

export const SCAN_HISTORY: ScanRecord[] = [
  { id: 'h1', project: 'payment-gateway', startedAt: 'Jul 21, 09:12', duration: '4m 12s', rules: 1840, findings: 14, status: 'Completed', triggeredBy: 'Maya Okafor' },
  { id: 'h2', project: 'user-profile-api', startedAt: 'Jul 21, 08:58', duration: '3m 41s', rules: 1840, findings: 7, status: 'Running', triggeredBy: 'CI Pipeline' },
  { id: 'h3', project: 'auth-service', startedAt: 'Jul 21, 07:30', duration: '2m 58s', rules: 1840, findings: 0, status: 'Completed', triggeredBy: 'Daniel Reyes' },
  { id: 'h4', project: 'edge-proxy', startedAt: 'Jul 20, 22:14', duration: '6m 03s', rules: 1840, findings: 22, status: 'Failed', triggeredBy: 'Nightly Job' },
  { id: 'h5', project: 'inventory-svc', startedAt: 'Jul 20, 15:09', duration: '3m 22s', rules: 1840, findings: 1, status: 'Completed', triggeredBy: 'Priya Nair' },
  { id: 'h6', project: 'search-indexer', startedAt: 'Jul 20, 11:47', duration: '2m 49s', rules: 1840, findings: 2, status: 'Completed', triggeredBy: 'Liam Walsh' },
  { id: 'h7', project: 'billing-engine', startedAt: 'Jul 19, 19:02', duration: '5m 18s', rules: 1840, findings: 5, status: 'Completed', triggeredBy: 'CI Pipeline' },
];
