/**
 * DealFlow360 Search Engine Demo
 * Text Normalizer & Stop-Words Filter
 *
 * Normalizes text (Unicode NFKC, lowercase, punctuation removal) and filters
 * out common grammatical stop-words without discarding important alphanumeric identifiers.
 */

class Normalizer {
    // List of common English stop-words to ignore in normal searching
    static STOP_WORDS = new Set([
        'the', 'a', 'an', 'is', 'of', 'to', 'for', 'and', 'in',
        'on', 'with', 'at', 'by', 'from', 'or', 'as', 'it', 'be',
        'this', 'that', 'are', 'was', 'were', 'into', 'over'
    ]);

    /**
     * Normalizes a string with Unicode NFKC and lowercasing.
     * @param {string} text 
     * @returns {string} Normalized string
     */
    static normalizeString(text) {
        if (!text || typeof text !== 'string') return '';
        return text.normalize('NFKC').toLowerCase().trim();
    }

    /**
     * Checks whether a token is an identifier (e.g. 'qt-1001', 'prod-12')
     * @param {string} token 
     * @returns {boolean}
     */
    static isIdentifier(token) {
        if (!token) return false;
        // Alphanumeric with digits, or code-like patterns like qt-1001, v2, etc.
        return /^[a-z]+-[0-9]+$/i.test(token) || (/\d/.test(token) && /[a-z]/i.test(token));
    }

    /**
     * Filters out stop words from a list of tokens while preserving identifiers.
     * @param {string[]} tokens - Raw tokens
     * @returns {string[]} Filtered tokens
     */
    static removeStopWords(tokens) {
        if (!Array.isArray(tokens)) return [];
        return tokens.filter(token => {
            if (this.isIdentifier(token)) {
                return true; // Always keep identifiers
            }
            return !this.STOP_WORDS.has(token);
        });
    }

    /**
     * Normalizes and filters a list of tokens.
     * @param {string[]} tokens 
     * @returns {string[]} Normalized and filtered tokens
     */
    static processTokens(tokens) {
        const normalized = tokens.map(t => this.normalizeString(t)).filter(Boolean);
        return this.removeStopWords(normalized);
    }
}

module.exports = Normalizer;
