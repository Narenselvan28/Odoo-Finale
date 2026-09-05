import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { quotationsApi } from "../api";
import { useToast } from "../context/ToastContext";
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

      // If quote has items, set counter discount default to average discount + 5%
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

  // Proposed counter total calculation
  const proposedCounterTotal = grossTotal * (1 - counterDiscount / 100);
  const proposedSavings = grossTotal - proposedCounterTotal;

  const handleNegotiateSubmit = async (e) => {
    e.preventDefault();
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

  const handleConfirmQuote = async () => {
    if (!window.confirm("Do you officially accept and confirm this quotation order?")) return;
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
        return <span className="badge badge-enterprise" style={{ background: "#6366f1", color: "#fff" }}><MessageSquare size={12} /> Under Live Negotiation</span>;
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
          backgroundColor: "#f8fafc",
          fontFamily: "var(--font-body)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Sparkles size={32} color="#4f46e5" style={{ animation: "spin 2s linear infinite" }} />
          <div style={{ marginTop: "1rem", fontWeight: 600, color: "#334155" }}>
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
          backgroundColor: "#f8fafc",
          fontFamily: "var(--font-body)",
        }}
      >
        <div className="data-card" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
          <AlertTriangle size={36} color="#e11d48" style={{ margin: "0 auto 1rem auto" }} />
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Quotation Link Unavailable</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        fontFamily: "var(--font-body)",
        paddingBottom: "4rem",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 20,
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "0.875rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a", fontFamily: "var(--font-display)" }}>
                DealFlow 360 · Customer Proposal Portal
              </div>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                Interactive Commercial Negotiation & Order Acceptance
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Status:</span>
            {getStatusBadge(quoteData.status)}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: "1100px", margin: "1.75rem auto 0 auto", padding: "0 1.5rem" }}>
        {/* Re-Approval Notice Alert if triggered */}
        {reApprovalNotice && (
          <div
            style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "var(--radius-md)",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              color: "#92400e",
              boxShadow: "0 2px 4px rgba(245, 158, 11, 0.08)",
            }}
          >
            <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ fontSize: "0.875rem" }}>Governance Re-Approval Triggered (Spec B8)</strong>
              <div style={{ fontSize: "0.8125rem", marginTop: "2px", lineHeight: 1.5 }}>
                {reApprovalNotice}
              </div>
            </div>
          </div>
        )}

        {/* Commercial Banner */}
        <div
          className="data-card"
          style={{
            marginBottom: "1.5rem",
            padding: "1.5rem",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Quotation Number
              </div>
              <div style={{ fontSize: "1.375rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-accent)" }}>
                {quoteData.quotation_number || `QUO-${quoteData.id}`}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                Created: {quoteData.created_at ? new Date(quoteData.created_at).toLocaleDateString() : "Active"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Customer Account
              </div>
              <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                {quoteData.Customer?.name || `Customer #${quoteData.customer_id}`}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                {quoteData.Customer?.email || "contact@client.com"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Offer Validity
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                {quoteData.valid_until ? new Date(quoteData.valid_until).toLocaleDateString() : "Net 30 Days"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                Payment Terms: Net 30 Commercial
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Current Quoted Amount
              </div>
              <div className="tnum" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>
                ${currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Line Items Table & Negotiation Console */}
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "1.5rem" }}>
          {/* Left Column: Configured Product Lines */}
          <div>
            <div className="data-card">
              <div className="data-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Layers size={18} color="var(--color-accent)" />
                  <span className="data-card-title">Commercial Line Items Specification</span>
                  <span className="badge badge-draft">{items.length} Products</span>
                </div>
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
                        <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
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
                              <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                                {item.Product?.name || `Product Item #${item.product_id}`}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                SKU: {item.Product?.sku || "SKU-PROD"} · {item.Product?.product_type || "Product"}
                              </div>
                            </td>

                            <td className="tnum" style={{ fontSize: "0.8125rem" }}>
                              ${unitPrice.toFixed(2)}
                            </td>

                            <td className="tnum" style={{ fontWeight: 500 }}>
                              {qty}
                            </td>

                            <td>
                              {disc > 0 ? (
                                <span className="badge badge-approved">{disc}%</span>
                              ) : (
                                <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>0%</span>
                              )}
                            </td>

                            <td className="tnum" style={{ fontWeight: 600 }}>
                              ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  backgroundColor: "var(--color-paper-0)",
                  borderTop: "1px solid var(--color-border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  All pricing in USD ($). Includes standard enterprise support SLA.
                </div>
                <div className="tnum" style={{ fontWeight: 700, fontSize: "1.125rem" }}>
                  Subtotal: ${currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Negotiation History Timeline */}
            <div className="data-card" style={{ marginTop: "1.5rem" }}>
              <div className="data-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <MessageSquare size={16} color="var(--color-accent)" />
                  <span className="data-card-title">Portal Negotiation Activity Log</span>
                </div>
                <span className="badge badge-draft">{negotiations.length} Events</span>
              </div>

              <div style={{ padding: "1.25rem" }}>
                {negotiations.length === 0 ? (
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem", textAlign: "center", padding: "1rem" }}>
                    No counter-proposals recorded yet. You can submit your commercial feedback using the negotiation panel.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {negotiations.map((n, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "0.75rem 1rem",
                          backgroundColor: "#f8fafc",
                          borderRadius: "var(--radius-md)",
                          borderLeft: "3px solid #6366f1",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                            Counter-Proposal Requested: {n.requested_discount}% Concession
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }} className="tnum">
                            {n.created_at ? new Date(n.created_at).toLocaleString() : "Recently"}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", margin: 0 }}>
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
              className="data-card"
              style={{
                position: "sticky",
                top: "80px",
                border: "1px solid #cbd5e1",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div
                style={{
                  padding: "1.25rem",
                  borderBottom: "1px solid var(--color-border-subtle)",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheck size={18} color="#4f46e5" />
                  <h3 style={{ fontSize: "1rem", margin: 0, fontWeight: 700 }}>
                    Commercial Response & Acceptance
                  </h3>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  Confirm terms directly or submit a counter-proposal to the sales team.
                </p>
              </div>

              <div style={{ padding: "1.25rem" }}>
                {/* 1-Click Accept Button */}
                <button
                  type="button"
                  onClick={handleConfirmQuote}
                  disabled={submitting || quoteData.status === "CONFIRMED"}
                  className="btn btn-success"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "0.75rem",
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    marginBottom: "1.5rem",
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
                    color: "var(--color-text-muted)",
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border-subtle)" }} />
                  <span>OR SUBMIT COUNTER-OFFER</span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border-subtle)" }} />
                </div>

                {/* Counter Discount Proposal Form */}
                <form onSubmit={handleNegotiateSubmit}>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                        Requested Target Discount %
                      </label>
                      <span className="tnum" style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                        {counterDiscount}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="35"
                      step="1"
                      value={counterDiscount}
                      onChange={(e) => setCounterDiscount(Number(e.target.value))}
                      style={{ width: "100%", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                      <span>5% (Standard)</span>
                      <span>15% (Tier Limit)</span>
                      <span>25%+ (Director Esc.)</span>
                    </div>
                  </div>

                  {/* Dynamic Recalculated Target Total */}
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "var(--radius-md)",
                      padding: "0.875rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      <span>Original Quoted:</span>
                      <span className="tnum">${grossTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-success)", marginTop: "4px" }}>
                      <span>Proposed Savings:</span>
                      <span className="tnum">-${proposedSavings.toFixed(2)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.9375rem",
                        fontWeight: 700,
                        marginTop: "6px",
                        paddingTop: "6px",
                        borderTop: "1px dashed #cbd5e1",
                      }}
                    >
                      <span>Your Proposed Total:</span>
                      <span className="tnum" style={{ color: "#4f46e5" }}>
                        ${proposedCounterTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      Commercial Justification / Message
                    </label>
                    <textarea
                      className="input"
                      rows="3"
                      placeholder="e.g., We are standardizing this deployment across 5 branch offices and request volume pricing..."
                      value={customerComment}
                      onChange={(e) => setCustomerComment(e.target.value)}
                      style={{ width: "100%", resize: "vertical", fontSize: "0.8125rem" }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || quoteData.status === "CONFIRMED"}
                    className="btn btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Send size={15} />
                    <span>Submit Counter-Proposal (Spec B8)</span>
                  </button>
                </form>

                <div
                  style={{
                    marginTop: "1rem",
                    fontSize: "0.7rem",
                    color: "var(--color-text-muted)",
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
      </main>
    </div>
  );
};

export default CustomerPortal;
