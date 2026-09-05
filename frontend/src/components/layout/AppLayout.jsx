import React, { useState } from "react";
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
  PlusCircle,
  Menu,
  X,
  Sparkles,
  Shield,
  Kanban,
  BarChart3
} from "lucide-react";

const AppLayout = ({ children, pageTitle = "Enterprise Studio" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userRole = user?.role || "sales_rep";

  // Role color palette
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "admin":
        return { bg: "#4f46e5", text: "#ffffff", label: "Admin" };
      case "sales_manager":
        return { bg: "#d97706", text: "#ffffff", label: "Sales Director" };
      case "sales_rep":
        return { bg: "#0284c7", text: "#ffffff", label: "Account Exec" };
      case "finance_manager":
        return { bg: "#059669", text: "#ffffff", label: "Finance Controller" };
      case "warehouse_manager":
        return { bg: "#0d9488", text: "#ffffff", label: "Supply Chain Lead" };
      default:
        return { bg: "#64748b", text: "#ffffff", label: role };
    }
  };

  const roleMeta = getRoleBadgeStyle(userRole);

  const allRoles = ["admin", "sales_manager", "sales_rep", "finance_manager", "warehouse_manager"];

  const allNavSections = [
    {
      title: "Core Operations",
      roles: allRoles,
      items: [
        { label: "Dashboard Cockpit", path: "/dashboard", icon: LayoutDashboard },
        { label: "Pricing Studio (CPQ)", path: "/cpq", icon: Calculator, badge: "Flagship" },
      ],
    },
    {
      title: "Sales & Governance",
      roles: allRoles,
      items: [
        { label: "Quotations Ledger", path: "/quotations", icon: FileSpreadsheet },
        { label: "Pipeline Kanban", path: "/pipeline", icon: Kanban, badge: "Live" },
        {
          label: "Approvals Queue",
          path: "/approvals",
          icon: CheckSquare,
          badge: userRole === "admin" || userRole === "sales_manager" ? "Director" : userRole === "finance_manager" ? "L2 Finance" : "Review",
        },
      ],
    },
    {
      title: "Catalog & Accounts",
      roles: allRoles,
      items: [
        { label: "Products & Rules", path: "/catalog", icon: Boxes },
        { label: "Customers & Tiers", path: "/customers", icon: Users },
      ],
    },
    {
      title: "Supply & Logistics",
      roles: allRoles,
      items: [
        { label: "Inventory & Stock", path: "/inventory", icon: Warehouse, badge: userRole === "warehouse_manager" ? "Lead" : null },
      ],
    },
    {
      title: "Revenue & Billing",
      roles: allRoles,
      items: [
        { label: "Invoices & Subscriptions", path: "/billing", icon: Receipt, badge: userRole === "finance_manager" ? "Lead" : null },
      ],
    },
    {
      title: "Deal Telemetry & Ops",
      roles: allRoles,
      items: [
        { label: "Deal Intelligence", path: "/intelligence", icon: Activity },
        { label: "Telemetry & Reports", path: "/reporting", icon: BarChart3, badge: "Analytics" },
      ],
    },
    {
      title: "System Governance",
      roles: allRoles,
      items: [
        { label: "Admin & Audit", path: "/users", icon: ShieldCheck, badge: userRole === "admin" ? "Superuser" : "Audit" },
      ],
    },
  ];

  // All sections are enabled for all users
  const visibleSections = allNavSections;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`app-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-mark">
            <Sparkles size={18} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="sidebar-brand-name">DealFlow 360</span>
            <span className="sidebar-brand-tag">RBAC · ENTERPRISE</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {visibleSections.map((section, sIdx) => {
            const items = section.items.filter((item) => !item.roles || item.roles.includes(userRole));
            if (items.length === 0) return null;

            return (
              <div key={sIdx} className="sidebar-section">
                <div className="sidebar-section-title">{section.title}</div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-link ${isActive ? "active" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon size={16} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: "0.625rem",
                            backgroundColor: isActive ? "#ffffff" : "#334155",
                            color: isActive ? "#312e81" : "#e2e8f0",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge" style={{ flex: 1, minWidth: 0 }}>
            <div
              className="user-avatar"
              style={{
                backgroundColor: roleMeta.bg,
                color: roleMeta.text,
                fontWeight: 700,
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#f8fafc",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user?.name || "Operator"}
              </span>
              <span
                style={{
                  fontSize: "0.6875rem",
                  color: "#cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: roleMeta.bg,
                  }}
                />
                {roleMeta.label}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="btn btn-ghost btn-sm"
            style={{ color: "#94a3b8", padding: "6px" }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              className="btn btn-ghost btn-sm mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ display: "none" }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="topbar-title">{pageTitle}</h1>
          </div>

          <div className="topbar-right">
            <div
              style={{
                fontSize: "0.75rem",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "var(--color-paper-2)",
                border: "1px solid var(--color-border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Shield size={13} color={roleMeta.bg} />
              <span style={{ color: "var(--color-text-secondary)" }}>Role:</span>
              <strong style={{ color: "var(--color-text-primary)" }}>{roleMeta.label}</strong>
            </div>

            {(userRole === "admin" || userRole === "sales_manager" || userRole === "sales_rep") && (
              <Link to="/cpq" className="btn btn-primary btn-sm">
                <PlusCircle size={15} />
                <span>Configure New Quote</span>
              </Link>
            )}
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
