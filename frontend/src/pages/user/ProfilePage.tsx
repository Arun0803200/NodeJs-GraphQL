import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { MY_PROFILE, UPDATE_MY_PROFILE } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { MasterTextInput } from "../../components/masters/MasterInputs";
import { MASTER, useMasters } from "../../lib/masters";

export function ProfilePage() {
  const { data, loading, refetch } = useQuery(MY_PROFILE);
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_MY_PROFILE);
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [form, setForm] = useState({ userName: "", fullName: "", designation: "", contactUsDescription: "", mobileNo: "", address: "" });
  const masters = useMasters([MASTER.designation]);

  const user = data?.myProfile?.data;

  useEffect(() => {
    if (user) {
      setForm({
        userName: user.userName || "",
        fullName: user.fullName || "",
        designation: user.designation || "",
        contactUsDescription: user.contactUsDescription || "",
        mobileNo: user.mobileNo || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await updateProfile({ variables: form });
      if (data.updateMyProfile.status === 1) {
        setAlert({ type: "success", message: "Profile updated" });
        refetch();
      } else {
        setAlert({ type: "error", message: data.updateMyProfile.message });
      }
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  if (loading) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h1>My Profile</h1>
      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>Username (public portfolio URL)</label>
          <input value={form.userName} onChange={set("userName")} pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={50} placeholder="john-doe" />
          {form.userName && <p className="text-muted">Your portfolio: <a href={`/${form.userName}`} target="_blank" rel="noreferrer">{window.location.origin}/{form.userName}</a></p>}
        </div>
        <div className="form-row">
          <div className="form-group"><label>Full Name</label><input value={form.fullName} onChange={set("fullName")} /></div>
          <div className="form-group"><label>Designation</label><MasterTextInput value={form.designation} onChange={(designation) => setForm((f) => ({ ...f, designation }))} options={masters.options(MASTER.designation)} /></div>
        </div>
        <div className="form-group"><label>Contact Description</label><textarea value={form.contactUsDescription} onChange={set("contactUsDescription")} rows={2} /></div>
        <div className="form-row">
          <div className="form-group"><label>Mobile</label><input value={form.mobileNo} onChange={set("mobileNo")} /></div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={set("address")} /></div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
      </form>
    </div>
  );
}
