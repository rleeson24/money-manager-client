/**
 * Single flag to switch between client-side mock data and calling the real API.
 * Set VITE_USE_API=true in .env to use the API; otherwise the client uses in-memory mocks.
 */
export const USE_API = import.meta.env.VITE_USE_API === "true";

/** Base URL for API requests (e.g. empty for same-origin, or https://localhost:7xxx when using Aspire). */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Thrown by apiJson when the response is not ok. Use status and body for 409 or other handling. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch helper: runs fetch with API_BASE, credentials, and JSON headers; throws ApiError if !res.ok; returns parsed JSON (or undefined for 204).
 * Use for GET/POST/PATCH/DELETE when you want a single place to check res.ok and get res.json().
 * @param errorMessage - Optional message to use in the thrown ApiError on failure (e.g. "Failed to fetch expenses").
 */
export async function apiJson<T>(
  path: string,
  options: RequestInit = {},
  errorMessage?: string
): Promise<T | undefined> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    let body: unknown;
    const ct = res.headers.get("content-type");
    try {
      body = ct?.includes("application/json") ? await res.json() : await res.text();
    } catch {
      body = undefined;
    }
    const message = errorMessage ?? `API error ${res.status}: ${res.statusText}`;
    throw new ApiError(res.status, message, body);
  }
  if (res.status === 204) return undefined;
  return (await res.json()) as T;
}
