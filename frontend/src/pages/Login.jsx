import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck,
  CheckSquare,
  Calculator,
  Receipt,
  Warehouse,
  Globe,
  Sparkles,
  Zap,
  KeyRound,
} from "lucide-react";

const DEMO_PERSONAS = [
  {
    role: "admin",
    label: "Executive Admin",
    name: "System Administrator",
    email: "admin@dealflow360.com",
    password: "password123",
    badge: "Full Control",
    badgeColor: "#ea580c",
    badgeBg: "#fff7ed",
    badgeBorder: "#fdba74",
    icon: ShieldCheck,
    desc: "Complete CPQ, users administration, governance & settings",
  },
  {
    role: "sales_manager",
    label: "Sales Director",
    name: "Marcus Vance",
    email: "sales.manager@dealflow360.com",
    password: "password123",
    badge: "Governance",
    badgeColor: "#7c3aed",
    badgeBg: "#f5f3ff",
    badgeBorder: "#c4b5fd",
    icon: CheckSquare,
    desc: "Multi-level approvals gate, risk reviews & deal health",
  },
  {
    role: "sales_rep",
    label: "Account Executive",
    name: "Sarah Lin",
    email: "sales.rep@dealflow360.com",
    password: "password123",
    badge: "Commercial",
    badgeColor: "#0284c7",
    badgeBg: "#f0f9ff",
    badgeBorder: "#7dd3fc",
    icon: Calculator,
    desc: "CPQ pricing studio, quotation crafting & customer desks",
  },
  {
    role: "finance_manager",
    label: "Finance Controller",
    name: "David Sterling",
    email: "finance@dealflow360.com",
    password: "password123",
    badge: "Dual Billing",
    badgeColor: "#059669",
    badgeBg: "#ecfdf5",
    badgeBorder: "#6ee7b7",
    icon: Receipt,
    desc: "Capex/Opex dual invoices & subscription prorations",
  },
  {
    role: "warehouse_manager",
    label: "Supply Chain Lead",
    name: "Elena Rostova",
    email: "warehouse@dealflow360.com",
    password: "password123",
    badge: "Logistics",
    badgeColor: "#d97706",
    badgeBg: "#fffbeb",
    badgeBorder: "#fcd34d",
    icon: Warehouse,
    desc: "Multi-depot line item fulfillment & stock allocation",
  },
];

