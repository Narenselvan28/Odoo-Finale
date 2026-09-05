import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { productsApi, customersApi, quotationsApi, approvalsApi } from "../api";
import { useToast } from "../context/ToastContext";
import {
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Send,
  Save,
  CheckCircle,
  FileText,
  Percent,
  TrendingUp,
  Layers,
  Sparkles
} from "lucide-react";

const PricingStudio = () => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quote Header State
  const [quoteNumber] = useState(`QTE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [currency] = useState("USD");
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Line Items State
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [custRes, prodRes] = await Promise.all([
          customersApi.getAll(),
          productsApi.getAll(),
        ]);
        const custList = custRes.data?.customers || custRes.data || [];
        const prodList = prodRes.data?.products || prodRes.data || [];
        setCustomers(custList);
        setProducts(prodList);

        if (custList.length > 0) {
          setSelectedCustomerId(custList[0].id);
        }

        // Initialize with first product
        if (prodList.length > 0) {
          const p = prodList[0];
          setLineItems([
            {
              id: Date.now(),
              product_id: p.id,
              name: p.name,
              sku: p.sku || "SKU-001",
              base_price: Number(p.base_price) || 1200,
              cost_price: Number(p.cost_price) || 600,
              quantity: 2,
              discount_percent: 5,
            },
          ]);
        }
      } catch (err) {
        showToast({
          title: "Failed to load studio assets",
          message: err.message,
          type: "error",
        });
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [showToast]);

  const selectedCustomer = customers.find((c) => String(c.id) === String(selectedCustomerId));

  // Add line item
  const handleAddItem = () => {
    if (products.length === 0) return;
    const p = products[0];
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        product_id: p.id,
        name: p.name,
        sku: p.sku || "SKU-AUTO",
        base_price: Number(p.base_price) || 500,
        cost_price: Number(p.cost_price) || 250,
        quantity: 1,
        discount_percent: 0,
      },
    ]);
  };

  // Update item field
  const handleItemChange = (index, field, value) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "product_id") {
        const prod = products.find((p) => String(p.id) === String(value));
        if (prod) {
          item.product_id = prod.id;
          item.name = prod.name;
          item.sku = prod.sku;
          item.base_price = Number(prod.base_price) || 0;
          item.cost_price = Number(prod.cost_price) || 0;
        }
      } else {
        item[field] = value;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index) => {
    if (lineItems.length === 1) {
      showToast({ message: "Quotation must have at least one line item.", type: "error" });
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const calculatedItems = lineItems.map((item) => {
    const qty = Number(item.quantity) || 1;
    const base = Number(item.base_price) || 0;
    const cost = Number(item.cost_price) || 0;
    const disc = Number(item.discount_percent) || 0;

    const gross = base * qty;
    const discountAmount = gross * (disc / 100);
    const net = gross - discountAmount;
    const totalCost = cost * qty;
    const marginAmount = net - totalCost;
    const marginPercent = net > 0 ? (marginAmount / net) * 100 : 0;

    return {
      ...item,
      qty,
      gross,
      discountAmount,
      net,
      totalCost,
      marginPercent,
    };
  });

  const totalGross = calculatedItems.reduce((acc, i) => acc + i.gross, 0);
  const totalDiscount = calculatedItems.reduce((acc, i) => acc + i.discountAmount, 0);
  const netSubtotal = calculatedItems.reduce((acc, i) => acc + i.net, 0);
  const totalCostOverall = calculatedItems.reduce((acc, i) => acc + i.totalCost, 0);
  const estimatedTax = netSubtotal * 0.18;
  const grandTotal = netSubtotal + estimatedTax;

  const blendedMarginPercent =
    netSubtotal > 0 ? ((netSubtotal - totalCostOverall) / netSubtotal) * 100 : 0;

  // Margin safety status
  const isHealthyMargin = blendedMarginPercent >= 35;
  const isWarningMargin = blendedMarginPercent >= 25 && blendedMarginPercent < 35;
  const isCriticalMargin = blendedMarginPercent < 25;

  const requiresApproval =
    isCriticalMargin || calculatedItems.some((i) => i.discount_percent > 20);

  // Save / Submit Handlers
  const handleSaveQuotation = async (status = "DRAFT") => {
    if (!selectedCustomerId) {
      showToast({ message: "Please select a customer.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        customer_id: selectedCustomerId,
        status: status,
        items: calculatedItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.qty,
          unit_price: item.base_price,
          discount_percent: item.discount_percent,
        })),
      };

      const res = await quotationsApi.create(payload);
      const quoteId = res.data?.quotation?.id || res.data?.id;

      if (status === "PENDING_APPROVAL" && quoteId) {
        await approvalsApi.create({
          quotation_id: quoteId,
          approval_level: 1,
          approver_role: "Sales Director",
        });
        showToast({
          title: "Submitted for Approval",
          message: `Quotation #${quoteNumber} routed to Sales Governance desk.`,
          type: "info",
        });
      } else {
        showToast({
          title: "Quotation Saved",
          message: `Quotation #${quoteNumber} recorded successfully with status ${status}.`,
          type: "success",
        });
      }
    } catch (err) {
      showToast({
        title: "Save failed",
        message: err.response?.data?.message || err.message,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout pageTitle="Pricing Studio · CPQ Data Entry Workbench">
      {/* Top Banner with Quote Identification */}
      <div
        className="data-card"
        style={{
          marginBottom: "1.25rem",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        }}
      >
        <div
          style={{
            padding: "1.25rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.25rem",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Quotation Reference
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-accent)" }}>
              {quoteNumber}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
              Customer Account
            </label>
            <select
              className="select select-sm"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              disabled={loadingData}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tier_name || "Enterprise"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Account Policy Tier
            </div>
            <div style={{ marginTop: "4px" }}>
              <span className="badge badge-enterprise">
                {selectedCustomer?.tier_name || "TIER 1 · ENTERPRISE"}
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
              Valid Until
            </label>
            <input
              type="date"
              className="input input-sm"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
              Currency & Terms
            </div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-primary)", marginTop: "4px" }}>
              {currency} · Net 30 Commercial
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Split Workbench */}
      <div className="cpq-workbench">
        {/* Left Column: Interactive Line Items Configurator */}
        <div>
          <div className="data-card">
            <div className="data-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={18} color="var(--color-accent)" />
                <span className="data-card-title">Configured Products & Pricing Matrix</span>
                <span className="badge badge-draft">{calculatedItems.length} Lines</span>
              </div>
              <button onClick={handleAddItem} className="btn btn-secondary btn-sm">
                <Plus size={14} /> Add Product Line
              </button>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "32%" }}>Product & SKU</th>
                    <th style={{ width: "12%" }}>Base Price</th>
                    <th style={{ width: "10%" }}>Cost</th>
                    <th style={{ width: "10%" }}>Qty</th>
                    <th style={{ width: "12%" }}>Discount %</th>
                    <th style={{ width: "12%" }}>Margin</th>
                    <th style={{ width: "12%" }}>Net Subtotal</th>
                    <th style={{ width: "4%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td>
                        <select
                          className="select select-sm"
                          value={item.product_id}
                          onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "2px" }} className="tnum">
                          SKU: {item.sku}
                        </div>
                      </td>

                      <td>
                        <input
                          type="number"
                          className="input input-sm tnum"
                          value={item.base_price}
                          onChange={(e) => handleItemChange(idx, "base_price", Number(e.target.value))}
                        />
                      </td>

                      <td className="tnum" style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                        ${item.cost_price.toFixed(2)}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="1"
                          className="input input-sm tnum"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        />
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="input input-sm tnum"
                            value={item.discount_percent}
                            onChange={(e) => handleItemChange(idx, "discount_percent", Number(e.target.value))}
                          />
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>%</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            item.marginPercent >= 35
                              ? "badge-approved"
                              : item.marginPercent >= 25
                              ? "badge-pending"
                              : "badge-rejected"
                          }`}
                        >
                          {item.marginPercent.toFixed(1)}%
                        </span>
                      </td>

                      <td className="tnum" style={{ fontWeight: 600 }}>
                        ${item.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--color-text-muted)", padding: "4px" }}
                          title="Remove line item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Volume Pricing & Bundle Recommendation Helper */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
            }}
          >
            <div className="data-card" style={{ padding: "1.25rem", margin: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <TrendingUp size={16} color="var(--color-accent)" />
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Volume Discount Policy</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                • 1 – 10 Units: <strong>Standard List (0% Concession)</strong><br />
                • 11 – 50 Units: <strong>5.0% Volume Tier Discount</strong><br />
                • 51 – 200 Units: <strong>12.5% Enterprise Tier Discount</strong><br />
                • 200+ Units: <strong>Custom Director Approval (&gt;20%)</strong>
              </div>
            </div>

            <div className="data-card" style={{ padding: "1.25rem", margin: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <Sparkles size={16} color="var(--color-warning)" />
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Bundle Recommendation Engine</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                Active quotation qualifies for <strong>Enterprise SLA Premium Support Add-on</strong>. Attaching this bundle lifts gross margin by <strong>+4.2%</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Margin Guardrail & Commercial Summary */}
        <div>
          <div className="cpq-guardrail-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Margin Protection Guardrail</span>
              {isHealthyMargin && <span className="badge badge-approved"><ShieldCheck size={12} /> Target Met</span>}
              {isWarningMargin && <span className="badge badge-pending"><AlertTriangle size={12} /> Borderline</span>}
              {isCriticalMargin && <span className="badge badge-rejected"><AlertTriangle size={12} /> Breach</span>}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                <span>Blended Margin</span>
                <span className="tnum" style={{ fontWeight: 700, fontSize: "1rem", color: isHealthyMargin ? "var(--color-success)" : isWarningMargin ? "var(--color-warning)" : "var(--color-danger)" }}>
                  {blendedMarginPercent.toFixed(1)}%
                </span>
              </div>

              <div className="margin-gauge-bar">
                <div
                  className="margin-gauge-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, blendedMarginPercent))}%`,
                    backgroundColor: isHealthyMargin ? "var(--color-success)" : isWarningMargin ? "var(--color-warning)" : "var(--color-danger)",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>
                <span>Floor (25%)</span>
                <span>Target (35%)</span>
                <span>Optimized (50%)</span>
              </div>
            </div>

            {requiresApproval && (
              <div
                style={{
                  backgroundColor: "var(--color-warning-bg)",
                  border: "1px solid var(--color-warning-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  marginTop: "1rem",
                  fontSize: "0.75rem",
                  color: "var(--color-warning)",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Governance Alert:</strong> This quote exceeds standard discount boundaries or margin floor. Sales Director approval required prior to order confirmation.
                </span>
              </div>
            )}

            <div style={{ marginTop: "1.25rem" }}>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Gross List Value</span>
                <span className="tnum">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Total Concessions</span>
                <span className="tnum" style={{ color: "var(--color-danger)" }}>
                  -${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Net Subtotal</span>
                <span className="tnum" style={{ fontWeight: 600 }}>${netSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Tax Est. (18%)</span>
                <span className="tnum">${estimatedTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="cpq-summary-row total">
                <span>Grand Total</span>
                <span className="tnum" style={{ color: "var(--color-accent)" }}>
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
              {requiresApproval ? (
                <button
                  onClick={() => handleSaveQuotation("PENDING_APPROVAL")}
                  disabled={saving || calculatedItems.length === 0}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Send size={15} />
                  <span>Submit for Governance Approval</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSaveQuotation("CONFIRMED")}
                  disabled={saving || calculatedItems.length === 0}
                  className="btn btn-success"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <CheckCircle size={15} />
                  <span>Instant Confirm & Issue Order</span>
                </button>
              )}

              <button
                onClick={() => handleSaveQuotation("DRAFT")}
                disabled={saving || calculatedItems.length === 0}
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <Save size={15} />
                <span>Save Draft Quotation</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PricingStudio;
