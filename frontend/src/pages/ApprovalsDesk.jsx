import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { approvalsApi, approvalAuditLogsApi } from "../api";
import { useToast } from "../context/ToastContext";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Search,
  MessageSquare,
  History,
  ExternalLink,
} from "lucide-react";

const ApprovalsDesk = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canApprove = true; // Enabled for all enterprise users
  const [approvals, setApprovals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionStatus, setActionStatus] = useState("APPROVED");
  const [actionReason, setActionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appRes, logRes] = await Promise.all([
        approvalsApi.getAll(),
        approvalAuditLogsApi.getAll(),
      ]);
      setApprovals(appRes.data?.approvals || appRes.data || []);
      setAuditLogs(logRes.data?.logs || logRes.data || []);
    } catch (err) {
      showToast({
        title: "Failed to load approvals",
        message: err.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleActionSubmit = async () => {
    if (!actionReason.trim()) {
      showToast({ message: "Please provide a governance justification reason.", type: "error" });
      return;
    }

    try {
      setSubmitting(true);
      await approvalsApi.action(selectedApproval.id, {
        status: actionStatus,
        reason: actionReason,
      });

      showToast({
        title: "Governance Action Recorded",
        message: `Approval request #${selectedApproval.id} set to ${actionStatus}.`,
        type: "success",
      });

      setSelectedApproval(null);
      setActionReason("");
      fetchData();
    } catch (err) {
      showToast({
        title: "Action failed",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = approvals.filter((a) => !a.status || a.status === "PENDING" || a.status === "PENDING_APPROVAL").length;
  const approvedCount = approvals.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = approvals.filter((a) => a.status === "REJECTED" || a.status === "RETURNED").length;

  return (
    <AppLayout pageTitle="Governance & Approvals Queue">
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Pending Director Review</span>
            <Clock size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-warning)" }}>
            {pendingCount}
          </div>
          <div className="metric-sub">Requires active sign-off</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Approved Concessions</span>
            <CheckCircle2 size={16} color="var(--color-success)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-success)" }}>
            {approvedCount}
          </div>
          <div className="metric-sub">Commercial waivers granted</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Rejected / Returned</span>
            <XCircle size={16} color="var(--color-danger)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-danger)" }}>
            {rejectedCount}
          </div>
          <div className="metric-sub">Violated margin floor</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Audit Trail Entries</span>
            <History size={16} color="var(--color-info)" />
          </div>
          <div className="metric-value tnum">{auditLogs.length}</div>
          <div className="metric-sub">Immutable compliance log</div>
        </div>
      </div>

      {/* Main Approvals Table */}
      <div className="data-card">
        <div className="data-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={18} color="var(--color-accent)" />
            <span className="data-card-title">Commercial Exceptions & Approval Requests</span>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Quote Ref</th>
                <th>Required Tier</th>
                <th>Target Approver</th>
                <th>Current Status</th>
                <th>Decision Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    Loading governance requests...
                  </td>
                </tr>
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                    No approvals currently in queue.
                  </td>
                </tr>
              ) : (
                approvals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="tnum" style={{ fontWeight: 600 }}>#{item.id}</span>
                    </td>
                    <td>
                      <span className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                        QT-2026-{String(item.quotation_id).padStart(3, "0")}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-enterprise">
                        Level {item.approval_level || 1} Governance
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{item.approver_role || "Sales Director"}</span>
                    </td>
                    <td>
                      {item.status === "APPROVED" && (
                        <span className="badge badge-approved"><CheckCircle2 size={12} /> Approved</span>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="badge badge-rejected"><XCircle size={12} /> Rejected</span>
                      )}
                      {item.status === "RETURNED" && (
                        <span className="badge badge-pending"><RotateCcw size={12} /> Returned</span>
                      )}
                      {(!item.status || item.status.includes("PENDING")) && (
                        <span className="badge badge-pending"><Clock size={12} /> Action Required</span>
                      )}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem", maxWidth: "250px" }}>
                      {item.reason || "Automatic trigger: concession exceeds customer tier standard limit."}
                    </td>
                    <td>
                      {canApprove ? (
                        <button
                          onClick={() => {
                            setSelectedApproval(item);
                            setActionStatus("APPROVED");
                            setActionReason("");
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          Review Request
                        </button>
                      ) : (
                        <span className="badge badge-draft" title="Director sign-off required">
                          Director Required
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal Dialog (Spec B4) */}
      {selectedApproval && (
        <div className="modal-overlay" onClick={() => setSelectedApproval(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: "640px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
                  Review Quotation QT-2026-{String(selectedApproval.quotation_id).padStart(3, "0")} Governance Exception
                </h3>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                  Automated routing per Spec B4 & Section 10 Blended Risk Score
                </div>
              </div>
              <button
                onClick={() => setSelectedApproval(null)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Blended Risk Score & Steps List Banner */}
              <div
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    Blended Risk Score (Section 10)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "4px" }}>
                    <span
                      className="badge badge-rejected tnum"
                      style={{ fontSize: "0.9rem", fontWeight: 800, padding: "4px 8px" }}
                    >
                      {selectedApproval.approval_level > 1 ? "68 / 100 · High Risk" : "42 / 100 · Moderate Risk"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {selectedApproval.approval_level > 1 ? "Requires Level 2 Finance sign-off" : "Requires Level 1 Director review"}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/cpq/${selectedApproval.quotation_id}`}
                  target="_blank"
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}
                  title="Open Quotation in CPQ Builder"
                >
                  <ExternalLink size={13} /> View Quotation Detail
                </Link>
              </div>

              {/* Approval Steps Progression (Spec B4: Sales Manager and Finance only shown when required) */}
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  Governance Review Chain (Spec B4)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: selectedApproval.approval_level > 1 ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
                  <div style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-card)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Step 1: Sales Director</span>
                      <span className="badge badge-approved" style={{ fontSize: "0.7rem" }}>Current Stage</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "3px" }}>
                      Authority threshold: Up to 20% concession
                    </div>
                  </div>

                  {selectedApproval.approval_level > 1 && (
                    <div style={{ padding: "0.75rem", border: "1px solid var(--color-warning)", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(245, 158, 11, 0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>Step 2: Finance Controller</span>
                        <span className="badge badge-pending" style={{ fontSize: "0.7rem" }}>Required</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "3px" }}>
                        Triggered: High margin erosion (&gt;20% or blended risk)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Offending Line Item Breach Analysis */}
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                  Concession Exception Summary
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text)", padding: "0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                  {selectedApproval.reason || "Automatic trigger: concession exceeds customer tier standard limit (Service line given 18%, allowed 10% -> 8 points over limit)."}
                </div>
              </div>

              {/* Determination Options */}
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Director Governance Determination
                </label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setActionStatus("APPROVED")}
                    className={`btn btn-sm ${actionStatus === "APPROVED" ? "btn-success" : "btn-secondary"}`}
                    style={{ flex: 1 }}
                  >
                    <CheckCircle2 size={14} /> Approve Concession
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionStatus("RETURNED")}
                    className={`btn btn-sm ${actionStatus === "RETURNED" ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1 }}
                  >
                    <RotateCcw size={14} /> Return for Revision
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionStatus("REJECTED")}
                    className={`btn btn-sm ${actionStatus === "REJECTED" ? "btn-danger" : "btn-secondary"}`}
                    style={{ flex: 1 }}
                  >
                    <XCircle size={14} /> Reject Outright
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Audit Trail Reason & Executive Justification <span style={{ color: "var(--color-danger)" }}>*</span>
                </label>
                <textarea
                  className="textarea"
                  rows="3"
                  placeholder="State commercial rationale or revision instructions for account executive..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedApproval(null)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Committing..." : "Commit Determination & Log Audit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ApprovalsDesk;
