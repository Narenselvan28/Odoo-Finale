import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { inventoryApi, warehousesApi, fulfillmentAllocationsApi } from "../api";
import { useToast } from "../context/ToastContext";
import {
  Warehouse,
  Boxes,
  Truck,
  AlertCircle,
  CheckCircle2,
  Search,
  Plus
} from "lucide-react";

const InventoryDesk = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("inventory");
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, whRes, faRes] = await Promise.all([
        inventoryApi.getAll(),
        warehousesApi.getAll(),
        fulfillmentAllocationsApi.getAll(),
      ]);
      setInventory(invRes.data?.inventory || invRes.data || []);
      setWarehouses(whRes.data?.warehouses || whRes.data || []);
      setAllocations(faRes.data?.allocations || faRes.data || []);
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
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.75rem" }}>
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
          <Warehouse size={14} /> Warehouses ({warehouses.length})
        </button>
        <button
          onClick={() => setActiveTab("allocations")}
          className={`btn btn-sm ${activeTab === "allocations" ? "btn-primary" : "btn-secondary"}`}
        >
          <Truck size={14} /> Fulfillment Allocations ({allocations.length})
        </button>
      </div>

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
                    <td className="tnum" style={{ fontWeight: 600 }}>#{w.id}</td>
                    <td style={{ fontWeight: 600 }}>{w.name}</td>
                    <td style={{ color: "var(--color-text-secondary)" }}>{w.location || "North American Hub"}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{w.shipping_cost_weight || 1.0}x factor</td>
                    <td><span className="badge badge-approved">Active Hub</span></td>
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
