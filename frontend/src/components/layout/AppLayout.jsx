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
  Sparkles
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

  const navSections = [
    {
      title: "Core Operations",
      items: [
        { label: "Dashboard Cockpit", path: "/dashboard", icon: LayoutDashboard },
        { label: "Pricing Studio (CPQ)", path: "/cpq", icon: Calculator, badge: "Flagship" },
      ],
    },
    {
      title: "Sales & Governance",
      items: [
        { label: "Quotations Ledger", path: "/quotations", icon: FileSpreadsheet },
        { label: "Approvals Queue", path: "/approvals", icon: CheckSquare },
      ],
    },
    {
      title: "Catalog & Pricing",
      items: [
        { label: "Products & Rules", path: "/catalog", icon: Boxes },
        { label: "Customers & Tiers", path: "/customers", icon: Users },
      ],
    },
    {
      title: "Supply & Fulfillment",
      items: [
        { label: "Inventory & Warehouses", path: "/inventory", icon: Warehouse },
        { label: "Billing & Subscriptions", path: "/billing", icon: Receipt },
      ],
    },
    {
      title: "Intelligence & Security",
      items: [
        { label: "Deal Intelligence", path: "/intelligence", icon: Activity },
        { label: "Admin & Audit", path: "/users", icon: ShieldCheck },
      ],
    },
  ];

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
            <span className="sidebar-brand-tag">PRISM CPQ · ENTERPRISE</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="sidebar-section">
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => {
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
                          backgroundColor: "#4f46e5",
                          color: "#fff",
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
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
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
                {user?.name || "Admin User"}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "capitalize" }}>
                {user?.role || "Staff"}
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
            <Link to="/cpq" className="btn btn-primary btn-sm">
              <PlusCircle size={15} />
              <span>Configure New Quote</span>
            </Link>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
