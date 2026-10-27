import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { ADMIN_TEMPLATES, ADMIN_CREATE_TEMPLATE, ADMIN_UPDATE_TEMPLATE, ADMIN_DELETE_TEMPLATE } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import { Price } from "../../components/guest/Price";
import { TemplateThumbnail } from "../../components/guest/TemplateThumbnail";
import { TEMPLATE_DESIGNS, getDesign } from "../../templates/registry";
import type { TemplateItem } from "../../lib/templates";
import { discountPercent, hasDiscount, isFree } from "../../lib/templates";
import { MasterMultiInput } from "../../components/masters/MasterInputs";
import { MASTER, useMasters } from "../../lib/masters";
import { TemplatePreviewModal, type PreviewTarget } from "../../components/admin/TemplatePreviewModal";

type Filter = "all" | "free" | "premium";
type Sort = "order" | "name" | "price-asc" | "price-desc" | "discount" | "newest";

// Every filter lives in the URL so a refresh or shared link keeps it
const FILTER_DEFAULTS = { q: "", category: "all", status: "all", tag: "", layout: "", theme: "", discount: "", min: "", max: "", sort: "order" };
type Filters = typeof FILTER_DEFAULTS;

const SORT_LABELS: Record<Sort, string> = {
  order: "Sort order", name: "Name (A–Z)", "price-asc": "Price: low to high", "price-desc": "Price: high to low",
  discount: "Biggest discount", newest: "Newest first",
};

const effectivePrice = (t: TemplateItem) => (isFree(t) ? 0 : hasDiscount(t) ? t.discountPrice! : t.originalPrice);
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

interface FormState {
  name: string; slug: string; designKey: string; category: "free" | "premium"; description: string;
  tags: string; originalPrice: string; discountPrice: string; isActive: boolean; sortOrder: string;
}

const EMPTY_FORM: FormState = {
  name: "", slug: "", designKey: TEMPLATE_DESIGNS[0]?.key ?? "", category: "premium", description: "",
  tags: "", originalPrice: "999", discountPrice: "", isActive: true, sortOrder: "0",
};

