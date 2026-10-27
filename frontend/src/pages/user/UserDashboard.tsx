import { useQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { MY_PROFILE, MY_ABOUT, MY_EXPERIENCES, MY_PROJECTS, MY_SKILLS, MY_AWARDS, MY_EDUCATION, MY_IMAGES } from "../../api/queries";

export function UserDashboard() {
  const { data: profile } = useQuery(MY_PROFILE);
  const { data: about } = useQuery(MY_ABOUT);
  const { data: exp } = useQuery(MY_EXPERIENCES, { variables: { limit: 100 } });
  const { data: proj } = useQuery(MY_PROJECTS, { variables: { limit: 100 } });
  const { data: skills } = useQuery(MY_SKILLS);
  const { data: awards } = useQuery(MY_AWARDS);
  const { data: edu } = useQuery(MY_EDUCATION);
  const { data: imgs } = useQuery(MY_IMAGES, { variables: { limit: 100 } });

  const user = profile?.myProfile?.data;
  const sections = [
    { label: "About", to: "/user/about", count: about?.myAbout?.data ? 1 : 0 },
    { label: "Experience", to: "/user/experience", count: exp?.myExperiences?.data?.length ?? 0 },
    { label: "Projects", to: "/user/projects", count: proj?.myProjects?.data?.length ?? 0 },
    { label: "Skills", to: "/user/skills", count: skills?.mySkills?.data?.length ?? 0 },
    { label: "Awards", to: "/user/awards", count: awards?.myAwards?.data?.length ?? 0 },
    { label: "Education", to: "/user/education", count: edu?.myEducation?.data?.length ?? 0 },
    { label: "Images", to: "/user/images", count: imgs?.myImages?.data?.length ?? 0 },
  ];

  return (
    <div className="page">
      <h1>Welcome, {user?.fullName || "..."}</h1>
      <p className="text-muted">{user?.designation}</p>
      <div className="stats-grid" style={{ marginTop: 24 }}>
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="stat-card stat-card-link">
            <h3>{s.count}</h3>
            <p>{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
