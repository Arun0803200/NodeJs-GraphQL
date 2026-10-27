import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ADMIN_GET_USER, ADMIN_UPDATE_USER, ADMIN_DEACTIVATE_USER, ADMIN_ACTIVATE_USER,
  ADMIN_GET_ABOUT, ADMIN_GET_EXPERIENCES, ADMIN_GET_PROJECTS,
  ADMIN_GET_SKILLS, ADMIN_GET_AWARDS, ADMIN_GET_EDUCATION, ADMIN_GET_USER_IMAGES,
  ADMIN_DELETE_EXPERIENCE, ADMIN_DELETE_PROJECT, ADMIN_DELETE_SKILLS,
  ADMIN_DELETE_AWARD, ADMIN_DELETE_EDUCATION,
} from "../../api/queries";
import { DataTable } from "../../components/ui/DataTable";
import { Alert } from "../../components/ui/Alert";

export function AdminUserDetailPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [alert, setAlert] = useState({ type: "" as "success" | "error", message: "" });
  const [tab, setTab] = useState("profile");

  const { data: userData, refetch: refetchUser } = useQuery(ADMIN_GET_USER, { variables: { uuid } });
  const { data: aboutData } = useQuery(ADMIN_GET_ABOUT, { variables: { userUuid: uuid } });
  const { data: expData, refetch: refetchExp } = useQuery(ADMIN_GET_EXPERIENCES, { variables: { userUuid: uuid } });
  const { data: projData, refetch: refetchProj } = useQuery(ADMIN_GET_PROJECTS, { variables: { userUuid: uuid } });
  const { data: skillData, refetch: refetchSkill } = useQuery(ADMIN_GET_SKILLS, { variables: { userUuid: uuid } });
  const { data: awardData, refetch: refetchAward } = useQuery(ADMIN_GET_AWARDS, { variables: { userUuid: uuid } });
  const { data: eduData, refetch: refetchEdu } = useQuery(ADMIN_GET_EDUCATION, { variables: { userUuid: uuid } });
  const { data: imgData } = useQuery(ADMIN_GET_USER_IMAGES, { variables: { userUuid: uuid } });

  const [deactivate] = useMutation(ADMIN_DEACTIVATE_USER);
  const [activate] = useMutation(ADMIN_ACTIVATE_USER);
  const [deleteExp] = useMutation(ADMIN_DELETE_EXPERIENCE);
  const [deleteProj] = useMutation(ADMIN_DELETE_PROJECT);
  const [deleteSkill] = useMutation(ADMIN_DELETE_SKILLS);
  const [deleteAward] = useMutation(ADMIN_DELETE_AWARD);
  const [deleteEdu] = useMutation(ADMIN_DELETE_EDUCATION);

  const user = userData?.adminGetUser?.data;
  const about = aboutData?.adminGetAbout?.data;

  const tabs = ["profile", "about", "experience", "projects", "skills", "awards", "education", "images"];

  const handleDelete = async (mutation: any, id: number, refetch: any) => {
    if (!confirm("Delete this record?")) return;
    await mutation({ variables: { id } });
    setAlert({ type: "success", message: "Deleted" });
    refetch();
  };

  if (!user) return <div className="page"><p>Loading user...</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-secondary" onClick={() => navigate("/admin/users")}>&larr; Back</button>
          <h1 style={{ marginTop: 8 }}>{user.fullName}</h1>
          <p className="text-muted">{user.email} &middot; {user.designation}</p>
        </div>
      </div>

      {alert.message && <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: "" as any, message: "" })} />}

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === "profile" && (
          <div className="detail-grid">
            <div><strong>UUID:</strong> {user.userUuid}</div>
            <div><strong>Full Name:</strong> {user.fullName}</div>
            <div><strong>Username:</strong> <a href={`/${user.userName}`} target="_blank" rel="noreferrer">/{user.userName}</a></div>
            <div><strong>Designation:</strong> {user.designation}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Mobile:</strong> {user.mobileNo || "—"}</div>
            <div><strong>Address:</strong> {user.address || "—"}</div>
            <div><strong>Contact Desc:</strong> {user.contactUsDescription || "—"}</div>
            {user.socialMedia?.length > 0 && (
              <div><strong>Social:</strong> {user.socialMedia.map((s: any) => `${s.name}: ${s.url}`).join(", ")}</div>
            )}
          </div>
        )}

        {tab === "about" && (
          about ? (
            <div className="detail-grid">
              <div><strong>Title:</strong> {about.title}</div>
              <div><strong>Description:</strong> {about.description}</div>
              <div><strong>Long Description:</strong> {about.longDescription}</div>
              <div><strong>Experience:</strong> {about.totalExperience} yrs</div>
              <div><strong>Projects:</strong> {about.totalProjects}</div>
              <div><strong>Awards:</strong> {about.totalAwards}</div>
            </div>
          ) : <p className="empty-state">No about section</p>
        )}

        {tab === "experience" && (
          <DataTable
            columns={[
              { key: "companyName", label: "Company" },
              { key: "designation", label: "Role" },
              { key: "companyLocation", label: "Location" },
              { key: "isCurrentlyWorking", label: "Current", render: (r: any) => r.isCurrentlyWorking ? "Yes" : "No" },
              { key: "skills", label: "Skills", render: (r: any) => r.skills?.join(", ") || "—" },
            ]}
            data={expData?.adminGetExperiences?.data || []}
            onDelete={(row: any) => handleDelete(deleteExp, row.id, refetchExp)}
          />
        )}

        {tab === "projects" && (
          <DataTable
            columns={[
              { key: "projectName", label: "Project" },
              { key: "projectDescription", label: "Description" },
              { key: "isCurrentProject", label: "Current", render: (r: any) => r.isCurrentProject ? "Yes" : "No" },
              { key: "technologiesSkills", label: "Tech", render: (r: any) => r.technologiesSkills?.join(", ") || "—" },
            ]}
            data={projData?.adminGetProjects?.data || []}
            onDelete={(row: any) => handleDelete(deleteProj, row.id, refetchProj)}
          />
        )}

        {tab === "skills" && (
          <DataTable
            columns={[
              { key: "tittle", label: "Category" },
              { key: "skills", label: "Skills", render: (r: any) => r.skills?.join(", ") || "—" },
            ]}
            data={skillData?.adminGetSkills?.data || []}
            onDelete={(row: any) => handleDelete(deleteSkill, row.id, refetchSkill)}
          />
        )}

        {tab === "awards" && (
          <DataTable
            columns={[
              { key: "title", label: "Title" },
              { key: "description", label: "Description" },
              { key: "eventDate", label: "Date" },
            ]}
            data={awardData?.adminGetAwards?.data || []}
            onDelete={(row: any) => handleDelete(deleteAward, row.id, refetchAward)}
          />
        )}

        {tab === "education" && (
          <DataTable
            columns={[
              { key: "degree", label: "Degree" },
              { key: "fieldOfStudy", label: "Field" },
              { key: "institution", label: "Institution" },
              { key: "startYear", label: "Start" },
              { key: "endYear", label: "End" },
            ]}
            data={eduData?.adminGetEducation?.data || []}
            onDelete={(row: any) => handleDelete(deleteEdu, row.id, refetchEdu)}
          />
        )}

        {tab === "images" && (
          <div className="image-grid">
            {(imgData?.adminGetUserImages?.data || []).map((img: any) => (
              <div key={img.id} className="image-card">
                <img src={img.imageUrl} alt={img.imageOriginalName} />
                <p>{img.imageOriginalName}</p>
                <small>{img.imageSize} KB</small>
              </div>
            ))}
            {(!imgData?.adminGetUserImages?.data || imgData.adminGetUserImages.data.length === 0) && (
              <p className="empty-state">No images</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
