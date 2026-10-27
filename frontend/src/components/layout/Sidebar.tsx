import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "../../context/AuthContext";
import { NAV_COUNTS } from "../../api/queries";
import { BRAND_NAME } from "../../lib/brand";
import { Icon, type IconName } from "../ui/Icon";

interface NavItem {
  label: string;
  to: string;
  icon: IconName;
  badge?: number;
  badgeTone?: "info" | "warn";
  badgeTitle?: string;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

type Counts = { unreadMessages: number; pendingApprovals: number; newMessages: number; newBookings: number; newDriverApplications: number; pendingReviews: number; newFormSubmissions: number; newLeads: number };

function adminGroups(c: Counts): NavGroup[] {
  return [
    { items: [{ label: "Dashboard", to: "/admin", icon: "dashboard" }] },
    {
      title: "Manage",
      items: [
        { label: "Users", to: "/admin/users", icon: "users" },
        { label: "Templates", to: "/admin/templates", icon: "templates" },
        { label: "Approvals", to: "/admin/approvals", icon: "approvals", badge: c.pendingApprovals, badgeTone: "warn", badgeTitle: "websites waiting for review" },
        { label: "Business enquiries", to: "/admin/enquiries", icon: "send", badge: c.newLeads, badgeTone: "warn", badgeTitle: "new enquiries" },
        { label: "Messages", to: "/admin/messages", icon: "mail", badge: c.newMessages, badgeTitle: "messages in the last 24 hours" },
      ],
    },
    { title: "Configure", items: [{ label: "Masters", to: "/admin/masters", icon: "masters" }] },
    {
      title: "Monitor",
      items: [
        { label: "API Logs", to: "/admin/api-logs", icon: "pulse" },
        { label: "Activity Log", to: "/admin/activity", icon: "history" },
      ],
    },
  ];
}

function userGroups(c: Counts): NavGroup[] {
  return [
    {
      items: [
        { label: "Dashboard", to: "/user", icon: "dashboard" },
        { label: "My Website", to: "/user/website", icon: "globe" },
        { label: "Inbox", to: "/user/messages", icon: "inbox", badge: c.unreadMessages, badgeTitle: "unread messages" },
        { label: "Trip bookings", to: "/user/bookings", icon: "car", badge: c.newBookings, badgeTone: "warn", badgeTitle: "new bookings to confirm" },
        { label: "Driver applications", to: "/user/drivers", icon: "users", badge: c.newDriverApplications, badgeTitle: "new applications to review" },
        { label: "Reviews", to: "/user/reviews", icon: "star", badge: c.pendingReviews, badgeTone: "warn", badgeTitle: "reviews waiting for approval" },
        { label: "Form submissions", to: "/user/forms", icon: "mailOpen", badge: c.newFormSubmissions, badgeTitle: "new submissions" },
      ],
    },
    {
      title: "Portfolio content",
      items: [
        { label: "Profile", to: "/user/profile", icon: "user" },
        { label: "About", to: "/user/about", icon: "info" },
        { label: "Experience", to: "/user/experience", icon: "briefcase" },
        { label: "Projects", to: "/user/projects", icon: "folder" },
        { label: "Skills", to: "/user/skills", icon: "zap" },
        { label: "Awards", to: "/user/awards", icon: "award" },
        { label: "Education", to: "/user/education", icon: "education" },
        { label: "Images", to: "/user/images", icon: "image" },
      ],
    },
  ];
}

const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // The menu follows the panel being viewed, so an admin in the user panel sees their own portfolio menu
  const inAdminPanel = location.pathname.startsWith("/admin");

  const { data } = useQuery<any>(NAV_COUNTS, {
    variables: { scope: inAdminPanel ? "admin" : "user" },
    pollInterval: 60_000,
    fetchPolicy: "cache-and-network",
  });
  const counts: Counts = data?.navCounts ?? { unreadMessages: 0, pendingApprovals: 0, newMessages: 0, newBookings: 0, newDriverApplications: 0, pendingReviews: 0, newFormSubmissions: 0, newLeads: 0 };
  const groups = inAdminPanel ? adminGroups(counts) : userGroups(counts);

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
    onClose();
  };

  return (
    <aside className={`sidebar${isOpen ? " sidebar-open" : ""}`} aria-label="Main navigation">
      <div className="sidebar-header">
        <Link to={inAdminPanel ? "/admin" : "/user"} className="sidebar-brand" onClick={onClose}>
          <span className="sidebar-logo" aria-hidden="true">{BRAND_NAME[0]}</span>
          <span className="sidebar-brand-text">
            <strong>{BRAND_NAME}</strong>
            <small>{inAdminPanel ? "Admin console" : "My portfolio"}</small>
          </span>
        </Link>
        <button className="sidebar-close" onClick={onClose} aria-label="Close menu"><Icon name="close" size={20} /></button>
      </div>

      {isAdmin && (
        <div className="sidebar-switch" role="group" aria-label="Panel">
          <button className={inAdminPanel ? "active" : ""} onClick={() => { navigate("/admin"); onClose(); }} aria-pressed={inAdminPanel}>Admin</button>
          <button className={!inAdminPanel ? "active" : ""} onClick={() => { navigate("/user"); onClose(); }} aria-pressed={!inAdminPanel}>My portfolio</button>
        </div>
      )}

      <nav className="sidebar-nav">
        {groups.map((group, gi) => (
          <div key={group.title ?? gi} className="sidebar-group">
            {group.title && <div className="sidebar-group-title">{group.title}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin" || item.to === "/user"}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
                onClick={onClose}
              >
                <Icon name={item.icon} size={18} className="sidebar-icon" />
                <span className="sidebar-label">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className={`sidebar-badge${item.badgeTone === "warn" ? " warn" : ""}`} title={`${item.badge} ${item.badgeTitle ?? ""}`.trim()}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link to="/" className="sidebar-footer-link" onClick={onClose}>
          <Icon name="store" size={17} className="sidebar-icon" /> Browse templates
        </Link>
        {user?.userName && (
          <a href={`/${user.userName}`} target="_blank" rel="noreferrer" className="sidebar-footer-link">
            <Icon name="external" size={17} className="sidebar-icon" /> View my website
          </a>
        )}
        <div className="sidebar-user">
          <span className="sidebar-avatar" aria-hidden="true">{initials(user?.fullName)}</span>
          <span className="sidebar-user-text">
            <strong title={user?.fullName}>{user?.fullName}</strong>
            <small title={user?.email}>{user?.email}</small>
          </span>
          <button className="sidebar-logout" onClick={handleLogout} title="Sign out" aria-label="Sign out"><Icon name="logout" size={18} /></button>
        </div>
      </div>
    </aside>
  );
}
