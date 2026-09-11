import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Fire-and-forget Watcher → ATLAS status sync on mount.
 * Silently POSTs sync_status, then calls onSynced() to refetch.
 * Never blocks, never throws.
 */
export function useSyncWatcher(onSynced) {
  const callbackRef = useRef(onSynced);
  callbackRef.current = onSynced;

  useEffect(() => {
    let cancelled = false;
    base44.functions
      .invoke("atlasToWatcher", { action: "sync_status" })
      .then(() => {
        if (!cancelled && callbackRef.current) callbackRef.current();
      })
      .catch(() => {
        // silent fail
      });
    return () => { cancelled = true; };
  }, []);
}