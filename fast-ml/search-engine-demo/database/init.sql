-- ==========================================================
-- DealFlow360 - Standalone Full-Text Search Engine Demo
-- Database Initialization & Sample Data
-- ==========================================================

CREATE DATABASE IF NOT EXISTS search_engine_demo;
USE search_engine_demo;

-- 1. Drop existing tables if re-initializing
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

-- 2. Customers Table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    customer_tier VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    company VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Quotations Table
CREATE TABLE quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 5. Messages Table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

-- ==========================================================
-- 6. Insert Realistic Dummy Data (Customers, Products, Quotations, Messages)
-- ==========================================================

-- Customers
INSERT INTO customers (id, name, email, customer_tier, company) VALUES
(1, 'Johnathan Miller', 'john.miller@acme.com', 'PLATINUM', 'Acme Technologies'),
(2, 'Sarah Jenkins', 'sjenkins@globalsystems.org', 'GOLD', 'Global Systems'),
(3, 'David Zhang', 'david.z@techsolutions.io', 'SILVER', 'Tech Solutions'),
(4, 'Elena Rostova', 'elena@enterprisedynamics.com', 'PLATINUM', 'Enterprise Dynamics'),
(5, 'Marcus Vance', 'marcus.v@bluewave.net', 'STANDARD', 'BlueWave Retail'),
(6, 'Chloe Bennett', 'cbennett@novaindustries.com', 'GOLD', 'Nova Industries'),
(7, 'Robert Sterling', 'robert.s@apexlogistics.com', 'SILVER', 'Apex Logistics'),
(8, 'Amira Patel', 'amira@pinnaclesoftware.com', 'PLATINUM', 'Pinnacle Software'),
(9, 'Lucas Morales', 'lucas@vanguardcorp.com', 'STANDARD', 'Vanguard Corp'),
(10, 'Fiona Gallagher', 'fiona.g@summitventures.co', 'GOLD', 'Summit Ventures');

-- Products
INSERT INTO products (id, name, category, description, price) VALUES
(1, 'Extended Warranty', 'Warranty & Support', 'Comprehensive 3-year extended warranty package covering hardware defects, on-site diagnostics, and accidental damage protection.', 850.00),
(2, 'Premium Warranty', 'Warranty & Support', '24/7 priority enterprise support with next-business-day hardware replacement and dedicated account engineer.', 1450.00),
(3, 'High-Performance Laptop', 'Hardware', 'Enterprise workstation laptop featuring 32GB RAM, 1TB NVMe SSD, and high-end discrete GPU for power users.', 2200.00),
(4, 'Wireless Noise-Canceling Headphones', 'Accessories', 'Premium over-ear wireless Bluetooth headphones with active noise cancellation and 30-hour battery life.', 320.00),
(5, 'Enterprise Support Package', 'Services', 'Dedicated tier-3 customer support team providing round-the-clock incident response, SLA guarantees, and quarterly system audits.', 3500.00),
(6, 'Express Delivery Service', 'Logistics', 'Guaranteed express next-day delivery service with real-time GPS fleet tracking and temperature-controlled handling.', 180.00),
(7, 'Warehouse Management Software', 'Software', 'Automated inventory tracking, barcode scanning, stock replenishment, and multi-warehouse order fulfillment system.', 4800.00),
(8, 'Secure Cloud Storage License', 'Cloud Services', 'Encrypted cloud backup and multi-region file storage solution with automatic snapshotting and disaster recovery.', 650.00),
(9, 'Enterprise Software License', 'Software', 'Annual enterprise multi-user license for sales operations, quote lifecycle governance, and approval automation.', 5200.00),
(10, 'Customer Support Chatbot Plugin', 'AI & Integrations', 'Natural language customer support bot integrated with CRM and ticketing system for automated inquiry resolution.', 950.00),
(11, 'Discount Negotiation Advisory Tool', 'Sales Operations', 'Algorithmic sales intelligence module recommending discount thresholds and margin risk assessments.', 1200.00),
(12, 'Standard Delivery & Logistics Plan', 'Logistics', 'Scheduled freight distribution and warehouse dispatch handling for bulk product shipments across regions.', 420.00);

-- Quotations
INSERT INTO quotations (id, quotation_number, customer_id, product_id, status, total_amount) VALUES
(1, 'QT-1001', 1, 1, 'Under Negotiation', 8500.00),
(2, 'QT-1002', 1, 3, 'Approved', 22000.00),
(3, 'QT-1003', 2, 2, 'Pending Review', 14500.00),
(4, 'QT-1004', 2, 5, 'Approved', 35000.00),
(5, 'QT-1005', 3, 4, 'Under Negotiation', 6400.00),
(6, 'QT-1006', 3, 1, 'Draft', 4250.00),
(7, 'QT-1007', 4, 7, 'Approved', 48000.00),
(8, 'QT-1008', 4, 9, 'Under Negotiation', 52000.00),
(9, 'QT-1009', 5, 6, 'Approved', 3600.00),
(10, 'QT-1010', 5, 12, 'Pending Review', 8400.00),
(11, 'QT-1011', 6, 8, 'Approved', 6500.00),
(12, 'QT-1012', 6, 11, 'Under Negotiation', 12000.00),
(13, 'QT-1013', 7, 6, 'Approved', 1800.00),
(14, 'QT-1014', 8, 5, 'Approved', 70000.00),
(15, 'QT-1015', 9, 3, 'Draft', 11000.00),
(16, 'QT-1016', 10, 10, 'Under Negotiation', 9500.00);

-- Messages & Audit Notes
INSERT INTO messages (id, quotation_id, message) VALUES
(1, 1, 'Customer requested a 15% discount on the Extended Warranty package for 10 units at Acme Technologies.'),
(2, 1, 'Extended Warranty terms clarified. Delivery and replacement SLAs meet customer requirements.'),
(3, 2, 'High-Performance Laptop order approved by finance director. Ready for warehouse dispatch.'),
(4, 3, 'Global Systems requested review of the Premium Warranty service agreement clause.'),
(5, 4, 'Enterprise Support Package contract signed. 24/7 technical hotline activated.'),
(6, 5, 'Discount negotiation ongoing regarding bulk order of Wireless Noise-Canceling Headphones.'),
(7, 7, 'Warehouse Management Software deployed successfully for Enterprise Dynamics staging environment.'),
(8, 8, 'Negotiation on Enterprise Software License pricing pending approval from VP of Sales.'),
(9, 9, 'Express Delivery Service scheduled for BlueWave Retail next Tuesday morning.'),
(10, 10, 'Delivery schedule updated. Standard freight dispatch requested for regional distribution hub.'),
(11, 11, 'Cloud Storage License renewed for 12 months with automated backup routines.'),
(12, 12, 'Nova Industries evaluating the Discount Negotiation Advisory Tool for their operations team.'),
(13, 14, 'Customer Support escalation: Tier-3 engineering hotline tested and operational.');
