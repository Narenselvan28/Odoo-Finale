import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { usersApi, rolesApi, approvalAuditLogsApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Users,
  User,
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  Search,
  Lock,
  Mail,
  Building,
  Calendar,
  Save,
  Clock,
  Sparkles,
  Award,
  Key,
  Eye,
  X
} from "lucide-react";

const getRoleBadgeStyle = (role) => {
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

const getRolePermissions = (role) => {
  switch (role) {
    case "admin":
      return [
        "Full System Administration & Configuration",
        "CPQ Pricing Studio & Quote Creation",
        "Multi-Level Governance & Risk Overrides",
        "Dual Capex/Opex Invoicing & Subscription Prorations",
        "Multi-Depot Fulfillment & Inventory Splits",
        "User & RBAC Permissions Management",
      ];
    case "sales_manager":
      return [
        "Multi-Level Approvals Desk (Level 1 & Level 2)",
        "Quotation Governance Overrides & Discount Waivers",
        "Team Pipeline Kanban & Deal Velocity Oversight",
        "CPQ Pricing Studio & Quotation Drafting",
        "Customer Negotiation Feedback Reflection",
      ];
    case "sales_rep":
      return [
        "CPQ Pricing Studio & Interactive Quote Builder",
        "Customer Tier Policy & Margin Evaluations",
        "Customer Desk & Account Directory Access",
        "Commercial Proposal Drafting & Submissions",
        "DealFlow AI Telemetry & Predictive Risk Insights",
      ];
    case "finance_manager":
      return [
        "Dual-Engine Capex / Opex Invoice Generation",
        "Milestone Billing Schedules & Mid-Cycle Prorations",
        "Revenue Analytics & Contract Financial Audits",
        "Commercial Governance Approvals (Level 2)",
      ];
    case "warehouse_manager":
      return [
        "Multi-Depot Stock Allocation & Inventory Fulfillment",
        "Freight Weight & Regional Distance Optimizations",
        "Warehouse Stock Depots Management",
      ];
    case "customer":
      return [
        "Dedicated Live Customer Proposal Negotiation Portal",
        "Counter-Discount Proposal Submissions",
        "Direct Quotation Acceptance & Order Confirmation",
        "Interactive Real-Time DealFlow AI Chatbot Assistant",
      ];
    default:
      return ["Standard Platform Operations", "Quotation & Catalog Viewing"];
  }
};

const UsersAdmin = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("my-profile"); // "my-profile" | "users" | "roles" | "audit"
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [selectedUserModal, setSelectedUserModal] = useState(null);

  // Editable profile state for current user
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "Sales Operations",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, lRes] = await Promise.all([
        usersApi.getAll().catch(() => ({ data: [] })),
        rolesApi.getAll().catch(() => ({ data: [] })),
        approvalAuditLogsApi.getAll().catch(() => ({ data: [] })),
      ]);
      const uList = uRes.data?.users || uRes.data || [];
      const rList = rRes.data?.roles || rRes.data || [];
      const lList = lRes.data?.logs || lRes.data || [];
      setUsers(uList);
      setRoles(rList);
      setAuditLogs(lList);

      if (currentUser) {
        setProfileForm({
          name: currentUser.name || "",
          email: currentUser.email || "",
          phone: currentUser.phone || "+1 (555) 019-2834",
          department: currentUser.role === "customer" ? "Client Purchasing" : "Enterprise Sales Operations",
        });
      }
    } catch (err) {
      showToast({ title: "Failed to load directory", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      if (currentUser?.id) {
        await usersApi.update(currentUser.id, {
          name: profileForm.name,
          phone: profileForm.phone,
        });
      }
      showToast({
        title: "Profile Updated",
        message: "Your user account details have been successfully saved.",
        type: "success",
      });
    } catch (err) {
      showToast({
        title: "Profile Update Notice",
        message: err.response?.data?.message || "Profile preferences updated locally.",
        type: "info",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const operatorsCount = users.filter((u) => u.role !== "customer").length;
  const customersCount = users.filter((u) => u.role === "customer").length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.Customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (roleFilter === "OPERATOR") return u.role !== "customer";
    if (roleFilter === "CUSTOMER") return u.role === "customer";
    return true;
  });

  const activeRoleBadge = getRoleBadgeStyle(currentUser?.role);
  const activePermissions = getRolePermissions(currentUser?.role);

  return (
    <AppLayout
      pageTitle="User Accounts & Enterprise Directory"
      subtitle="Complete user identity, RBAC authorization matrix, and organization details"
    >
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>My Active Identity</span>
            <User size={16} color="var(--orange)" />
          </div>
          <div className="metric-value" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            {currentUser?.name || "User"}
          </div>
          <div className="metric-sub">{activeRoleBadge.label}</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Enterprise Operators</span>
            <Users size={16} color="var(--color-accent)" />
          </div>
          <div className="metric-value tnum">{operatorsCount}</div>
          <div className="metric-sub">Internal sales & operations team</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Customer Accounts</span>
            <Users size={16} color="#db2777" />
          </div>
          <div className="metric-value tnum">{customersCount}</div>
          <div className="metric-sub">Client organization credentials</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Configured RBAC Roles</span>
            <Lock size={16} color="var(--color-info)" />
          </div>
          <div className="metric-value tnum">{roles.length || 5}</div>
          <div className="metric-sub">Role permission tiers</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
          borderBottom: "1px solid var(--color-border-subtle)",
          paddingBottom: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setActiveTab("my-profile")}
          className={`btn btn-sm ${activeTab === "my-profile" ? "btn-primary" : "btn-secondary"}`}
        >
          <User size={14} /> My Profile & Details
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`btn btn-sm ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`}
        >
          <Users size={14} /> All Users Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`btn btn-sm ${activeTab === "roles" ? "btn-primary" : "btn-secondary"}`}
        >
          <Lock size={14} /> Roles & Authorization Matrix ({roles.length || 5})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`btn btn-sm ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`}
        >
          <History size={14} /> System Governance Trail ({auditLogs.length})
        </button>
      </div>

      {/* ===== TAB 1: MY PROFILE & DETAILS ===== */}
      {activeTab === "my-profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
          {/* Profile Overview Card */}
          <div className="data-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "14px",
                  backgroundColor: activeRoleBadge.bg,
                  border: `2px solid ${activeRoleBadge.border}`,
                  color: activeRoleBadge.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {(currentUser?.name || "U")[0]?.toUpperCase()}
              </div>

              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-heading)" }}>
                  {currentUser?.name || "System User"}
                </h2>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {currentUser?.email || "user@dealflow360.com"}
                </div>
                <div style={{ marginTop: "6px", display: "flex", gap: "6px", alignItems: "center" }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: activeRoleBadge.bg,
                      color: activeRoleBadge.color,
                      border: `1px solid ${activeRoleBadge.border}`,
                      fontWeight: 700,
                      fontSize: "0.75rem",
                    }}
                  >
                    {activeRoleBadge.label}
                  </span>
                  <span className="badge badge-approved" style={{ fontSize: "0.7rem" }}>
                    <CheckCircle2 size={11} /> Authenticated
                  </span>
                </div>
              </div>
            </div>

            {/* Key Metadata Table */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.825rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-muted)" }}>User Reference ID:</span>
                <span className="tnum" style={{ fontWeight: 600 }}>#{currentUser?.id || "1"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-muted)" }}>Organization / Company:</span>
                <span style={{ fontWeight: 600 }}>
                  {currentUser?.Customer?.name || (currentUser?.role === "customer" ? "Client Account" : "DealFlow 360 Enterprise")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-muted)" }}>Inactivity Security Guard:</span>
                <span style={{ fontWeight: 600, color: "var(--color-success)" }}>15-Minute Auto Inactivity Timeout</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ color: "var(--text-muted)" }}>Access Token Status:</span>
                <span style={{ fontWeight: 600, color: "var(--orange)" }}>JWT 24-Hour Active Session</span>
              </div>
            </div>

            {/* Granted Capabilities List */}
            <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.75rem" }}>
                <ShieldCheck size={16} color="var(--orange)" />
                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-heading)" }}>
                  Granted Role Capabilities
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {activePermissions.map((perm, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      padding: "4px 0",
                    }}
                  >
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--orange)" }} />
                    <span>{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Edit Profile Form Card */}
          <div className="data-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem" }}>
              <User size={18} color="var(--orange)" />
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Account Information & Preferences</h3>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "4px" }}>
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  className="input input-sm"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "4px" }}>
                  Official Email Address (Primary Identity)
                </label>
                <input
                  type="email"
                  disabled
                  className="input input-sm"
                  value={profileForm.email}
                  style={{ backgroundColor: "var(--bg-secondary)", cursor: "not-allowed" }}
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                  Email address is linked to enterprise SSO & authentication tokens.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "4px" }}>
                  Contact Telephone / Direct Line
                </label>
                <input
                  type="text"
                  className="input input-sm"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "4px" }}>
                  Department / Operational Unit
                </label>
                <input
                  type="text"
                  className="input input-sm"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  placeholder="e.g. Strategic Accounts"
                />
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary"
                  style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
                >
                  <Save size={14} />
                  <span>{savingProfile ? "Saving Details..." : "Save Account Details"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== TAB 2: ALL USERS DIRECTORY ===== */}
      {activeTab === "users" && (
        <div className="data-card">
          <div className="data-card-header" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ position: "relative", width: "280px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                placeholder="Search by name, email, company, role..."
                className="input input-sm"
                style={{ paddingLeft: "32px", width: "100%" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Filter Buttons */}
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setRoleFilter("ALL")}
                className={`btn btn-sm ${roleFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                All Users ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("OPERATOR")}
                className={`btn btn-sm ${roleFilter === "OPERATOR" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                Enterprise Operators ({operatorsCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("CUSTOMER")}
                className={`btn btn-sm ${roleFilter === "CUSTOMER" ? "btn-primary" : "btn-secondary"}`}
                style={{ fontSize: "0.75rem", padding: "4px 10px", color: roleFilter === "CUSTOMER" ? "#fff" : "#db2777" }}
              >
                Customer Accounts ({customersCount})
              </button>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name & Identity</th>
                  <th>Contact Email</th>
                  <th>Designation Role</th>
                  <th>Organization / Client</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: "right" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>Loading team directory...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>No users match the search criteria.</td></tr>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadgeStyle(u.role);
                    const isSelf = currentUser && String(currentUser.id) === String(u.id);
                    return (
                      <tr key={u.id} style={{ backgroundColor: isSelf ? "rgba(234, 88, 12, 0.04)" : "transparent" }}>
                        <td className="tnum" style={{ fontWeight: 600 }}>#{u.id}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                backgroundColor: badge.bg,
                                color: badge.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.75rem",
                              }}
                            >
                              {(u.name || "U")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: "var(--text-heading)" }}>{u.name}</span>
                              {isSelf && (
                                <span style={{ marginLeft: "6px", fontSize: "0.65rem", backgroundColor: "var(--orange)", color: "#fff", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--color-text-secondary)" }}>{u.email}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              fontWeight: 700,
                              fontSize: "0.7rem",
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8125rem", color: u.Customer ? "var(--text-heading)" : "var(--text-muted)" }}>
                          {u.Customer ? u.Customer.name : "DealFlow 360 Internal"}
                        </td>
                        <td>
                          {u.is_active !== false && u.isActive !== false ? (
                            <span className="badge badge-approved"><CheckCircle2 size={12} /> Active</span>
                          ) : (
                            <span className="badge badge-inactive"><XCircle size={12} /> Suspended</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedUserModal(u)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                            title="View full user details & permissions"
                          >
                            <Eye size={12} /> View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB 3: ROLES & AUTHORIZATION MATRIX ===== */}
      {activeTab === "roles" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Enterprise Roles, Capabilities & Governance Boundaries</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role Designation</th>
                  <th>Governance Authority Level</th>
                  <th>Operational Domain Capabilities</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: "admin", label: "Executive Admin", level: "Level 2 (Executive)", desc: "Full administrative control, CPQ studio, users management, and governance override authority." },
                  { role: "sales_manager", label: "Sales Director", level: "Level 1 & 2 Approver", desc: "Multi-level approval gate review, high-discount concession waivers, and team pipeline oversight." },
                  { role: "sales_rep", label: "Account Executive", level: "Standard Commercial", desc: "CPQ quote configuration, tier pricing evaluations, and proposal authoring." },
                  { role: "finance_manager", label: "Finance Controller", level: "Level 2 Approver", desc: "Dual Capex/Opex billing schedules, milestone invoicing, and mid-cycle subscription proration." },
                  { role: "warehouse_manager", label: "Supply Chain Lead", level: "Logistics Fulfillment", desc: "Multi-depot line item fulfillment splits and warehouse stock allocation." },
                  { role: "customer", label: "Customer Client", level: "External Counterpart", desc: "Access to interactive Customer Negotiation Portal, 35% counter-proposals, and order acceptance." },
                ].map((r, i) => {
                  const badge = getRoleBadgeStyle(r.role);
                  return (
                    <tr key={i}>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontWeight: 700,
                            fontSize: "0.75rem",
                          }}
                        >
                          {r.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--color-accent)", fontSize: "0.8125rem" }}>
                        {r.level}
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                        {r.desc}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TAB 4: AUDIT TRAIL ===== */}
      {activeTab === "audit" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">System & Governance Audit Trail (Immutable Log)</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Quotation Ref</th>
                  <th>Action Triggered</th>
                  <th>Operator</th>
                  <th>Audit Note & Justification</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>No audit records found.</td></tr>
                ) : (
                  auditLogs.slice(0, 50).map((log) => (
                    <tr key={log.id}>
                      <td className="tnum">#{log.id}</td>
                      <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                        Quote #{log.quotation_id}
                      </td>
                      <td>
                        <span className="badge badge-draft">{log.action || "GOVERNANCE_ACTION"}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>User #{log.user_id || "1"}</td>
                      <td style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                        {log.reason || "System event recorded."}
                      </td>
                      <td className="tnum" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "2026-09-05"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserModal && (
        <div className="modal-overlay" onClick={() => setSelectedUserModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={18} color="var(--orange)" />
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>User Account Details</h3>
              </div>
              <button type="button" onClick={() => setSelectedUserModal(null)} className="btn btn-ghost btn-sm">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: "8px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    backgroundColor: getRoleBadgeStyle(selectedUserModal.role).bg,
                    color: getRoleBadgeStyle(selectedUserModal.role).color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.25rem",
                  }}
                >
                  {(selectedUserModal.name || "U")[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-heading)" }}>
                    {selectedUserModal.name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {selectedUserModal.email}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.725rem" }}>User ID</span>
                  <strong>#{selectedUserModal.id}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.725rem" }}>Role</span>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: getRoleBadgeStyle(selectedUserModal.role).bg,
                      color: getRoleBadgeStyle(selectedUserModal.role).color,
                      fontSize: "0.7rem",
                    }}
                  >
                    {getRoleBadgeStyle(selectedUserModal.role).label}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.725rem" }}>Organization</span>
                  <strong>{selectedUserModal.Customer?.name || "DealFlow 360 Enterprise"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.725rem" }}>Status</span>
                  <span className="badge badge-approved" style={{ fontSize: "0.7rem" }}>Active</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Role Capabilities
                </span>
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {getRolePermissions(selectedUserModal.role).map((perm, i) => (
                    <div key={i} style={{ fontSize: "0.775rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "var(--orange)" }} />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setSelectedUserModal(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default UsersAdmin;
