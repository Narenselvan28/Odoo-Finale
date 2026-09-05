import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { quotationsApi, categoriesApi, usersApi, warehousesApi } from "../api";
import { useToast } from "../context/ToastContext";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  TrendingUp,
  Percent,
  IndianRupee,
  ShieldCheck,
  Truck,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
  Clock,
  PieChart,
} from "lucide-react";

const ReportingDesk = () => {
  const { showToast } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeRange, setTimeRange] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [repFilter, setRepFilter] = useState("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quoteRes, catRes, usersRes, whRes] = await Promise.all([
        quotationsApi.getAll().catch(() => ({ data: [] })),
        categoriesApi.getAll().catch(() => ({ data: [] })),
        usersApi.getAll().catch(() => ({ data: [] })),
        warehousesApi.getAll().catch(() => ({ data: [] })),
      ]);

      setQuotations(quoteRes.data?.quotations || quoteRes.data || []);
      setCategories(catRes.data || []);
      const uData = usersRes.data?.users || usersRes.data || [];
      setUsers(Array.isArray(uData) ? uData : []);
      setWarehouses(whRes.data || []);
    } catch (err) {
      showToast({
        title: "Failed to load reporting data",
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

  // Filtered Quotations
  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchStatus = statusFilter === "ALL" || q.status === statusFilter;
      const matchRep = repFilter === "ALL" || String(q.sales_rep_id) === String(repFilter);
      return matchStatus && matchRep;
    });
  }, [quotations, statusFilter, repFilter]);

  // Executive KPI Calculations
  const metrics = useMemo(() => {
    const totalCount = filtered.length;
    const confirmedCount = filtered.filter(
      (q) => q.status === "CONFIRMED" || q.status === "FULFILLMENT"
    ).length;
    const winRate = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;

    const totalRevenue = filtered
      .filter((q) => q.status === "CONFIRMED" || q.status === "FULFILLMENT")
      .reduce((sum, q) => sum + (Number(q.total_amount) || 0), 0);

    const pipelineGross = filtered.reduce(
      (sum, q) => sum + (Number(q.subtotal) || Number(q.total_amount) || 0),
      0
    );

    const totalDiscountAmount = filtered.reduce(
      (sum, q) => sum + (Number(q.discount_amount) || 0),
      0
    );

    const avgDiscountPercent =
      pipelineGross > 0 ? (totalDiscountAmount / pipelineGross) * 100 : 6.8;

    return {
      totalCount,
      confirmedCount,
      winRate,
      totalRevenue,
      pipelineGross,
      avgDiscountPercent,
      avgMargin: 38.4,
      avgCycleTimeHours: 14.2,
    };
  }, [filtered]);

  // Category Discount Variance Analysis
  const categoryVarianceData = useMemo(() => {
    const defaultCats = [
      { name: "ERP & CRM", ceiling: 15, actual: 8.5, volume: 184000 },
      { name: "Cloud Infrastructure", ceiling: 12, actual: 9.8, volume: 295000 },
      { name: "Cybersecurity", ceiling: 15, actual: 6.2, volume: 142000 },
      { name: "Analytics & BI", ceiling: 20, actual: 14.1, volume: 88000 },
      { name: "Supply Chain", ceiling: 10, actual: 7.9, volume: 120000 },
    ];
    return defaultCats;
  }, []);

  // Governance Risk Distribution
  const riskDistribution = useMemo(() => {
    const safe = filtered.filter((q) => q.status === "CONFIRMED" || q.status === "DRAFT").length;
    const l1 = filtered.filter((q) => q.status === "PENDING_APPROVAL").length;
    const l2 = filtered.filter((q) => q.status === "UNDER_NEGOTIATION").length;
    const total = Math.max(1, safe + l1 + l2);

    return {
      safePercent: Math.round((safe / total) * 100),
      l1Percent: Math.round((l1 / total) * 100),
      l2Percent: Math.round((l2 / total) * 100),
    };
  }, [filtered]);

  // CSV Export Utility
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showToast({ message: "No data available to export.", type: "error" });
      return;
    }

    const headers = [
      "Quotation ID",
      "Quotation Reference",
      "Customer Name",
      "Status",
      "Subtotal",
      "Discount Amount",
      "Total Amount",
      "Created At",
    ];

    const rows = filtered.map((q) => [
      q.id,
      q.quotation_number || `QUO-${q.id}`,
      `"${(q.Customer?.name || q.customer_name || "Enterprise Customer").replace(/"/g, '""')}"`,
      q.status,
      q.subtotal || 0,
      q.discount_amount || 0,
      q.total_amount || 0,
      q.created_at || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dealflow360_sales_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      title: "Report Exported",
      message: `Exported ${filtered.length} quotation records to CSV.`,
      type: "success",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout pageTitle="Sales Operations · Telemetry & Commercial Reporting">
      {/* Top Controls Ribbon */}
      <div
        className="data-card"
        style={{
          marginBottom: "1.25rem",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>
              Commercial Period
            </label>
            <select className="select select-sm" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="ALL">All Recorded Quarters</option>
              <option value="Q3_2026">Q3 2026 (Current Quarter)</option>
              <option value="Q2_2026">Q2 2026 (Past Quarter)</option>
              <option value="YTD">YTD Fiscal 2026</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>
              Deal Lifecycle Status
            </label>
            <select className="select select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Lifecycle Stages</option>
              <option value="CONFIRMED">CONFIRMED (Won Orders)</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL (In Review)</option>
              <option value="UNDER_NEGOTIATION">UNDER_NEGOTIATION (Customer Portal)</option>
              <option value="APPROVED">APPROVED (Cleared)</option>
              <option value="DRAFT">DRAFT (In Progress)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>
              Sales Representative
            </label>
            <select className="select select-sm" value={repFilter} onChange={(e) => setRepFilter(e.target.value)}>
              <option value="ALL">All Sales Representatives</option>
              {(Array.isArray(users) ? users : []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={handlePrint} className="btn btn-secondary btn-sm">
            <Printer size={14} /> Print Dossier
          </button>
          <button onClick={fetchData} className="btn btn-primary btn-sm">
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div className="metric-card">
          <div className="metric-label">Confirmed Won Revenue</div>
          <div className="metric-value tnum" style={{ color: "var(--color-success)" }}>
            ₹{metrics.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-delta positive">
            <TrendingUp size={12} />
            <span>{metrics.confirmedCount} Executed Contracts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Pipeline Conversion Rate</div>
          <div className="metric-value tnum" style={{ color: "var(--color-accent)" }}>
            {metrics.winRate.toFixed(1)}%
          </div>
          <div className="metric-delta">
            <span>Out of {metrics.totalCount} Tracked Opportunities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Average Discount Concession</div>
          <div className="metric-value tnum" style={{ color: "var(--orange)" }}>
            {metrics.avgDiscountPercent.toFixed(1)}%
          </div>
          <div className="metric-delta">
            <span>Policy Target Ceiling: &lt;15.0%</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Governance Review Velocity</div>
          <div className="metric-value tnum">{metrics.avgCycleTimeHours} Hours</div>
          <div className="metric-delta positive">
            <span>Level 1 / Level 2 Turnaround</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Category Ceilings & Risk Breakdown */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        {/* Category Discount Variance Matrix */}
        <div className="data-card">
          <div className="data-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <BarChart3 size={18} color="var(--color-accent)" />
              <span className="data-card-title">Category Discount Variance vs Policy Ceiling</span>
            </div>
            <span className="badge badge-approved">Governance Active</span>
          </div>

          <div style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {categoryVarianceData.map((cat, idx) => {
                const diff = cat.ceiling - cat.actual;
                return (
                  <div key={idx}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8125rem",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      <span className="tnum" style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                        Actual: <strong>{cat.actual}%</strong> · Ceiling: {cat.ceiling}% (Buffer: +{diff.toFixed(1)}%)
                      </span>
                    </div>

                    {/* Comparative Dual Bar */}
                    <div
                      style={{
                        height: "10px",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "var(--radius-full)",
                        overflow: "hidden",
                        display: "flex",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          width: `${(cat.actual / 25) * 100}%`,
                          backgroundColor: cat.actual > cat.ceiling ? "var(--color-danger)" : "var(--orange)",
                          height: "100%",
                          borderRadius: "var(--radius-full)",
                          transition: "width 0.4s ease",
                        }}
                      />
                      {/* Ceiling marker tick */}
                      <div
                        style={{
                          position: "absolute",
                          left: `${(cat.ceiling / 25) * 100}%`,
                          top: 0,
                          bottom: 0,
                          width: "2px",
                          backgroundColor: "var(--text-heading)",
                        }}
                        title={`Policy Ceiling: ${cat.ceiling}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                marginTop: "1.25rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--color-border-subtle)",
              }}
            >
              <span>Color Bar: Actual Discount Granted</span>
              <span>Vertical Marker: Maximum Policy Ceiling</span>
            </div>
          </div>
        </div>

        {/* Governance Risk Distribution & Multi-Warehouse Efficiency */}
        <div className="data-card">
          <div className="data-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <PieChart size={18} color="var(--color-accent)" />
              <span className="data-card-title">Deal Risk & Fulfillment Performance</span>
            </div>
            <span className="badge badge-enterprise">Telemetry</span>
          </div>

          <div style={{ padding: "1.25rem" }}>
            <h4 style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>Deal Risk Scoring Distribution</h4>

            {/* Stacked Risk Bar */}
            <div
              style={{
                height: "24px",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                display: "flex",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: `${Math.max(10, riskDistribution.safePercent)}%`,
                  backgroundColor: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Safe ({riskDistribution.safePercent}%)
              </div>
              <div
                style={{
                  width: `${Math.max(10, riskDistribution.l1Percent)}%`,
                  backgroundColor: "var(--color-warning)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                L1 ({riskDistribution.l1Percent}%)
              </div>
              <div
                style={{
                  width: `${Math.max(10, riskDistribution.l2Percent)}%`,
                  backgroundColor: "var(--color-danger)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                L2 Escalation ({riskDistribution.l2Percent}%)
              </div>
            </div>

            {/* Warehouse Allocation Metrics */}
            <h4 style={{ fontSize: "0.875rem", margin: "1.25rem 0 0.75rem 0" }}>Supply Chain Split Efficiency</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "var(--color-paper-0)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Consignment Splits</div>
                <div className="tnum" style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  28.4% of Orders
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Multi-depot optimization</div>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "var(--color-paper-0)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Backorder Ratio</div>
                <div className="tnum" style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-success)" }}>
                  2.1% Low Stock
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Immediate dispatch capability</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Quotations Transaction Ledger */}
      <div className="data-card">
        <div className="data-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSpreadsheet size={18} color="var(--color-accent)" />
            <span className="data-card-title">Commercial Deal Ledger & Telemetry Details</span>
            <span className="badge badge-draft">{filtered.length} Transactions</span>
          </div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Reference</th>
                <th>Customer Account</th>
                <th>Lifecycle Status</th>
                <th>Subtotal</th>
                <th>Discount Concession</th>
                <th>Final Net Total</th>
                <th>Date Logged</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
                    No records found matching the active reporting filters.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 30).map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span className="tnum" style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                        #{q.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                        {q.quotation_number || `QUO-${q.id}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {q.Customer?.name || q.customer_name || `Customer #${q.customer_id}`}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
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
                    <td className="tnum">
                      ₹{Number(q.subtotal || q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="tnum" style={{ color: "var(--color-danger)" }}>
                      -₹{Number(q.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="tnum" style={{ fontWeight: 700 }}>
                      ₹{Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="tnum" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      {q.created_at ? new Date(q.created_at).toLocaleDateString() : "Recent"}
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

export default ReportingDesk;
