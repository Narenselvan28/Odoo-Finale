import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useKeyboardShortcuts } from "../../context/KeyboardShortcutsContext";
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  Calculator,
  ShieldCheck,
  Globe,
  CheckSquare,
  Warehouse,
  Receipt,
  Clock,
  Command,
  UserCheck,
  Play,
  X,
} from "lucide-react";

const DEMO_STEPS = [
  { id: 1, label: "1. CPQ Studio", path: "/cpq", icon: Calculator, desc: "Build quote with dynamic margin & tier pricing" },
  { id: 2, label: "2. Customer Portal", path: "/portal/1", icon: Globe, desc: "Live 35% counter-offer concession reflection" },
  { id: 3, label: "3. Approvals Desk", path: "/approvals", icon: CheckSquare, desc: "Director-level governance & audit trail" },
  { id: 4, label: "4. Warehouse Depots", path: "/inventory", icon: Warehouse, desc: "Multi-depot line-item fulfillment split" },
  { id: 5, label: "5. Dual-Engine Billing", path: "/billing", icon: Receipt, desc: "Milestone invoices & mid-cycle subscription proration" },
];

const DEMO_ROLES = [
  { role: "admin", label: "Executive Admin" },
  { role: "sales_manager", label: "Sales Director" },
  { role: "sales_rep", label: "Account Executive" },
  { role: "finance_manager", label: "Finance Controller" },
  { role: "warehouse_manager", label: "Supply Chain Lead" },
];

const ShowcaseBar = () => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openShortcuts } = useKeyboardShortcuts();
  const navigate = useNavigate();
  const location = useLocation();

  if (dismissed || !user) return null;

  // Don't render inside the public customer negotiation portal
  if (location.pathname.startsWith("/portal/")) return null;

  const handleSimulateTimeout = () => {
    window.dispatchEvent(
      new CustomEvent("dealflow:simulate-timeout", { detail: { seconds: 12 } })
    );
    showToast({
      title: "Simulating Session Timeout",
      message: "Triggered 12s enterprise inactivity countdown for showcase demonstration.",
      type: "warning",
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: 9999,
        fontFamily: "inherit",
      }}
    >
      {/* Minimized Floating Pill */}
      {!expanded ? (
        <div
          onClick={() => setExpanded(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            borderRadius: "30px",
            cursor: "pointer",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(234, 88, 12, 0.4)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            userSelect: "none",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <Sparkles size={14} color="#ea580c" />
          <span style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.02em" }}>
            DealFlow 360 · Showcase Navigator
          </span>
          <span
            style={{
              padding: "1px 6px",
              backgroundColor: "rgba(234, 88, 12, 0.2)",
              color: "#fb923c",
              borderRadius: "10px",
              fontSize: "0.68rem",
              fontWeight: 700,
            }}
          >
            Ready
          </span>
          <ChevronUp size={14} color="#94a3b8" />
        </div>
      ) : (
        /* Expanded Showcase Control HUD */
        <div
          style={{
            width: "380px",
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 30px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)",
            overflow: "hidden",
            animation: "modalPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={14} color="#ea580c" />
              <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                DealFlow 360 · Showcase Navigator
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                }}
                title="Minimize"
              >
                <ChevronDown size={15} />
              </button>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                }}
                title="Dismiss during presentation"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* 1. End-to-End Walkthrough Steps */}
            <div>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#64748b",
                  marginBottom: "6px",
                  letterSpacing: "0.05em",
                }}
              >
                End-to-End Commercial Flow
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {DEMO_STEPS.map((s) => {
                  const Icon = s.icon;
                  const isActive = location.pathname.startsWith(s.path);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        navigate(s.path);
                        showToast({
                          title: `Showcase Step ${s.id}`,
                          message: s.desc,
                          type: "info",
                        });
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: isActive ? "var(--orange-pale, #fff7ed)" : "#f8fafc",
                        border: `1px solid ${isActive ? "var(--orange, #ea580c)" : "#e2e8f0"}`,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Icon size={14} color={isActive ? "#ea580c" : "#475569"} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: isActive ? "#ea580c" : "#1e293b",
                          }}
                        >
                          {s.label}
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Live Demo Interactive Controls */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#64748b",
                  marginBottom: "6px",
                  letterSpacing: "0.05em",
                }}
              >
                Showcase Quick Utilities
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <button
                  onClick={openShortcuts}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: "0.72rem",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Command size={12} color="#ea580c" />
                  <span>Shortcuts (⌘K)</span>
                </button>

                <button
                  onClick={handleSimulateTimeout}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: "0.72rem",
                    padding: "6px 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                  title="Demonstrate inactivity session timeout modal"
                >
                  <Clock size={12} color="#dc2626" />
                  <span>Test Timeout (12s)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              fontSize: "0.68rem",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            Press <kbd style={{ padding: "1px 4px", background: "#e2e8f0", borderRadius: "3px" }}>⌘K</kbd> or <kbd style={{ padding: "1px 4px", background: "#e2e8f0", borderRadius: "3px" }}>?</kbd> anytime for cheatsheet
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowcaseBar;
