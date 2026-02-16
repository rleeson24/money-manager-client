// Type definitions
export interface PaymentMethod {
  ID: number;
  PaymentMethod: string;
}

// Mock data for payment methods
const mockPaymentMethods: PaymentMethod[] = [
  { ID: 1, PaymentMethod: "Discover" },
  { ID: 2, PaymentMethod: "Visa" },
  { ID: 3, PaymentMethod: "Mastercard" },
  { ID: 4, PaymentMethod: "American Express" },
  { ID: 5, PaymentMethod: "Debit Card" },
  { ID: 6, PaymentMethod: "Cash" },
  { ID: 7, PaymentMethod: "Bank Transfer" },
  { ID: 8, PaymentMethod: "PayPal" },
];

/**
 * Get all payment methods
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  // TODO: Replace with actual API call
  // const response = await fetch("/api/payment-methods");
  // if (!response.ok) throw new Error("Failed to fetch payment methods");
  // return response.json();

  // Mock implementation
  return Promise.resolve([...mockPaymentMethods]);
}

/**
 * Get a payment method by ID
 */
export async function getPaymentMethod(id: number): Promise<PaymentMethod | null> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/payment-methods/${id}`);
  // if (!response.ok) throw new Error("Failed to fetch payment method");
  // return response.json();

  // Mock implementation
  const paymentMethod = mockPaymentMethods.find((pm) => pm.ID === id);
  return Promise.resolve(paymentMethod || null);
}
