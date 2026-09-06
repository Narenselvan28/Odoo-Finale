import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { quotationsApi } from "../api";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import DealFlowChatbot from "../components/chat/DealFlowChatbot";
import {
  Sparkles,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Receipt,
  Download,
  CheckCircle,
} from "lucide-react";

const CustomerPortal = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const [quoteData, setQuoteData] = useState(null);
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Enforce light theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("dealflow_theme");
  }, []);

  // Negotiation Form State
  const [counterDiscount, setCounterDiscount] = useState(15);
  const [customerComment, setCustomerComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reApprovalNotice, setReApprovalNotice] = useState(null);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const res = await quotationsApi.getPublic(id);
      setQuoteData(res.data?.quotation);
      setNegotiations(res.data?.negotiations || []);

      const items = res.data?.quotation?.QuotationItems || [];
      if (items.length > 0) {
        const avgDisc =
          items.reduce((acc, i) => acc + (Number(i.discount_percent) || 0), 0) / items.length;
        setCounterDiscount(Math.min(30, Math.round(avgDisc + 5)));
      }
    } catch (err) {
      showToast({
        title: "Portal Access Error",
        message: err.response?.data?.message || err.message || "Failed to load quotation",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchQuote();
    }
  }, [id]);

  // Calculations
  const items = quoteData?.QuotationItems || [];
  const grossTotal = items.reduce(
    (sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 1),
    0
  );
  const currentTotal = Number(quoteData?.total_amount) || grossTotal;

  const currentAvgDiscount = items.length > 0
    ? items.reduce((acc, i) => acc + (Number(i.discount_percent) || 0), 0) / items.length
    : 0;

  // Maximum allowed negotiation discount: capped at +85% of current discount or 85% absolute ceiling
  const maxAllowedDiscount = currentAvgDiscount > 0
    ? Math.min(85.0, Number((currentAvgDiscount * 1.85).toFixed(1)))
    : 25.0;

  const isDiscountOverLimit = Number(counterDiscount) > 85.0 || (currentAvgDiscount > 0 && Number(counterDiscount) > maxAllowedDiscount);

  // Proposed counter total calculation
  const proposedCounterTotal = grossTotal * (1 - counterDiscount / 100);
  const proposedSavings = grossTotal - proposedCounterTotal;

  const handleNegotiateSubmit = async (e) => {
    e.preventDefault();
    if (isDiscountOverLimit) {
      showToast({
        title: "Discount Policy Violation",
        message: `Discounts cannot exceed +85% of current discount (Maximum allowed: ${maxAllowedDiscount}%).`,
        type: "error",
      });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        action: "SUBMIT_REQUEST",
        counter_discount: Number(counterDiscount),
        comment:
          customerComment ||
          `Proposed ${counterDiscount}% discount to match enterprise procurement budget.`,
      };

      const res = await quotationsApi.negotiatePublic(id, payload);
      const msg = res.data?.message || "Proposal submitted successfully.";

      if (res.data?.reApprovalTriggered) {
        setReApprovalNotice(
          "Automated Governance Triggered: Your requested concession exceeds standard policy. The quotation has automatically been routed to executive leadership for Level 1/Level 2 review."
        );
      } else {
        setReApprovalNotice(null);
      }

      showToast({
        title: "Negotiation Request Submitted",
        message: msg,
        type: "info",
      });

      setCustomerComment("");
      fetchQuote();
    } catch (err) {
      showToast({
        title: "Submission failed",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const { confirm } = useConfirm();

  const handleConfirmQuote = async () => {
    const isConfirmed = await confirm({
      title: "Confirm Quotation Order",
      message: `Do you officially accept and confirm Quotation #${quoteData?.quotation_number || id}?`,
      details: [
        `Total Payable Amount: ₹${currentTotal.toFixed(2)}`,
        "Commercial terms and pricing will be locked.",
        "Automatic warehouse inventory allocation and dispatch will be initiated.",
      ],
      confirmText: "Accept & Place Order",
      type: "success",
    });

    if (!isConfirmed) return;

    try {
      setSubmitting(true);
      const res = await quotationsApi.negotiatePublic(id, { action: "CONFIRM_QUOTATION" });
      showToast({
        title: "Quotation Confirmed!",
        message: res.data?.message || "Order confirmed. Fulfillment processing initiated.",
        type: "success",
      });
      fetchQuote();
    } catch (err) {
      showToast({
        title: "Confirmation failed",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return <span className="badge badge-approved"><CheckCircle2 size={12} /> Approved by Sales</span>;
      case "PENDING_APPROVAL":
        return <span className="badge badge-pending"><Clock size={12} /> Under Governance Review</span>;
      case "UNDER_NEGOTIATION":
        return <span className="badge badge-orange"><MessageSquare size={12} /> Under Live Negotiation</span>;
      case "CONFIRMED":
        return <span className="badge badge-confirmed"><CheckCircle size={12} /> Order Confirmed</span>;
      default:
        return <span className="badge badge-draft">{status || "DRAFT"}</span>;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg)",
          fontFamily: "var(--font)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Sparkles size={32} color="var(--orange)" style={{ animation: "spin 2s linear infinite" }} />
          <div style={{ marginTop: "1rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            Loading DealFlow 360 Secure Customer Portal...
          </div>
        </div>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg)",
          fontFamily: "var(--font)",
        }}
      >
        <div className="card" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem", borderTop: "3px solid var(--orange)" }}>
          <AlertTriangle size={36} color="var(--orange)" style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Quotation Link Unavailable</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            The requested quotation reference #{id} could not be retrieved or has expired.
          </p>
          <Link to="/login" className="btn btn-primary btn-sm">
            Back to Sales Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ===== INSTITUTIONAL TOP HEADER (ref ui.txt) ===== */}
      <header className="header">
        <div>
          <div className="logo">
            ✦ <span>DealFlow</span> 360
          </div>
          <span className="logo-sub">Customer Proposal & Commercial Acceptance Portal</span>
        </div>

        <div className="header-actions">
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Order Status:</span>
          {getStatusBadge(quoteData.status)}
        </div>
      </header>

      {/* ===== BREADCRUMB ===== */}
      <div className="breadcrumb" style={{ marginTop: "16px" }}>
        <span>Proposals</span> <span className="sep">/</span> <span>Commercial Orders</span> <span className="sep">/</span> <span className="current">Quotation #{quoteData.id}</span>
      </div>

      {/* Re-Approval Notice Alert if triggered */}
      {reApprovalNotice && (
        <div
          style={{
            backgroundColor: "var(--orange-pale)",
            border: "1px solid var(--orange)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            color: "var(--text)",
          }}
        >
          <AlertTriangle size={20} color="var(--orange)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ fontSize: "0.875rem", color: "var(--orange)" }}>Governance Re-Approval Triggered (Spec B8)</strong>
            <div style={{ fontSize: "0.8125rem", marginTop: "2px", lineHeight: 1.5 }}>
              {reApprovalNotice}
            </div>
          </div>
        </div>
      )}

      {/* ===== PAGE HEADER ===== */}
      <div className="page-header">
        <div className="label">Commercial Quotation</div>
        <h1>Proposal {quoteData.quotation_number || `QT-2026-${String(quoteData.id).padStart(3, "0")}`}</h1>
        <div className="accent-line"></div>
        <p>Prepared for {quoteData.Customer?.name || `Customer Account #${quoteData.customer_id}`}</p>
      </div>

      {/* ===== STATS ROW (ref ui.txt) ===== */}
      <div className="stats">
        <div className="stat-card">
          <div className="label">Quoted Total Value</div>
          <div className="value orange tnum">
            ₹{currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Line Products</div>
          <div className="value tnum">{items.length} Items</div>
        </div>

        <div className="stat-card">
          <div className="label">Offer Validity</div>
          <div className="value tnum" style={{ fontSize: "18px" }}>
            {quoteData.valid_until ? new Date(quoteData.valid_until).toLocaleDateString() : "Net 30"}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Payment Terms</div>
          <div className="value tnum" style={{ fontSize: "18px" }}>
            Net 30 Commercial
          </div>
        </div>
      </div>

      {/* 2-Column Split: Line Items & Commercial Negotiation Console */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "20px", marginBottom: "32px" }}>
        {/* Left Column: Product Specifications Table */}
        <div>
          <div className="card" style={{ borderTop: "3px solid var(--orange)" }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={16} color="var(--orange)" />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>Configured Product Lines</span>
              </div>
              <span className="badge badge-orange">{items.length} Lines</span>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "42%" }}>Product & Description</th>
                    <th style={{ width: "16%" }}>Unit Price</th>
                    <th style={{ width: "12%" }}>Qty</th>
                    <th style={{ width: "14%" }}>Discount</th>
                    <th style={{ width: "16%" }}>Line Net</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        No product items attached to this quotation.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const unitPrice = Number(item.unit_price) || 0;
                      const qty = Number(item.quantity) || 1;
                      const disc = Number(item.discount_percent) || 0;
                      const lineTotal = unitPrice * qty * (1 - disc / 100);

                      return (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text-heading)" }}>
                              {item.Product?.name || `Product Item #${item.product_id}`}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              SKU: {item.Product?.sku || "SKU-PROD"} · {item.Product?.product_type || "Product"}
                            </div>
                          </td>

                          <td className="tnum" style={{ fontSize: "0.8125rem" }}>
                            ₹{unitPrice.toFixed(2)}
                          </td>

                          <td className="tnum" style={{ fontWeight: 600 }}>
                            {qty}
                          </td>

                          <td>
                            {disc > 0 ? (
                              <span className="badge badge-orange">{disc}%</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>0%</span>
                            )}
                          </td>

                          <td className="tnum" style={{ fontWeight: 700 }}>
                            ₹{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: "1rem 1.25rem",
                backgroundColor: "var(--bg-secondary)",
                borderTop: "1px solid var(--border-light)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                All pricing in INR (₹). Includes standard enterprise support SLA.
              </div>
              <div className="tnum" style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--orange)" }}>
                Total: ₹{currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Negotiation Activity Log */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={16} color="var(--orange)" />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>Portal Negotiation Activity History</span>
              </div>
              <span className="badge badge-muted">{negotiations.length} Events</span>
            </div>

            <div style={{ padding: "1.25rem" }}>
              {negotiations.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem", textAlign: "center", padding: "1rem" }}>
                  No counter-proposals recorded yet. You can submit your commercial feedback using the negotiation panel.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {negotiations.map((n, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem 1rem",
                        backgroundColor: "var(--bg-secondary)",
                        borderRadius: "var(--radius-sm)",
                        borderLeft: "3px solid var(--orange)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--text-heading)" }}>
                          Counter-Proposal: {n.requested_discount}% Concession
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }} className="tnum">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : "Recently"}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>
                        "{n.message}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Negotiation Action Card (Spec B8) */}
        <div>
          <div
            className="card"
            style={{
              position: "sticky",
              top: "20px",
              borderTop: "3px solid var(--orange)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={18} color="var(--orange)" />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>
                  Commercial Response & Acceptance
                </span>
              </div>
            </div>

            <div style={{ padding: "1.25rem" }}>
              {/* 1-Click Accept Button */}
              <button
                type="button"
                onClick={handleConfirmQuote}
                disabled={submitting || quoteData.status === "CONFIRMED"}
                className="btn btn-primary w-full"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  padding: "0.75rem",
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  marginBottom: "1.25rem",
                }}
              >
                <CheckCircle size={18} />
                <span>
                  {quoteData.status === "CONFIRMED" ? "Quotation Confirmed" : "Accept & Officially Confirm Quote"}
                </span>
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  margin: "1rem 0",
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                }}
              >
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-light)" }} />
                <span>OR SUBMIT COUNTER-OFFER</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-light)" }} />
              </div>

              {/* Counter Discount Proposal Form */}
              <form onSubmit={handleNegotiateSubmit}>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Requested Target Discount %
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="tnum" style={{ fontWeight: 800, color: isDiscountOverLimit ? "#dc2626" : "var(--orange)" }}>
                        {counterDiscount}%
                      </span>
                      {isDiscountOverLimit && (
                        <span style={{ fontSize: "0.6875rem", background: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                          BLOCKED
                        </span>
                      )}
                    </div>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max={Math.max(35, Math.ceil(maxAllowedDiscount))}
                    step="1"
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(Number(e.target.value))}
                    style={{ width: "100%", cursor: "pointer", accentColor: isDiscountOverLimit ? "#dc2626" : "var(--orange)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    <span>Current: {currentAvgDiscount.toFixed(1)}%</span>
                    <span>Max Allowed: <strong>{maxAllowedDiscount}%</strong></span>
                    <span>Hard Cap: 85%</span>
                  </div>
                </div>

                {/* 85% Discount Policy Warning Alert */}
                {isDiscountOverLimit && (
                  <div
                    style={{
                      backgroundColor: "#fef2f2",
                      border: "1px solid #f87171",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.75rem 1rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      color: "#991b1b",
                      fontSize: "0.75rem",
                      lineHeight: 1.4,
                    }}
                  >
                    <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <strong>Commercial Policy Restriction</strong>
                      <div>
                        Counter-discount cannot exceed +85% of the current quoted discount (Maximum allowed: <strong>{maxAllowedDiscount}%</strong>). Submitting {counterDiscount}% is disallowed.
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Recalculated Target Total */}
                <div
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.875rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span>Original Quoted:</span>
                    <span className="tnum">₹{grossTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-success)", marginTop: "4px" }}>
                    <span>Proposed Savings:</span>
                    <span className="tnum">-₹{proposedSavings.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.9375rem",
                      fontWeight: 800,
                      marginTop: "6px",
                      paddingTop: "6px",
                      borderTop: "1px dashed var(--border-strong)",
                    }}
                  >
                    <span>Your Proposed Total:</span>
                    <span className="tnum" style={{ color: isDiscountOverLimit ? "#dc2626" : "var(--orange)" }}>
                      ₹{proposedCounterTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <label className="form-label">
                    Commercial Justification / Message
                  </label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="e.g., We are standardizing this deployment across 5 branch offices and request volume pricing..."
                    value={customerComment}
                    onChange={(e) => setCustomerComment(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || quoteData.status === "CONFIRMED" || isDiscountOverLimit}
                  className="btn btn-primary w-full"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    opacity: isDiscountOverLimit ? 0.6 : 1,
                    cursor: isDiscountOverLimit ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={15} />
                  <span>
                    {isDiscountOverLimit ? `Discount Exceeds +85% Cap (Max ${maxAllowedDiscount}%)` : "Submit Counter-Proposal (Spec B8)"}
                  </span>
                </button>
              </form>

              <div
                style={{
                  marginTop: "1rem",
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                  textAlign: "center",
                }}
              >
                Submissions exceeding standard policy limits will automatically route through the DealFlow 360 automated approval governance loop.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 💬 Context-Aware Customer Deal Assistant */}
      <DealFlowChatbot
        quoteId={id}
        customerId={quoteData?.customer_id}
        initialContext={{
          quote_id: id,
          deal_id: quoteData?.quotation_number,
          total_amount: currentTotal,
          customer_tier: quoteData?.Customer?.CustomerTier?.name || "GOLD",
        }}
      />
    </div>
  );
};

export default CustomerPortal;

