import type { PaymentMethod } from "../services/paymentMethodService";

/** Must mirror MoneyManager.Data LegacyPaymentMethodSeed.cs */
export const mockPaymentMethodsData: PaymentMethod[] = [
  { id: 1, PaymentMethod: "Discover Checking" },
  { id: 2, PaymentMethod: "Discover Savings" },
  { id: 3, PaymentMethod: "Discover Credit" },
  { id: 4, PaymentMethod: "Arvest Checking" },
  { id: 5, PaymentMethod: "ABFCU Checking" },
  { id: 6, PaymentMethod: "ABFCU Savings" },
  { id: 7, PaymentMethod: "Bank Transfer" },
];
