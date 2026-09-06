import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useKeyboardShortcuts } from "../../context/KeyboardShortcutsContext";
import {
  Search,
  X,
  Compass,
  Zap,
  Calculator,
  Shield,
  ArrowRight,
  ExternalLink,
  Command,
} from "lucide-react";

const SHORTCUT_GROUPS = [
  {
    category: "Navigation Sequences (Press 'G' then Key)",
    icon: Compass,
    color: "#ea580c",
    items: [
      { keys: ["g", "d"], label: "Go to Dashboard", path: "/dashboard", desc: "Executive KPI overview & recent quotes" },
      { keys: ["g", "c"], label: "Go to Pricing Studio (CPQ)", path: "/cpq", desc: "Multi-tier commercial configurator" },
      { keys: ["g", "q"], label: "Go to Quotations Registry", path: "/quotations", desc: "Comprehensive quotation lifecycle desk" },
      { keys: ["g", "p"], label: "Go to Pipeline Kanban", path: "/pipeline", desc: "Visual deal stage movement" },
      { keys: ["g", "a"], label: "Go to Approvals Desk", path: "/approvals", desc: "Executive discount exception queue" },
      { keys: ["g", "i"], label: "Go to Inventory & Depots", path: "/inventory", desc: "Multi-warehouse fulfillment split" },
      { keys: ["g", "b"], label: "Go to Invoices & Billing", path: "/billing", desc: "Dual-engine milestone & recurring billing" },
      { keys: ["g", "m"], label: "Go to Deal Telemetry (ML)", path: "/intelligence", desc: "Predictive win-probability & discount AI" },
      { keys: ["g", "k"], label: "Go to Catalog & Pricing Rules", path: "/catalog", desc: "Price lists, margins & product SKUs" },
      { keys: ["g", "u"], label: "Go to Customers & Accounts", path: "/customers", desc: "Client tiers, payment terms & credit" },
      { keys: ["g", "r"], label: "Go to Reports & Analytics", path: "/reporting", desc: "Revenue velocity, margin leakage exports" },
      { keys: ["g", "s"], label: "Go to System Governance", path: "/users", desc: "User permissions & audit logs" },
    ],
  },
  {
    category: "Global Shortcuts & Commands",
    icon: Zap,
    color: "#2563eb",
    items: [
      { keys: ["Ctrl", "K"], macKeys: ["⌘", "K"], label: "Open Shortcuts & Command Palette", action: "TOGGLE_MODAL", desc: "Toggle this helper modal anywhere" },
      { keys: ["?"], label: "Quick Shortcuts Cheatsheet", action: "TOGGLE_MODAL", desc: "Press Shift + / when not in an input" },
      { keys: ["Alt", "N"], label: "Create New Quotation", path: "/cpq", desc: "Jump straight into fresh CPQ Studio" },
      { keys: ["Esc"], label: "Dismiss Open Dialogs", action: "CLOSE_MODAL", desc: "Close this modal or active prompt" },
    ],
  },
  {
    category: "CPQ Studio Workflow Shortcuts",
    icon: Calculator,
    color: "#059669",
    items: [
      { keys: ["Ctrl", "S"], macKeys: ["⌘", "S"], label: "Save / Update Quotation", desc: "Persist quote lines and calculate margin" },
      { keys: ["Alt", "A"], label: "Add Line Item", desc: "Append new commercial product item" },
      { keys: ["Alt", "P"], label: "Open Customer Portal", desc: "Open live negotiation portal for loaded deal" },
    ],
  },
  {
    category: "Security & Enterprise Governance",
    icon: Shield,
    color: "#7c3aed",
    items: [
      { keys: ["Shift", "L"], label: "Lock Session / Inactivity Timeout", action: "SIMULATE_TIMEOUT", desc: "Trigger session security verification" },
      { keys: ["Ctrl", "Shift", "R"], macKeys: ["⌘", "Shift", "R"], label: "Force Clean Refresh", action: "FORCE_RELOAD", desc: "Reload data and verify persistence" },
    ],
  },
];

