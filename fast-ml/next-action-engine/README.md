# DealFlow360 — Machine Learning Next-Action Prediction & Recommendation Engine

A complete, production-ready prototype of an **intelligent, machine-learning-powered Next-Action / Next-Instruction Recommendation Engine** for enterprise sales and ERP operations.

---

## 1. Core Objective & Philosophy

Rather than using rigid, hard-coded `if/else` business rules, this engine **learns probabilistic action sequences directly from historical user session telemetry**.

```
User Action Sequence in ERP:
[ "open_products", "search_laptop", "view_laptop", "purchase_laptop" ]
                                │
                                ▼
               Sequence ML Classification Model
                                │
                                ▼
         Probability Distribution over Candidate Actions:
         - purchase_headphones : 0.62  (High Confidence)
         - purchase_mouse      : 0.22  (Low)
         - purchase_laptop_bag : 0.11  (Low)
                                │
                                ▼
        Two-Stage Decision Layer & Anti-Spam Gate
    (Checks: High Intent? Cooldown Active? Duplicate? Session Limit?)
                                │
                                ▼
     Quiet, Non-Intrusive Bottom-Right Assistant Popup Card
```

---

## 2. System Architecture

```
                       ERP FRONTEND
              (HTML5 + Tailwind CSS + Vanilla JS)
                         │
                         │ 1. Track Action / Telemetry
                         ▼
                Action Tracking API (/api/actions)
                         │
                         ▼
                   Flask Backend
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
      SQLite Storage           ML Inference Pipeline
    (Sessions, Actions,        (Lookback window = 3,
      Feedback Logs)            Random Forest Classifier)
             │                       │
             │                       ▼
             │               Predicted Next Action:
             │               - Probability & Confidence
             │                       │
             └───────────┬───────────┘
                         ▼
          Two-Stage Decision & Anti-Spam Gate
    (Eligible Action? Cooldown? Duplicate? Conf >= 50%?)
                         │
                         ▼
              Recommendation API Response
                         │
                         ▼
         Floating Bottom-Right Assistant Card
     ("Customers who bought this laptop often add headphones.")
                         │
                         ▼
             User Accepts [ Add Headphones ] OR Dismisses [ × ]
                         │
                         ▼
          Feedback Recorded for Model Improvement
```

---

## 3. Directory Structure

```
next-action-engine/
│
├── backend/
│   ├── app.py                     # Flask application server & static hosting
│   ├── config.py                  # Hyperparameters, trigger thresholds & action priorities
│   ├── database.py                # SQLite connection & ERP master data seeders
│   ├── next_action_erp.db         # SQLite persistent database (actions, sessions, feedback)
│   │
│   ├── ml/
│   │   ├── feature_engineering.py # Sequence feature extractor (lookback window = 3)
│   │   ├── train.py               # Model training pipeline (Random Forest sequence classifier)
│   │   ├── predict.py             # Next-action probability inference
│   │   ├── evaluate.py            # Top-1, Top-3, Precision, Recall, F1 evaluation
│   │   └── model_manager.py       # Singleton model cache & lifecycle manager
│   │
│   ├── data/
│   │   ├── generate_dataset.py    # Synthetic ERP user journey generator (4,000 sessions)
│   │   └── action_sequences.csv   # Generated historical sequence dataset
│   │
│   ├── services/
│   │   ├── action_service.py      # Action logging & live dashboard stats
│   │   ├── recommendation_service.py # Two-Stage decision layer & anti-spam cooldowns
│   │   └── explanation_service.py # Friendly business copy & actionable button generator
│   │
│   ├── routes/
│   │   ├── action_routes.py       # POST /api/actions, GET /api/erp/data
│   │   ├── prediction_routes.py   # POST /api/predict-next-action, /api/recommendations/*
│   │   └── training_routes.py     # GET /api/health, GET /api/model/status, POST /api/model/train
│   │
│   └── models/
│       ├── next_action_model.pkl  # Trained Random Forest model artifact
│       ├── feature_encoder.pkl    # One-hot sequence encoder
│       ├── label_encoder.pkl      # Target action label encoder
│       ├── evaluation_results.json# Top-1 & Top-3 accuracy metrics
│       └── model_metadata.json    # Model metadata and training sample stats
│
├── frontend/
│   ├── index.html                 # Direct redirect to dashboard
│   ├── dashboard.html             # Live AI accuracy, telemetry CTR & learned transitions
│   ├── products.html              # Product catalog (Laptop purchase -> Headphones demo)
│   ├── quotations.html            # Quotation workflow (Save quote -> Send quote demo)
│   ├── customers.html             # Customer profiles & quotation history
│   ├── orders.html                # Orders fulfillment & invoice generation
│   ├── purchases.html             # Active session cart and purchases
│   │
│   ├── css/
│   │   └── styles.css             # Floating assistant card & entrance animations
│   │
│   └── js/
│       ├── api.js                 # API client wrapper
│       ├── actionTracker.js       # Global trackAction() and session manager
│       ├── recommendation.js      # Floating popup renderer & execution controller
│       └── app.js                 # Shared UI state & active navigation highlights
│
├── requirements.txt               # Dependencies (Flask, scikit-learn, pandas, joblib)
├── test_next_action.py            # Automated test suite (9 test cases)
└── README.md                      # Complete system documentation
```

