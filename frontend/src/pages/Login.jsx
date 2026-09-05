import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sparkles, ArrowRight, ShieldCheck, UserCheck, Shield } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@dealflow360.com", password: "password123" });
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
          maxWidth: "460px",
          padding: "2rem",
          borderTop: "3px solid var(--orange)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div className="logo" style={{ fontSize: "24px", justifyContent: "center" }}>
            ✦ <span>DealFlow</span> 360
          </div>
          <div className="logo-sub" style={{ marginTop: "4px" }}>
            Smart Sales Operations & CPQ Platform
          </div>
        </div>

        {/* Quick Persona Switcher */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              marginBottom: "0.5rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Select Persona to Sign In:
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
                    padding: "0.5rem 0.25rem",
                    border: `1px solid ${isSelected ? "var(--orange)" : "var(--border-strong)"}`,
                    backgroundColor: isSelected ? "var(--orange-pale)" : "var(--bg-card)",
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
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: isSelected ? "var(--orange)" : "var(--text)",
                    }}
                  >
                    {p.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.625rem",
                      color: isSelected ? "var(--orange)" : "var(--text-muted)",
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

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
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
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-light)",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          Password for all personas: <strong style={{ color: "var(--orange)" }}>password123</strong>
        </div>
      </div>
    </div>
  );
};

export default Login;
