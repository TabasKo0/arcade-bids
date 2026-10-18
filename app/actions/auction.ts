'use server';

import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function createAuction(state: any, formData: FormData) {
  const sellerId = await getSessionUserId();
  if (!sellerId) {
    return { error: 'You must be logged in to create an auction.' };
  }

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const startingPrice = parseFloat(formData.get('startingPrice') as string);
  const reservePrice = parseFloat(formData.get('reservePrice') as string);
  const durationHours = parseInt(formData.get('durationHours') as string, 10);
  const categoryId = (formData.get('categoryId') as string)?.trim();

  if (!title || isNaN(startingPrice) || isNaN(durationHours) || !categoryId) {
    return { error: 'Title, starting price, duration, and category are required.' };
  }

  const client = await pool.connect();
  let createdAuctionId: string | number | null = null;

  try {
    await client.query('BEGIN');

    // 1. Insert Item with embedding
    let vector: number[] | null = null;
    try {
      const { generateEmbedding } = await import('@/lib/embedding');
      vector = await generateEmbedding(`${title} ${description || ''}`.trim());
    } catch (e) {
      console.warn('Embedding generation on item create failed, can be backfilled later:', e);
    }

    const itemResult = vector
      ? await client.query(
          'INSERT INTO ITEMS (seller_id, category_id, title, description, embedding) VALUES ($1, $2, $3, $4, $5::VECTOR) RETURNING item_id',
          [sellerId, categoryId, title, description, JSON.stringify(vector)]
        )
      : await client.query(
          'INSERT INTO ITEMS (seller_id, category_id, title, description) VALUES ($1, $2, $3, $4) RETURNING item_id',
          [sellerId, categoryId, title, description]
        );
    const itemId = itemResult.rows[0].item_id;

    // 2. Insert Auction
    // start_time is now, base_end_time and current_end_time are now + durationHours
    const auctionResult = await client.query(
      `INSERT INTO AUCTIONS 
        (item_id, starting_price, reserve_price, status, start_time, base_end_time, current_end_time) 
       VALUES 
        ($1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + ($4::INT * INTERVAL '1 hour'), CURRENT_TIMESTAMP + ($4::INT * INTERVAL '1 hour')) 
       RETURNING auction_id`,
      [itemId, startingPrice, isNaN(reservePrice) ? null : reservePrice, durationHours]
    );

    createdAuctionId = String(auctionResult.rows[0].auction_id);

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create auction error:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  } finally {
    client.release();
  }

  redirect(`/auction/${createdAuctionId}`);
}

export async function placeBid(state: any, formData: FormData) {
  const bidderId = await getSessionUserId();
  if (!bidderId) {
    return { error: 'You must be logged in to place a bid.' };
  }

  const auctionId = (formData.get('auctionId') as string)?.trim();
  const bidAmount = parseFloat(formData.get('bidAmount') as string);

  if (!auctionId || isNaN(bidAmount)) {
    return { error: 'Invalid bid data.' };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    await client.query(
      'INSERT INTO BIDS (auction_id, bidder_id, bid_amount) VALUES ($1, $2, $3)',
      [auctionId, bidderId, bidAmount]
    );
    
    await client.query(
      'UPDATE AUCTIONS SET current_highest_bid = $1 WHERE auction_id = $2',
      [bidAmount, auctionId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Place bid error:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  } finally {
    client.release();
  }

  redirect(`/auction/${auctionId}`);
}
