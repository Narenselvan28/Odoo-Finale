# DealFlow360 — Machine Learning Inference API Layer

**DealFlow360** is an Intelligent, Self-Governing Sales Operations Platform. This ML API service delivers real-time machine learning predictions for sales deal discount governance:

1. **Discount Risk Classifier (`XGBoost Classifier`)**: Predicts whether a proposed discount is `NORMAL` or `HIGH` risk and provides the exact high-risk probability percentage.
2. **Recommended Discount Regressor (`XGBoost Regressor`)**: Predicts the optimal recommended discount percentage based on customer history, product metrics, and deal context.

---

## 1. System Architecture

```
                    DealFlow360
                         |
                         v
                Node.js Backend
                         |
              ---------------------
              |                   |
              v                   v
      /discount-risk      /recommended-discount
              |                   |
              v                   v
       Flask ML API       Flask ML API
              |                   |
              v                   v
       XGBoost Classifier  XGBoost Regressor
              |                   |
              v                   v
       Risk Probability    Recommended %
              |                   |
              -----------+---------
                         |
                         v
                   Rule Engine
                         |
                         v
                  Approval Engine
                         |
                         v
                  Deal Processing
```

> **Separation of Concerns**: The ML service provides statistical predictions and risk assessments. It does not make authoritative business approval decisions. Decisions are governed downstream by the DealFlow360 Rule & Approval Engines.

---

## 2. Directory Structure

```
dealflow360_ml_api/
│
├── app.py                     # Flask application entry point & CORS configuration
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variable template
├── .env                       # Local environment settings
├── README.md                  # Complete documentation
├── test_api.py                # Automated API test suite
│
├── datasets/                  # Source training datasets
│   ├── dealflow360_classifier_dataset.csv
│   └── dealflow360_regressor_dataset.csv
│
├── models/                    # Trained model artifacts & feature metadata
│   ├── discount_risk_classifier.pkl
│   ├── discount_recommendation_regressor.pkl
│   ├── classifier_features.json
│   └── regressor_features.json
│
├── routes/                    # API route blueprints
│   ├── __init__.py
│   ├── meta.py                # Health check & model metadata routes
│   ├── classifier.py          # /api/v1/ml/discount-risk route
│   └── regressor.py           # /api/v1/ml/recommended-discount route
│
├── services/                  # Business & ML inference services
│   ├── __init__.py
│   ├── classifier_service.py  # Loads XGBoost classifier & computes risk probabilities
│   └── regressor_service.py   # Loads XGBoost regressor & bounds recommendations
│
├── utils/                     # Shared validation, preprocessing, and error handling
│   ├── __init__.py
│   ├── error_handlers.py      # Standardized JSON error handlers (400, 422, 500, 503)
│   ├── validation.py          # Feature schema & type validation
│   └── preprocessing.py       # Feature ordering & DataFrame builders
│
└── training/                  # Model training pipelines
    ├── __init__.py
    ├── train_classifier.py    # Classifier training script (Stratified Split, Eval, Export)
    └── train_regressor.py     # Regressor training script (Train/Test Split, Eval, Export)
```

---

## 3. Installation & Setup

### Prerequisites
- Python 3.10+ (tested on Python 3.11 / 3.12)
- pip package manager

### 1. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```
Default configuration:
```ini
FLASK_ENV=development
PORT=5000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
DEBUG=True
```

---

## 4. Model Training

Both training scripts train end-to-end `scikit-learn` Pipelines containing `ColumnTransformer` (OneHotEncoding for categoricals, StandardScaler for numericals) coupled with XGBoost estimators.

### Train Discount Risk Classifier
```powershell
python training/train_classifier.py
```
- **Dataset**: `datasets/dealflow360_classifier_dataset.csv`
- **Target**: `risk_label` (0 = NORMAL, 1 = HIGH)
- **Evaluation**: Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix
- **Outputs**: `models/discount_risk_classifier.pkl`, `models/classifier_features.json`

### Train Discount Recommendation Regressor
```powershell
python training/train_regressor.py
```
- **Dataset**: `datasets/dealflow360_regressor_dataset.csv`
- **Target**: `recommended_discount_percent`
- **Evaluation**: MAE, MSE, RMSE, R²
- **Outputs**: `models/discount_recommendation_regressor.pkl`, `models/regressor_features.json`

