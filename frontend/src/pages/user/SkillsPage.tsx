import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { MY_SKILLS, ADD_MY_SKILLS, UPDATE_MY_SKILLS, DELETE_MY_SKILLS } from "../../api/queries";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";
import { MasterMultiInput, MasterTextInput } from "../../components/masters/MasterInputs";
import { MASTER, useMasters } from "../../lib/masters";

export function SkillsPage() {
  const { data, loading, refetch } = useQuery(MY_SKILLS);
  const [addSkills] = useMutation(ADD_MY_SKILLS);
  const [updateSkills] = useMutation(UPDATE_MY_SKILLS);
  const [deleteSkills] = useMutation(DELETE_MY_SKILLS);
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ tittle: "", skills: "" });
  const masters = useMasters([MASTER.skillCategory, MASTER.skill]);
  // Suggest skills from the chosen category first, falling back to every skill
  const allSkills = masters.options(MASTER.skill);
  const categorySkills = allSkills.filter((s) => s.parentLabel?.toLowerCase() === form.tittle.trim().toLowerCase());
  const skillOptions = categorySkills.length > 0 ? categorySkills : allSkills;

  const openAdd = () => { setEditId(null); setForm({ tittle: "", skills: "" }); setShowModal(true); };
  const openEdit = (row: any) => { setEditId(row.id); setForm({ tittle: row.tittle, skills: row.skills?.join(", ") || "" }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vars = { tittle: form.tittle, skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      if (editId) { await updateSkills({ variables: { id: editId, ...vars } }); }
      else { await addSkills({ variables: vars }); }
      setShowModal(false); refetch();
      setAlert({ type: "success", message: editId ? "Updated" : "Added" });
    } catch (err: any) { setAlert({ type: "error", message: err.message }); }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Skills</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Skills</button></div>
      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}
      {loading ? <p>Loading...</p> : (
        <DataTable
          columns={[
            { key: "tittle", label: "Category" },
            { key: "skills", label: "Skills", render: (r: any) => r.skills?.join(", ") || "—" },
          ]}
          data={data?.mySkills?.data || []}
          onEdit={openEdit}
          onDelete={async (row: any) => { if (confirm("Delete?")) { await deleteSkills({ variables: { id: row.id } }); refetch(); } }}
        />
      )}
      <Modal title={editId ? "Edit Skills" : "Add Skills"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Category *</label><MasterTextInput value={form.tittle} onChange={(tittle) => setForm((f) => ({ ...f, tittle }))} options={masters.options(MASTER.skillCategory)} required placeholder="e.g. Backend, Frontend" /></div>
          <div className="form-group"><label>Skills (comma-separated) *</label><MasterMultiInput value={form.skills} onChange={(skills) => setForm((f) => ({ ...f, skills }))} options={skillOptions} required placeholder="Node.js, React, GraphQL" /></div>
          <button type="submit" className="btn btn-primary btn-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}
