/**
 * DealFlow360 - Anticipatory Deal Engine Frontend Controller
 * Manages live observation, anticipation cycles, prepared operations, confirmations, and audit history.
 */

const API_BASE = '/api/v1/anticipation';

class AnticipatoryApp {
    constructor() {
        this.currentDealId = 'DEAL-1001';
        this.activePreparedAction = null;
        this.activePrediction = null;

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadDeals();
        await this.loadDealState(this.currentDealId);
        // Automatically trigger initial prediction for active deal
        await this.triggerEvent('QuotationCreated');
    }

    bindEvents() {
        const selector = document.getElementById('deal-selector');
        if (selector) {
            selector.addEventListener('change', async (e) => {
                this.currentDealId = e.target.value;
                document.getElementById('current-deal-badge').textContent = this.currentDealId;
                await this.loadDealState(this.currentDealId);
                await this.triggerEvent('QuotationCreated');
            });
        }

        const btnReset = document.getElementById('btn-reset-deal');
        if (btnReset) {
            btnReset.addEventListener('click', async () => {
                await this.loadDealState(this.currentDealId);
                await this.triggerEvent('QuotationCreated');
            });
        }

        // Business Event Simulation Buttons
        document.querySelectorAll('.btn-event-trigger').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const eventType = btn.getAttribute('data-event');
                await this.triggerEvent(eventType);
            });
        });

        // User Confirm & Execute Button
        const btnConfirm = document.getElementById('btn-hero-confirm');
        if (btnConfirm) {
            btnConfirm.addEventListener('click', async () => {
                await this.confirmPreparedAction();
            });
        }

        // User Dismiss Button
        const btnDismiss = document.getElementById('btn-hero-dismiss');
        if (btnDismiss) {
            btnDismiss.addEventListener('click', async () => {
                await this.dismissPreparedAction();
            });
        }
    }

    async loadDeals() {
        try {
            const res = await fetch(`${API_BASE}/deals`);
            const data = await res.json();
            if (data.success && data.deals) {
                const selector = document.getElementById('deal-selector');
                if (selector) {
                    selector.innerHTML = '';
                    data.deals.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d.deal_id;
                        opt.textContent = `${d.deal_id} (${d.customer_name} - ${d.product_name.substring(0, 20)}...)`;
                        selector.appendChild(opt);
                    });
                    selector.value = this.currentDealId;
                }
            }
        } catch (err) {
            console.error('Failed to load deals:', err);
        }
    }

    async loadDealState(dealId) {
        try {
            const res = await fetch(`${API_BASE}/deals/${dealId}`);
            const data = await res.json();
            if (data.success) {
                this.renderDealDetails(data.deal, data.simulation);
                await this.loadAuditHistory(dealId);
            }
        } catch (err) {
            console.error('Failed to load deal state:', err);
        }
    }

    renderDealDetails(deal, sim) {
        document.getElementById('current-deal-badge').textContent = deal.deal_id;
        document.getElementById('deal-status-badge').textContent = deal.status;
        document.getElementById('d-customer').textContent = deal.customer_name;
        document.getElementById('d-tier').textContent = `${deal.customer_tier} (Max standard: ${sim.tier_limit}%)`;
        document.getElementById('d-product').textContent = `${deal.product_name} (${deal.quantity} units)`;
        document.getElementById('d-unitprice').textContent = `$${parseFloat(deal.unit_price).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('d-discount').textContent = `${deal.discount_percent}%`;
        document.getElementById('d-netrevenue').textContent = `$${parseFloat(sim.net_revenue).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        // Digital Twin Metrics
        document.getElementById('dt-health').textContent = `${sim.deal_health_score}/100`;
        document.getElementById('dt-margin').textContent = `${sim.gross_margin_percent}%`;
        document.getElementById('dt-freight').textContent = `$${parseFloat(sim.transport_cost).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('dt-sla').textContent = `⏱ ${sim.delivery_days} Days Delivery SLA`;

        const marginStatus = document.getElementById('dt-margin-status');
        if (sim.margin_below_floor) {
            marginStatus.textContent = '⚠️ Below 15% Margin Floor!';
            marginStatus.className = 'text-[10px] text-rose-400 block mt-0.5 font-bold';
        } else {
            marginStatus.textContent = '✓ Safe (>15% Floor)';
            marginStatus.className = 'text-[10px] text-emerald-400 block mt-0.5';
        }

        // Warehouse Split Bars
        const splitContainer = document.getElementById('warehouse-split-bars');
        const shortageBadge = document.getElementById('dt-shortage');
        if (sim.shortage_units > 0) {
            shortageBadge.textContent = `🚨 ${sim.shortage_units} Units Shortage`;
            shortageBadge.className = 'text-[10px] font-bold text-rose-400 animate-pulse';
        } else {
            shortageBadge.textContent = '✓ 0 Units Shortage';
            shortageBadge.className = 'text-[10px] font-bold text-emerald-400';
        }

        if (splitContainer && sim.allocation_plan) {
            splitContainer.innerHTML = '';
            sim.allocation_plan.forEach(item => {
                const pct = Math.min(100, Math.round((item.allocated_units / Math.max(1, deal.quantity)) * 100));
                const div = document.createElement('div');
                div.className = 'space-y-1 text-[11px]';
                div.innerHTML = `
                    <div class="flex justify-between text-slate-300">
                        <span>${item.warehouse_id} (${item.warehouse_name.split('(')[0]}):</span>
                        <span class="font-mono font-bold text-blue-400">${item.allocated_units} / ${deal.quantity} Units</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-1.5">
                        <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${pct}%"></div>
                    </div>
                `;
                splitContainer.appendChild(div);
            });
        }
    }

    async triggerEvent(eventType) {
        try {
            let metadata = {};
            if (eventType === 'DiscountLimitExceeded') {
                metadata = { discount_percent: 22.0 };
            } else if (eventType === 'StockShortageDetected') {
                metadata = { quantity: 200 };
            } else if (eventType === 'CustomerNegotiated') {
                metadata = { discount_percent: 15.0 };
            }

            const res = await fetch(`${API_BASE}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deal_id: this.currentDealId,
                    event_type: eventType,
                    user_id: 'USER-101',
                    metadata: metadata
                })
            });

            const data = await res.json();
            if (data.success && data.result) {
                this.renderAnticipationResult(data.result);
                await this.loadDealState(this.currentDealId);
            }
        } catch (err) {
            console.error('Failed to trigger event prediction:', err);
        }
    }

    renderAnticipationResult(result) {
        this.activePrediction = result;
        const prep = result.prepared_action;
        this.activePreparedAction = prep;

        if (!prep) return;

        // Populate Hero Card
        document.getElementById('hero-action-title').textContent = prep.title || result.predicted_action;
        document.getElementById('hero-prob').textContent = `${Math.round(result.probability * 100)}%`;
        document.getElementById('hero-conf').textContent = `${Math.round(result.confidence * 100)}%`;
        document.getElementById('hero-summary').textContent = prep.summary || 'Operation prepared.';

        // Populate Payload Table
        const payloadBox = document.getElementById('hero-payload-container');
        if (payloadBox && prep.payload) {
            payloadBox.innerHTML = '';
            for (const [k, v] of Object.entries(prep.payload)) {
                const valStr = typeof v === 'object' ? JSON.stringify(v) : v;
                const row = document.createElement('div');
                row.className = 'flex justify-between py-0.5 border-b border-slate-800/80 last:border-none';
                row.innerHTML = `<span class="text-slate-400">${k}:</span> <span class="text-blue-300 font-semibold">${valStr}</span>`;
                payloadBox.appendChild(row);
            }
        }

        // Consequences List
        const consList = document.getElementById('hero-consequences-list');
        if (consList && prep.consequences) {
            consList.innerHTML = '';
            for (const [k, v] of Object.entries(prep.consequences)) {
                const li = document.createElement('li');
                li.className = 'flex items-center gap-2';
                li.innerHTML = `<span class="text-indigo-400">✓</span> <span>${v}</span>`;
                consList.appendChild(li);
            }
        }

        // Explainability Reasons ("WHY?")
        const reasonsList = document.getElementById('hero-reasons-list');
        if (reasonsList && result.reasons) {
            reasonsList.innerHTML = '';
            result.reasons.forEach(r => {
                const li = document.createElement('li');
                li.className = 'flex items-center gap-2';
                li.innerHTML = `<span class="text-amber-400">•</span> <span>${r}</span>`;
                reasonsList.appendChild(li);
            });
        }

        // Alternative Actions
        const altList = document.getElementById('alternative-actions-list');
        if (altList && result.all_candidates) {
            altList.innerHTML = '';
            const alts = result.all_candidates.slice(1);
            if (alts.length === 0) {
                altList.innerHTML = '<div class="text-xs text-slate-500">No secondary candidates.</div>';
            } else {
                alts.forEach(cand => {
                    const card = document.createElement('div');
                    card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between';
                    card.innerHTML = `
                        <div>
                            <div class="text-xs font-bold text-slate-200">${cand.action.replace(/_/g, ' ')}</div>
                            <div class="text-[11px] text-slate-400">Probability: ${Math.round(cand.probability * 100)}% • Impact: ${cand.urgency}</div>
                        </div>
                        <button class="btn-select-cand px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors" data-action="${cand.action}">
                            Prepare
                        </button>
                    `;
                    altList.appendChild(card);
                });

                document.querySelectorAll('.btn-select-cand').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const act = btn.getAttribute('data-action');
                        await this.prepareSpecificAction(act);
                    });
                });
            }
        }
    }

    async prepareSpecificAction(actionName) {
        try {
            const res = await fetch(`${API_BASE}/prepare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deal_id: this.currentDealId,
                    action: actionName
                })
            });
            const data = await res.json();
            if (data.success && data.prepared_action) {
                this.renderAnticipationResult({
                    predicted_action: actionName,
                    probability: 0.75,
                    confidence: 0.85,
                    reasons: [`Prepared on-demand via secondary candidate selection`],
                    prepared_action: data.prepared_action,
                    all_candidates: this.activePrediction ? this.activePrediction.all_candidates : []
                });
            }
        } catch (err) {
            console.error('Failed to prepare action on demand:', err);
        }
    }

    async confirmPreparedAction() {
        if (!this.activePreparedAction) return;

        const btn = document.getElementById('btn-hero-confirm');
        const origText = btn.innerHTML;
        btn.innerHTML = '<span>Executing...</span>';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prepared_id: this.activePreparedAction.prepared_id,
                    deal_id: this.currentDealId,
                    user_id: 'USER-101'
                })
            });

            const data = await res.json();
            if (data.success) {
                btn.innerHTML = '<span>✓ Executed!</span>';
                btn.className = 'px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2';

                setTimeout(async () => {
                    btn.innerHTML = origText;
                    btn.disabled = false;
                    btn.className = 'px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2';

                    await this.loadDealState(this.currentDealId);

                    // Automatically load follow-up anticipated cycle if generated!
                    if (data.next_anticipatory_cycle && data.next_anticipatory_cycle.prepared_action) {
                        this.renderAnticipationResult(data.next_anticipatory_cycle);
                    }
                }, 1000);
            }
        } catch (err) {
            console.error('Failed to confirm action:', err);
            btn.innerHTML = origText;
            btn.disabled = false;
        }
    }

    async dismissPreparedAction() {
        if (!this.activePreparedAction) return;

        try {
            await fetch(`${API_BASE}/dismiss`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prepared_id: this.activePreparedAction.prepared_id,
                    deal_id: this.currentDealId,
                    user_id: 'USER-101',
                    reason: 'User dismissed from cockpit'
                })
            });

            document.getElementById('hero-action-title').textContent = 'Operation Dismissed';
            document.getElementById('hero-summary').textContent = 'Suggestion dismissed. Anti-irritation policy recorded penalty.';
            this.activePreparedAction = null;
            await this.loadAuditHistory(this.currentDealId);
        } catch (err) {
            console.error('Failed to dismiss action:', err);
        }
    }

    async loadAuditHistory(dealId) {
        try {
            const res = await fetch(`${API_BASE}/history/${dealId}`);
            const data = await res.json();
            const timeline = document.getElementById('audit-timeline');
            if (timeline && data.success) {
                timeline.innerHTML = '';
                if (!data.audit_logs || data.audit_logs.length === 0) {
                    timeline.innerHTML = '<div class="text-slate-500 text-xs py-2">No past anticipation records.</div>';
                    return;
                }

                data.audit_logs.forEach(log => {
                    const row = document.createElement('div');
                    row.className = 'p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between';
                    const timeStr = new Date(log.timestamp).toLocaleTimeString();
                    row.innerHTML = `
                        <div>
                            <div class="font-bold text-slate-200">${log.predicted_action} <span class="font-normal text-slate-400">via ${log.event_type}</span></div>
                            <div class="text-[10px] text-slate-400">${timeStr} • Confidence: ${Math.round(log.confidence * 100)}%</div>
                        </div>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded ${log.user_decision === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}">
                            ${log.user_decision}
                        </span>
                    `;
                    timeline.appendChild(row);
                });
            }
        } catch (err) {
            console.error('Failed to load audit history:', err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.anticipatoryApp = new AnticipatoryApp();
});
