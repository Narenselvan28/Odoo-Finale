/**
 * DealFlow360 Search Engine Demo
 * Index Builder Module
 *
 * Fetches database records from MySQL, maps them into search documents,
 * tokenizes and normalizes their fields, and populates the Inverted Index.
 */

const { pool } = require('../../config/database');
const DocumentMapper = require('./documentMapper');
const Tokenizer = require('./tokenizer');
const Normalizer = require('./normalizer');

class IndexBuilder {
    /**
     * Builds or rebuilds the Inverted Index from MySQL data.
     * @param {import('./invertedIndex')} invertedIndex 
     * @returns {Promise<{ totalDocuments: number, totalUniqueTerms: number }>}
     */
    static async buildIndex(invertedIndex) {
        console.log('[IndexBuilder] Starting index build from MySQL...');
        const startTime = Date.now();

        invertedIndex.clear();
        let documentCount = 0;

        // 1. Fetch Customers
        const [customerRows] = await pool.query('SELECT * FROM customers');
        for (const row of customerRows) {
            const doc = DocumentMapper.fromCustomer(row);
            const tokenMap = this.tokenizeDocumentFields(doc);
            invertedIndex.addDocument(doc, tokenMap);
            documentCount++;
        }

        // 2. Fetch Products
        const [productRows] = await pool.query('SELECT * FROM products');
        for (const row of productRows) {
            const doc = DocumentMapper.fromProduct(row);
            const tokenMap = this.tokenizeDocumentFields(doc);
            invertedIndex.addDocument(doc, tokenMap);
            documentCount++;
        }

        // 3. Fetch Quotations (joined with customer and product data)
        const [quotationRows] = await pool.query(`
            SELECT 
                q.id,
                q.quotation_number,
                q.customer_id,
                q.product_id,
                q.status,
                q.total_amount,
                c.name AS customer_name,
                c.company,
                p.name AS product_name,
                p.category AS product_category
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN products p ON q.product_id = p.id
        `);
        for (const row of quotationRows) {
            const doc = DocumentMapper.fromQuotation(row);
            const tokenMap = this.tokenizeDocumentFields(doc);
            invertedIndex.addDocument(doc, tokenMap);
            documentCount++;
        }

        // 4. Fetch Messages (joined with quotation, customer, product data)
        const [messageRows] = await pool.query(`
            SELECT 
                m.id,
                m.quotation_id,
                m.message,
                q.quotation_number,
                q.status AS quotation_status,
                c.company,
                p.name AS product_name
            FROM messages m
            LEFT JOIN quotations q ON m.quotation_id = q.id
            LEFT JOIN customers c ON q.customer_id = c.id
            LEFT JOIN products p ON q.product_id = p.id
        `);
        for (const row of messageRows) {
            const doc = DocumentMapper.fromMessage(row);
            const tokenMap = this.tokenizeDocumentFields(doc);
            invertedIndex.addDocument(doc, tokenMap);
            documentCount++;
        }

        const stats = invertedIndex.getStats();
        const duration = Date.now() - startTime;

        console.log(`[IndexBuilder] Connected to MySQL`);
        console.log(`[IndexBuilder] Loaded ${stats.totalDocuments} documents`);
        console.log(`[IndexBuilder] Indexed ${stats.totalUniqueTerms} unique terms`);
        console.log(`[IndexBuilder] Search engine ready (${duration} ms)`);

        return stats;
    }

    /**
     * Tokenizes each individual field of a document and its unified search text.
     * @param {object} doc 
     * @returns {Record<string, string[]>} Field name to processed token array mapping
     */
    static tokenizeDocumentFields(doc) {
        const tokenMap = {};

        // Tokenize individual named fields for boosting
        if (doc.fields) {
            for (const [fieldName, fieldValue] of Object.entries(doc.fields)) {
                if (typeof fieldValue === 'string') {
                    const rawTokens = Tokenizer.tokenize(fieldValue);
                    tokenMap[fieldName] = Normalizer.processTokens(rawTokens);
                }
            }
        }

        // Also tokenize full search text
        if (doc.searchText) {
            const rawTokens = Tokenizer.tokenize(doc.searchText);
            tokenMap['searchText'] = Normalizer.processTokens(rawTokens);
        }

        return tokenMap;
    }
}

module.exports = IndexBuilder;
