# DealFlow360 — Modular Tokenized Full-Text Search Engine Demo

A standalone, custom-built full-text search engine built with **Node.js**, **Express**, **MySQL**, and vanilla **HTML/CSS/JS**.

This project demonstrates how search engines work from first principles without relying on heavy third-party search platforms (like Elasticsearch, OpenSearch, or MongoDB).

---

## 1. System Architecture

```
+-----------------------------------------------------------------------------+
|                                MySQL Database                               |
|            (customers, products, quotations, messages tables)               |
+-----------------------------------------------------------------------------+
                                       |
                                       | 1. Query raw records on startup / reindex
                                       v
+-----------------------------------------------------------------------------+
|                               Document Mapper                               |
|        (Converts SQL rows into generic Search Documents with fields)        |
+-----------------------------------------------------------------------------+
                                       |
                                       | 2. Tokenize & normalize each field
                                       v
+-----------------------------------------------------------------------------+
|                            Inverted Index & Vocabulary                      |
|  - Term -> Posting List: Map<docId, { termFreq, fieldWeights }>             |
|  - Vocabulary: Set of unique terms                                          |
+-----------------------------------------------------------------------------+
                                       ^
                                       | 4. Candidate lookup
                                       |
+-----------------------------------------------------------------------------+
|                               Search Pipeline                               |
|                                                                             |
|  User Query: "extnded warrnty"                                              |
|       |                                                                     |
|       v                                                                     |
|  1. Tokenizer: ["extnded", "warrnty"]                                       |
|       |                                                                     |
|       v                                                                     |
|  2. Normalizer & Stop-Word Filter                                           |
|       |                                                                     |
|       v                                                                     |
|  3. Vocabulary Check & Fuzzy Matcher (Levenshtein Distance)                 |
|     - "extnded" -> "extended" (similarity: 0.875)                           |
|     - "warrnty" -> "warranty" (similarity: 0.875)                           |
|     - Suggestion: "Did you mean: extended warranty?"                        |
|       |                                                                     |
|       v                                                                     |
|  4. Candidate Document Retrieval from Inverted Index                        |
|       |                                                                     |
|       v                                                                     |
|  5. Relevance Ranker & Field Boosts                                         |
|     (Quotation: 10x, Customer: 8x, Product: 7x, Status: 5x, Message: 3x)   |
|     (+ Coverage bonus + Exact phrase match bonus)                           |
|       |                                                                     |
|       v                                                                     |
|  6. JSON API Response (tookMs: ~1 ms)                                       |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                       Vanilla JS / HTML Testing UI                          |
|  - Search input, dynamic suggestions, badges, execution time & scores       |
+-----------------------------------------------------------------------------+
```

---

## 2. Directory Structure

```
search-engine-demo/
│
├── backend/
│   ├── config/
│   │   └── database.js               # MySQL connection pool configuration
│   │
│   ├── modules/
│   │   └── search/
│   │       ├── tokenizer.js          # Tokenization & compound identifier extraction
│   │       ├── normalizer.js         # Unicode NFKC, lowercasing, stop-words filter
│   │       ├── fuzzyMatcher.js       # Levenshtein distance & spelling correction
│   │       ├── invertedIndex.js      # In-memory inverted index & vocabulary map
│   │       ├── ranker.js             # Relevance scoring, field boosts, highlighting
│   │       ├── documentMapper.js     # Converts MySQL rows into generic search docs
│   │       ├── indexBuilder.js       # Loads MySQL data into the inverted index
│   │       ├── searchEngine.js       # End-to-end search query pipeline
│   │       └── searchService.js      # Singleton service coordinating search & reindex
│   │
│   ├── routes/
│   │   └── searchRoutes.js           # Express endpoints (/api/search, /api/search/reindex)
│   │
│   ├── server.js                     # Express app setup, static hosting & lifecycle
│   └── package.json                  # Backend dependencies
│
├── database/
│   └── init.sql                      # Database schema and 50+ DealFlow360 dummy records
│
├── frontend/
│   ├── index.html                    # Testing search interface
│   ├── style.css                     # Minimalist testing styles
│   └── app.js                        # Vanilla JavaScript fetch & DOM renderer
│
├── .env                              # Environment configuration (DB credentials, port)
├── .env.example                      # Template for environment settings
├── .gitignore                        # Git exclusion rules
├── package.json                      # Root package definition
├── setup.bat                         # Automated Windows setup script
├── test_search.js                    # Automated search test suite (10 test cases)
└── README.md                         # Complete project documentation
```

