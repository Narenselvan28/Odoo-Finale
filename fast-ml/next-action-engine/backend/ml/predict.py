"""
DealFlow360 - Next Action Prediction Engine
Inference Pipeline Module
Calculates probability distribution over next actions given recent user history.
"""

import numpy as np
from config import Config


def predict_next_actions(model, feature_encoder, label_encoder, recent_actions, top_k=3):
    """
    Computes top-k next action predictions and confidence scores.

    Args:
        model: Trained scikit-learn classifier
        feature_encoder: Fitted OneHotEncoder for input features
        label_encoder: Fitted LabelEncoder for target classes
        recent_actions: list of action strings, e.g. ["open_products", "purchase_laptop"]
        top_k: Number of alternatives to return

    Returns:
        dict containing current action, top recommendation, and alternatives
    """
    if not recent_actions:
        recent_actions = [Config.PAD_TOKEN]

    current_action = recent_actions[-1]

    # 1. Construct single-row sequence feature vector
    lookback = Config.LOOKBACK_WINDOW
    pad_token = Config.PAD_TOKEN
    feature_names = [f"prev_action_{i}" for i in range(1, lookback + 1)]

    import pandas as pd
    feature_row = {}
    for i in range(1, lookback + 1):
        idx = len(recent_actions) - i
        col_name = f"prev_action_{i}"
        feature_row[col_name] = recent_actions[idx] if idx >= 0 else pad_token

    df_single = pd.DataFrame([feature_row])
    X_raw = df_single[feature_names]
    X_encoded = feature_encoder.transform(X_raw)

    # 2. Predict probabilities across all classes
    probabilities = model.predict_proba(X_encoded)[0]
    classes = label_encoder.classes_

    # 3. Sort classes by descending probability
    sorted_indices = np.argsort(probabilities)[::-1]

    candidates = []
    for idx in sorted_indices:
        action_name = classes[idx]
        prob = float(probabilities[idx])
        
        # Don't recommend login or trivial start states
        if action_name in ["login", pad_token]:
            continue

        confidence = "high" if prob >= 0.60 else ("medium" if prob >= 0.40 else "low")
        candidates.append({
            "action": action_name,
            "probability": round(prob, 4),
            "confidence": confidence
        })
        if len(candidates) >= top_k:
            break

    if not candidates:
        return {
            "current_action": current_action,
            "recommendation": None,
            "alternatives": []
        }

    top_rec = candidates[0]
    alternatives = candidates[1:]

    return {
        "current_action": current_action,
        "recommendation": top_rec,
        "alternatives": alternatives
    }
