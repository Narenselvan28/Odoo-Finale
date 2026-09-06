import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  ShieldAlert,
  Clock,
  LogOut,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// Default enterprise idle limits
const TIMEOUT_SECONDS = 15 * 60; // 15 minutes
const WARNING_SECONDS = 60; // Show warning modal 60 seconds prior to termination

const SessionTimeoutMonitor = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_SECONDS);

  const lastActivityRef = useRef(Date.now());
  const timerIntervalRef = useRef(null);

  // Reset activity timestamp
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(WARNING_SECONDS);
      showToast({
        title: "Session Maintained",
        message: "Your enterprise session has been successfully extended.",
        type: "success",
      });
    }
  }, [showWarning, showToast]);

  // Immediate logout action
  const handleImmediateLogout = useCallback(() => {
    setShowWarning(false);
    logout();
    navigate("/login");
    showToast({
      title: "Session Terminated",
      message: "You have signed out of your DealFlow 360 session.",
      type: "info",
    });
  }, [logout, navigate, showToast]);

  // Listener for user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    const handleUserInteraction = () => {
      // Only bump last activity if not currently showing expiration countdown
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    activityEvents.forEach((evt) => window.addEventListener(evt, handleUserInteraction));

    // Custom event to simulate/test timeout for showcase demo
    const handleSimulate = (e) => {
      const demoSecs = e?.detail?.seconds || 15;
      lastActivityRef.current = Date.now() - (TIMEOUT_SECONDS - demoSecs) * 1000;
      setShowWarning(true);
      setSecondsRemaining(demoSecs);
    };
    window.addEventListener("dealflow:simulate-timeout", handleSimulate);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserInteraction));
      window.removeEventListener("dealflow:simulate-timeout", handleSimulate);
    };
  }, [user, showWarning]);

  // Main countdown tick
  useEffect(() => {
    if (!user) return;

    timerIntervalRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = TIMEOUT_SECONDS - elapsedSeconds;

      if (remaining <= 0) {
        // Session Expired
        clearInterval(timerIntervalRef.current);
        setShowWarning(false);
        logout();
        navigate("/login");
        showToast({
          title: "Session Expired",
          message: "Your session expired due to 15 minutes of inactivity. Please re-authenticate.",
          type: "warning",
        });
      } else if (remaining <= WARNING_SECONDS) {
        // Show Warning Modal
        setShowWarning(true);
        setSecondsRemaining(remaining);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [user, logout, navigate, showToast]);

  if (!user || !showWarning) return null;

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / WARNING_SECONDS) * 100));

  return (
    <div
      className="confirm-modal-backdrop"
      style={{
        zIndex: 100001,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="confirm-modal-content"
        style={{
          maxWidth: "480px",
          width: "92%",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #fecaca",
          boxShadow: "0 25px 50px -12px rgba(220, 38, 38, 0.25)",
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#991b1b" }}>
              Enterprise Session Expiration Warning
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
              Corporate Inactivity Security Policy (Spec S2)
            </span>
          </div>
        </div>

        {/* Informational Message */}
        <p style={{ fontSize: "0.875rem", color: "#334155", lineHeight: 1.5, margin: "0 0 16px 0" }}>
          You have been inactive for an extended period. For commercial data confidentiality and security compliance, your session will automatically terminate in:
        </p>

        {/* Live Timer Countdown Box */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: "10px",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#b91c1c", fontWeight: 800, fontSize: "1.75rem", letterSpacing: "0.05em" }}>
            <Clock size={24} />
            <span>00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#7f1d1d", marginTop: "4px", fontWeight: 600 }}>
            Seconds remaining before automatic logoff
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#fecaca",
              borderRadius: "3px",
              marginTop: "12px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                backgroundColor: secondsRemaining <= 15 ? "#dc2626" : "#ea580c",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleImmediateLogout}
            className="btn btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              padding: "8px 14px",
            }}
          >
            <LogOut size={14} />
            <span>Log Out Now</span>
          </button>

          <button
            type="button"
            onClick={resetActivity}
            className="btn btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              padding: "8px 18px",
              backgroundColor: "#ea580c",
              borderColor: "#ea580c",
              fontWeight: 700,
            }}
          >
            <RefreshCw size={14} />
            <span>Stay Logged In</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutMonitor;