---

## 3. Core Search Concepts & Algorithms

### 3.1. Tokenization (`tokenizer.js`)
Tokenization breaks arbitrary text into meaningful atomic units (tokens):
- Lowercases input text.
- Splits on punctuation, whitespace, and special characters.
- **Identifier Preservation**: Specifically preserves hyphenated alphanumeric identifiers (e.g. `QT-1001`, `PROD-102`) as single search tokens while splitting regular compound hyphenated words (e.g. `noise-canceling` $\rightarrow$ `noise-canceling`, `noise`, `canceling`).

### 3.2. Normalization & Stop-Words (`normalizer.js`)
- Standardizes Unicode characters using `NFKC` normalization.
- Trims whitespace and removes grammatical stop-words (e.g. `the`, `a`, `is`, `of`, `to`, `for`, `and`, `in`, `on`, `with`).
- Stops words from polluting index postings, while ensuring code-like identifiers are never discarded.

### 3.3. Fuzzy Matching & Levenshtein Distance (`fuzzyMatcher.js`)
When a user mistypes a word (e.g. `extnded` instead of `extended`), the search engine:
1. Calculates the minimum number of single-character edits (insertions, deletions, substitutions) required to transform string $A$ into string $B$.
2. Computes a normalized similarity score:
   $$\text{Similarity}(A, B) = 1.0 - \frac{\text{LevenshteinDistance}(A, B)}{\max(\text{length}(A), \text{length}(B))}$$
3. Checks against the indexed vocabulary with distance thresholds:
   - For words $\ge 6$ chars: max distance $\le 2$ (e.g. `extnded` $\rightarrow$ `extended`, `warrnty` $\rightarrow$ `warranty`, `negotiaton` $\rightarrow$ `negotiation`)
   - For words $4-5$ chars: max distance $\le 1$ (e.g. `custmer` $\rightarrow$ `customer`, `delivry` $\rightarrow$ `delivery`)
   - Words $< 4$ chars: exact match only
   - Identifiers (e.g. `QT-1001`) are skipped from fuzzy mutation.
4. Generates the `correctedQuery` suggestion string (`"Did you mean: extended warranty?"`).

### 3.4. Inverted Index (`invertedIndex.js`)
Rather than scanning every MySQL row on every search, the Inverted Index maps each vocabulary term directly to document IDs and field occurrences:
```
"extended"  -> [ PROD-1 (product_name: 1, desc: 1), QT-1001 (product: 1), MSG-1 (message: 1) ]
"warranty"  -> [ PROD-1 (product_name: 1, desc: 1), PROD-2 (product_name: 1), QT-1001 (product: 1) ]
"acme"      -> [ CUST-1 (company: 1), QT-1001 (customer: 1), MSG-1 (customer: 1) ]
"qt-1001"   -> [ QT-1001 (quotation_number: 1), MSG-1 (quotation_number: 1) ]
```
This enables $O(1)$ candidate document retrieval.

### 3.5. Relevance Ranking & Scoring (`ranker.js`)
Candidate documents are evaluated using a multi-factor ranking formula:
1. **Base Token Weight**:
   - Exact term match: $+10.0$
   - Fuzzy term match: $+(\text{similarity} \times 5.0)$
2. **Field Importance Boosts**:
   - Quotation Number / ID: **10x**
   - Customer / Company Name: **8x**
   - Product Name / Title: **7x**
   - Status / Category: **5x**
   - Message / Description: **3x**
3. **Term Frequency Scaling**: $1.0 + \log_{10}(\text{count})$
4. **Query Coverage Bonus**: Documents matching a higher percentage of search tokens receive up to $+15.0$ bonus, plus an additional $+25.0$ if all tokens match.
5. **Exact Phrase Match Bonus**: $+20.0$ if the multi-word query appears as a contiguous substring in the document text.

---

## 4. Setup & Running Instructions

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server (running on localhost:3306)

### 2. Configure Environment
Check `.env`:
```ini
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=0000
DB_NAME=search_engine_demo
```

