import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { MY_AWARDS, ADD_MY_AWARD, UPDATE_MY_AWARD, DELETE_MY_AWARD } from "../../api/queries";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";

export function AwardsPage() {
  const { data, loading, refetch } = useQuery(MY_AWARDS);
  const [addAward] = useMutation(ADD_MY_AWARD);
  const [updateAward] = useMutation(UPDATE_MY_AWARD);
  const [deleteAward] = useMutation(DELETE_MY_AWARD);
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", companyId: 0, eventDate: "" });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  const openAdd = () => { setEditId(null); setForm({ title: "", description: "", companyId: 0, eventDate: "" }); setShowModal(true); };
  const openEdit = (row: any) => { setEditId(row.id); setForm({ title: row.title, description: row.description, companyId: row.companyId, eventDate: row.eventDate || "" }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) { await updateAward({ variables: { id: editId, ...form } }); }
      else { await addAward({ variables: form }); }
      setShowModal(false); refetch();
      setAlert({ type: "success", message: editId ? "Updated" : "Added" });
    } catch (err: any) { setAlert({ type: "error", message: err.message }); }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Awards</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Award</button></div>
      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}
      {loading ? <p>Loading...</p> : (
        <DataTable
          columns={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
            { key: "eventDate", label: "Date" },
          ]}
          data={data?.myAwards?.data || []}
          onEdit={openEdit}
          onDelete={async (row: any) => { if (confirm("Delete?")) { await deleteAward({ variables: { id: row.id } }); refetch(); } }}
        />
      )}
      <Modal title={editId ? "Edit Award" : "Add Award"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Title *</label><input value={form.title} onChange={set("title")} required /></div>
          <div className="form-group"><label>Description *</label><textarea value={form.description} onChange={set("description")} rows={3} required /></div>
          <div className="form-row">
            <div className="form-group"><label>Company ID</label><input type="number" value={form.companyId} onChange={set("companyId")} /></div>
            <div className="form-group"><label>Event Date *</label><input value={form.eventDate} onChange={set("eventDate")} required placeholder="2025-12-01" /></div>
          </div>
          <button type="submit" className="btn btn-primary btn-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}
