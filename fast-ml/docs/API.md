# DealFlow360 — Customer Chatbot REST API Reference

## Endpoints

### 1. Process Conversational Turn
- **Route**: `POST /api/v1/intelligence/customer-chat`
- **Request Payload**:
```json
{
  "conversation_id": "conv_12345",
  "deal_id": "DEAL-1001",
  "customer_id": "CUST-101",
  "message": "Can I get 15% discount?"
}
```
- **Response Structure**:
```json
{
  "conversation_id": "conv_12345",
  "deal_id": "DEAL-1001",
  "state": "WAITING_FOR_CONFIRMATION",
  "primary_intent": "DISCOUNT_REQUEST",
  "intents": [
    {
      "name": "DISCOUNT_REQUEST",
      "confidence": 0.89
    }
  ],
  "entities": {
    "discount_percent": {
      "value": 15.0,
      "normalized_value": 15.0,
      "source_text": "15%",
      "confidence": 0.99,
      "entity_type": "DISCOUNT_PERCENT"
    }
  },
  "response": {
    "type": "CONFIRMATION",
    "message": "At 15.0% discount, the quotation total becomes $440,000.00 (estimated margin: 15.8%). Would you like me to submit the 15.0% request?",
    "sections": [
      {
        "label": "Discount",
        "current": "12.0%",
        "proposed": "15.0%"
      },
      {
        "label": "Quotation Total",
        "current": "$455,000.00",
        "proposed": "$440,000.00"
      },
      {
        "label": "Estimated Margin",
        "current": "19.2%",
        "proposed": "15.8%"
      },
      {
        "label": "Governance & Approval",
        "value": "Auto-Approved",
        "status": "normal"
      }
    ]
  },
  "actions": [
    {
      "id": "confirm_discount",
      "label": "Submit 15.0% Request",
      "requires_confirmation": true
    },
    {
      "id": "cancel_discount",
      "label": "Keep 12.0%"
    }
  ],
  "pending_proposal": {
    "id": "prop_discount_15",
    "title": "Apply 15.0% Discount Request",
    "type": "DISCOUNT_MUTATION",
    "discount_percent": 15.0,
    "approval_level": "None"
  },
  "latency_ms": 12.4
}
```

---

### 2. Confirm Staged Proposal
- **Route**: `POST /api/v1/intelligence/customer-chat/confirm`
- **Request Payload**:
```json
{
  "conversation_id": "conv_12345"
}
```
- **Response**:
```json
{
  "success": true,
  "status": "MUTATION_DISPATCHED",
  "deal_id": "DEAL-1001",
  "confirmed_action": {
    "id": "prop_discount_15",
    "discount_percent": 15.0
  },
  "message": "Quotation change confirmed. Forwarded to Node.js for database execution."
}
```

---

### 3. Cancel Staged Proposal
- **Route**: `POST /api/v1/intelligence/customer-chat/cancel`
- **Request Payload**:
```json
{
  "conversation_id": "conv_12345"
}
```
- **Response**:
```json
{
  "success": true,
  "status": "CANCELLED",
  "message": "Pending proposal cancelled. Quotation remains unchanged."
}
```

---

### 4. Health Check
- **Route**: `GET /api/v1/intelligence/customer-chat/health`
- **Response**:
```json
{
  "status": "HEALTHY",
  "service": "dealflow360-customer-chat",
  "intent_model_loaded": true,
  "classes_count": 16
}
```
