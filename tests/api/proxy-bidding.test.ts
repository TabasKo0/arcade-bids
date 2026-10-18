import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '@/lib/db';
import { setupTestDatabase, teardownTestDatabase, TestSeedData } from '../db-setup';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Category 5: Autonomous Proxy Bidding Engine', () => {
  let seedData: TestSeedData;

  beforeAll(async () => {
    seedData = await setupTestDatabase();
  }, 60000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // TC-PROXY-01: Authentication & RBAC
  it('TC-PROXY-01: Rejects unauthenticated request to /api/proxy with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: seedData.tentAuctionId,
        max_bid_amount: 150.0,
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  // TC-PROXY-02: Validation - max_bid_amount must exceed current highest bid
  it('TC-PROXY-02: Rejects max_bid_amount less than or equal to current highest bid with 400', async () => {
    // seedData.incrementAuctionId has current_highest_bid = 150.00
    const res = await fetch(`${BASE_URL}/api/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `user_id=${seedData.buyerId}`,
      },
      body: JSON.stringify({
        auction_id: seedData.incrementAuctionId,
        max_bid_amount: 150.0, // not strictly greater than 150.00
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/must be greater than/i);
  });

  // TC-PROXY-03: Solvency Check - Available points < max_bid_amount
  it('TC-PROXY-03: Rejects proxy when available points cannot support max_bid_amount with 400', async () => {
    // Temporarily reduce buyer's wallet to 50 points
    const client = await pool.connect();
    try {
      await client.query('UPDATE USERS SET wallet_balance = 50.00 WHERE user_id = $1', [
        seedData.buyerId,
      ]);
    } finally {
      client.release();
    }

    const res = await fetch(`${BASE_URL}/api/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `user_id=${seedData.buyerId}`,
      },
      body: JSON.stringify({
        auction_id: seedData.tentAuctionId,
        max_bid_amount: 500.0, // Exceeds wallet balance 50.00
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Insufficient points to support this proxy limit.');
  });

  // TC-PROXY-04: Successful proxy limit configuration (upsert)
  it('TC-PROXY-04: Successfully configures and updates proxy limit in PROXY_BIDS', async () => {
    // Restore buyer's wallet balance
    const client = await pool.connect();
    try {
      await client.query('UPDATE USERS SET wallet_balance = 10000.00 WHERE user_id = $1', [
        seedData.buyerId,
      ]);
    } finally {
      client.release();
    }

    const res = await fetch(`${BASE_URL}/api/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `user_id=${seedData.buyerId}`,
      },
      body: JSON.stringify({
        auction_id: seedData.tentAuctionId,
        max_bid_amount: 300.0,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.proxy.max_bid_amount).toBe(300.0);

    // Verify GET endpoint returns active proxy limit
    const getRes = await fetch(`${BASE_URL}/api/proxy?auction_id=${seedData.tentAuctionId}`, {
      headers: {
        Cookie: `user_id=${seedData.buyerId}`,
      },
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.active_proxy_limit).toBe(300.0);
  });

  // TC-PROXY-05: Autonomous counter-bidding via database AFTER INSERT trigger
  it('TC-PROXY-05: Automatically places counter-bid when competing bid arrives', async () => {
    // Ensure buyer2 has active proxy limit of $250.00 on watchAuctionId (starting $200)
    const client = await pool.connect();
    try {
      await client.query('UPDATE USERS SET wallet_balance = 10000.00 WHERE user_id = $1', [
        seedData.buyer2Id,
      ]);
      await client.query(
        `INSERT INTO PROXY_BIDS (auction_id, bidder_id, max_bid_amount, max_limit, is_active)
         VALUES ($1, $2, 250.00, 250.00, TRUE)
         ON CONFLICT (auction_id, bidder_id) 
         DO UPDATE SET max_bid_amount = 250.00, max_limit = 250.00, is_active = TRUE`,
        [seedData.watchAuctionId, seedData.buyer2Id]
      );
    } finally {
      client.release();
    }

    // Now buyer1 places a manual bid of $200.00 on watchAuctionId
    // Base is $200. Tier increment for $200 (< 500) is +$5.00
    // Expected counter-bid from buyer2's proxy: $205.00!
    const bidRes = await fetch(`${BASE_URL}/api/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `user_id=${seedData.buyerId}`,
      },
      body: JSON.stringify({
        auction_id: seedData.watchAuctionId,
        bidder_id: seedData.buyerId,
        bid_amount: 200.0,
      }),
    });

    const bidData = await bidRes.json();
    expect(bidRes.status).toBe(200);
    expect(bidData.success).toBe(true);

    // Verify in CockroachDB that the trigger placed the counter-bid of $205.00 for buyer2!
    const verifyClient = await pool.connect();
    try {
      const bidsRes = await verifyClient.query(
        `SELECT bidder_id, bid_amount 
         FROM BIDS 
         WHERE auction_id = $1 
         ORDER BY bid_amount DESC, bid_time DESC 
         LIMIT 2`,
        [seedData.watchAuctionId]
      );

      expect(bidsRes.rows.length).toBeGreaterThanOrEqual(2);
      const topBid = bidsRes.rows[0];
      expect(String(topBid.bidder_id)).toBe(String(seedData.buyer2Id));
      expect(parseFloat(topBid.bid_amount)).toBe(205.0);

      const secondBid = bidsRes.rows[1];
      expect(String(secondBid.bidder_id)).toBe(String(seedData.buyerId));
      expect(parseFloat(secondBid.bid_amount)).toBe(200.0);

      // Verify AUCTIONS table current_highest_bid is synchronized to 205.00
      const aucCheck = await verifyClient.query(
        'SELECT current_highest_bid FROM AUCTIONS WHERE auction_id = $1',
        [seedData.watchAuctionId]
      );
      expect(parseFloat(aucCheck.rows[0].current_highest_bid)).toBe(205.0);
    } finally {
      verifyClient.release();
    }
  });

  // TC-PROXY-06: Proxy all-in ceiling capping
  it('TC-PROXY-06: Caps counter-bid exactly at max_bid_amount when increment pushes over', async () => {
    // Set buyer2's proxy on tentAuctionId to exactly $113.00
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO PROXY_BIDS (auction_id, bidder_id, max_bid_amount, max_limit, is_active)
         VALUES ($1, $2, 113.00, 113.00, TRUE)
         ON CONFLICT (auction_id, bidder_id) 
         DO UPDATE SET max_bid_amount = 113.00, max_limit = 113.00, is_active = TRUE`,
        [seedData.tentAuctionId, seedData.buyer2Id]
      );
      // Reset current_highest_bid to 100.00
      await client.query('UPDATE AUCTIONS SET current_highest_bid = 100.00 WHERE auction_id = $1', [
        seedData.tentAuctionId,
      ]);
    } finally {
      client.release();
    }

    // Buyer1 bids $110.00
    // Required increment for 110 (< 500) is +$5.00 -> $115.00
    // But proxy ceiling is $113.00 (< $115.00).
    // The engine should bid exactly $113.00!
    const bidRes = await fetch(`${BASE_URL}/api/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `user_id=${seedData.buyerId}`,
      },
      body: JSON.stringify({
        auction_id: seedData.tentAuctionId,
        bidder_id: seedData.buyerId,
        bid_amount: 110.0,
      }),
    });

    const bidData = await bidRes.json();
    expect(bidRes.status).toBe(200);

    const checkClient = await pool.connect();
    try {
      const topRes = await checkClient.query(
        `SELECT bidder_id, bid_amount 
         FROM BIDS 
         WHERE auction_id = $1 
         ORDER BY bid_amount DESC 
         LIMIT 1`,
        [seedData.tentAuctionId]
      );
      expect(String(topRes.rows[0].bidder_id)).toBe(String(seedData.buyer2Id));
      expect(parseFloat(topRes.rows[0].bid_amount)).toBe(113.0);
    } finally {
      checkClient.release();
    }
  });
});
