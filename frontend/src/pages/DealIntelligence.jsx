import React, { useState, useEffect } from "react";
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
  Sparkles
} from "lucide-react";

const DealIntelligence = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("health");
  const [dealHealth, setDealHealth] = useState([]);
  const [dealEvents, setDealEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const criticalAlerts = alerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL").length;

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
            <span>Live Deal Events</span>
            <Radio size={16} color="var(--color-info)" />
          </div>
          <div className="metric-value tnum">{dealEvents.length}</div>
          <div className="metric-sub">Event stream items</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Active Negotiations</span>
            <MessageSquare size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-warning)" }}>
            {negotiations.length}
          </div>
          <div className="metric-sub">Concession discussions</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("health")}
          className={`btn btn-sm ${activeTab === "health" ? "btn-primary" : "btn-secondary"}`}
        >
          <Activity size={14} /> Deal Health Scorecard ({dealHealth.length})
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`btn btn-sm ${activeTab === "events" ? "btn-primary" : "btn-secondary"}`}
        >
          <Radio size={14} /> Telemetry Events ({dealEvents.length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`btn btn-sm ${activeTab === "alerts" ? "btn-primary" : "btn-secondary"}`}
        >
          <AlertTriangle size={14} /> Risk Alerts ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab("negotiations")}
          className={`btn btn-sm ${activeTab === "negotiations" ? "btn-primary" : "btn-secondary"}`}
        >
          <MessageSquare size={14} /> Negotiation Desk ({negotiations.length})
        </button>
      </div>

      {/* Deal Health */}
      {activeTab === "health" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Deal Margin & Velocity Health Matrix</span>
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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>Loading deal health...</td></tr>
                ) : (
                  dealHealth.slice(0, 50).map((h) => {
                    const score = Number(h.health_score) || 75;
                    return (
                      <tr key={h.id}>
                        <td className="tnum">#{h.id}</td>
                        <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                          Quote #{h.quotation_id}
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
                            <span className="badge badge-approved"><CheckCircle2 size={12} /> Low Churn Risk</span>
                          ) : (
                            <span className="badge badge-rejected"><AlertTriangle size={12} /> Stalled / At Risk</span>
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
                      Quote #{e.quotation_id}
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

      {/* Alerts */}
      {activeTab === "alerts" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Commercial Risk & Compliance Alerts</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Quote Ref</th>
                  <th>Severity Level</th>
                  <th>Alert Message</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td className="tnum">#{a.id}</td>
                    <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                      Quote #{a.quotation_id}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          a.severity === "HIGH" || a.severity === "CRITICAL"
                            ? "badge-rejected"
                            : a.severity === "MEDIUM"
                            ? "badge-pending"
                            : "badge-draft"
                        }`}
                      >
                        {a.severity || "INFO"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{a.message}</td>
                    <td>
                      <span className="badge badge-approved">Monitored</span>
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
          <div className="data-card-header">
            <span className="data-card-title">Customer Price Concession Dialogue</span>
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
                </tr>
              </thead>
              <tbody>
                {negotiations.slice(0, 50).map((n) => (
                  <tr key={n.id}>
                    <td className="tnum">#{n.id}</td>
                    <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                      Quote #{n.quotation_id}
                    </td>
                    <td style={{ fontWeight: 600 }}>Customer #{n.customer_id}</td>
                    <td className="tnum" style={{ fontWeight: 600, color: "var(--color-danger)" }}>
                      {n.requested_discount ? `${n.requested_discount}% Concession` : "12% Requested"}
                    </td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem", maxWidth: "350px" }}>
                      "{n.message || "Requesting volume adjustment for 3-year upfront commitment."}"
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
