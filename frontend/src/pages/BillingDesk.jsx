import React, { useState, useEffect } from "react";
import AppLayout from "../components/layout/AppLayout";
import { invoicesApi, subscriptionsApi, subscriptionPlansApi, billingSchedulesApi } from "../api";
import { useToast } from "../context/ToastContext";
import {
  Receipt,
  Repeat,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  IndianRupee
} from "lucide-react";

const BillingDesk = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("invoices");
  const [invoices, setInvoices] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, subRes, planRes, schRes] = await Promise.all([
        invoicesApi.getAll(),
        subscriptionsApi.getAll(),
        subscriptionPlansApi.getAll(),
        billingSchedulesApi.getAll(),
      ]);
      setInvoices(invRes.data?.invoices || invRes.data || []);
      setSubscriptions(subRes.data?.subscriptions || subRes.data || []);
      setPlans(planRes.data?.plans || planRes.data || []);
      setSchedules(schRes.data?.schedules || schRes.data || []);
    } catch (err) {
      showToast({ title: "Failed to load billing data", message: err.message, type: "error" });
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
            ₹{totalInvoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "0.75rem" }}>
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
                      ₹{Number(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <span className="data-card-title">Active Recurring Customer Contracts</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract ID</th>
                  <th>Customer Account</th>
                  <th>Plan Tier</th>
                  <th>Start Date</th>
                  <th>Billing Cadence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.slice(0, 50).map((sub) => (
                  <tr key={sub.id}>
                    <td className="tnum" style={{ fontWeight: 600 }}>#{sub.id}</td>
                    <td style={{ fontWeight: 600 }}>{sub.customer_name || `Customer #${sub.customer_id}`}</td>
                    <td>
                      <span className="badge badge-enterprise">{sub.plan_name || "Enterprise Pro Plan"}</span>
                    </td>
                    <td className="tnum" style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>
                      {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : "2026-01-15"}
                    </td>
                    <td style={{ textTransform: "capitalize" }}>Monthly Recurring</td>
                    <td><span className="badge badge-approved">Active</span></td>
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
            <span className="data-card-title">Commercial Subscription Plans</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan ID</th>
                  <th>Plan Name</th>
                  <th>Billing Frequency</th>
                  <th>Base Recurring Price</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="tnum">#{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ textTransform: "uppercase" }} className="badge badge-draft">{p.billing_frequency || "MONTHLY"}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>₹{Number(p.price || 0).toFixed(2)}</td>
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
            <span className="data-card-title">Automated Billing Schedules</span>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Schedule ID</th>
                  <th>Subscription Reference</th>
                  <th>Charge Date</th>
                  <th>Scheduled Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.slice(0, 50).map((s) => (
                  <tr key={s.id}>
                    <td className="tnum">#{s.id}</td>
                    <td className="tnum" style={{ color: "var(--color-accent)" }}>Subscription #{s.subscription_id}</td>
                    <td className="tnum">{s.billing_date ? new Date(s.billing_date).toLocaleDateString() : "2026-10-01"}</td>
                    <td className="tnum" style={{ fontWeight: 600 }}>₹{Number(s.amount || 0).toFixed(2)}</td>
                    <td><span className="badge badge-pending">Scheduled</span></td>
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