---

## 5. Running the API

Start the Flask server:
```powershell
python app.py
```
The server will be accessible at `http://localhost:5000`.

---

## 6. API Endpoints & Reference

### 6.1. Health Check
- **Method**: `GET`
- **Path**: `/health`
- **Description**: Verifies service status and confirms both ML models are loaded in memory.

**Response (200 OK)**:
```json
{
  "status": "healthy",
  "service": "dealflow360-ml-api",
  "classifier_loaded": true,
  "regressor_loaded": true
}
```

---

### 6.2. Model Information
- **Method**: `GET`
- **Path**: `/api/v1/ml/models`
- **Description**: Returns registered models and active targets.

**Response (200 OK)**:
```json
{
  "classifier": {
    "name": "discount_risk_classifier",
    "algorithm": "XGBoost Classifier",
    "target": "risk_label",
    "loaded": true
  },
  "regressor": {
    "name": "discount_recommendation_regressor",
    "algorithm": "XGBoost Regressor",
    "target": "recommended_discount_percent",
    "loaded": true
  }
}
```

---

### 6.3. Discount Risk Classifier Endpoint
- **Method**: `POST`
- **Path**: `/api/v1/ml/discount-risk`
- **Content-Type**: `application/json`

**Sample Request**:
```json
{
  "customer_tier": "STANDARD",
  "category": "cool_stuff",
  "customer_state": "RJ",
  "seller_state": "SP",
  "quantity": 1,
  "price": 58.9,
  "order_value": 58.9,
  "freight_value": 13.29,
  "gross_order_value": 72.19,
  "discount_percent": 5.98,
  "discount_amount": 3.52,
  "net_sales": 55.38,
  "customer_avg_discount": 5.98,
  "product_avg_discount": 3.7,
  "customer_product_avg_discount": 4.84,
  "recommended_discount_percent": 4.95,
  "discount_gap_percent": 1.03,
  "warehouse_count": 1,
  "available_stock": 644,
  "reserved_stock": 199,
  "warehouse_capacity": 931,
  "stock_pressure": 0.309,
  "warehouse_utilization": 0.2137,
  "transport_distance_km": 301.5,
  "transport_cost": 23.3,
  "expected_delivery_days": 2.6,
  "product_cost": 37.91,
  "margin_before_discount": -15.6,
  "margin_after_discount": -19.12,
  "margin_percent": -34.53,
  "customer_transaction_count": 1,
  "customer_previous_orders": 0,
  "product_transaction_count": 9,
  "product_previous_orders": 8,
  "actual_delivery_days": 7.61,
  "estimated_delivery_days": 15.62,
  "delivery_delay_days": -8.01,
  "payment_value": 72.19,
  "payment_installments": 2.0,
  "payment_type": "credit_card",
  "review_score": 5.0
}
```

**Response (200 OK - NORMAL Risk)**:
```json
{
  "success": true,
  "model": "discount_risk_classifier",
  "prediction": {
    "risk_label": 0,
    "risk_category": "NORMAL",
    "risk_percentage": 0.0
  }
}
```

**Response (200 OK - HIGH Risk)**:
```json
{
  "success": true,
  "model": "discount_risk_classifier",
  "prediction": {
    "risk_label": 1,
    "risk_category": "HIGH",
    "risk_percentage": 98.42
  }
}
```

---

### 6.4. Recommended Discount Regressor Endpoint
- **Method**: `POST`
- **Path**: `/api/v1/ml/recommended-discount`
- **Content-Type**: `application/json`

**Sample Request**:
```json
{
  "country": "United Kingdom",
  "category": "GENERAL",
  "customer_tier": "GOLD",
  "market_region": "DOMESTIC",
  "quantity": 10,
  "price": 4.50,
  "order_value": 45.00,
  "year": 2009,
  "month": 12,
  "day_of_week": 0,
  "hour": 8,
  "is_weekend": 0,
  "customer_previous_transactions": 12,
  "customer_previous_quantity": 85,
  "customer_previous_spend": 1250.50,
  "customer_avg_order_value": 104.21,
  "customer_purchase_frequency": 2.5,
  "customer_total_previous_spend": 1250.50,
  "product_previous_transactions": 150,
  "product_previous_quantity": 1200,
  "product_previous_price_avg": 24.80,
  "product_popularity": 150,
  "customer_product_previous_transactions": 4,
  "customer_avg_previous_discount": 7.25,
  "product_avg_previous_discount": 6.80,
  "customer_product_avg_previous_discount": 7.10,
  "discount_percent": 18.0,
  "discount_amount": 45.90,
  "discounted_unit_price": 20.91,
  "discount_gap_percent": 10.5,
  "tier_discount": 8.0,
  "tier_max_discount": 20.0,
  "price_band": "MEDIUM"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "model": "discount_recommendation_regressor",
  "prediction": {
    "recommended_discount_percent": 12.79
  }
}
```

