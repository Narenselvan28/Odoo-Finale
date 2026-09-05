/**
 * DealFlow360 Search Engine Demo
 * Tokenizer Module
 *
 * Converts raw text into an array of normalized token strings.
 * Preserves alphanumeric identifiers (e.g., 'QT-1001', 'PROD-102') while stripping
 * standard sentence punctuation, quotes, symbols, and extra whitespace.
 */

class Tokenizer {
    /**
     * Tokenizes a text string into an array of clean words and identifiers.
     * @param {string} text - Raw input text
     * @returns {string[]} Array of token strings
     */
    static tokenize(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        // 1. Convert to lowercase
        const lower = text.toLowerCase().trim();

        // 2. Tokenize by matching words and hyphenated identifiers (e.g. 'qt-1001', 'fast-ml', 'noise-canceling')
        // Regex matches sequences of alphanumeric characters and internal hyphens/underscores
        const matches = lower.match(/[a-z0-9]+(?:[-_][a-z0-9]+)*/g);

        if (!matches) {
            return [];
        }

        const tokens = [];
        for (const token of matches) {
            // Clean leading or trailing dashes/underscores
            const cleaned = token.replace(/^[-_]+|[-_]+$/g, '');
            if (cleaned.length > 0) {
                tokens.push(cleaned);
                
                // If it is a hyphenated compound (e.g. 'noise-canceling'), also index individual sub-tokens
                if (cleaned.includes('-') && !/^[a-z]+-[0-9]+$/.test(cleaned)) {
                    const subTokens = cleaned.split('-');
                    for (const sub of subTokens) {
                        if (sub.length > 1 && !tokens.includes(sub)) {
                            tokens.push(sub);
                        }
                    }
                }
            }
        }

        return tokens;
    }
}

module.exports = Tokenizer;
