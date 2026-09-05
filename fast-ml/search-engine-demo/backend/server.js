/**
 * DealFlow360 Search Engine Demo
 * Express Application Server
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const searchService = require('./modules/search/searchService');
const searchRoutes = require('./routes/searchRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve testing frontend directly from ../frontend
const frontendPath = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api', searchRoutes);

// Root fallback to frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Startup lifecycle
async function startServer() {
    try {
        console.log('====================================================');
        console.log('  DealFlow360 — Standalone Search Engine Demo');
        console.log('====================================================');

        // 1. Verify MySQL Connection
        await testConnection();

        // 2. Build In-Memory Search Index from MySQL
        const stats = await searchService.initialize();

        // 3. Start Express HTTP Server
        app.listen(PORT, () => {
            console.log(`[Server] Search Engine Demo running at http://localhost:${PORT}`);
            console.log(`[Server] Indexed ${stats.totalDocuments} documents (${stats.totalUniqueTerms} unique terms)`);
            console.log('====================================================\n');
        });
    } catch (error) {
        console.error('[Server] Startup failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
