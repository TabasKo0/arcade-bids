import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '@/lib/db';
import { setupTestDatabase, teardownTestDatabase, TestSeedData } from '../db-setup';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Category 1: API & Database Trigger Resilience (Hostile Attacks)', () => {
  let seedData: TestSeedData;

  beforeAll(async () => {
    seedData = await setupTestDatabase();
  }, 60000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // TC-API-01 (Self-Bidding)
  it('TC-API-01: Rejects seller self-bidding with native DB trigger exception (P0001)', async () => {
    const res = await fetch(`${BASE_URL}/api/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: seedData.tentAuctionId,
        bidder_id: seedData.sellerId, // Seller trying to bid on their own item
        bid_amount: 150.00,
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Sellers cannot bid on their own auctions');
    if (data.code) {
      expect(data.code).toBe('P0001');
    }
  });

  // TC-API-02 (Invalid Increment)
  it('TC-API-02: Rejects invalid bid increment under $500 tier via DB trigger (P0003)', async () => {
    // seedData.incrementAuctionId has current_highest_bid = $150.00
    // Required increment for $150 (base < $500) is +$5.00 -> minimum valid bid is $155.00
    // We send $151.00 (+$1.00)
    const res = await fetch(`${BASE_URL}/api/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: seedData.incrementAuctionId,
        bidder_id: seedData.buyerId,
        bid_amount: 151.00,
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/Bid must be at least 5.00 higher than the current bid/i);
    if (data.code) {
      expect(data.code).toBe('P0003');
    }
  });

  // TC-API-03 (Snipe Extension)
  it('TC-API-03: Extends auction by exactly 5 minutes when a bid is placed within 120 seconds of closing', async () => {
    // 1. Manually update auction's current_end_time to 30 seconds from now
    const client = await pool.connect();
    let initialEndTime: Date;
    try {
      const updateRes = await client.query(
        `UPDATE AUCTIONS 
         SET current_end_time = NOW() + INTERVAL '30 seconds',
             status = 'ACTIVE'
         WHERE auction_id = $1
         RETURNING current_end_time`,
        [seedData.tentAuctionId]
      );
      initialEndTime = new Date(updateRes.rows[0].current_end_time);
    } finally {
      client.release();
    }

    // 2. Submit a valid bid ($120.00 is > current_highest 0.00)
    const bidRes = await fetch(`${BASE_URL}/api/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: seedData.tentAuctionId,
        bidder_id: seedData.buyerId,
        bid_amount: 120.00,
      }),
    });

    const bidData = await bidRes.json();
    expect(bidRes.status).toBe(200);
    expect(bidData.success).toBe(true);

    // 3. Verify via subsequent GET request that current_end_time increased by exactly 5 minutes
    const getRes = await fetch(`${BASE_URL}/api/auction/${seedData.tentAuctionId}`);
    expect(getRes.status).toBe(200);
    const refreshedData = await getRes.json();

    const extendedEndTime = new Date(refreshedData.current_end_time);
    const diffMs = extendedEndTime.getTime() - initialEndTime.getTime();
    const diffMinutes = Math.round(diffMs / (60 * 1000));

    expect(diffMinutes).toBe(5);
    expect(refreshedData.status).toBe('EXTENDED');
  });

  // TC-API-04 (Post-Expiration Bid)
  it('TC-API-04: Rejects bids on expired auctions with DB trigger exception (P0004)', async () => {
    const res = await fetch(`${BASE_URL}/api/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auction_id: seedData.expiredAuctionId,
        bidder_id: seedData.buyerId,
        bid_amount: 250.00,
      }),
    });

    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Auction has already ended');
    if (data.code) {
      expect(data.code).toBe('P0004');
    }
  });
});