const Login = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Clean form state
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePersona, setActivePersona] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("dealflow_theme");
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const executeAuth = async (credentials) => {
    setError("");
    setLoading(true);

    try {
      const data = await login(credentials);
      showToast({
        title: "Welcome Back",
        message: `Authenticated as ${data.user?.name || "User"}.`,
        type: "success",
      });

      if (data.user?.role === "customer") {
        navigate(data.user.customer_id ? `/portal/${data.user.customer_id}` : "/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid email or password. Please try again.";
      setError(msg);
      showToast({
        title: "Sign In Failed",
        message: msg,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      const msg = "Please enter both email and password.";
      setError(msg);
      showToast({
        title: "Missing Credentials",
        message: msg,
        type: "warning",
      });
      return;
    }
    await executeAuth(form);
  };

  const handleQuickLogin = async (persona) => {
    setActivePersona(persona.email);
    setForm({ email: persona.email, password: persona.password });
    await executeAuth({ email: persona.email, password: persona.password });
  };

  const handleFillOnly = (persona) => {
    setActivePersona(persona.email);
    setForm({ email: persona.email, password: persona.password });
    showToast({
      title: "Credentials Filled",
      message: `Selected ${persona.label} (${persona.email}). Click Sign In to proceed.`,
      type: "info",
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "var(--bg, #f8fafc)",
        padding: "2rem 1rem",
        transition: "background 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "stretch",
          justifyContent: "center",
          gap: "1.5rem",
          maxWidth: "920px",
          width: "100%",
        }}
      >
        {/* Left Column: Sign In Card */}
        <div
          className="card"
          style={{
            flex: "1 1 420px",
            maxWidth: "460px",
            padding: "2.25rem",
            borderTop: "3px solid var(--orange, #ea580c)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            borderRadius: "14px",
            backgroundColor: "#ffffff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            {/* Institutional Branding */}
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div className="logo" style={{ fontSize: "24px", justifyContent: "center" }}>
                ✦ <span>DealFlow</span> 360
              </div>
              <div className="logo-sub" style={{ marginTop: "4px" }}>
                Self-Governing Sales Operations & Intelligent CPQ Platform
              </div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "1rem", color: "var(--text-heading, #0f172a)" }}>
                Enterprise Sign In
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)" }}>
                Authenticate to access your organization's sales command center
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  color: "#991b1b",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  marginBottom: "1.25rem",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                  Email Address <span className="req">*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    className="form-input"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="operator@dealflow360.com or client@company.com"
                    style={{ paddingLeft: "36px" }}
                  />
                  <Mail
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem", marginBottom: 0 }}>
                    Password <span className="req">*</span>
                  </label>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                    className="form-input"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter account password"
                    style={{ paddingLeft: "36px" }}
                  />
                  <Lock
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
                style={{
                  width: "100%",
                  padding: "11px",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "0.25rem",
                }}
              >
                {loading ? "Authenticating Session..." : "Sign In to Platform →"}
              </button>
            </form>
          </div>

          {/* User Registration Options */}
          <div
            style={{
              marginTop: "1.75rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-light, #e2e8f0)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)" }}>
              New client or customer?{" "}
              <Link
                to="/register?type=customer"
                style={{ color: "var(--orange, #ea580c)", fontWeight: 700, textDecoration: "none" }}
              >
                Register Customer Account →
              </Link>
            </div>

            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)" }}>
              Internal sales or team member?{" "}
              <Link
                to="/register?type=operator"
                style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}
              >
                Register Operator Account
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Demo Persona Navigator */}
        <div
          className="card"
          style={{
            flex: "1 1 380px",
            maxWidth: "420px",
            padding: "1.75rem",
            borderRadius: "14px",
            backgroundColor: "#ffffff",
            borderTop: "3px solid #6366f1",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "8px",
                  backgroundColor: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6366f1",
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--text-heading, #0f172a)" }}>
                  Demo User Navigator
                </h3>
                <span style={{ fontSize: "0.725rem", color: "var(--text-secondary, #64748b)" }}>
                  1-Click Instant Persona Switcher
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              5 Roles
            </span>
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary, #64748b)", margin: "0 0 1rem 0" }}>
            Select any enterprise persona below to preview full RBAC workflows. Default password: <code style={{ backgroundColor: "#f1f5f9", padding: "1px 4px", borderRadius: "3px", color: "#0f172a", fontWeight: 600 }}>password123</code>
          </p>

          {/* Persona List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1 }}>
            {DEMO_PERSONAS.map((p) => {
              const IconComponent = p.icon;
              const isSelected = activePersona === p.email;
              return (
                <div
                  key={p.role}
                  style={{
                    border: isSelected ? `1.5px solid ${p.badgeColor}` : "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "0.65rem 0.75rem",
                    backgroundColor: isSelected ? p.badgeBg : "#ffffff",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "6px",
                          backgroundColor: p.badgeBg,
                          color: p.badgeColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconComponent size={14} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#0f172a", lineHeight: 1.2 }}>
                          {p.label}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                          {p.name}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        backgroundColor: p.badgeBg,
                        color: p.badgeColor,
                        border: `1px solid ${p.badgeBorder}`,
                        padding: "1px 6px",
                        borderRadius: "999px",
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.7rem", color: "#64748b", margin: "2px 0 4px 0" }}>
                    {p.desc}
                  </div>

                  <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                    <button
                      type="button"
                      onClick={() => handleQuickLogin(p)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: "5px 8px",
                        fontSize: "0.725rem",
                        fontWeight: 700,
                        backgroundColor: p.badgeColor,
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: loading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                      title={`Sign in immediately as ${p.label}`}
                    >
                      <Zap size={11} /> Quick Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillOnly(p)}
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.725rem",
                        fontWeight: 600,
                        backgroundColor: "#f8fafc",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                      title="Pre-fill form inputs only"
                    >
                      Fill
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Customer Live Portal Shortcut */}
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <Link
              to="/portal/1"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                backgroundColor: "#fff7ed",
                border: "1px solid #ffedd5",
                textDecoration: "none",
                color: "#c2410c",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Globe size={14} color="#ea580c" />
                <span>Customer Negotiation Portal</span>
              </div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>Open Demo →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