---

## 7. Error Handling

All errors return clean JSON with meaningful error codes and HTTP statuses:

### 400 Bad Request (Missing Feature)
```json
{
  "success": false,
  "error": {
    "code": "MISSING_FEATURE",
    "message": "Missing required feature: customer_tier",
    "details": {
      "missing_feature": "customer_tier"
    }
  }
}
```

### 422 Unprocessable Entity (Invalid Type / Value)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FEATURE_VALUE",
    "message": "Invalid value for feature 'price': must be a numeric value (int or float).",
    "details": {
      "feature": "price",
      "reason": "must be a numeric value (int or float)."
    }
  }
}
```

### 503 Service Unavailable (Model Files Missing)
```json
{
  "success": false,
  "error": {
    "code": "MODEL_UNAVAILABLE",
    "message": "Model 'discount_risk_classifier' is currently unavailable or failed to load.",
    "details": {
      "model": "discount_risk_classifier"
    }
  }
}
```

---

## 8. Windows cURL Command Examples

### 1. Health Check
```cmd
curl -X GET http://localhost:5000/health
```

### 2. Check Discount Risk
```cmd
curl -X POST http://localhost:5000/api/v1/ml/discount-risk ^
-H "Content-Type: application/json" ^
-d "{\"customer_tier\":\"STANDARD\",\"category\":\"cool_stuff\",\"customer_state\":\"RJ\",\"seller_state\":\"SP\",\"quantity\":1,\"price\":58.9,\"order_value\":58.9,\"freight_value\":13.29,\"gross_order_value\":72.19,\"discount_percent\":5.98,\"discount_amount\":3.52,\"net_sales\":55.38,\"customer_avg_discount\":5.98,\"product_avg_discount\":3.7,\"customer_product_avg_discount\":4.84,\"recommended_discount_percent\":4.95,\"discount_gap_percent\":1.03,\"warehouse_count\":1,\"available_stock\":644,\"reserved_stock\":199,\"warehouse_capacity\":931,\"stock_pressure\":0.309,\"warehouse_utilization\":0.2137,\"transport_distance_km\":301.5,\"transport_cost\":23.3,\"expected_delivery_days\":2.6,\"product_cost\":37.91,\"margin_before_discount\":-15.6,\"margin_after_discount\":-19.12,\"margin_percent\":-34.53,\"customer_transaction_count\":1,\"customer_previous_orders\":0,\"product_transaction_count\":9,\"product_previous_orders\":8,\"actual_delivery_days\":7.61,\"estimated_delivery_days\":15.62,\"delivery_delay_days\":-8.01,\"payment_value\":72.19,\"payment_installments\":2.0,\"payment_type\":\"credit_card\",\"review_score\":5.0}"
```

### 3. Get Recommended Discount
```cmd
curl -X POST http://localhost:5000/api/v1/ml/recommended-discount ^
-H "Content-Type: application/json" ^
-d "{\"country\":\"United Kingdom\",\"category\":\"GENERAL\",\"customer_tier\":\"GOLD\",\"market_region\":\"DOMESTIC\",\"quantity\":10,\"price\":4.5,\"order_value\":45.0,\"year\":2009,\"month\":12,\"day_of_week\":0,\"hour\":8,\"is_weekend\":0,\"customer_previous_transactions\":12,\"customer_previous_quantity\":85,\"customer_previous_spend\":1250.5,\"customer_avg_order_value\":104.21,\"customer_purchase_frequency\":2.5,\"customer_total_previous_spend\":1250.5,\"product_previous_transactions\":150,\"product_previous_quantity\":1200,\"product_previous_price_avg\":24.8,\"product_popularity\":150,\"customer_product_previous_transactions\":4,\"customer_avg_previous_discount\":7.25,\"product_avg_previous_discount\":6.8,\"customer_product_avg_previous_discount\":7.1,\"discount_percent\":18.0,\"discount_amount\":45.9,\"discounted_unit_price\":20.91,\"discount_gap_percent\":10.5,\"tier_discount\":8.0,\"tier_max_discount\":20.0,\"price_band\":\"MEDIUM\"}"
```

---

## 9. Integration Examples

### Node.js / Express Backend Integration
```javascript
import axios from 'axios';

