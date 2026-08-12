import { apiRequest } from "../api/client";
import type { Project } from "../types/project";

export async function getProjects(): Promise<Project[]> {
  return apiRequest<Project[]>("/projects");
}

export async function getProject(
  projectId: number
): Promise<Project> {
  return apiRequest<Project>(
    `/projects/${projectId}`
  );
}