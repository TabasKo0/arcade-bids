import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateEmbedding } from '@/lib/embedding';

export interface TestSeedData {
  sellerId: string;
  buyerId: string;
  buyer2Id: string;
  adminId: string;
  tentAuctionId: number;
  bootsAuctionId: number;
  watchAuctionId: number;
  incrementAuctionId: number;
  dynamicMinAuctionId: number;
  nearExpiryAuctionId: number;
  expiredAuctionId: number;
}

const TEST_EMAILS = ['seller@test.com', 'buyer@test.com', 'buyer2@test.com', 'admin@test.com'];

export async function teardownTestDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Execute individual statements to comply with parameterized query protocol
    await client.query(`
      DELETE FROM REVIEWS_RATINGS 
      WHERE reviewer_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
         OR reviewee_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM PAYMENTS_ESCROW WHERE result_id IN (
        SELECT ar.result_id FROM AUCTION_RESULTS ar
        JOIN AUCTIONS a ON ar.auction_id = a.auction_id
        JOIN ITEMS i ON a.item_id = i.item_id
        JOIN USERS u ON i.seller_id = u.user_id
        WHERE u.email = ANY($1)
      )
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM AUCTION_RESULTS WHERE auction_id IN (
        SELECT a.auction_id FROM AUCTIONS a
        JOIN ITEMS i ON a.item_id = i.item_id
        JOIN USERS u ON i.seller_id = u.user_id
        WHERE u.email = ANY($1)
      )
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM PROXY_BIDS WHERE bidder_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM BIDS WHERE bidder_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
         OR auction_id IN (
           SELECT a.auction_id FROM AUCTIONS a
           JOIN ITEMS i ON a.item_id = i.item_id
           JOIN USERS u ON i.seller_id = u.user_id
           WHERE u.email = ANY($1)
         )
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM WATCHLIST WHERE user_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM RECEIPTS WHERE buyer_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
         OR seller_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM AUCTIONS WHERE item_id IN (
        SELECT item_id FROM ITEMS WHERE seller_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
      )
    `, [TEST_EMAILS]);

    await client.query(`
      DELETE FROM ITEMS WHERE seller_id IN (SELECT user_id FROM USERS WHERE email = ANY($1))
    `, [TEST_EMAILS]);

    await client.query(`
      UPDATE USERS SET rating_score = 0.00 WHERE email = ANY($1)
    `, [TEST_EMAILS]);
  } catch (err) {
    console.warn('Teardown warning:', err);
  } finally {
    client.release();
  }
}

