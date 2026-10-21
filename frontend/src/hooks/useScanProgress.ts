import { useEffect, useRef, useState } from 'react';

import { getScanProgress } from '../services/scanService';
import type { ScanProgress, ScanStatus } from '../types/scan';

const TERMINAL_STATUSES: ReadonlySet<ScanStatus> = new Set([
  'completed',
  'failed',
  'cancelled',
]);

export function isTerminalScan(status: string | null | undefined): boolean {
  return TERMINAL_STATUSES.has(status as ScanStatus);
}

export function useScanProgress(
  scanId: number | null,
  initialStatus: string | null | undefined,
  onProgress?: (progress: ScanProgress) => void,
) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (scanId === null || isTerminalScan(initialStatus)) {
      return;
    }

    let disposed = false;
    let timer: number | undefined;
    let failureCount = 0;

    const poll = async () => {
      try {
        const next = await getScanProgress(scanId);
        if (disposed) return;
        failureCount = 0;
        setProgress(next);
        setError(null);
        onProgressRef.current?.(next);
        if (isTerminalScan(next.status)) return;
      } catch (pollError) {
        if (disposed) return;
        failureCount += 1;
        setError('Could not refresh scan progress. Retrying…');
        console.error('Scan progress polling failed', pollError);
      }

      const delay = Math.min(10_000, 2_000 * 2 ** failureCount);
      timer = window.setTimeout(poll, delay);
    };

    void poll();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [scanId, initialStatus]);

  return { progress, error };
}
