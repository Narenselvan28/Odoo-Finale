/**
 * DealFlow360 Search Engine Demo
 * Fuzzy Matcher Module (Levenshtein Distance & Spelling Tolerance)
 *
 * Compares query tokens against the indexed vocabulary to identify closest
 * term matches for typo correction and approximate candidate retrieval.
 */

const { distance } = require('fastest-levenshtein');
const Normalizer = require('./normalizer');

class FuzzyMatcher {
    /**
     * Calculates the normalized similarity score [0.0 - 1.0] between two strings.
     * 1.0 = exact match, 0.0 = completely different.
     * @param {string} a 
     * @param {string} b 
     * @returns {number}
     */
    static calculateSimilarity(a, b) {
        if (a === b) return 1.0;
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1.0;
        const dist = distance(a, b);
        return Math.max(0, 1.0 - (dist / maxLen));
    }

    /**
     * Determines maximum allowable edit distance based on token length.
     * @param {string} token 
     * @returns {number}
     */
    static getMaxAllowedDistance(token) {
        const len = token.length;
        if (len <= 3) return 0; // Too short for fuzzy guessing
        if (len <= 5) return 1; // 1 typo allowed for short-medium words (e.g. 'delivry' -> 'delivery')
        if (len <= 8) return 2; // 2 typos allowed for medium words (e.g. 'extnded' -> 'extended', 'warrnty' -> 'warranty')
        return 3;              // 3 typos allowed for long words
    }

    /**
     * Finds the closest matching term from the vocabulary for a misspelled query token.
     * @param {string} queryToken - Unmatched query word
     * @param {Set<string>|string[]} vocabulary - Set of indexed terms
     * @returns {{ match: string, distance: number, similarity: number } | null}
     */
    static findBestMatch(queryToken, vocabulary) {
        if (!queryToken || Normalizer.isIdentifier(queryToken)) {
            return null; // Do not fuzzy-correct alphanumeric identifiers
        }

        const maxDist = this.getMaxAllowedDistance(queryToken);
        if (maxDist === 0) return null;

        let bestMatch = null;
        let minDistance = Infinity;
        let bestSimilarity = 0;

        for (const term of vocabulary) {
            // Quick length filter to prune expensive distance calculations
            if (Math.abs(term.length - queryToken.length) > maxDist) {
                continue;
            }

            const dist = distance(queryToken, term);
            if (dist <= maxDist && dist < minDistance) {
                const similarity = this.calculateSimilarity(queryToken, term);
                // Minimum similarity threshold (e.g., 0.65) to prevent completely weird matches
                if (similarity >= 0.65) {
                    minDistance = dist;
                    bestMatch = term;
                    bestSimilarity = similarity;
                }
            }
        }

        if (bestMatch && minDistance <= maxDist) {
            return {
                match: bestMatch,
                distance: minDistance,
                similarity: Number(bestSimilarity.toFixed(4))
            };
        }

        return null;
    }
}

module.exports = FuzzyMatcher;
