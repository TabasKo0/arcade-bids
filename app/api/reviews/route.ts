import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { result_id, auction_id, rating, review_text } = body;
    let resultId = result_id;

    const parsedRating = parseFloat(rating);
    if (isNaN(parsedRating) || parsedRating < 1.0 || parsedRating > 5.0) {
      return NextResponse.json(
        { error: 'Rating must be a numeric value between 1.0 and 5.0' },
        { status: 400 }
      );
    }

    if (!resultId && auction_id) {
      const res = await pool.query(
        'SELECT result_id FROM AUCTION_RESULTS WHERE auction_id = $1',
        [auction_id]
      );
      if (res.rows.length > 0) {
        resultId = res.rows[0].result_id;
      }
    }

    if (!resultId) {
      return NextResponse.json(
        { error: 'Valid result_id or auction_id is required' },
        { status: 400 }
      );
    }

    // Determine reviewer (winning bidder) and reviewee (seller)
    const contextRes = await pool.query(
      `SELECT 
         ar.result_id,
         b.bidder_id AS buyer_id,
         i.seller_id
       FROM AUCTION_RESULTS ar
       JOIN AUCTIONS a ON ar.auction_id = a.auction_id
       JOIN ITEMS i ON a.item_id = i.item_id
       JOIN BIDS b ON ar.winning_bid_id = b.bid_id AND ar.winning_bid_time = b.bid_time
       WHERE ar.result_id = $1`,
      [resultId]
    );

    if (contextRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Could not resolve auction parties for result_id ' + resultId },
        { status: 404 }
      );
    }

    const { buyer_id, seller_id } = contextRes.rows[0];

    // If caller provided reviewer_id, use it, else default to buyer_id
    const sessionUserId = await getSessionUserId();
    const reviewerId = body.reviewer_id || sessionUserId || buyer_id;
    const revieweeId = body.reviewee_id || seller_id;

    if (reviewerId === revieweeId) {
      return NextResponse.json(
        { error: 'Reviewer and reviewee cannot be the same user' },
        { status: 400 }
      );
    }

    const insertRes = await pool.query(
      `INSERT INTO REVIEWS_RATINGS (result_id, reviewer_id, reviewee_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [resultId, reviewerId, revieweeId, parsedRating, review_text || '']
    );

    // Fetch updated seller rating
    const userRes = await pool.query(
      'SELECT user_id, username, rating_score FROM USERS WHERE user_id = $1',
      [revieweeId]
    );

    return NextResponse.json({
      success: true,
      review: insertRes.rows[0],
      updated_seller: userRes.rows[0]
    });
  } catch (error: any) {
    console.error('Review submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}
