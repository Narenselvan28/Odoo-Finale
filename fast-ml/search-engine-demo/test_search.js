/**
 * DealFlow360 Search Engine Demo
 * Automated Test Suite
 *
 * Tests the 9 mandatory search test cases + reindex endpoint:
 * 1. "extended warranty" (Exact match)
 * 2. "extnded warrnty" (Fuzzy match + spelling correction)
 * 3. "custmer" (Fuzzy match -> customer)
 * 4. "delivry" (Fuzzy match -> delivery)
 * 5. "warrnty" (Fuzzy match -> warranty)
 * 6. "QT-1001" (Exact identifier match)
 * 7. "laptop" (Keyword match)
 * 8. "randomxyz123" (Zero-results match)
 * 9. '"extended warranty"' (Phrase match)
 * 10. Reindex API functionality
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const searchService = require('./backend/modules/search/searchService');

async function runTests() {
    console.log('======================================================================');
    console.log('  DEALFLOW360 SEARCH ENGINE TEST SUITE');
    console.log('======================================================================\n');

    // Initialize search engine
    console.log('[Setup] Initializing search engine and loading data from MySQL...');
    const stats = await searchService.initialize();
    console.log(`[Setup] Loaded ${stats.totalDocuments} documents, ${stats.totalUniqueTerms} unique terms.\n`);

    const testCases = [
        {
            name: 'TEST 1: Exact Search ("extended warranty")',
            query: 'extended warranty',
            validate: (res) => {
                const found = res.results.some(r => r.title.toLowerCase().includes('extended warranty'));
                return found && res.results.length > 0;
            },
            expectedNote: 'Should find Extended Warranty quotation and product'
        },
        {
            name: 'TEST 2: Typo / Fuzzy Search ("extnded warrnty")',
            query: 'extnded warrnty',
            validate: (res) => {
                const found = res.results.some(r => r.title.toLowerCase().includes('extended warranty'));
                const hasCorrection = res.correctedQuery === 'extended warranty';
                return found && hasCorrection;
            },
            expectedNote: 'Should find Extended Warranty AND return correctedQuery: "extended warranty"'
        },
        {
            name: 'TEST 3: Fuzzy Search ("custmer")',
            query: 'custmer',
            validate: (res) => {
                const hasResults = res.results.length > 0;
                const hasCorrection = res.correctedQuery === 'customer';
                return hasResults && hasCorrection;
            },
            expectedNote: 'Should return customer results AND correctedQuery: "customer"'
        },
        {
            name: 'TEST 4: Fuzzy Search ("delivry")',
            query: 'delivry',
            validate: (res) => {
                const found = res.results.some(r => r.title.toLowerCase().includes('delivery') || r.category.toLowerCase().includes('logistics'));
                const hasCorrection = res.correctedQuery === 'delivery';
                return found && hasCorrection;
            },
            expectedNote: 'Should return Delivery results AND correctedQuery: "delivery"'
        },
        {
            name: 'TEST 5: Fuzzy Search ("warrnty")',
            query: 'warrnty',
            validate: (res) => {
                const found = res.results.some(r => r.title.toLowerCase().includes('warranty'));
                const hasCorrection = res.correctedQuery === 'warranty';
                return found && hasCorrection;
            },
            expectedNote: 'Should return Warranty results AND correctedQuery: "warranty"'
        },
        {
            name: 'TEST 6: Identifier Search ("QT-1001")',
            query: 'QT-1001',
            validate: (res) => {
                return res.results.length > 0 && res.results[0].id === 'QT-1001';
            },
            expectedNote: 'Should return exact quotation QT-1001 with top ranking'
        },
        {
            name: 'TEST 7: Keyword Search ("laptop")',
            query: 'laptop',
            validate: (res) => {
                return res.results.length > 0 && res.results.some(r => r.title.toLowerCase().includes('laptop'));
            },
            expectedNote: 'Should return High-Performance Laptop product and quotation'
        },
        {
            name: 'TEST 8: Zero Match Search ("randomxyz123")',
            query: 'randomxyz123',
            validate: (res) => {
                return res.results.length === 0 && res.meta.total === 0;
            },
            expectedNote: 'Should return 0 results cleanly without error'
        },
        {
            name: 'TEST 9: Phrase Search (\'"extended warranty"\')',
            query: '"extended warranty"',
            validate: (res) => {
                return res.results.length > 0 && res.results[0].title.toLowerCase().includes('extended warranty');
            },
            expectedNote: 'Should boost documents matching exact phrase'
        }
    ];

    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        console.log(`----------------------------------------------------------------------`);
        console.log(`[${tc.name}]`);
        console.log(`Query: "${tc.query}"`);
        
        const response = searchService.search(tc.query);
        const isPassed = tc.validate(response);

        console.log(`Execution Time: ${response.meta.tookMs} ms`);
        console.log(`Corrected Query: ${response.correctedQuery || 'null'}`);
        console.log(`Total Results: ${response.meta.total}`);
        if (response.results.length > 0) {
            console.log(`Top 2 Results:`);
            response.results.slice(0, 2).forEach((r, idx) => {
                console.log(`  ${idx + 1}. [${r.type.toUpperCase()}] ${r.title} (ID: ${r.id}, Customer: ${r.customer || 'N/A'}, Score: ${r.score})`);
            });
        }

        if (isPassed) {
            console.log(`Status: ✓ PASSED (${tc.expectedNote})`);
            passedCount++;
        } else {
            console.error(`Status: ✗ FAILED!`);
        }
        console.log('');
    }

    // TEST 10: Reindex
    console.log(`----------------------------------------------------------------------`);
    console.log(`[TEST 10: Index Rebuilding (reindex)]`);
    const reindexRes = await searchService.reindex();
    console.log(`Reindex Result: ${JSON.stringify(reindexRes)}`);
    const reindexPassed = reindexRes.documents > 0 && reindexRes.terms > 0;
    if (reindexPassed) {
        console.log(`Status: ✓ PASSED (Rebuilt index with ${reindexRes.documents} docs)`);
        passedCount++;
    } else {
        console.error(`Status: ✗ FAILED!`);
    }

    console.log('\n======================================================================');
    console.log(`FINAL RESULT: ${passedCount} / ${testCases.length + 1} TESTS PASSED`);
    console.log('======================================================================');

    process.exit(passedCount === testCases.length + 1 ? 0 : 1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
