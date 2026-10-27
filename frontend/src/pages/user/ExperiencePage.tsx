import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { MY_EXPERIENCES, ADD_MY_EXPERIENCE, UPDATE_MY_EXPERIENCE, DELETE_MY_EXPERIENCE } from "../../api/queries";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";
import { MasterMultiInput, MasterTextInput } from "../../components/masters/MasterInputs";
import { MASTER, useMasters } from "../../lib/masters";

const empty = { companyName: "", companyUrl: "", companyLocation: "", designation: "", startDate: "", endDate: "", isCurrentlyWorking: false, jobDescription: "", skills: "" };

export function ExperiencePage() {
  const { data, loading, refetch } = useQuery(MY_EXPERIENCES, { variables: { limit: 50 } });
  const [addExp] = useMutation(ADD_MY_EXPERIENCE);
  const [updateExp] = useMutation(UPDATE_MY_EXPERIENCE);
  const [deleteExp] = useMutation(DELETE_MY_EXPERIENCE);
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const masters = useMasters([MASTER.designation, MASTER.skill]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const openAdd = () => { setEditId(null); setForm(empty); setShowModal(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({
      companyName: row.companyName, companyUrl: row.companyUrl, companyLocation: row.companyLocation,
      designation: row.designation, startDate: row.startDate?.split("T")[0] || "", endDate: row.endDate?.split("T")[0] || "",
      isCurrentlyWorking: row.isCurrentlyWorking, jobDescription: row.jobDescription, skills: row.skills?.join(", ") || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vars: any = {
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      skills: form.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    try {
      if (editId) {
        await updateExp({ variables: { id: editId, ...vars } });
        setAlert({ type: "success", message: "Experience updated" });
      } else {
        await addExp({ variables: vars });
        setAlert({ type: "success", message: "Experience added" });
      }
      setShowModal(false);
      refetch();
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Experience</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Experience</button>
      </div>
      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}
      {loading ? <p>Loading...</p> : (
        <DataTable
          columns={[
            { key: "companyName", label: "Company" },
            { key: "designation", label: "Role" },
            { key: "companyLocation", label: "Location" },
            { key: "isCurrentlyWorking", label: "Current", render: (r: any) => r.isCurrentlyWorking ? "Yes" : "No" },
            { key: "skills", label: "Skills", render: (r: any) => r.skills?.join(", ") || "—" },
          ]}
          data={data?.myExperiences?.data || []}
          onEdit={openEdit}
          onDelete={async (row: any) => {
            if (confirm("Delete this experience?")) {
              await deleteExp({ variables: { id: row.id } });
              setAlert({ type: "success", message: "Deleted" });
              refetch();
            }
          }}
        />
      )}
      <Modal title={editId ? "Edit Experience" : "Add Experience"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Company *</label><input value={form.companyName} onChange={set("companyName")} required /></div>
            <div className="form-group"><label>Designation *</label><MasterTextInput value={form.designation} onChange={(designation) => setForm((f) => ({ ...f, designation }))} options={masters.options(MASTER.designation)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Company URL</label><input value={form.companyUrl} onChange={set("companyUrl")} required /></div>
            <div className="form-group"><label>Location</label><input value={form.companyLocation} onChange={set("companyLocation")} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Start Date *</label><input type="date" value={form.startDate} onChange={set("startDate")} required /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.endDate} onChange={set("endDate")} /></div>
          </div>
          <div className="form-group form-check">
            <label><input type="checkbox" checked={form.isCurrentlyWorking as any} onChange={set("isCurrentlyWorking")} /> Currently working here</label>
          </div>
          <div className="form-group"><label>Job Description *</label><textarea value={form.jobDescription} onChange={set("jobDescription")} rows={3} required /></div>
          <div className="form-group"><label>Skills (comma-separated)</label><MasterMultiInput value={form.skills} onChange={(skills) => setForm((f) => ({ ...f, skills }))} options={masters.options(MASTER.skill)} placeholder="Node.js, React, GraphQL" /></div>
          <button type="submit" className="btn btn-primary btn-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}
