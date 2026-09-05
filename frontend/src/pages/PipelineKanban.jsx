import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { quotationsApi, usersApi } from "../api";
import { useToast } from "../context/ToastContext";
import { Link } from "react-router-dom";
import {
  Kanban,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
} from "lucide-react";

const STAGES = [
  { id: "DRAFT", label: "Draft & Scoping", color: "#64748b", icon: Clock },
  { id: "PENDING_APPROVAL", label: "Governance Approval", color: "#f59e0b", icon: ShieldAlert },
  { id: "UNDER_NEGOTIATION", label: "Portal Negotiation", color: "#6366f1", icon: MessageSquare },
  { id: "APPROVED", label: "Approved & Sent", color: "#0284c7", icon: CheckCircle2 },
  { id: "CONFIRMED", label: "Confirmed Order", color: "#10b981", icon: PackageCheck },
  { id: "FULFILLMENT", label: "Logistics Dispatch", color: "#0d9488", icon: Truck },
];

const PipelineKanban = () => {
  const { showToast } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRep, setSelectedRep] = useState("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quoteRes, usersRes] = await Promise.all([
        quotationsApi.getAll().catch(() => ({ data: [] })),
        usersApi.getAll().catch(() => ({ data: [] })),
      ]);

      const qList = quoteRes.data?.quotations || quoteRes.data || [];
      const uList = usersRes.data || [];

      setQuotations(qList);
      setSalesReps(uList.filter((u) => u.role === "sales_rep" || u.role === "sales_manager"));
    } catch (err) {
      showToast({
        title: "Failed to load pipeline data",
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

  const handleStageTransition = async (quoteId, nextStage) => {
    try {
      await quotationsApi.updateStatus(quoteId, nextStage);
      showToast({
        title: "Deal Advanced",
        message: `Quotation #${quoteId} transitioned to ${nextStage}`,
        type: "success",
      });
      fetchData();
    } catch (err) {
      showToast({
        title: "Transition failed",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    }
  };

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchesSearch =
        !searchQuery ||
        (q.customer_name && q.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.Customer?.name && q.Customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        String(q.id).includes(searchQuery) ||
        (q.quotation_number && q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRep =
        selectedRep === "ALL" ||
        String(q.sales_rep_id) === String(selectedRep) ||
        (q.salesRep && String(q.salesRep.id) === String(selectedRep));

      return matchesSearch && matchesRep;
    });
  }, [quotations, searchQuery, selectedRep]);

  // Overall Pipeline Analytics
  const totalPipelineValue = useMemo(() => {
    return filteredQuotations.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
  }, [filteredQuotations]);

  const approvalBacklogCount = useMemo(() => {
    return filteredQuotations.filter((q) => q.status === "PENDING_APPROVAL").length;
  }, [filteredQuotations]);

  const confirmedRevenue = useMemo(() => {
    return filteredQuotations
      .filter((q) => q.status === "CONFIRMED" || q.status === "FULFILLMENT")
      .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
  }, [filteredQuotations]);

  return (
    <AppLayout pageTitle="Sales Operations · Live Pipeline Kanban">
      {/* Top Metrics Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div className="metric-card">
          <div className="metric-label">Total Pipeline Volume</div>
          <div className="metric-value tnum" style={{ color: "var(--color-accent)" }}>
            ${totalPipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-delta positive">
            <TrendingUp size={12} />
            <span>{filteredQuotations.length} Active Deals Tracked</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Governance Review Backlog</div>
          <div
            className="metric-value tnum"
            style={{ color: approvalBacklogCount > 0 ? "var(--color-warning)" : "var(--color-success)" }}
          >
            {approvalBacklogCount} Deals
          </div>
          <div className="metric-delta">
            <span>Awaiting Level 1/Level 2 Approval</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Confirmed Won Revenue</div>
          <div className="metric-value tnum" style={{ color: "var(--color-success)" }}>
            ${confirmedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-delta positive">
            <span>Customer Accepted Orders</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Avg Deal Velocity</div>
          <div className="metric-value tnum">4.2 Days</div>
          <div className="metric-delta">
            <span>Quote to Confirm Cycle</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="data-card"
        style={{
          marginBottom: "1.25rem",
          padding: "0.875rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "380px" }}>
            <Search
              size={15}
              style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search by quote #, customer, or keyword..."
              className="input input-sm"
              style={{ paddingLeft: "2rem", width: "100%" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Filter size={14} color="var(--color-text-muted)" />
            <select
              className="select select-sm"
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
            >
              <option value="ALL">All Sales Representatives</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name} ({rep.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={fetchData} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
          <Link to="/cpq" className="btn btn-primary btn-sm">
            + Open CPQ Studio
          </Link>
        </div>
      </div>

      {/* 6-Column Kanban Board */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(260px, 1fr))",
          gap: "1rem",
          overflowX: "auto",
          paddingBottom: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        {STAGES.map((stage) => {
          const stageDeals = filteredQuotations.filter((q) => {
            if (stage.id === "DRAFT") return q.status === "DRAFT" || !q.status;
            if (stage.id === "FULFILLMENT") return q.status === "FULFILLMENT" || q.status === "DISPATCHED";
            return q.status === stage.id;
          });

          const stageTotal = stageDeals.reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              style={{
                backgroundColor: "var(--color-paper-0)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border-subtle)",
                display: "flex",
                flexDirection: "column",
                maxHeight: "calc(100vh - 280px)",
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: "0.875rem 1rem",
                  borderBottom: "2px solid " + stage.color,
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <Icon size={15} color={stage.color} />
                    <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{stage.label}</span>
                  </div>
                  <span
                    className="tnum"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      backgroundColor: "#f1f5f9",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    {stageDeals.length}
                  </span>
                </div>
                <div className="tnum" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  ${stageTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>

              {/* Column Deal Cards Container */}
              <div
                style={{
                  padding: "0.75rem",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  flex: 1,
                }}
              >
                {stageDeals.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem 1rem",
                      color: "var(--color-text-muted)",
                      fontSize: "0.75rem",
                      border: "1px dashed var(--color-border-subtle)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    No deals in {stage.label}
                  </div>
                ) : (
                  stageDeals.map((deal) => {
                    const custName =
                      deal.Customer?.name || deal.customer_name || `Customer #${deal.customer_id}`;
                    const dealAmount = Number(deal.total_amount) || 0;

                    return (
                      <div
                        key={deal.id}
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--color-border-subtle)",
                          padding: "0.875rem",
                          boxShadow: "var(--shadow-xs)",
                          transition: "box-shadow var(--transition-fast)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "0.375rem",
                          }}
                        >
                          <span
                            className="tnum"
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--color-accent)",
                            }}
                          >
                            #{deal.id} · {deal.quotation_number?.slice(0, 12) || "QUO"}
                          </span>
                          <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                            {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : "Recent"}
                          </span>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                          {custName}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.8125rem",
                            marginBottom: "0.75rem",
                            padding: "0.375rem 0.5rem",
                            backgroundColor: "#f8fafc",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>Deal Value:</span>
                          <strong className="tnum" style={{ color: "#0f172a" }}>
                            ${dealAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* Card Quick Action Links */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderTop: "1px solid var(--color-border-subtle)",
                            paddingTop: "0.5rem",
                            marginTop: "0.5rem",
                          }}
                        >
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <Link
                              to={`/portal/${deal.id}`}
                              target="_blank"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "2px 6px", fontSize: "0.6875rem", color: "#6366f1" }}
                              title="Open Customer Live Portal"
                            >
                              <ExternalLink size={12} /> Portal
                            </Link>
                            <Link
                              to="/cpq"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "2px 6px", fontSize: "0.6875rem" }}
                              title="Open in CPQ Studio"
                            >
                              Studio
                            </Link>
                          </div>

                          {/* Fast Stage Advance Button */}
                          {stage.id === "DRAFT" && (
                            <button
                              onClick={() => handleStageTransition(deal.id, "PENDING_APPROVAL")}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "2px 6px", fontSize: "0.6875rem" }}
                            >
                              Submit <ChevronRight size={12} />
                            </button>
                          )}
                          {stage.id === "PENDING_APPROVAL" && (
                            <button
                              onClick={() => handleStageTransition(deal.id, "APPROVED")}
                              className="btn btn-success btn-sm"
                              style={{ padding: "2px 6px", fontSize: "0.6875rem" }}
                            >
                              Approve <ChevronRight size={12} />
                            </button>
                          )}
                          {stage.id === "APPROVED" && (
                            <button
                              onClick={() => handleStageTransition(deal.id, "CONFIRMED")}
                              className="btn btn-primary btn-sm"
                              style={{ padding: "2px 6px", fontSize: "0.6875rem" }}
                            >
                              Confirm <ChevronRight size={12} />
                            </button>
                          )}
                          {stage.id === "CONFIRMED" && (
                            <button
                              onClick={() => handleStageTransition(deal.id, "FULFILLMENT")}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "2px 6px", fontSize: "0.6875rem" }}
                            >
                              Fulfill <ChevronRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default PipelineKanban;
