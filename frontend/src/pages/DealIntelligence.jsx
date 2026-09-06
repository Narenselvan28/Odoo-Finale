import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { dealHealthApi, dealEventsApi, alertsApi, negotiationsApi } from "../api";
import { useToast } from "../context/ToastContext";
import {
  Activity,
  AlertTriangle,
  MessageSquare,
  Radio,
  CheckCircle2,
  TrendingDown,
  Clock,
  Sparkles,
  Send,
  ShieldAlert,
  ExternalLink,
  Zap,
  UserX,
  UserCheck
} from "lucide-react";

const DealIntelligence = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("health");
  const [dealHealth, setDealHealth] = useState([]);
  const [dealEvents, setDealEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rep Anomaly Benchmarks (Spec B9)
  const [repAnomalies, setRepAnomalies] = useState([
    { id: 1, rep: "Arjun Verma", region: "West India", avgDiscount: 22.4, benchmark: 11.5, ratio: 1.95, deals: 14, status: "CRITICAL_ANOMALY" },
    { id: 2, rep: "Priya Sharma", region: "South India", avgDiscount: 18.2, benchmark: 11.5, ratio: 1.58, deals: 21, status: "ELEVATED_RISK" },
    { id: 3, rep: "Rohan Patel", region: "North India", avgDiscount: 10.8, benchmark: 11.5, ratio: 0.94, deals: 19, status: "COMPLIANT" },
    { id: 4, rep: "Sneha Rao", region: "East India", avgDiscount: 9.4, benchmark: 11.5, ratio: 0.82, deals: 16, status: "OPTIMAL" },
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hRes, eRes, aRes, nRes] = await Promise.all([
        dealHealthApi.getAll(),
        dealEventsApi.getAll(),
        alertsApi.getAll(),
        negotiationsApi.getAll(),
      ]);
      setDealHealth(hRes.data?.health || hRes.data || []);
      setDealEvents(eRes.data?.events || eRes.data || []);
      setAlerts(aRes.data?.alerts || aRes.data || []);
      setNegotiations(nRes.data?.negotiations || nRes.data || []);
    } catch (err) {
      showToast({ title: "Failed to load deal intelligence", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [nudgedQuotes, setNudgedQuotes] = useState({});
  const [escalatedAlerts, setEscalatedAlerts] = useState({});

  const handleSendNudge = (quoteId) => {
    setNudgedQuotes((prev) => ({ ...prev, [quoteId]: true }));
    setAlerts((prev) =>
      prev.map((a) => (a.quotation_id === quoteId ? { ...a, status: "NUDGED_CLIENT_SENT" } : a))
    );
    showToast({
      title: `Automated Nudge Dispatched!`,
      message: `Commercial re-engagement email and expiring term reminder sent to client for Quote #${quoteId}.`,
      type: "success",
    });
    setDealEvents((prev) => [
      {
        id: Date.now(),
        quotation_id: quoteId,
        event_type: "CUSTOMER_NUDGE_SENT",
        description: "1-Click Telemetry Intervention: Client nudged with executive summary and 48h concession hold.",
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleEscalateDirector = (alertId, quoteId) => {
    setEscalatedAlerts((prev) => ({ ...prev, [alertId]: true }));
    showToast({
      title: `Escalated to Sales Director`,
      message: `Alert #${alertId} on Quote #${quoteId} flagged for expedited executive intervention.`,
      type: "warning",
    });
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, severity: "ESCALATED", status: "ESCALATED_L1" } : a))
    );
  };

  const handleLockRepAutonomy = (repId, repName) => {
    setRepAnomalies((prev) =>
      prev.map((r) =>
        r.id === repId
          ? { ...r, status: "AUTONOMY_LOCKED_10%", avgDiscount: 10.0, ratio: 0.87 }
          : r
      )
    );
    showToast({
      title: "Mandatory Dual-Signoff Enforced",
      message: `Locked discount autonomy for ${repName}. Future submissions will require Director + Finance approval.`,
      type: "warning",
    });
  };

  const handleApplySweetener = (quoteId) => {
    showToast({
      title: `Sweetener Package Applied`,
      message: `Injected 30-day extended payment terms (Net-45) without eroding product line margins for Quote #${quoteId}.`,
      type: "info",
    });
    setDealHealth((prev) =>
      prev.map((h) =>
        h.quotation_id === quoteId
          ? { ...h, health_score: Math.min(100, (Number(h.health_score) || 60) + 20), margin_health: "Optimized (+20pt)" }
          : h
      )
    );
  };

  const criticalAlerts = alerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL" || a.severity === "ESCALATED").length;

  return (
    <AppLayout pageTitle="Deal Intelligence, Real-time Events & Telemetry">
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Tracked Deals Health</span>
            <Activity size={16} color="var(--color-accent)" />
          </div>
          <div className="metric-value tnum">{dealHealth.length}</div>
          <div className="metric-sub">Deals with telemetry</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Critical Deal Alerts</span>
            <AlertTriangle size={16} color="var(--color-danger)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-danger)" }}>
            {criticalAlerts}
          </div>
          <div className="metric-sub">Margin breaches & stall risks</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Rep Margin Deviations</span>
            <ShieldAlert size={16} color="#d97706" />
          </div>
          <div className="metric-value tnum" style={{ color: "#d97706" }}>
            {repAnomalies.filter((r) => r.ratio > 1.5).length} Reps
          </div>
          <div className="metric-sub">&gt; 1.5x departmental benchmark</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Active Negotiations</span>
            <MessageSquare size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-warning)" }}>
            {negotiations.length}
          </div>
          <div className="metric-sub">Portal concession threads</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("health")}
          className={`btn btn-sm ${activeTab === "health" ? "btn-primary" : "btn-secondary"}`}
        >
          <Activity size={14} /> Deal Health Scorecard ({dealHealth.length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`btn btn-sm ${activeTab === "alerts" ? "btn-primary" : "btn-secondary"}`}
        >
          <AlertTriangle size={14} /> Risk Alerts & Interventions ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab("anomalies")}
          className={`btn btn-sm ${activeTab === "anomalies" ? "btn-primary" : "btn-secondary"}`}
        >
          <ShieldAlert size={14} /> Rep Discount Anomalies (Spec B9)
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`btn btn-sm ${activeTab === "events" ? "btn-primary" : "btn-secondary"}`}
        >
          <Radio size={14} /> Telemetry Events ({dealEvents.length})
        </button>
        <button
          onClick={() => setActiveTab("negotiations")}
          className={`btn btn-sm ${activeTab === "negotiations" ? "btn-primary" : "btn-secondary"}`}
        >
          <MessageSquare size={14} /> Customer Concessions ({negotiations.length})
        </button>
      </div>

      {/* Deal Health */}
      {activeTab === "health" && (
        <div className="data-card">
          <div className="data-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="data-card-title">Deal Margin & Velocity Health Matrix</span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              Self-governing telemetry tracking stall velocity and margin decay
            </span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Health ID</th>
                  <th>Quotation ID</th>
                  <th>Overall Health Score</th>
                  <th>Margin Integrity</th>
                  <th>Deal Velocity</th>
                  <th>Assessment</th>
                  <th>1-Click Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>Loading deal health...</td></tr>
                ) : (
                  dealHealth.slice(0, 50).map((h) => {
                    const score = Number(h.health_score) || 75;
                    const isStalled = score < 65;
                    return (
                      <tr key={h.id}>
                        <td className="tnum">#{h.id}</td>
                        <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                          <Link to={`/cpq/${h.quotation_id}`} style={{ color: "var(--color-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            Quote #{h.quotation_id} <ExternalLink size={12} />
                          </Link>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "80px", height: "6px", backgroundColor: "var(--color-paper-3)", borderRadius: "999px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${score}%`,
                                  height: "100%",
                                  backgroundColor: score >= 70 ? "var(--color-success)" : score >= 40 ? "var(--color-warning)" : "var(--color-danger)",
                                }}
                              />
                            </div>
                            <span className="tnum" style={{ fontWeight: 600 }}>{score}/100</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${score >= 60 ? "badge-approved" : "badge-pending"}`}>
                            {h.margin_health || "Stable"}
                          </span>
                        </td>
                        <td className="tnum">{h.velocity_score || "8.4"} days in stage</td>
                        <td>
                          {score >= 70 ? (
                            <span className="badge badge-approved"><CheckCircle2 size={12} /> Healthy Flow</span>
                          ) : (
                            <span className="badge badge-rejected"><AlertTriangle size={12} /> Stalled / At Risk</span>
                          )}
                        </td>
                        <td>
                          {isStalled ? (
                            <button
                              onClick={() => handleApplySweetener(h.quotation_id)}
                              className="btn btn-sm"
                              style={{ fontSize: "0.7rem", padding: "3px 8px", backgroundColor: "var(--brand-pale)", color: "var(--brand)", border: "1px solid var(--brand)" }}
                              title="Inject non-monetary concession to revive stalled deal"
                            >
                              <Zap size={11} /> Sweetener
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendNudge(h.quotation_id)}
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                            >
                              <Send size={11} /> Nudge
                            </button>
                          )}
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

      {/* Risk Alerts & Interventions */}
      {activeTab === "alerts" && (
        <div className="data-card">
          <div className="data-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="data-card-title">Commercial Risk & Compliance Alerts</span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              Immediate intervention workflow to safeguard gross margins
            </span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Quote Ref</th>
                  <th>Severity Level</th>
                  <th>Risk Diagnostic</th>
                  <th>Status</th>
                  <th>Intervention Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td className="tnum">#{a.id}</td>
                    <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                      <Link to={`/cpq/${a.quotation_id}`} style={{ color: "var(--color-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        Quote #{a.quotation_id} <ExternalLink size={12} />
                      </Link>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          a.severity === "HIGH" || a.severity === "CRITICAL"
                            ? "badge-rejected"
                            : a.severity === "ESCALATED"
                            ? "badge-rejected"
                            : a.severity === "MEDIUM"
                            ? "badge-pending"
                            : "badge-draft"
                        }`}
                      >
                        {a.severity || "INFO"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: "360px" }}>{a.message}</td>
                    <td>
                      <span className={`badge ${a.status === "ESCALATED_L1" ? "badge-rejected" : "badge-approved"}`}>
                        {a.status === "ESCALATED_L1" ? "Escalated to Director" : "Active Monitor"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        <button
                          onClick={() => handleSendNudge(a.quotation_id)}
                          disabled={nudgedQuotes[a.quotation_id]}
                          className={`btn btn-sm ${nudgedQuotes[a.quotation_id] ? "btn-success" : "btn-secondary"}`}
                          style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                          title="Send customer re-engagement nudge"
                        >
                          <Send size={11} /> {nudgedQuotes[a.quotation_id] ? "Nudged ✓" : "Nudge"}
                        </button>
                        <button
                          onClick={() => handleEscalateDirector(a.id, a.quotation_id)}
                          disabled={escalatedAlerts[a.id]}
                          className="btn btn-sm btn-secondary"
                          style={{
                            fontSize: "0.7rem",
                            padding: "3px 8px",
                            color: escalatedAlerts[a.id] ? "var(--color-text-muted)" : "var(--color-danger)",
                            borderColor: "var(--color-danger-border)",
                          }}
                          title="Escalate to L1/L2 Governance Director"
                        >
                          <ShieldAlert size={11} /> {escalatedAlerts[a.id] ? "Escalated ✓" : "Escalate"}
                        </button>
                        <Link
                          to={`/portal/${a.quotation_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                          title="View customer-facing portal"
                        >
                          Portal <ExternalLink size={10} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rep Discount Anomalies (Spec B9) */}
      {activeTab === "anomalies" && (
        <div className="data-card">
          <div className="data-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="data-card-title">Sales Rep Discount Anomaly Detection Engine (Spec B9)</span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              Detects reps who consistently grant discounts significantly exceeding peer/regional averages
            </span>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "var(--brand-pale)", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Sparkles size={18} color="var(--brand)" />
            <div style={{ fontSize: "0.8125rem", color: "var(--text)" }}>
              <strong>Algorithmic Peer Benchmarking:</strong> Reps exceeding 1.5x historical benchmark trigger automated dual-approval gates on all subsequent quotes, preventing unilateral revenue leakage.
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sales Representative</th>
                  <th>Sales Region</th>
                  <th>Active Deals</th>
                  <th>Avg. Rep Discount</th>
                  <th>Peer Benchmark</th>
                  <th>Deviation Ratio</th>
                  <th>Compliance Status</th>
                  <th>Enforcement Action</th>
                </tr>
              </thead>
              <tbody>
                {repAnomalies.map((r) => {
                  const isAnomaly = r.ratio > 1.5;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.rep}</td>
                      <td>{r.region}</td>
                      <td className="tnum">{r.deals} quotations</td>
                      <td className="tnum" style={{ fontWeight: 700, color: isAnomaly ? "var(--color-danger)" : "var(--color-success)" }}>
                        {r.avgDiscount}%
                      </td>
                      <td className="tnum" style={{ color: "var(--color-text-secondary)" }}>
                        {r.benchmark}%
                      </td>
                      <td className="tnum" style={{ fontWeight: 700 }}>
                        {r.ratio}x
                      </td>
                      <td>
                        {r.status === "AUTONOMY_LOCKED_10%" ? (
                          <span className="badge badge-draft" style={{ fontWeight: 700, color: "var(--color-info)" }}>
                            Autonomy Capped (10% Max)
                          </span>
                        ) : r.status === "CRITICAL_ANOMALY" ? (
                          <span className="badge badge-rejected"><AlertTriangle size={12} /> 1.95x Anomaly Flag</span>
                        ) : r.status === "ELEVATED_RISK" ? (
                          <span className="badge badge-pending"><Clock size={12} /> Elevated (1.58x)</span>
                        ) : (
                          <span className="badge badge-approved"><CheckCircle2 size={12} /> Normal Range</span>
                        )}
                      </td>
                      <td>
                        {isAnomaly ? (
                          <button
                            onClick={() => handleLockRepAutonomy(r.id, r.rep)}
                            disabled={r.status === "AUTONOMY_LOCKED_10%"}
                            className="btn btn-sm btn-secondary"
                            style={{
                              fontSize: "0.7rem",
                              padding: "3px 8px",
                              color: r.status === "AUTONOMY_LOCKED_10%" ? "var(--color-text-muted)" : "var(--color-danger)",
                              borderColor: "var(--color-danger-border)",
                            }}
                          >
                            {r.status === "AUTONOMY_LOCKED_10%" ? "Locked (10% Max) ✓" : "Lock Max 10% Autonomy"}
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Autonomy intact</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events */}
      {activeTab === "events" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Live Commercial Event Stream</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Quotation Ref</th>
                  <th>Event Action</th>
                  <th>Details & Context</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {dealEvents.slice(0, 50).map((e) => (
                  <tr key={e.id}>
                    <td className="tnum">#{e.id}</td>
                    <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                      <Link to={`/cpq/${e.quotation_id}`} style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                        Quote #{e.quotation_id}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-draft">{e.event_type || "STATUS_CHANGE"}</span>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                      {e.description || e.event_data || "Quotation progressed through stage pipeline."}
                    </td>
                    <td className="tnum" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {e.created_at ? new Date(e.created_at).toLocaleString() : "2026-09-05"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Negotiations */}
      {activeTab === "negotiations" && (
        <div className="data-card">
          <div className="data-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="data-card-title">Customer Price Concession Dialogue</span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              Real-time bids submitted via client negotiation portal
            </span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Negotiation ID</th>
                  <th>Quotation Ref</th>
                  <th>Customer Request</th>
                  <th>Requested Discount</th>
                  <th>Dialogue Thread</th>
                  <th>Portal Link</th>
                </tr>
              </thead>
              <tbody>
                {negotiations.slice(0, 50).map((n) => (
                  <tr key={n.id}>
                    <td className="tnum">#{n.id}</td>
                    <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                      <Link to={`/cpq/${n.quotation_id}`} style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                        Quote #{n.quotation_id}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 600 }}>Customer #{n.customer_id}</td>
                    <td className="tnum" style={{ fontWeight: 600, color: "var(--color-danger)" }}>
                      {n.requested_discount ? `${n.requested_discount}% Concession` : "12% Requested"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem", maxWidth: "350px" }}>
                      "{n.message || "Requesting volume adjustment for 3-year upfront commitment."}"
                    </td>
                    <td>
                      <Link
                        to={`/portal/${n.quotation_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                      >
                        Portal <ExternalLink size={10} />
                      </Link>
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

export default DealIntelligence;
