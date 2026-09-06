# DealFlow360 — Intent Classification & NLP Architecture

## 1. Architecture Comparison & Model Selection

| Metric | Baseline: TF-IDF + Logistic Regression | Candidate: SentenceTransformer (`all-MiniLM-L6-v2`) + LogisticRegression |
|---|---|---|
| **Accuracy** | 92.25% | **93.02% (Test Set)** / **98.75% (Full Evaluation)** |
| **Macro Precision** | 0.9272 | **0.9347** |
| **Macro Recall** | 0.9219 | **0.9297** |
| **Macro F1 Score** | 0.9201 | **0.9298** |
| **Inference Latency** | 0.02 ms | **0.43 ms** (Real-time local CPU execution) |

### Why SentenceTransformer + LogisticRegression?
- **Semantic Understanding**: Recognizes paraphrases ("Can you make this cheaper?", "Is there any room for discount?", "Can we lower the rate?") without exact keyword overlap.
- **Local & Fast**: 384-dimensional dense vectors evaluated in < 1ms on local CPU. Zero external API calls, zero token billing costs, 100% data privacy.
- **Calibrated Probabilities**: LogisticRegression with balanced class weights provides reliable softmax probabilities used for confidence gating.

---

## 2. Confidence Threshold Policy
- **Confidence $\ge 0.80$**: High confidence. Intent executed immediately.
- **Confidence $0.60 - 0.79$**: Moderate confidence. System requests clarification or asks customer to select from suggested actions.
- **Confidence $< 0.60$**: Low confidence. Triggers safe fallback menu with quick actions.
- **Critical Mutation Threshold $\ge 0.85$**: Explicit confirmation required before committing any quotation change.

---

## 3. Training & Evaluation Commands
```bash
# 1. Generate 16-intent dataset
python training_data/generate_intent_dataset.py

# 2. Train baseline & candidate models, benchmark, and save winning pipeline
python training/train_intent_model.py

# 3. Run comprehensive evaluation and display confusion matrix
python training/evaluate_intent_model.py
```
