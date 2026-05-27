import { USE_API, apiJson } from "../config/api";
import { mockCategories } from "../data/mockCategoriesData";

export interface Category {
  category_I: number;
  name: string;
  parentCategory_I?: number | null;
  required: boolean;
  archived: boolean;
  hasChildren?: boolean;
}

export interface CreateCategoryInput {
  name: string;
  parentCategory_I?: number | null;
  required?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  parentCategory_I?: number | null;
  required?: boolean;
  archived?: boolean;
  clearParent?: boolean;
}

function withHasChildren(categories: Category[]): Category[] {
  const parentIds = new Set(
    categories
      .filter((c) => c.parentCategory_I != null)
      .map((c) => c.parentCategory_I!)
  );
  return categories.map((c) => ({
    ...c,
    hasChildren: parentIds.has(c.category_I),
  }));
}

let mockStore: Category[] = withHasChildren(mockCategories.map((c) => ({ ...c })));
let nextMockCategoryId = Math.max(...mockCategories.map((c) => c.category_I), 0) + 1;

function normalizeCategory(raw: Category): Category {
  return {
    category_I: raw.category_I,
    name: raw.name,
    parentCategory_I: raw.parentCategory_I ?? null,
    required: raw.required ?? false,
    archived: raw.archived ?? false,
    hasChildren: raw.hasChildren,
  };
}

/**
 * Get all categories.
 * When USE_API: GET /api/categories
 */
export async function getCategories(
  signal?: AbortSignal,
  activeOnly = false
): Promise<Category[]> {
  if (USE_API) {
    const qs = activeOnly ? "?activeOnly=true" : "";
    const data = await apiJson<Category[]>(
      `/api/categories${qs}`,
      { signal },
      "Failed to fetch categories"
    );
    return withHasChildren(Array.isArray(data) ? data.map(normalizeCategory) : []);
  }
  return [...mockStore];
}

export async function getCategory(id: number): Promise<Category | null> {
  if (USE_API) {
    const data = await apiJson<Category>(
      `/api/categories/${id}`,
      {},
      "Failed to fetch category"
    );
    return data ? normalizeCategory(data) : null;
  }
  return mockStore.find((c) => c.category_I === id) ?? null;
}

function validateMockCreate(input: CreateCategoryInput): string | null {
  if (!input.name.trim()) return "Name is required.";
  if (input.parentCategory_I != null) {
    const parent = mockStore.find((c) => c.category_I === input.parentCategory_I);
    if (!parent) return "Parent category not found.";
    if (parent.parentCategory_I != null) return "Parent must be a top-level category.";
    if (parent.archived) return "Cannot assign to an archived parent.";
  }
  return null;
}

function validateMockDelete(id: number): string | null {
  if (id === 19) return "The Split category cannot be deleted.";
  if (mockStore.some((c) => c.parentCategory_I === id))
    return "Cannot delete a category that has children.";
  return null;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  if (USE_API) {
    const data = await apiJson<Category>(
      "/api/categories",
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          parentCategory_I: input.parentCategory_I ?? null,
          required: input.required ?? false,
        }),
      },
      "Failed to create category"
    );
    if (!data) throw new Error("Failed to create category");
    return normalizeCategory(data);
  }
  const err = validateMockCreate(input);
  if (err) throw new Error(err);
  const cat: Category = {
    category_I: nextMockCategoryId++,
    name: input.name.trim(),
    parentCategory_I: input.parentCategory_I ?? null,
    required: input.required ?? false,
    archived: false,
  };
  mockStore = withHasChildren([...mockStore, cat]);
  return cat;
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput
): Promise<Category> {
  if (USE_API) {
    const data = await apiJson<Category>(
      `/api/categories/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(input),
      },
      "Failed to update category"
    );
    if (!data) throw new Error("Failed to update category");
    return normalizeCategory(data);
  }
  const idx = mockStore.findIndex((c) => c.category_I === id);
  if (idx < 0) throw new Error("Category not found");
  const current = mockStore[idx];
  if (input.archived === true && id === 19) throw new Error("The Split category cannot be archived.");
  if (input.parentCategory_I != null && current.hasChildren)
    throw new Error("Cannot assign a parent to a category that has children.");
  const updated: Category = {
    ...current,
    name: input.name?.trim() ?? current.name,
    parentCategory_I:
      input.clearParent === true
        ? null
        : input.parentCategory_I !== undefined
          ? input.parentCategory_I
          : current.parentCategory_I,
    required: input.required ?? current.required,
    archived: input.archived ?? current.archived,
  };
  mockStore = withHasChildren(mockStore.map((c, i) => (i === idx ? updated : c)));
  return mockStore.find((c) => c.category_I === id)!;
}

export async function deleteCategory(id: number): Promise<void> {
  if (USE_API) {
    await apiJson<void>(
      `/api/categories/${id}`,
      { method: "DELETE" },
      "Failed to delete category"
    );
    return;
  }
  const err = validateMockDelete(id);
  if (err) throw new Error(err);
  mockStore = withHasChildren(mockStore.filter((c) => c.category_I !== id));
}
