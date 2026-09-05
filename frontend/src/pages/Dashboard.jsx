import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { quotationsApi, approvalsApi, productsApi, customersApi, alertsApi } from "../api";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  PlusCircle,
  ArrowRight,
  AlertTriangle,
  Boxes,
  Users,
  CheckCircle2,
  Percent
} from "lucide-react";

const Dashboard = () => {
  const [quotations, setQuotations] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [qRes, aRes, pRes, cRes, alRes] = await Promise.allSettled([
          quotationsApi.getAll(),
          approvalsApi.getAll(),
          productsApi.getAll(),
          customersApi.getAll(),
          alertsApi.getAll(),
        ]);

        if (qRes.status === "fulfilled") {
          setQuotations(qRes.value.data?.quotations || qRes.value.data || []);
        }
        if (aRes.status === "fulfilled") {
          setApprovals(aRes.value.data?.approvals || aRes.value.data || []);
        }
        if (pRes.status === "fulfilled") {
          setProducts(pRes.value.data?.products || pRes.value.data || []);
        }
        if (cRes.status === "fulfilled") {
          setCustomers(cRes.value.data?.customers || cRes.value.data || []);
        }
        if (alRes.status === "fulfilled") {
          setAlerts(alRes.value.data?.alerts || alRes.value.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalPipeline = quotations.reduce((acc, q) => acc + (Number(q.total_amount) || 0), 0);
  const pendingApprovals = approvals.filter((a) => !a.status || a.status.includes("PENDING")).length;
  const activeAlerts = alerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length;

  return (
    <AppLayout pageTitle="DealFlow 360 · Executive CPQ Cockpit">
      {/* Metric Cards Banner */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Total Commercial Pipeline</span>
            <TrendingUp size={16} color="var(--color-accent)" />
          </div>
          <div className="metric-value tnum">
            ${totalPipeline.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-sub">
            <span>Across {quotations.length} total quotations</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Pending Governance</span>
            <Clock size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-warning)" }}>
            {pendingApprovals}
          </div>
          <div className="metric-sub">
            <span>Requires director exception sign-off</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Catalog Offerings</span>
            <Boxes size={16} color="var(--color-info)" />
          </div>
          <div className="metric-value tnum">{products.length}</div>
          <div className="metric-sub">
            <span>Configurable enterprise SKUs</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Active Accounts</span>
            <Users size={16} color="var(--color-success)" />
          </div>
          <div className="metric-value tnum">{customers.length}</div>
          <div className="metric-sub">
            <span>Classified across 5 policy tiers</span>
          </div>
        </div>
      </div>

      {/* Flagship CPQ Launch Hero Card */}
      <div
        className="data-card"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "#ffffff",
          padding: "1.75rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "680px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 8px",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: "4px",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.75rem",
            }}
          >
            <Percent size={12} /> PRISM CPQ Engine v2.4 Active
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ffffff", marginBottom: "0.5rem" }}>
            Precision Configure, Price & Quote Data Entry Workbench
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#c7d2fe", lineHeight: 1.6 }}>
            Construct high-volume multi-product proposals, apply policy volume discounts, protect gross margins with real-time floor guardrails, and trigger automated multi-level director approval workflows.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            to="/cpq"
            className="btn btn-primary"
            style={{
              backgroundColor: "#ffffff",
              color: "#312e81",
              border: "none",
              fontWeight: 700,
              padding: "0.75rem 1.25rem",
            }}
          >
            <PlusCircle size={18} />
            <span>Launch Pricing Studio</span>
          </Link>

          <Link
            to="/approvals"
            className="btn btn-secondary"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#ffffff",
              borderColor: "rgba(255,255,255,0.2)",
              justifyContent: "center",
            }}
          >
            <span>Review Approval Queue ({pendingApprovals})</span>
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Recent Quotations & System Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
        {/* Recent Quotes */}
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Recent Quotations in Lifecycle</span>
            <Link to="/quotations" className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote ID</th>
                  <th>Customer Account</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "1.5rem" }}>Loading cockpit...</td></tr>
                ) : quotations.slice(0, 7).map((q) => (
                  <tr key={q.id}>
                    <td className="tnum" style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                      #{q.id}
                    </td>
                    <td style={{ fontWeight: 500 }}>{q.customer_name || `Customer #${q.customer_id}`}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>
                      ${Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${
                        q.status === "APPROVED" ? "badge-approved" :
                        q.status === "CONFIRMED" ? "badge-confirmed" :
                        q.status === "PENDING_APPROVAL" ? "badge-pending" : "badge-draft"
                      }`}>
                        {q.status || "DRAFT"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Risk Alerts */}
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Active Telemetry Alerts</span>
            <Link to="/intelligence" className="btn btn-ghost btn-sm">
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {alerts.slice(0, 5).map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)",
                  backgroundColor: a.severity === "HIGH" ? "var(--color-danger-bg)" : "var(--color-paper-0)",
                  borderLeft: a.severity === "HIGH" ? "3px solid var(--color-danger)" : "3px solid var(--color-warning)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: a.severity === "HIGH" ? "var(--color-danger)" : "var(--color-warning)" }}>
                    {a.severity || "ALERT"}
                  </span>
                  <span className="tnum" style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                    Quote #{a.quotation_id}
                  </span>
                </div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{a.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
