import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auctionId = id ? id.trim() : '';

    if (!auctionId) {
      return NextResponse.json({ error: 'Invalid auction id' }, { status: 400 });
    }

    // 1. Validation: Check status and expiration time
    const checkRes = await pool.query(
      `SELECT auction_id, status, current_end_time,
              (current_end_time <= NOW()) AS is_past_end
       FROM AUCTIONS
       WHERE auction_id = $1`,
      [auctionId]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const { status, is_past_end } = checkRes.rows[0];

    // Already settled by another client
    if (status === 'ENDED' || status === 'RESERVE_NOT_MET') {
      return NextResponse.json(
        { message: 'Auction is already settled', status, settled: true },
        { status: 200 }
      );
    }

    // Not expired yet
    if (!is_past_end) {
      return NextResponse.json(
        { error: 'Auction has not expired yet', current_end_time: checkRes.rows[0].current_end_time },
        { status: 400 }
      );
    }

    // Must be ACTIVE or EXTENDED to settle
    if (status !== 'ACTIVE' && status !== 'EXTENDED') {
      return NextResponse.json(
        { error: `Cannot settle auction in '${status}' status` },
        { status: 400 }
      );
    }

    // 2. Execution: Call atomic settlement procedure
    await pool.query('CALL close_expired_auction($1);', [auctionId]);

    // 3. Response: Return 200 OK indicating successful settlement
    return NextResponse.json(
      { message: 'Auction settled successfully', settled: true },
      { status: 200 }
    );
  } catch (error: any) {
    if (
      error?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      error?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw error;
    }
    console.error('Error settling auction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to settle auction' },
      { status: 500 }
    );
  }
}
