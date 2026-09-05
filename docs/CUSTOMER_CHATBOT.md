# DealFlow360 — Customer Conversational Deal Assistant

## 1. Executive Summary & Philosophy
The **DealFlow360 Customer Deal Assistant** is a customer-facing conversational decision interface to DealFlow360's governed sales intelligence platform.

### Core Principle
```
CUSTOMER MESSAGE
       ↓
INTENT CLASSIFIER (Sentence-Transformers + LogisticRegression)
       ↓
HYBRID ENTITY EXTRACTION (Regex + RapidFuzz + dateparser + Catalog)
       ↓
ACTION PLANNER & DECISION SEARCH
       ↓
GOVERNED INTELLIGENCE ENGINES
 ├── Rule Engine
 ├── XGBoost Discount Regressor
 ├── XGBoost Risk Classifier
 ├── What-If Deal Simulator
 ├── Multi-Depot Fulfillment Logistics
 ├── Behavioral Business Memory
 ├── Actionable Deal Health
 └── Why / Why-Not Explainability
       ↓
STRUCTURED CARD & SCENARIO RESPONSE
       ↓
CUSTOMER REVIEWS
       ↓
EXPLICIT CONFIRMATION (PROPOSE → EXPLAIN → CONFIRM → EXECUTE)
       ↓
NODE.JS SYSTEM OF RECORD (Primary DB Mutation)
```

---

## 2. 16 Supported Enterprise Intents
| Intent | Description | Sample Utterance | Target Engine |
|---|---|---|---|
| `QUOTE_SUMMARY` | High-level quote and terms overview | "Summarize my quotation." | Pricing + Fulfillment |
| `QUOTE_PRICE_BREAKDOWN` | Itemized charges, taxes, discounts, margins | "Why is the total so high?" | Pricing Simulator |
| `PRODUCT_INFORMATION` | Hardware specs, warranty, service terms | "What is included with warranty?" | Product Catalog |
| `DELIVERY_STATUS` | Fulfillment timeframe, carrier route, SLA | "When will I receive this?" | Fulfillment Simulator |
| `DELIVERY_REQUEST` | Specific deadline or expedited shipping | "Can you deliver by Friday?" | Fulfillment Simulator |
| `DISCOUNT_REQUEST` | Commercial discount concession | "Can I get 15% off?" | XGBoost ML + Rule Engine |
| `DISCOUNT_IMPACT` | Consequences on margin, governance, approval | "What happens at 18% discount?" | What-If Simulator |
| `WHAT_IF_SCENARIO` | Multi-parameter simulation | "What if I buy 50 instead of 10?" | What-If Simulator |
| `BETTER_DEAL` | **Primary Differentiator**: Feasible decision space search | "Can you make this cheaper?" | Feasible Scenario Generator |
| `PRODUCT_ALTERNATIVE` | Lower-cost substitute hardware configurations | "Is there a cheaper laptop option?" | Catalog Recommendation |
| `NEGOTIATION_REASON` | Capture commercial justification | "A competitor offered 10% lower price." | Business Memory |
| `APPROVAL_STATUS` | Customer-safe review status and turnaround | "Who is reviewing my request?" | Governance Engine |
| `NEGOTIATION_STATUS` | Rounds of negotiation and previous counter-offers | "Where do we stand on price?" | Negotiation Tracker |
| `WHAT_CAN_I_CHANGE` | Levers available for customer customization | "What can I negotiate on this deal?" | Parameter Registry |
| `CONFIRM_QUOTATION` | Explicit acceptance of staged proposal | "Yes, submit the 15% request." | Node.js Dispatcher |
| `GENERAL_HELP` | Capability discovery and quick action shortcuts | "Hello, what can you help me with?" | Response Builder |

---

## 3. The Killer Feature: "Find a Better Deal"
When a customer asks *"This is too expensive. Can you make it cheaper, but I still need it by Friday?"*, the assistant does not guess or offer arbitrary discounts.

It conducts an in-memory search across the feasible compromise space:
1. **Option A (Fast-Track Value)**: Moderate discount (e.g. 14%), standard delivery, healthy margin, auto-approved without governance review.
2. **Option B (Maximum Savings)**: High discount (e.g. 17.5%), 5-day delivery, requires sales director sign-off.
3. **Option C (Volume Tier)**: Increased quantity (+100 units), lower unit cost, justifies preferred commercial tier.

Each option is presented with transparent trade-offs (price vs. speed vs. approval burden).

---

## 4. Human Confirmation & Mutation Safety
- **Flask Never Mutates the Primary Business DB directly**: Flask produces structured proposals with audit metadata.
- **Node.js Gateway Authorization**: Node.js validates quotation ownership, user authentication, and dispatches the database mutation only upon explicit customer confirmation (`POST /confirm`).
