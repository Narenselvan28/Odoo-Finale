/**
 * DealFlow360 Search Demo - Vanilla JavaScript Frontend Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const suggestionBox = document.getElementById('suggestion-box');
    const suggestionLink = document.getElementById('suggestion-link');
    const metaInfo = document.getElementById('meta-info');
    const resultCount = document.getElementById('result-count');
    const tookMs = document.getElementById('took-ms');
    const statusMessage = document.getElementById('status-message');
    const resultsContainer = document.getElementById('results-container');
    const reindexBtn = document.getElementById('reindex-btn');
    const reindexStatus = document.getElementById('reindex-status');
    const chips = document.querySelectorAll('.chip');

    // Quick Test Chips click listener
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            searchInput.value = query;
            performSearch(query);
        });
    });

    // Form submit listener
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        performSearch(query);
    });

    // Suggestion click listener ("Did you mean?")
    suggestionLink.addEventListener('click', (e) => {
        e.preventDefault();
        const corrected = suggestionLink.textContent;
        searchInput.value = corrected;
        performSearch(corrected);
    });

    // Rebuild index button
    reindexBtn.addEventListener('click', async () => {
        reindexBtn.disabled = true;
        reindexStatus.textContent = 'Rebuilding index from MySQL...';
        try {
            const res = await fetch('/api/search/reindex', { method: 'POST' });
            const data = await res.json();
            reindexStatus.textContent = `✓ Indexed ${data.documents} docs (${data.terms} terms)`;
            setTimeout(() => { reindexStatus.textContent = ''; }, 4000);
        } catch (err) {
            reindexStatus.textContent = '✗ Failed to rebuild index';
        } finally {
            reindexBtn.disabled = false;
        }
    });

    /**
     * Executes the search request via fetch()
     */
    async function performSearch(query) {
        if (!query) {
            resultsContainer.innerHTML = '';
            metaInfo.style.display = 'none';
            suggestionBox.style.display = 'none';
            statusMessage.textContent = 'Please enter a search query above.';
            return;
        }

        // Loading state
        statusMessage.textContent = 'Searching...';
        resultsContainer.innerHTML = '';
        suggestionBox.style.display = 'none';
        metaInfo.style.display = 'none';

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) {
                throw new Error(`Server returned status ${res.status}`);
            }

            const data = await res.json();
            renderResults(data);
        } catch (error) {
            console.error('Search error:', error);
            statusMessage.textContent = `Error: ${error.message}. Please check if the backend is running.`;
        }
    }

    /**
     * Renders search results and metadata to the DOM
     */
    function renderResults(data) {
        statusMessage.textContent = '';

        // 1. "Did you mean?" Suggestion
        if (data.correctedQuery) {
            suggestionLink.textContent = data.correctedQuery;
            suggestionBox.style.display = 'block';
        } else {
            suggestionBox.style.display = 'none';
        }

        // 2. Metadata: Result count & execution time
        resultCount.textContent = data.meta.total;
        tookMs.textContent = data.meta.tookMs;
        metaInfo.style.display = 'block';

        // 3. No results check
        if (!data.results || data.results.length === 0) {
            statusMessage.innerHTML = `<p>No matching records found for <strong>"${escapeHtml(data.query)}"</strong>.</p>`;
            return;
        }

        // 4. Render result cards
        const fragment = document.createDocumentFragment();

        data.results.forEach(item => {
            const card = document.createElement('div');
            card.className = 'result-card';

            const badgeClass = getBadgeClass(item.type);
            const displayTitle = item.highlight || escapeHtml(item.title);

            let metaDetails = [];
            if (item.customer) metaDetails.push(`<strong>Customer:</strong> ${escapeHtml(item.customer)}`);
            if (item.status) metaDetails.push(`<strong>Status/Tier:</strong> ${escapeHtml(item.status)}`);
            if (item.category) metaDetails.push(`<strong>Category:</strong> ${escapeHtml(item.category)}`);

            card.innerHTML = `
                <div class="result-header">
                    <div class="result-title">${displayTitle}</div>
                    <span class="result-badge ${badgeClass}">${item.type}</span>
                </div>
                ${metaDetails.length > 0 ? `<div class="result-meta">${metaDetails.join(' &nbsp;·&nbsp; ')}</div>` : ''}
                <div class="result-footer">
                    <span>ID: ${escapeHtml(item.id)}</span>
                    <span>Relevance Score: <strong>${item.score}</strong></span>
                </div>
            `;

            fragment.appendChild(card);
        });

        resultsContainer.appendChild(fragment);
    }

    function getBadgeClass(type) {
        switch (type) {
            case 'quotation': return 'badge-quotation';
            case 'product': return 'badge-product';
            case 'customer': return 'badge-customer';
            case 'message': return 'badge-message';
            default: return 'badge-quotation';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
