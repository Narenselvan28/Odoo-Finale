import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  AlertTriangle,
  Trash2,
  CheckCircle2,
  HelpCircle,
  X,
  ShieldAlert,
  Loader2,
  Info,
} from "lucide-react";

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "Confirm Action",
    message: "Are you sure you want to proceed with this action?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "warning", // 'danger' | 'warning' | 'info' | 'success'
    details: null,
    isLoading: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback(
    ({
      title = "Are you sure?",
      message = "This action cannot be undone.",
      confirmText = "Confirm",
      cancelText = "Cancel",
      type = "warning",
      details = null,
    }) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          type,
          details,
          isLoading: false,
        });
      });
    },
    []
  );

  const handleClose = (confirmed) => {
    if (resolverRef.current) {
      resolverRef.current(confirmed);
      resolverRef.current = null;
    }
    setModalState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
  };

  const getHeaderIcon = () => {
    switch (modalState.type) {
      case "danger":
        return <Trash2 size={24} color="#dc2626" />;
      case "success":
        return <CheckCircle2 size={24} color="#059669" />;
      case "info":
        return <Info size={24} color="#2563eb" />;
      case "warning":
      default:
        return <AlertTriangle size={24} color="#d97706" />;
    }
  };

  const getBadgeBg = () => {
    switch (modalState.type) {
      case "danger":
        return "#fee2e2";
      case "success":
        return "#d1fae5";
      case "info":
        return "#dbeafe";
      case "warning":
      default:
        return "#fef3c7";
    }
  };

  const getConfirmBtnClass = () => {
    switch (modalState.type) {
      case "danger":
        return "btn-confirm-danger";
      case "success":
        return "btn-confirm-success";
      case "info":
        return "btn-confirm-info";
      case "warning":
      default:
        return "btn-confirm-warning";
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {modalState.isOpen && (
        <div
          className="confirm-modal-backdrop"
          onClick={() => handleClose(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="confirm-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close icon */}
            <button
              onClick={() => handleClose(false)}
              className="confirm-modal-close-btn"
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>

            {/* Modal Body */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: getBadgeBg(),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {getHeaderIcon()}
              </div>

              <div style={{ flex: 1 }}>
                <h3 className="confirm-modal-title">{modalState.title}</h3>
                <p className="confirm-modal-message">{modalState.message}</p>

                {/* Optional Details or bullet points */}
                {modalState.details && (
                  <div className="confirm-modal-details">
                    {Array.isArray(modalState.details) ? (
                      <ul style={{ margin: 0, paddingLeft: "18px" }}>
                        {modalState.details.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>{modalState.details}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="confirm-modal-footer">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="confirm-modal-cancel-btn"
                disabled={modalState.isLoading}
              >
                {modalState.cancelText}
              </button>

              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`confirm-modal-action-btn ${getConfirmBtnClass()}`}
                disabled={modalState.isLoading}
                autoFocus
              >
                {modalState.isLoading ? (
                  <Loader2 size={16} className="spin-animate" />
                ) : null}
                <span>{modalState.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};
