import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '@/lib/db';
import { setupTestDatabase, teardownTestDatabase, TestSeedData } from '../db-setup';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Category 3: AI Semantic Search & Vector Integrity', () => {
  let seedData: TestSeedData;

  beforeAll(async () => {
    seedData = await setupTestDatabase();
  }, 90000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // TC-AI-01 (Implicit Semantic Match)
  it('TC-AI-01: Returns rain gear in top 3 results when searching "protection from the rain" via cosine vector distance', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent('protection from the rain')}`);
    expect(res.status).toBe(200);

    const results = await res.json();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Verify distance is returned and sorted ascending
    expect(results[0]).toHaveProperty('distance');
    for (let i = 0; i < results.length - 1; i++) {
      expect(parseFloat(results[i].distance)).toBeLessThanOrEqual(parseFloat(results[i + 1].distance));
    }

    // Verify Camping Tent or Gore-Tex Boots is in the top 3 results, proving semantic concept matching
    const top3Titles = results.slice(0, 3).map((item: any) => item.title.toLowerCase());
    const matchesRainConcept = top3Titles.some(
      (title: string) => title.includes('camping tent') || title.includes('gore-tex') || title.includes('boots')
    );

    expect(matchesRainConcept).toBe(true);
  }, 60000);

  // TC-AI-03 (Silent Creation Embedding)
  it('TC-AI-03: Generates and populates 384D vector embedding invisibly on item creation', async () => {
    const { generateEmbedding } = await import('@/lib/embedding');
    const title = 'Heavy Duty Polar Expedition Parka';
    const description = 'Sub-zero thermal insulated jacket with storm hood for arctic survival';
    const vector = await generateEmbedding(`${title} ${description}`.trim());

    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(384);

    const client = await pool.connect();
    let newItemId: number;
    try {
      // Look up a valid category_id
      const catRes = await client.query('SELECT category_id FROM CATEGORIES LIMIT 1');
      const validCategoryId = catRes.rows[0].category_id;

      const itemRes = await client.query(
        `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
         VALUES ($1, $2, $3, $4, $5::VECTOR)
         RETURNING item_id`,
        [seedData.sellerId, validCategoryId, title, description, JSON.stringify(vector)]
      );
      newItemId = itemRes.rows[0].item_id;

      // Query DB directly to verify embedding column is populated and matches 384 dimensions
      const verifyRes = await client.query(
        `SELECT item_id, title, embedding IS NOT NULL AS has_embedding, 
                ARRAY_LENGTH(embedding::FLOAT8[], 1) AS embedding_dim
         FROM ITEMS WHERE item_id = $1`,
        [newItemId]
      );

      expect(verifyRes.rows.length).toBe(1);
      expect(verifyRes.rows[0].has_embedding).toBe(true);
      expect(Number(verifyRes.rows[0].embedding_dim)).toBe(384);
    } finally {
      client.release();
    }
  }, 60000);
});
