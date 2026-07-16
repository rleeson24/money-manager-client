/** Read env directly to avoid circular imports with config/api.ts. */
const USE_API = import.meta.env.VITE_USE_API === "true";

let ready = !USE_API;
const listeners = new Set<(next: boolean) => void>();
const waiters: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

function resolveWaiters() {
  const pending = waiters.splice(0, waiters.length);
  for (const waiter of pending) {
    waiter.resolve();
  }
}

function rejectWaiters(err: unknown) {
  const pending = waiters.splice(0, waiters.length);
  for (const waiter of pending) {
    waiter.reject(err);
  }
}

export function getApiReady(): boolean {
  return ready;
}

export function setApiReady(next: boolean) {
  if (ready === next) {
    return;
  }

  ready = next;
  for (const listener of listeners) {
    listener(next);
  }

  if (next) {
    resolveWaiters();
  } else {
    rejectWaiters(new DOMException("Aborted", "AbortError"));
  }
}

export function subscribeApiReady(listener: (next: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function waitForApiReady(signal?: AbortSignal): Promise<void> {
  if (!USE_API || ready) {
    return Promise.resolve();
  }

  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<void>((resolve, reject) => {
    const waiter = {
      resolve: () => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      },
      reject: (err: unknown) => {
        signal?.removeEventListener("abort", onAbort);
        reject(err);
      },
    };

    const onAbort = () => {
      const index = waiters.indexOf(waiter);
      if (index >= 0) {
        waiters.splice(index, 1);
      }
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    waiters.push(waiter);
  });
}
