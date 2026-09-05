import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ title, message, type = "info", duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === "success" && <CheckCircle2 size={18} color="var(--color-success)" />}
            {toast.type === "error" && <AlertTriangle size={18} color="var(--color-danger)" />}
            {toast.type === "info" && <Info size={18} color="var(--color-info)" />}
            <div style={{ flex: 1 }}>
              {toast.title && <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "2px" }}>{toast.title}</div>}
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="btn btn-ghost btn-sm"
              style={{ padding: "2px", color: "var(--color-text-muted)" }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
