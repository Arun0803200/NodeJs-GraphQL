import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { BRAND_NAME } from "../../lib/brand";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <Link to="/" className="mobile-title"><span className="sidebar-logo" aria-hidden="true">{BRAND_NAME[0]}</span>{BRAND_NAME}</Link>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
