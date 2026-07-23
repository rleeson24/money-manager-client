const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const MAX_GET_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGet(method: string | undefined, status: number): boolean {
  return (method ?? "GET").toUpperCase() === "GET" && RETRYABLE_STATUS.has(status);
}

export async function withTransientGetRetries<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_GET_RETRIES; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const status =
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : undefined;

      if (
        status === undefined ||
        !isRetryableGet("GET", status) ||
        attempt >= MAX_GET_RETRIES - 1
      ) {
        throw err;
      }

      await delay(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}
