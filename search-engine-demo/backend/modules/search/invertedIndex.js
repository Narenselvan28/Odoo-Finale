/**
 * DealFlow360 Search Engine Demo
 * Inverted Index Module
 *
 * In-memory inverted index data structure that maps normalized vocabulary
 * terms directly to candidate document IDs and field occurrences.
 * Allows O(1) candidate lookup instead of full-table scanning.
 */

class InvertedIndex {
    constructor() {
        // Map: term -> Map<docId, { termFreq: number, fieldWeights: Record<string, number> }>
        this.index = new Map();
        // Set of all unique normalized terms across the document corpus
        this.vocabulary = new Set();
        // Storage of generic documents: Map<docId, Document>
        this.documents = new Map();
    }

    /**
     * Clears the current index and vocabulary.
     */
    clear() {
        this.index.clear();
        this.vocabulary.clear();
        this.documents.clear();
    }

    /**
     * Indexes a document with its field-specific token arrays.
     * @param {object} doc - Generic search document
     * @param {Record<string, string[]>} fieldTokensMap - Map of field names to their token arrays
     */
    addDocument(doc, fieldTokensMap) {
        if (!doc || !doc.id) return;

        // Store document record
        this.documents.set(doc.id, doc);

        // Populate inverted index postings
        for (const [fieldName, tokens] of Object.entries(fieldTokensMap)) {
            if (!Array.isArray(tokens)) continue;

            for (const token of tokens) {
                if (!token) continue;

                this.vocabulary.add(token);

                if (!this.index.has(token)) {
                    this.index.set(token, new Map());
                }

                const postingsMap = this.index.get(token);
                if (!postingsMap.has(doc.id)) {
                    postingsMap.set(doc.id, {
                        termFreq: 0,
                        fieldWeights: {}
                    });
                }

                const docPosting = postingsMap.get(doc.id);
                docPosting.termFreq += 1;
                docPosting.fieldWeights[fieldName] = (docPosting.fieldWeights[fieldName] || 0) + 1;
            }
        }
    }

    /**
     * Retrieves postings for a specific vocabulary term.
     * @param {string} term 
     * @returns {Map<string, object> | null} Map of docId -> posting info
     */
    getPostings(term) {
        if (!term) return null;
        return this.index.get(term) || null;
    }

    /**
     * Checks if a term exists in the index vocabulary.
     * @param {string} term 
     * @returns {boolean}
     */
    hasTerm(term) {
        return this.vocabulary.has(term);
    }

    /**
     * Gets a document by its ID.
     * @param {string} docId 
     * @returns {object | null}
     */
    getDocument(docId) {
        return this.documents.get(docId) || null;
    }

    /**
     * Returns the full set of indexed vocabulary terms.
     * @returns {Set<string>}
     */
    getVocabulary() {
        return this.vocabulary;
    }

    /**
     * Returns index statistics.
     * @returns {{ totalDocuments: number, totalUniqueTerms: number }}
     */
    getStats() {
        return {
            totalDocuments: this.documents.size,
            totalUniqueTerms: this.vocabulary.size
        };
    }
}

module.exports = InvertedIndex;
