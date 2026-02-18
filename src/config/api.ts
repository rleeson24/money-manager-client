/**
 * Single flag to switch between client-side mock data and calling the real API.
 * Set VITE_USE_API=true in .env to use the API; otherwise the client uses in-memory mocks.
 */
export const USE_API = import.meta.env.VITE_USE_API === "true";

/** Base URL for API requests (e.g. empty for same-origin, or https://localhost:7xxx when using Aspire). */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
