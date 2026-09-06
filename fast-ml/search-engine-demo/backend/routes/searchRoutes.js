/**
 * DealFlow360 Search Engine Demo
 * Search API Routes
 *
 * Endpoints:
 * - GET  /api/search?q=...
 * - POST /api/search/reindex
 * - GET  /api/search/stats
 */

const express = require('express');
const router = express.Router();
const searchService = require('../modules/search/searchService');

/**
 * GET /api/search?q=extnded%20warrnty
 * Performs full-text search with tokenization, fuzzy matching, and ranking.
 */
router.get('/search', (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit, 10) || 20;

        // Security / length guard
        if (query.length > 300) {
            return res.status(400).json({
                error: {
                    code: 'QUERY_TOO_LONG',
                    message: 'Search query exceeds maximum length of 300 characters.'
                }
            });
        }

        const response = searchService.search(query, { limit });
        return res.json(response);
    } catch (error) {
        console.error('[SearchRoute] Error executing search:', error);
        return res.status(500).json({
            error: {
                code: 'SEARCH_ERROR',
                message: error.message || 'An error occurred while processing search query.'
            }
        });
    }
});

/**
 * POST /api/search/reindex
 * Rebuilds the search index from the current MySQL database state.
 */
router.post('/search/reindex', async (req, res) => {
    try {
        const result = await searchService.reindex();
        return res.json(result);
    } catch (error) {
        console.error('[SearchRoute] Reindex error:', error);
        return res.status(500).json({
            error: {
                code: 'REINDEX_ERROR',
                message: 'Failed to rebuild search index from MySQL.'
            }
        });
    }
});

/**
 * GET /api/search/stats
 * Returns index stats (documents count, unique terms count).
 */
router.get('/search/stats', (req, res) => {
    try {
        const stats = searchService.getStats();
        return res.json({
            status: 'ready',
            ...stats
        });
    } catch (error) {
        return res.status(500).json({
            error: {
                code: 'STATS_ERROR',
                message: error.message
            }
        });
    }
});

module.exports = router;
