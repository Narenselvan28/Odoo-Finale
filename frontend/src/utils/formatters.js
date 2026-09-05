/**
 * formatters.js
 * Standard Indian Currency (₹) and compact number formatting utilities.
 */

/**
 * Formats a number with Indian numbering commas (Lakhs, Crores).
 * e.g. 1540200.50 -> "15,40,200.50"
 */
export const formatINR = (val, decimals = 2) => {
  const num = Number(val) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Compact Indian currency formatting (₹ Cr, ₹ L, ₹ K).
 * e.g. 47657675 -> "₹4.77 Cr", 350000 -> "₹3.50 L"
 */
export const formatCompactINR = (val) => {
  const num = Number(val) || 0;
  const abs = Math.abs(num);
  if (abs >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `₹${(num / 1000).toFixed(1)} K`;
  }
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

/**
 * Returns formatted currency string with symbol: "₹1,50,000.00"
 */
export const formatCurrencyINR = (val, decimals = 2) => {
  return `₹${formatINR(val, decimals)}`;
};
