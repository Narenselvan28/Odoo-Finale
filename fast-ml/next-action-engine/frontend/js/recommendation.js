/**
 * DealFlow360 - Next Action Prediction Engine
 * Floating Recommendation Popup Manager
 */

class RecommendationPopupManager {
    constructor() {
        this.currentRec = null;
        this.currentRecId = null;
        this.autoDismissTimer = null;
        this.initDom();
    }

    initDom() {
        // Create popup container if not exists
        let popup = document.getElementById('recommendation-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'recommendation-popup';
            popup.className = 'rec-hidden';
            popup.innerHTML = `
                <div class="rec-card border border-slate-200 bg-white rounded-2xl shadow-xl p-5">
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">✦</span>
                            <h4 id="rec-title" class="text-xs font-bold tracking-wider text-slate-500 uppercase">Next Step</h4>
                        </div>
                        <button id="rec-dismiss-btn" class="rec-btn-dismiss p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 rounded-lg" title="Dismiss">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <p id="rec-description" class="text-sm font-normal text-slate-700 leading-relaxed mb-4">
                        Suggested action message goes here.
                    </p>

                    <div class="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                        <button id="rec-action-btn" class="rec-btn-action flex items-center gap-2">
                            <span id="rec-action-label">Add Item</span>
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                        <span id="rec-confidence-badge" class="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            High confidence
                        </span>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);

            // Bind listeners
            document.getElementById('rec-dismiss-btn').addEventListener('click', () => this.dismiss());
            document.getElementById('rec-action-btn').addEventListener('click', () => this.executeAction());
        }
        this.popupElement = popup;
    }

    /**
     * Displays the recommendation card with smooth entrance animation.
     */
    showRecommendation(recommendation, recId, sourceAction) {
        if (!recommendation) return;

        this.currentRec = recommendation;
        this.currentRecId = recId;
        const explanation = recommendation.explanation || {};

        document.getElementById('rec-title').textContent = explanation.title || '✦ Next Step';
        document.getElementById('rec-description').textContent = explanation.description || 'Recommended next action.';
        document.getElementById('rec-action-label').textContent = explanation.button_text || 'Continue';

        const confBadge = document.getElementById('rec-confidence-badge');
        if (recommendation.confidence === 'high') {
            confBadge.className = 'text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full';
            confBadge.textContent = 'High confidence';
        } else {
            confBadge.className = 'text-[11px] font-medium text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full';
            confBadge.textContent = 'Recommended';
        }

        // Show popup
        this.popupElement.classList.remove('rec-hidden');
        this.popupElement.classList.add('rec-visible');

        // Reset auto dismiss timer (12s)
        if (this.autoDismissTimer) clearTimeout(this.autoDismissTimer);
        this.autoDismissTimer = setTimeout(() => {
            this.hide();
        }, 12000);
    }

    /**
     * Executes the recommended action when the user clicks the button.
     */
    async executeAction() {
        if (!this.currentRec) return;

        const rec = this.currentRec;
        const recId = this.currentRecId;
        const explanation = rec.explanation || {};

        // Send click feedback to backend
        if (recId) {
            API.clickRecommendation(recId);
        }

        this.hide();

        // 1. Quick Purchase Workflow
        if (explanation.action_type === 'quick_purchase') {
            const prodId = explanation.target_product_id || 'HP001';
            const prodName = explanation.target_product_name || 'Recommended Accessory';
            
            // Add to session purchases storage
            let purchases = JSON.parse(sessionStorage.getItem('dealflow360_cart') || '[]');
            purchases.push({ id: prodId, name: prodName, addedAt: new Date().toLocaleTimeString() });
            sessionStorage.setItem('dealflow360_cart', JSON.stringify(purchases));

            // Log executed action
            trackAction(rec.action, { product_id: prodId, product_name: prodName, triggered_by_recommendation: true });

            showToast(`✓ Added ${prodName} to purchases!`);

            // Update cart badge if present
            const badge = document.getElementById('cart-count');
            if (badge) badge.textContent = purchases.length;
        } 
        // 2. Navigation / Form workflow
        else if (explanation.target_url) {
            trackAction(rec.action, { triggered_by_recommendation: true });
            setTimeout(() => {
                window.location.href = explanation.target_url;
            }, 300);
        } else {
            trackAction(rec.action, { triggered_by_recommendation: true });
            showToast(`✓ Executed: ${explanation.button_text || rec.action}`);
        }
    }

    /**
     * User explicitly dismisses the popup.
     */
    async dismiss() {
        if (this.currentRecId) {
            API.dismissRecommendation(this.currentRecId);
        }
        this.hide();
    }

    hide() {
        if (this.autoDismissTimer) clearTimeout(this.autoDismissTimer);
        this.popupElement.classList.remove('rec-visible');
        this.popupElement.classList.add('rec-hidden');
    }
}

// Global toast helper
function showToast(message) {
    let toast = document.getElementById('action-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'action-toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `
        <div class="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2">
            ${message}
        </div>
    `;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

// Instantiate manager
window.RecommendationManager = new RecommendationPopupManager();
