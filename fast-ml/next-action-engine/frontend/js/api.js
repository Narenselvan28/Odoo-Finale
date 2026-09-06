/**
 * DealFlow360 - Next Action Prediction Engine
 * API Client Layer
 */

const API = {
    baseUrl: '',

    async post(endpoint, data) {
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (err) {
            console.error(`[API POST ${endpoint}] error:`, err);
            return { success: false, error: err.message };
        }
    },

    async get(endpoint) {
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`);
            return await res.json();
        } catch (err) {
            console.error(`[API GET ${endpoint}] error:`, err);
            return null;
        }
    },

    // 1. Log Action & Evaluate Recommendation
    async logAction(sessionId, userId, action, metadata = {}) {
        return await this.post('/api/actions', {
            session_id: sessionId,
            user_id: userId,
            action: action,
            metadata: metadata
        });
    },

    // 2. Direct Next-Action Prediction
    async predictNextAction(sessionId, currentAction, metadata = {}) {
        return await this.post('/api/predict-next-action', {
            session_id: sessionId,
            current_action: currentAction,
            metadata: metadata
        });
    },

    // 3. User Feedback on Recommendation Popup
    async clickRecommendation(recId) {
        if (!recId) return;
        return await this.post(`/api/recommendations/${recId}/click`, {});
    },

    async dismissRecommendation(recId) {
        if (!recId) return;
        return await this.post(`/api/recommendations/${recId}/dismiss`, {});
    },

    // 4. ERP Master Data & Dashboard Analytics
    async getErpData() {
        return await this.get('/api/erp/data');
    },

    async getDashboardStats() {
        return await this.get('/api/dashboard/stats');
    },

    async getSessionActions(sessionId) {
        return await this.get(`/api/actions/session/${sessionId}`);
    },

    async getModelStatus() {
        return await this.get('/api/model/status');
    }
};
