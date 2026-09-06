import React, { useState, useEffect, useRef } from "react";
import { chatApi } from "../../api";
import { useToast } from "../../context/ToastContext";
import "../../styles/chatbot.css";
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  FileText,
  Tags,
  Truck,
  ShieldCheck,
  Clock,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";

const getChipIcon = (text = "") => {
  const lower = text.toLowerCase();
  if (lower.includes("status") || lower.includes("quote")) return <FileText size={13} />;
  if (lower.includes("discount") || lower.includes("%") || lower.includes("deal")) return <Tags size={13} />;
  if (lower.includes("deliver") || lower.includes("arrive") || lower.includes("ship")) return <Truck size={13} />;
  if (lower.includes("warranty") || lower.includes("protect")) return <ShieldCheck size={13} />;
  return <Sparkles size={13} />;
};

const DealFlowChatbot = ({ quoteId = null, customerId = null, initialContext = {} }) => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: "Hi! I'm your DealFlow Assistant. Ask me about discounts, delivery estimates, quotation status, or approval workflows.",
      quickReplies: [
        "What's the status of my quote?",
        "Can I get a better discount?",
        "When will my order arrive?",
        "Tell me about warranty",
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(() => `conv_${Date.now()}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setIsMinimized(false);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const res = await chatApi.sendMessage({
        conversation_id: conversationId,
        message: query,
        quote_id: quoteId,
        customer_id: customerId,
        context_override: initialContext,
      });

      const data = res.data || {};
      const responseObj = data.response || {};

      const rawText =
        responseObj.message ||
        data.reply_text ||
        data.message ||
        (typeof data === "string" ? data : "");

      const scenariosList = responseObj.scenarios || data.cards || data.scenarios || [];
      const sectionsList = responseObj.sections || data.sections || [];
      const quickRepliesList =
        (data.actions && data.actions.length > 0)
          ? data.actions.map((a) => (typeof a === "object" ? a.label : a))
          : (data.quick_replies || [
              "Quote status",
              "Can I get a better discount?",
              "Delivery estimate",
            ]);

      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: "bot",
        text: rawText || "I've analyzed your deal context. Let me know how else I can assist with this quotation.",
        intent: data.primary_intent || data.intent,
        confidence: data.confidence,
        cards: scenariosList,
        sections: sectionsList,
        requiresConfirmation: Boolean(data.pending_proposal || data.requires_confirmation || data.pending_action || responseObj.type === "CONFIRMATION"),
        pendingAction: data.pending_proposal || data.pending_action || null,
        quickReplies: quickRepliesList,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          sender: "bot",
          text: "I encountered an issue connecting to the AI intelligence engine. Please try again shortly.",
          quickReplies: ["Quote status", "Can I get a better discount?"],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleConfirmAction = async (msgId, actionPayload) => {
    setIsTyping(true);
    try {
      const res = await chatApi.confirmAction({
        conversation_id: conversationId,
        quote_id: quoteId,
        action_payload: actionPayload,
      });

      if (res.data?.success) {
        showToast?.({
          title: "Proposal Confirmed!",
          message: "The quote changes have been safely committed to the database.",
          type: "success",
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `bot_confirm_${Date.now()}`,
            sender: "bot",
            text: "Negotiation Request Confirmed & Submitted!\n\nThe quotation has been updated in the database. If approval was required, it has been automatically routed to the sales leadership queue.",
            quickReplies: ["View updated quote", "Check approval status"],
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      showToast?.({
        title: "Execution Error",
        message: err.message,
        type: "error",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleCancelAction = async () => {
    try {
      await chatApi.cancelAction({ conversation_id: conversationId });
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_cancel_${Date.now()}`,
          sender: "bot",
          text: "Cancelled. Your original quote remains unchanged. Let me know what else I can help with!",
          quickReplies: ["Can I get a better discount?", "Delivery estimate"],
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectScenario = (scenario) => {
    const text = `I choose Option: ${scenario.name || scenario.label || `${scenario.discount_percent}% discount`}`;
    handleSendMessage(text);
  };

  return (
    <div className="df-chatbot-root">
      {/* ── Toggle Button ── */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          setIsMinimized(false);
        }}
        className="df-chat-toggle-btn"
        aria-label="Toggle DealFlow Assistant"
      >
        {isOpen ? <X size={24} /> : <Bot size={26} />}
        {!isOpen && <span className="df-chat-badge">1</span>}
      </button>

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className={`df-chat-popup ${isMinimized ? "minimized" : ""}`}>
          {/* Header */}
          <div
            className="df-chat-header"
            onClick={() => isMinimized && setIsMinimized(false)}
            style={{ cursor: isMinimized ? "pointer" : "default" }}
          >
            <div className="df-chat-header-left">
              <div className="df-chat-avatar">
                <Bot size={20} />
                <span className="df-status-dot-pulse"></span>
              </div>
              <div className="df-chat-header-info">
                <h4>DealFlow Assistant</h4>
                <p>Online • Ready to help</p>
              </div>
            </div>

            <div className="df-chat-header-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized((prev) => !prev);
                }}
                className="df-chat-header-btn"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                <Minus size={15} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="df-chat-header-btn"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Status Bar */}
          {!isMinimized && (
            <div className="df-status-bar">
              <div className="df-status-indicator">
                <span className="df-status-dot-small"></span>
                <span>All systems operational</span>
              </div>
              <div className="df-status-realtime">
                <Zap size={12} />
                <span>Real-time</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {!isMinimized && (
            <div className="df-chat-body">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`df-message-row ${msg.sender === "user" ? "user" : "bot"}`}
                >
                  {msg.sender === "bot" && (
                    <div className="df-msg-avatar bot">
                      <Bot size={17} />
                    </div>
                  )}

                  <div className={`df-msg-bubble ${msg.sender === "user" ? "user" : "bot"}`}>
                    <p style={{ margin: 0, whiteSpace: "pre-line" }}>{msg.text}</p>

                    {/* Structured Sections / Metrics */}
                    {msg.sections && msg.sections.length > 0 && (
                      <div className="df-sections-list" style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {msg.sections.map((sec, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "rgba(255,255,255,0.7)",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              border: "1px solid rgba(226,232,240,0.8)",
                            }}
                          >
                            <span style={{ color: "#475569", fontWeight: 500 }}>{sec.label}</span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              {sec.current && <span style={{ color: "#94a3b8", textDecoration: "line-through" }}>{sec.current}</span>}
                              <strong style={{ color: sec.status === "warning" ? "#d97706" : sec.status === "critical" ? "#dc2626" : "#4338ca" }}>
                                {sec.proposed || sec.value || ""}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scenario Cards */}
                    {msg.cards && msg.cards.length > 0 && (
                      <div>
                        {msg.cards.map((card, idx) => (
                          <div key={idx} className="df-scenario-card">
                            <div className="df-scenario-header">
                              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4338ca" }}>
                                <Layers size={14} />
                                {card.title || card.label || `Option ${idx + 1}`}
                              </span>
                              {card.badge && (
                                <span className="df-scenario-badge">{card.badge}</span>
                              )}
                            </div>

                            <div className="df-scenario-grid">
                              {card.discount_percent !== undefined && (
                                <div>Discount: <strong>{card.discount_percent}%</strong></div>
                              )}
                              {card.delivery_date && (
                                <div>Delivery: <strong>{card.delivery_date}</strong></div>
                              )}
                              {card.margin_percent !== undefined && (
                                <div>Margin: <strong>{Number(card.margin_percent).toFixed(1)}%</strong></div>
                              )}
                              {card.approval_required !== undefined && (
                                <div>
                                  Approval:{" "}
                                  <strong style={{ color: card.approval_required ? "#d97706" : "#059669" }}>
                                    {card.approval_required ? "Required" : "Not Required"}
                                  </strong>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleSelectScenario(card)}
                              className="df-scenario-btn"
                            >
                              <span>Choose this option</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confirmation Prompt */}
                    {msg.requiresConfirmation && msg.pendingAction && (
                      <div className="df-confirm-box">
                        <div className="df-confirm-title">
                          <AlertTriangle size={15} />
                          <span>Confirmation Required</span>
                        </div>
                        <div className="df-confirm-text">
                          Submit this negotiation request into the system?
                        </div>
                        <div className="df-confirm-actions">
                          <button
                            onClick={() => handleConfirmAction(msg.id, msg.pendingAction)}
                            className="df-confirm-btn"
                          >
                            <CheckCircle2 size={14} />
                            <span>Confirm Request</span>
                          </button>
                          <button
                            onClick={handleCancelAction}
                            className="df-cancel-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="df-msg-timestamp">
                      <Clock size={11} />
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  {msg.sender === "user" && (
                    <div className="df-msg-avatar user">
                      <User size={17} />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="df-typing-indicator">
                  <div className="df-msg-avatar bot">
                    <Bot size={17} />
                  </div>
                  <div className="df-typing-bubble">
                    <Loader2 size={13} style={{ color: "#818cf8", animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginRight: "4px" }}>
                      Thinking
                    </span>
                    <div className="df-typing-dots">
                      <span className="df-typing-dot"></span>
                      <span className="df-typing-dot"></span>
                      <span className="df-typing-dot"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Quick Replies */}
          {!isMinimized && (
            <div className="df-quick-replies-wrap">
              {messages[messages.length - 1]?.quickReplies?.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(reply)}
                  className="df-quick-chip"
                >
                  {getChipIcon(reply)}
                  <span>{reply}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          {!isMinimized && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="df-chat-footer"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about discounts, delivery, quotes..."
                className="df-chat-input"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="df-chat-send-btn"
                title="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default DealFlowChatbot;
