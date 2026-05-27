import type { GroupBase } from "react-select";
import type { Category } from "../services/categoryService";

export type CategoryOption = { value: string; label: string };
export type GroupedCategoryOption = GroupBase<CategoryOption>;

export interface BuildCategoryOptionsParams {
  includeNone?: boolean;
  excludeNames?: string[];
  activeOnly?: boolean;
}

export function getCategoryLabel(
  id: number | null | undefined,
  categories: Category[]
): string {
  if (id == null) return "";
  const cat = categories.find((c) => c.category_I === id);
  if (!cat) return String(id);
  if (cat.parentCategory_I != null) {
    const parent = categories.find((c) => c.category_I === cat.parentCategory_I);
    if (parent) return `${parent.name} › ${cat.name}`;
  }
  return cat.name;
}

export function buildGroupedCategoryOptions(
  categories: Category[],
  {
    includeNone = false,
    excludeNames = [],
    activeOnly = true,
  }: BuildCategoryOptionsParams = {}
): (CategoryOption | GroupedCategoryOption)[] {
  const excluded = new Set(excludeNames.map((n) => n.toLowerCase()));
  let list = categories.filter((c) => !excluded.has(c.name.toLowerCase()));
  if (activeOnly) list = list.filter((c) => !c.archived);

  const parentIdsWithActiveChildren = new Set(
    list.filter((c) => c.parentCategory_I != null).map((c) => c.parentCategory_I!)
  );

  const topLevel = list
    .filter((c) => c.parentCategory_I == null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: (CategoryOption | GroupedCategoryOption)[] = [];
  if (includeNone) result.push({ value: "", label: "— None —" });

  for (const parent of topLevel) {
    const children = list
      .filter((c) => c.parentCategory_I === parent.category_I)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (parentIdsWithActiveChildren.has(parent.category_I)) {
      result.push({
        label: parent.name,
        options: [
          { value: String(parent.category_I), label: `${parent.name} (other)` },
          ...children.map((c) => ({
            value: String(c.category_I),
            label: c.name,
          })),
        ],
      });
    } else {
      result.push({ value: String(parent.category_I), label: parent.name });
    }
  }

  return result;
}

export function findCategoryOption(
  options: (CategoryOption | GroupedCategoryOption)[],
  categoryId: number | null | undefined
): CategoryOption | null {
  if (categoryId == null) return null;
  const value = String(categoryId);
  for (const opt of options) {
    if ("options" in opt) {
      const found = opt.options.find((o) => o.value === value);
      if (found) return found;
    } else if (opt.value === value) {
      return opt;
    }
  }
  return null;
}

export function resolveCategorySelectValue(
  options: (CategoryOption | GroupedCategoryOption)[],
  categoryId: number | null | undefined
): CategoryOption | null {
  if (categoryId == null) {
    for (const opt of options) {
      if (!("options" in opt) && opt.value === "") return opt;
    }
    return null;
  }
  return findCategoryOption(options, categoryId);
}

/** Flatten grouped options for width calculations. */
export function flattenCategoryOptionLabels(
  options: (CategoryOption | GroupedCategoryOption)[]
): string[] {
  const labels: string[] = [];
  for (const opt of options) {
    if ("options" in opt) {
      for (const child of opt.options) labels.push(child.label);
    } else {
      labels.push(opt.label);
    }
  }
  return labels;
}