---

## 4. Machine Learning Methodology

### 4.1. Sequence Transformation
For any user session sequence of actions $[a_1, a_2, \dots, a_T]$, the model uses a configurable lookback window $N = 3$:
- **Target ($Y$)**: $a_t$ (the action performed at step $t$)
- **Features ($X$)**:
  - `prev_action_1`: $a_{t-1}$ (immediate preceding action)
  - `prev_action_2`: $a_{t-2}$ (or `<START>` if beginning of session)
  - `prev_action_3`: $a_{t-3}$ (or `<START>` if beginning of session)

### 4.2. Training & Evaluation Metrics
Trained on **18,649 state transitions** across **4,000 synthetic multi-domain ERP sessions** using a `RandomForestClassifier(n_estimators=120, max_depth=16, random_state=42)`:
* **Top-1 Next-Action Accuracy**: **84.64%**
* **Top-3 Next-Action Accuracy**: **99.45%**
* **Precision**: **78.00%**
* **Recall**: **84.64%**
* **F1-Score**: **80.28%**
* **Total Action Classes**: **31 distinct actions**

---

## 5. Smart Recommendation Trigger & Anti-Irritation Rules

A critical UX requirement is **Smart Silence**: the engine only displays recommendations for meaningful business actions when confidence is high.

### Action Priority Hierarchy
- **HIGH PRIORITY (Triggers Evaluation)**: `purchase_laptop`, `purchase_phone`, `purchase_headphones`, `save_quotation`, `send_quotation`, `create_order`, `generate_invoice`, `confirm_payment`, `create_customer`.
- **MEDIUM PRIORITY**: `add_product`, `create_quotation`, `set_discount`, `view_customer_quotations`.
- **LOW PRIORITY (Ignored for Popups)**: `search`, `view`, `open`, `filter`, `navigate`, `login`.

### Two-Stage Decision Pipeline (`should_show_recommendation`)
1. **Eligibility Check**: Is the action high or medium priority? If not $\rightarrow$ `action_not_eligible` (Smart Silence).
2. **Confidence Threshold**: Is predicted probability $\ge 0.50$? If not $\rightarrow$ `low_confidence`.
3. **Time Cooldown**: Has at least 20 seconds elapsed since the last recommendation popup in this session? If not $\rightarrow$ `cooldown_active`.
4. **Duplicate Protection**: Has this exact recommendation already been shown or dismissed in this session? If yes $\rightarrow$ `duplicate_recommendation`.
5. **Session Frequency Limit**: Maximum 5 popups per session. If exceeded $\rightarrow$ `session_limit_reached`.

---

## 6. Quick Start & Execution

