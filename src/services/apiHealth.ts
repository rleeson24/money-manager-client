/** Read env directly to avoid a circular import with config/api.ts. */
const USE_API = import.meta.env.VITE_USE_API === "true";
const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Explicit DB connectivity probe — wakes auto-pause SQL without hitting auth-protected routes. */
const HEALTH_PATH = "/health/db";
const POLL_INTERVAL_MS = 2500;

export type ApiHealthStatus = "idle" | "checking" | "healthy";

let status: ApiHealthStatus = USE_API ? "idle" : "healthy";
let healthyWaiters: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];
let pollAbort: AbortController | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(next: ApiHealthStatus) => void>();

function setStatus(next: ApiHealthStatus) {
  status = next;
  for (const listener of listeners) {
    listener(next);
  }
}

function resolveHealthyWaiters() {
  const waiters = healthyWaiters;
  healthyWaiters = [];
  for (const waiter of waiters) {
    waiter.resolve();
  }
}

function rejectHealthyWaiters(err: unknown) {
  const waiters = healthyWaiters;
  healthyWaiters = [];
  for (const waiter of waiters) {
    waiter.reject(err);
  }
}

export function getApiHealthStatus(): ApiHealthStatus {
  return status;
}

export function subscribeApiHealth(listener: (next: ApiHealthStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function waitForApiHealthy(signal?: AbortSignal): Promise<void> {
  if (!USE_API || status === "healthy") {
    return Promise.resolve();
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<void>((resolve, reject) => {
    const waiter = { resolve, reject };

    const onAbort = () => {
      healthyWaiters = healthyWaiters.filter((w) => w !== waiter);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    healthyWaiters.push({
      resolve: () => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      },
      reject: (err: unknown) => {
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      },
    });
  });
}

async function checkHealth(signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}${HEALTH_PATH}`, { signal });
    return res.ok;
  } catch (err) {
    if (signal.aborted) {
      throw err;
    }
    return false;
  }
}

export function startApiHealthPolling(): () => void {
  if (!USE_API || status === "healthy") {
    return () => {};
  }

  pollAbort?.abort();
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }

  setStatus("checking");
  const ac = new AbortController();
  pollAbort = ac;

  async function poll() {
    while (!ac.signal.aborted) {
      try {
        if (await checkHealth(ac.signal)) {
          if (ac.signal.aborted) return;
          setStatus("healthy");
          resolveHealthyWaiters();
          return;
        }
      } catch {
        if (ac.signal.aborted) return;
      }

      await new Promise<void>((resolve) => {
        pollTimer = setTimeout(resolve, POLL_INTERVAL_MS);
      });
      pollTimer = null;
    }
  }

  void poll();

  return () => {
    ac.abort();
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    pollAbort = null;

    if (status !== "healthy") {
      rejectHealthyWaiters(new DOMException("Aborted", "AbortError"));
      setStatus("idle");
    }
  };
}