const ML_API_BASE = process.env.ML_API_URL || 'http://localhost:5000';

/**
 * Predicts discount risk for a proposed deal
 */
export async function evaluateDiscountRisk(dealData) {
  try {
    const response = await axios.post(`${ML_API_BASE}/api/v1/ml/discount-risk`, dealData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000
    });
    return response.data.prediction; // { risk_label: 0|1, risk_category: "NORMAL"|"HIGH", risk_percentage: 82.37 }
  } catch (error) {
    console.error('ML Risk evaluation error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Recommends optimal discount percentage for a quote
 */
export async function getRecommendedDiscount(dealData) {
  try {
    const response = await axios.post(`${ML_API_BASE}/api/v1/ml/recommended-discount`, dealData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 3000
    });
    return response.data.prediction.recommended_discount_percent; // e.g. 12.79
  } catch (error) {
    console.error('ML Recommendation error:', error.response?.data || error.message);
    throw error;
  }
}
```

### React Frontend Integration
```tsx
import React, { useState } from 'react';

const API_BASE = 'http://localhost:5000';

export function DealEvaluationCard({ dealData }: { dealData: any }) {
  const [risk, setRisk] = useState<any>(null);
  const [recommended, setRecommended] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const [riskRes, recRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/ml/discount-risk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealData),
        }).then(r => r.json()),
        fetch(`${API_BASE}/api/v1/ml/recommended-discount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealData),
        }).then(r => r.json())
      ]);

      if (riskRes.success) setRisk(riskRes.prediction);
      if (recRes.success) setRecommended(recRes.prediction.recommended_discount_percent);
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deal-card p-6 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800">
      <h3 className="text-xl font-bold mb-4">DealFlow360 ML Intelligence</h3>
      <button 
        onClick={handleEvaluate} 
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded font-medium"
      >
        {loading ? 'Evaluating Model...' : 'Analyze Deal & Recommend'}
      </button>

      {risk && (
        <div className="mt-4">
          <p>Risk Category: <span className={risk.risk_category === 'HIGH' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{risk.risk_category}</span></p>
          <p>High-Risk Probability: {risk.risk_percentage}%</p>
        </div>
      )}

      {recommended !== null && (
        <div className="mt-2 text-blue-400">
          Recommended Discount: <strong>{recommended}%</strong>
        </div>
      )}
    </div>
  );
}
```

---

## 10. Running the Automated Test Suite

Run the full automated test suite verifying all endpoints, response formats, probability calculations, and error codes:
```powershell
python test_api.py
```
To run tests against a live server process:
```powershell
python test_api.py --live http://localhost:5000
```

---

## 11. DealFlow360 Intelligence Engine API

The Intelligence Engine delivers five interconnected capabilities with **zero database mutations**:
1. **What-If Deal Simulator** (`POST /api/v1/intelligence/what-if` and `POST /api/v1/intelligence/what-if/batch`)
2. **Business Memory Engine** (`GET /api/v1/intelligence/memory/customer/<customer_id>`)
3. **Actionable Deal Health Engine** (`GET /api/v1/intelligence/deal/<deal_id>/health`)
4. **Why / Why-Not Explanation Engine** (`POST /api/v1/intelligence/explain`)
5. **Unified Deal Intelligence Insights** (`GET/POST /api/v1/intelligence/deal/<deal_id>/insights`)

### Architecture Principle
- **ML** $\rightarrow$ Predicts
- **Rule Engine** $\rightarrow$ Governs
- **Digital Twin** $\rightarrow$ Simulates
- **Business Memory** $\rightarrow$ Provides historical behavioral context
- **Deal Health Engine** $\rightarrow$ Identifies current & future threats
- **Explanation Engine** $\rightarrow$ Explains decisions and alternatives
- **Recommendation Engine** $\rightarrow$ Proposes actions
- **Node.js Backend** $\rightarrow$ System of record; executes only after user confirmation

---

### Endpoint: `POST /api/v1/intelligence/what-if`

#### Purpose
Simulates proposed deal parameter adjustments (e.g. discount changes, quantity adjustments, warehouse reallocations) in an isolated, in-memory Digital Twin snapshot without modifying production quotations, inventory, or orders.

#### Example Request
```bash
curl -X POST http://localhost:5000/api/v1/intelligence/what-if \
  -H "Content-Type: application/json" \
  -d '{
    "deal": {
      "deal_id": "DEAL-1001",
      "customer_id": "CUST-101",
      "customer_tier": "GOLD",
      "quantity": 500,
      "base_price": 1000,
      "product_cost": 650,
      "current_discount_percent": 12,
      "warehouses": [
        {
          "warehouse_id": "WH-A",
          "available_stock": 300,
          "reserved_stock": 50,
          "capacity": 1000,
          "current_load": 650,
          "distance_km": 120,
          "transport_rate_per_km": 10,
          "processing_days": 1
        },
        {
          "warehouse_id": "WH-B",
          "available_stock": 300,
          "reserved_stock": 20,
          "capacity": 800,
          "current_load": 400,
          "distance_km": 180,
          "transport_rate_per_km": 9,
          "processing_days": 2
        }
      ],
      "required_delivery_days": 4,
      "customer_avg_discount": 10,
      "customer_max_discount": 16,
      "previous_deals": 8,
      "previous_negotiations": 2
    },
    "changes": {
      "discount_percent": 18
    }
  }'
```

#### Example Response
```json
{
  "success": true,
  "simulation": {
    "deal_id": "DEAL-1001",
    "is_simulation": true,
    "current": {
      "discount_percent": 12.0,
      "margin_percent": 24.3,
      "transport_cost": 6120.0,
      "health_score": 83,
      "health_status": "HEALTHY",
      "approval_required": false,
      "delivery_sla_met": true
    },
    "simulated": {
      "discount_percent": 18.0,
      "margin_percent": 18.9,
      "transport_cost": 6120.0,
      "health_score": 64,
      "health_status": "AT_RISK",
      "approval_required": true,
      "delivery_sla_met": true
    },
    "impact": {
      "discount_delta": 6.0,
      "margin_delta": -5.4,
      "margin_amount_delta": -30000.0,
      "transport_cost_delta": 0.0,
      "health_delta": -19,
      "approval_status_changed": true,
      "delivery_status_changed": false
    },
    "rules": {
      "approval_required": true,
      "approval_level": "SALES_MANAGER",
      "approval_reasons": [
        "Discount exceeds GOLD tier standard limit (15.0%)",
        "Discount exceeds customer historical maximum (16.0%)"
      ],
      "rule_results": [
        {
          "rule": "customer_tier_discount_ceiling",
          "passed": false,
          "threshold": 15.0,
          "actual_value": 18.0,
          "message": "Discount (18.0%) exceeds GOLD tier ceiling (15.0%)."
        }
      ]
    },
    "fulfillment": {
      "feasible": true,
      "warehouse_count": 2,
      "allocation": [
        { "warehouse_id": "WH-A", "quantity": 250 },
        { "warehouse_id": "WH-B", "quantity": 250 }
      ],
      "transport_cost": 6120.0,
      "fulfillment_cost": 2725.0,
      "expected_delivery_days": 3,
      "delivery_sla_met": true
    },
    "ml": {
      "model_available": true,
      "recommended_discount_percent": 12.8,
      "risk_probability": 0.12,
      "risk_percentage": 12.0,
      "risk_label": "NORMAL"
    },
    "recommendation": {
      "action": "REDUCE_DISCOUNT",
      "recommended_discount": 16.0,
      "reasons": [
        "18.0% discount exceeds customer maximum limit (16.0%).",
        "Finance/Sales approval is required.",
        "16.0% provides a better margin-risk balance without requiring exception approvals."
      ]
    }
  }
}
```

---

### Endpoint: `POST /api/v1/intelligence/deal/<deal_id>/insights`

Unified deal intelligence endpoint providing real-time deal health breakdown, business memory, explainable Why/Why-Not comparisons, and one-click executable actions.

```powershell
python test_intelligence.py
```

