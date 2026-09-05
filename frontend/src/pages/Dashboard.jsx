import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { quotationsApi, approvalsApi, productsApi, customersApi, alertsApi } from "../api";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  Plus,
  ArrowRight,
  AlertTriangle,
  Boxes,
  Users,
  CheckCircle2,
  Percent,
  Calculator,
  Kanban,
  BarChart3,
  ExternalLink,
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
  const confirmedCount = quotations.filter((q) => q.status === "CONFIRMED" || q.status === "FULFILLMENT").length;
  const activeAlerts = alerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length;

  return (
    <AppLayout
      pageTitle="Commercial Command Cockpit"
      subtitle="Enterprise sales operations, multi-tier pricing guardrails, and real-time deal telemetry."
    >
      {/* ===== INSTITUTIONAL STATS ROW (ref ui.txt) ===== */}
      <div className="stats">
        <div className="stat-card">
          <div className="label">Total Pipeline Value</div>
          <div className="value orange tnum">
            ₹{totalPipeline.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Pending Governance</div>
          <div className="value tnum" style={{ color: pendingApprovals > 0 ? "var(--orange)" : "var(--text-heading)" }}>
            {pendingApprovals} Deals
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Confirmed Revenue</div>
          <div className="value orange tnum">
            {confirmedCount} Orders
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Active Catalog SKUs</div>
          <div className="value tnum">
            {products.length} Products
          </div>
        </div>
      </div>

      {/* ===== WORKSPACE QUICK NAVIGATION TILES ===== */}
      <div className="section-header">
        <div>
          <h2>Operational Workbenches</h2>
          <p>Instant access to primary configure-price-quote and fulfillment engines</p>
        </div>
        <Link to="/cpq" className="btn btn-primary btn-sm">
          <Plus size={13} /> Launch CPQ Studio
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* CPQ Studio Tile */}
        <div className="card" style={{ borderTop: "3px solid var(--orange)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-heading)" }}>
              Pricing Studio (CPQ)
            </span>
            <span className="badge badge-orange">Core Engine</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.5 }}>
            Configure product matrices, test discount ceilings, view live margin lift deltas, and split warehouse stock.
          </p>
          <Link to="/cpq" className="btn btn-secondary btn-sm w-full" style={{ width: "100%", justifyContent: "center" }}>
            Open Studio Console →
          </Link>
        </div>

        {/* Pipeline Kanban Tile */}
        <div className="card" style={{ borderTop: "3px solid var(--orange)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-heading)" }}>
              Pipeline Kanban
            </span>
            <span className="badge badge-orange">Lifecycle</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.5 }}>
            Visualize deals across 6 stages from Draft to Fulfillment, monitor bottlenecks, and advance deals with 1 click.
          </p>
          <Link to="/pipeline" className="btn btn-secondary btn-sm w-full" style={{ width: "100%", justifyContent: "center" }}>
            View Sales Pipeline →
          </Link>
        </div>

        {/* Approvals Desk Tile */}
        <div className="card" style={{ borderTop: "3px solid var(--orange)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-heading)" }}>
              Governance Approvals
            </span>
            <span className="badge badge-orange">{pendingApprovals} Pending</span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: 1.5 }}>
            Level 1 (Sales Director) and Level 2 (Finance Controller) automated risk scoring and policy escalation desk.
          </p>
          <Link to="/approvals" className="btn btn-secondary btn-sm w-full" style={{ width: "100%", justifyContent: "center" }}>
            Review Approvals Queue →
          </Link>
        </div>
      </div>

      {/* ===== RECENT ACTIVE DEALS TABLE ===== */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileSpreadsheet size={16} color="var(--orange)" />
            <span style={{ fontWeight: 700, fontSize: "14px" }}>Recent Commercial Quotations</span>
          </div>
          <Link to="/quotations" className="btn btn-ghost btn-sm">
            View All Quotations →
          </Link>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Customer Account</th>
                <th>Status</th>
                <th>Total Value</th>
                <th>Issue Date</th>
                <th>Portal Link</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "24px" }}>
                    Loading database records...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                    No quotations found. Click "New Quote" to create one.
                  </td>
                </tr>
              ) : (
                quotations.slice(0, 8).map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span className="tnum" style={{ fontWeight: 700, color: "var(--orange)" }}>
                        {q.quotation_number || `QT-2026-${String(q.id).padStart(3, "0")}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.Customer?.name || q.customer_name || `Customer #${q.customer_id}`}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {q.Customer?.email || "commercial@enterprise.com"}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          q.status === "CONFIRMED"
                            ? "badge-confirmed"
                            : q.status === "PENDING_APPROVAL"
                            ? "badge-pending"
                            : q.status === "APPROVED"
                            ? "badge-approved"
                            : "badge-draft"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="tnum" style={{ fontWeight: 700 }}>
                      ₹{Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="tnum" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {q.created_at ? new Date(q.created_at).toLocaleDateString() : "Recent"}
                    </td>
                    <td>
                      <Link
                        to={`/portal/${q.id}`}
                        target="_blank"
                        className="btn btn-ghost btn-xs"
                        style={{ color: "var(--orange)", display: "inline-flex", gap: "4px", alignItems: "center" }}
                      >
                        <ExternalLink size={12} /> Portal
                      </Link>
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

export default Dashboard;
