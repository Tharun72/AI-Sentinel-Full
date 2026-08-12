import { apiRequest } from "../api/client";
import type { Scan, ScanCreate } from "../types/scan";

export async function getProjectScans(
  projectId: number
): Promise<Scan[]> {
  return apiRequest<Scan[]>(
    `/projects/${projectId}/scans`
  );
}

export async function getScan(
  scanId: number
): Promise<Scan> {
  return apiRequest<Scan>(
    `/projects/scans/${scanId}`
  );
}

export async function startScan(
  projectId: number,
  data: ScanCreate
): Promise<Scan> {
  return apiRequest<Scan>(
    `/projects/${projectId}/scans`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}