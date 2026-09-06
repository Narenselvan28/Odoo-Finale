import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useKeyboardShortcuts } from "../../context/KeyboardShortcutsContext";
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
  Command,
  Clock,
  ChevronDown,
  ExternalLink,
  Shield,
  Building2,
  CheckCircle2,
} from "lucide-react";
import UserProfileModal from "../common/UserProfileModal";

const AppLayout = ({ children, pageTitle = "Enterprise Studio", subtitle }) => {
  const { user, logout } = useAuth();
  const { openShortcuts } = useKeyboardShortcuts();
  const [profileOpen, setProfileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("dealflow_theme");
    localStorage.removeItem("dealflow_sidebar_collapsed");
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setUserDropdownOpen(false);
    logout();
    navigate("/login");
  };

  const userRole = user?.role || "sales_rep";

  // Role metadata styling
  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return { label: "Executive Admin", bg: "#fff7ed", color: "#ea580c", border: "#fdba74" };
      case "sales_manager":
        return { label: "Sales Director", bg: "#f5f3ff", color: "#7c3aed", border: "#c4b5fd" };
      case "sales_rep":
        return { label: "Account Executive", bg: "#f0f9ff", color: "#0284c7", border: "#7dd3fc" };
      case "finance_manager":
        return { label: "Finance Controller", bg: "#ecfdf5", color: "#059669", border: "#6ee7b7" };
      case "warehouse_manager":
        return { label: "Supply Chain Lead", bg: "#fffbeb", color: "#d97706", border: "#fcd34d" };
      case "customer":
        return { label: "Customer Client", bg: "#fdf2f8", color: "#db2777", border: "#fbcfe8" };
      default:
        return { label: role || "Operator", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
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
    { label: "Users & Profile", path: "/users", icon: Users },
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
    if (path.includes("/users") || path.includes("/profile")) {
      return "User Directory & Account Details";
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
          {/* Interactive User Icon & Profile Dropdown */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "5px 12px",
                background: userDropdownOpen ? "var(--orange-pale, #fff7ed)" : "var(--bg-secondary)",
                border: userDropdownOpen ? "1.5px solid var(--orange)" : "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                color: "var(--text)",
              }}
              title="Click to view User Details & Logout options"
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: "var(--orange)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {(user?.name || "U")[0]?.toUpperCase()}
              </div>
              <span style={{ color: "var(--text)", fontWeight: 700 }}>{user?.name || "User"}</span>
              <span
                style={{
                  fontSize: "10.5px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  backgroundColor: roleMeta.bg,
                  color: roleMeta.color,
                  border: `1px solid ${roleMeta.border}`,
                  fontWeight: 700,
                }}
              >
                {roleMeta.label}
              </span>
              <ChevronDown
                size={13}
                color="var(--text-muted)"
                style={{
                  transform: userDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>

            {/* Dropdown Menu Modal/Popover */}
            {userDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: "320px",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                  zIndex: 9999,
                  overflow: "hidden",
                  animation: "fadeIn 0.15s ease-out",
                }}
              >
                {/* User Details Header */}
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--bg-secondary)",
                    borderBottom: "1px solid var(--border-light)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        backgroundColor: "var(--orange)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: 800,
                        boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
                      }}
                    >
                      {(user?.name || "U")[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "var(--text-heading)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user?.name || "System User"}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user?.email || "user@dealflow360.com"}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor: roleMeta.bg,
                        color: roleMeta.color,
                        border: `1px solid ${roleMeta.border}`,
                        fontWeight: 700,
                      }}
                    >
                      {roleMeta.label}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: "#ffffff",
                        border: "1px solid var(--border-light)",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                      className="tnum"
                    >
                      ID: #{user?.id || 1}
                    </span>
                  </div>

                  {/* Organization */}
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                    Organization:{" "}
                    <strong style={{ color: "var(--text-heading)" }}>
                      {user?.Customer?.name || (user?.role === "customer" ? "Client Account" : "DealFlow 360 Enterprise")}
                    </strong>
                  </div>
                </div>

                {/* Session Guard Indicator */}
                <div
                  style={{
                    padding: "8px 1rem",
                    borderBottom: "1px solid var(--border-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "11.5px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        backgroundColor: "#10b981",
                        display: "inline-block",
                      }}
                    />
                    <span>Active Session</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>15m Inactivity Guard</span>
                </div>

                {/* Navigation Links */}
                <div style={{ padding: "6px" }}>
                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "var(--text)",
                      textDecoration: "none",
                      fontWeight: 500,
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <User size={15} color="var(--orange)" />
                    <span>My Profile & Account Details</span>
                  </Link>

                  <Link
                    to="/users"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "var(--text)",
                      textDecoration: "none",
                      fontWeight: 500,
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Users size={15} color="#6366f1" />
                    <span>All Users Directory & RBAC</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setProfileOpen(true);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "var(--text)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 500,
                      textAlign: "left",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Shield size={15} color="var(--color-success)" />
                    <span>Edit Profile Preferences</span>
                  </button>
                </div>

                {/* Logout Button */}
                <div
                  style={{
                    padding: "8px",
                    borderTop: "1px solid var(--border-light)",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      color: "#dc2626",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee2e2";
                      e.currentTarget.style.borderColor = "#f87171";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fef2f2";
                      e.currentTarget.style.borderColor = "#fecaca";
                    }}
                  >
                    <LogOut size={14} />
                    <span>Log Out / End Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Palette Launcher */}
          <button
            type="button"
            onClick={openShortcuts}
            className="btn btn-ghost btn-sm"
            style={{
              display: "inline-flex",
              gap: "6px",
              alignItems: "center",
              fontSize: "11.5px",
              padding: "4px 8px",
              border: "1px solid var(--border-light)",
            }}
            title="Open Keyboard Shortcuts (Press ⌘K or ?)"
          >
            <Command size={12} color="var(--orange)" />
            <span style={{ fontWeight: 600 }}>Shortcuts</span>
            <kbd
              style={{
                fontSize: "9.5px",
                padding: "1px 4px",
                backgroundColor: "var(--border-light)",
                borderRadius: "3px",
                color: "var(--text)",
                fontWeight: 700,
              }}
            >
              ⌘K
            </kbd>
          </button>

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

      {/* ===== USER PROFILE MODAL (Accessible by all users) ===== */}
      <UserProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
};

export default AppLayout;
