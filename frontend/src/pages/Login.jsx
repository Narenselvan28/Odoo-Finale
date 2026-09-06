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
} from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Clean empty state - No dummy credentials
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    password: "",
  });
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

    setError("");
    setLoading(true);

    try {
      const data = await login(form);
      showToast({
        title: "Welcome Back",
        message: `Authenticated as ${data.user?.name || "User"}.`,
        type: "success",
      });

      // Redirect customer users to client portal or dashboard
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "var(--bg, #f8fafc)",
        padding: "1.5rem",
        transition: "background 0.3s ease",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "2.25rem",
          borderTop: "3px solid var(--orange, #ea580c)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          borderRadius: "14px",
          backgroundColor: "#ffffff",
        }}
      >
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

        {/* User Registration Options */}
        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-light, #e2e8f0)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
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
    </div>
  );
};

export default Login;
