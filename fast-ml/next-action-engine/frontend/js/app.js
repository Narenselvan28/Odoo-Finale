/**
 * DealFlow360 - Next Action Prediction ERP
 * Shared Application UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Display Session ID in header
    const sessionBadge = document.getElementById('current-session-badge');
    if (sessionBadge && window.actionTracker) {
        sessionBadge.textContent = window.actionTracker.sessionId;
    }

    // 2. Update Cart Count
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        const cart = JSON.parse(sessionStorage.getItem('dealflow360_cart') || '[]');
        cartCountEl.textContent = cart.length;
    }

    // 3. Listen to live ERP actions and update session timeline if on dashboard
    window.addEventListener('erp_action_occurred', (e) => {
        const timeline = document.getElementById('session-action-timeline');
        if (timeline) {
            const emptyMsg = document.getElementById('timeline-empty');
            if (emptyMsg) emptyMsg.remove();

            const item = document.createElement('div');
            item.className = 'flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0';
            item.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span class="font-semibold text-slate-800">${e.detail.action}</span>
                </div>
                <span class="text-slate-400">${e.detail.timestamp}</span>
            `;
            timeline.insertBefore(item, timeline.firstChild);
        }
    });
});
