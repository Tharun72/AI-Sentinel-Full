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
  evidence: string | null;
  recommendation: string | null;

  // AI Security Analysis
  ai_explanation: string | null;
  ai_impact: string | null;
  ai_attack_scenario: string | null;
  ai_remediation: string | null;
  ai_secure_coding_advice: string | null;

  created_at: string | null;
}

export interface Scan {
  id: number;
  project_id: number;
  status: string;
  repository_url: string | null;
  branch: string | null;
  repository_revision: string | null;
  started_at: string | null;
  completed_at: string | null;
  files_scanned: number | null;
  vulnerabilities_found: number | null;
  risk_score: number | null;
  stage: string | null;
  progress_percent: number | null;
  files_discovered: number | null;
  files_processed: number | null;
  current_file: string | null;
  ai_completed: number | null;
  ai_total: number | null;
  duration_seconds: number | null;
  error_message: string | null;
  clone_duration_seconds: number | null;
  discovery_duration_seconds: number | null;
  static_analysis_duration_seconds: number | null;
  ai_duration_seconds: number | null;
  persistence_duration_seconds: number | null;
  created_at: string | null;
  vulnerabilities: Vulnerability[];
}

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScanProgress {
  id: number;
  status: ScanStatus;
  stage: string | null;
  progress_percent: number | null;
  files_discovered: number | null;
  files_processed: number | null;
  current_file: string | null;
  vulnerabilities_found: number | null;
  ai_completed: number | null;
  ai_total: number | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
}

export interface ScanCreate {
  branch: string;
}