export async function setupTestDatabase(): Promise<TestSeedData> {
  await teardownTestDatabase();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure Categories exist
    const catRes = await client.query(`
      INSERT INTO CATEGORIES (category_name)
      VALUES ('Outdoor & Adventure Gear')
      ON CONFLICT (parent_category_id, category_name) DO NOTHING
      RETURNING category_id
    `);
    let categoryId = catRes.rows[0]?.category_id;
    if (!categoryId) {
      const existing = await client.query(
        "SELECT category_id FROM CATEGORIES WHERE category_name = 'Outdoor & Adventure Gear' LIMIT 1"
      );
      categoryId = existing.rows[0]?.category_id || 1;
    }

    // 2. Upsert Standard Test Users (role: SELLER and BUYER)
    const passwordHash = bcrypt.hashSync('Password123!', 8);

    const sellerRes = await client.query(
      `INSERT INTO USERS (username, email, password_hash, role, rating_score)
       VALUES ('test_seller', 'seller@test.com', $1, 'SELLER', 0.00)
       ON CONFLICT (email) DO UPDATE 
       SET username = 'test_seller', password_hash = $1, role = 'SELLER', rating_score = 0.00
       RETURNING user_id`,
      [passwordHash]
    );
    const sellerId = String(sellerRes.rows[0].user_id);

    const buyerRes = await client.query(
      `INSERT INTO USERS (username, email, password_hash, role, rating_score)
       VALUES ('test_buyer', 'buyer@test.com', $1, 'BUYER', 0.00)
       ON CONFLICT (email) DO UPDATE 
       SET username = 'test_buyer', password_hash = $1, role = 'BUYER', rating_score = 0.00
       RETURNING user_id`,
      [passwordHash]
    );
    const buyerId = String(buyerRes.rows[0].user_id);

    const buyer2Res = await client.query(
      `INSERT INTO USERS (username, email, password_hash, role, rating_score)
       VALUES ('test_buyer2', 'buyer2@test.com', $1, 'BUYER', 0.00)
       ON CONFLICT (email) DO UPDATE 
       SET username = 'test_buyer2', password_hash = $1, role = 'BUYER', rating_score = 0.00
       RETURNING user_id`,
      [passwordHash]
    );
    const buyer2Id = String(buyer2Res.rows[0].user_id);

    const adminRes = await client.query(
      `INSERT INTO USERS (username, email, password_hash, role, rating_score)
       VALUES ('test_admin', 'admin@test.com', $1, 'ADMIN', 0.00)
       ON CONFLICT (email) DO UPDATE 
       SET username = 'test_admin', password_hash = $1, role = 'ADMIN', rating_score = 0.00
       RETURNING user_id`,
      [passwordHash]
    );
    const adminId = String(adminRes.rows[0].user_id);

    // 3. Generate Embeddings for Semantic Test Items
    const tentText = 'Waterproof 4-Person Camping Tent durable family shelter providing superior weather protection from heavy rain and stormy wind';
    const bootsText = 'All-Weather Gore-Tex Hiking Boots breathable waterproof membrane outdoor footwear designed to keep feet dry in wet trails and muddy terrain';
    const watchText = 'Vintage Luxury Chronograph Watch classic Swiss mechanical wristwatch with sapphire crystal and stainless steel casing';

    const [tentVector, bootsVector, watchVector] = await Promise.all([
      generateEmbedding(tentText),
      generateEmbedding(bootsText),
      generateEmbedding(watchText),
    ]);

    // Insert Items
    const tentItemRes = await client.query(
      `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
       VALUES ($1, $2, 'Waterproof 4-Person Camping Tent', $3, $4::VECTOR)
       RETURNING item_id`,
      [sellerId, categoryId, tentText, JSON.stringify(tentVector)]
    );
    const tentItemId = tentItemRes.rows[0].item_id;

    const bootsItemRes = await client.query(
      `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
       VALUES ($1, $2, 'All-Weather Gore-Tex Hiking Boots', $3, $4::VECTOR)
       RETURNING item_id`,
      [sellerId, categoryId, bootsText, JSON.stringify(bootsVector)]
    );
    const bootsItemId = bootsItemRes.rows[0].item_id;

    const watchItemRes = await client.query(
      `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
       VALUES ($1, $2, 'Vintage Luxury Chronograph Watch', $3, $4::VECTOR)
       RETURNING item_id`,
      [sellerId, categoryId, watchText, JSON.stringify(watchVector)]
    );
    const watchItemId = watchItemRes.rows[0].item_id;

    // Item for Increment testing
    const incItemRes = await client.query(
      `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
       VALUES ($1, $2, 'Smart Drone with 4K Camera', 'Aerial photography drone with GPS stabilization', $3::VECTOR)
       RETURNING item_id`,
      [sellerId, categoryId, JSON.stringify(watchVector)]
    );
    const incItemId = incItemRes.rows[0].item_id;

    // Item for Dynamic Min testing ($2000 bid)
    const dynItemRes = await client.query(
      `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
       VALUES ($1, $2, 'Classic Electric Guitar Collector Edition', 'Rare vintage electric guitar in mint condition', $3::VECTOR)
       RETURNING item_id`,
      [sellerId, categoryId, JSON.stringify(watchVector)]
    );
    const dynItemId = dynItemRes.rows[0].item_id;

    // Item for Near Expiry
    const nearExpiryItemRes = await client.query(
      `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
       VALUES ($1, $2, 'Speedy Bid Collector Coin', 'Limited edition commemorative coin', $3::VECTOR)
       RETURNING item_id`,
      [sellerId, categoryId, JSON.stringify(watchVector)]
    );
    const nearExpiryItemId = nearExpiryItemRes.rows[0].item_id;

    // Item for Expired Auction
    const expiredItemRes = await client.query(
      `INSERT INTO ITEMS (seller_id, category_id, title, description, embedding)
       VALUES ($1, $2, 'Antique Brass Telescope', '19th century nautical telescope', $3::VECTOR)
       RETURNING item_id`,
      [sellerId, categoryId, JSON.stringify(watchVector)]
    );
    const expiredItemId = expiredItemRes.rows[0].item_id;

    // 4. Create Auctions
    // Tent: starting $50, reserve $100, active
    const tentAucRes = await client.query(
      `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time)
       VALUES ($1, 50.00, 100.00, 'ACTIVE', NOW(), NOW() + INTERVAL '24 hours', NOW() + INTERVAL '24 hours')
       RETURNING auction_id`,
      [tentItemId]
    );
    const tentAuctionId = tentAucRes.rows[0].auction_id;

    // Boots: starting $80, reserve $150, active
    const bootsAucRes = await client.query(
      `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time)
       VALUES ($1, 80.00, 150.00, 'ACTIVE', NOW(), NOW() + INTERVAL '24 hours', NOW() + INTERVAL '24 hours')
       RETURNING auction_id`,
      [bootsItemId]
    );
    const bootsAuctionId = bootsAucRes.rows[0].auction_id;

    // Watch: starting $200, reserve $350, active
    const watchAucRes = await client.query(
      `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time)
       VALUES ($1, 200.00, 350.00, 'ACTIVE', NOW(), NOW() + INTERVAL '24 hours', NOW() + INTERVAL '24 hours')
       RETURNING auction_id`,
      [watchItemId]
    );
    const watchAuctionId = watchAucRes.rows[0].auction_id;

    // Increment Auction: starting $100, current highest bid $150
    const incAucRes = await client.query(
      `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, current_highest_bid, total_bids, status, start_time, base_end_time, current_end_time)
       VALUES ($1, 100.00, 300.00, 0.00, 0, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '23 hours', NOW() + INTERVAL '23 hours')
       RETURNING auction_id`,
      [incItemId]
    );
    const incrementAuctionId = incAucRes.rows[0].auction_id;
    await client.query(
      `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
       VALUES ($1, $2, 150.00, NOW() - INTERVAL '30 minutes')`,
      [incrementAuctionId, buyer2Id]
    );
    await client.query(
      'UPDATE AUCTIONS SET current_highest_bid = 150.00, total_bids = 1 WHERE auction_id = $1',
      [incrementAuctionId]
    );

    // Dynamic Min Auction: starting $1000, current highest bid $2000
    const dynAucRes = await client.query(
      `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, current_highest_bid, total_bids, status, start_time, base_end_time, current_end_time)
       VALUES ($1, 1000.00, 3000.00, 0.00, 0, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '23 hours', NOW() + INTERVAL '23 hours')
       RETURNING auction_id`,
      [dynItemId]
    );
    const dynamicMinAuctionId = dynAucRes.rows[0].auction_id;
    await client.query(
      `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
       VALUES ($1, $2, 2000.00, NOW() - INTERVAL '30 minutes')`,
      [dynamicMinAuctionId, buyer2Id]
    );
    await client.query(
      'UPDATE AUCTIONS SET current_highest_bid = 2000.00, total_bids = 1 WHERE auction_id = $1',
      [dynamicMinAuctionId]
    );

    // Near Expiry Auction: expires in 30 seconds
    const nearAucRes = await client.query(
      `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, current_highest_bid, total_bids, status, start_time, base_end_time, current_end_time)
       VALUES ($1, 50.00, 100.00, 0.00, 0, 'ACTIVE', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 seconds', NOW() + INTERVAL '30 seconds')
       RETURNING auction_id`,
      [nearExpiryItemId]
    );
    const nearExpiryAuctionId = nearAucRes.rows[0].auction_id;
    await client.query(
      `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
       VALUES ($1, $2, 60.00, NOW() - INTERVAL '5 minutes')`,
      [nearExpiryAuctionId, buyer2Id]
    );
    await client.query(
      'UPDATE AUCTIONS SET current_highest_bid = 60.00, total_bids = 1 WHERE auction_id = $1',
      [nearExpiryAuctionId]
    );

    // Expired Auction: ended 10 minutes ago
    const expAucRes = await client.query(
      `INSERT INTO AUCTIONS (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time)
       VALUES ($1, 50.00, 100.00, 'ENDED', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes')
       RETURNING auction_id`,
      [expiredItemId]
    );
    const expiredAuctionId = expAucRes.rows[0].auction_id;

    await client.query('COMMIT');

    return {
      sellerId,
      buyerId,
      buyer2Id,
      adminId,
      tentAuctionId,
      bootsAuctionId,
      watchAuctionId,
      incrementAuctionId,
      dynamicMinAuctionId,
      nearExpiryAuctionId,
      expiredAuctionId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('setupTestDatabase failed:', error);
    throw error;
  } finally {
    client.release();
  }
}
