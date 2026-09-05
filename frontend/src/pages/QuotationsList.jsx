import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { quotationsApi } from "../api";
import { useToast } from "../context/ToastContext";
import { Link } from "react-router-dom";
import {
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  PackageCheck,
  MessageSquare
} from "lucide-react";

const QuotationsList = () => {
  const { showToast } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await quotationsApi.getAll();
      const list = res.data?.quotations || res.data || [];
      setQuotations(list);
    } catch (err) {
      showToast({
        title: "Failed to load quotations",
        message: err.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await quotationsApi.updateStatus(id, newStatus);
      showToast({
        title: "Status Updated",
        message: `Quotation #${id} status changed to ${newStatus}`,
        type: "success",
      });
      fetchQuotations();
    } catch (err) {
      showToast({
        title: "Status update failed",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete quotation #${id}?`)) return;
    try {
      await quotationsApi.remove(id);
      showToast({ message: `Quotation #${id} deleted`, type: "success" });
      setQuotations((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      showToast({ message: err.message, type: "error" });
    }
  };

  // Filter & Search
  const filtered = quotations.filter((q) => {
    const matchesStatus = statusFilter === "ALL" || q.status === statusFilter;
    const matchesSearch =
      (q.customer_name && q.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.id && String(q.id).includes(searchQuery)) ||
      (q.status && q.status.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return <span className="badge badge-approved"><CheckCircle2 size={12} /> Approved</span>;
      case "PENDING_APPROVAL":
        return <span className="badge badge-pending"><Clock size={12} /> Pending Approval</span>;
      case "UNDER_NEGOTIATION":
        return <span className="badge badge-enterprise" style={{ background: "#6366f1", color: "#fff" }}><MessageSquare size={12} /> Under Negotiation</span>;
      case "CONFIRMED":
        return <span className="badge badge-confirmed"><PackageCheck size={12} /> Confirmed</span>;
      case "REJECTED":
        return <span className="badge badge-rejected"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="badge badge-draft">{status || "DRAFT"}</span>;
    }
  };

  return (
    <AppLayout pageTitle="Quotations Ledger & Lifecycle">
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Total Quotations</span>
            <FileSpreadsheet size={16} color="var(--color-accent)" />
          </div>
          <div className="metric-value tnum">{quotations.length}</div>
          <div className="metric-sub">Active repository count</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Pending Governance</span>
            <Clock size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-warning)" }}>
            {quotations.filter((q) => q.status === "PENDING_APPROVAL").length}
          </div>
          <div className="metric-sub">Awaiting director action</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Approved & Confirmed</span>
            <CheckCircle2 size={16} color="var(--color-success)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-success)" }}>
            {quotations.filter((q) => q.status === "APPROVED" || q.status === "CONFIRMED").length}
          </div>
          <div className="metric-sub">Ready for fulfillment</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Pipeline Value</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>USD</span>
          </div>
          <div className="metric-value tnum">
            ${quotations.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-sub">Aggregated gross quotations</div>
        </div>
      </div>

      {/* Quotations Data Card */}
      <div className="data-card">
        <div className="data-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "260px" }}>
            <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                placeholder="Search by quote #, customer, status..."
                className="input input-sm"
                style={{ paddingLeft: "32px" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
              {["ALL", "DRAFT", "PENDING_APPROVAL", "APPROVED", "CONFIRMED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn btn-sm ${statusFilter === st ? "btn-primary" : "btn-secondary"}`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={fetchQuotations} className="btn btn-secondary btn-sm" title="Refresh">
              <RefreshCw size={14} />
            </button>
            <Link to="/cpq" className="btn btn-primary btn-sm">
              <Plus size={14} /> New Quote
            </Link>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Customer Account</th>
                <th>Status</th>
                <th>Total Value</th>
                <th>Date Created</th>
                <th>Status Transition</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    Loading quotations data from MySQL backend...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                    No quotations found matching the filter.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span className="tnum" style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                        #{q.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{q.customer_name || `Customer #${q.customer_id}`}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        {q.customer_email || "commercial-account@dealflow.com"}
                      </div>
                    </td>
                    <td>{getStatusBadge(q.status)}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>
                      ${Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="tnum" style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                      {q.created_at ? new Date(q.created_at).toLocaleDateString() : "2026-09-01"}
                    </td>
                    <td>
                      <select
                        className="select select-sm"
                        style={{ width: "auto", fontSize: "0.75rem" }}
                        value={q.status}
                        onChange={(e) => handleStatusChange(q.id, e.target.value)}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                        <option value="UNDER_NEGOTIATION">UNDER_NEGOTIATION</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <Link
                          to={`/portal/${q.id}`}
                          target="_blank"
                          className="btn btn-ghost btn-sm"
                          title="Open Customer Live Negotiation Portal"
                          style={{ color: "#6366f1", padding: "4px" }}
                        >
                          <MessageSquare size={14} />
                        </Link>
                        <Link to="/cpq" className="btn btn-ghost btn-sm" title="Open in Studio" style={{ padding: "4px" }}>
                          <ExternalLink size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--color-danger)", padding: "4px" }}
                          title="Delete quote"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default QuotationsList;
