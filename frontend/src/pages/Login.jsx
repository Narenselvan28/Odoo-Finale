import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, Shield } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@dealflow360.com", password: "password123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const personas = [
    { label: "Admin", email: "admin@dealflow360.com", role: "Superuser", color: "#4f46e5" },
    { label: "Sales Director", email: "sales.manager@dealflow360.com", role: "Approver", color: "#d97706" },
    { label: "Account Exec", email: "sales.rep@dealflow360.com", role: "Quoter", color: "#0284c7" },
    { label: "Finance", email: "finance@dealflow360.com", role: "Invoicing", color: "#059669" },
    { label: "Supply Chain", email: "warehouse@dealflow360.com", role: "Logistics", color: "#0d9488" },
  ];

  const handleSelectPersona = (email) => {
    setForm({ email, password: "password123" });
    setError("");
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

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

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "var(--color-paper-0)",
        padding: "1.5rem",
      }}
    >
      <div
        className="data-card"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "2rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div className="sidebar-logo-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>DealFlow 360</h2>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              Enterprise CPQ & RBAC Security Suite
            </div>
          </div>
        </div>

        {/* Quick Persona Switcher */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
            Select Test Persona Role:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "0.35rem" }}>
            {personas.map((p) => {
              const isSelected = form.email === p.email;
              return (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleSelectPersona(p.email)}
                  style={{
                    padding: "0.4rem 0.25rem",
                    border: `1px solid ${isSelected ? p.color : "var(--color-border-subtle)"}`,
                    backgroundColor: isSelected ? "var(--color-paper-0)" : "var(--color-paper-1)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    transition: "all 150ms ease",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isSelected ? p.color : "var(--color-text-primary)" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: "0.625rem", color: "var(--color-text-muted)" }}>
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
              padding: "0.625rem 0.875rem",
              backgroundColor: "var(--color-danger-bg)",
              color: "var(--color-danger)",
              border: "1px solid var(--color-danger-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8125rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Work Email Address
            </label>
            <input
              type="email"
              name="email"
              className="input"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Security Password
            </label>
            <input
              type="password"
              name="password"
              className="input"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.625rem", marginTop: "0.5rem" }}
          >
            {loading ? "Authenticating Session..." : "Sign In with Role Permissions"}
            <ArrowRight size={15} />
          </button>
        </form>

        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem",
            backgroundColor: "var(--color-paper-2)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, marginBottom: "2px" }}>
            <ShieldCheck size={14} color="var(--color-accent)" /> Unified Password for All Personas:
          </div>
          <code>password123</code>
        </div>
      </div>
    </div>
  );
};

export default Login;
