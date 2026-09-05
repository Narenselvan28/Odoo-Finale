"""
DealFlow360 - Hybrid Entity & Slot Extraction Engine
Combines Regex patterns, RapidFuzz fuzzy matching, dateparser, and domain catalogs
to deterministically extract and normalize quotation entities.
"""

import re
import dateparser
from typing import Dict, Any, List, Optional
from rapidfuzz import process, fuzz
from chatbot.schemas import ExtractedEntity

# Domain catalogs
KNOWN_PRODUCTS = [
    {"id": "PROD-LAPTOP-PRO", "name": "Enterprise ThinkPad Laptop", "aliases": ["laptop", "laptops", "thinkpad", "notebook", "pc"]},
    {"id": "PROD-SERVER-RACK", "name": "CloudRack Server Blade", "aliases": ["server", "servers", "blade", "rack"]},
    {"id": "PROD-MONITOR-4K", "name": "UltraSharp 27-inch 4K Monitor", "aliases": ["monitor", "monitors", "screen", "display"]},
    {"id": "PROD-WARRANTY-EXT", "name": "3-Year Extended Premier Warranty", "aliases": ["warranty", "extended warranty", "service plan", "support plan"]},
    {"id": "PROD-SETUP-ONBOARD", "name": "White-Glove Onboarding & Setup", "aliases": ["setup", "onboarding", "installation", "white glove", "white-glove"]}
]

REASON_KEYWORDS = {
    "COMPETITOR_PRICING": ["competitor", "competing", "another supplier", "another vendor", "cheaper elsewhere", "other quote", "lower price from"],
    "BUDGET_CONSTRAINT": ["budget", "funds", "spending limit", "fiscal", "cap", "tight budget", "affordable", "cannot afford", "expensive"],
    "BULK_ORDER": ["bulk", "volume", "large quantity", "high volume", "many units", "order 100", "order 500"],
    "LONG_TERM_PARTNERSHIP": ["long term", "long-term", "partnership", "future orders", "reorder", "quarterly orders"],
    "DELIVERY_REQUIREMENT": ["urgent", "deadline", "fast shipping", "tight timeline", "need it soon"],
    "PRICE_CONCERN": ["too high", "costly", "overpriced", "price is high", "lower the price"]
}

WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "fifteen": 15, "eighteen": 18, "twenty": 20, "twenty-five": 25, "thirty": 30, "fifty": 50, "hundred": 100
}


