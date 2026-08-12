export interface Vulnerability {
  id: number;
  scan_id: number;
  vulnerability_type: string;
  file_path: string | null;
  line_number: number | null;
  count: number | null;
  severity: string | null;
  cvss: number | null;
  description: string | null;
  recommendation: string | null;
  created_at: string | null;
}

export interface Scan {
  id: number;
  project_id: number;
  status: string;
  repository_url: string | null;
  branch: string | null;
  started_at: string | null;
  completed_at: string | null;
  files_scanned: number | null;
  vulnerabilities_found: number | null;
  risk_score: number | null;
  created_at: string | null;
  vulnerabilities: Vulnerability[];
}

export interface ScanCreate {
  branch: string;
}