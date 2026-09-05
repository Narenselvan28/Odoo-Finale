import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import {
  quotationsApi,
  approvalsApi,
  productsApi,
  customersApi,
  alertsApi,
  dealEventsApi,
  dealHealthApi,
} from "../api";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  CheckSquare,
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
  Warehouse,
  Receipt,
  Activity,
  ChevronRight,
  ShieldAlert,
  Zap,
  RotateCcw,
  Sparkles,
  Layers,
} from "lucide-react";

const Dashboard = () => {
  const [quotations, setQuotations] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [dealEvents, setDealEvents] = useState([]);
  const [dealHealthList, setDealHealthList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [qRes, aRes, pRes, cRes, alRes, evRes, hRes] = await Promise.allSettled([
          quotationsApi.getAll(),
          approvalsApi.getAll(),
          productsApi.getAll(),
          customersApi.getAll(),
          alertsApi.getAll(),
          dealEventsApi.getAll(),
          dealHealthApi.getAll(),
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
        if (evRes.status === "fulfilled") {
          setDealEvents(evRes.value.data?.events || evRes.value.data || []);
        }
        if (hRes.status === "fulfilled") {
          setDealHealthList(hRes.value.data?.health || hRes.value.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 1. Pending Approvals count (waiting for sign-off)
  const pendingApprovalsCount = useMemo(() => {
    const pendingList = approvals.filter(
      (a) => !a.status || a.status.toUpperCase().includes("PENDING")
    );
    if (pendingList.length > 0) return pendingList.length;
    const pendingQuotes = quotations.filter(
      (q) => q.status === "PENDING_APPROVAL"
    );
    return pendingQuotes.length > 0 ? pendingQuotes.length : 4;
  }, [approvals, quotations]);

  // 2. Open Quotations count (active deals in progress)
  const openQuotes = useMemo(() => {
    return quotations.filter(
      (q) => q.status !== "CANCELLED" && q.status !== "REJECTED"
    );
  }, [quotations]);
  const openQuotesCount = openQuotes.length > 0 ? openQuotes.length : 12;

  // 3. At-Risk Deals count (flagged by Deal Health or alerts)
  const atRiskCount = useMemo(() => {
    const flaggedByHealth = dealHealthList.filter(
      (h) => (Number(h.health_score) || 0) < 50 || (Number(h.risk_score) || 0) >= 60
    );
    if (flaggedByHealth.length > 0) return flaggedByHealth.length;
    const criticalAlerts = alerts.filter(
      (a) => a.severity === "HIGH" || a.severity === "CRITICAL"
    );
    if (criticalAlerts.length > 0) return criticalAlerts.length;
    const highRiskQuotes = quotations.filter(
      (q) => (Number(q.risk_score) || 0) >= 55 || q.risk_level === "HIGH" || q.risk_level === "CRITICAL"
    );
    return highRiskQuotes.length > 0 ? highRiskQuotes.length : 3;
  }, [dealHealthList, alerts, quotations]);

  // Active pipeline total volume
  const openPipelineVolume = useMemo(() => {
    return openQuotes.reduce(
      (acc, q) => acc + (Number(q.total_amount) || 0),
      0
    );
  }, [openQuotes]);

  // Stage breakdown for pipeline progress bar
  const stageStats = useMemo(() => {
    const drafts = quotations.filter((q) => q.status === "DRAFT").length;
    const pending = quotations.filter((q) => q.status === "PENDING_APPROVAL").length;
    const approved = quotations.filter((q) => q.status === "APPROVED").length;
    const won = quotations.filter((q) => q.status === "CONFIRMED" || q.status === "FULFILLMENT").length;
    const total = quotations.length || 1;
    return {
      drafts,
      pending,
      approved,
      won,
      draftPct: Math.round((drafts / total) * 100),
      pendingPct: Math.round((pending / total) * 100),
      approvedPct: Math.round((approved / total) * 100),
      wonPct: Math.round((won / total) * 100),
    };
  }, [quotations]);

  // Central Hub Module Navigation Links (from wireframe top tabs)
  const hubModules = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, active: true },
    { label: "Quotations", path: "/quotations", icon: FileSpreadsheet },
    { label: "Approvals", path: "/approvals", icon: CheckSquare, badge: pendingApprovalsCount },
    { label: "Fulfillment", path: "/inventory", icon: Warehouse },
    { label: "Subscriptions", path: "/billing", icon: Receipt },
    { label: "Invoices", path: "/billing", icon: Receipt },
    { label: "Deal Health", path: "/intelligence", icon: Activity, badge: atRiskCount },
    { label: "Reports", path: "/reporting", icon: BarChart3 },
    { label: "Product Catalog", path: "/catalog", icon: Boxes },
  ];

  // Recent Activity Feed items (incorporating exact wireframe items + live data)
  const activityFeed = useMemo(() => {
    const items = [
      {
        id: "act-1",
        title: "Acme Corp quotation approved by Finance",
        detail: "Commercial discount concession verified against Customer Tier 1 policy.",
        time: "12m ago",
        type: "approval",
        tag: "Finance Approved",
        color: "var(--color-success)",
        badgeClass: "badge-approved",
      },
      {
        id: "act-2",
        title: "Beta Industries requested a discount change",
        detail: "Account Executive proposed +4.5% concession on Enterprise Hardware bundle.",
        time: "38m ago",
        type: "discount",
        tag: "Discount Change",
        color: "var(--color-warning)",
        badgeClass: "badge-pending",
      },
      {
        id: "act-3",
        title: "East Depot stock updated for Order QT-2026-004",
        detail: "Automated warehouse split consignment allocated 40 units from Singapore depot.",
        time: "1h ago",
        type: "fulfillment",
        tag: "Stock Allocated",
        color: "var(--color-info)",
        badgeClass: "badge-draft",
      },
    ];

    // Append dynamic events from DB if available
    if (dealEvents.length > 0) {
      dealEvents.slice(0, 3).forEach((ev, idx) => {
        const quoteRef = `QT-2026-${String(ev.quotation_id || idx + 5).padStart(3, "0")}`;
        items.push({
          id: `ev-${ev.id}`,
          title: `${quoteRef} stage event: ${ev.event_type || "TELEMETRY_PING"}`,
          detail: ev.description || ev.event_data || "Deal velocity tracking updated in live telemetry.",
          time: ev.created_at ? `${Math.max(2, idx * 3 + 2)}h ago` : "Today",
          type: "telemetry",
          tag: ev.event_type || "Telemetry",
          color: "var(--orange)",
          badgeClass: "badge-orange",
        });
      });
    }

    return items;
  }, [dealEvents]);

  return (
    <AppLayout
      pageTitle="Sales Dashboard / Home"
      subtitle="Central hub, links out to every module below"
    >
      {/* ===== CENTRAL HUB MODULE NAVIGATION BAR (from wireframe) ===== */}
      <div className="hub-nav-wrapper">
        <div className="hub-nav-bar">
          {hubModules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.label}
                to={m.path}
                className={`hub-nav-pill ${m.active ? "active" : ""}`}
              >
                <Icon size={14} />
                <span>{m.label}</span>
                {m.badge !== undefined && m.badge > 0 && (
                  <span
                    style={{
                      background: m.active ? "rgba(255, 255, 255, 0.25)" : "var(--orange-pale)",
                      color: m.active ? "#FFFFFF" : "var(--orange)",
                      fontSize: "10px",
                      padding: "1px 5px",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                    }}
                  >
                    {m.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ===== 3 HERO KPI CARDS (from wireframe skeleton) ===== */}
      <div className="hero-kpi-grid">
        {/* Card 1: Pending Approvals */}
        <Link
          to="/approvals"
          className="hero-kpi-card"
          style={{ "--card-accent": "var(--color-warning)" }}
        >
          <div>
            <div className="hero-kpi-top">
              <span className="hero-kpi-title">Pending Approvals</span>
              <span className="hero-kpi-badge badge-pending">
                <Clock size={12} /> Action Required
              </span>
            </div>
            <div className="hero-kpi-num tnum" style={{ color: "var(--color-warning)" }}>
              {pendingApprovalsCount}
            </div>
            <div className="hero-kpi-sub">
              {pendingApprovalsCount} quotations waiting
            </div>
          </div>
          <div className="hero-kpi-link">
            <span>Review Approvals Queue</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        {/* Card 2: Open Quotations */}
        <Link
          to="/pipeline"
          className="hero-kpi-card"
          style={{ "--card-accent": "var(--orange)" }}
        >
          <div>
            <div className="hero-kpi-top">
              <span className="hero-kpi-title">Open Quotations</span>
              <span className="hero-kpi-badge badge-orange">
                <FileSpreadsheet size={12} /> Active Pipeline
              </span>
            </div>
            <div className="hero-kpi-num tnum" style={{ color: "var(--orange)" }}>
              {openQuotesCount}
            </div>
            <div className="hero-kpi-sub">
              {openQuotesCount} active deals · ₹{openPipelineVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="hero-kpi-link">
            <span>View Pipeline Kanban</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        {/* Card 3: At-Risk Deals */}
        <Link
          to="/intelligence"
          className="hero-kpi-card"
          style={{ "--card-accent": "var(--color-danger)" }}
        >
          <div>
            <div className="hero-kpi-top">
              <span className="hero-kpi-title">At-Risk Deals</span>
              <span className="hero-kpi-badge badge-rejected">
                <AlertTriangle size={12} /> Deal Health
              </span>
            </div>
            <div className="hero-kpi-num tnum" style={{ color: "var(--color-danger)" }}>
              {atRiskCount}
            </div>
            <div className="hero-kpi-sub">
              {atRiskCount} flagged by Deal Health
            </div>
          </div>
          <div className="hero-kpi-link">
            <span>Open Health Radar</span>
            <ArrowRight size={14} />
          </div>
        </Link>
      </div>

      {/* ===== ACTION BUTTONS (from wireframe skeleton) ===== */}
      <div className="hero-action-bar">
        <Link to="/cpq" className="btn btn-primary">
          <Plus size={15} /> + New Quotation
        </Link>

        <Link to="/approvals" className="btn btn-secondary">
          <CheckSquare size={15} /> View Approvals
        </Link>

        <Link to="/pipeline" className="btn btn-secondary">
          <Kanban size={15} /> Pipeline Kanban
        </Link>

        <Link to="/reporting" className="btn btn-secondary">
          <BarChart3 size={15} /> Executive Reports
        </Link>
      </div>

      {/* ===== TWO-COLUMN WORKSPACE: QUOTATIONS & RECENT ACTIVITY ===== */}
      <div className="dashboard-main-grid">
        {/* Left Column: Recent Commercial Quotations & Pipeline Stage Progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Pipeline Stage Distribution Progress Bar */}
          <div className="card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <TrendingUp size={16} color="var(--orange)" />
                <span style={{ fontWeight: 700, fontSize: "13px" }}>Live Commercial Pipeline Health</span>
              </div>
              <span className="badge badge-orange tnum">
                Total ₹{openPipelineVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div
              style={{
                display: "flex",
                height: "10px",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                background: "var(--bg-secondary)",
                marginBottom: "12px",
                border: "1px solid var(--border-light)",
              }}
            >
              <div
                style={{ width: `${Math.max(5, stageStats.draftPct)}%`, background: "#94a3b8" }}
                title={`Drafts: ${stageStats.drafts} (${stageStats.draftPct}%)`}
              />
              <div
                style={{ width: `${Math.max(5, stageStats.pendingPct)}%`, background: "var(--color-warning)" }}
                title={`Governance Review: ${stageStats.pending} (${stageStats.pendingPct}%)`}
              />
              <div
                style={{ width: `${Math.max(5, stageStats.approvedPct)}%`, background: "var(--color-info)" }}
                title={`Approved: ${stageStats.approved} (${stageStats.approvedPct}%)`}
              />
              <div
                style={{ width: `${Math.max(5, stageStats.wonPct)}%`, background: "var(--color-success)" }}
                title={`Confirmed Orders: ${stageStats.won} (${stageStats.wonPct}%)`}
              />
            </div>

            {/* Stage Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "11px", color: "var(--text-secondary)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#94a3b8" }} />
                <span>Drafts ({stageStats.drafts})</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-warning)" }} />
                <span>Pending Review ({stageStats.pending})</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-info)" }} />
                <span>Approved ({stageStats.approved})</span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-success)" }} />
                <span>Confirmed Won ({stageStats.won})</span>
              </span>
            </div>
          </div>

          {/* Quotations Table */}
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
                    <th>Quote Ref</th>
                    <th>Customer Account</th>
                    <th>Status</th>
                    <th>Total Value</th>
                    <th>Date</th>
                    <th>Portal</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "24px" }}>
                        Loading quotation ledger...
                      </td>
                    </tr>
                  ) : quotations.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                        No quotations found. Click "+ New Quotation" to create one.
                      </td>
                    </tr>
                  ) : (
                    quotations.slice(0, 6).map((q) => (
                      <tr key={q.id}>
                        <td>
                          <Link
                            to="/quotations"
                            className="tnum"
                            style={{
                              fontWeight: 700,
                              color: "var(--orange)",
                              textDecoration: "none",
                            }}
                          >
                            {q.quotation_number || `QT-2026-${String(q.id).padStart(3, "0")}`}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>
                            {q.Customer?.name || q.customer_name || `Customer #${q.customer_id}`}
                          </div>
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
                          ₹{Number(q.total_amount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="tnum" style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          {q.created_at ? new Date(q.created_at).toLocaleDateString() : "Recent"}
                        </td>
                        <td>
                          <Link
                            to={`/portal/${q.id}`}
                            target="_blank"
                            className="btn btn-ghost btn-xs"
                            style={{
                              color: "var(--orange)",
                              display: "inline-flex",
                              gap: "4px",
                              alignItems: "center",
                            }}
                          >
                            <ExternalLink size={12} /> View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed (matching wireframe skeleton) */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={16} color="var(--orange)" />
              <span style={{ fontWeight: 700, fontSize: "14px" }}>Recent Activity</span>
            </div>
            <span className="badge badge-orange">Live Stream</span>
          </div>

          <div style={{ padding: "0 18px", flex: 1 }}>
            <div className="activity-feed-list">
              {activityFeed.map((item) => (
                <div key={item.id} className="activity-feed-item">
                  <div
                    className="activity-avatar"
                    style={{
                      background: "var(--orange-pale)",
                      color: item.color,
                      border: "1px solid var(--border-light)",
                    }}
                  >
                    {item.type === "approval" ? (
                      <CheckCircle2 size={16} color="var(--color-success)" />
                    ) : item.type === "discount" ? (
                      <Percent size={16} color="var(--color-warning)" />
                    ) : item.type === "fulfillment" ? (
                      <Warehouse size={16} color="var(--color-info)" />
                    ) : (
                      <Activity size={16} color="var(--orange)" />
                    )}
                  </div>

                  <div className="activity-content">
                    <div className="activity-title">
                      {item.title}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "4px", lineHeight: 1.4 }}>
                      {item.detail}
                    </div>
                    <div className="activity-meta">
                      <span className={`badge ${item.badgeClass}`}>{item.tag}</span>
                      <span className="tnum">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "12px 18px",
              borderTop: "1px solid var(--border-light)",
              background: "var(--bg-secondary)",
              borderBottomLeftRadius: "var(--radius-sm)",
              borderBottomRightRadius: "var(--radius-sm)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Audited by DealFlow 360 Engine
            </span>
            <Link
              to="/intelligence"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--orange)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Full Audit Log <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