class EntityExtractor:
    """Production hybrid entity extractor for sales quotation domain."""

    @classmethod
    def extract_all(cls, text: str, deal_context: Optional[Dict[str, Any]] = None) -> Dict[str, ExtractedEntity]:
        """Runs all entity extractors and returns normalized dictionary of ExtractedEntity."""
        entities: Dict[str, ExtractedEntity] = {}
        clean_text = text.strip()

        # 1. Discount Percentage
        discount = cls._extract_discount_percent(clean_text)
        if discount:
            entities["discount_percent"] = discount

        # 2. Money Amount & Currency
        money = cls._extract_money(clean_text)
        if money:
            entities["money_amount"] = money["money_amount"]
            if "currency" in money:
                entities["currency"] = money["currency"]

        # 3. Quantity
        qty = cls._extract_quantity(clean_text)
        if qty:
            entities["quantity"] = qty

        # 4. Delivery Date & Timeframe
        delivery_date = cls._extract_delivery_date(clean_text)
        if delivery_date:
            entities["delivery_date"] = delivery_date

        delivery_timeframe = cls._extract_delivery_timeframe(clean_text)
        if delivery_timeframe:
            entities["delivery_timeframe"] = delivery_timeframe

        # 5. Confirmation / Negation
        conf = cls._extract_confirmation(clean_text)
        if conf:
            entities["confirmation"] = conf

        neg = cls._extract_negation(clean_text)
        if neg:
            entities["negation"] = neg

        # 6. Product Extraction (Fuzzy + Catalog)
        prod = cls._extract_product(clean_text, deal_context)
        if prod:
            entities["product_name"] = prod["product_name"]
            if "product_id" in prod:
                entities["product_id"] = prod["product_id"]

        # 7. Quote ID
        quote_id = cls._extract_quote_id(clean_text)
        if quote_id:
            entities["quote_id"] = quote_id

        # 8. Option Reference (e.g. Option A, Option 1, Scenario 2)
        opt_ref = cls._extract_option_reference(clean_text)
        if opt_ref:
            entities["option_reference"] = opt_ref

        # 9. Negotiation Reason
        reason = cls._extract_negotiation_reason(clean_text)
        if reason:
            entities["customer_reason"] = reason

        # 10. Change Type
        change_type = cls._extract_change_type(clean_text)
        if change_type:
            entities["change_type"] = change_type

        return entities

    @classmethod
    def _extract_discount_percent(cls, text: str) -> Optional[ExtractedEntity]:
        # Regex for numbers followed by % or percent or "off"
        pct_pattern = r"(?:(?:discount|off|reduce by|cut by)\s*)?(\d{1,2}(?:\.\d+)?)\s*(?:%|percent|pct)"
        match = re.search(pct_pattern, text, re.IGNORECASE)
        if match:
            val = float(match.group(1))
            if 0 < val <= 100:
                return ExtractedEntity(
                    value=val,
                    normalized_value=val,
                    source_text=match.group(0),
                    confidence=0.99,
                    entity_type="DISCOUNT_PERCENT"
                )

        # Word numbers e.g. "fifteen percent"
        for word, num in WORD_TO_NUM.items():
            if re.search(rf"\b{word}\s*(?:%|percent|pct|percent off)\b", text, re.IGNORECASE):
                return ExtractedEntity(
                    value=float(num),
                    normalized_value=float(num),
                    source_text=word,
                    confidence=0.95,
                    entity_type="DISCOUNT_PERCENT"
                )
        return None

    @classmethod
    def _extract_money(cls, text: str) -> Optional[Dict[str, ExtractedEntity]]:
        # e.g. "$500", "500 USD", "2000 dollars", "Rs 5000", "5000 INR"
        money_pattern = r"(\$|€|£|₹|Rs\.?|USD|INR|EUR|GBP)?\s*(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)\s*(USD|INR|EUR|GBP|dollars|rupees|bucks)?"
        matches = list(re.finditer(money_pattern, text, re.IGNORECASE))
        for m in matches:
            curr_prefix = m.group(1)
            num_str = m.group(2).replace(",", "")
            curr_suffix = m.group(3)

            # Skip if matched a plain number without any currency indicator
            if not curr_prefix and not curr_suffix:
                continue

            amt = float(num_str)
            curr = "USD"
            if curr_prefix in ("₹", "Rs", "Rs.") or (curr_suffix and "rupee" in curr_suffix.lower()) or (curr_suffix and curr_suffix.upper() == "INR"):
                curr = "INR"
            elif curr_prefix == "€" or (curr_suffix and curr_suffix.upper() == "EUR"):
                curr = "EUR"
            elif curr_prefix == "£" or (curr_suffix and curr_suffix.upper() == "GBP"):
                curr = "GBP"

            return {
                "money_amount": ExtractedEntity(
                    value=amt,
                    normalized_value=amt,
                    source_text=m.group(0),
                    confidence=0.98,
                    entity_type="MONEY_AMOUNT"
                ),
                "currency": ExtractedEntity(
                    value=curr,
                    normalized_value=curr,
                    source_text=curr_prefix or curr_suffix or curr,
                    confidence=0.98,
                    entity_type="CURRENCY"
                )
            }
        return None

    @classmethod
    def _extract_quantity(cls, text: str) -> Optional[ExtractedEntity]:
        # e.g. "20 units", "buy 50", "quantity to 100", "order 20 laptops"
        qty_pattern = r"(?:quantity|qty|order|buy|purchase|units?|items?|pieces?|laptops?|monitors?|servers?)\s*(?:of|to|is|:)?\s*(\d{1,5})|(\d{1,5})\s*(?:units?|items?|pcs|pieces?|laptops?|monitors?|servers?)"
        match = re.search(qty_pattern, text, re.IGNORECASE)
        if match:
            raw_val = match.group(1) or match.group(2)
            if raw_val:
                val = int(raw_val)
                return ExtractedEntity(
                    value=val,
                    normalized_value=val,
                    source_text=match.group(0),
                    confidence=0.96,
                    entity_type="QUANTITY"
                )
        return None

    @classmethod
    def _extract_delivery_date(cls, text: str) -> Optional[ExtractedEntity]:
        # e.g. "by Friday", "next week", "September 15", "tomorrow", "within 3 days"
        date_pattern = r"(?:by|before|on|arrive|receive|deliver(?:y|ed)?\s*by|until)\s+([A-Za-z0-9\s,\-\/]+?)(?:\s+(?:please|without fail|urgently|$)|[,\.\?!]|$)"
        match = re.search(date_pattern, text, re.IGNORECASE)
        candidate_text = match.group(1).strip() if match else text

        parsed_dt = dateparser.parse(
            candidate_text,
            settings={"PREFER_DATES_FROM": "future", "RETURN_AS_TIMEZONE_AWARE": False}
        )

        if parsed_dt:
            iso_date = parsed_dt.strftime("%Y-%m-%d")
            return ExtractedEntity(
                value=iso_date,
                normalized_value=iso_date,
                source_text=candidate_text,
                confidence=0.92,
                entity_type="DELIVERY_DATE"
            )

        # Check relative weekday tokens directly
        weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "tomorrow", "next week"]
        for w in weekdays:
            if re.search(rf"\b{w}\b", text, re.IGNORECASE):
                parsed = dateparser.parse(w, settings={"PREFER_DATES_FROM": "future"})
                iso_val = parsed.strftime("%Y-%m-%d") if parsed else w
                return ExtractedEntity(
                    value=iso_val,
                    normalized_value=iso_val,
                    source_text=w,
                    confidence=0.90,
                    entity_type="DELIVERY_DATE"
                )
        return None

    @classmethod
    def _extract_delivery_timeframe(cls, text: str) -> Optional[ExtractedEntity]:
        # e.g. "in 3 days", "within 5 days", "overnight", "48 hours"
        pattern = r"\b(?:within|in)\s+(\d{1,2})\s*(?:days?|hours?)\b|\b(overnight|rush|expedited)\b"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return ExtractedEntity(
                value=match.group(0),
                normalized_value=match.group(0).lower(),
                source_text=match.group(0),
                confidence=0.92,
                entity_type="DELIVERY_TIMEFRAME"
            )
        return None

    @classmethod
    def _extract_confirmation(cls, text: str) -> Optional[ExtractedEntity]:
        # Explicit confirmation
        pattern = r"\b(yes|confirm|proceed|submit|accept|agree|lock in|go ahead|apply this|yes please)\b"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return ExtractedEntity(
                value=True,
                normalized_value=True,
                source_text=match.group(0),
                confidence=0.98,
                entity_type="CONFIRMATION"
            )
        return None

    @classmethod
    def _extract_negation(cls, text: str) -> Optional[ExtractedEntity]:
        # Explicit negation/cancellation
        pattern = r"\b(no|cancel|decline|reject|abort|keep current|nevermind|dont apply|don't apply)\b"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return ExtractedEntity(
                value=True,
                normalized_value=True,
                source_text=match.group(0),
                confidence=0.98,
                entity_type="NEGATION"
            )
        return None

    @classmethod
    def _extract_product(cls, text: str, deal_context: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, ExtractedEntity]]:
        # Match against known catalog and deal context
        best_match = None
        highest_score = 0

        for prod in KNOWN_PRODUCTS:
            for alias in prod["aliases"] + [prod["name"]]:
                score = fuzz.partial_ratio(alias.lower(), text.lower())
                if score > highest_score and score >= 75:
                    highest_score = score
                    best_match = (prod, alias)

        if best_match:
            prod_info, alias_matched = best_match
            return {
                "product_name": ExtractedEntity(
                    value=prod_info["name"],
                    normalized_value=prod_info["name"],
                    source_text=alias_matched,
                    confidence=round(highest_score / 100.0, 2),
                    entity_type="PRODUCT_NAME"
                ),
                "product_id": ExtractedEntity(
                    value=prod_info["id"],
                    normalized_value=prod_info["id"],
                    source_text=alias_matched,
                    confidence=round(highest_score / 100.0, 2),
                    entity_type="PRODUCT_ID"
                )
            }
        return None

    @classmethod
    def _extract_quote_id(cls, text: str) -> Optional[ExtractedEntity]:
        pattern = r"\b(DEAL-\d{3,6}|QUOTE-\d{3,6}|ORD-\d{3,6})\b"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return ExtractedEntity(
                value=match.group(1).upper(),
                normalized_value=match.group(1).upper(),
                source_text=match.group(1),
                confidence=0.99,
                entity_type="QUOTE_ID"
            )
        return None

    @classmethod
    def _extract_option_reference(cls, text: str) -> Optional[ExtractedEntity]:
        pattern = r"\b(?:option|scenario)\s*([A-Za-z0-9])\b"
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            opt = match.group(1).upper()
            return ExtractedEntity(
                value=f"OPTION_{opt}",
                normalized_value=f"OPTION_{opt}",
                source_text=match.group(0),
                confidence=0.95,
                entity_type="OPTION_REFERENCE"
            )
        return None

    @classmethod
    def _extract_negotiation_reason(cls, text: str) -> Optional[ExtractedEntity]:
        for category, kws in REASON_KEYWORDS.items():
            for kw in kws:
                if kw in text.lower():
                    return ExtractedEntity(
                        value=category,
                        normalized_value=category,
                        source_text=text,
                        confidence=0.92,
                        entity_type="CUSTOMER_REASON"
                    )
        return None

    @classmethod
    def _extract_change_type(cls, text: str) -> Optional[ExtractedEntity]:
        lower = text.lower()
        if "remove" in lower or "delete" in lower or "drop" in lower:
            return ExtractedEntity(
                value="REMOVE_PRODUCT",
                normalized_value="REMOVE_PRODUCT",
                source_text=text,
                confidence=0.90,
                entity_type="CHANGE_TYPE"
            )
        elif "add" in lower or "include" in lower or "attach" in lower:
            return ExtractedEntity(
                value="ADD_PRODUCT",
                normalized_value="ADD_PRODUCT",
                source_text=text,
                confidence=0.90,
                entity_type="CHANGE_TYPE"
            )
        elif "discount" in lower or "price" in lower or "cheaper" in lower:
            return ExtractedEntity(
                value="DISCOUNT",
                normalized_value="DISCOUNT",
                source_text=text,
                confidence=0.88,
                entity_type="CHANGE_TYPE"
            )
        elif "quantity" in lower or "units" in lower:
            return ExtractedEntity(
                value="QUANTITY",
                normalized_value="QUANTITY",
                source_text=text,
                confidence=0.88,
                entity_type="CHANGE_TYPE"
            )
        return None


# Singleton instance for the application
entity_extractor = EntityExtractor()
