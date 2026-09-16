/**
 * ============================================================================
 * useOfflineSync — Drives the offline queue while online
 * ============================================================================
 * Watches network status and the queue, and drains pending mutations whenever
 * a connection is available. Exposes queue depth and last-sync time so the UI
 * can show an honest "N operations pending" indicator instead of pretending
 * everything is saved.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { SyncResult } from '../types';
import { countQueue } from '../utils/localDb';
import { createDefaultTransport } from '../utils/firebaseTransport';
import { getLastSyncAt, getTotalSyncedOps, runSync } from '../utils/syncQueue';

export interface OfflineSyncState {
  pending: number;
  lastSyncAt?: string;
  totalSynced: number;
  isSyncing: boolean;
  lastResult: SyncResult | null;
  lastError: string | null;
  syncNow: () => Promise<void>;
}

/** Interval between automatic sync attempts while online (ms). */
const AUTO_SYNC_INTERVAL = 15_000;

export function useOfflineSync(
  workspaceId: string,
  isOnline: boolean,
  enabled: boolean
): OfflineSyncState {
  const [pending, setPending] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | undefined>(undefined);
  const [totalSynced, setTotalSynced] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const syncingRef = useRef(false);

  const refreshCounters = useCallback(async () => {
    try {
      setPending(await countQueue());
      setLastSyncAt(await getLastSyncAt());
      setTotalSynced(await getTotalSyncedOps());
    } catch {
      /* counters are best-effort */
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    if (!enabled) return;
    // Guests have no remote scope; leave their queue intact.
    if (!workspaceId) {
      await refreshCounters();
      return;
    }

    syncingRef.current = true;
    setIsSyncing(true);
    setLastError(null);
    try {
      const transport = createDefaultTransport();
      const result = await runSync(transport, workspaceId);
      setLastResult(result);
      if (result.failed > 0) {
        setLastError('PARTIAL_FAILURE');
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
      await refreshCounters();
    }
  }, [enabled, workspaceId, refreshCounters]);

  // Drain on mount, on reconnect, and on a timer while online.
  useEffect(() => {
    refreshCounters();
  }, [refreshCounters]);

  useEffect(() => {
    if (!isOnline || !enabled) return;

    void syncNow();

    const timer = setInterval(() => {
      void syncNow();
    }, AUTO_SYNC_INTERVAL);

    return () => clearInterval(timer);
  }, [isOnline, enabled, syncNow]);

  return {
    pending,
    lastSyncAt,
    totalSynced,
    isSyncing,
    lastResult,
    lastError,
    syncNow,
  };
}

export default useOfflineSync;
