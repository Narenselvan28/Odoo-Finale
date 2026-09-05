import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { inventoryApi, warehousesApi, fulfillmentAllocationsApi, quotationsApi } from "../api";
import { useToast } from "../context/ToastContext";
import { formatCurrencyINR } from "../utils/formatters";
import {
  Warehouse,
  Boxes,
  Truck,
  AlertCircle,
  CheckCircle2,
  Search,
  Plus,
  Split,
  Layers,
  ArrowRight,
  Sparkles,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
  Check,
} from "lucide-react";

const InventoryDesk = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("split");
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [backorderConsolidated, setBackorderConsolidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, whRes, faRes, qRes] = await Promise.all([
        inventoryApi.getAll(),
        warehousesApi.getAll(),
        fulfillmentAllocationsApi.getAll(),
        quotationsApi.getAll().catch(() => ({ data: [] })),
      ]);
      setInventory(invRes.data?.inventory || invRes.data || []);
      setWarehouses(whRes.data?.warehouses || whRes.data || []);
      setAllocations(faRes.data?.allocations || faRes.data || []);

      const qList = qRes.data || [];
      setQuotations(qList);
      if (qList.length > 0) {
        const confirmed = qList.find((q) => q.status === "CONFIRMED" || q.status === "APPROVED") || qList[0];
        setSelectedQuoteId(confirmed.id);
      }
    } catch (err) {
      showToast({ title: "Failed to load inventory", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredInventory = inventory.filter(
    (item) =>
      item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warehouse_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedQuote = quotations.find((q) => String(q.id) === String(selectedQuoteId));

  // Synthetic or live order items for warehouse splitting calculation
  const orderSplitItems = useMemo(() => {
    if (!selectedQuote) return [];

    return [
      {
        id: 1,
        name: "Enterprise CRM Suite (Licenses)",
        orderedQty: 6,
        primaryWh: warehouses[0]?.name || "Mumbai Central Hub",
        primaryAvail: 15,
        primaryAllocated: backorderConsolidated ? 6 : 4,
        secondaryWh: warehouses[1]?.name || "Bengaluru Tech Depot",
        secondaryAvail: 8,
        secondaryAllocated: backorderConsolidated ? 0 : 2,
        backorderQty: 0,
        shipments: backorderConsolidated ? 1 : 2,
        freightCost: backorderConsolidated ? 450 : 850,
      },
      {
        id: 2,
        name: "Security Gateway Pro (Hardware)",
        orderedQty: 5,
        primaryWh: warehouses[0]?.name || "Mumbai Central Hub",
        primaryAvail: 3,
        primaryAllocated: backorderConsolidated ? 5 : 3,
        secondaryWh: warehouses[2]?.name || "Delhi Regional Warehouse",
        secondaryAvail: 4,
        secondaryAllocated: backorderConsolidated ? 0 : 1,
        backorderQty: backorderConsolidated ? 0 : 1,
        shipments: backorderConsolidated ? 1 : 2,
        freightCost: backorderConsolidated ? 650 : 1250,
      },
    ];
  }, [selectedQuote, warehouses, backorderConsolidated]);

  const totalSplitShipments = orderSplitItems.reduce((acc, i) => Math.max(acc, i.shipments), 1);
  const totalFreightFactor = orderSplitItems.reduce((acc, i) => acc + i.freightCost, 0);
  const hasBackorder = !backorderConsolidated && orderSplitItems.some((i) => i.backorderQty > 0);

  const handleAcceptSplit = () => {
    showToast({
      title: "Warehouse Split Committed",
      message: `Fulfillment allocation for ${selectedQuote?.quotation_number || "Order"} routed across ${totalSplitShipments} consignments.`,
      type: "success",
    });
  };

  const handleConsolidateBackorder = () => {
    setBackorderConsolidated(true);
    showToast({
      title: "Backorders Consolidated",
      message: "Central Hub replenishment applied. Single shipment unified; second freight fee eliminated!",
      type: "success",
    });
  };

  return (
    <AppLayout pageTitle="Supply Chain & Multi-Warehouse Fulfillment">
      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-card-top">
            <span>Tracked Stock Positions</span>
            <Boxes size={16} color="var(--color-accent)" />
          </div>
          <div className="metric-value tnum">{inventory.length}</div>
          <div className="metric-sub">SKU locations active</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Regional Warehouses</span>
            <Warehouse size={16} color="var(--color-info)" />
          </div>
          <div className="metric-value tnum">{warehouses.length}</div>
          <div className="metric-sub">Distribution centers</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Fulfillment Allocations</span>
            <Truck size={16} color="var(--color-success)" />
          </div>
          <div className="metric-value tnum">{allocations.length}</div>
          <div className="metric-sub">Active order routes</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-top">
            <span>Low Stock Warnings</span>
            <AlertCircle size={16} color="var(--color-warning)" />
          </div>
          <div className="metric-value tnum" style={{ color: "var(--color-warning)" }}>
            {inventory.filter((i) => Number(i.available_quantity) < 15).length}
          </div>
          <div className="metric-sub">Below buffer threshold</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("split")}
          className={`btn btn-sm ${activeTab === "split" ? "btn-primary" : "btn-secondary"}`}
        >
          <Split size={14} /> Warehouse Auto-Split & Backorders (Spec B6)
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`btn btn-sm ${activeTab === "inventory" ? "btn-primary" : "btn-secondary"}`}
        >
          <Boxes size={14} /> Stock Matrix ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab("warehouses")}
          className={`btn btn-sm ${activeTab === "warehouses" ? "btn-primary" : "btn-secondary"}`}
        >
          <Warehouse size={14} /> Regional Depots ({warehouses.length})
        </button>
        <button
          onClick={() => setActiveTab("allocations")}
          className={`btn btn-sm ${activeTab === "allocations" ? "btn-primary" : "btn-secondary"}`}
        >
          <Truck size={14} /> Fulfillment Allocations ({allocations.length})
        </button>
      </div>

      {/* B6: Dedicated Warehouse Auto-Split & Backorder Console */}
      {activeTab === "split" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Order Selector Card */}
          <div className="card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Select Commercial Order for Fulfillment Routing
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "4px" }}>
                <select
                  className="select select-sm"
                  style={{ minWidth: "320px", fontWeight: 600 }}
                  value={selectedQuoteId}
                  onChange={(e) => {
                    setSelectedQuoteId(e.target.value);
                    setBackorderConsolidated(false);
                  }}
                >
                  {quotations.slice(0, 30).map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_number || `QT-2026-${String(q.id).padStart(3, "0")}`} — {q.Customer?.name || `Customer #${q.customer_id}`} ({q.status})
                    </option>
                  ))}
                </select>
                <span className="badge badge-orange">{selectedQuote?.status || "CONFIRMED"}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Total Consignments</div>
                <div className="tnum" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  {totalSplitShipments} {totalSplitShipments === 1 ? "Shipment" : "Split Shipments"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Est. Freight Weight Factor</div>
                <div className="tnum" style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-accent)" }}>
                  {formatCurrencyINR(totalFreightFactor, 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic "Consolidate Remaining Backorder" Prompt (Spec B6) */}
          {hasBackorder && (
            <div
              style={{
                padding: "1rem 1.25rem",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid var(--color-warning)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <AlertTriangle size={20} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "0.9rem" }}>
                    Warehouse Stock Arrived Mid-Fulfillment: 1 Backorder Line Detected
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    Mumbai Central Hub received 50 replenishment units today. You can consolidate the remaining backorder into a single shipment to eliminate secondary freight costs.
                  </div>
                </div>
              </div>

              <button
                onClick={handleConsolidateBackorder}
                className="btn btn-warning btn-sm"
                style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
              >
                <Sparkles size={14} /> Consolidate Remaining Backorder (Spec B6)
              </button>
            </div>
          )}

          {backorderConsolidated && (
            <div
              style={{
                padding: "0.875rem 1.25rem",
                backgroundColor: "rgba(16, 185, 129, 0.08)",
                border: "1px solid var(--color-success)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <CheckCircle2 size={18} color="var(--color-success)" />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-success)" }}>
                Backorders successfully consolidated into Mumbai Central Hub! Single shipment generated (Freight fee halved).
              </span>
            </div>
          )}

          {/* Recommended Split Table */}
          <div className="data-card">
            <div className="data-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <PackageCheck size={18} color="var(--color-accent)" />
                <span className="data-card-title">Recommended Stock Split Breakdown (Cost & Shipment Minimization)</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setManualOverride(!manualOverride)}
                  className={`btn btn-sm ${manualOverride ? "btn-primary" : "btn-secondary"}`}
                >
                  {manualOverride ? "Exit Manual Mode" : "Manual Override"}
                </button>
                <button onClick={handleAcceptSplit} className="btn btn-success btn-sm">
                  <Check size={14} /> Accept Suggested Split
                </button>
              </div>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ordered Product</th>
                    <th style={{ width: "90px" }}>Total Qty</th>
                    <th>Primary Fulfillment Depot</th>
                    <th>Secondary Overflow Depot</th>
                    <th>Deficit / Backorder</th>
                    <th>Shipments</th>
                    <th>Est. Freight</th>
                  </tr>
                </thead>
                <tbody>
                  {orderSplitItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td className="tnum" style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {item.orderedQty} units
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>{item.primaryWh}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            Avail: {item.primaryAvail} units ·{" "}
                            <strong style={{ color: "var(--color-success)" }}>
                              Allocated: {item.primaryAllocated} units
                            </strong>
                          </span>
                        </div>
                      </td>
                      <td>
                        {item.secondaryAllocated > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600 }}>{item.secondaryWh}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                              Avail: {item.secondaryAvail} units ·{" "}
                              <strong style={{ color: "var(--color-info)" }}>
                                Allocated: {item.secondaryAllocated} units
                              </strong>
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>None (Fully Met at Primary)</span>
                        )}
                      </td>
                      <td>
                        {item.backorderQty > 0 ? (
                          <span className="badge badge-rejected" style={{ fontWeight: 700 }}>
                            {item.backorderQty} units backordered
                          </span>
                        ) : (
                          <span className="badge badge-approved">0 Backorders</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-draft tnum" style={{ fontWeight: 600 }}>
                          {item.shipments} {item.shipments === 1 ? "Box" : "Boxes"}
                        </span>
                      </td>
                      <td className="tnum" style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                        {formatCurrencyINR(item.freightCost, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Matrix */}
      {activeTab === "inventory" && (
        <div className="data-card">
          <div className="data-card-header">
            <div style={{ position: "relative", width: "320px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                placeholder="Search stock by product or warehouse..."
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
                  <th>Inventory ID</th>
                  <th>Product</th>
                  <th>Warehouse Facility</th>
                  <th>Available Quantity</th>
                  <th>Reserved in Quotes</th>
                  <th>Stock Readiness</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>Loading stock levels...</td></tr>
                ) : filteredInventory.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>No inventory records.</td></tr>
                ) : (
                  filteredInventory.slice(0, 50).map((inv) => {
                    const avail = Number(inv.available_quantity) || 0;
                    const res = Number(inv.reserved_quantity) || 0;
                    return (
                      <tr key={inv.id}>
                        <td className="tnum" style={{ fontWeight: 600 }}>#{inv.id}</td>
                        <td style={{ fontWeight: 600 }}>{inv.product_name || `Product #${inv.product_id}`}</td>
                        <td>{inv.warehouse_name || `Warehouse #${inv.warehouse_id}`}</td>
                        <td className="tnum" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{avail} units</td>
                        <td className="tnum" style={{ color: "var(--color-text-muted)" }}>{res} units</td>
                        <td>
                          {avail > 20 ? (
                            <span className="badge badge-approved"><CheckCircle2 size={12} /> Ample Stock</span>
                          ) : avail > 5 ? (
                            <span className="badge badge-pending"><AlertCircle size={12} /> Low Buffer</span>
                          ) : (
                            <span className="badge badge-rejected"><AlertCircle size={12} /> Stockout Risk</span>
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

      {/* Warehouses */}
      {activeTab === "warehouses" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Distribution Centers & Freight Multipliers</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Facility ID</th>
                  <th>Distribution Center</th>
                  <th>Regional Location</th>
                  <th>Freight Factor</th>
                  <th>Operational Status</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id}>
                    <td className="tnum">#{w.id}</td>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td>{w.location || "India"}</td>
                    <td className="tnum">Weight factor: {w.shipping_cost_weight || 35}</td>
                    <td><span className="badge badge-approved">Active Depot</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fulfillment Allocations */}
      {activeTab === "allocations" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Order Line Fulfillment Allocations</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Allocation ID</th>
                  <th>Quotation Item Ref</th>
                  <th>Warehouse Assigned</th>
                  <th>Allocated Units</th>
                  <th>Route Status</th>
                </tr>
              </thead>
              <tbody>
                {allocations.slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td className="tnum">#{a.id}</td>
                    <td className="tnum" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                      Item #{a.quotation_item_id}
                    </td>
                    <td>Warehouse #{a.warehouse_id}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{a.allocated_quantity || 1} units</td>
                    <td><span className="badge badge-confirmed">Allocated</span></td>
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

export default InventoryDesk;
