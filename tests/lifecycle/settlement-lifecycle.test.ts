import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pool from '@/lib/db';
import { setupTestDatabase, teardownTestDatabase, TestSeedData } from '../db-setup';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Category 4 & 5: Settlement, Escrow, and Core Lifecycle Flows', () => {
  let seedData: TestSeedData;

  beforeAll(async () => {
    seedData = await setupTestDatabase();
  }, 90000);

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // TC-E2E-01 & TC-LIFE-02 (The Underperformer - Reserve Missed)
  it('TC-E2E-01 & TC-LIFE-02: Updates auction to RESERVE_NOT_MET when highest bid is below reserve price, creating no escrow', async () => {
    const client = await pool.connect();
    let testAuctionId: number;

    try {
      // 1. Create auction with reserve price $100 and active duration
      const catRes = await client.query('SELECT category_id FROM CATEGORIES LIMIT 1');
      const validCatId = catRes.rows[0].category_id;
      const itemRes = await client.query(
        `INSERT INTO ITEMS (seller_id, category_id, title, description)
         VALUES ($1, $2, 'Vintage Pocket Watch', 'Sub-reserve test item')
         RETURNING item_id`,
        [seedData.sellerId, validCatId]
      );
      const itemId = itemRes.rows[0].item_id;

      const aucRes = await client.query(
        `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, current_highest_bid, total_bids, status, start_time, base_end_time, current_end_time)
         VALUES ($1, 20.00, 100.00, 0.00, 0, 'ACTIVE', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '2 hours')
         RETURNING auction_id`,
        [itemId]
      );
      testAuctionId = aucRes.rows[0].auction_id;

      // Insert $50 bid (< $100 reserve) while active
      await client.query(
        `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
         VALUES ($1, $2, 50.00, NOW() - INTERVAL '10 minutes')`,
        [testAuctionId, seedData.buyerId]
      );
      await client.query(
        'UPDATE AUCTIONS SET current_highest_bid = 50.00, total_bids = 1 WHERE auction_id = $1',
        [testAuctionId]
      );

      // Fast-forward auction to expired
      await client.query(
        "UPDATE AUCTIONS SET current_end_time = NOW() - INTERVAL '1 minute' WHERE auction_id = $1",
        [testAuctionId]
      );

      // 2. Trigger the close procedure
      await client.query('CALL close_expired_auction($1)', [testAuctionId]);

      // 3. Verify auction status
      const aucCheck = await client.query(
        'SELECT status, current_highest_bid, reserve_price FROM AUCTIONS WHERE auction_id = $1',
        [testAuctionId]
      );
      expect(aucCheck.rows[0].status).toBe('RESERVE_NOT_MET');

      // 4. Verify no row in AUCTION_RESULTS or PAYMENTS_ESCROW
      const resultsCheck = await client.query(
        'SELECT * FROM AUCTION_RESULTS WHERE auction_id = $1',
        [testAuctionId]
      );
      expect(resultsCheck.rows.length).toBe(0);

      const escrowCheck = await client.query(
        `SELECT pe.* FROM PAYMENTS_ESCROW pe
         JOIN AUCTION_RESULTS ar ON pe.result_id = ar.result_id
         WHERE ar.auction_id = $1`,
        [testAuctionId]
      );
      expect(escrowCheck.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  // TC-LIFE-01 (The Ghost Town - No Bids)
  it('TC-LIFE-01: Sets status to RESERVE_NOT_MET when auction expires with 0 bids', async () => {
    const client = await pool.connect();
    let zeroBidAuctionId: number;

    try {
      const catRes = await client.query('SELECT category_id FROM CATEGORIES LIMIT 1');
      const validCatId = catRes.rows[0].category_id;
      const itemRes = await client.query(
        `INSERT INTO ITEMS (seller_id, category_id, title, description)
         VALUES ($1, $2, 'Unwanted Dust Collector', 'Ghost town test listing')
         RETURNING item_id`,
        [seedData.sellerId, validCatId]
      );
      const itemId = itemRes.rows[0].item_id;

      const aucRes = await client.query(
        `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, current_highest_bid, total_bids, status, start_time, base_end_time, current_end_time)
         VALUES ($1, 50.00, 100.00, 0.00, 0, 'ACTIVE', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '1 minute')
         RETURNING auction_id`,
        [itemId]
      );
      zeroBidAuctionId = aucRes.rows[0].auction_id;

      // Close the expired auction
      await client.query('CALL close_expired_auction($1)', [zeroBidAuctionId]);

      const aucCheck = await client.query(
        'SELECT status, total_bids FROM AUCTIONS WHERE auction_id = $1',
        [zeroBidAuctionId]
      );
      expect(aucCheck.rows[0].status).toBe('RESERVE_NOT_MET');

      const resultsCheck = await client.query(
        'SELECT * FROM AUCTION_RESULTS WHERE auction_id = $1',
        [zeroBidAuctionId]
      );
      expect(resultsCheck.rows.length).toBe(0);

      const escrowCheck = await client.query(
        `SELECT pe.* FROM PAYMENTS_ESCROW pe
         JOIN AUCTION_RESULTS ar ON pe.result_id = ar.result_id
         WHERE ar.auction_id = $1`,
        [zeroBidAuctionId]
      );
      expect(escrowCheck.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  // TC-E2E-02 & TC-LIFE-03 (The Golden Path - Win & Escrow)
  it('TC-E2E-02 & TC-LIFE-03: Successfully settles auction clearing reserve into ENDED state with winning bid and HELD escrow', async () => {
    const client = await pool.connect();
    let winningAuctionId: number;
    let expectedWinningBidId: string;

    try {
      const catRes = await client.query('SELECT category_id FROM CATEGORIES LIMIT 1');
      const validCatId = catRes.rows[0].category_id;
      const itemRes = await client.query(
        `INSERT INTO ITEMS (seller_id, category_id, title, description)
         VALUES ($1, $2, 'Golden Path Collector Watch', 'Item destined for winning settlement')
         RETURNING item_id`,
        [seedData.sellerId, validCatId]
      );
      const itemId = itemRes.rows[0].item_id;

      const aucRes = await client.query(
        `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, current_highest_bid, total_bids, status, start_time, base_end_time, current_end_time)
         VALUES ($1, 50.00, 100.00, 0.00, 0, 'ACTIVE', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '2 hours')
         RETURNING auction_id`,
        [itemId]
      );
      winningAuctionId = aucRes.rows[0].auction_id;

      // First bid: $80
      await client.query(
        `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
         VALUES ($1, $2, 80.00, NOW() - INTERVAL '30 minutes')`,
        [winningAuctionId, seedData.buyer2Id]
      );
      await client.query(
        'UPDATE AUCTIONS SET current_highest_bid = 80.00, total_bids = 1 WHERE auction_id = $1',
        [winningAuctionId]
      );

      // Winning bid: $150 (clears $100 reserve)
      const winBidRes = await client.query(
        `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
         VALUES ($1, $2, 150.00, NOW() - INTERVAL '15 minutes')
         RETURNING bid_id`,
        [winningAuctionId, seedData.buyerId]
      );
      expectedWinningBidId = String(winBidRes.rows[0].bid_id);
      await client.query(
        'UPDATE AUCTIONS SET current_highest_bid = 150.00, total_bids = 2 WHERE auction_id = $1',
        [winningAuctionId]
      );

      // Fast forward to expired
      await client.query(
        "UPDATE AUCTIONS SET current_end_time = NOW() - INTERVAL '1 minute' WHERE auction_id = $1",
        [winningAuctionId]
      );

      // Trigger the close procedure
      await client.query('CALL close_expired_auction($1)', [winningAuctionId]);

      // 1. Verify auction status is ENDED
      const aucCheck = await client.query(
        'SELECT status, current_highest_bid FROM AUCTIONS WHERE auction_id = $1',
        [winningAuctionId]
      );
      expect(aucCheck.rows[0].status).toBe('ENDED');

      // 2. Verify AUCTION_RESULTS row exists with correct winning_bid_id
      const resultsCheck = await client.query(
        'SELECT * FROM AUCTION_RESULTS WHERE auction_id = $1',
        [winningAuctionId]
      );
      expect(resultsCheck.rows.length).toBe(1);
      expect(String(resultsCheck.rows[0].winning_bid_id)).toBe(expectedWinningBidId);

      const resultId = resultsCheck.rows[0].result_id;

      // 3. Verify PAYMENTS_ESCROW row was created automatically by trigger with status HELD
      const escrowCheck = await client.query(
        'SELECT * FROM PAYMENTS_ESCROW WHERE result_id = $1',
        [resultId]
      );
      expect(escrowCheck.rows.length).toBe(1);
      expect(escrowCheck.rows[0].status).toBe('HELD');
      expect(parseFloat(escrowCheck.rows[0].amount_held)).toBe(150.00);
    } finally {
      client.release();
    }
  });

  // TC-LIFE-04 (Final Handshake - Release & Review)
  it('TC-LIFE-04: Releases escrow to RELEASED on delivery and updates seller rating_score via DB trigger upon 5.0 review', async () => {
    const client = await pool.connect();
    let handshakeAuctionId: number;
    let resultId: number;

    try {
      // Setup a freshly won auction
      const catRes = await client.query('SELECT category_id FROM CATEGORIES LIMIT 1');
      const validCatId = catRes.rows[0].category_id;
      const itemRes = await client.query(
        `INSERT INTO ITEMS (seller_id, category_id, title, description)
         VALUES ($1, $2, 'Handshake Acoustic Guitar', 'Delivered item for rating test')
         RETURNING item_id`,
        [seedData.sellerId, validCatId]
      );
      const itemId = itemRes.rows[0].item_id;

      const aucRes = await client.query(
        `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, current_highest_bid, total_bids, status, start_time, base_end_time, current_end_time)
         VALUES ($1, 100.00, 200.00, 0.00, 0, 'ACTIVE', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour')
         RETURNING auction_id`,
        [itemId]
      );
      handshakeAuctionId = aucRes.rows[0].auction_id;

      const winBidRes = await client.query(
        `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
         VALUES ($1, $2, 300.00, NOW() - INTERVAL '20 minutes')
         RETURNING bid_id, bid_time`,
        [handshakeAuctionId, seedData.buyerId]
      );
      await client.query(
        'UPDATE AUCTIONS SET current_highest_bid = 300.00, total_bids = 1 WHERE auction_id = $1',
        [handshakeAuctionId]
      );

      // Fast forward
      await client.query(
        "UPDATE AUCTIONS SET current_end_time = NOW() - INTERVAL '1 minute' WHERE auction_id = $1",
        [handshakeAuctionId]
      );

      // Close and generate escrow
      await client.query('CALL close_expired_auction($1)', [handshakeAuctionId]);

      const resRow = await client.query(
        'SELECT result_id FROM AUCTION_RESULTS WHERE auction_id = $1',
        [handshakeAuctionId]
      );
      resultId = resRow.rows[0].result_id;

      // 1. Send API request to mark item as "Delivered" (releasing Escrow)
      const escrowRes = await fetch(`${BASE_URL}/api/escrow/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result_id: resultId }),
      });

      expect(escrowRes.status).toBe(200);
      const escrowData = await escrowRes.json();
      expect(escrowData.success).toBe(true);
      expect(escrowData.escrow.status).toBe('RELEASED');

      // Verify in DB directly
      const dbEscrow = await client.query(
        'SELECT status FROM PAYMENTS_ESCROW WHERE result_id = $1',
        [resultId]
      );
      expect(dbEscrow.rows[0].status).toBe('RELEASED');

      // 2. Post a 5.0 rating for the seller
      const reviewRes = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result_id: resultId,
          reviewer_id: seedData.buyerId,
          reviewee_id: seedData.sellerId,
          rating: 5.0,
          review_text: 'Fast shipping, pristine condition, highly recommended!',
        }),
      });

      expect(reviewRes.status).toBe(200);
      const reviewData = await reviewRes.json();
      expect(reviewData.success).toBe(true);

      // 3. Query the USERS table for the seller to verify rating_score mathematically updated via update_user_rating trigger
      const sellerCheck = await client.query(
        'SELECT user_id, username, rating_score FROM USERS WHERE user_id = $1',
        [seedData.sellerId]
      );

      expect(sellerCheck.rows.length).toBe(1);
      const rating = parseFloat(sellerCheck.rows[0].rating_score);
      expect(rating).toBe(5.00);
    } finally {
      client.release();
    }
  });

  // TC-LAZY-SETTLE-01: Lazy settlement API endpoint validation and atomic procedure execution
  it('TC-LAZY-SETTLE-01: POST /api/auction/[id]/settle validates expiration, settles atomically, and handles idempotency', async () => {
    const client = await pool.connect();
    try {
      // Fetch a valid category
      const catRes = await client.query('SELECT category_id FROM CATEGORIES LIMIT 1');
      const categoryId = catRes.rows[0].category_id;

      // 1. Create an active unexpired auction (future end time)
      const unexpItem = await client.query(
        'INSERT INTO ITEMS (seller_id, category_id, title, description) VALUES ($1, $2, $3, $4) RETURNING item_id',
        [seedData.sellerId, categoryId, 'Unexpired Watch', 'Luxury watch not yet ended']
      );
      const unexpItemId = unexpItem.rows[0].item_id;

      const unexpAuc = await client.query(
        `INSERT INTO AUCTIONS 
          (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time)
         VALUES 
          ($1, 100.00, 200.00, 'ACTIVE', NOW(), NOW() + INTERVAL '2 hours', NOW() + INTERVAL '2 hours')
         RETURNING auction_id`,
        [unexpItemId]
      );
      const unexpAucId = String(unexpAuc.rows[0].auction_id);

      // Attempt to settle unexpired auction -> expect 400 Bad Request
      const prematureRes = await fetch(`${BASE_URL}/api/auction/${unexpAucId}/settle`, {
        method: 'POST',
      });
      expect(prematureRes.status).toBe(400);
      const prematureData = await prematureRes.json();
      expect(prematureData.error).toContain('not expired yet');

      // 2. Create an expired auction with a winning bid exceeding reserve
      const expItem = await client.query(
        'INSERT INTO ITEMS (seller_id, category_id, title, description) VALUES ($1, $2, $3, $4) RETURNING item_id',
        [seedData.sellerId, categoryId, 'Expired Vintage Camera', 'Ended auction ready for lazy settlement']
      );
      const expItemId = expItem.rows[0].item_id;

      const expAuc = await client.query(
        `INSERT INTO AUCTIONS 
          (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time)
         VALUES 
          ($1, 50.00, 100.00, 'ACTIVE', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '1 hour')
         RETURNING auction_id`,
        [expItemId]
      );
      const expAucId = String(expAuc.rows[0].auction_id);

      // Buyer places winning bid of $120.00 while active
      await client.query(
        `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
         VALUES ($1, $2, 120.00, NOW() - INTERVAL '1 minute')`,
        [expAucId, seedData.buyerId]
      );
      await client.query(
        'UPDATE AUCTIONS SET current_highest_bid = 120.00, total_bids = 1 WHERE auction_id = $1',
        [expAucId]
      );

      // Fast-forward auction time to past to trigger expiration
      await client.query(
        "UPDATE AUCTIONS SET current_end_time = NOW() - INTERVAL '10 seconds' WHERE auction_id = $1",
        [expAucId]
      );

      // Record pre-settlement balances
      const buyerPre = await client.query('SELECT wallet_balance FROM USERS WHERE user_id = $1', [seedData.buyerId]);
      const sellerPre = await client.query('SELECT wallet_balance FROM USERS WHERE user_id = $1', [seedData.sellerId]);
      const initialBuyerBal = parseFloat(String(buyerPre.rows[0].wallet_balance));
      const initialSellerBal = parseFloat(String(sellerPre.rows[0].wallet_balance));

      // 3. Fire lazy settlement via POST /api/auction/[id]/settle
      const settleRes = await fetch(`${BASE_URL}/api/auction/${expAucId}/settle`, {
        method: 'POST',
      });
      expect(settleRes.status).toBe(200);
      const settleData = await settleRes.json();
      expect(settleData.settled).toBe(true);

      // Verify database state: auction ended
      const aucCheck = await client.query('SELECT status FROM AUCTIONS WHERE auction_id = $1', [expAucId]);
      expect(aucCheck.rows[0].status).toBe('ENDED');

      // Verify atomic wallet transfer
      const buyerPost = await client.query('SELECT wallet_balance FROM USERS WHERE user_id = $1', [seedData.buyerId]);
      const sellerPost = await client.query('SELECT wallet_balance FROM USERS WHERE user_id = $1', [seedData.sellerId]);
      expect(parseFloat(String(buyerPost.rows[0].wallet_balance))).toBe(initialBuyerBal - 120.00);
      expect(parseFloat(String(sellerPost.rows[0].wallet_balance))).toBe(initialSellerBal + 120.00);

      // Verify receipt was generated
      const receiptCheck = await client.query('SELECT * FROM RECEIPTS WHERE auction_id = $1', [expAucId]);
      expect(receiptCheck.rows.length).toBe(1);
      expect(parseFloat(String(receiptCheck.rows[0].amount_paid))).toBe(120.00);

      // 4. Test idempotency: Calling /settle again on already settled auction returns 200 OK
      const alreadySettledRes = await fetch(`${BASE_URL}/api/auction/${expAucId}/settle`, {
        method: 'POST',
      });
      expect(alreadySettledRes.status).toBe(200);
      const alreadySettledData = await alreadySettledRes.json();
      expect(alreadySettledData.settled).toBe(true);

      // 5. Non-existent auction returns 404
      const notFoundRes = await fetch(`${BASE_URL}/api/auction/99999999999/settle`, {
        method: 'POST',
      });
      expect(notFoundRes.status).toBe(404);
    } finally {
      client.release();
    }
  });
});
