import { useCallback, useEffect, useMemo, useState } from "react";
import ReactSelect, { SingleValue } from "react-select";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type Category,
} from "../services/categoryService";
import { ApiError } from "../config/api";
import "./CategoriesPage.css";

const SPLIT_CATEGORY_ID = 19;

type ParentOption = { value: string; label: string };

function sortForTree(categories: Category[]): Category[] {
  const topLevel = categories
    .filter((c) => c.parentCategory_I == null)
    .sort((a, b) => a.name.localeCompare(b.name));
  const result: Category[] = [];
  for (const parent of topLevel) {
    result.push(parent);
    const children = categories
      .filter((c) => c.parentCategory_I === parent.category_I)
      .sort((a, b) => a.name.localeCompare(b.name));
    result.push(...children);
  }
  return result;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(true);
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [newRequired, setNewRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parentOptions: ParentOption[] = useMemo(
    () =>
      categories
        .filter(
          (c) =>
            c.parentCategory_I == null &&
            !c.archived &&
            c.category_I !== SPLIT_CATEGORY_ID
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: String(c.category_I), label: c.name })),
    [categories]
  );

  const visibleRows = useMemo(() => {
    const filtered = showArchived
      ? categories
      : categories.filter((c) => !c.archived);
    return sortForTree(filtered);
  }, [categories, showArchived]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCategory({
        name: newName.trim(),
        parentCategory_I: newParentId ? Number(newParentId) : null,
        required: newRequired,
      });
      setNewName("");
      setNewParentId("");
      setNewRequired(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body) {
        setError(String((err.body as { error: string }).error));
      } else {
        setError(err instanceof Error ? err.message : "Failed to create category");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRequired(cat: Category) {
    setError(null);
    try {
      await updateCategory(cat.category_I, { required: !cat.required });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    }
  }

  async function handleToggleArchived(cat: Category) {
    if (cat.category_I === SPLIT_CATEGORY_ID) return;
    setError(null);
    try {
      await updateCategory(cat.category_I, { archived: !cat.archived });
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body) {
        setError(String((err.body as { error: string }).error));
      } else {
        setError(err instanceof Error ? err.message : "Failed to update category");
      }
    }
  }

  async function handleRename(cat: Category, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === cat.name) return;
    setError(null);
    try {
      await updateCategory(cat.category_I, { name: trimmed });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename category");
    }
  }

  async function handleReparent(cat: Category, parentValue: string) {
    setError(null);
    try {
      if (!parentValue) {
        await updateCategory(cat.category_I, { clearParent: true });
      } else {
        await updateCategory(cat.category_I, {
          parentCategory_I: Number(parentValue),
        });
      }
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body) {
        setError(String((err.body as { error: string }).error));
      } else {
        setError(err instanceof Error ? err.message : "Failed to update parent");
      }
    }
  }

  async function handleDelete(cat: Category) {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    setError(null);
    try {
      await deleteCategory(cat.category_I);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body) {
        setError(String((err.body as { error: string }).error));
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete category");
      }
    }
  }

  return (
    <div className="categories-page">
      {error && <div className="categories-page__error">{error}</div>}

      <section className="categories-page__add">
        <p className="categories-page__subtitle">
          Manage expense categories, hierarchy, and budget flags.
        </p>
        <h2>Add category</h2>
        <form className="categories-page__add-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
            required
          />
          <ReactSelect
            classNamePrefix="cat-select"
            isClearable
            isSearchable
            placeholder="Parent (optional)"
            options={parentOptions}
            value={
              newParentId
                ? parentOptions.find((o) => o.value === newParentId) ?? null
                : null
            }
            onChange={(opt: SingleValue<ParentOption>) =>
              setNewParentId(opt?.value ?? "")
            }
            styles={{ container: (base) => ({ ...base, minWidth: 200 }) }}
          />
          <label className="categories-page__checkbox">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
            />
            Required (budget)
          </label>
          <button type="submit" disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <div className="categories-page__toolbar">
        <label className="categories-page__checkbox">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      {loading ? (
        <p>Loading categories…</p>
      ) : (
        <div className="categories-page__table-wrap">
          <table className="categories-page__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th>Required</th>
                <th>Archived</th>
                <th>Has children</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((cat) => {
                const parent = cat.parentCategory_I
                  ? categories.find((c) => c.category_I === cat.parentCategory_I)
                  : null;
                const isChild = cat.parentCategory_I != null;
                return (
                  <tr
                    key={cat.category_I}
                    className={cat.archived ? "categories-page__row--archived" : undefined}
                  >
                    <td>
                      <input
                        className={`categories-page__name-input${isChild ? " categories-page__name-input--child" : ""}`}
                        defaultValue={cat.name}
                        onBlur={(e) => handleRename(cat, e.target.value)}
                      />
                    </td>
                    <td>
                      {cat.category_I === SPLIT_CATEGORY_ID ? (
                        <span>—</span>
                      ) : cat.hasChildren ? (
                        <span>Top-level</span>
                      ) : (
                        <ReactSelect
                          classNamePrefix="cat-select"
                          isClearable
                          isSearchable
                          placeholder="Top-level"
                          options={parentOptions.filter(
                            (o) => o.value !== String(cat.category_I)
                          )}
                          value={
                            cat.parentCategory_I
                              ? parentOptions.find(
                                  (o) => o.value === String(cat.parentCategory_I)
                                ) ?? {
                                  value: String(cat.parentCategory_I),
                                  label: parent?.name ?? String(cat.parentCategory_I),
                                }
                              : null
                          }
                          onChange={(opt: SingleValue<ParentOption>) =>
                            handleReparent(cat, opt?.value ?? "")
                          }
                          styles={{ container: (base) => ({ ...base, minWidth: 160 }) }}
                        />
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={cat.required}
                        onChange={() => handleToggleRequired(cat)}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={cat.archived}
                        disabled={cat.category_I === SPLIT_CATEGORY_ID}
                        onChange={() => handleToggleArchived(cat)}
                      />
                    </td>
                    <td>{cat.hasChildren ? "Yes" : "No"}</td>
                    <td>
                      {cat.category_I !== SPLIT_CATEGORY_ID && (
                        <button
                          type="button"
                          className="categories-page__delete"
                          onClick={() => handleDelete(cat)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
