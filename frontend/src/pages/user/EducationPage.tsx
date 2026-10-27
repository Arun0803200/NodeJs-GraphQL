import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { MY_EDUCATION, ADD_MY_EDUCATION, UPDATE_MY_EDUCATION, DELETE_MY_EDUCATION } from "../../api/queries";
import { DataTable } from "../../components/ui/DataTable";
import { Modal } from "../../components/ui/Modal";
import { Alert } from "../../components/ui/Alert";
import { MasterTextInput } from "../../components/masters/MasterInputs";
import { MASTER, useMasters } from "../../lib/masters";

const empty = { degree: "", fieldOfStudy: "", institution: "", institutionLocation: "", startYear: "", endYear: "" };

export function EducationPage() {
  const { data, loading, refetch } = useQuery(MY_EDUCATION);
  const [addEdu] = useMutation(ADD_MY_EDUCATION);
  const [updateEdu] = useMutation(UPDATE_MY_EDUCATION);
  const [deleteEdu] = useMutation(DELETE_MY_EDUCATION);
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const masters = useMasters([MASTER.degree, MASTER.fieldOfStudy]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const openAdd = () => { setEditId(null); setForm(empty); setShowModal(true); };
  const openEdit = (row: any) => {
    setEditId(row.id);
    setForm({ degree: row.degree, fieldOfStudy: row.fieldOfStudy, institution: row.institution, institutionLocation: row.institutionLocation, startYear: row.startYear || "", endYear: row.endYear || "" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) { await updateEdu({ variables: { id: editId, ...form } }); }
      else { await addEdu({ variables: form }); }
      setShowModal(false); refetch();
      setAlert({ type: "success", message: editId ? "Updated" : "Added" });
    } catch (err: any) { setAlert({ type: "error", message: err.message }); }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Education</h1><button className="btn btn-primary" onClick={openAdd}>+ Add Education</button></div>
      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}
      {loading ? <p>Loading...</p> : (
        <DataTable
          columns={[
            { key: "degree", label: "Degree" },
            { key: "fieldOfStudy", label: "Field" },
            { key: "institution", label: "Institution" },
            { key: "institutionLocation", label: "Location" },
            { key: "startYear", label: "Start" },
            { key: "endYear", label: "End" },
          ]}
          data={data?.myEducation?.data || []}
          onEdit={openEdit}
          onDelete={async (row: any) => { if (confirm("Delete?")) { await deleteEdu({ variables: { id: row.id } }); refetch(); } }}
        />
      )}
      <Modal title={editId ? "Edit Education" : "Add Education"} isOpen={showModal} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Degree *</label><MasterTextInput value={form.degree} onChange={(degree) => setForm((f) => ({ ...f, degree }))} options={masters.options(MASTER.degree)} required /></div>
            <div className="form-group"><label>Field of Study *</label><MasterTextInput value={form.fieldOfStudy} onChange={(fieldOfStudy) => setForm((f) => ({ ...f, fieldOfStudy }))} options={masters.options(MASTER.fieldOfStudy)} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Institution *</label><input value={form.institution} onChange={set("institution")} required /></div>
            <div className="form-group"><label>Location *</label><input value={form.institutionLocation} onChange={set("institutionLocation")} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Start Year *</label><input value={form.startYear} onChange={set("startYear")} required placeholder="2018" /></div>
            <div className="form-group"><label>End Year</label><input value={form.endYear} onChange={set("endYear")} placeholder="2022" /></div>
          </div>
          <button type="submit" className="btn btn-primary btn-full">Save</button>
        </form>
      </Modal>
    </div>
  );
}
