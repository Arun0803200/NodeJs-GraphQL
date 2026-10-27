import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  ADMIN_MASTER_TYPES, ADMIN_CREATE_MASTER_TYPE, ADMIN_UPDATE_MASTER_TYPE, ADMIN_DELETE_MASTER_TYPE,
  ADMIN_MASTER_VALUES, ADMIN_CREATE_MASTER_VALUE, ADMIN_UPDATE_MASTER_VALUE, ADMIN_SET_MASTER_VALUES_ACTIVE,
  ADMIN_DELETE_MASTER_VALUES, ADMIN_BULK_ADD_MASTER_VALUES, ADMIN_REORDER_MASTER_VALUES,
} from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { Modal } from "../../components/ui/Modal";
import type { MasterOption } from "../../lib/masters";

interface MasterTypeRow {
  id: number; code: string; name: string; description: string; parentTypeId: number | null; parentTypeCode: string | null;
  isSystem: boolean; isActive: boolean; sortOrder: number; valueCount: number; activeCount: number;
}

type StatusFilter = "all" | "active" | "inactive";

const EMPTY_TYPE = { code: "", name: "", description: "", parentTypeId: "", isActive: true, sortOrder: "0" };
const EMPTY_VALUE = { label: "", code: "", description: "", parentId: "", isActive: true, sortOrder: "" };

const toTypeCode = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^[^a-z]+/, "");

