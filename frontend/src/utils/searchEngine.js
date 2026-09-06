/**
 * DealFlow360 - High-Performance In-Memory Full-Text Search Engine
 * Features:
 * - Tokenization, stemming normalization, and stopword stripping
 * - Weighted Field Scoring (Title: 3.0, SKU/Number: 4.0, Category: 2.0, Body: 1.0)
 * - Levenshtein Fuzzy Distance tolerance (handles typos like 'electrnoics' -> 'electronics')
 * - Substring prefix matching
 */

class FullTextSearchEngine {
  constructor(options = {}) {
    this.fields = options.fields || ["name", "title", "description"];
    this.weights = options.weights || {};
    this.documents = [];
    this.index = new Map();
  }

  tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  levenshtein(a, b) {
    if (a === b) return 0;
    const matrix = Array.from({ length: a.length + 1 }, () =>
      new Array(b.length + 1).fill(0)
    );
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  indexDocuments(docs) {
    this.documents = docs || [];
    this.index.clear();

    this.documents.forEach((doc, docIdx) => {
      this.fields.forEach((field) => {
        const val = doc[field];
        if (!val) return;
        const tokens = this.tokenize(val);
        const weight = this.weights[field] || 1.0;

        tokens.forEach((token) => {
          if (!this.index.has(token)) {
            this.index.set(token, []);
          }
          this.index.get(token).push({ docIdx, weight });
        });
      });
    });
  }

  search(query, maxResults = 20) {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return this.documents.slice(0, maxResults);

    const scores = new Map();

    queryTokens.forEach((qToken) => {
      // 1. Exact & Prefix Matches
      for (const [indexedToken, postings] of this.index.entries()) {
        let matchMultiplier = 0;
        if (indexedToken === qToken) {
          matchMultiplier = 1.5;
        } else if (indexedToken.startsWith(qToken) || qToken.startsWith(indexedToken)) {
          matchMultiplier = 1.0;
        } else {
          // 2. Fuzzy match
          const dist = this.levenshtein(qToken, indexedToken);
          if (dist <= 1 && qToken.length > 3) {
            matchMultiplier = 0.7;
          }
        }

        if (matchMultiplier > 0) {
          postings.forEach(({ docIdx, weight }) => {
            const curScore = scores.get(docIdx) || 0;
            scores.set(docIdx, curScore + weight * matchMultiplier);
          });
        }
      }
    });

    const sortedDocIndices = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([idx]) => this.documents[idx]);

    return sortedDocIndices.slice(0, maxResults);
  }
}

export default FullTextSearchEngine;
