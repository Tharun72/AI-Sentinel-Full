import { apiRequest } from '../api/client';

export interface SecureFix {
  id: number;
  project_id: number;
  scan_id: number;
  vulnerability_id: number;
  created_by_id: number | null;
  approved_by_id: number | null;
  rejected_by_id: number | null;
  source_revision: string;
  file_path: string;
  patch_text: string;
  status: 'proposed' | 'validated' | 'approved' | 'applied' | 'rolled_back' | 'rejected';
  validation_message: string | null;
  validation_status: 'not_run' | 'passed' | 'failed';
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  applied_at: string | null;
  rolled_back_at: string | null;
  created_at: string;
  updated_at: string;
  finding_type: string | null;
  finding_severity: string | null;
  finding_description: string | null;
  finding_evidence: string | null;
}

export interface SecureFixCreate {
  vulnerability_id: number;
  source_revision: string;
  file_path: string;
  patch_text: string;
}

export function getProjectFixes(projectId: number): Promise<SecureFix[]> {
  return apiRequest<SecureFix[]>(`/projects/${projectId}/fixes`);
}

export function proposeFix(projectId: number, data: SecureFixCreate): Promise<SecureFix> {
  return apiRequest<SecureFix>(`/projects/${projectId}/fixes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function validateFix(projectId: number, fixId: number): Promise<SecureFix> {
  return apiRequest<SecureFix>(`/projects/${projectId}/fixes/${fixId}/validate`, { method: 'POST' });
}

export function approveFix(projectId: number, fixId: number): Promise<SecureFix> {
  return apiRequest<SecureFix>(`/projects/${projectId}/fixes/${fixId}/approve`, { method: 'POST' });
}

export function generateFix(projectId: number, vulnerabilityId: number): Promise<SecureFix> {
  return apiRequest<SecureFix>(`/projects/${projectId}/fixes/generate`, { method: 'POST', body: JSON.stringify({ vulnerability_id: vulnerabilityId }) });
}

export function rejectFix(projectId: number, fixId: number, reason: string): Promise<SecureFix> {
  return apiRequest<SecureFix>(`/projects/${projectId}/fixes/${fixId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}
