import React, { useState, useEffect, useCallback, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import {
  productsApi,
  customersApi,
  quotationsApi,
  approvalsApi,
  warehousesApi,
  inventoryApi,
  productRecommendationsApi,
} from "../api";
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
  Sparkles,
  Warehouse,
  RotateCcw,
  Check,
  X,
  Calendar,
  CreditCard,
  Truck,
  ArrowUpRight,
  Info,
  ShieldAlert,
} from "lucide-react";

const PricingStudio = () => {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [dbRecommendations, setDbRecommendations] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quote Header State
  const [quoteNumber] = useState(
    `QTE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [currency] = useState("INR");
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Line Items State
  const [lineItems, setLineItems] = useState([]);

  // B5: Recommendation Dismissal State
  const [dismissedRecIds, setDismissedRecIds] = useState(new Set());

  // B6: Multi-Warehouse Split Modal State
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [allocations, setAllocations] = useState({});
  const [suggestedSplitActive, setSuggestedSplitActive] = useState(true);

  // B7: Hybrid Billing & Subscription State
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [contractTermMonths, setContractTermMonths] = useState(12);
  const [prorationStartDate, setProrationStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Section 10 & 12: Live Blended Risk Evaluation State
  const [riskAnalysis, setRiskAnalysis] = useState({
    blendedRiskScore: 0,
    requiresApproval: false,
    requiredLevel: 1,
    approvalRole: "Sales Director",
    explanation: "Standard pricing within policy guidelines.",
    maxLineBreach: 0,
    portfolioOverage: 0,
  });
  const [evaluatingRisk, setEvaluatingRisk] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [custRes, prodRes, whRes, invRes, recRes] = await Promise.all([
          customersApi.getAll().catch(() => ({ data: [] })),
          productsApi.getAll().catch(() => ({ data: [] })),
          warehousesApi.getAll().catch(() => ({ data: [] })),
          inventoryApi.getAll().catch(() => ({ data: [] })),
          productRecommendationsApi.getAll().catch(() => ({ data: [] })),
        ]);

        const custList = custRes.data?.customers || custRes.data || [];
        const prodList = prodRes.data?.products || prodRes.data || [];
        const whList = whRes.data || [];
        const invList = invRes.data || [];
        const recList = recRes.data || [];

        setCustomers(custList);
        setProducts(prodList);
        setWarehouses(whList);
        setInventoryList(invList);
        setDbRecommendations(recList);

        if (custList.length > 0) {
          setSelectedCustomerId(custList[0].id);
        }

        // Initialize with default items
        if (prodList.length > 0) {
          const p1 = prodList[0];
          const p2 = prodList[1] || prodList[0];
          setLineItems([
            {
              id: Date.now(),
              product_id: p1.id,
              name: p1.name,
              sku: p1.sku || "SKU-001",
              base_price: Number(p1.base_price) || 1200,
              cost_price: Number(p1.cost_price) || 600,
              quantity: 2,
              discount_percent: 5,
              product_type: p1.product_type || "SUBSCRIPTION",
              category_name: p1.Category?.name || "ERP & CRM",
            },
            {
              id: Date.now() + 1,
              product_id: p2.id,
              name: p2.name,
              sku: p2.sku || "SKU-002",
              base_price: Number(p2.base_price) || 850,
              cost_price: Number(p2.cost_price) || 400,
              quantity: 1,
              discount_percent: 0,
              product_type: p2.product_type || "ONE_TIME",
              category_name: p2.Category?.name || "Cloud Infrastructure",
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

  const selectedCustomer = customers.find(
    (c) => String(c.id) === String(selectedCustomerId)
  );

  // Add line item
  const handleAddItem = () => {
    if (products.length === 0) return;
    const p = products[Math.floor(Math.random() * products.length)];
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
        product_type: p.product_type || "ONE_TIME",
        category_name: p.Category?.name || "General",
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
          item.product_type = prod.product_type || "ONE_TIME";
          item.category_name = prod.Category?.name || "General";
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

  // Line Calculations
  const calculatedItems = useMemo(() => {
    return lineItems.map((item) => {
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
  }, [lineItems]);

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

  // Evaluate Blended Risk from Backend per Section 10 & 12
  const evaluateBlendedRisk = useCallback(async () => {
    if (!selectedCustomerId || calculatedItems.length === 0) return;
    try {
      setEvaluatingRisk(true);
      const payload = {
        customer_id: selectedCustomerId,
        items: calculatedItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.qty,
          unit_price: item.base_price,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent,
        })),
      };
      const res = await quotationsApi.evaluateRisk(payload);
      if (res.data) {
        setRiskAnalysis(res.data);
      }
    } catch {
      // Fallback local heuristic
      const maxDisc = Math.max(...calculatedItems.map((i) => i.discount_percent), 0);
      const reqL2 = maxDisc > 20 || blendedMarginPercent < 20;
      const reqL1 = maxDisc > 12 || blendedMarginPercent < 30;
      setRiskAnalysis({
        blendedRiskScore: Math.min(100, Math.round(maxDisc * 2.5 + (35 - blendedMarginPercent) * 2)),
        requiresApproval: reqL1 || reqL2,
        requiredLevel: reqL2 ? 2 : reqL1 ? 1 : 0,
        approvalRole: reqL2 ? "Finance Controller" : "Sales Director",
        explanation: reqL2
          ? "High concession or critical margin breach requires Level 2 Finance sign-off."
          : reqL1
          ? "Discount exceeds standard rep authority. Level 1 Director review required."
          : "Pricing within standard margin corridor.",
        maxLineBreach: Math.max(0, maxDisc - 15),
      });
    } finally {
      setEvaluatingRisk(false);
    }
  }, [selectedCustomerId, calculatedItems, blendedMarginPercent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      evaluateBlendedRisk();
    }, 350);
    return () => clearTimeout(timer);
  }, [evaluateBlendedRisk]);

  // B5: Recommendation Engine logic
  const activeRecommendations = useMemo(() => {
    if (products.length === 0) return [];
    const currentProductIds = new Set(calculatedItems.map((i) => i.product_id));

    // Find database recommendations matching current items
    const candidates = [];
    for (const rec of dbRecommendations) {
      if (currentProductIds.has(rec.product_id) && !currentProductIds.has(rec.recommended_product_id)) {
        const prod = products.find((p) => p.id === rec.recommended_product_id);
        if (prod && !dismissedRecIds.has(prod.id)) {
          candidates.push({
            id: prod.id,
            product: prod,
            type: rec.recommendation_type || "UPSELL",
            score: rec.score || 8.5,
            badge: rec.is_promoted ? "Special Promotion" : "High Margin Attachment",
          });
        }
      }
    }

    // If no DB recommendations matched, dynamically generate contextual upsells
    if (candidates.length === 0) {
      const remainingProducts = products.filter(
        (p) => !currentProductIds.has(p.id) && !dismissedRecIds.has(p.id)
      );
      if (remainingProducts.length > 0) {
        // Pick top margin products
        const highMargin = [...remainingProducts].sort(
          (a, b) =>
            (Number(b.base_price) - Number(b.cost_price)) / (Number(b.base_price) || 1) -
            (Number(a.base_price) - Number(a.cost_price)) / (Number(a.base_price) || 1)
        );
        candidates.push({
          id: highMargin[0].id,
          product: highMargin[0],
          type: highMargin[0].product_type === "SUBSCRIPTION" ? "CROSS_SELL" : "UPSELL",
          score: 9.2,
          badge: "Margin Optimizer",
        });
      }
    }

    return candidates.slice(0, 2);
  }, [products, calculatedItems, dbRecommendations, dismissedRecIds]);

  // Handle Add Recommended Product
  const handleAddRecommendation = (prod) => {
    setLineItems((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku || "SKU-REC",
        base_price: Number(prod.base_price) || 500,
        cost_price: Number(prod.cost_price) || 200,
        quantity: 1,
        discount_percent: 0,
        product_type: prod.product_type || "ONE_TIME",
        category_name: prod.Category?.name || "Add-on",
      },
    ]);
    showToast({
      title: "Recommendation Attached",
      message: `Added ${prod.name} to quotation. Blended margin recalculated.`,
      type: "success",
    });
  };

  const handleDismissRecommendation = (prodId) => {
    setDismissedRecIds((prev) => new Set([...prev, prodId]));
  };

  // B6: Multi-Warehouse Split Calculations
  const warehouseSplitPlan = useMemo(() => {
    if (warehouses.length === 0) return [];

    return calculatedItems.map((item) => {
      const itemInventory = inventoryList.filter((inv) => inv.product_id === item.product_id);
      const totalAvailable = itemInventory.reduce(
        (sum, inv) => sum + (Number(inv.available_quantity) || 0),
        0
      );

      // Distribute across warehouses
      let remainingToAllocate = item.qty;
      const distribution = [];

      // Sort inventory by available quantity desc
      const sortedInv = [...itemInventory].sort(
        (a, b) => (b.available_quantity || 0) - (a.available_quantity || 0)
      );

      if (sortedInv.length === 0) {
        // Synthetic default distribution
        const primaryWh = warehouses[0] || { id: 1, name: "Central Hub", shipping_cost_weight: 35 };
        const secondaryWh = warehouses[1] || { id: 2, name: "East Coast Depot", shipping_cost_weight: 50 };
        distribution.push({
          warehouse: primaryWh,
          allocated: Math.min(item.qty, Math.ceil(item.qty * 0.7)),
          shippingCost: Number(primaryWh.shipping_cost_weight || 35),
        });
        if (item.qty > distribution[0].allocated) {
          distribution.push({
            warehouse: secondaryWh,
            allocated: item.qty - distribution[0].allocated,
            shippingCost: Number(secondaryWh.shipping_cost_weight || 50),
          });
        }
      } else {
        for (const inv of sortedInv) {
          if (remainingToAllocate <= 0) break;
          const wh = warehouses.find((w) => w.id === inv.warehouse_id) || inv.Warehouse;
          const alloc = Math.min(remainingToAllocate, inv.available_quantity);
          if (alloc > 0 && wh) {
            distribution.push({
              warehouse: wh,
              allocated: alloc,
              shippingCost: Number(wh.shipping_cost_weight || 40),
            });
            remainingToAllocate -= alloc;
          }
        }
        // If remaining cannot be fulfilled from stock, mark backorder
        if (remainingToAllocate > 0) {
          distribution.push({
            warehouse: { id: 999, name: "Factory Backorder (Lead: 7 Days)", location: "Supplier Plant" },
            allocated: remainingToAllocate,
            shippingCost: 0,
            isBackorder: true,
          });
        }
      }

      return {
        item,
        totalAvailable,
        distribution,
        isSplit: distribution.length > 1,
        hasBackorder: distribution.some((d) => d.isBackorder),
      };
    });
  }, [calculatedItems, inventoryList, warehouses]);

  const totalSplitShipments = useMemo(() => {
    const activeWhIds = new Set();
    warehouseSplitPlan.forEach((p) => {
      p.distribution.forEach((d) => activeWhIds.add(d.warehouse.id));
    });
    return activeWhIds.size;
  }, [warehouseSplitPlan]);

  const estimatedFreightCost = useMemo(() => {
    let freight = 0;
    warehouseSplitPlan.forEach((p) => {
      p.distribution.forEach((d) => {
        if (!d.isBackorder) {
          freight += Number(d.warehouse.shipping_cost_weight || 30) * 0.5;
        }
      });
    });
    return freight;
  }, [warehouseSplitPlan]);

  // B7: Hybrid Billing & Subscription Calculations
  const capexItems = calculatedItems.filter((i) => i.product_type !== "SUBSCRIPTION");
  const opexItems = calculatedItems.filter((i) => i.product_type === "SUBSCRIPTION");

  const capexTotal = capexItems.reduce((acc, i) => acc + i.net, 0);
  const monthlyOpex = opexItems.reduce((acc, i) => acc + i.net, 0);
  const annualRecurringRevenue = monthlyOpex * 12;
  const totalContractValue = capexTotal + monthlyOpex * contractTermMonths;

  // Save Quotation Handler
  const handleSaveQuotation = async (status = "DRAFT") => {
    if (!selectedCustomerId) {
      showToast({ message: "Please select a customer.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        quotation_number: quoteNumber,
        customer_id: selectedCustomerId,
        status: status,
        valid_until: validUntil,
        items: calculatedItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.qty,
          unit_price: item.base_price,
          cost_price: item.cost_price,
          discount_percent: item.discount_percent,
        })),
      };

      const res = await quotationsApi.create(payload);
      const createdQuote = res.data?.quotation || res.data;
      const quoteId = createdQuote.id;

      if (status === "PENDING_APPROVAL" && quoteId) {
        showToast({
          title: "Submitted for Governance Approval",
          message: `Quotation #${quoteNumber} routed to ${riskAnalysis.approvalRole} (Level ${riskAnalysis.requiredLevel}).`,
          type: "info",
        });
      } else {
        showToast({
          title: "Quotation Created",
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
      {/* Top Banner with Quote Identification & Governance State */}
      <div
        className="card"
        style={{
          marginBottom: "1.25rem",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
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
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Quotation Reference
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
                color: "var(--color-accent)",
              }}
            >
              {quoteNumber}
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
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
                  {c.name} ({c.CustomerTier?.name || c.tier_name || "Enterprise Tier"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Customer Policy Tier & Ceiling
            </div>
            <div style={{ marginTop: "4px", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span className="badge badge-enterprise">
                {selectedCustomer?.CustomerTier?.name || selectedCustomer?.tier_name || "TIER 1 · ENTERPRISE"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontWeight: 500 }}>
                Max Ceiling: <strong>{selectedCustomer?.CustomerTier?.max_discount_percent || 15}%</strong>
              </span>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
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
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Multi-Warehouse Fulfillment
            </div>
            <div style={{ marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setWarehouseModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
              >
                <Truck size={13} />
                <span>Split Check ({totalSplitShipments} Consignments)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Split Workbench */}
      <div className="cpq-workbench">
        {/* Left Column: Interactive Line Items Configurator & Upsell Panels */}
        <div>
          <div className="data-card">
            <div className="data-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={18} color="var(--color-accent)" />
                <span className="data-card-title">Configured Products & Pricing Matrix</span>
                <span className="badge badge-draft">{calculatedItems.length} Lines</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleAddItem} className="btn btn-secondary btn-sm">
                  <Plus size={14} /> Add Product Line
                </button>
              </div>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "28%" }}>Product & SKU</th>
                    <th style={{ width: "12%" }}>Type</th>
                    <th style={{ width: "12%" }}>Base Price</th>
                    <th style={{ width: "9%" }}>Qty</th>
                    <th style={{ width: "13%" }}>Discount %</th>
                    <th style={{ width: "11%" }}>Margin</th>
                    <th style={{ width: "12%" }}>Net Total</th>
                    <th style={{ width: "3%" }}></th>
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
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--color-text-muted)",
                            marginTop: "2px",
                            display: "flex",
                            gap: "0.5rem",
                          }}
                          className="tnum"
                        >
                          <span>SKU: {item.sku}</span>
                          <span>·</span>
                          <span>{item.category_name}</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            item.product_type === "SUBSCRIPTION" ? "badge-pending" : "badge-draft"
                          }`}
                          style={{ fontSize: "0.6875rem" }}
                        >
                          {item.product_type === "SUBSCRIPTION" ? "Recurring" : "One-Time"}
                        </span>
                      </td>

                      <td>
                        <input
                          type="number"
                          className="input input-sm tnum"
                          value={item.base_price}
                          onChange={(e) => handleItemChange(idx, "base_price", Number(e.target.value))}
                        />
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
                            onChange={(e) =>
                              handleItemChange(idx, "discount_percent", Number(e.target.value))
                            }
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
                        ₹{item.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* B5: Live Upsell & Cross-Sell Suggestions Panel */}
          {activeRecommendations.length > 0 && (
            <div
              className="card"
              style={{
                marginTop: "1rem",
                border: "1px solid var(--border)",
                borderTop: "3px solid var(--orange)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={18} color="var(--orange)" />
                  <span style={{ fontWeight: 600, color: "var(--text-heading)" }}>
                    Intelligent Upsell & Cross-Sell Engine (Spec B5)
                  </span>
                  <span className="badge badge-orange">
                    AI Recommendations
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Real-time margin delta calculated
                </span>
              </div>

              <div
                style={{
                  padding: "1rem 1.25rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {activeRecommendations.map((rec) => {
                  const addCost = Number(rec.product.cost_price) || 0;
                  const addPrice = Number(rec.product.base_price) || 0;
                  const hypotheticalNet = netSubtotal + addPrice;
                  const hypotheticalCost = totalCostOverall + addCost;
                  const hypotheticalMargin =
                    hypotheticalNet > 0
                      ? ((hypotheticalNet - hypotheticalCost) / hypotheticalNet) * 100
                      : 0;
                  const deltaMargin = hypotheticalMargin - blendedMarginPercent;

                  return (
                    <div
                      key={rec.id}
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        boxShadow: "var(--shadow-xs)",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span className="badge badge-confirmed" style={{ fontSize: "0.6875rem" }}>
                            {rec.badge}
                          </span>
                          <button
                            onClick={() => handleDismissRecommendation(rec.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--color-text-muted)",
                              cursor: "pointer",
                            }}
                            title="Dismiss recommendation"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <h4 style={{ fontSize: "0.9375rem", margin: "0.5rem 0 0.25rem 0" }}>
                          {rec.product.name}
                        </h4>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
                          {rec.product.description || "High affinity product frequently attached to this order."}
                        </p>
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.75rem",
                            marginBottom: "0.75rem",
                            padding: "0.5rem",
                            backgroundColor: "var(--bg-secondary)",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <div>
                            <span style={{ color: "var(--color-text-muted)" }}>List Price: </span>
                            <strong className="tnum">₹{addPrice.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span style={{ color: "var(--color-text-muted)" }}>Margin Lift: </span>
                            <strong
                              className="tnum"
                              style={{
                                color: deltaMargin >= 0 ? "var(--color-success)" : "var(--color-warning)",
                              }}
                            >
                              {deltaMargin >= 0 ? `+${deltaMargin.toFixed(1)}%` : `${deltaMargin.toFixed(1)}%`}
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddRecommendation(rec.product)}
                          className="btn btn-primary btn-sm"
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          <Plus size={14} />
                          <span>Attach to Quotation</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B7: Hybrid Billing & Subscription Engine */}
          <div className="data-card" style={{ marginTop: "1rem" }}>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--color-border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CreditCard size={18} color="var(--color-accent)" />
                <span className="data-card-title">Hybrid Billing Schedule & Contract Structure (Spec B7)</span>
              </div>
              <span className="badge badge-enterprise">Capex + Opex Dual Engine</span>
            </div>

            <div style={{ padding: "1.25rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Subscription Frequency
                  </label>
                  <select
                    className="select select-sm"
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                  >
                    <option value="MONTHLY">Monthly Recurring (Net 30)</option>
                    <option value="QUARTERLY">Quarterly Advance</option>
                    <option value="ANNUAL">Annual Advance (5% Prepay Discount)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Contract Commitment Term
                  </label>
                  <select
                    className="select select-sm"
                    value={contractTermMonths}
                    onChange={(e) => setContractTermMonths(Number(e.target.value))}
                  >
                    <option value={12}>12 Months (1 Year Standard)</option>
                    <option value={24}>24 Months (2 Year Lock-in)</option>
                    <option value={36}>36 Months (3 Year Enterprise)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Proration Activation Date
                  </label>
                  <input
                    type="date"
                    className="input input-sm"
                    value={prorationStartDate}
                    onChange={(e) => setProrationStartDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Hybrid Summary Metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "1rem",
                  backgroundColor: "var(--color-paper-0)",
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Upfront Capex / One-Time</div>
                  <div className="tnum" style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                    ₹{capexTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                    {capexItems.length} hardware/setup lines
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Monthly Recurring (MRR)</div>
                  <div className="tnum" style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-accent)" }}>
                    ₹{monthlyOpex.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                    {opexItems.length} recurring lines
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Annual Run Rate (ARR)</div>
                  <div className="tnum" style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-success)" }}>
                    ₹{annualRecurringRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>12-month projected ARR</div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Total Contract Value (TCV)</div>
                  <div className="tnum" style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--orange)" }}>
                    ₹{totalContractValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                    Over {contractTermMonths}-mo term
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Blended Risk Guardrail & Commercial Summary */}
        <div>
          <div className="cpq-guardrail-card">
            {/* Section 10 & 12: Blended Risk Governance Card */}
            <div
              style={{
                borderBottom: "1px solid var(--color-border-subtle)",
                paddingBottom: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <ShieldAlert size={16} color="var(--color-accent)" />
                  <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                    Blended Risk Governance
                  </span>
                </div>
                {riskAnalysis.requiresApproval ? (
                  <span
                    className={`badge ${
                      riskAnalysis.requiredLevel === 2 ? "badge-rejected" : "badge-pending"
                    }`}
                  >
                    Level {riskAnalysis.requiredLevel} Approval
                  </span>
                ) : (
                  <span className="badge badge-approved">
                    <ShieldCheck size={12} /> Auto-Approved
                  </span>
                )}
              </div>

              {/* Risk Score Gauge */}
              <div style={{ marginTop: "0.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.75rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <span>Blended Risk Score</span>
                  <span
                    className="tnum"
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      color:
                        riskAnalysis.blendedRiskScore >= 30
                          ? "var(--color-danger)"
                          : riskAnalysis.blendedRiskScore > 15
                          ? "var(--color-warning)"
                          : "var(--color-success)",
                    }}
                  >
                    {riskAnalysis.blendedRiskScore} / 100
                  </span>
                </div>

                <div className="margin-gauge-bar">
                  <div
                    className="margin-gauge-fill"
                    style={{
                      width: `${Math.min(100, Math.max(5, riskAnalysis.blendedRiskScore))}%`,
                      backgroundColor:
                        riskAnalysis.blendedRiskScore >= 30
                          ? "var(--color-danger)"
                          : riskAnalysis.blendedRiskScore > 15
                          ? "var(--color-warning)"
                          : "var(--color-success)",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.6875rem",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <span>Safe (0-15)</span>
                  <span>L1 Director (16-29)</span>
                  <span>L2 Finance (30+)</span>
                </div>
              </div>

              {/* Governance Explanation Box */}
              <div
                style={{
                  backgroundColor: riskAnalysis.requiresApproval
                    ? "var(--color-warning-bg)"
                    : "var(--color-paper-0)",
                  border: `1px solid ${
                    riskAnalysis.requiresApproval
                      ? "var(--color-warning-border)"
                      : "var(--color-border-subtle)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  marginTop: "0.75rem",
                  fontSize: "0.75rem",
                  color: riskAnalysis.requiresApproval
                    ? "var(--color-warning)"
                    : "var(--color-text-secondary)",
                  display: "flex",
                  gap: "0.5rem",
                }}
              >
                <Info size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Routing Authority:</strong> {riskAnalysis.approvalRole}
                  <div style={{ marginTop: "2px", fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                    {riskAnalysis.explanation}
                  </div>
                </div>
              </div>
            </div>

            {/* Standard Margin Protection Guardrail */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                <span>Blended Margin</span>
                <span
                  className="tnum"
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: isHealthyMargin
                      ? "var(--color-success)"
                      : isWarningMargin
                      ? "var(--color-warning)"
                      : "var(--color-danger)",
                  }}
                >
                  {blendedMarginPercent.toFixed(1)}%
                </span>
              </div>

              <div className="margin-gauge-bar">
                <div
                  className="margin-gauge-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, blendedMarginPercent))}%`,
                    backgroundColor: isHealthyMargin
                      ? "var(--color-success)"
                      : isWarningMargin
                      ? "var(--color-warning)"
                      : "var(--color-danger)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.6875rem",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>Floor (25%)</span>
                <span>Target (35%)</span>
                <span>Optimized (50%)</span>
              </div>
            </div>

            {/* Financial Commercial Totals */}
            <div style={{ marginTop: "1.25rem" }}>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Gross List Value</span>
                <span className="tnum">
                  ₹{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Total Concessions</span>
                <span className="tnum" style={{ color: "var(--color-danger)" }}>
                  -₹{totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Net Subtotal</span>
                <span className="tnum" style={{ fontWeight: 600 }}>
                  ₹{netSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="cpq-summary-row">
                <span style={{ color: "var(--color-text-secondary)" }}>Tax Est. (18%)</span>
                <span className="tnum">
                  ₹{estimatedTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="cpq-summary-row total">
                <span>Grand Total</span>
                <span className="tnum" style={{ color: "var(--color-accent)" }}>
                  ₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
              {riskAnalysis.requiresApproval ? (
                <button
                  type="button"
                  onClick={() => handleSaveQuotation("PENDING_APPROVAL")}
                  disabled={saving || calculatedItems.length === 0}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Send size={15} />
                  <span>Submit for {riskAnalysis.approvalRole}</span>
                </button>
              ) : (
                <button
                  type="button"
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
                type="button"
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

      {/* B6: Multi-Warehouse Stock Split Modal */}
      {warehouseModalOpen && (
        <div className="modal-overlay" onClick={() => setWarehouseModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "700px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Warehouse size={18} color="var(--color-accent)" />
                <h3 style={{ fontSize: "1.125rem", margin: 0 }}>
                  Multi-Warehouse Logistics & Inventory Split (Spec B6)
                </h3>
              </div>
              <button
                onClick={() => setWarehouseModalOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.75rem",
                  backgroundColor: "var(--color-paper-0)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Total Consignments</div>
                  <div className="tnum" style={{ fontWeight: 700, fontSize: "1rem" }}>
                    {totalSplitShipments} Shipments
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Freight Cost Factor</div>
                  <div className="tnum" style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-accent)" }}>
                    ₹{estimatedFreightCost.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Fulfillment Strategy</div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-success)" }}>
                    Smart Stock Balancing
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <h4 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>Product Inventory Allocations:</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {warehouseSplitPlan.map((plan, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-card)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "0.875rem" }}>{plan.item.name}</strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                            Requested: {plan.item.qty} units
                          </span>
                        </div>
                        {plan.isSplit ? (
                          <span className="badge badge-pending">Multi-Depot Split</span>
                        ) : (
                          <span className="badge badge-approved">Single Depot</span>
                        )}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        {plan.distribution.map((dist, dIdx) => (
                          <div
                            key={dIdx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.75rem",
                              padding: "0.375rem 0.5rem",
                              backgroundColor: dist.isBackorder ? "var(--color-danger-bg)" : "var(--bg-secondary)",
                              borderRadius: "var(--radius-sm)",
                              border: dist.isBackorder ? "1px solid var(--color-danger-border)" : "1px solid var(--border-light)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <Truck size={13} color={dist.isBackorder ? "var(--color-danger)" : "var(--text-muted)"} />
                              <span>
                                {dist.warehouse.name} ({dist.warehouse.location || "Regional"})
                              </span>
                            </div>
                            <div className="tnum" style={{ fontWeight: 600 }}>
                              {dist.allocated} Units {dist.isBackorder && "(Backordered)"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setWarehouseModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarehouseModalOpen(false);
                  showToast({
                    title: "Split Strategy Locked",
                    message: `Allocated ${calculatedItems.length} lines across ${totalSplitShipments} depot consignments.`,
                    type: "success",
                  });
                }}
                className="btn btn-primary btn-sm"
              >
                <Check size={14} />
                <span>Accept Suggested Allocation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default PricingStudio;
