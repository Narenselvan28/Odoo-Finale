import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  ExternalLink,
  CheckCircle2
} from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [form, setForm] = useState({ email: "admin@dealflow360.com", password: "password123" });
  const [signupForm, setSignupForm] = useState({
    company: "Tata Enterprises Ltd",
    fullName: "Vikram Malhotra",
    email: "vikram@tata.com",
    subdomain: "tata",
    password: "password123",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("dealflow_theme");
  }, []);

  const personas = [
    { label: "Admin", email: "admin@dealflow360.com", role: "Superuser", color: "var(--brand)" },
    { label: "Sales Dir", email: "sales.manager@dealflow360.com", role: "L1 Director", color: "#d97706" },
    { label: "Account Exec", email: "sales.rep@dealflow360.com", role: "CPQ Quoter", color: "#0284c7" },
    { label: "Finance Lead", email: "finance@dealflow360.com", role: "L2 Finance", color: "#059669" },
    { label: "Supply Chain", email: "warehouse@dealflow360.com", role: "Logistics", color: "#0d9488" },
  ];

  const handleSelectPersona = (email) => {
    setForm({ email, password: "password123" });
    setError("");
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignupChange = (e) =>
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast({
        title: "Workspace Provisioned!",
        message: `Tenant "${signupForm.company}" registered under https://${signupForm.subdomain}.dealflow360.com. Proceeding with instant login.`,
        type: "success",
      });
      setForm({ email: signupForm.email, password: signupForm.password });
      setAuthMode("login");
    }, 600);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        padding: "1.5rem",
        transition: "background 0.3s ease",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "490px",
          padding: "2rem",
          borderTop: "3px solid var(--brand)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div className="logo" style={{ fontSize: "24px", justifyContent: "center" }}>
            ✦ <span>DealFlow</span> 360
          </div>
          <div className="logo-sub" style={{ marginTop: "4px" }}>
            Self-Governing Sales Operations & Intelligent CPQ Platform
          </div>
        </div>

        {/* Tab Toggle (Skeleton Screen 1) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            backgroundColor: "var(--bg-card)",
            padding: "4px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-light)",
            marginBottom: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            style={{
              padding: "7px 12px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.8125rem",
              backgroundColor: authMode === "login" ? "var(--brand)" : "transparent",
              color: authMode === "login" ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
          >
            Sign In to Workspace
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("signup")}
            style={{
              padding: "7px 12px",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.8125rem",
              backgroundColor: authMode === "signup" ? "var(--brand)" : "transparent",
              color: authMode === "signup" ? "#fff" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
          >
            Register Organization
          </button>
        </div>

        {authMode === "login" ? (
          <>
            {/* Quick Persona Switcher */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                1-Click Role Switcher (Pre-Configured Enterprise Roles):
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.35rem" }}>
                {personas.map((p) => {
                  const isSelected = form.email === p.email;
                  return (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => handleSelectPersona(p.email)}
                      style={{
                        padding: "0.5rem 0.2rem",
                        border: `1px solid ${isSelected ? "var(--brand)" : "var(--border-strong)"}`,
                        backgroundColor: isSelected ? "var(--brand-pale)" : "var(--bg-card)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        transition: "all var(--fast)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: isSelected ? "var(--brand)" : "var(--text)",
                        }}
                      >
                        {p.label}
                      </span>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: isSelected ? "var(--brand)" : "var(--text-muted)",
                          marginTop: "2px",
                        }}
                      >
                        {p.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-border)",
                  color: "var(--color-danger)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Enterprise Email <span className="req">*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    name="email"
                    required
                    className="form-input"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="user@dealflow360.com"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label className="form-label">
                  Security Password <span className="req">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  className="form-input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
                style={{ width: "100%", padding: "10px", fontSize: "0.875rem" }}
              >
                {loading ? "Authenticating Session..." : "Sign In to Platform →"}
              </button>
            </form>

            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "0.875rem",
                borderTop: "1px solid var(--border-light)",
                textAlign: "center",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              Master sandbox password for all personas: <strong style={{ color: "var(--brand)" }}>password123</strong>
            </div>
          </>
        ) : (
          /* Sign Up Form */
          <form onSubmit={handleSignupSubmit}>
            <div className="form-group">
              <label className="form-label">
                Company / Organization Name <span className="req">*</span>
              </label>
              <input
                type="text"
                name="company"
                required
                className="form-input"
                value={signupForm.company}
                onChange={handleSignupChange}
                placeholder="e.g. Acme Global Industries"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div className="form-group">
                <label className="form-label">
                  Admin Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  className="form-input"
                  value={signupForm.fullName}
                  onChange={handleSignupChange}
                  placeholder="Vikram Malhotra"
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Tenant Subdomain <span className="req">*</span>
                </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    name="subdomain"
                    required
                    className="form-input"
                    value={signupForm.subdomain}
                    onChange={handleSignupChange}
                    placeholder="acme"
                    style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                  />
                  <span style={{ backgroundColor: "var(--color-paper-3)", border: "1px solid var(--border-light)", borderLeft: "none", padding: "0 8px", height: "38px", display: "flex", alignItems: "center", fontSize: "0.72rem", color: "var(--text-muted)", borderTopRightRadius: "4px", borderBottomRightRadius: "4px" }}>
                    .df360.io
                  </span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Corporate Work Email <span className="req">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                className="form-input"
                value={signupForm.email}
                onChange={handleSignupChange}
                placeholder="admin@company.com"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label className="form-label">
                Master Password <span className="req">*</span>
              </label>
              <input
                type="password"
                name="password"
                required
                className="form-input"
                value={signupForm.password}
                onChange={handleSignupChange}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
              style={{ width: "100%", padding: "10px", fontSize: "0.875rem" }}
            >
              {loading ? "Provisioning Tenant..." : "Create Organization Workspace →"}
            </button>
          </form>
        )}

        {/* Customer Portal Entry Banner */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.875rem",
            backgroundColor: "var(--brand-pale)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--brand)" }}>
              Client Quotation Portal
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
              View public counter-offer negotiation portal (Quote #1)
            </div>
          </div>
          <Link
            to="/portal/1"
            className="btn btn-sm btn-primary"
            style={{ fontSize: "0.72rem", padding: "4px 10px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            Open Portal <ExternalLink size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
