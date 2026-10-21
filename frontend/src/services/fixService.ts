import { apiRequest } from '../api/client';

export interface SecureFix {
  id: number;
  project_id: number;
  scan_id: number;
  vulnerability_id: number;
  source_revision: string;
  file_path: string;
  patch_text: string;
  status: 'proposed' | 'validated' | 'approved' | 'applied' | 'rolled_back' | 'rejected';
  validation_message: string | null;
  approved_at: string | null;
  applied_at: string | null;
  rolled_back_at: string | null;
  created_at: string;
  updated_at: string;
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
