import React, { useState, useEffect, useRef } from "react";
import { chatApi } from "../../api";
import { useToast } from "../../context/ToastContext";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  Percent,
  Truck,
  RotateCcw,
  Layers,
  ChevronRight,
} from "lucide-react";

const DealFlowChatbot = ({ quoteId = null, customerId = null, initialContext = {} }) => {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hi there! I'm your DealFlow Assistant. I evaluate quotes, negotiate discounts, verify logistics, and check approvals in real time.",
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isTyping) return;

    // 1. Append User Message
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
      // 2. Call Node.js backend which proxies to Flask Intelligence Engine
      const res = await chatApi.sendMessage({
        conversation_id: conversationId,
        message: query,
        quote_id: quoteId,
        customer_id: customerId,
        context_override: initialContext,
      });

      const data = res.data;

      // 3. Format Bot Message
      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: "bot",
        text: data.reply_text || data.message || "I processed your request.",
        intent: data.intent,
        confidence: data.confidence,
        cards: data.cards || [],
        requiresConfirmation: data.requires_confirmation || false,
        pendingAction: data.pending_action || null,
        quickReplies: data.quick_replies || [
          "Quote status",
          "Can I get a better discount?",
          "Delivery estimate",
        ],
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
          text: "I'm having trouble connecting to the intelligence engine. Please try again shortly.",
          quickReplies: ["Try again", "Quote status"],
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
          title: "Deal Request Confirmed!",
          message: "The quote changes have been safely committed into the system database.",
          type: "success",
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `bot_confirm_${Date.now()}`,
            sender: "bot",
            text: "✅ **Negotiation Request Confirmed & Submitted!**\n\nThe quotation has been updated in the database. If approval was required, it has been automatically routed to the sales leadership queue.",
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
          text: "👍 Cancelled. Your current quote remains unchanged. Let me know what else I can help with!",
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
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-[#4338ca] text-white shadow-xl shadow-[#4338ca]/30 hover:bg-[#3730a3] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center text-2xl relative"
        aria-label="Toggle DealFlow Assistant"
        style={{ backgroundColor: "var(--color-accent, #4338ca)" }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Chat Popup Container */}
      {isOpen && (
        <div
          className="absolute bottom-20 right-0 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          style={{
            height: "560px",
            backgroundColor: "var(--color-paper-1, #ffffff)",
            borderColor: "var(--color-border-subtle, #e2e8f0)",
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-base font-bold shadow-inner">
                <Sparkles className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm tracking-wide">DealFlow Assistant</h3>
                <p className="text-indigo-200 text-xs flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  AI Deal Intelligence • Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3.5 chat-scroll"
            style={{ backgroundColor: "var(--color-paper-0, #f8fafc)" }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
              >
                {msg.sender === "bot" && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold shadow-sm"
                    style={{
                      backgroundColor: "var(--color-accent-subtle, #eef2ff)",
                      color: "var(--color-accent, #4338ca)",
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm space-y-2.5 ${
                    msg.sender === "user"
                      ? "bg-[#4338ca] text-white rounded-tr-none"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                  }`}
                  style={
                    msg.sender === "user"
                      ? { backgroundColor: "var(--color-accent, #4338ca)", color: "#ffffff" }
                      : {
                          backgroundColor: "var(--color-paper-1, #ffffff)",
                          borderColor: "var(--color-border-subtle, #e2e8f0)",
                          color: "var(--color-text-primary, #0f172a)",
                        }
                  }
                >
                  <p className="whitespace-pre-line leading-relaxed text-[13px]">{msg.text}</p>

                  {/* Render Structured Scenario Cards */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
                      {msg.cards.map((card, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-900">
                            <span className="flex items-center gap-1.5 text-indigo-700">
                              <Layers className="w-3.5 h-3.5" />
                              {card.title || card.label || `Option ${idx + 1}`}
                            </span>
                            {card.badge && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                                {card.badge}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                            {card.discount_percent !== undefined && (
                              <div>
                                Discount:{" "}
                                <strong className="text-slate-900">{card.discount_percent}%</strong>
                              </div>
                            )}
                            {card.delivery_date && (
                              <div>
                                Delivery:{" "}
                                <strong className="text-slate-900">{card.delivery_date}</strong>
                              </div>
                            )}
                            {card.margin_percent !== undefined && (
                              <div>
                                Margin:{" "}
                                <strong className="text-slate-900">
                                  {Number(card.margin_percent).toFixed(1)}%
                                </strong>
                              </div>
                            )}
                            {card.approval_required !== undefined && (
                              <div>
                                Approval:{" "}
                                <strong
                                  className={
                                    card.approval_required ? "text-amber-600" : "text-emerald-600"
                                  }
                                >
                                  {card.approval_required ? "Required" : "Not Required"}
                                </strong>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleSelectScenario(card)}
                            className="w-full mt-1.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-medium rounded-lg text-center transition-colors text-[11px] flex items-center justify-center gap-1"
                          >
                            <span>Choose this option</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render Explicit Confirmation Buttons */}
                  {msg.requiresConfirmation && msg.pendingAction && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                        <p className="font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Confirmation Required
                        </p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Would you like to submit this negotiation request into the system?
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleConfirmAction(msg.id, msg.pendingAction)}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs shadow-sm transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm Request
                        </button>
                        <button
                          onClick={handleCancelAction}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-right opacity-60 mt-1">
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                  style={{
                    backgroundColor: "var(--color-accent-subtle, #eef2ff)",
                    color: "var(--color-accent, #4338ca)",
                  }}
                >
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
                    <span
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></span>
                    <span
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          <div
            className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0"
            style={{
              backgroundColor: "var(--color-paper-1, #ffffff)",
              borderColor: "var(--color-border-subtle, #e2e8f0)",
            }}
          >
            {messages[messages.length - 1]?.quickReplies?.map((reply, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(reply)}
                className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors font-medium flex-shrink-0"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0"
            style={{
              backgroundColor: "var(--color-paper-1, #ffffff)",
              borderColor: "var(--color-border-subtle, #e2e8f0)",
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about discounts, delivery, quotes..."
              className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#4338ca] focus:border-transparent transition-shadow text-slate-800"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="w-9 h-9 rounded-full bg-[#4338ca] text-white hover:bg-[#3730a3] disabled:opacity-40 transition-colors flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: "var(--color-accent, #4338ca)" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default DealFlowChatbot;
