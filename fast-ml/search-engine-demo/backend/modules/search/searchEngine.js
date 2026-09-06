/**
 * DealFlow360 Search Engine Demo
 * Search Engine Core Execution Pipeline
 *
 * Coordinates tokenization, normalization, fuzzy matching, candidate retrieval
 * from the Inverted Index, relevance scoring with field boosts, and suggestion generation.
 */

const { performance } = require('perf_hooks');
const Tokenizer = require('./tokenizer');
const Normalizer = require('./normalizer');
const FuzzyMatcher = require('./fuzzyMatcher');
const Ranker = require('./ranker');

class SearchEngine {
    /**
     * @param {import('./invertedIndex')} invertedIndex 
     */
    constructor(invertedIndex) {
        this.invertedIndex = invertedIndex;
    }

    /**
     * Executes a full-text search query.
     * @param {string} rawQuery - Search query from user
     * @param {object} options - Search options (limit, offset)
     * @returns {object} Standardized search response JSON
     */
    search(rawQuery, options = {}) {
        const startTime = performance.now();
        const limit = options.limit || 20;

        if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
            return {
                query: rawQuery || '',
                correctedQuery: null,
                results: [],
                meta: {
                    total: 0,
                    tookMs: 0
                }
            };
        }

        const trimmedQuery = rawQuery.trim();

        // 1. Tokenize query
        const rawTokens = Tokenizer.tokenize(trimmedQuery);

        // 2. Normalize and remove stop words
        const processedTokens = Normalizer.processTokens(rawTokens);

        // If all tokens were stop words (e.g. 'the of and'), fallback to raw tokens
        const activeTokens = processedTokens.length > 0 ? processedTokens : rawTokens;

        if (activeTokens.length === 0) {
            return {
                query: trimmedQuery,
                correctedQuery: null,
                results: [],
                meta: { total: 0, tookMs: Math.round(performance.now() - startTime) }
            };
        }

        // 3. Match tokens against vocabulary (Exact or Fuzzy)
        const vocabulary = this.invertedIndex.getVocabulary();
        const tokenMatchPlan = [];
        let hasCorrections = false;
        const correctedTokens = [];

        for (const token of activeTokens) {
            if (this.invertedIndex.hasTerm(token)) {
                // Exact match found in vocabulary
                tokenMatchPlan.push({
                    queryToken: token,
                    matchedTerm: token,
                    isExact: true,
                    similarity: 1.0,
                    postings: this.invertedIndex.getPostings(token)
                });
                correctedTokens.push(token);
            } else {
                // Token not found exactly -> Attempt fuzzy matching
                const fuzzyResult = FuzzyMatcher.findBestMatch(token, vocabulary);
                if (fuzzyResult) {
                    hasCorrections = true;
                    correctedTokens.push(fuzzyResult.match);
                    tokenMatchPlan.push({
                        queryToken: token,
                        matchedTerm: fuzzyResult.match,
                        isExact: false,
                        similarity: fuzzyResult.similarity,
                        postings: this.invertedIndex.getPostings(fuzzyResult.match)
                    });
                } else {
                    // No vocabulary match at all
                    correctedTokens.push(token);
                }
            }
        }

        // 4. Build "Did you mean" corrected query string if corrections exist
        let correctedQuery = null;
        if (hasCorrections) {
            correctedQuery = correctedTokens.join(' ');
            // If the corrected query is identical to input, keep null
            if (correctedQuery.toLowerCase() === trimmedQuery.toLowerCase()) {
                correctedQuery = null;
            }
        }

        // 5. Gather candidate documents from Inverted Index
        // Map: docId -> Array<matchInfo>
        const candidateDocsMap = new Map();
        const allMatchedTerms = [];

        for (const plan of tokenMatchPlan) {
            allMatchedTerms.push(plan.matchedTerm);
            if (!plan.postings) continue;

            for (const [docId, posting] of plan.postings.entries()) {
                if (!candidateDocsMap.has(docId)) {
                    candidateDocsMap.set(docId, []);
                }
                candidateDocsMap.get(docId).push({
                    queryToken: plan.queryToken,
                    matchedTerm: plan.matchedTerm,
                    isExact: plan.isExact,
                    similarity: plan.similarity,
                    posting: posting
                });
            }
        }

        // 6. Score and rank candidate documents
        const scoredResults = [];

        for (const [docId, matchedInfos] of candidateDocsMap.entries()) {
            const doc = this.invertedIndex.getDocument(docId);
            if (!doc) continue;

            const score = Ranker.scoreDocument(
                doc,
                matchedInfos,
                activeTokens,
                trimmedQuery
            );

            if (score > 0) {
                scoredResults.push({
                    id: doc.id,
                    type: doc.type,
                    title: doc.title,
                    customer: doc.customer || null,
                    status: doc.status || null,
                    category: doc.category || null,
                    score: score,
                    highlight: Ranker.highlightText(doc.title + (doc.customer ? ` · ${doc.customer}` : ''), allMatchedTerms)
                });
            }
        }

        // 7. Sort by score descending (highest relevance first)
        scoredResults.sort((a, b) => b.score - a.score);

        // 8. Apply limit
        const paginatedResults = scoredResults.slice(0, limit);

        const executionDuration = Math.round(performance.now() - startTime);

        return {
            query: trimmedQuery,
            correctedQuery: correctedQuery,
            results: paginatedResults,
            meta: {
                total: scoredResults.length,
                tookMs: executionDuration
            }
        };
    }
}

module.exports = SearchEngine;
