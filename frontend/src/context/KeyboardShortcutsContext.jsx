import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./ToastContext";

const KeyboardShortcutsContext = createContext(null);

export const KeyboardShortcutsProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastKeySequence, setLastKeySequence] = useState("");
  const navigate = useNavigate();
  const { showToast } = useToast();

  const openShortcuts = useCallback(() => setIsOpen(true), []);
  const closeShortcuts = useCallback(() => setIsOpen(false), []);
  const toggleShortcuts = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    let keyTimeout = null;
    let sequence = "";

    const handleKeyDown = (e) => {
      // Ignore shortcut keys when typing inside editable fields
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditable =
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select" ||
        document.activeElement?.isContentEditable;

      // Global Command Palette / Shortcuts Modal: Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // '?' key (Shift + /) opens shortcuts if not in input
      if (!isEditable && e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // Escape key closes modal
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      // Quick action: Alt+N -> New Quotation CPQ
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/cpq");
        showToast({
          title: "⚡ Quick Action",
          message: "Navigating to CPQ Pricing Studio for new quotation.",
          type: "info",
        });
        return;
      }

      // If user is inside an input, don't capture navigation sequences
      if (isEditable || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // Two-key chord sequence handler (e.g. 'g' then 'd')
      if (sequence === "") {
        if (key === "g") {
          sequence = "g";
          setLastKeySequence("g");
          clearTimeout(keyTimeout);
          keyTimeout = setTimeout(() => {
            sequence = "";
            setLastKeySequence("");
          }, 1200);
        }
      } else if (sequence === "g") {
        sequence = "";
        setLastKeySequence("");
        clearTimeout(keyTimeout);

        switch (key) {
          case "d":
            e.preventDefault();
            navigate("/dashboard");
            showToast({ title: "Navigation", message: "Dashboard (g d)", type: "info" });
            break;
          case "c":
            e.preventDefault();
            navigate("/cpq");
            showToast({ title: "Navigation", message: "CPQ Pricing Studio (g c)", type: "info" });
            break;
          case "q":
            e.preventDefault();
            navigate("/quotations");
            showToast({ title: "Navigation", message: "Quotations Registry (g q)", type: "info" });
            break;
          case "p":
            e.preventDefault();
            navigate("/pipeline");
            showToast({ title: "Navigation", message: "Pipeline Kanban (g p)", type: "info" });
            break;
          case "a":
            e.preventDefault();
            navigate("/approvals");
            showToast({ title: "Navigation", message: "Approvals Desk (g a)", type: "info" });
            break;
          case "k":
            e.preventDefault();
            navigate("/catalog");
            showToast({ title: "Navigation", message: "Catalog Management (g k)", type: "info" });
            break;
          case "u":
            e.preventDefault();
            navigate("/customers");
            showToast({ title: "Navigation", message: "Customers Desk (g u)", type: "info" });
            break;
          case "i":
            e.preventDefault();
            navigate("/inventory");
            showToast({ title: "Navigation", message: "Inventory & Depots (g i)", type: "info" });
            break;
          case "b":
            e.preventDefault();
            navigate("/billing");
            showToast({ title: "Navigation", message: "Invoices & Billing (g b)", type: "info" });
            break;
          case "m":
          case "t":
            e.preventDefault();
            navigate("/intelligence");
            showToast({ title: "Navigation", message: "Deal Telemetry & ML (g m)", type: "info" });
            break;
          case "r":
            e.preventDefault();
            navigate("/reporting");
            showToast({ title: "Navigation", message: "Reporting & Exports (g r)", type: "info" });
            break;
          case "s":
            e.preventDefault();
            navigate("/users");
            showToast({ title: "Navigation", message: "Admin & Audit (g s)", type: "info" });
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(keyTimeout);
    };
  }, [navigate, showToast, toggleShortcuts]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        isOpen,
        openShortcuts,
        closeShortcuts,
        toggleShortcuts,
        lastKeySequence,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error("useKeyboardShortcuts must be used within a KeyboardShortcutsProvider");
  }
  return context;
};
