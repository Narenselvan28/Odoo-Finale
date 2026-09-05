import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserPlus, ArrowRight } from "lucide-react";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("dealflow_theme");
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs.map((e) => e.msg).join(", ") : err.response?.data?.message || "Registration failed");
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
          maxWidth: "440px",
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
          <h2 style={{ fontSize: "18px", marginTop: "1rem", color: "var(--text-heading)" }}>
            Create Operator Account
          </h2>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              color: "var(--color-danger)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8125rem",
              marginBottom: "1rem",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Full Name <span className="req">*</span>
            </label>
            <input
              name="name"
              placeholder="e.g. Alex Morgan"
              value={form.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Corporate Email <span className="req">*</span>
            </label>
            <input
              type="email"
              name="email"
              placeholder="operator@dealflow360.com"
              value={form.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Password <span className="req">*</span>
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "10px", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? (
              "Provisioning Account..."
            ) : (
              <>
                <UserPlus size={16} /> Register Operator <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--border-light)",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
          }}
        >
          Already have an enterprise credential?{" "}
          <Link to="/login" style={{ color: "var(--orange)", fontWeight: 600, textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
