/**
 * DealFlow360 Search Engine Demo
 * Document Mapper Module
 *
 * Converts MySQL database rows into generic Search Documents.
 * The search engine works purely on generic documents and remains agnostic
 * to SQL table structures and schemas.
 */

class DocumentMapper {
    /**
     * Maps customer rows to search documents.
     */
    static fromCustomer(row) {
        return {
            id: `CUST-${row.id}`,
            dbId: row.id,
            type: 'customer',
            title: row.name,
            customer: row.company,
            status: row.customer_tier,
            category: 'Customer Account',
            fields: {
                name: row.name || '',
                company: row.company || '',
                email: row.email || '',
                customer_tier: row.customer_tier || ''
            },
            searchText: `${row.name} ${row.company} ${row.email} ${row.customer_tier} customer account`
        };
    }

    /**
     * Maps product rows to search documents.
     */
    static fromProduct(row) {
        return {
            id: `PROD-${row.id}`,
            dbId: row.id,
            type: 'product',
            title: row.name,
            customer: null,
            status: 'Available',
            category: row.category || 'Product',
            fields: {
                product_name: row.name || '',
                category: row.category || '',
                description: row.description || '',
                price: row.price ? `$${row.price}` : ''
            },
            searchText: `${row.name} ${row.category} ${row.description} product catalog`
        };
    }

    /**
     * Maps quotation joined rows to search documents.
     */
    static fromQuotation(row) {
        return {
            id: row.quotation_number || `QT-${row.id}`,
            dbId: row.id,
            type: 'quotation',
            title: row.product_name || 'Quotation',
            customer: row.company || row.customer_name || 'Customer',
            status: row.status || 'Draft',
            category: row.product_category || 'Quotation',
            fields: {
                quotation_number: row.quotation_number || '',
                customer: row.company || row.customer_name || '',
                product: row.product_name || '',
                status: row.status || '',
                total_amount: row.total_amount ? `$${row.total_amount}` : ''
            },
            searchText: `${row.quotation_number} ${row.product_name} ${row.company} ${row.customer_name} ${row.status} quotation quote deal`
        };
    }

    /**
     * Maps message joined rows to search documents.
     */
    static fromMessage(row) {
        return {
            id: `MSG-${row.id}`,
            dbId: row.id,
            type: 'message',
            title: row.quotation_number ? `Message for ${row.quotation_number}` : 'Quotation Message',
            customer: row.company || 'Customer',
            status: row.quotation_status || 'Active',
            category: 'Communication',
            fields: {
                quotation_number: row.quotation_number || '',
                customer: row.company || '',
                product: row.product_name || '',
                message: row.message || ''
            },
            searchText: `${row.quotation_number} ${row.message} ${row.company} ${row.product_name} message note conversation`
        };
    }
}

module.exports = DocumentMapper;
