import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "user1@dealflow360.com", password: "password123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          maxWidth: "420px",
          padding: "2rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div className="sidebar-logo-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>DealFlow 360</h2>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              PRISM CPQ · Enterprise Studio
            </div>
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
            {loading ? "Authenticating Session..." : "Sign In to Console"}
            <ArrowRight size={15} />
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem",
            backgroundColor: "var(--color-paper-2)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, marginBottom: "2px" }}>
            <ShieldCheck size={14} color="var(--color-accent)" /> Demo Credentials Pre-filled:
          </div>
          <code>user1@dealflow360.com</code> / <code>password123</code>
        </div>
      </div>
    </div>
  );
};

export default Login;
