import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { ADMIN_CREATE_USER, ADMIN_SET_USERS_ACTIVE, ADMIN_SET_USER_ROLE, ADMIN_USERS } from "../../api/queries";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";
import { MasterTextInput } from "../../components/masters/MasterInputs";
import { MASTER, useMasters } from "../../lib/masters";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime, timeAgo } from "../../components/charts/format";
import { downloadCsv } from "../../lib/analytics";

interface UserRow {
  id: number; userUuid: string; fullName: string; userName: string; designation: string; email: string; mobileNo: string | null;
  role: string; isActive: boolean; siteStatus: string; isPublished: boolean; templateName: string | null; imageCount: number;
  sectionsFilled: number; lastActiveAt: string | null; createdAt: string;
}

const SECTIONS_TOTAL = 7;
const PAGE_SIZES = [10, 20, 50, 100];
const DEFAULTS = { q: "", role: "", status: "", website: "", joined: "", profile: "", sort: "joined", dir: "desc", page: "1", size: "20" };
type Filters = typeof DEFAULTS;
const FILTER_KEYS: (keyof Filters)[] = ["q", "role", "status", "website", "joined", "profile"];

const WEBSITE: Record<string, { label: string; tone: string }> = {
  published: { label: "Live", tone: "on" },
  pending: { label: "Awaiting approval", tone: "warn" },
  rejected: { label: "Changes requested", tone: "bad" },
  approved: { label: "Approved", tone: "on" },
  draft: { label: "Draft", tone: "off" },
  none: { label: "No website", tone: "off" },
};

const EMPTY_FORM = { fullName: "", userName: "", designation: "", email: "", mobileNo: "", password: "", role: "user" };

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
// Stable avatar tint per user so people are easy to spot across pages
const AVATAR_TINTS = ["#e0e7ff", "#dcfce7", "#fef3c7", "#fce7f3", "#e0f2fe", "#ede9fe", "#ffedd5"];
const tintFor = (uuid: string) => AVATAR_TINTS[[...uuid].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_TINTS.length];
const websiteKey = (u: UserRow) => (u.isPublished ? "published" : u.siteStatus);

