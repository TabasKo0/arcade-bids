'use server';

import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Update Reserve Price for an active, extended, or draft auction owned by the seller.
 */
export async function updateReservePrice(auctionId: number, reservePrice: number) {
  const sellerId = await getSessionUserId();
  if (!sellerId) {
    return { error: 'You must be logged in to manage this auction.' };
  }

  if (isNaN(reservePrice) || reservePrice < 0) {
    return { error: 'Please provide a valid reserve price (0 or greater).' };
  }

  try {
    const result = await pool.query(
      `UPDATE AUCTIONS 
       SET reserve_price = $1 
       WHERE auction_id = $2 
         AND status IN ('DRAFT', 'ACTIVE', 'EXTENDED') 
         AND item_id IN (SELECT item_id FROM ITEMS WHERE seller_id = $3)`,
      [reservePrice, auctionId, sellerId]
    );

    if (result.rowCount === 0) {
      return { 
        error: 'Unable to update reserve price. The auction may already be ended, cancelled, or you are not the owner.' 
      };
    }

    revalidatePath(`/auction/${auctionId}`);
    revalidatePath('/my-auctions');
    return { success: true, message: `Reserve price updated to $${reservePrice.toFixed(2)}.` };
  } catch (error: any) {
    console.error('Update reserve price error:', error);
    return { error: error.message || 'A database error occurred while updating the reserve price.' };
  }
}

/**
 * End Auction Early (Finalize Current Bid):
 * 1. Sets current_end_time = NOW()
 * 2. Calls stored procedure close_expired_auction(p_auction_id)
 * Executed safely inside a transaction.
 */
export async function endAuctionEarly(auctionId: number) {
  const sellerId = await getSessionUserId();
  if (!sellerId) {
    return { error: 'You must be logged in to manage this auction.' };
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Query 1: Update current_end_time to NOW() for the seller's active auction
    const updateResult = await client.query(
      `UPDATE AUCTIONS 
       SET current_end_time = NOW() 
       WHERE auction_id = $1 
         AND status IN ('DRAFT', 'ACTIVE', 'EXTENDED')
         AND item_id IN (SELECT item_id FROM ITEMS WHERE seller_id = $2)`,
      [auctionId, sellerId]
    );

    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return { 
        error: 'Cannot end auction. It may already be closed, cancelled, or you are not the owner.' 
      };
    }

    // Query 2: Call the stored procedure to close and finalize the auction
    await client.query('CALL close_expired_auction($1)', [auctionId]);

    await client.query('COMMIT');

    revalidatePath(`/auction/${auctionId}`);
    revalidatePath('/my-auctions');
    revalidatePath('/my-bids');
    revalidatePath('/');

    return { success: true, message: 'Auction ended early and highest bid has been finalized.' };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('End auction early error:', error);
    return { error: error.message || 'A database error occurred while finalizing the auction.' };
  } finally {
    client.release();
  }
}

/**
 * Cancel Auction:
 * Sets auction status to 'CANCELLED' if currently DRAFT, ACTIVE, or EXTENDED.
 */
export async function cancelAuction(auctionId: number) {
  const sellerId = await getSessionUserId();
  if (!sellerId) {
    return { error: 'You must be logged in to manage this auction.' };
  }

  try {
    const result = await pool.query(
      `UPDATE AUCTIONS 
       SET status = 'CANCELLED' 
       WHERE auction_id = $1 
         AND status IN ('DRAFT', 'ACTIVE', 'EXTENDED') 
         AND item_id IN (SELECT item_id FROM ITEMS WHERE seller_id = $2)`,
      [auctionId, sellerId]
    );

    if (result.rowCount === 0) {
      return { 
        error: 'Cannot cancel auction. It may already be concluded, cancelled, or you are not the owner.' 
      };
    }

    revalidatePath(`/auction/${auctionId}`);
    revalidatePath('/my-auctions');
    revalidatePath('/my-bids');
    revalidatePath('/');

    return { success: true, message: 'Auction has been cancelled successfully.' };
  } catch (error: any) {
    console.error('Cancel auction error:', error);
    return { error: error.message || 'A database error occurred while cancelling the auction.' };
  }
}
