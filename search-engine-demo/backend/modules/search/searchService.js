/**
 * DealFlow360 Search Engine Demo
 * Search Service Singleton
 *
 * Provides a unified API interface for the Express application to initialize,
 * execute queries, and rebuild the search index on demand.
 */

const InvertedIndex = require('./invertedIndex');
const IndexBuilder = require('./indexBuilder');
const SearchEngine = require('./searchEngine');

class SearchService {
    constructor() {
        this.invertedIndex = new InvertedIndex();
        this.searchEngine = new SearchEngine(this.invertedIndex);
        this.isInitialized = false;
    }

    /**
     * Initializes the search index from the MySQL database.
     */
    async initialize() {
        try {
            const stats = await IndexBuilder.buildIndex(this.invertedIndex);
            this.isInitialized = true;
            return stats;
        } catch (error) {
            console.error('[SearchService] Index initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Executes a search query.
     * @param {string} query 
     * @param {object} options 
     */
    search(query, options) {
        if (!this.isInitialized) {
            throw new Error('Search engine is still initializing. Please retry in a moment.');
        }
        return this.searchEngine.search(query, options);
    }

    /**
     * Rebuilds the search index from MySQL.
     */
    async reindex() {
        const stats = await IndexBuilder.buildIndex(this.invertedIndex);
        return {
            message: 'Index rebuilt successfully',
            documents: stats.totalDocuments,
            terms: stats.totalUniqueTerms
        };
    }

    /**
     * Gets index statistics.
     */
    getStats() {
        return this.invertedIndex.getStats();
    }
}

// Export singleton instance
const searchService = new SearchService();
module.exports = searchService;
