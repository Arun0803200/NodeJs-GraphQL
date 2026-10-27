import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { MY_PROJECTS, ADD_MY_PROJECT, UPDATE_MY_PROJECT, DELETE_MY_PROJECT } from "../../api/queries";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";
import { MasterMultiInput } from "../../components/masters/MasterInputs";
import { MASTER, useMasters } from "../../lib/masters";

const empty = { projectName: "", projectDescription: "", projectUrl: "", projectStartDate: "", projectEndDate: "", isCurrentProject: false, projectLongDescription: "", keyFeatures: "", technologiesSkills: "" };

export function ProjectsPage() {
  const { data, loading, refetch } = useQuery(MY_PROJECTS, { variables: { limit: 50 } });
  const [addProj] = useMutation(ADD_MY_PROJECT);
  const [updateProj] = useMutation(UPDATE_MY_PROJECT);
  const [deleteProj] = useMutation(DELETE_MY_PROJECT);
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const masters = useMasters([MASTER.skill]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const openAdd = () => { setEditId(null); setForm(empty); setShowModal(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({
      projectName: row.projectName, projectDescription: row.projectDescription, projectUrl: row.projectUrl || "",
      projectStartDate: row.projectStartDate?.split("T")[0] || "", projectEndDate: row.projectEndDate?.split("T")[0] || "",
      isCurrentProject: row.isCurrentProject, projectLongDescription: row.projectLongDescription,
      keyFeatures: row.keyFeatures?.join(", ") || "", technologiesSkills: row.technologiesSkills?.join(", ") || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vars: any = {
      ...form,
      projectStartDate: new Date(form.projectStartDate).toISOString(),
      projectEndDate: form.projectEndDate ? new Date(form.projectEndDate).toISOString() : undefined,
      keyFeatures: form.keyFeatures.split(",").map((s: string) => s.trim()).filter(Boolean),
      technologiesSkills: form.technologiesSkills.split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    try {
      if (editId) {
        await updateProj({ variables: { id: editId, ...vars } });
        setAlert({ type: "success", message: "Project updated" });
      } else {
        await addProj({ variables: vars });
        setAlert({ type: "success", message: "Project added" });
      }
      setShowModal(false);
      refetch();
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Projects</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Project</button></div>
      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}
      {loading ? <p>Loading...</p> : (
        <DataTable
          columns={[
            { key: "projectName", label: "Name" },
            { key: "projectDescription", label: "Description" },
            { key: "isCurrentProject", label: "Current", render: (r: any) => r.isCurrentProject ? "Yes" : "No" },
            { key: "technologiesSkills", label: "Tech", render: (r: any) => r.technologiesSkills?.join(", ") || "—" },
          ]}
          data={data?.myProjects?.data || []}
          onEdit={openEdit}
          onDelete={async (row: any) => { if (confirm("Delete?")) { await deleteProj({ variables: { id: row.id } }); refetch(); } }}
        />
      )}
      <Modal title={editId ? "Edit Project" : "Add Project"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Project Name *</label><input value={form.projectName} onChange={set("projectName")} required /></div>
          <div className="form-group"><label>Description *</label><textarea value={form.projectDescription} onChange={set("projectDescription")} rows={2} required /></div>
          <div className="form-group"><label>Long Description *</label><textarea value={form.projectLongDescription} onChange={set("projectLongDescription")} rows={4} required /></div>
          <div className="form-group"><label>Project URL</label><input value={form.projectUrl} onChange={set("projectUrl")} /></div>
          <div className="form-row">
            <div className="form-group"><label>Start Date *</label><input type="date" value={form.projectStartDate} onChange={set("projectStartDate")} required /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.projectEndDate} onChange={set("projectEndDate")} /></div>
          </div>
          <div className="form-group form-check"><label><input type="checkbox" checked={form.isCurrentProject as any} onChange={set("isCurrentProject")} /> Current project</label></div>
          <div className="form-group"><label>Key Features (comma-separated)</label><input value={form.keyFeatures} onChange={set("keyFeatures")} /></div>
          <div className="form-group"><label>Technologies (comma-separated)</label><MasterMultiInput value={form.technologiesSkills} onChange={(technologiesSkills) => setForm((f) => ({ ...f, technologiesSkills }))} options={masters.options(MASTER.skill)} /></div>
          <button type="submit" className="btn btn-primary btn-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}
