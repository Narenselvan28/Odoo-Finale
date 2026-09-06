let rateLimit;
try {
  rateLimit = require("express-rate-limit").rateLimit || require("express-rate-limit");
} catch (e) {
  // Graceful passthrough fallback
  rateLimit = () => (req, res, next) => next();
}

// Tier 1: Brute-Force Protection on Authentication (Login, Register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication attempts per window
  standardHeaders: "draft-7",
  legacyHeaders: true,
  message: {
    success: false,
    message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
    retryAfterMinutes: 15,
  },
});

// Tier 2: Public Customer Portal Negotiation Anti-Spam
const publicPortalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 portal requests per window
  standardHeaders: "draft-7",
  legacyHeaders: true,
  message: {
    success: false,
    message: "Too many portal submissions from this IP. Please slow down.",
    retryAfterMinutes: 15,
  },
});

// Tier 3: Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  standardHeaders: "draft-7",
  legacyHeaders: true,
  message: {
    success: false,
    message: "DealFlow 360 API rate limit exceeded. Please try again later.",
  },
});

module.exports = {
  authLimiter,
  publicPortalLimiter,
  apiLimiter,
};
