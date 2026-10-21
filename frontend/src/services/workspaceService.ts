import { getProjects } from './projectService';
import { getProjectScans } from './scanService';
import type { Project } from '../types/project';
import type { Scan } from '../types/scan';

export interface WorkspaceData {
  projects: Project[];
  scans: Scan[];
}

/** Fetch the persisted workspace data exposed by the current API contract. */
export async function getWorkspaceData(): Promise<WorkspaceData> {
  const projects = await getProjects();
  const scans = (await Promise.all(projects.map((project) => getProjectScans(project.id))))
    .flat()
    .sort((left, right) => (
      new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime()
    ));
  return { projects, scans };
}
