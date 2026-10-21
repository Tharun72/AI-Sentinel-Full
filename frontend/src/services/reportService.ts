const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'
).replace(/\/$/, '');

export type ReportFormat = 'json' | 'csv' | 'sarif';

export async function downloadReport(format: ReportFormat): Promise<void> {
  const token = localStorage.getItem('access_token');
  const response = await fetch(`${API_BASE_URL}/projects/reports?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error(`Unable to generate report (${response.status}).`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `ai-sentinel-report.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
