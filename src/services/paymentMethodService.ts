import { USE_API, apiJson } from "../config/api";
import { mockPaymentMethodsData } from "../data/mockPaymentMethodsData";

export interface PaymentMethod {
  id: number;
  PaymentMethod: string;
}

/**
 * Get all payment methods.
 * When USE_API: GET /api/payment-methods
 */
export async function getPaymentMethods(signal?: AbortSignal): Promise<PaymentMethod[]> {
  if (USE_API) {
    const data = await apiJson<PaymentMethod[]>("/api/payment-methods", { signal }, "Failed to fetch payment methods");
    return Array.isArray(data) ? data : [];
  }
  return [...mockPaymentMethodsData];
}

/**
 * Get a payment method by ID.
 * When USE_API: fetches all and finds by id. Otherwise uses mock.
 */
export async function getPaymentMethod(id: number): Promise<PaymentMethod | null> {
  if (USE_API) {
    const all = await getPaymentMethods();
    return all.find((pm) => pm.id === id) ?? null;
  }
  return mockPaymentMethodsData.find((pm) => pm.id === id) ?? null;
}
