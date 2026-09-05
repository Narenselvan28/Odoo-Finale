import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { productsApi, categoriesApi, priceListsApi, discountRulesApi } from "../api";
import { useToast } from "../context/ToastContext";
import {
  Boxes,
  Layers,
  Percent,
  Plus,
  Search,
  Sliders,
  IndianRupee,
  Tag,
  Trash2,
  Edit2
} from "lucide-react";

const CatalogManagement = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [discountRules, setDiscountRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category_id: "",
    base_price: 100,
    cost_price: 50,
    tax_percent: 18,
    product_type: "ONE_TIME",
    is_active: 1,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, plRes, drRes] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
        priceListsApi.getAll(),
        discountRulesApi.getAll(),
      ]);
      const pList = prodRes.data?.products || prodRes.data || [];
      const cList = catRes.data?.categories || catRes.data || [];
      setProducts(pList);
      setCategories(cList);
      setPriceLists(plRes.data?.priceLists || plRes.data || []);
      setDiscountRules(drRes.data?.rules || drRes.data || []);

      if (cList.length > 0) {
        setNewProduct((prev) => ({ ...prev, category_id: cList[0].id }));
      }
    } catch (err) {
      showToast({ title: "Failed to load catalog", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) {
      showToast({ message: "Product Name and SKU are required", type: "error" });
      return;
    }
    try {
      await productsApi.create(newProduct);
      showToast({ title: "Product Created", message: `${newProduct.name} cataloged.`, type: "success" });
      setShowProductModal(false);
      fetchData();
    } catch (err) {
      showToast({ title: "Creation error", message: err.response?.data?.message || err.message, type: "error" });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout pageTitle="Catalog & Pricing Engine">
      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("products")}
          className={`btn btn-sm ${activeTab === "products" ? "btn-primary" : "btn-secondary"}`}
        >
          <Boxes size={14} /> Products Master ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`btn btn-sm ${activeTab === "categories" ? "btn-primary" : "btn-secondary"}`}
        >
          <Tag size={14} /> Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("price-lists")}
          className={`btn btn-sm ${activeTab === "price-lists" ? "btn-primary" : "btn-secondary"}`}
        >
          <IndianRupee size={14} /> Price Lists ({priceLists.length})
        </button>
        <button
          onClick={() => setActiveTab("discount-rules")}
          className={`btn btn-sm ${activeTab === "discount-rules" ? "btn-primary" : "btn-secondary"}`}
        >
          <Percent size={14} /> Discount Policies ({discountRules.length})
        </button>
      </div>

      {/* Tab: Products */}
      {activeTab === "products" && (
        <div className="data-card">
          <div className="data-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
              <div style={{ position: "relative", width: "300px" }}>
                <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search products by SKU or name..."
                  className="input input-sm"
                  style={{ paddingLeft: "32px" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <button onClick={() => setShowProductModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> Add Product
            </button>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product & SKU</th>
                  <th>Category</th>
                  <th>Base Price</th>
                  <th>Cost Basis</th>
                  <th>Margin Target</th>
                  <th>Tax</th>
                  <th>Contract Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>Loading catalog...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>No products found.</td></tr>
                ) : (
                  filteredProducts.map((p) => {
                    const base = Number(p.base_price) || 0;
                    const cost = Number(p.cost_price) || 0;
                    const margin = base > 0 ? ((base - cost) / base) * 100 : 0;
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <span className="badge badge-draft tnum">SKU: {p.sku || "N/A"}</span>
                        </td>
                        <td>{p.category_name || "Enterprise Hardware"}</td>
                        <td className="tnum" style={{ fontWeight: 600 }}>₹{base.toFixed(2)}</td>
                        <td className="tnum" style={{ color: "var(--color-text-muted)" }}>₹{cost.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${margin >= 35 ? "badge-approved" : "badge-pending"}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="tnum">{p.tax_percent || 18}%</td>
                        <td>
                          <span className="badge badge-draft">{p.product_type || "ONE_TIME"}</span>
                        </td>
                        <td>
                          <span className={`badge ${p.is_active ? "badge-approved" : "badge-inactive"}`}>
                            {p.is_active ? "Active" : "Archived"}
                          </span>
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

      {/* Tab: Categories */}
      {activeTab === "categories" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Category Margins & Concession Caps</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category ID</th>
                  <th>Category Title</th>
                  <th>Max Allowed Discount</th>
                  <th>Governance Protection</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="tnum" style={{ fontWeight: 600 }}>#{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>
                      <span className="badge badge-enterprise tnum">
                        {c.max_discount ? `${c.max_discount}%` : "15% Hard Cap"}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                      Enforced by CPQ automated rules engine.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Discount Rules */}
      {activeTab === "discount-rules" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Tiered Discount & Risk Matrix</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Customer Tier</th>
                  <th>Category</th>
                  <th>Max Discount</th>
                  <th>Risk Rating</th>
                </tr>
              </thead>
              <tbody>
                {discountRules.map((r) => (
                  <tr key={r.id}>
                    <td className="tnum">#{r.id}</td>
                    <td style={{ fontWeight: 500 }}>{r.tier_name || `Tier #${r.customer_tier_id || 1}`}</td>
                    <td>{r.category_name || `Category #${r.category_id || 1}`}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>{r.max_discount || 15}%</td>
                    <td>
                      <span
                        className={`badge ${
                          r.risk_level === "HIGH"
                            ? "badge-risk-high"
                            : r.risk_level === "MEDIUM"
                            ? "badge-risk-med"
                            : "badge-risk-low"
                        }`}
                      >
                        {r.risk_level || "LOW"} RISK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Price Lists */}
      {activeTab === "price-lists" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Commercial Price Lists</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Price List ID</th>
                  <th>List Name</th>
                  <th>Currency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {priceLists.map((pl) => (
                  <tr key={pl.id}>
                    <td className="tnum">#{pl.id}</td>
                    <td style={{ fontWeight: 600 }}>{pl.name}</td>
                    <td className="tnum">{pl.currency || "INR"}</td>
                    <td><span className="badge badge-approved">Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Creation Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Catalog Product</h3>
              <button onClick={() => setShowProductModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Product Name *</label>
                  <input
                    type="text"
                    required
                    className="input input-sm"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>SKU Code *</label>
                    <input
                      type="text"
                      required
                      className="input input-sm"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Category</label>
                    <select
                      className="select select-sm"
                      value={newProduct.category_id}
                      onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Base Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-sm tnum"
                      value={newProduct.base_price}
                      onChange={(e) => setNewProduct({ ...newProduct, base_price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Cost Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-sm tnum"
                      value={newProduct.cost_price}
                      onChange={(e) => setNewProduct({ ...newProduct, cost_price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Tax %</label>
                    <input
                      type="number"
                      className="input input-sm tnum"
                      value={newProduct.tax_percent}
                      onChange={(e) => setNewProduct({ ...newProduct, tax_percent: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default CatalogManagement;
