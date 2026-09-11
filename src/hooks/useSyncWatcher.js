import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const POLL_INTERVAL = 30000;

/** True when any Radix dialog (or sheet/drawer) is open on the page. */
const hasOpenModal = () => !!document.querySelector('[role="dialog"], [data-state="open"][role="dialog"]');

/**
 * Keeps ATLAS in sync with Watcher/InLive:
 *  - on mount: fire-and-forget sync_status, then silent refetch
 *  - every 30s: if the tab is visible and no modal is open, sync_status + silent refetch
 *  - on window focus (visibilitychange → visible): silent local refetch only
 *
 * The refetch is always "silent" — it calls onSynced(true) so the page's loadData
 * skips its loading spinner, leaving filters, tab, scroll and in-progress state
 * untouched (smooth data swap, like Watcher's periodic refresh).
 */
export function useSyncWatcher(onSynced) {
  const callbackRef = useRef(onSynced);
  callbackRef.current = onSynced;

  useEffect(() => {
    let cancelled = false;

    const runSync = () => {
      if (document.visibilityState !== "visible") return;
      if (hasOpenModal()) return;
      base44.functions
        .invoke("atlasToWatcher", { action: "sync_status" })
        .then(() => {
          if (!cancelled && callbackRef.current) callbackRef.current(true);
        })
        .catch(() => {
          // silent fail
        });
    };

    // On-mount sync (kept from before, now silent on the refetch)
    runSync();

    // 30s polling
    const interval = setInterval(runSync, POLL_INTERVAL);

    // Window focus → silent local refetch (no sync_status, just fresh data)
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (hasOpenModal()) return;
      if (callbackRef.current) callbackRef.current(true);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}