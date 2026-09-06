import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  Briefcase,
  ArrowRight,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const Register = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Registration Type: 'customer' | 'operator'
  const initialType = searchParams.get("type") === "operator" ? "operator" : "customer";
  const [accountType, setAccountType] = useState(initialType);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company_name: "",
    phone: "",
    industry: "Technology & IT",
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
    if (!form.name || !form.email || !form.password) {
      const msg = "Please fill in all required fields.";
      setError(msg);
      showToast({ title: "Incomplete Form", message: msg, type: "warning" });
      return;
    }
    if (form.password.length < 6) {
      const msg = "Password must be at least 6 characters.";
      setError(msg);
      showToast({ title: "Weak Password", message: msg, type: "warning" });
      return;
    }
    if (accountType === "customer" && !form.company_name) {
      const msg = "Please provide your company or organization name.";
      setError(msg);
      showToast({ title: "Missing Company", message: msg, type: "warning" });
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        account_type: accountType,
        company_name: form.company_name,
        phone: form.phone,
        industry: form.industry,
      };

      const data = await register(payload);

      showToast({
        title: "Account Created!",
        message:
          accountType === "customer"
            ? `Welcome ${form.name}! Your customer account for ${form.company_name || "your organization"} is ready.`
            : `Welcome ${form.name}! Operator account created successfully.`,
        type: "success",
      });

      if (accountType === "customer" && data.user?.customer_id) {
        navigate(`/portal/${data.user.customer_id}`);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const errs = err.response?.data?.errors;
      const msg = errs ? errs.map((e) => e.msg).join(", ") : err.response?.data?.message || "Registration failed";
      setError(msg);
      showToast({
        title: "Registration Failed",
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
          maxWidth: "480px",
          padding: "2.25rem",
          borderTop: "3px solid var(--orange, #ea580c)",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          borderRadius: "14px",
          backgroundColor: "#ffffff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div className="logo" style={{ fontSize: "24px", justifyContent: "center" }}>
            ✦ <span>DealFlow</span> 360
          </div>
          <div className="logo-sub" style={{ marginTop: "4px" }}>
            Self-Governing Sales Operations & Intelligent CPQ Platform
          </div>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginTop: "1rem", color: "var(--text-heading, #0f172a)" }}>
            {accountType === "customer" ? "Create Customer / Client Account" : "Create Operator Account"}
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary, #64748b)" }}>
            {accountType === "customer"
              ? "Access live quotation reviews, submit counter-proposals & manage orders"
              : "Access the DealFlow 360 internal sales and operations workspace"}
          </p>
        </div>

        {/* Account Type Toggle */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            backgroundColor: "#f1f5f9",
            padding: "4px",
            borderRadius: "8px",
            marginBottom: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAccountType("customer");
              setError("");
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              backgroundColor: accountType === "customer" ? "#ffffff" : "transparent",
              color: accountType === "customer" ? "var(--orange, #ea580c)" : "#64748b",
              boxShadow: accountType === "customer" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Building2 size={15} />
            <span>Customer Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountType("operator");
              setError("");
            }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.8125rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              backgroundColor: accountType === "operator" ? "#ffffff" : "transparent",
              color: accountType === "operator" ? "#2563eb" : "#64748b",
              boxShadow: accountType === "operator" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <User size={15} />
            <span>Internal Operator</span>
          </button>
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Company Name (For Customers) */}
          {accountType === "customer" && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                Company / Organization Name <span className="req">*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  name="company_name"
                  required
                  className="form-input"
                  value={form.company_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Global Industries Ltd"
                  style={{ paddingLeft: "36px" }}
                />
                <Building2
                  size={16}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                />
              </div>
            </div>
          )}

          {/* Contact Person Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
              {accountType === "customer" ? "Primary Contact Full Name" : "Full Name"} <span className="req">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                name="name"
                required
                className="form-input"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Rajesh Sharma"
                style={{ paddingLeft: "36px" }}
              />
              <User
                size={16}
                color="#94a3b8"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
              {accountType === "customer" ? "Corporate Business Email" : "Enterprise Email"} <span className="req">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                name="email"
                required
                className="form-input"
                value={form.email}
                onChange={handleChange}
                placeholder={accountType === "customer" ? "contact@company.com" : "operator@dealflow360.com"}
                style={{ paddingLeft: "36px" }}
              />
              <Mail
                size={16}
                color="#94a3b8"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>

          {/* Customer Specific Fields: Phone & Industry */}
          {accountType === "customer" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                  Phone Number
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    style={{ paddingLeft: "32px", fontSize: "0.8125rem" }}
                  />
                  <Phone
                    size={14}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                  Industry
                </label>
                <select
                  name="industry"
                  className="form-input"
                  value={form.industry}
                  onChange={handleChange}
                  style={{ fontSize: "0.8125rem" }}
                >
                  <option value="Technology & IT">Technology & IT</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                  <option value="Energy & Utilities">Energy & Utilities</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Retail & FMCG">Retail & FMCG</option>
                  <option value="Telecom">Telecom</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: "0.8125rem" }}>
              Security Password <span className="req">*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                name="password"
                required
                className="form-input"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
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
              backgroundColor: accountType === "customer" ? "var(--orange, #ea580c)" : "#2563eb",
              borderColor: accountType === "customer" ? "var(--orange, #ea580c)" : "#2563eb",
            }}
          >
            {loading ? (
              "Registering Account..."
            ) : (
              <>
                <UserPlus size={16} />
                <span>
                  {accountType === "customer" ? "Create Customer Account" : "Register Operator Account"}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-light, #e2e8f0)",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--text-secondary, #64748b)",
          }}
        >
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--orange, #ea580c)", fontWeight: 700, textDecoration: "none" }}>
            Sign In Here →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
