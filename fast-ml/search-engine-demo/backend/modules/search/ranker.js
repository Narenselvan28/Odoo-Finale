/**
 * DealFlow360 Search Engine Demo
 * Relevance Ranker Module
 *
 * Computes relevance scores for candidate documents based on:
 * - Exact token matches
 * - Fuzzy similarity weights
 * - Field importance boosts (e.g., Quotation Number 10x, Customer 8x, Product 7x, Status 5x, Message 3x)
 * - Multi-token query coverage
 * - Contiguous phrase matching
 */

class Ranker {
    // Field boost multipliers
    static FIELD_BOOSTS = {
        quotation_number: 10.0,
        id: 10.0,
        customer: 8.0,
        company: 8.0,
        name: 7.5,
        product: 7.0,
        product_name: 7.0,
        title: 7.0,
        status: 5.0,
        category: 4.5,
        description: 3.0,
        message: 3.0,
        default: 1.0
    };

    /**
     * Gets the boost multiplier for a specific field.
     * @param {string} fieldName 
     * @returns {number}
     */
    static getFieldBoost(fieldName) {
        return this.FIELD_BOOSTS[fieldName] || this.FIELD_BOOSTS.default;
    }

    /**
     * Computes relevance score for a single candidate document.
     * @param {object} doc - Search document
     * @param {Array<{ queryToken: string, matchedTerm: string, isExact: boolean, similarity: number, posting: object }>} matchedTermsInfo
     * @param {string[]} originalQueryTokens - Full list of query tokens
     * @param {string} rawQuery - Raw query string for phrase matching
     * @returns {number} Relevance score rounded to 2 decimals
     */
    static scoreDocument(doc, matchedTermsInfo, originalQueryTokens, rawQuery) {
        let score = 0;
        const matchedQueryTokens = new Set();

        for (const info of matchedTermsInfo) {
            const { queryToken, isExact, similarity, posting } = info;
            if (!posting) continue;

            matchedQueryTokens.add(queryToken);

            // Calculate base token weight
            const baseWeight = isExact ? 10.0 : (similarity * 5.0);

            // Apply field-specific boosts
            let docFieldScore = 0;
            const fieldWeights = posting.fieldWeights || {};

            for (const [fieldName, count] of Object.entries(fieldWeights)) {
                const boost = this.getFieldBoost(fieldName);
                // Sub-linear term frequency scaling: 1 + log(count)
                const tfFactor = 1.0 + Math.log10(count);
                docFieldScore += baseWeight * boost * tfFactor;
            }

            // If no specific field was mapped, fallback to general boost
            if (Object.keys(fieldWeights).length === 0) {
                docFieldScore += baseWeight * (posting.termFreq || 1);
            }

            score += docFieldScore;
        }

        // 1. Multi-Token Coverage Bonus
        const totalQueryTokensCount = originalQueryTokens.length;
        if (totalQueryTokensCount > 0) {
            const coverageRatio = matchedQueryTokens.size / totalQueryTokensCount;
            score += coverageRatio * 15.0;

            // Full query coverage bonus
            if (matchedQueryTokens.size === totalQueryTokensCount && totalQueryTokensCount > 1) {
                score += 25.0;
            }
        }

        // 2. Exact Phrase Match Bonus
        if (rawQuery && rawQuery.trim().length > 2) {
            const cleanRaw = rawQuery.replace(/["']/g, '').toLowerCase().trim();
            const docSearchText = (doc.searchText || '').toLowerCase();
            if (docSearchText.includes(cleanRaw)) {
                score += 20.0;
            }
        }

        return Number(score.toFixed(2));
    }

    /**
     * Generates HTML markup with <mark> tags around matched words for UI display.
     * @param {string} text 
     * @param {string[]} matchedTerms 
     * @returns {string}
     */
    static highlightText(text, matchedTerms) {
        if (!text || !Array.isArray(matchedTerms) || matchedTerms.length === 0) {
            return text;
        }

        let highlighted = text;
        const sortedTerms = [...new Set(matchedTerms)].filter(t => t && t.length > 1).sort((a, b) => b.length - a.length);

        for (const term of sortedTerms) {
            const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(\\b${escaped}\\b|[a-z0-9]*${escaped}[a-z0-9]*)`, 'gi');
            highlighted = highlighted.replace(regex, '<mark>$1</mark>');
        }

        return highlighted;
    }
}

module.exports = Ranker;
