import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';


export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await pool.query(
      `SELECT wallet_balance, (SELECT COALESCE(SUM(current_highest_bid), 0) FROM AUCTIONS a JOIN BIDS b ON a.auction_id = b.auction_id WHERE a.status IN ('ACTIVE', 'EXTENDED') AND b.bid_amount = a.current_highest_bid AND b.bidder_id = u.user_id) AS locked_points FROM USERS u WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = res.rows[0];
    return NextResponse.json({
      wallet_balance: parseFloat(String(user.wallet_balance || 0)),
      locked_points: parseFloat(String(user.locked_points || 0)),
    });
  } catch (error: any) {
    if (
      error?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      error?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw error;
    }
    console.error('Failed to fetch user wallet balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallet balance' },
      { status: 500 }
    );
  }
}
