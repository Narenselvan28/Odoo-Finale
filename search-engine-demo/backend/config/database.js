/**
 * DealFlow360 Search Engine Demo
 * MySQL Database Configuration & Pool Manager
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '0000',
    database: process.env.DB_NAME || 'search_engine_demo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log(`[Database] Connected to MySQL (${process.env.DB_NAME || 'search_engine_demo'}) on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('[Database] Connection failed:', error.message);
        throw error;
    }
}

module.exports = {
    pool,
    testConnection
};