export function AdminUsersPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(Object.entries(DEFAULTS).map(([k, d]) => [k, params.get(k) ?? d])) as Filters;
  const page = Math.max(1, Number(f.page) || 1);
  const size = PAGE_SIZES.includes(Number(f.size)) ? Number(f.size) : 20;

  const [search, setSearch] = useState(f.q);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });
  // Open row menu and where to draw it (fixed to the viewport so the scrolling table can't clip it)
  const [menu, setMenu] = useState<{ uuid: string; top: number; right: number; up: boolean } | null>(null);
  const menuFor = menu?.uuid ?? null;
  const setMenuFor = (uuid: null) => setMenu(uuid);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const masters = useMasters([MASTER.designation]);

  const setFilters = (patch: Partial<Filters>) => {
    setChecked(new Set());
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!("page" in patch)) next.delete("page");
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === DEFAULTS[key as keyof Filters]) next.delete(key); else next.set(key, value);
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (search === f.q) return;
    const t = setTimeout(() => setFilters({ q: search }), 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close the row menu on any outside click
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuFor) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null); };
    const dismiss = () => setMenu(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [menuFor]);

  const filterVars = {
    search: f.q || null, role: f.role || null, status: f.status || null, website: f.website || null,
    joined: f.joined || null, profile: f.profile || null, sort: f.sort, direction: f.dir,
  };
  const { data, previousData, loading, refetch } = useQuery<any>(ADMIN_USERS, {
    variables: { filter: { ...filterVars, limit: size, offset: (page - 1) * size } },
    notifyOnNetworkStatusChange: true,
  });
  const res = (data ?? previousData)?.adminUsers;
  const rows: UserRow[] = res?.data ?? [];
  const total: number = res?.total ?? 0;
  const s = res?.summary;
  const pages = Math.max(1, Math.ceil(total / size));
  const activeFilterCount = FILTER_KEYS.filter((k) => f[k]).length;

  const [createUser, { loading: creating }] = useMutation<any>(ADMIN_CREATE_USER);
  const [setActive] = useMutation<any>(ADMIN_SET_USERS_ACTIVE);
  const [setRole] = useMutation<any>(ADMIN_SET_USER_ROLE);

  const report = (r: { status: number; message: string }) => {
    setAlert({ type: r.status === 1 ? "success" : "error", message: r.message });
    return r.status === 1;
  };

  const changeActive = async (uuids: string[], isActive: boolean) => {
    if (uuids.length === 0) return;
    if (!isActive && !window.confirm(`Deactivate ${uuids.length === 1 ? "this user" : `${uuids.length} users`}? They will be signed out and unable to sign in until reactivated.`)) return;
    const { data } = await setActive({ variables: { uuids, isActive } });
    if (report(data.adminSetUsersActive)) { setChecked(new Set()); refetch(); }
  };

  const changeRole = async (u: UserRow, role: string) => {
    if (!window.confirm(role === "admin" ? `Give ${u.fullName} full admin access?` : `Remove admin access from ${u.fullName}?`)) return;
    const { data } = await setRole({ variables: { uuid: u.userUuid, role } });
    if (report(data.adminSetUserRole)) refetch();
  };

  const toggleSort = (key: string) => {
    if (f.sort === key) setFilters({ dir: f.dir === "asc" ? "desc" : "asc" });
    else setFilters({ sort: key, dir: key === "name" || key === "email" ? "asc" : "desc" });
  };
  const sortHeader = (key: string, label: string, className = "") => (
    <th className={`sortable ${className}`} aria-sort={f.sort === key ? (f.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => toggleSort(key)}>
        {label} <span className="sort-arrow" aria-hidden="true">{f.sort === key ? (f.dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  const toggleCheck = (uuid: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
    return next;
  });
  const allChecked = rows.length > 0 && rows.every((r) => checked.has(r.userUuid));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(rows.map((r) => r.userUuid)));

  const csvRows = (list: UserRow[]) => list.map((u) => [
    u.fullName, u.userName, u.email, u.mobileNo, u.designation, u.role, u.isActive ? "Active" : "Inactive",
    WEBSITE[websiteKey(u)]?.label, u.templateName, `${u.sectionsFilled}/${SECTIONS_TOTAL}`, u.imageCount, u.lastActiveAt, u.createdAt,
  ]);
  const CSV_HEADER = ["Name", "Username", "Email", "Mobile", "Designation", "Role", "Status", "Website", "Template", "Sections filled", "Images", "Last active", "Joined"];

  // Exports every user matching the filters, not just this page
  const exportAll = async () => {
    setExporting(true);
    try {
      const { data } = await client.query<any>({ query: ADMIN_USERS, variables: { filter: { ...filterVars, limit: 1000, offset: 0 } }, fetchPolicy: "network-only" });
      downloadCsv(`users-${new Date().toISOString().slice(0, 10)}.csv`, CSV_HEADER, csvRows(data.adminUsers.data));
    } finally {
      setExporting(false);
    }
  };
  const exportSelected = () => downloadCsv(`users-selected-${new Date().toISOString().slice(0, 10)}.csv`, CSV_HEADER, csvRows(rows.filter((r) => checked.has(r.userUuid))));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (form.password.length < 8) { setFormError("Password must be at least 8 characters"); return; }
    if (form.mobileNo && !/^\d{10}$/.test(form.mobileNo)) { setFormError("Mobile number must be 10 digits"); return; }
    try {
      const { data } = await createUser({ variables: { ...form, userName: form.userName || null, mobileNo: form.mobileNo || null } });
      if (data.adminCreateUser.status !== 1) { setFormError(data.adminCreateUser.message); return; }
      setShowCreate(false);
      setForm(EMPTY_FORM);
      report({ status: 1, message: `${data.adminCreateUser.data?.fullName ?? "User"} created` });
      refetch();
    } catch (err: any) {
      setFormError(err.message);
    }
  };
  const setField = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((x) => ({ ...x, [key]: e.target.value }));

  const quick = (patch: Partial<Filters>, label: string, value: number | undefined, hint: string) => {
    const active = Object.entries(patch).every(([k, v]) => f[k as keyof Filters] === v) && activeFilterCount === Object.keys(patch).length;
    return (
      <button type="button" className={`user-stat${active ? " active" : ""}`}
        onClick={() => { setSearch(""); setParams(active ? {} : Object.fromEntries(Object.entries(patch)) as Record<string, string>, { replace: true }); setChecked(new Set()); }}>
        <strong>{value ?? "—"}</strong><span>{label}</span><small>{hint}</small>
      </button>
    );
  };

  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="text-muted">Manage accounts, roles and access. Click a row to see the full profile and portfolio.</p>
        </div>
        <div className="log-actions">
          <button className="btn btn-secondary" onClick={exportAll} disabled={exporting || total === 0}>{exporting ? "Exporting…" : "Export CSV"}</button>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormError(""); setShowCreate(true); }}>+ Create user</button>
        </div>
      </div>

      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className="user-stats">
        {quick({}, "All users", s?.total, `${s?.activeLast7Days ?? 0} active this week`)}
        {quick({ status: "active" }, "Active", s?.active, "Can sign in")}
        {quick({ status: "inactive" }, "Deactivated", s?.inactive, "Sign-in blocked")}
        {quick({ role: "admin" }, "Admins", s?.admins, "Full access")}
        {quick({ joined: "30d" }, "New", s?.newLast30Days, "Last 30 days")}
        {quick({ website: "published" }, "Live websites", s?.published, `${s?.pendingApproval ?? 0} awaiting approval`)}
      </div>

      <div className="user-toolbar">
        <input type="search" className="user-search" placeholder="Search name, username, email, mobile or designation" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        <select value={f.role} onChange={(e) => setFilters({ role: e.target.value })} aria-label="Role">
          <option value="">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
        <select value={f.status} onChange={(e) => setFilters({ status: e.target.value })} aria-label="Account status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
        <select value={f.website} onChange={(e) => setFilters({ website: e.target.value })} aria-label="Website">
          <option value="">Any website</option>
          <option value="published">Live</option>
          <option value="pending">Awaiting approval</option>
          <option value="rejected">Changes requested</option>
          <option value="draft">Draft</option>
          <option value="none">No website</option>
        </select>
        <select value={f.profile} onChange={(e) => setFilters({ profile: e.target.value })} aria-label="Profile">
          <option value="">Any profile</option>
          <option value="complete">Mostly complete (4+ sections)</option>
          <option value="incomplete">Incomplete (under 4)</option>
        </select>
        <select value={f.joined} onChange={(e) => setFilters({ joined: e.target.value })} aria-label="Joined">
          <option value="">Joined any time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="365d">Last 12 months</option>
        </select>
      </div>

      <div className="user-listbar">
        {checked.size > 0 ? (
          <div className="masters-bulkbar user-bulkbar">
            <span>{checked.size} selected</span>
            <button className="btn btn-sm btn-secondary" onClick={() => changeActive([...checked], true)}>Activate</button>
            <button className="btn btn-sm btn-danger" onClick={() => changeActive([...checked], false)}>Deactivate</button>
            <button className="btn btn-sm btn-secondary" onClick={exportSelected}>Export selected</button>
            <button className="btn btn-sm btn-secondary" onClick={() => setChecked(new Set())}>Clear</button>
          </div>
        ) : (
          <span className="text-muted">{total === 0 ? "No users" : `Showing ${from}–${to} of ${total}`}{loading && " · loading…"}</span>
        )}
        {activeFilterCount > 0 && (
          <button className="btn btn-sm btn-secondary" onClick={() => { setSearch(""); setParams({}, { replace: true }); setChecked(new Set()); }}>
            Clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {!res && loading ? <p className="text-muted">Loading users…</p> : rows.length === 0 ? (
        <div className="empty-state">
          <p>{activeFilterCount > 0 ? "No users match these filters." : "No users yet."}</p>
          {activeFilterCount > 0 && <button className="btn btn-sm btn-secondary" onClick={() => { setSearch(""); setParams({}, { replace: true }); }}>Clear filters</button>}
        </div>
      ) : (
        <div className={`table-wrapper${loading ? " dash-stale" : ""}`}>
          <table className="data-table user-table">
            <thead>
              <tr>
                <th className="col-check"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all on this page" /></th>
                {sortHeader("name", "User")}
                {sortHeader("email", "Contact")}
                <th>Status</th>
                <th>Website</th>
                {sortHeader("completeness", "Profile")}
                {sortHeader("lastActive", "Last active")}
                {sortHeader("joined", "Joined")}
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const isMe = u.userUuid === me?.userUuid;
                const site = WEBSITE[websiteKey(u)] ?? WEBSITE.none;
                const pct = Math.round((u.sectionsFilled / SECTIONS_TOTAL) * 100);
                return (
                  <tr key={u.userUuid} className={`clickable${u.isActive ? "" : " row-inactive"}${checked.has(u.userUuid) ? " row-checked" : ""}`}
                    onClick={() => navigate(`/admin/users/${u.userUuid}`)}>
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(u.userUuid)} onChange={() => toggleCheck(u.userUuid)} aria-label={`Select ${u.fullName}`} />
                    </td>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar" style={{ background: tintFor(u.userUuid) }} aria-hidden="true">{initials(u.fullName)}</span>
                        <div className="user-cell-text">
                          <strong>{u.fullName}{u.role === "admin" && <span className="pill pill-system">Admin</span>}{isMe && <span className="you-tag">You</span>}</strong>
                          <small title={u.designation}>@{u.userName}{u.designation && <> · {u.designation}</>}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-cell-text">
                        <a href={`mailto:${u.email}`} onClick={(e) => e.stopPropagation()}>{u.email}</a>
                        <small>{u.mobileNo || "No mobile"}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`state ${u.isActive ? "state-on" : "state-off"}`}>
                        <span className="state-dot" aria-hidden="true" />{u.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td>
                      <div className="user-cell-text">
                        <span className={`state state-${site.tone}`}><span className="state-dot" aria-hidden="true" />{site.label}</span>
                        {u.isPublished && <a href={`/${u.userName}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="site-link">/{u.userName} ↗</a>}
                        {!u.isPublished && u.templateName && <small>{u.templateName}</small>}
                      </div>
                    </td>
                    <td title={`${u.sectionsFilled} of ${SECTIONS_TOTAL} sections · ${u.imageCount} image(s)`}>
                      <div className="completeness">
                        <span className="completeness-track"><span className="completeness-fill" style={{ width: `${pct}%` }} /></span>
                        <small>{u.sectionsFilled}/{SECTIONS_TOTAL}</small>
                      </div>
                    </td>
                    <td className="muted-cell" title={u.lastActiveAt ? formatDateTime(u.lastActiveAt) : "No activity recorded"}>{u.lastActiveAt ? timeAgo(u.lastActiveAt) : "Never"}</td>
                    <td className="muted-cell" title={formatDateTime(u.createdAt)}>{new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="row-menu" ref={menuFor === u.userUuid ? menuRef : undefined}>
                        <button type="button" className="row-menu-btn" aria-haspopup="menu" aria-expanded={menuFor === u.userUuid} aria-label={`Actions for ${u.fullName}`}
                          onClick={(e) => {
                            if (menuFor === u.userUuid) { setMenu(null); return; }
                            const r = e.currentTarget.getBoundingClientRect();
                            const up = window.innerHeight - r.bottom < 280;
                            setMenu({ uuid: u.userUuid, top: up ? r.top - 4 : r.bottom + 4, right: window.innerWidth - r.right, up });
                          }}>⋯</button>
                        {menu && menuFor === u.userUuid && (
                          <div className={`row-menu-list${menu.up ? " up" : ""}`} role="menu" style={{ top: menu.top, right: menu.right }}>
                            <Link role="menuitem" to={`/admin/users/${u.userUuid}`}>View & edit profile</Link>
                            {u.isPublished && <a role="menuitem" href={`/${u.userName}`} target="_blank" rel="noreferrer">Open website ↗</a>}
                            <Link role="menuitem" to={`/admin/activity?q=${encodeURIComponent(u.email)}`}>View activity</Link>
                            <button role="menuitem" type="button" onClick={() => { setMenuFor(null); navigator.clipboard?.writeText(u.email); setAlert({ type: "success", message: `Copied ${u.email}` }); }}>Copy email</button>
                            <hr />
                            {!isMe && (u.role === "admin"
                              ? <button role="menuitem" type="button" onClick={() => { setMenuFor(null); changeRole(u, "user"); }}>Remove admin access</button>
                              : <button role="menuitem" type="button" onClick={() => { setMenuFor(null); changeRole(u, "admin"); }}>Make admin</button>)}
                            {!isMe && (u.isActive
                              ? <button role="menuitem" type="button" className="danger" onClick={() => { setMenuFor(null); changeActive([u.userUuid], false); }}>Deactivate account</button>
                              : <button role="menuitem" type="button" onClick={() => { setMenuFor(null); changeActive([u.userUuid], true); }}>Activate account</button>)}
                            {isMe && <span className="row-menu-note">Your own role and access can't be changed here</span>}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="user-pager">
          <label className="text-muted">Rows per page{" "}
            <select value={size} onChange={(e) => setFilters({ size: e.target.value })}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="pager">
            <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setFilters({ page: "1" })} aria-label="First page">«</button>
            <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setFilters({ page: String(page - 1) })}>← Prev</button>
            <span className="text-muted">Page {page} of {pages}</span>
            <button className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setFilters({ page: String(page + 1) })}>Next →</button>
            <button className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setFilters({ page: String(pages) })} aria-label="Last page">»</button>
          </div>
        </div>
      )}

      <Modal title="Create user" isOpen={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate}>
          <Alert type="error" message={formError} onDismiss={() => setFormError("")} />
          <div className="form-row">
            <div className="form-group"><label>Full name *</label><input value={form.fullName} onChange={setField("fullName")} required /></div>
            <div className="form-group">
              <label>Username</label>
              <input value={form.userName} onChange={(e) => setForm((x) => ({ ...x, userName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} placeholder="Generated from the name" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={setField("email")} required /></div>
            <div className="form-group"><label>Mobile</label><input inputMode="numeric" maxLength={10} value={form.mobileNo} onChange={(e) => setForm((x) => ({ ...x, mobileNo: e.target.value.replace(/\D/g, "") }))} placeholder="10 digits" /></div>
          </div>
          <div className="form-group">
            <label>Designation *</label>
            <MasterTextInput value={form.designation} onChange={(designation) => setForm((x) => ({ ...x, designation }))} options={masters.options(MASTER.designation)} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password *</label>
              <div className="password-field">
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={setField("password")} required minLength={8} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              <small className="text-muted">At least 8 characters. Share it securely; the user can reset it later.</small>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={setField("role")}>
                <option value="user">User</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={creating}>{creating ? "Creating…" : "Create user"}</button>
        </form>
      </Modal>
    </div>
  );
}
