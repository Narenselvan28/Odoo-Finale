/**
 * DealFlow360 - Next Action Prediction Engine
 * Action Tracker & Session Management
 */

class ActionTracker {
    constructor() {
        this.sessionId = this.getOrCreateSessionId();
        this.userId = 'user_001';
    }

    getOrCreateSessionId() {
        let sid = sessionStorage.getItem('dealflow360_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString().slice(-4);
            sessionStorage.setItem('dealflow360_session_id', sid);
        }
        return sid;
    }

    /**
     * Primary action tracking function called across ERP pages.
     * @param {string} actionName - Name of the action, e.g. "purchase_laptop"
     * @param {object} metadata - Extra details, e.g. { product_id: "LP001", category: "laptop" }
     */
    async track(actionName, metadata = {}) {
        console.log(`[ActionTracker] ❯ Recording action: "${actionName}"`, metadata);

        // Notify UI of action event
        window.dispatchEvent(new CustomEvent('erp_action_occurred', {
            detail: { action: actionName, metadata: metadata, timestamp: new Date().toLocaleTimeString() }
        }));

        try {
            const response = await API.logAction(this.sessionId, this.userId, actionName, metadata);
            
            if (response && response.success && response.recommendation_eval) {
                const evalResult = response.recommendation_eval;
                console.log('[ActionTracker] Decision Result:', evalResult.should_show ? '✓ SHOW RECOMMENDATION' : `✗ QUIET (${evalResult.decision_reason})`);

                if (evalResult.should_show && evalResult.recommendation) {
                    // Trigger the floating recommendation card
                    if (window.RecommendationManager) {
                        window.RecommendationManager.showRecommendation(
                            evalResult.recommendation,
                            evalResult.recommendation_id,
                            actionName
                        );
                    }
                }
            }
            return response;
        } catch (error) {
            console.error('[ActionTracker] Tracking error:', error);
        }
    }
}

// Global instances
window.actionTracker = new ActionTracker();
window.trackAction = (actionName, metadata = {}) => window.actionTracker.track(actionName, metadata);
