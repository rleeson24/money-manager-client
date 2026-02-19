import { USE_API, apiJson } from "../config/api";

export interface Category {
  category_I: number;
  name: string;
}

const mockCategories: Category[] = [
  { category_I: 1, name: "Other Expenses (Pare)" },
  { category_I: 2, name: "Dining/Eating Out" },
  { category_I: 3, name: "Special Occasions (P)" },
  { category_I: 4, name: "Gas - Auto" },
  { category_I: 5, name: "Health" },
  { category_I: 6, name: "Groceries (Parent)" },
  { category_I: 7, name: "Outdoors (Parent)" },
  { category_I: 8, name: "Gifts (Parent)" },
  { category_I: 9, name: "Transportation" },
  { category_I: 10, name: "Entertainment" },
  { category_I: 11, name: "Utilities" },
  { category_I: 12, name: "Healthcare" },
  { category_I: 13, name: "Shopping" },
  { category_I: 14, name: "Health & Fitness" },
  { category_I: 15, name: "Housing" },
  { category_I: 16, name: "Education" },
  { category_I: 17, name: "Food" },
];

/**
 * Get all categories.
 * When USE_API: GET /api/categories
 */
export async function getCategories(): Promise<Category[]> {
  if (USE_API) {
    const data = await apiJson<Category[]>("/api/categories", {}, "Failed to fetch categories");
    return Array.isArray(data) ? data : [];
  }
  return [...mockCategories];
}

/**
 * Get a category by ID.
 * When USE_API: fetches all and finds by id (API has no single-get). Otherwise uses mock.
 */
export async function getCategory(id: number): Promise<Category | null> {
  if (USE_API) {
    const all = await getCategories();
    return all.find((c) => c.category_I === id) ?? null;
  }
  return mockCategories.find((c) => c.category_I === id) ?? null;
}
