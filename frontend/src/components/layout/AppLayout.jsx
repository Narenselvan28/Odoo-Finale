import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DealFlowChatbot from "../chat/DealFlowChatbot";
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
  RefreshCw,
} from "lucide-react";

const AppLayout = ({ children, pageTitle = "Enterprise Studio", subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("dealflow_theme");
    localStorage.removeItem("dealflow_sidebar_collapsed");
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userRole = user?.role || "sales_rep";

  // Role metadata styling
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

  const navLinks = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Pricing Studio", path: "/cpq", icon: Calculator },
    { label: "Quotations", path: "/quotations", icon: FileSpreadsheet },
    { label: "Pipeline Kanban", path: "/pipeline", icon: Kanban },
    { label: "Approvals", path: "/approvals", icon: CheckSquare },
    { label: "Catalog & Rules", path: "/catalog", icon: Boxes },
    { label: "Customers", path: "/customers", icon: Users },
    { label: "Inventory & Depots", path: "/inventory", icon: Warehouse },
    { label: "Invoices & Billing", path: "/billing", icon: Receipt },
    { label: "Deal Telemetry", path: "/intelligence", icon: Activity },
    { label: "Reports & Exports", path: "/reporting", icon: BarChart3 },
    { label: "Admin & Audit", path: "/users", icon: ShieldCheck },
  ];

  // Category determination for breadcrumbs & page header
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
    <div className="app">
      {/* ===== INSTITUTIONAL TOP HEADER ===== */}
      <header className="header">
        <div>
          <Link to="/dashboard" className="logo">
            ✦ <span>DealFlow</span> 360
          </Link>
          <span className="logo-sub">Intelligent Sales Operations & CPQ Platform</span>
        </div>

        <div className="header-actions">
          {/* User Persona Chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <User size={13} color="var(--orange)" />
            <span style={{ color: "var(--text)" }}>{user?.name || "User"}</span>
            <span className="badge badge-orange">{roleMeta.label}</span>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="btn btn-ghost btn-sm"
            style={{ display: "inline-flex", gap: "5px", alignItems: "center", fontSize: "11.5px" }}
            title="Reload Data: Refreshes pricing, stock, and approval data from backend (Spec B1)"
          >
            <RefreshCw size={12} />
            <span>Reload Data</span>
          </button>

          <Link to="/cpq" className="btn btn-primary btn-sm">
            <Plus size={13} /> New Quote
          </Link>

          <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="End Session">
            <LogOut size={13} /> Log out
          </button>
        </div>
      </header>

      {/* ===== SIGNATURE ORANGE NAVIGATION BAR (ref ui.txt) ===== */}
      <nav className="nav-bar">
        {navLinks.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={isActive ? "active" : ""}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ===== BREADCRUMB ===== */}
      <div className="breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">/</span>
        <span>{sectionCategory}</span>
        <span className="sep">/</span>
        <span className="current">{pageTitle}</span>
      </div>

      {/* ===== PAGE HEADER ===== */}
      <div className="page-header">
        <div className="label">{sectionCategory}</div>
        <h1>{pageTitle}</h1>
        <div className="accent-line"></div>
        {subtitle && <p>{subtitle}</p>}
      </div>

      {/* ===== MAIN PAGE WORKSPACE ===== */}
      <main style={{ minHeight: "520px", flex: 1, paddingBottom: "24px" }}>
        {children}
      </main>

      {/* 💬 Global DealFlow360 Conversational Deal Assistant */}
      <DealFlowChatbot />
    </div>
  );
};

export default AppLayout;

