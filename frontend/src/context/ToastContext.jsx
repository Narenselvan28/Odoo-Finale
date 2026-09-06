import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((firstArg, secondArg) => {
    let title = "";
    let message = "";
    let type = "info";
    let duration = 4000;

    if (typeof firstArg === "string") {
      message = firstArg;
      if (typeof secondArg === "string") {
        type = secondArg;
      } else if (secondArg && typeof secondArg === "object") {
        title = secondArg.title || "";
        type = secondArg.type || type;
        duration = secondArg.duration !== undefined ? secondArg.duration : duration;
      }
    } else if (firstArg && typeof firstArg === "object") {
      title = firstArg.title || "";
      message = firstArg.message || firstArg.text || firstArg.description || "";
      type = firstArg.type || (typeof secondArg === "string" ? secondArg : "info");
      duration = firstArg.duration !== undefined ? firstArg.duration : duration;
    }

    if (!message && !title) return;

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
    <ToastContext.Provider value={{ showToast, toast: showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
            <div style={{ flexShrink: 0, marginTop: "2px" }}>
              {toast.type === "success" && <CheckCircle2 size={18} color="#059669" />}
              {toast.type === "error" && <AlertCircle size={18} color="#dc2626" />}
              {toast.type === "warning" && <AlertTriangle size={18} color="#d97706" />}
              {toast.type === "info" && <Info size={18} color="#714B67" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "3px", color: "inherit", lineHeight: 1.3 }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary, #475569)", wordBreak: "break-word", lineHeight: 1.4 }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="btn btn-ghost btn-sm"
              style={{
                padding: "2px",
                color: "var(--color-text-muted, #94a3b8)",
                flexShrink: 0,
                alignSelf: "flex-start",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              aria-label="Dismiss notification"
            >
              <X size={15} />
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

