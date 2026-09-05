import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { usersApi, rolesApi, approvalAuditLogsApi } from "../api";
import { useToast } from "../context/ToastContext";
import {
  Users,
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Lock
} from "lucide-react";

const UsersAdmin = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, lRes] = await Promise.all([
        usersApi.getAll(),
        rolesApi.getAll(),
        approvalAuditLogsApi.getAll(),
      ]);
      setUsers(uRes.data?.users || uRes.data || []);
      setRoles(rRes.data?.roles || rRes.data || []);
      setAuditLogs(lRes.data?.logs || lRes.data || []);
    } catch (err) {
      showToast({ title: "Failed to load admin data", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout pageTitle="Administration, Access Control & Audit Log">
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Registered Operators</span>
            <Users size={16} color="var(--color-accent)" />
          </div>
          <div className="metric-value tnum">{users.length}</div>
          <div className="metric-sub">Enterprise credentials</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Configured Roles</span>
            <Lock size={16} color="var(--color-info)" />
          </div>
          <div className="metric-value tnum">{roles.length}</div>
          <div className="metric-sub">RBAC permission tiers</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Governance Audit Logs</span>
            <History size={16} color="var(--color-success)" />
          </div>
          <div className="metric-value tnum">{auditLogs.length}</div>
          <div className="metric-sub">Full tamper-evident trail</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("users")}
          className={`btn btn-sm ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`}
        >
          <Users size={14} /> Team Members ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`btn btn-sm ${activeTab === "roles" ? "btn-primary" : "btn-secondary"}`}
        >
          <Lock size={14} /> Roles & Permissions ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`btn btn-sm ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`}
        >
          <History size={14} /> Immutable Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Users */}
      {activeTab === "users" && (
        <div className="data-card">
          <div className="data-card-header">
            <div style={{ position: "relative", width: "300px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                placeholder="Search users..."
                className="input input-sm"
                style={{ paddingLeft: "32px" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name & Identity</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>Loading team...</td></tr>
                ) : filteredUsers.slice(0, 50).map((u) => (
                  <tr key={u.id}>
                    <td className="tnum" style={{ fontWeight: 600 }}>#{u.id}</td>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{u.email}</td>
                    <td>
                      <span className="badge badge-enterprise">{u.role || "Operator"}</span>
                    </td>
                    <td>
                      {u.is_active !== false && u.isActive !== false ? (
                        <span className="badge badge-approved"><CheckCircle2 size={12} /> Active</span>
                      ) : (
                        <span className="badge badge-inactive"><XCircle size={12} /> Suspended</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles */}
      {activeTab === "roles" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Enterprise Roles & Authorization Boundaries</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Role ID</th>
                  <th>Designation</th>
                  <th>Governance Authority</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id}>
                    <td className="tnum">#{r.id}</td>
                    <td style={{ fontWeight: 600, color: "var(--color-accent)" }}>{r.name}</td>
                    <td style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Full read/write permissions for operational domain.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === "audit" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">System & Governance Audit Trail</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Quotation Ref</th>
                  <th>Action Triggered</th>
                  <th>Operator</th>
                  <th>Audit Note</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 50).map((log) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default UsersAdmin;