### 3. Initialize MySQL Database & Dummy Data
Run the initialization SQL script:
```powershell
# Using PowerShell:
Get-Content database/init.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p0000

# Or standard MySQL CLI:
mysql -u root -p0000 < database/init.sql
```

### 4. Install Dependencies
```powershell
npm install
```

### 5. Start Backend Server
```powershell
npm start
```
Output:
```
====================================================
  DealFlow360 — Standalone Search Engine Demo
====================================================
[Database] Connected to MySQL (search_engine_demo) on localhost:3306
[IndexBuilder] Starting index build from MySQL...
[IndexBuilder] Connected to MySQL
[IndexBuilder] Loaded 51 documents
[IndexBuilder] Indexed 324 unique terms
[IndexBuilder] Search engine ready (52 ms)
[Server] Search Engine Demo running at http://localhost:3000
[Server] Indexed 51 documents (324 unique terms)
====================================================
```

### 6. Open Frontend Testing UI
Open your browser at:
```
http://localhost:3000
```

---

## 5. API Reference

### 5.1. Search Endpoint
- **Method**: `GET`
- **Path**: `/api/search?q=<query>&limit=<limit>`
- **Example**: `GET /api/search?q=extnded%20warrnty`

**Sample Response**:
```json
{
  "query": "extnded warrnty",
  "correctedQuery": "extended warranty",
  "results": [
    {
      "id": "PROD-1",
      "type": "product",
      "title": "Extended Warranty",
      "customer": null,
      "status": "Available",
      "category": "Warranty & Support",
      "score": 159.34,
      "highlight": "<mark>Extended</mark> <mark>Warranty</mark>"
    },
    {
      "id": "QT-1001",
      "type": "quotation",
      "title": "Extended Warranty",
      "customer": "Acme Technologies",
      "status": "Under Negotiation",
      "category": "Warranty & Support",
      "score": 115.82,
      "highlight": "<mark>Extended</mark> <mark>Warranty</mark> · Acme Technologies"
    }
  ],
  "meta": {
    "total": 8,
    "tookMs": 1
  }
}
```

---

### 5.2. Reindex Endpoint
- **Method**: `POST`
- **Path**: `/api/search/reindex`
- **Description**: Re-queries MySQL and rebuilds the in-memory inverted index and vocabulary.

**Response**:
```json
{
  "message": "Index rebuilt successfully",
  "documents": 51,
  "terms": 324
}
```

---

### 5.3. Stats Endpoint
- **Method**: `GET`
- **Path**: `/api/search/stats`

**Response**:
```json
{
  "status": "ready",
  "totalDocuments": 51,
  "totalUniqueTerms": 324
}
```

---

## 6. Automated Testing

Run the automated test suite verifying all 10 mandatory test cases:
```powershell
npm test
```
Test results:
- `extended warranty` $\rightarrow$ Exact match ($1\text{ ms}$)
- `extnded warrnty` $\rightarrow$ Typo correction $\rightarrow$ `extended warranty`
- `custmer` $\rightarrow$ Typo correction $\rightarrow$ `customer`
- `delivry` $\rightarrow$ Typo correction $\rightarrow$ `delivery`
- `warrnty` $\rightarrow$ Typo correction $\rightarrow$ `warranty`
- `QT-1001` $\rightarrow$ Exact quotation identifier match
- `laptop` $\rightarrow$ Product & message matching
- `randomxyz123` $\rightarrow$ Clean zero-results handling
- `"extended warranty"` $\rightarrow$ Exact phrase boost
- `reindex` $\rightarrow$ Dynamic index rebuilding

---

## 7. Version 2 Roadmap & Planned Enhancements
1. **BM25 Scoring Algorithm**: Replace current TF-based heuristic with BM25 Okapi probabilistic scoring (incorporating inverse document frequency and document length normalization).
2. **N-Gram Tokenization & Prefix Autocomplete**: Support prefix matching for live "search-as-you-type" dropdown suggestions.
3. **Database Change CDC (Change Data Capture)**: Incremental index updating via MySQL triggers or binlog listeners rather than full reindexing.
4. **Synonym Expansion**: Domain dictionary for sales operations (e.g. mapping `quote` $\leftrightarrow$ `quotation`, `discount` $\leftrightarrow$ `rebate` $\leftrightarrow$ `price-cut`).
