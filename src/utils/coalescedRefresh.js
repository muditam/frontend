// Collapse bursts into one request plus a trailing refresh. Never overlap
// requests, including when the server takes longer than the cooldown.
export function createCoalescedRefresh(run, cooldownMs = 3000) {
  let running = false;
  let requested = false;
  let disposed = false;
  let timer = null;
  let nextRunAt = 0;

  const drain = async () => {
    timer = null;
    if (disposed || running || !requested) return;
    const delay = nextRunAt - Date.now();
    if (delay > 0) {
      timer = setTimeout(drain, delay);
      return;
    }
    requested = false;
    running = true;
    try {
      await run();
    } catch {
      // The caller reports errors. A later event may retry; do not loop.
    } finally {
      running = false;
      nextRunAt = Date.now() + cooldownMs;
      if (!disposed && requested) timer = setTimeout(drain, cooldownMs);
    }
  };

  return {
    request() {
      if (disposed) return;
      requested = true;
      if (!running && timer === null) void drain();
    },
    dispose() {
      disposed = true;
      requested = false;
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
