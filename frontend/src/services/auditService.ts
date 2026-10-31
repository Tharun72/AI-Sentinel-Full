import { apiRequest } from '../api/client';

export interface AuditEvent {
  id: number;
  sequence: number;
  event_type: string;
  outcome: 'success' | 'failure' | 'pending';
  actor_id: number | null;
  project_id: number | null;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  previous_hash: string | null;
  event_hash: string;
  created_at: string;
}

export interface AuditEventPage {
  events: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditVerification {
  verified: boolean;
  verified_events: number;
  scopes: number;
  errors: string[];
}

export interface AuditFilters {
  projectId?: number;
  outcome?: AuditEvent['outcome'];
  limit?: number;
  offset?: number;
}

function buildQuery(filters: AuditFilters) {
  const query = new URLSearchParams();
  if (filters.projectId) query.set('project_id', String(filters.projectId));
  if (filters.outcome) query.set('outcome', filters.outcome);
  query.set('limit', String(filters.limit ?? 25));
  query.set('offset', String(filters.offset ?? 0));
  return query.toString();
}

export function getAuditEvents(filters: AuditFilters = {}): Promise<AuditEventPage> {
  return apiRequest<AuditEventPage>(`/audit?${buildQuery(filters)}`);
}

export function verifyAuditHistory(projectId?: number): Promise<AuditVerification> {
  const query = projectId ? `?project_id=${projectId}` : '';
  return apiRequest<AuditVerification>(`/audit/verify${query}`);
}
