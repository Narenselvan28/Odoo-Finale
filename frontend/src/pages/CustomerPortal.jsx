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
import DealFlowChatbot from "../components/chat/DealFlowChatbot";

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

  // View Mode: 'counter' (viewing requested counter discount) vs 'original'
  const [viewMode, setViewMode] = useState("counter");

  // Negotiation Form State
  const [counterDiscount, setCounterDiscount] = useState(35);
  const [customerComment, setCustomerComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reApprovalNotice, setReApprovalNotice] = useState(null);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      const res = await quotationsApi.getPublic(id);
      setQuoteData(res.data?.quotation);
      const negs = res.data?.negotiations || [];
      setNegotiations(negs);

      if (negs.length > 0) {
        const latest = negs[negs.length - 1];
        if (latest.requested_discount) {
          setCounterDiscount(Number(latest.requested_discount));
        }
      } else {
        const items = res.data?.quotation?.QuotationItems || [];
        if (items.length > 0) {
          const avgDisc =
            items.reduce((acc, i) => acc + (Number(i.discount_percent) || 0), 0) / items.length;
          setCounterDiscount(Math.min(35, Math.round(avgDisc + 5)));
        }
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
  const latestNegotiation = negotiations.length > 0 ? negotiations[negotiations.length - 1] : null;
  const activeCounterDiscount = latestNegotiation ? Number(latestNegotiation.requested_discount) : counterDiscount;

  // Proposed counter total calculation
  const proposedCounterTotal = grossTotal * (1 - (viewMode === "counter" ? activeCounterDiscount : 0) / 100);
  const proposedSavings = grossTotal - (grossTotal * (1 - activeCounterDiscount / 100));

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

      if (res.data?.negotiations && Array.isArray(res.data.negotiations)) {
        setNegotiations(res.data.negotiations);
      } else {
        const newNeg = {
          id: Date.now(),
          quotation_id: id,
          requested_discount: Number(counterDiscount),
          message: payload.comment,
          created_at: new Date().toISOString(),
          status: "OPEN",
        };
        setNegotiations((prev) => [...prev, newNeg]);
      }
      setViewMode("counter");

      if (res.data?.reApprovalTriggered || Number(counterDiscount) > 20) {
        setReApprovalNotice(
          `Automated Governance Triggered: Your requested concession (${counterDiscount}%) exceeds standard rep autonomy. The quotation has automatically re-routed to executive leadership for signoff.`
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
      await fetchQuote();
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

      {/* Active Counter-Offer Banner */}
      {latestNegotiation && (
        <div
          style={{
            backgroundColor: "rgba(217, 119, 6, 0.08)",
            border: "1px solid var(--orange)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <MessageSquare size={22} color="var(--orange)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: "var(--orange)", fontSize: "0.9375rem" }}>
                Active Counter-Offer in Portal: {latestNegotiation.requested_discount}% Concession Requested
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Customer Proposal: "{latestNegotiation.message}" · Re-calculated below at ₹{(grossTotal * (1 - Number(latestNegotiation.requested_discount) / 100)).toFixed(2)}.
              </div>
            </div>
          </div>
          <span className="badge badge-pending" style={{ padding: "6px 14px", fontWeight: 700, fontSize: "0.8125rem" }}>
            Awaiting Sales Leadership Review
          </span>
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
          <div className="label">Original Quoted Total</div>
          <div className="value tnum" style={{ color: "var(--text-secondary)" }}>
            ₹{currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "3px solid var(--orange)" }}>
          <div className="label">
            {latestNegotiation ? `Your Counter Total (${activeCounterDiscount}%)` : "Target Proposal Total"}
          </div>
          <div className="value orange tnum" style={{ fontWeight: 800 }}>
            ₹{(grossTotal * (1 - activeCounterDiscount / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Requested Concession</div>
          <div className="value tnum" style={{ color: "var(--color-success)" }}>
            {activeCounterDiscount}% Off
          </div>
        </div>

        <div className="stat-card">
          <div className="label">Commercial Status</div>
          <div className="value tnum" style={{ fontSize: "16px" }}>
            {quoteData.status === "PENDING_APPROVAL" ? "Leadership Review" : quoteData.status === "CONFIRMED" ? "Order Confirmed" : "Under Negotiation"}
          </div>
        </div>
      </div>

      {/* 2-Column Split: Line Items & Commercial Negotiation Console */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "20px", marginBottom: "32px" }}>
        {/* Left Column: Product Specifications Table */}
        <div>
          <div className="card" style={{ borderTop: "3px solid var(--orange)" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={16} color="var(--orange)" />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>Configured Product Lines</span>
                <span className="badge badge-orange">{items.length} Lines</span>
              </div>

              {/* View Mode Toggle */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setViewMode("counter")}
                  className={`btn btn-sm ${viewMode === "counter" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  ⚡ View with {activeCounterDiscount}% Counter-Bid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("original")}
                  className={`btn btn-sm ${viewMode === "original" ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                >
                  Original Quote
                </button>
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
                      <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        No product items attached to this quotation.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const unitPrice = Number(item.unit_price) || 0;
                      const qty = Number(item.quantity) || 1;
                      const originalDisc = Number(item.discount_percent) || 0;
                      const effectiveDisc = viewMode === "counter" ? activeCounterDiscount : originalDisc;
                      const lineTotal = unitPrice * qty * (1 - effectiveDisc / 100);

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
                            {viewMode === "counter" ? (
                              <span className="badge badge-orange tnum" style={{ fontWeight: 700 }}>
                                {activeCounterDiscount}% (Bid)
                              </span>
                            ) : originalDisc > 0 ? (
                              <span className="badge badge-draft">{originalDisc}%</span>
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
                {viewMode === "counter" ? (
                  <span style={{ color: "var(--color-success)", fontWeight: 600 }}>
                    ⚡ Simulating your requested {activeCounterDiscount}% counter-proposal (Saves ₹{proposedSavings.toFixed(2)})
                  </span>
                ) : (
                  "All pricing in INR (₹). Standard enterprise terms."
                )}
              </div>
              <div className="tnum" style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--orange)" }}>
                {viewMode === "counter" ? "Proposed Total: " : "Original Total: "}
                ₹{(viewMode === "counter" ? (grossTotal * (1 - activeCounterDiscount / 100)) : currentTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                {latestNegotiation && (
                  <div style={{ padding: "0.75rem 0.875rem", backgroundColor: "var(--orange-pale)", border: "1px solid var(--orange)", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--orange)", textTransform: "uppercase" }}>
                      ⚡ Submitted Proposal on Record
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 800, marginTop: "2px" }}>
                      {latestNegotiation.requested_discount}% Discount Requested
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Status: Under Executive Leadership Review
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Requested Target Discount %
                    </label>
                    <span className="tnum" style={{ fontWeight: 800, color: "var(--orange)" }}>
                      {counterDiscount}%
                    </span>
                  </div>

                  {/* Quick Select Preset Pills */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                    {[10, 15, 20, 25, 30, 35, 40].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCounterDiscount(pct)}
                        style={{
                          padding: "2px 8px",
                          fontSize: "0.7rem",
                          borderRadius: "4px",
                          border: `1px solid ${counterDiscount === pct ? "var(--orange)" : "var(--border-light)"}`,
                          backgroundColor: counterDiscount === pct ? "var(--orange-pale)" : "var(--bg-card)",
                          color: counterDiscount === pct ? "var(--orange)" : "var(--text)",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(Number(e.target.value))}
                    style={{ width: "100%", cursor: "pointer", accentColor: "var(--orange)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    <span>5% (Standard)</span>
                    <span>20% (Tier Limit)</span>
                    <span>35%+ (Director Esc.)</span>
                  </div>
                </div>

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
                    <span className="tnum" style={{ color: "var(--orange)" }}>
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
                  disabled={submitting}
                  className="btn btn-primary w-full"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Send size={15} />
                  <span>
                    {quoteData.status === "CONFIRMED"
                      ? "Submit Revised Counter-Proposal (Spec B8)"
                      : "Submit Counter-Proposal (Spec B8)"}
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
