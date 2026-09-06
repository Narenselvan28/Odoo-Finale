/**
 * SQL Injection Prevention & Inspection Middleware
 * DealFlow 360 Security Gateway
 */

const SQL_INJECTION_PATTERNS = [
  // 1. Union-based SQL injection
  /\bUNION\s+(ALL\s+)?SELECT\b/i,

  // 2. Boolean-based tautologies (e.g., OR 1=1, ' OR ''=', AND 'a'='a')
  /\b(OR|AND)\s+(['"]?\w+['"]?\s*=\s*['"]?\w+['"]?|[0-9]+\s*=\s*[0-9]+)/i,

  // 3. Multi-statement execution (stacked queries with dangerous verbs)
  /;\s*(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|EXEC|GRANT|REVOKE)\b/i,

  // 4. SQL comment injection
  /(--(\s|$|\+)|(?:\/\*[\s\S]*?\*\/)|#(\s|$))/i,

  // 5. Time-based & blind SQL injection functions
  /\b(SLEEP\s*\([0-9]+\)|BENCHMARK\s*\([0-9]+|LOAD_FILE\s*\(|INTO\s+(OUTFILE|DUMPFILE)\b)/i,

  // 6. Schema/Catalog enumeration attacks
  /\b(INFORMATION_SCHEMA|SYS\.TABLES|SYSOBJECTS|ALL_TAB_COLUMNS)\b/i,
];

/**
 * Deep inspection of values (string, object, array)
 */
const checkValueForSqlInjection = (val) => {
  if (typeof val === "string") {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(val)) {
        return { isMalicious: true, pattern: pattern.toString(), snippet: val.substring(0, 100) };
      }
    }
  } else if (Array.isArray(val)) {
    for (const item of val) {
      const res = checkValueForSqlInjection(item);
      if (res.isMalicious) return res;
    }
  } else if (val !== null && typeof val === "object") {
    for (const key of Object.keys(val)) {
      // Check both key and value
      const keyCheck = checkValueForSqlInjection(key);
      if (keyCheck.isMalicious) return keyCheck;

      const valCheck = checkValueForSqlInjection(val[key]);
      if (valCheck.isMalicious) return valCheck;
    }
  }
  return { isMalicious: false };
};

const sqlInjectionMiddleware = (req, res, next) => {
  // 1. Inspect URL path for SQL injection and enforce integer identifier segments
  try {
    const rawPath = req.originalUrl ? req.originalUrl.split("?")[0] : req.path;
    const decodedPath = decodeURIComponent(rawPath);

    const pathCheck = checkValueForSqlInjection(decodedPath);
    if (pathCheck.isMalicious) {
      console.warn(`🚨 [SECURITY GATEWAY] SQL Injection blocked in URL path: ${pathCheck.snippet} [${req.method} ${req.originalUrl}]`);
      return res.status(400).json({
        error: "MALICIOUS_INPUT_BLOCKED",
        message: "Malicious SQL syntax detected in request URL and rejected.",
      });
    }

    const segments = decodedPath.split("/").filter(Boolean);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].trim();
      const prevSeg = i > 0 ? segments[i - 1].toLowerCase() : "";
      const resourceEndpoints = [
        "quotations", "public", "products", "customers", "users",
        "roles", "categories", "invoices", "warehouses", "approvals",
        "inventory", "discount-rules", "price-lists", "deal-health",
        "deal-events", "alerts", "negotiations", "subscriptions",
        "billing-schedules", "fulfillment-allocations"
      ];
      if (resourceEndpoints.includes(prevSeg) && seg) {
        // Exclude known non-ID action keywords and sub-resource routes
        const actionKeywords = [
          "public", "items", "plans", "evaluate-risk", "status",
          "negotiate", "health", "register", "login", "me", "profile"
        ];
        if (!actionKeywords.includes(seg) && !/^[0-9]+$/.test(seg)) {
          console.warn(`🚨 [SECURITY GATEWAY] Invalid ID or SQL injection attempt in path segment '${seg}' [${req.method} ${req.originalUrl}]`);
          return res.status(400).json({
            error: "INVALID_IDENTIFIER",
            message: `Invalid resource identifier '${seg}'. Identifiers must be positive integers.`,
          });
        }
      }
    }
  } catch (err) {
    // Malformed URI encoding
    return res.status(400).json({
      error: "MALFORMED_URI",
      message: "Malformed URL encoding rejected by security gateway.",
    });
  }

  // 2. Validate route params (:id, :quotation_id, etc. if populated by downstream routers)
  if (req.params) {
    for (const [paramKey, paramVal] of Object.entries(req.params)) {
      if (paramKey.toLowerCase().includes("id") && paramVal !== undefined) {
        if (!/^[0-9]+$/.test(String(paramVal).trim())) {
          return res.status(400).json({
            error: "INVALID_IDENTIFIER",
            message: `Invalid format for route parameter '${paramKey}'. Must be a positive integer.`,
          });
        }
      }
    }
  }

  // 2. Inspect query string parameters
  if (req.query && Object.keys(req.query).length > 0) {
    const queryCheck = checkValueForSqlInjection(req.query);
    if (queryCheck.isMalicious) {
      console.warn(`🚨 [SECURITY GATEWAY] SQL Injection blocked in query params: ${queryCheck.snippet} [${req.method} ${req.originalUrl}]`);
      return res.status(400).json({
        error: "MALICIOUS_INPUT_BLOCKED",
        message: "Malicious SQL syntax detected in request parameters and rejected.",
      });
    }
  }

  // 3. Inspect request body
  if (req.body && typeof req.body === "object") {
    const bodyCheck = checkValueForSqlInjection(req.body);
    if (bodyCheck.isMalicious) {
      console.warn(`🚨 [SECURITY GATEWAY] SQL Injection blocked in request body: ${bodyCheck.snippet} [${req.method} ${req.originalUrl}]`);
      return res.status(400).json({
        error: "MALICIOUS_INPUT_BLOCKED",
        message: "Malicious SQL syntax detected in request payload and rejected.",
      });
    }
  }

  next();
};

module.exports = {
  sqlInjectionMiddleware,
  checkValueForSqlInjection,
};
