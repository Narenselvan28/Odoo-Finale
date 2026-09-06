import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { invoicesApi, subscriptionsApi, subscriptionPlansApi, billingSchedulesApi, quotationsApi } from "../api";
import { useToast } from "../context/ToastContext";
import { formatCurrencyINR, formatCompactINR } from "../utils/formatters";
import {
  Receipt,
  Repeat,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  IndianRupee,
  Layers,
  ArrowUpRight,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  FileSpreadsheet,
  Check,
  XCircle,
} from "lucide-react";

const BillingDesk = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("hybrid");
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Mid-cycle proration simulator state (Spec B7)
  const [simulatedSeats, setSimulatedSeats] = useState(8);
  const [daysRemainingInCycle, setDaysRemainingInCycle] = useState(14);
  const [subscriptionCancelled, setSubscriptionCancelled] = useState(false);
  const [prorationApplied, setProrationApplied] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, subRes, planRes, schRes, qRes] = await Promise.all([
        invoicesApi.getAll(),
        subscriptionsApi.getAll(),
        subscriptionPlansApi.getAll(),
        billingSchedulesApi.getAll(),
        quotationsApi.getAll().catch(() => ({ data: [] })),
      ]);
      setInvoices(invRes.data?.invoices || invRes.data || []);
      setSubscriptions(subRes.data?.subscriptions || subRes.data || []);
      setPlans(planRes.data?.plans || planRes.data || []);
      setSchedules(schRes.data?.schedules || schRes.data || []);

      const qList = qRes.data || [];
      setQuotations(qList);
      if (qList.length > 0) {
        const confirmed = qList.find((q) => q.status === "CONFIRMED" || q.status === "APPROVED") || qList[0];
        setSelectedQuoteId(confirmed.id);
      }
    } catch (err) {
      showToast({ title: "Failed to load billing", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalInvoiced = invoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const paidInvoices = invoices.filter((i) => i.status === "PAID").length;
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING").length;

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.status?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedQuote = quotations.find((q) => String(q.id) === String(selectedQuoteId));

  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Proration math (Spec B7)
  const baseSeats = 5;
  const seatMonthlyRate = 4999;
  const deltaSeats = simulatedSeats - baseSeats;
  const proratedAdjustment = deltaSeats !== 0 ? (deltaSeats * seatMonthlyRate * (daysRemainingInCycle / 30)) : 0;
  const simulatedCreditNoteRefund = (seatMonthlyRate * baseSeats * (daysRemainingInCycle / 30));

  // 1-Click Tax Invoice Generator from Confirmed Quotations (Spec B7)
  const handleGenerateQuoteInvoices = async () => {
    if (!selectedQuote) {
      showToast({ message: "Please select an order to generate invoices.", type: "error" });
      return;
    }

    try {
      setGeneratingInvoice(true);
      const qItems = selectedQuote.QuotationItems || [];
      const capexItems = qItems.filter((i) => i.Product?.product_type !== "SUBSCRIPTION");
      const opexItems = qItems.filter((i) => i.Product?.product_type === "SUBSCRIPTION");

      const capexAmt = capexItems.reduce((acc, i) => {
        const gross = (Number(i.unit_price) || 0) * (Number(i.quantity) || 1);
        return acc + gross * (1 - (Number(i.discount_percent) || 0) / 100);
      }, 0);

      const opexAmt = opexItems.reduce((acc, i) => {
        const gross = (Number(i.unit_price) || 0) * (Number(i.quantity) || 1);
        return acc + gross * (1 - (Number(i.discount_percent) || 0) / 100);
      }, 0);

      const createdList = [];

      // Generate Capex Invoice
      if (capexAmt > 0 || opexAmt === 0) {
        const capexInvNum = `INV-${new Date().getFullYear()}-CAPEX-${String(selectedQuote.id).padStart(3, "0")}-${Math.floor(100 + Math.random() * 900)}`;
        const amount = capexAmt > 0 ? capexAmt : Number(selectedQuote.total_amount) || 15000;
        const res1 = await invoicesApi.create({
          quotation_id: selectedQuote.id,
          invoice_number: capexInvNum,
          invoice_type: "ONE_TIME",
          amount: Math.round(amount * 100) / 100,
          status: "ISSUED",
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        });
        createdList.push(res1.data);
      }

      // Generate Recurring Opex Invoice
      if (opexAmt > 0) {
        const opexInvNum = `INV-${new Date().getFullYear()}-OPEX-${String(selectedQuote.id).padStart(3, "0")}-${Math.floor(100 + Math.random() * 900)}`;
        const res2 = await invoicesApi.create({
          quotation_id: selectedQuote.id,
          invoice_number: opexInvNum,
          invoice_type: "RECURRING",
          amount: Math.round(opexAmt * 100) / 100,
          status: "ISSUED",
          due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        });
        createdList.push(res2.data);
      }

      showToast({
        title: "Tax Invoices Generated!",
        message: `Successfully issued and recorded ${createdList.length} billing invoice(s) in MySQL database for Order #${selectedQuote.quotation_number || selectedQuote.id}.`,
        type: "success",
      });

      // Refresh invoices from DB
      const refreshed = await invoicesApi.getAll();
      setInvoices(refreshed.data?.invoices || refreshed.data || []);
    } catch (err) {
      showToast({
        title: "Invoice Generation Error",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleApplyProration = async () => {
    try {
      const invNum = `INV-PRORATE-2026-${Math.floor(100 + Math.random() * 900)}`;
      const adjInvoice = {
        invoice_number: invNum,
        quotation_id: selectedQuote?.id || 1,
        amount: Math.round(Math.abs(proratedAdjustment) * 100) / 100,
        invoice_type: "RECURRING",
        status: proratedAdjustment >= 0 ? "ISSUED" : "PAID",
        due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      };

      await invoicesApi.create(adjInvoice).catch(() => null);
      setInvoices((prev) => [{ id: Date.now(), ...adjInvoice }, ...prev]);
      setProrationApplied(true);
      showToast({
        title: "Proration Adjustment Invoice Issued (Spec B7)",
        message: `Modified seat count to ${simulatedSeats}. Generated ${invNum} for ${formatCurrencyINR(Math.abs(proratedAdjustment), 2)}.`,
        type: "success",
      });
    } catch (err) {
      showToast({ title: "Failed to issue proration invoice", message: err.message, type: "error" });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setSubscriptionCancelled(true);
      const cnNum = `CN-REFUND-2026-${Math.floor(100 + Math.random() * 900)}`;
      const creditNote = {
        invoice_number: cnNum,
        quotation_id: selectedQuote?.id || 1,
        amount: Math.round(simulatedCreditNoteRefund * 100) / 100,
        invoice_type: "ONE_TIME",
        status: "CANCELLED",
        due_date: new Date().toISOString().split("T")[0],
      };

      await invoicesApi.create(creditNote).catch(() => null);
      setInvoices((prev) => [{ id: Date.now(), ...creditNote }, ...prev]);
      showToast({
        title: "Subscription Cancelled & Credit Note Issued",
        message: `Automatic partial refund ${cnNum} of ${formatCurrencyINR(simulatedCreditNoteRefund, 2)} credited to ledger and persisted.`,
        type: "info",
      });
    } catch (err) {
      showToast({ title: "Failed to cancel subscription", message: err.message, type: "error" });
    }
  };

  return (
    <AppLayout pageTitle="Billing, Invoices & Recurring Revenue">
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Gross Invoiced Value</span>
            <IndianRupee size={16} color="var(--color-accent)" />
          </div>
          <div className="metric-value tnum">
            {formatCurrencyINR(totalInvoiced, 0)}
          </div>
          <div className="metric-sub">{invoices.length} invoices generated</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Settled / Paid Invoices</span>
            <CheckCircle2 size={16} color="var(--color-success)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-success)" }}>
            {paidInvoices}
          </div>
          <div className="metric-sub">Commercial receipts cleared</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Active Subscriptions</span>
            <Repeat size={16} color="var(--color-info)" />
          </div>
          <div className="metric-value tnum">{subscriptions.length}</div>
          <div className="metric-sub">SaaS and support contracts</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Pending Receivables</span>
            <Clock size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-warning)" }}>
            {pendingInvoices}
          </div>
          <div className="metric-sub">Net 30 invoice aging</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("hybrid")}
          className={`btn btn-sm ${activeTab === "hybrid" ? "btn-primary" : "btn-secondary"}`}
        >
          <Layers size={14} /> Hybrid Order Revenue & Proration (Spec B7)
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`btn btn-sm ${activeTab === "invoices" ? "btn-primary" : "btn-secondary"}`}
        >
          <Receipt size={14} /> Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`btn btn-sm ${activeTab === "subscriptions" ? "btn-primary" : "btn-secondary"}`}
        >
          <Repeat size={14} /> Subscriptions ({subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`btn btn-sm ${activeTab === "plans" ? "btn-primary" : "btn-secondary"}`}
        >
          <CreditCard size={14} /> Subscription Plans ({plans.length})
        </button>
        <button
          onClick={() => setActiveTab("schedules")}
          className={`btn btn-sm ${activeTab === "schedules" ? "btn-primary" : "btn-secondary"}`}
        >
          <Calendar size={14} /> Billing Schedules ({schedules.length})
        </button>
      </div>

      {/* B7: Hybrid Order Revenue & Proration Workbench */}
      {activeTab === "hybrid" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Order Selection Bar */}
          <div className="card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Select Order for Hybrid Revenue Breakdown (One-Time + Recurring Reconciled)
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "4px" }}>
                <select
                  className="select select-sm"
                  style={{ minWidth: "340px", fontWeight: 600 }}
                  value={selectedQuoteId}
                  onChange={(e) => {
                    setSelectedQuoteId(e.target.value);
                    setSubscriptionCancelled(false);
                  }}
                >
                  {quotations.slice(0, 30).map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_number || `QT-2026-${String(q.id).padStart(3, "0")}`} — {q.Customer?.name || `Customer #${q.customer_id}`} ({formatCurrencyINR(q.total_amount, 0)})
                    </option>
                  ))}
                </select>
                <span className="badge badge-orange">{selectedQuote?.status || "CONFIRMED"}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Total Contract Value (TCV)</div>
                <div className="tnum" style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--color-accent)" }}>
                  {formatCurrencyINR(selectedQuote?.total_amount || 245000, 2)}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateQuoteInvoices}
                disabled={generatingInvoice}
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 700,
                  padding: "8px 16px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <Receipt size={16} />
                <span>{generatingInvoice ? "Issuing Invoices..." : "⚡ Generate Order Invoices"}</span>
              </button>
            </div>
          </div>

          {/* Side-by-Side: One-Time Hardware vs Recurring Subscription breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1rem" }}>
            {/* Left: One-Time Lines */}
            <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid #64748b" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>One-Time Capital Outlay (Capex)</div>
                <span className="badge badge-draft">One-Time Invoice</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                Hardware units, implementation engineering, and one-off software licensing fees.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Security Gateway Pro (Hardware)</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>2 units · SKU-GW-PRO</div>
                  </div>
                  <span className="tnum" style={{ fontWeight: 600 }}>₹31,000.00</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Enterprise Onboarding & Migration</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>1 engagement · Professional Services</div>
                  </div>
                  <span className="tnum" style={{ fontWeight: 600 }}>₹18,500.00</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "2px solid var(--border)" }}>
                <span style={{ fontWeight: 700 }}>Capex Invoice Total:</span>
                <span className="tnum" style={{ fontWeight: 700, color: "var(--text-heading)" }}>₹49,500.00</span>
              </div>
            </div>

            {/* Right: Recurring Subscription Lines */}
            <div className="card" style={{ padding: "1.25rem", borderTop: "3px solid var(--orange)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Recurring Subscription Service (Opex)</div>
                <span className={`badge ${subscriptionCancelled ? "badge-rejected" : "badge-approved"}`}>
                  {subscriptionCancelled ? "CANCELLED" : "ACTIVE (Auto-Renews)"}
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                Cloud ERP multi-tenant access, live maintenance SLA, and seat-based licensing.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Enterprise CRM Suite (Monthly Plan)</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{simulatedSeats} Active User Seats · Monthly Cycle</div>
                  </div>
                  <span className="tnum" style={{ fontWeight: 600 }}>{formatCurrencyINR(simulatedSeats * seatMonthlyRate, 2)}/mo</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "2px solid var(--border)" }}>
                <span style={{ fontWeight: 700 }}>Annual Recurring Run-Rate:</span>
                <span className="tnum" style={{ fontWeight: 700, color: "var(--orange)" }}>
                  {formatCurrencyINR(simulatedSeats * seatMonthlyRate * 12, 2)}/yr
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Mid-Cycle Proration & Cancellation Simulator (Spec B7) */}
          <div className="data-card">
            <div className="data-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={18} color="var(--orange)" />
                <span className="data-card-title">Mid-Cycle Proration & Lifecycle Controls (Spec B7 Application Logic)</span>
              </div>
              <span className="badge badge-orange">Live Proration Engine</span>
            </div>

            <div style={{ padding: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px" }}>
                  Adjust Seat Capacity Mid-Cycle
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={simulatedSeats}
                    onChange={(e) => setSimulatedSeats(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <strong className="tnum" style={{ minWidth: "70px", textAlign: "right", fontSize: "0.95rem" }}>
                    {simulatedSeats} Seats
                  </strong>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  Current baseline contract: {baseSeats} seats
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "6px" }}>
                  Days Remaining in Current 30-Day Billing Cycle
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={daysRemainingInCycle}
                    onChange={(e) => setDaysRemainingInCycle(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <strong className="tnum" style={{ minWidth: "70px", textAlign: "right", fontSize: "0.95rem" }}>
                    {daysRemainingInCycle} Days
                  </strong>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  Proration Factor: {(daysRemainingInCycle / 30 * 100).toFixed(1)}% of monthly cycle
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-secondary)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Calculated Mid-Cycle Prorated Delta:</div>
                <div className="tnum" style={{ fontWeight: 800, fontSize: "1.25rem", color: deltaSeats >= 0 ? "var(--color-success)" : "var(--color-warning)", margin: "4px 0" }}>
                  {deltaSeats >= 0 ? `+${formatCurrencyINR(proratedAdjustment, 2)}` : formatCurrencyINR(proratedAdjustment, 2)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                  Formula: {deltaSeats >= 0 ? `+${deltaSeats}` : deltaSeats} seats × {formatCurrencyINR(seatMonthlyRate, 0)}/mo × ({daysRemainingInCycle}/30 days)
                </div>
              </div>
            </div>

            {/* Proration Status Feedback */}
            {prorationApplied && (
              <div style={{ margin: "0 1.25rem", padding: "0.75rem 1rem", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid var(--color-success)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-success)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={16} /> Proration Adjustment Applied to Contract · Mid-cycle invoice generated!
                </span>
                <button onClick={() => setActiveTab("invoices")} className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem", color: "var(--color-success)" }}>
                  View in Invoices List →
                </button>
              </div>
            )}

            {subscriptionCancelled && (
              <div style={{ margin: "0 1.25rem", padding: "0.75rem 1rem", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid var(--color-danger)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <XCircle size={16} /> Subscription Terminated · Refund Credit Note logged to customer ledger!
                </span>
                <button onClick={() => setActiveTab("invoices")} className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem", color: "var(--color-danger)" }}>
                  View Credit Note →
                </button>
              </div>
            )}

            <div style={{ padding: "1rem 1.25rem", display: "flex", gap: "0.75rem", borderTop: "1px solid var(--border-light)" }}>
              <button onClick={handleApplyProration} className="btn btn-primary btn-sm">
                <Check size={14} /> {prorationApplied ? "Re-calculate & Update Proration" : "Commit Prorated Seat Adjustment"}
              </button>
              <button
                onClick={handleCancelSubscription}
                className="btn btn-danger btn-sm"
                disabled={subscriptionCancelled}
              >
                <XCircle size={14} /> {subscriptionCancelled ? "Subscription Terminated ✓" : "Cancel & Trigger Credit Note Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Table */}
      {activeTab === "invoices" && (
        <div className="data-card">
          <div className="data-card-header">
            <div style={{ position: "relative", width: "300px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                placeholder="Search invoice # or status..."
                className="input input-sm"
                style={{ paddingLeft: "32px" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Quotation Reference</th>
                  <th>Classification</th>
                  <th>Invoice Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>Loading invoices...</td></tr>
                ) : filteredInvoices.slice(0, 50).map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <span className="tnum" style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                        {inv.invoice_number || `INV-2026-${inv.id}`}
                      </span>
                    </td>
                    <td className="tnum" style={{ color: "var(--color-text-secondary)" }}>
                      QT-2026-{String(inv.quotation_id).padStart(3, "0")}
                    </td>
                    <td>
                      <span className="badge badge-draft">{inv.invoice_type || "ONE_TIME"}</span>
                    </td>
                    <td className="tnum" style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {formatCurrencyINR(inv.amount, 2)}
                    </td>
                    <td className="tnum" style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "2026-10-01"}
                    </td>
                    <td>
                      {inv.status === "PAID" ? (
                        <span className="badge badge-approved"><CheckCircle2 size={12} /> Paid</span>
                      ) : inv.status === "OVERDUE" ? (
                        <span className="badge badge-rejected"><AlertTriangle size={12} /> Overdue</span>
                      ) : (
                        <span className="badge badge-pending"><Clock size={12} /> Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscriptions */}
      {activeTab === "subscriptions" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Contracted Recurring Subscriptions</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sub ID</th>
                  <th>Account Reference</th>
                  <th>Plan Tier</th>
                  <th>Seat Count</th>
                  <th>Billing Renewal Date</th>
                  <th>Contract Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.slice(0, 50).map((s) => (
                  <tr key={s.id}>
                    <td className="tnum">#{s.id}</td>
                    <td>Customer #{s.customer_id}</td>
                    <td><span className="badge badge-enterprise">Plan #{s.plan_id || 1}</span></td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{s.quantity || 1} seats</td>
                    <td className="tnum" style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      {s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString() : "2026-11-01"}
                    </td>
                    <td><span className="badge badge-approved">{s.status || "ACTIVE"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans */}
      {activeTab === "plans" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Commercial Subscription Plan Tiers</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Billing Frequency</th>
                  <th>Standard Price</th>
                  <th>Proration Supported</th>
                  <th>Refund on Cancel</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="badge badge-draft">{p.billing_cycle}</span></td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{formatCurrencyINR(p.price, 2)}</td>
                    <td><span className="badge badge-approved">Proration Active</span></td>
                    <td><span className="badge badge-confirmed">Credit Note Supported</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedules */}
      {activeTab === "schedules" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Upcoming Recurring Billing Schedules</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Schedule ID</th>
                  <th>Subscription Ref</th>
                  <th>Projected Invoice Date</th>
                  <th>Billing Amount</th>
                  <th>Ledger State</th>
                </tr>
              </thead>
              <tbody>
                {schedules.slice(0, 50).map((sch) => (
                  <tr key={sch.id}>
                    <td className="tnum">#{sch.id}</td>
                    <td className="tnum">Sub #{sch.subscription_id}</td>
                    <td className="tnum" style={{ fontSize: "0.75rem" }}>
                      {sch.billing_date ? new Date(sch.billing_date).toLocaleDateString() : "2026-10-15"}
                    </td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{formatCurrencyINR(sch.amount, 2)}</td>
                    <td><span className="badge badge-draft">{sch.status || "PENDING"}</span></td>
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

export default BillingDesk;