const KeyboardShortcutsModal = () => {
  const { isOpen, closeShortcuts } = useKeyboardShortcuts();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return SHORTCUT_GROUPS;
    const q = search.toLowerCase();
    return SHORTCUT_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          it.desc?.toLowerCase().includes(q) ||
          it.keys.join(" ").toLowerCase().includes(q) ||
          it.path?.toLowerCase().includes(q)
      ),
    })).filter((group) => group.items.length > 0);
  }, [search]);

  if (!isOpen) return null;

  const handleItemClick = (item) => {
    closeShortcuts();
    if (item.path) {
      navigate(item.path);
    } else if (item.action === "FORCE_RELOAD") {
      window.location.reload();
    } else if (item.action === "SIMULATE_TIMEOUT") {
      window.dispatchEvent(new CustomEvent("dealflow:simulate-timeout"));
    }
  };

  return (
    <div
      className="confirm-modal-backdrop"
      onClick={closeShortcuts}
      style={{
        zIndex: 100000,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="confirm-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "760px",
          width: "92%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Header with Search Bar */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-light, #e2e8f0)",
            backgroundColor: "var(--bg-secondary, #f8fafc)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  backgroundColor: "var(--orange-pale, #fff7ed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--orange, #ea580c)",
                }}
              >
                <Command size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-heading, #0f172a)" }}>
                DealFlow 360 · Command & Keyboard Shortcuts
              </h3>
            </div>

            <button
              onClick={closeShortcuts}
              className="confirm-modal-close-btn"
              style={{ position: "static" }}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Search */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                color: "var(--text-muted, #94a3b8)",
              }}
            />
            <input
              type="text"
              autoFocus
              placeholder="Search actions, pages, or hotkeys (e.g. 'cpq', 'approvals', 'save')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                fontSize: "0.875rem",
                borderRadius: "8px",
                border: "1px solid var(--border, #cbd5e1)",
                backgroundColor: "#ffffff",
                outline: "none",
                color: "var(--text, #1e293b)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Shortcuts List Workspace */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {filteredGroups.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted, #94a3b8)" }}>
              <p style={{ margin: 0, fontSize: "0.95rem" }}>No shortcuts matched your search query "{search}".</p>
            </div>
          ) : (
            filteredGroups.map((group, gIdx) => {
              const Icon = group.icon;
              return (
                <div key={gIdx}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "0.6rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: group.color,
                    }}
                  >
                    <Icon size={14} />
                    <span>{group.category}</span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {group.items.map((it, iIdx) => {
                      const keysToDisplay = isMac && it.macKeys ? it.macKeys : it.keys;
                      return (
                        <div
                          key={iIdx}
                          onClick={() => handleItemClick(it)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            backgroundColor: "var(--bg-card, #ffffff)",
                            border: "1px solid var(--border-light, #e2e8f0)",
                            borderRadius: "8px",
                            cursor: it.path || it.action ? "pointer" : "default",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (it.path || it.action) {
                              e.currentTarget.style.backgroundColor = "var(--bg-secondary, #f8fafc)";
                              e.currentTarget.style.borderColor = "var(--orange, #ea580c)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--bg-card, #ffffff)";
                            e.currentTarget.style.borderColor = "var(--border-light, #e2e8f0)";
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1, paddingRight: "8px" }}>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                color: "var(--text-heading, #0f172a)",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span>{it.label}</span>
                              {it.path && <ArrowRight size={12} color="#94a3b8" />}
                            </div>
                            {it.desc && (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-muted, #64748b)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  marginTop: "2px",
                                }}
                              >
                                {it.desc}
                              </div>
                            )}
                          </div>

                          {/* Key Badges */}
                          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexShrink: 0 }}>
                            {keysToDisplay.map((k, kIdx) => (
                              <kbd
                                key={kIdx}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: "22px",
                                  height: "22px",
                                  padding: "0 6px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  fontFamily: "inherit",
                                  color: "#334155",
                                  backgroundColor: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderBottomWidth: "2px",
                                  borderRadius: "4px",
                                  boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
                                }}
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info note */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--bg-secondary, #f8fafc)",
            borderTop: "1px solid var(--border-light, #e2e8f0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "var(--text-muted, #64748b)",
          }}
        >
          <span>
            💡 <strong>ProTip:</strong> Click any shortcut above to execute immediately, or press <kbd style={{ padding: "1px 5px", background: "#e2e8f0", borderRadius: "3px", fontSize: "0.7rem" }}>Esc</kbd> to return.
          </span>
          <span style={{ fontWeight: 600, color: "var(--orange, #ea580c)" }}>DealFlow 360 Pro HUD</span>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
