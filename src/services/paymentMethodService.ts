import { USE_API, apiJson } from "../config/api";

export interface PaymentMethod {
  id: number;
  PaymentMethod: string;
}

const mockPaymentMethods: PaymentMethod[] = [
  { id: 1, PaymentMethod: "Discover" },
  { id: 2, PaymentMethod: "Visa" },
  { id: 3, PaymentMethod: "Mastercard" },
  { id: 4, PaymentMethod: "American Express" },
  { id: 5, PaymentMethod: "Debit Card" },
  { id: 6, PaymentMethod: "Cash" },
  { id: 7, PaymentMethod: "Bank Transfer" },
  { id: 8, PaymentMethod: "PayPal" },
];

/**
 * Get all payment methods.
 * When USE_API: GET /api/payment-methods
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  if (USE_API) {
    const data = await apiJson<PaymentMethod[]>("/api/payment-methods", {}, "Failed to fetch payment methods");
    return Array.isArray(data) ? data : [];
  }
  return [...mockPaymentMethods];
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
  return mockPaymentMethods.find((pm) => pm.id === id) ?? null;
}
