import { apiRequest } from "../api/client";
import type { Project, ProjectCreate } from "../types/project";

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

export async function createProject(data: ProjectCreate): Promise<Project> {
  return apiRequest<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
