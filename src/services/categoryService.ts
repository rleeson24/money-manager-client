// Type definitions
export interface Category {
  Category_I: number;
  Name: string;
}

// Mock data for categories
const mockCategories: Category[] = [
  { Category_I: 1, Name: "Other Expenses (Pare)" },
  { Category_I: 2, Name: "Dining/Eating Out" },
  { Category_I: 3, Name: "Special Occasions (P)" },
  { Category_I: 4, Name: "Gas - Auto" },
  { Category_I: 5, Name: "Health" },
  { Category_I: 6, Name: "Groceries (Parent)" },
  { Category_I: 7, Name: "Outdoors (Parent)" },
  { Category_I: 8, Name: "Gifts (Parent)" },
  { Category_I: 9, Name: "Transportation" },
  { Category_I: 10, Name: "Entertainment" },
  { Category_I: 11, Name: "Utilities" },
  { Category_I: 12, Name: "Healthcare" },
  { Category_I: 13, Name: "Shopping" },
  { Category_I: 14, Name: "Health & Fitness" },
  { Category_I: 15, Name: "Housing" },
  { Category_I: 16, Name: "Education" },
  { Category_I: 17, Name: "Food" },
];

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  // TODO: Replace with actual API call
  // const response = await fetch("/api/categories");
  // if (!response.ok) throw new Error("Failed to fetch categories");
  // return response.json();

  // Mock implementation
  return Promise.resolve([...mockCategories]);
}

/**
 * Get a category by ID
 */
export async function getCategory(id: number): Promise<Category | null> {
  // TODO: Replace with actual API call
  // const response = await fetch(`/api/categories/${id}`);
  // if (!response.ok) throw new Error("Failed to fetch category");
  // return response.json();

  // Mock implementation
  const category = mockCategories.find((c) => c.Category_I === id);
  return Promise.resolve(category || null);
}