const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function AdminTemplatesPage() {
  const { data, loading, refetch } = useQuery<any>(ADMIN_TEMPLATES);
  const [createTemplate, { loading: creating }] = useMutation<any>(ADMIN_CREATE_TEMPLATE);
  const [updateTemplate, { loading: updating }] = useMutation<any>(ADMIN_UPDATE_TEMPLATE);
  const [deleteTemplate] = useMutation<any>(ADMIN_DELETE_TEMPLATE);
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(Object.entries(FILTER_DEFAULTS).map(([k, d]) => [k, params.get(k) ?? d])) as Filters;
  const filter = (["all", "free", "premium"].includes(filters.category) ? filters.category : "all") as Filter;
  const setFilters = (patch: Partial<Filters>) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v === FILTER_DEFAULTS[k as keyof Filters]) next.delete(k); else next.set(k, v);
    }
    return next;
  }, { replace: true });
  const setFilter = (category: Filter) => setFilters({ category });
  const clearFilters = () => setParams(filter === "all" ? {} : { category: filter }, { replace: true });
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });
  const [formError, setFormError] = useState("");
  const masters = useMasters([MASTER.templateTag]);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const previewTemplate = (t: TemplateItem) => setPreview({
    name: t.name, designKey: t.designKey, category: t.category, originalPrice: t.originalPrice, discountPrice: t.discountPrice,
    publicSlug: t.isActive ? t.slug : undefined,
  });
  // Previews what is in the form right now, including unsaved changes
  const previewForm = () => setPreview({
    name: form.name, designKey: form.designKey, category: form.category,
    originalPrice: form.category === "free" ? 0 : Number(form.originalPrice || 0),
    discountPrice: form.category === "free" || form.discountPrice === "" ? null : Number(form.discountPrice),
  });

  const templates: TemplateItem[] = useMemo(() => data?.adminTemplates?.data ?? [], [data]);

  // Options come from the templates themselves, so only values that can match are offered
  const tagOptions = useMemo(() => [...new Set(templates.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b)), [templates]);
  const layoutOptions = useMemo(() => [...new Set(templates.map((t) => getDesign(t.designKey).layout))].sort(), [templates]);

  // Everything except the category tab, so tab counts reflect the other filters
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const min = filters.min === "" ? null : Number(filters.min);
    const max = filters.max === "" ? null : Number(filters.max);
    return templates.filter((t) => {
      const design = getDesign(t.designKey);
      if (q && ![t.name, t.slug, t.description, t.designKey, ...t.tags].some((v) => v.toLowerCase().includes(q))) return false;
      if (filters.status === "active" && !t.isActive) return false;
      if (filters.status === "inactive" && t.isActive) return false;
      if (filters.tag && !t.tags.includes(filters.tag)) return false;
      if (filters.layout && design.layout !== filters.layout) return false;
      if (filters.theme === "dark" && !design.theme.dark) return false;
      if (filters.theme === "light" && design.theme.dark) return false;
      if (filters.discount === "yes" && !hasDiscount(t)) return false;
      if (filters.discount === "no" && (hasDiscount(t) || isFree(t))) return false;
      const price = effectivePrice(t);
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      return true;
    });
  }, [templates, filters.q, filters.status, filters.tag, filters.layout, filters.theme, filters.discount, filters.min, filters.max]);

  const visible = useMemo(() => {
    const list = filtered.filter((t) => filter === "all" || t.category === filter);
    const byOrder = (a: TemplateItem, b: TemplateItem) => a.sortOrder - b.sortOrder || a.id - b.id;
    const compare: Record<Sort, (a: TemplateItem, b: TemplateItem) => number> = {
      order: byOrder,
      name: (a, b) => a.name.localeCompare(b.name),
      "price-asc": (a, b) => effectivePrice(a) - effectivePrice(b) || byOrder(a, b),
      "price-desc": (a, b) => effectivePrice(b) - effectivePrice(a) || byOrder(a, b),
      discount: (a, b) => discountPercent(b) - discountPercent(a) || byOrder(a, b),
      newest: (a, b) => b.id - a.id,
    };
    return [...list].sort(compare[(filters.sort in compare ? filters.sort : "order") as Sort]);
  }, [filtered, filter, filters.sort]);

  const activeFilterCount = (["q", "status", "tag", "layout", "theme", "discount", "min", "max"] as (keyof Filters)[])
    .filter((k) => filters[k] !== FILTER_DEFAULTS[k]).length;

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(""); setModalOpen(true); };
  const openEdit = (t: TemplateItem) => {
    setEditing(t);
    setForm({
      name: t.name, slug: t.slug, designKey: t.designKey, category: t.category, description: t.description,
      tags: t.tags.join(", "), originalPrice: String(t.originalPrice), discountPrice: t.discountPrice === null ? "" : String(t.discountPrice),
      isActive: t.isActive, sortOrder: String(t.sortOrder),
    });
    setFormError("");
    setModalOpen(true);
  };

  const toInput = (f: FormState) => ({
    name: f.name, slug: f.slug, designKey: f.designKey, category: f.category, description: f.description,
    tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    originalPrice: f.category === "free" ? 0 : Number(f.originalPrice || 0),
    discountPrice: f.category === "free" || f.discountPrice === "" ? null : Number(f.discountPrice),
    isActive: f.isActive, sortOrder: Number(f.sortOrder || 0),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      const input = toInput(form);
      const { data } = editing
        ? await updateTemplate({ variables: { id: editing.id, input } })
        : await createTemplate({ variables: { input } });
      const res = editing ? data.adminUpdateTemplate : data.adminCreateTemplate;
      if (res.status !== 1) { setFormError(res.message); return; }
      setModalOpen(false);
      setAlert({ type: "success", message: res.message });
      refetch();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const toggleActive = async (t: TemplateItem) => {
    const { __typename, id, createdAt, ...rest } = t as any;
    const { data } = await updateTemplate({ variables: { id, input: { ...rest, isActive: !t.isActive } } });
    setAlert({ type: data.adminUpdateTemplate.status === 1 ? "success" : "error", message: data.adminUpdateTemplate.message });
    refetch();
  };

  const handleDelete = async (t: TemplateItem) => {
    if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    const { data } = await deleteTemplate({ variables: { id: t.id } });
    setAlert({ type: data.adminDeleteTemplate.status === 1 ? "success" : "error", message: data.adminDeleteTemplate.message });
    refetch();
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const counts = { all: filtered.length, free: filtered.filter((t) => t.category === "free").length, premium: filtered.filter((t) => t.category === "premium").length };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Templates</h1>
          <p className="text-muted">Manage the templates guests can browse, their category and pricing.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New template</button>
      </div>
      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className="tabs">
        {(["all", "free", "premium"] as Filter[]).map((f) => (
          <button key={f} className={`tab${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "free" ? "Free Version" : "Premium Version"} ({counts[f]})
          </button>
        ))}
      </div>

      <div className="tpl-filters">
        <input className="tpl-filter-search" type="search" placeholder="Search name, slug, description or tag" value={filters.q}
          onChange={(e) => setFilters({ q: e.target.value })} aria-label="Search templates" />
        <select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="active">Visible to guests</option>
          <option value="inactive">Hidden</option>
        </select>
        <select value={filters.tag} onChange={(e) => setFilters({ tag: e.target.value })} aria-label="Tag">
          <option value="">All tags</option>
          {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
        </select>
        <select value={filters.layout} onChange={(e) => setFilters({ layout: e.target.value })} aria-label="Layout">
          <option value="">All layouts</option>
          {layoutOptions.map((l) => <option key={l} value={l}>{capitalize(l)}</option>)}
        </select>
        <select value={filters.theme} onChange={(e) => setFilters({ theme: e.target.value })} aria-label="Theme">
          <option value="">Light & dark</option>
          <option value="light">Light theme</option>
          <option value="dark">Dark theme</option>
        </select>
        <select value={filters.discount} onChange={(e) => setFilters({ discount: e.target.value })} aria-label="Discount">
          <option value="">Any pricing</option>
          <option value="yes">Discounted</option>
          <option value="no">Full price</option>
        </select>
        <div className="tpl-filter-price">
          <input type="number" min="0" placeholder="Min ₹" value={filters.min} onChange={(e) => setFilters({ min: e.target.value })} aria-label="Minimum price" />
          <span>–</span>
          <input type="number" min="0" placeholder="Max ₹" value={filters.max} onChange={(e) => setFilters({ max: e.target.value })} aria-label="Maximum price" />
        </div>
        <select value={filters.sort} onChange={(e) => setFilters({ sort: e.target.value })} aria-label="Sort by">
          {(Object.keys(SORT_LABELS) as Sort[]).map((s) => <option key={s} value={s}>{SORT_LABELS[s]}</option>)}
        </select>
      </div>
      <div className="tpl-filter-summary">
        <span className="text-muted">Showing {visible.length} of {templates.length} templates</span>
        {activeFilterCount > 0 && (
          <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}</button>
        )}
      </div>

      {loading ? <p>Loading...</p> : (
        <div className="admin-tpl-grid">
          {visible.map((t) => (
            <div key={t.id} className={`admin-tpl-card${t.isActive ? "" : " inactive"}`}>
              <button type="button" className="admin-tpl-thumb admin-tpl-thumb-btn" onClick={() => previewTemplate(t)} aria-label={`Preview ${t.name}`}>
                <TemplateThumbnail designKey={t.designKey} />
                <span className="admin-tpl-thumb-hint">Preview</span>
              </button>
              <div className="admin-tpl-body">
                <div className="admin-tpl-title">
                  <strong>{t.name}</strong>
                  <span className={`badge badge-inline ${t.category === "free" ? "badge-free" : "badge-premium"}`}>{t.category === "free" ? "Free" : "Premium"}</span>
                </div>
                <Price template={t} />
                <small className="text-muted">/{t.slug} · design: {t.designKey} · order {t.sortOrder}</small>
                <div className="admin-tpl-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => previewTemplate(t)}>Preview</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(t)}>Edit</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(t)}>{t.isActive ? "Deactivate" : "Activate"}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {visible.length === 0 && <p className="empty-state">{activeFilterCount > 0 ? "No templates match these filters." : "No templates in this category."}</p>}
        </div>
      )}

      <Modal title={editing ? `Edit ${editing.name}` : "New template"} isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <Alert type="error" message={formError} onDismiss={() => setFormError("")} />
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input value={form.name} required onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label>Slug *</label>
              <input value={form.slug} required onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Design *</label>
              <select value={form.designKey} onChange={set("designKey")}>
                {TEMPLATE_DESIGNS.map((d) => <option key={d.key} value={d.key}>{d.name} ({d.layout})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={form.category} onChange={set("category")}>
                <option value="free">Free Version</option>
                <option value="premium">Premium Version</option>
              </select>
            </div>
          </div>
          <div className="admin-design-preview">
            <TemplateThumbnail designKey={form.designKey} aspect={0.5} />
            <button type="button" className="btn btn-sm btn-primary admin-design-preview-btn" onClick={previewForm}>Full preview</button>
          </div>
          {form.category === "premium" && (
            <div className="form-row">
              <div className="form-group">
                <label>Original price (₹) *</label>
                <input type="number" min="1" step="1" required value={form.originalPrice} onChange={set("originalPrice")} />
              </div>
              <div className="form-group">
                <label>Discount price (₹)</label>
                <input type="number" min="0" step="1" value={form.discountPrice} onChange={set("discountPrice")} placeholder="Leave empty for no discount" />
              </div>
            </div>
          )}
          {form.category === "premium" && (
            <div className="form-group">
              <label>Card preview</label>
              <Price template={{ category: form.category, originalPrice: Number(form.originalPrice || 0), discountPrice: form.discountPrice === "" ? null : Number(form.discountPrice) }} />
            </div>
          )}
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={set("description")} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <MasterMultiInput value={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} options={masters.options(MASTER.templateTag)} placeholder="Leadership, Finance" maxSuggestions={10} />
            </div>
            <div className="form-group">
              <label>Sort order</label>
              <input type="number" value={form.sortOrder} onChange={set("sortOrder")} />
            </div>
          </div>
          <div className="form-group form-check">
            <label><input type="checkbox" checked={form.isActive} onChange={set("isActive")} /> Visible to guests</label>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={creating || updating}>{editing ? "Save changes" : "Create template"}</button>
        </form>
      </Modal>

      <TemplatePreviewModal key={preview?.designKey ?? "none"} target={preview} onClose={closePreview} />
    </div>
  );
}
