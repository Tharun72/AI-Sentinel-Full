import { apiRequest } from '../api/client';

export interface RepositorySource {
  path: string;
  branch: string;
  content: string;
  size_bytes: number;
}

export async function getRepositorySource(
  projectId: number,
  path: string,
  branch = 'main',
): Promise<RepositorySource> {
  const params = new URLSearchParams({ path, branch });
  return apiRequest<RepositorySource>(`/projects/${projectId}/source?${params.toString()}`);
}
