import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { usersApi } from "../../api";
import {
  User,
  Mail,
  Shield,
  Building2,
  Lock,
  X,
  Check,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Sparkles,
  KeyRound,
  FileSpreadsheet,
} from "lucide-react";

const UserProfileModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setNewPassword("");
      setConfirmPassword("");
      setEditMode(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const role = user.role || "sales_rep";

  const getRoleInfo = (r) => {
    switch (r) {
      case "admin":
        return {
          label: "Superuser Administrator",
          badgeColor: "var(--brand, #ea580c)",
          desc: "Full enterprise governance, RBAC permissions, audit logs, and catalog control.",
          level: "Level 3 - Root Authority",
        };
      case "sales_manager":
        return {
          label: "Sales Director",
          badgeColor: "#d97706",
          desc: "Authorized to review and approve commercial discount concessions up to 30%.",
          level: "Level 1 - Commercial Sign-off",
        };
      case "sales_rep":
        return {
          label: "Account Executive",
          badgeColor: "#0284c7",
          desc: "Standard CPQ quote configuration, product pricing, and deal negotiation dispatch.",
          level: "Standard - Quoting Authority (<15%)",
        };
      case "finance_manager":
        return {
          label: "Finance Controller",
          badgeColor: "#059669",
          desc: "Sole authority on heavy concessions (>30%), sub-margin approvals, and billing invoices.",
          level: "Level 2 - Financial Sign-off",
        };
      case "warehouse_manager":
        return {
          label: "Supply Chain Lead",
          badgeColor: "#0d9488",
          desc: "Warehouse inventory distribution, depot stock allocation, and dispatch split management.",
          level: "Logistics - Stock Allocation",
        };
      case "customer":
        return {
          label: "Customer / Client Account",
          badgeColor: "#7c3aed",
          desc: "Verified client portal access for quotation reviews, counter-proposals, and direct order approvals.",
          level: "External - Commercial Client",
        };
      default:
        return {
          label: r,
          badgeColor: "var(--brand, #ea580c)",
          desc: "Authenticated enterprise platform operator.",
          level: "Platform User",
        };
    }
  };

  const roleInfo = getRoleInfo(role);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (newPassword && newPassword.length < 6) {
      showToast({ title: "Password Error", message: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      showToast({ title: "Password Error", message: "Passwords do not match.", type: "error" });
      return;
    }

    try {
      setUpdating(true);
      const payload = { name };
      if (newPassword) payload.password = newPassword;

      await usersApi.updateProfile(payload);

      showToast({
        title: "Profile Updated",
        message: "Your profile details have been saved successfully.",
        type: "success",
      });
      setEditMode(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showToast({
        title: "Update Failed",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className="confirm-modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 100000,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="confirm-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "540px",
          width: "92%",
          padding: 0,
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Modal Header Banner */}
        <div
          style={{
            padding: "1.5rem",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
            }}
          >
            <X size={16} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* User Avatar Initial */}
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                backgroundColor: "var(--orange, #ea580c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(234, 88, 12, 0.4)",
                flexShrink: 0,
              }}
            >
              {(user.name || "U")[0].toUpperCase()}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>
                  {user.name}
                </h3>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.68rem",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    color: "#34d399",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#34d399" }} />
                  Active
                </span>
              </div>

              <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "2px" }}>
                {user.email}
              </div>

              <div style={{ marginTop: "6px" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    color: "#f8fafc",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  {roleInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Linked Customer Account (If Customer) */}
          {user.Customer && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--orange-pale, #fff7ed)",
                border: "1px solid var(--orange, #ea580c)",
                borderRadius: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "0.85rem", color: "#9a3412" }}>
                  <Building2 size={16} color="#ea580c" />
                  <span>Linked Customer Organization</span>
                </div>
                <span className="badge badge-orange">Customer Account</span>
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#431407" }}>
                {user.Customer.name}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#7c2d12", marginTop: "2px" }}>
                Industry: {user.Customer.industry || "General Enterprise"} · ID: #{user.Customer.id}
              </div>

              <div style={{ marginTop: "10px" }}>
                <a
                  href={`/portal/${user.Customer.id || 1}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: "0.75rem", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <span>Open Client Negotiation Portal</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* User Information & Role Permissions */}
          <div
            style={{
              padding: "1rem",
              backgroundColor: "var(--bg-secondary, #f8fafc)",
              border: "1px solid var(--border-light, #e2e8f0)",
              borderRadius: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.04em", marginBottom: "8px" }}>
              <Shield size={14} color="var(--orange, #ea580c)" />
              <span>Access Level & Role Privileges</span>
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)" }}>
              {roleInfo.level}
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              {roleInfo.desc}
            </p>
          </div>

          {/* Edit Profile / Change Password Section */}
          {!editMode ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                User ID: <strong style={{ color: "var(--text)" }}>#{user.id}</strong> · Status: <span style={{ color: "#059669", fontWeight: 600 }}>Active</span>
              </div>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.8rem" }}
              >
                <KeyRound size={14} />
                <span>Edit Profile / Change Password</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-heading)", borderBottom: "1px solid var(--border-light)", paddingBottom: "4px" }}>
                Update Account Information
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>New Password (optional)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Leave blank to keep"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: "0.78rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <Check size={14} />
                  <span>{updating ? "Saving..." : "Save Profile"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Modal Footer */}
          <div
            style={{
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-light, #e2e8f0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              type="button"
              onClick={() => {
                onClose();
                logout();
              }}
              className="btn btn-secondary btn-sm"
              style={{ color: "var(--color-danger, #dc2626)", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary btn-sm"
              style={{ fontSize: "0.8rem" }}
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
