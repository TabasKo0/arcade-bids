'use server';

import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function createAuction(state: any, formData: FormData) {
  const sellerId = await getSessionUserId();
  if (!sellerId) {
    return { error: 'You must be logged in to create an auction.' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const startingPrice = parseFloat(formData.get('startingPrice') as string);
  const reservePrice = parseFloat(formData.get('reservePrice') as string);
  const durationHours = parseInt(formData.get('durationHours') as string, 10);
  const categoryId = parseInt(formData.get('categoryId') as string, 10) || 1; // Default category if not provided

  if (!title || isNaN(startingPrice) || isNaN(durationHours)) {
    return { error: 'Title, starting price, and duration are required.' };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert Item
    const itemResult = await client.query(
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
        ($1, $2, $3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '1 hour' * $4, CURRENT_TIMESTAMP + interval '1 hour' * $4) 
       RETURNING auction_id`,
      [itemId, startingPrice, isNaN(reservePrice) ? null : reservePrice, durationHours]
    );

    const auctionId = auctionResult.rows[0].auction_id;

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create auction error:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  } finally {
    client.release();
  }

  redirect('/');
}

export async function placeBid(state: any, formData: FormData) {
  const bidderId = await getSessionUserId();
  if (!bidderId) {
    return { error: 'You must be logged in to place a bid.' };
  }

  const auctionId = parseInt(formData.get('auctionId') as string, 10);
  const bidAmount = parseFloat(formData.get('bidAmount') as string);

  if (isNaN(auctionId) || isNaN(bidAmount)) {
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
