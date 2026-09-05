import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  Calculator,
  FileSpreadsheet,
  CheckSquare,
  Boxes,
  Users,
  Warehouse,
  Receipt,
  Activity,
  ShieldCheck,
  LogOut,
  Plus,
  Kanban,
  BarChart3,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
} from "lucide-react";

const AppLayout = ({ children, pageTitle = "Enterprise Studio", subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("dealflow_sidebar_collapsed") === "true";
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("dealflow_theme");
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("dealflow_sidebar_collapsed", String(next));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userRole = user?.role || "sales_rep";

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return { label: "Superuser Admin" };
      case "sales_manager":
        return { label: "Sales Director" };
      case "sales_rep":
        return { label: "Account Executive" };
      case "finance_manager":
        return { label: "Finance Controller" };
      case "warehouse_manager":
        return { label: "Supply Chain Lead" };
      default:
        return { label: role };
    }
  };

  const roleMeta = getRoleBadge(userRole);

  const navSections = [
    {
      title: "Commercial & CPQ",
      items: [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Pricing Studio", path: "/cpq", icon: Calculator },
        { label: "Quotations", path: "/quotations", icon: FileSpreadsheet },
        { label: "Pipeline Kanban", path: "/pipeline", icon: Kanban },
        { label: "Approvals", path: "/approvals", icon: CheckSquare },
      ],
    },
    {
      title: "Catalog & Supply",
      items: [
        { label: "Catalog & Rules", path: "/catalog", icon: Boxes },
        { label: "Customers", path: "/customers", icon: Users },
        { label: "Inventory & Depots", path: "/inventory", icon: Warehouse },
      ],
    },
    {
      title: "Finance & Telemetry",
      items: [
        { label: "Invoices & Billing", path: "/billing", icon: Receipt },
        { label: "Deal Telemetry", path: "/intelligence", icon: Activity },
        { label: "Reports & Exports", path: "/reporting", icon: BarChart3 },
        { label: "Admin & Audit", path: "/users", icon: ShieldCheck },
      ],
    },
  ];

  const getSectionCategory = (path) => {
    if (path.includes("/cpq") || path.includes("/quotations") || path.includes("/pipeline") || path.includes("/approvals")) {
      return "Sales Operations & CPQ";
    }
    if (path.includes("/catalog") || path.includes("/customers")) {
      return "Commercial Catalog & Accounts";
    }
    if (path.includes("/inventory")) {
      return "Logistics & Supply Chain";
    }
    if (path.includes("/billing")) {
      return "Finance & Contract Revenue";
    }
    if (path.includes("/intelligence") || path.includes("/reporting")) {
      return "Executive Telemetry & Intelligence";
    }
    if (path.includes("/users")) {
      return "System Governance & Audit";
    }
    return "Enterprise Command Center";
  };

  const sectionCategory = getSectionCategory(location.pathname);

  return (
    <div className="app-shell">
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ===== ENTERPRISE PERSISTENT SIDEBAR ===== */}
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-logo">
            <div className="sidebar-logo-icon">✦</div>
            {!isCollapsed && (
              <div className="sidebar-logo-text">
                <span className="sidebar-brand">
                  DealFlow <span>360</span>
                </span>
                <span className="sidebar-sub">Intelligent CPQ</span>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            className="sidebar-collapse-btn desktop-only"
            onClick={toggleCollapsed}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle Sidebar"
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Mobile close toggle */}
          <button
            type="button"
            className="sidebar-collapse-btn mobile-only"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="sidebar-cta">
          <Link
            to="/cpq"
            className="sidebar-new-quote-btn"
            title="Create New Quote"
          >
            <Plus size={16} />
            {!isCollapsed && <span>New Quote</span>}
          </Link>
        </div>

        {/* Grouped Sidebar Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title} className="sidebar-group">
              {!isCollapsed && (
                <div className="sidebar-group-title">{section.title}</div>
              )}
              <div className="sidebar-group-links">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-link ${isActive ? "active" : ""}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon size={17} className="sidebar-link-icon" />
                      {!isCollapsed && (
                        <span className="sidebar-link-label">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer with User Persona & Session Control */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            {!isCollapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name" title={user?.name || "Enterprise User"}>
                  {user?.name || "User"}
                </div>
                <div className="sidebar-user-role">{roleMeta.label}</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-logout-btn"
            title="End Session"
          >
            <LogOut size={14} />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT WRAPPER ===== */}
      <div className="main-wrapper">
        {/* Institutional Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-trigger"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </button>

            <div className="topbar-breadcrumb">
              <Link to="/dashboard">Home</Link>
              <span className="sep">/</span>
              <span>{sectionCategory}</span>
              <span className="sep">/</span>
              <span className="current">{pageTitle}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="topbar-chip">
              <span className="pulse-dot"></span>
              <span>MySQL Connected</span>
            </div>

            <div className="topbar-chip badge-strict">
              <ShieldCheck size={13} color="var(--orange)" />
              <span>Strict RBAC</span>
            </div>

            <div className="topbar-user-badge">
              <User size={12} color="var(--orange)" />
              <span className="user-name">{user?.name || "User"}</span>
              <span className="badge badge-orange">{roleMeta.label}</span>
            </div>
          </div>
        </header>

        {/* Main Content Workspace */}
        <div className="main-content-body">
          <div className="page-header">
            <div className="label">{sectionCategory}</div>
            <h1>{pageTitle}</h1>
            <div className="accent-line"></div>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <main style={{ minHeight: "520px", flex: 1, paddingBottom: "32px" }}>
            {children}
          </main>

          {/* Institutional Multi-Column Footer */}
          <footer className="footer">
            <div>
              <div className="brand">
                ✦ <span>DealFlow</span> 360
              </div>
              <div className="sub">Intelligent, Self-Governing Sales Operations</div>
            </div>
            <div>
              <h6>Commercial Engines</h6>
              <ul>
                <li><Link to="/cpq">Configure, Price, Quote (CPQ)</Link></li>
                <li><Link to="/pipeline">Pipeline Kanban Board</Link></li>
                <li><Link to="/approvals">Governance & Risk Routing</Link></li>
                <li><Link to="/billing">Dual Capex / Opex Billing</Link></li>
              </ul>
            </div>
            <div>
              <h6>Supply & Accounts</h6>
              <ul>
                <li><Link to="/inventory">Multi-Warehouse Inventory</Link></li>
                <li><Link to="/catalog">Product Bundles & Rules</Link></li>
                <li><Link to="/customers">Customer Account Tiers</Link></li>
                <li><Link to="/reporting">Executive Telemetry Desk</Link></li>
              </ul>
            </div>
            <div>
              <h6>Governance & Control</h6>
              <ul>
                <li><Link to="/intelligence">Deal Health & Anomaly Radar</Link></li>
                <li><Link to="/users">Audit Trail Logs</Link></li>
                <li><span style={{ color: "var(--orange)" }}>Security: RBAC Strict Active</span></li>
                <li><span style={{ color: "var(--color-success)" }}>Database: MySQL Connected</span></li>
              </ul>
            </div>
          </footer>

          <div className="footer-bottom">
            © 2026 <span>DealFlow 360</span> · Institutional Sales Operations Platform · All rights reserved
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
