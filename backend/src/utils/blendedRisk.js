/**
 * DealFlow360 · Blended Discount Risk Score & Approval Chain Engine
 * Based on Section 10 & 12 of the Specification
 */

const computeBlendedRisk = ({ items = [], customerTier, categories = [] }) => {
  const tierCeiling = Number(customerTier?.max_discount) || 15;
  let totalGross = 0;
  let totalNet = 0;
  let maxLineOverage = 0;
  let weightedOverageSum = 0;
  const lineDetails = [];

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price) || 0;
    const discountPercent = Number(item.discount_percent) || 0;
    const gross = unitPrice * qty;
    const net = gross * (1 - discountPercent / 100);

    // Find category ceiling (default: Hardware 15%, Service 10%, Software 20%)
    let categoryCeiling = tierCeiling;
    if (item.category_id && categories.length > 0) {
      const cat = categories.find((c) => String(c.id) === String(item.category_id));
      if (cat && cat.max_discount != null) {
        categoryCeiling = Number(cat.max_discount);
      }
    } else if (item.category_name) {
      const name = item.category_name.toLowerCase();
      if (name.includes("service")) categoryCeiling = 10;
      else if (name.includes("hardware")) categoryCeiling = 15;
      else if (name.includes("subscription") || name.includes("software")) categoryCeiling = 20;
    }

    const lineOverage = Math.max(0, discountPercent - categoryCeiling);
    if (lineOverage > maxLineOverage) {
      maxLineOverage = lineOverage;
    }

    weightedOverageSum += lineOverage * gross;
    totalGross += gross;
    totalNet += net;

    lineDetails.push({
      product_id: item.product_id,
      discount_percent: discountPercent,
      category_ceiling: categoryCeiling,
      line_overage: lineOverage,
      is_breached: lineOverage > 0,
    });
  }

  const effectiveOrderDiscount =
    totalGross > 0 ? ((totalGross - totalNet) / totalGross) * 100 : 0;
  const tierOverage = Math.max(0, effectiveOrderDiscount - tierCeiling);

  // Blended Risk Score formula: combines single worst breach and portfolio overage spread
  const weightedSpreadOverage = totalGross > 0 ? weightedOverageSum / totalGross : 0;
  const blendedRiskScore = Math.min(
    100,
    Math.round(maxLineOverage * 3.5 + weightedSpreadOverage * 4.0 + tierOverage * 3.0)
  );

  // Determine Approval Chain Requirement
  let requiresApproval = false;
  let requiredLevel = 0;
  let approvalRole = "None";
  let explanation = "Quote concessions comply with category & tier policy ceilings.";

  if (blendedRiskScore >= 30 || maxLineOverage > 8 || tierOverage > 6) {
    requiresApproval = true;
    requiredLevel = 2;
    approvalRole = "Sales Manager + Finance Director";
    explanation = `High-Risk Concession (Score ${blendedRiskScore}/100): Exceeds standard boundaries. Requires Sales Director review followed by Finance Controller sign-off.`;
  } else if (blendedRiskScore > 0 || maxLineOverage > 0 || tierOverage > 0) {
    requiresApproval = true;
    requiredLevel = 1;
    approvalRole = "Sales Manager";
    explanation = `Moderate Exception (Score ${blendedRiskScore}/100): Line discount or tier ceiling exceeded. Requires Sales Director sign-off.`;
  }

  return {
    blendedRiskScore,
    effectiveOrderDiscount,
    tierCeiling,
    maxLineOverage,
    requiresApproval,
    requiredLevel,
    approvalRole,
    explanation,
    lineDetails,
  };
};

module.exports = { computeBlendedRisk };
