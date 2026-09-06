import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { customersApi, customerTiersApi } from "../api";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import {
  Users,
  Shield,
  Search,
  Plus,
  Mail,
  Phone,
  Building,
  Award,
  Trash2
} from "lucide-react";

const CustomersDesk = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState("customers");
  const [customers, setCustomers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    tier_id: "",
    industry: "Enterprise SaaS",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, tRes] = await Promise.all([
        customersApi.getAll(),
        customerTiersApi.getAll(),
      ]);
      const cList = cRes.data?.customers || cRes.data || [];
      const tList = tRes.data?.tiers || tRes.data || [];
      setCustomers(cList);
      setTiers(tList);

      if (tList.length > 0) {
        setNewCustomer((prev) => ({ ...prev, tier_id: tList[0].id }));
      }
    } catch (err) {
      showToast({ title: "Failed to load customers", message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      await customersApi.create(newCustomer);
      showToast({ title: "Customer Added", message: `${newCustomer.name} created.`, type: "success" });
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast({ title: "Failed to create", message: err.response?.data?.message || err.message, type: "error" });
    }
  };

  const handleDeleteCustomer = async (c) => {
    const isConfirmed = await confirm({
      title: "Delete Customer Account",
      message: `Are you sure you want to permanently delete ${c.name}?`,
      details: [
        `Account ID: #${c.id}`,
        `Email: ${c.email || "N/A"}`,
        "All historical customer association links will be detached.",
      ],
      confirmText: "Delete Customer",
      type: "danger",
    });

    if (!isConfirmed) return;

    try {
      await customersApi.remove(c.id);
      showToast({ title: "Customer Deleted", message: `${c.name} removed.`, type: "success" });
      setCustomers((prev) => prev.filter((item) => item.id !== c.id));
    } catch (err) {
      showToast({ title: "Delete Error", message: err.response?.data?.message || err.message, type: "error" });
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout pageTitle="Accounts & Customer Tier Policies">
      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("customers")}
          className={`btn btn-sm ${activeTab === "customers" ? "btn-primary" : "btn-secondary"}`}
        >
          <Users size={14} /> Customer Accounts ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab("tiers")}
          className={`btn btn-sm ${activeTab === "tiers" ? "btn-primary" : "btn-secondary"}`}
        >
          <Award size={14} /> Tier Concession Policies ({tiers.length})
        </button>
      </div>

      {activeTab === "customers" && (
        <div className="data-card">
          <div className="data-card-header">
            <div style={{ position: "relative", width: "320px" }}>
              <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                placeholder="Search customers by name, email, sector..."
                className="input input-sm"
                style={{ paddingLeft: "32px" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> New Customer Account
            </button>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Contact Email</th>
                  <th>Telephone</th>
                  <th>Policy Tier</th>
                  <th>Industry Vertical</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>Loading accounts...</td></tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>No customer accounts found.</td></tr>
                ) : (
                  filteredCustomers.slice(0, 50).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }} className="tnum">ID: #{c.id}</div>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>{c.email || "—"}</td>
                      <td className="tnum" style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>{c.phone || "—"}</td>
                      <td>
                        <span className="badge badge-enterprise">
                          {c.tier_name || "Tier 1 Enterprise"}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-draft">{c.industry || "Technology"}</span>
                      </td>
                      <td className="tnum" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "2026-09-01"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleDeleteCustomer(c)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--color-danger)", padding: "4px" }}
                          title="Delete customer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "tiers" && (
        <div className="data-card">
          <div className="data-card-header">
            <span className="data-card-title">Commercial Customer Tiers & Maximum Discount Allowances</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tier ID</th>
                  <th>Classification Name</th>
                  <th>Max Autonomic Discount</th>
                  <th>Governance Level Required Above Cap</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.id}>
                    <td className="tnum" style={{ fontWeight: 600 }}>#{t.id}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--color-accent)" }}>{t.name}</span>
                    </td>
                    <td>
                      <span className="badge badge-approved tnum">
                        {t.max_discount}% Max Concession
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Discounts exceeding {t.max_discount}% automatically route to Sales Director queue.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Customer Account</h3>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Organization Name *</label>
                  <input
                    type="text"
                    required
                    className="input input-sm"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Email *</label>
                    <input
                      type="email"
                      required
                      className="input input-sm"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Phone</label>
                    <input
                      type="text"
                      className="input input-sm"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Policy Tier</label>
                    <select
                      className="select select-sm"
                      value={newCustomer.tier_id}
                      onChange={(e) => setNewCustomer({ ...newCustomer, tier_id: e.target.value })}
                    >
                      {tiers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} (Max {t.max_discount}%)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>Industry</label>
                    <input
                      type="text"
                      className="input input-sm"
                      value={newCustomer.industry}
                      onChange={(e) => setNewCustomer({ ...newCustomer, industry: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default CustomersDesk;
