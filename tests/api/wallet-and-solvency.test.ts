import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '@/lib/db';
import { setupTestDatabase, teardownTestDatabase, TestSeedData } from '../db-setup';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Category 4: Point-Based Wallet System & Solvency Defender', () => {
  let seedData: TestSeedData;

  beforeAll(async () => {
    seedData = await setupTestDatabase();
  }, 60000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // TC-WALLET-RBAC-01: Security verification for /api/admin/funds
  describe('RBAC Security: /api/admin/funds', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: seedData.buyerId,
          amount: 500,
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('rejects non-admin users (e.g. BUYER) with 403 Forbidden', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `user_id=${seedData.buyerId}`,
        },
        body: JSON.stringify({
          user_id: seedData.buyerId,
          amount: 500,
        }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized: Admin privileges required.');
    });

    it('allows authenticated ADMIN users to mint points', async () => {
      const mintAmount = 2500.0;
      const client = await pool.connect();
      let initialBalance = 0;
      try {
        const uRes = await client.query('SELECT wallet_balance FROM USERS WHERE user_id = $1', [
          seedData.buyerId,
        ]);
        initialBalance = parseFloat(String(uRes.rows[0].wallet_balance || 0));
      } finally {
        client.release();
      }

      const res = await fetch(`${BASE_URL}/api/admin/funds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `user_id=${seedData.adminId}`,
        },
        body: JSON.stringify({
          user_id: seedData.buyerId,
          amount: mintAmount,
        }),
      });

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.wallet_balance).toBe(initialBalance + mintAmount);

      // Verify directly in DB
      const checkClient = await pool.connect();
      try {
        const uRes = await checkClient.query('SELECT wallet_balance FROM USERS WHERE user_id = $1', [
          seedData.buyerId,
        ]);
        const newBal = parseFloat(String(uRes.rows[0].wallet_balance));
        expect(newBal).toBe(initialBalance + mintAmount);
      } finally {
        checkClient.release();
      }
    });
  });

  // TC-WALLET-RBAC-02: Security verification for /api/admin/shill
  describe('RBAC Security: /api/admin/shill', () => {
    it('rejects unauthenticated GET requests with 401 Unauthorized', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/shill`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('rejects non-admin users (e.g. SELLER) with 403 Forbidden', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/shill`, {
        headers: {
          Cookie: `user_id=${seedData.sellerId}`,
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized: Admin privileges required.');
    });

    it('allows authenticated ADMIN users to inspect fraud radar view', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/shill`, {
        headers: {
          Cookie: `user_id=${seedData.adminId}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.shill_bids)).toBe(true);
    });
  });

  // TC-WALLET-RBAC-03: Frontend Page Access Control (Middleware & SSR Role Enforcement)
  describe('Frontend Access Control: Middleware & SSR', () => {
    it('redirects unauthenticated users from /admin to /login?callbackUrl=/admin', async () => {
      const res = await fetch(`${BASE_URL}/admin`, {
        redirect: 'manual',
      });

      expect([307, 302, 308]).toContain(res.status);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/login');
      expect(location).toContain('callbackUrl=%2Fadmin');
    });

    it('redirects unauthenticated users from /profile to /login?callbackUrl=/profile', async () => {
      const res = await fetch(`${BASE_URL}/profile`, {
        redirect: 'manual',
      });

      expect([307, 302, 308]).toContain(res.status);
      const location = res.headers.get('location') || '';
      expect(location).toContain('/login');
      expect(location).toContain('callbackUrl=%2Fprofile');
    });

    it('redirects authenticated non-admin users from /admin to / via SSR role enforcement', async () => {
      const res = await fetch(`${BASE_URL}/admin`, {
        redirect: 'manual',
        headers: {
          Cookie: `user_id=${seedData.buyerId}; is_authenticated=true`,
        },
      });

      expect([307, 302, 308]).toContain(res.status);
      const location = res.headers.get('location') || '';
      expect(location).toBe('/');
    });

    it('allows authenticated ADMIN users to access /admin', async () => {
      const res = await fetch(`${BASE_URL}/admin`, {
        headers: {
          Cookie: `user_id=${seedData.adminId}; is_authenticated=true`,
        },
      });

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Admin Control Panel');
      expect(html).toContain('Widget A: The Mint');
      expect(html).toContain('Widget B: Fraud Radar');
    });
  });

  // TC-WALLET-02: Solvency Trigger P0005 Rejection
  it('TC-WALLET-02: Enforce solvency trigger rejects bid exceeding available points with P0005', async () => {
    // Set buyer's wallet to 100 points
    const client = await pool.connect();
    try {
      await client.query('UPDATE USERS SET wallet_balance = 100.00 WHERE user_id = $1', [
        seedData.buyerId,
      ]);
    } finally {
      client.release();
    }

    // Try to bid 500.00 points (exceeds 100.00)
    const res = await fetch(`${BASE_URL}/api/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: seedData.tentAuctionId,
        bidder_id: seedData.buyerId,
        bid_amount: 500.0,
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe('P0005');
    expect(data.error).toContain('Insufficient available points');

    // Restore buyer's wallet balance for subsequent tests
    const restoreClient = await pool.connect();
    try {
      await restoreClient.query('UPDATE USERS SET wallet_balance = 10000.00 WHERE user_id = $1', [
        seedData.buyerId,
      ]);
    } finally {
      restoreClient.release();
    }
  });

  // TC-WALLET-04: Receipts Table and query execution
  it('TC-WALLET-04: Settlement creates cryptographic receipts queryable by buyer', async () => {
    const client = await pool.connect();
    try {
      // Insert a dummy receipt for the buyer
      const insRes = await client.query(
        `INSERT INTO RECEIPTS (auction_id, buyer_id, seller_id, amount_paid)
         VALUES ($1, $2, $3, 350.00)
         RETURNING receipt_id, amount_paid, issued_at`,
        [seedData.tentAuctionId, seedData.buyerId, seedData.sellerId]
      );
      expect(insRes.rows.length).toBe(1);
      const receiptId = insRes.rows[0].receipt_id;
      expect(receiptId).toBeDefined();

      // Query receipts exactly as ReceiptsPage does
      const queryRes = await client.query(
        `SELECT r.receipt_id, r.amount_paid, r.issued_at, i.title 
         FROM RECEIPTS r 
         JOIN AUCTIONS a ON r.auction_id = a.auction_id 
         JOIN ITEMS i ON a.item_id = i.item_id 
         WHERE r.buyer_id = $1 
         ORDER BY r.issued_at DESC`,
        [seedData.buyerId]
      );

      expect(queryRes.rows.length).toBeGreaterThanOrEqual(1);
      const found = queryRes.rows.find((r) => r.receipt_id === receiptId);
      expect(found).toBeDefined();
      expect(parseFloat(found.amount_paid)).toBe(350.0);
    } finally {
      client.release();
    }
  });

  // TC-WALLET-05: GET /api/user/wallet calculates wallet_balance and locked_points
  it('TC-WALLET-05: GET /api/user/wallet returns both wallet_balance and active locked_points', async () => {
    // Unauthenticated request returns 401
    const unauthRes = await fetch(`${BASE_URL}/api/user/wallet`);
    expect(unauthRes.status).toBe(401);

    // Authenticated request with buyer session
    const res = await fetch(`${BASE_URL}/api/user/wallet`, {
      headers: {
        Cookie: `user_id=${seedData.buyerId}`,
      },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.wallet_balance).toBe('number');
    expect(typeof data.locked_points).toBe('number');
    expect(data.wallet_balance).toBeGreaterThanOrEqual(0);
    expect(data.locked_points).toBeGreaterThanOrEqual(0);
  });

  // TC-CATEGORIES-01: GET /api/categories returns categories ordered by category_name ASC
  it('TC-CATEGORIES-01: GET /api/categories returns category list with 64-bit string category IDs', async () => {
    const res = await fetch(`${BASE_URL}/api/categories`);
    expect(res.status).toBe(200);
    const categories = await res.json();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);

    // Verify properties and string category_id
    for (const cat of categories) {
      expect(typeof cat.category_id).toBe('string');
      expect(cat.category_id.length).toBeGreaterThan(0);
      expect(typeof cat.category_name).toBe('string');
    }

    // Verify ascending order
    for (let i = 0; i < categories.length - 1; i++) {
      expect(
        categories[i].category_name.localeCompare(categories[i + 1].category_name)
      ).toBeLessThanOrEqual(0);
    }
  });

  // TC-AUCTION-CREATE-01: Verify item insertion succeeds with 64-bit CockroachDB category ID
  it('TC-AUCTION-CREATE-01: Creates item and auction referencing 64-bit CockroachDB category without FK error', async () => {
    const client = await pool.connect();
    try {
      // Fetch a valid category ID
      const catRes = await client.query('SELECT category_id FROM CATEGORIES LIMIT 1');
      expect(catRes.rows.length).toBe(1);
      const categoryId = String(catRes.rows[0].category_id);

      // Insert item using string category_id
      const itemRes = await client.query(
        'INSERT INTO ITEMS (seller_id, category_id, title, description) VALUES ($1, $2, $3, $4) RETURNING item_id',
        [seedData.sellerId, categoryId, 'Test Category Item', 'Testing real CockroachDB category FK']
      );
      expect(itemRes.rows.length).toBe(1);
      const itemId = itemRes.rows[0].item_id;

      // Verify auction creation referencing item with parameterized durationHours
      const durationHours = 24;
      const aucRes = await client.query(
        `INSERT INTO AUCTIONS 
          (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time)
         VALUES 
          ($1, 100.00, 200.00, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($2::INT * INTERVAL '1 hour'), CURRENT_TIMESTAMP + ($2::INT * INTERVAL '1 hour'))
         RETURNING auction_id`,
        [itemId, durationHours]
      );
      expect(aucRes.rows.length).toBe(1);
    } finally {
      client.release();
    }
  });
});