### Step 1: Install Dependencies
```powershell
pip install -r next-action-engine/requirements.txt
```

### Step 2: (Optional) Retrain ML Model
```powershell
cd next-action-engine
python backend/data/generate_dataset.py
python backend/ml/train.py
```

### Step 3: Start Backend & UI Server
```powershell
cd next-action-engine
python backend/app.py
```
Output:
```
[INFO] dealflow360-next-action - Starting Next Action Recommendation Engine on http://0.0.0.0:5001
 * Running on http://127.0.0.1:5001
```

### Step 4: Open in Browser
Visit **http://localhost:5001** to view the live ERP application.

---

## 7. Interactive Demo Scenario (Laptop $\rightarrow$ Headphones)

1. Open **http://localhost:5001/products.html**.
2. Search for *"Laptop"* (Browsing actions are logged quietly without spamming).
3. Click **"Purchase"** on the *ThinkPad X1 Carbon*.
4. **Action is logged**: `purchase_laptop`.
5. **ML Model predicts**: `purchase_headphones` ($\approx 55-62\%$ probability).
6. **Smart Decision Layer approves**: High-intent action + High confidence + No active cooldown.
7. **Floating Assistant Popup smoothly slides up in bottom-right corner**:
   ```
   ┌────────────────────────────────────────────────────────┐
   │ ✦ Next Step                                       ×    │
   │                                                        │
   │ Customers who bought this laptop often add wireless   │
   │ headphones to their order.                             │
   │                                                        │
   │ [ Add Headphones → ]                [High confidence]  │
   └────────────────────────────────────────────────────────┘
   ```
8. Click **[ Add Headphones ]**:
   - The system adds *Sony WH-1000XM5 Wireless Headphones* to the active cart.
   - Logs acceptance feedback (`status: 'clicked'`).
   - Logs `purchase_headphones` event for model self-learning.

---

## 8. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and model status check |
| `POST` | `/api/actions` | Logs user action and returns recommendation decision |
| `GET` | `/api/actions/session/<session_id>` | Retrieves chronological actions for a session |
| `POST` | `/api/predict-next-action` | Direct inference endpoint for next action given context |
| `GET` | `/api/recommendations/<session_id>` | Retrieves all recommendation feedback records for session |
| `POST` | `/api/recommendations/<id>/click` | Records user acceptance / click feedback |
| `POST` | `/api/recommendations/<id>/dismiss` | Records user dismissal feedback |
| `GET` | `/api/dashboard/stats` | Returns live telemetry, Top-1/Top-3 accuracy, and CTR % |
| `GET` | `/api/erp/data` | Returns ERP master catalog (products, customers, quotes, orders) |
| `GET` | `/api/model/status` | Returns loaded model metadata and test set metrics |
| `POST` | `/api/model/train` | Triggers retraining from historical dataset |

---

## 9. Automated Test Suite

Run the automated test suite verifying all 9 core functional and decision cases:
```powershell
python next-action-engine/test_next_action.py
```
Output:
```
======================================================================
  DEALFLOW360 NEXT-ACTION PREDICTION ENGINE TEST SUITE
======================================================================
[TEST 1] GET /api/health -> [PASS]
[TEST 2] GET /api/model/status -> [PASS] (Top-1 Acc: 84.64%)
[TEST 3] POST /api/actions ('search_laptop' -> Smart Silence) -> [PASS]
[TEST 4] POST /api/actions ('purchase_laptop' -> Recommends Headphones) -> [PASS]
[TEST 5] Cooldown / Anti-Spam Check (Immediate action -> Cooldown Active) -> [PASS]
[TEST 6] POST /api/recommendations/1/click (Acceptance Feedback) -> [PASS]
[TEST 7] POST /api/predict-next-action (Quotation Workflow) -> [PASS]
[TEST 8] GET /api/dashboard/stats -> [PASS]
[TEST 9] GET /api/erp/data -> [PASS]
======================================================================
  ALL 9 AUTOMATED TESTS PASSED SUCCESSFULLY! (100% SUCCESS)
======================================================================
```
