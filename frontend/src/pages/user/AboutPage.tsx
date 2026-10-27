import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { MY_ABOUT, UPSERT_MY_ABOUT } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";

export function AboutPage() {
  const { data, loading, refetch } = useQuery(MY_ABOUT);
  const [upsert, { loading: saving }] = useMutation(UPSERT_MY_ABOUT);
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [form, setForm] = useState({ title: "", description: "", longDescription: "", totalExperience: 0, totalProjects: 0, totalAwards: 0 });

  useEffect(() => {
    const about = data?.myAbout?.data;
    if (about) {
      setForm({
        title: about.title || "",
        description: about.description || "",
        longDescription: about.longDescription || "",
        totalExperience: about.totalExperience || 0,
        totalProjects: about.totalProjects || 0,
        totalAwards: about.totalAwards || 0,
      });
    }
  }, [data]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "number" ? Math.floor(Number(e.target.value)) : e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await upsert({ variables: form });
      if (data.upsertMyAbout.status === 1) {
        setAlert({ type: "success", message: "About section saved" });
        refetch();
      } else {
        setAlert({ type: "error", message: data.upsertMyAbout.message });
      }
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h1>About Section</h1>
      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group"><label>Title</label><input value={form.title} onChange={set("title")} required /></div>
        <div className="form-group"><label>Description</label><textarea value={form.description} onChange={set("description")} rows={3} required /></div>
        <div className="form-group"><label>Long Description</label><textarea value={form.longDescription} onChange={set("longDescription")} rows={5} required /></div>
        <div className="form-row">
          <div className="form-group"><label>Total Experience (yrs)</label><input type="number" step="1" min="0" value={form.totalExperience} onChange={set("totalExperience")} required /></div>
          <div className="form-group"><label>Total Projects</label><input type="number" step="1" min="0" value={form.totalProjects} onChange={set("totalProjects")} required /></div>
          <div className="form-group"><label>Total Awards</label><input type="number" step="1" min="0" value={form.totalAwards} onChange={set("totalAwards")} required /></div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save About"}</button>
      </form>
    </div>
  );
}