export function AdminMastersPage() {
  const { data: typesData, loading: typesLoading, refetch: refetchTypes } = useQuery<any>(ADMIN_MASTER_TYPES, { fetchPolicy: "cache-and-network" });
  const types: MasterTypeRow[] = typesData?.adminMasterTypes?.data ?? [];

  const [pickedId, setPickedId] = useState<number | null>(null);
  // Fall back to the first master until the admin picks one (or after the picked one is deleted)
  const selectedId = types.some((t) => t.id === pickedId) ? pickedId : types[0]?.id ?? null;
  const selected = types.find((t) => t.id === selectedId) ?? null;
  const parentType = selected?.parentTypeId ? types.find((t) => t.id === selected.parentTypeId) ?? null : null;

  const [typeSearch, setTypeSearch] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setChecked(new Set()); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Changing the master or filter starts a fresh selection
  const selectType = (id: number | null) => { setPickedId(id); setChecked(new Set()); };
  const changeStatus = (s: StatusFilter) => { setStatus(s); setChecked(new Set()); };

  const { data: valuesData, loading: valuesLoading, refetch: refetchValues } = useQuery<any>(ADMIN_MASTER_VALUES, {
    variables: { typeId: selectedId ?? 0, search: debouncedSearch || null, status: status === "all" ? null : status },
    skip: selectedId === null,
    fetchPolicy: "cache-and-network",
  });
  const values: MasterOption[] = valuesData?.adminMasterValues?.data ?? [];

  // Parent options for values of a child master (e.g. skill -> skill category)
  const { data: parentData } = useQuery<any>(ADMIN_MASTER_VALUES, {
    variables: { typeId: parentType?.id ?? 0 },
    skip: !parentType,
  });
  const parentOptions: MasterOption[] = parentData?.adminMasterValues?.data ?? [];

  const [createType, { loading: creatingType }] = useMutation<any>(ADMIN_CREATE_MASTER_TYPE);
  const [updateType, { loading: updatingType }] = useMutation<any>(ADMIN_UPDATE_MASTER_TYPE);
  const [deleteType] = useMutation<any>(ADMIN_DELETE_MASTER_TYPE);
  const [createValue, { loading: creatingValue }] = useMutation<any>(ADMIN_CREATE_MASTER_VALUE);
  const [updateValue, { loading: updatingValue }] = useMutation<any>(ADMIN_UPDATE_MASTER_VALUE);
  const [setActive] = useMutation<any>(ADMIN_SET_MASTER_VALUES_ACTIVE);
  const [deleteValues] = useMutation<any>(ADMIN_DELETE_MASTER_VALUES);
  const [bulkAdd, { loading: bulkAdding }] = useMutation<any>(ADMIN_BULK_ADD_MASTER_VALUES);
  const [reorder] = useMutation<any>(ADMIN_REORDER_MASTER_VALUES);

  const refreshAll = () => { refetchValues(); refetchTypes(); };
  const report = (res: { status: number; message: string }) => {
    setAlert({ type: res.status === 1 ? "success" : "error", message: res.message });
    return res.status === 1;
  };

  // ── Master type modal ──
  const [typeModal, setTypeModal] = useState<{ open: boolean; editing: MasterTypeRow | null }>({ open: false, editing: null });
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE);
  const [typeError, setTypeError] = useState("");

  const openTypeModal = (editing: MasterTypeRow | null) => {
    setTypeForm(editing ? {
      code: editing.code, name: editing.name, description: editing.description,
      parentTypeId: editing.parentTypeId ? String(editing.parentTypeId) : "", isActive: editing.isActive, sortOrder: String(editing.sortOrder),
    } : EMPTY_TYPE);
    setTypeError("");
    setTypeModal({ open: true, editing });
  };

  const submitType = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      code: typeForm.code, name: typeForm.name, description: typeForm.description,
      parentTypeId: typeForm.parentTypeId ? Number(typeForm.parentTypeId) : null,
      isActive: typeForm.isActive, sortOrder: Number(typeForm.sortOrder || 0),
    };
    try {
      const editing = typeModal.editing;
      if (editing && input.parentTypeId !== editing.parentTypeId && editing.valueCount > 0
        && !window.confirm("Changing the parent master clears the parent of every value in this master. Continue?")) return;
      const { data } = editing
        ? await updateType({ variables: { id: editing.id, input } })
        : await createType({ variables: { input } });
      const res = editing ? data.adminUpdateMasterType : data.adminCreateMasterType;
      if (res.status !== 1) { setTypeError(res.message); return; }
      setTypeModal({ open: false, editing: null });
      report(res);
      await refetchTypes();
      if (!editing && res.data?.id) selectType(res.data.id);
      else refetchValues();
    } catch (err: any) { setTypeError(err.message); }
  };

  const removeType = async (t: MasterTypeRow) => {
    if (!window.confirm(`Delete the "${t.name}" master and all ${t.valueCount} of its values? This cannot be undone.`)) return;
    const { data } = await deleteType({ variables: { id: t.id } });
    if (report(data.adminDeleteMasterType)) { selectType(null); refetchTypes(); }
  };

  const toggleTypeActive = async (t: MasterTypeRow) => {
    const { data } = await updateType({ variables: { id: t.id, input: {
      code: t.code, name: t.name, description: t.description, parentTypeId: t.parentTypeId, isActive: !t.isActive, sortOrder: t.sortOrder,
    } } });
    if (report(data.adminUpdateMasterType)) refetchTypes();
  };

  // ── Value modal ──
  const [valueModal, setValueModal] = useState<{ open: boolean; editing: MasterOption | null }>({ open: false, editing: null });
  const [valueForm, setValueForm] = useState(EMPTY_VALUE);
  const [valueError, setValueError] = useState("");

  const openValueModal = (editing: MasterOption | null) => {
    setValueForm(editing ? {
      label: editing.label, code: editing.code, description: editing.description,
      parentId: editing.parentId ? String(editing.parentId) : "", isActive: editing.isActive, sortOrder: String(editing.sortOrder),
    } : EMPTY_VALUE);
    setValueError("");
    setValueModal({ open: true, editing });
  };

  const submitValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const input = {
      label: valueForm.label, code: valueForm.code || null, description: valueForm.description,
      parentId: valueForm.parentId ? Number(valueForm.parentId) : null, isActive: valueForm.isActive,
      sortOrder: valueForm.sortOrder === "" ? null : Number(valueForm.sortOrder),
    };
    try {
      const editing = valueModal.editing;
      const { data } = editing
        ? await updateValue({ variables: { id: editing.id, input } })
        : await createValue({ variables: { typeId: selected.id, input } });
      const res = editing ? data.adminUpdateMasterValue : data.adminCreateMasterValue;
      if (res.status !== 1) { setValueError(res.message); return; }
      setValueModal({ open: false, editing: null });
      report(res);
      refreshAll();
    } catch (err: any) { setValueError(err.message); }
  };

  // ── Bulk add modal ──
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkParent, setBulkParent] = useState("");
  const bulkLabels = useMemo(() => bulkText.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean), [bulkText]);

  const submitBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || bulkLabels.length === 0) return;
    const { data } = await bulkAdd({ variables: { typeId: selected.id, labels: bulkLabels, parentId: bulkParent ? Number(bulkParent) : null } });
    if (report(data.adminBulkAddMasterValues)) { setBulkOpen(false); setBulkText(""); setBulkParent(""); refreshAll(); }
  };

  // ── Row and bulk actions ──
  const runOnIds = async (ids: number[], action: "activate" | "deactivate" | "delete") => {
    if (ids.length === 0) return;
    if (action === "delete" && !window.confirm(`Delete ${ids.length} value(s)? Users who already picked them keep their text.`)) return;
    const { data } = action === "delete"
      ? await deleteValues({ variables: { ids } })
      : await setActive({ variables: { ids, isActive: action === "activate" } });
    report(action === "delete" ? data.adminDeleteMasterValues : data.adminSetMasterValuesActive);
    setChecked(new Set());
    refreshAll();
  };

  // Reordering only makes sense on the full, unfiltered list
  const canReorder = !debouncedSearch && status === "all";
  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    const { data } = await reorder({ variables: { items: next.map((v, i) => ({ id: v.id, sortOrder: i + 1 })) } });
    if (data.adminReorderMasterValues.status !== 1) report(data.adminReorderMasterValues);
    refetchValues();
  };

  const toggleCheck = (id: number) => setChecked((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allChecked = values.length > 0 && values.every((v) => checked.has(v.id));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(values.map((v) => v.id)));

  const visibleTypes = types.filter((t) => !typeSearch || `${t.name} ${t.code}`.toLowerCase().includes(typeSearch.toLowerCase()));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Masters</h1>
          <p className="text-muted">Manage the lookup lists used across the app. Forms load these from the API, so changes show up right away.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openTypeModal(null)}>+ New master</button>
      </div>
      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className="masters-layout">
        <aside className="masters-types">
          <input className="masters-search" placeholder="Search masters" value={typeSearch} onChange={(e) => setTypeSearch(e.target.value)} />
          {typesLoading && types.length === 0 ? <p className="text-muted">Loading...</p> : (
            <ul>
              {visibleTypes.map((t) => (
                <li key={t.id}>
                  <button className={`masters-type${t.id === selectedId ? " active" : ""}${t.isActive ? "" : " inactive"}`} onClick={() => selectType(t.id)}>
                    <span className="masters-type-name">{t.name}</span>
                    <span className="masters-type-meta">
                      <code>{t.code}</code>
                      <span>{t.activeCount}/{t.valueCount}</span>
                    </span>
                  </button>
                </li>
              ))}
              {visibleTypes.length === 0 && <li className="text-muted masters-empty">No masters match.</li>}
            </ul>
          )}
        </aside>

        <section className="masters-values">
          {!selected ? <p className="empty-state">Select a master to manage its values.</p> : (
            <>
              <div className="masters-values-header">
                <div>
                  <h2>
                    {selected.name}
                    {selected.isSystem && <span className="pill pill-system">System</span>}
                    {!selected.isActive && <span className="pill pill-off">Inactive</span>}
                  </h2>
                  <p className="text-muted">
                    <code>{selected.code}</code>
                    {parentType && <> · grouped by <strong>{parentType.name}</strong></>}
                    {selected.description && <> · {selected.description}</>}
                  </p>
                </div>
                <div className="masters-header-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => openTypeModal(selected)}>Edit master</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => toggleTypeActive(selected)}>{selected.isActive ? "Deactivate" : "Activate"}</button>
                  {!selected.isSystem && <button className="btn btn-sm btn-danger" onClick={() => removeType(selected)}>Delete</button>}
                </div>
              </div>

              <div className="masters-toolbar">
                <input className="masters-search" placeholder={`Search ${selected.name.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="masters-status">
                  {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
                    <button key={s} className={`tab${status === s ? " active" : ""}`} onClick={() => changeStatus(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
                  ))}
                </div>
                <div className="masters-toolbar-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => setBulkOpen(true)}>Bulk add</button>
                  <button className="btn btn-sm btn-primary" onClick={() => openValueModal(null)}>+ Add value</button>
                </div>
              </div>

              {checked.size > 0 && (
                <div className="masters-bulkbar">
                  <span>{checked.size} selected</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => runOnIds([...checked], "activate")}>Activate</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => runOnIds([...checked], "deactivate")}>Deactivate</button>
                  <button className="btn btn-sm btn-danger" onClick={() => runOnIds([...checked], "delete")}>Delete</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setChecked(new Set())}>Clear</button>
                </div>
              )}

              {valuesLoading && values.length === 0 ? <p>Loading...</p> : values.length === 0 ? (
                <p className="empty-state">{debouncedSearch || status !== "all" ? "No values match these filters." : "No values yet. Add one or use Bulk add."}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table masters-table">
                    <thead>
                      <tr>
                        <th className="col-check"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th>
                        <th>Label</th>
                        <th>Code</th>
                        {parentType && <th>{parentType.name}</th>}
                        <th>Status</th>
                        <th>Order</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {values.map((v, i) => (
                        <tr key={v.id} className={v.isActive ? "" : "row-inactive"}>
                          <td className="col-check"><input type="checkbox" checked={checked.has(v.id)} onChange={() => toggleCheck(v.id)} aria-label={`Select ${v.label}`} /></td>
                          <td title={v.description || v.label}><strong>{v.label}</strong>{v.description && <small className="masters-desc">{v.description}</small>}</td>
                          <td><code>{v.code}</code></td>
                          {parentType && <td>{v.parentLabel ?? "—"}</td>}
                          <td><span className={`pill ${v.isActive ? "pill-on" : "pill-off"}`}>{v.isActive ? "Active" : "Inactive"}</span></td>
                          <td className="col-order">
                            {canReorder ? (
                              <>
                                <button className="order-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                                <button className="order-btn" disabled={i === values.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                              </>
                            ) : v.sortOrder}
                          </td>
                          <td className="actions-cell">
                            <button className="btn btn-sm btn-secondary" onClick={() => openValueModal(v)}>Edit</button>
                            <button className="btn btn-sm btn-secondary" onClick={() => runOnIds([v.id], v.isActive ? "deactivate" : "activate")}>{v.isActive ? "Deactivate" : "Activate"}</button>
                            <button className="btn btn-sm btn-danger" onClick={() => runOnIds([v.id], "delete")}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Modal title={typeModal.editing ? `Edit ${typeModal.editing.name}` : "New master"} isOpen={typeModal.open} onClose={() => setTypeModal({ open: false, editing: null })}>
        <form onSubmit={submitType}>
          <Alert type="error" message={typeError} onDismiss={() => setTypeError("")} />
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input value={typeForm.name} required onChange={(e) => {
                const name = e.target.value;
                setTypeForm((f) => ({ ...f, name, code: typeModal.editing ? f.code : toTypeCode(name) }));
              }} placeholder="e.g. Languages" />
            </div>
            <div className="form-group">
              <label>Code *</label>
              <input value={typeForm.code} required disabled={typeModal.editing?.isSystem} onChange={(e) => setTypeForm((f) => ({ ...f, code: toTypeCode(e.target.value) }))} placeholder="languages" />
              {typeModal.editing?.isSystem && <small className="text-muted">System master codes are used by the app and cannot change.</small>}
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={typeForm.description} onChange={(e) => setTypeForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Parent master</label>
              <select value={typeForm.parentTypeId} onChange={(e) => setTypeForm((f) => ({ ...f, parentTypeId: e.target.value }))}>
                <option value="">None</option>
                {types.filter((t) => t.id !== typeModal.editing?.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <small className="text-muted">Lets each value be grouped under a value of another master.</small>
            </div>
            <div className="form-group">
              <label>Sort order</label>
              <input type="number" value={typeForm.sortOrder} onChange={(e) => setTypeForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </div>
          <div className="form-group form-check">
            <label><input type="checkbox" checked={typeForm.isActive} onChange={(e) => setTypeForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active (served to forms)</label>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={creatingType || updatingType}>{typeModal.editing ? "Save changes" : "Create master"}</button>
        </form>
      </Modal>

      <Modal title={valueModal.editing ? `Edit ${valueModal.editing.label}` : `Add to ${selected?.name ?? ""}`} isOpen={valueModal.open} onClose={() => setValueModal({ open: false, editing: null })}>
        <form onSubmit={submitValue}>
          <Alert type="error" message={valueError} onDismiss={() => setValueError("")} />
          <div className="form-row">
            <div className="form-group">
              <label>Label *</label>
              <input value={valueForm.label} required onChange={(e) => setValueForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Code</label>
              <input value={valueForm.code} onChange={(e) => setValueForm((f) => ({ ...f, code: e.target.value }))} placeholder="Generated from the label" />
            </div>
          </div>
          {parentType && (
            <div className="form-group">
              <label>{parentType.name}</label>
              <select value={valueForm.parentId} onChange={(e) => setValueForm((f) => ({ ...f, parentId: e.target.value }))}>
                <option value="">None</option>
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.label}{p.isActive ? "" : " (inactive)"}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Description</label>
            <textarea rows={2} value={valueForm.description} onChange={(e) => setValueForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Sort order</label>
              <input type="number" value={valueForm.sortOrder} onChange={(e) => setValueForm((f) => ({ ...f, sortOrder: e.target.value }))} placeholder="Last" />
            </div>
            <div className="form-group form-check masters-check">
              <label><input type="checkbox" checked={valueForm.isActive} onChange={(e) => setValueForm((f) => ({ ...f, isActive: e.target.checked }))} /> Active</label>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={creatingValue || updatingValue}>{valueModal.editing ? "Save changes" : "Add value"}</button>
        </form>
      </Modal>

      <Modal title={`Bulk add to ${selected?.name ?? ""}`} isOpen={bulkOpen} onClose={() => setBulkOpen(false)}>
        <form onSubmit={submitBulk}>
          <div className="form-group">
            <label>Values (one per line or comma separated)</label>
            <textarea rows={8} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={"Rust\nKotlin\nSvelte"} />
            <small className="text-muted">{bulkLabels.length} value(s). Existing values are skipped.</small>
          </div>
          {parentType && (
            <div className="form-group">
              <label>{parentType.name} for all</label>
              <select value={bulkParent} onChange={(e) => setBulkParent(e.target.value)}>
                <option value="">None</option>
                {parentOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full" disabled={bulkAdding || bulkLabels.length === 0}>Add {bulkLabels.length || ""} value(s)</button>
        </form>
      </Modal>
    </div>
  );
}
