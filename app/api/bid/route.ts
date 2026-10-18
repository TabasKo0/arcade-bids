import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auction_id = body.auction_id !== undefined ? String(body.auction_id) : '';
    let bidder_id = body.bidder_id !== undefined ? String(body.bidder_id) : await getSessionUserId();
    const bid_amount = Number(body.bid_amount);

    if (!auction_id || auction_id.trim() === '') {
      return NextResponse.json({ error: 'Valid auction_id is required.' }, { status: 400 });
    }

    if (!bidder_id) {
      return NextResponse.json({ error: 'You must be logged in or provide a valid bidder_id.' }, { status: 400 });
    }

    if (!bid_amount || isNaN(bid_amount) || bid_amount <= 0) {
      return NextResponse.json({ error: 'Valid bid_amount is required.' }, { status: 400 });
    }

    // Insert directly into the BIDS table.
    // Business logic (anti-sniping, dynamic increments, seller self-bidding, auction state)
    // is enforced directly inside CockroachDB via PL/pgSQL triggers.
    await query(
      'INSERT INTO BIDS (auction_id, bidder_id, bid_amount) VALUES ($1, $2, $3);',
      [auction_id, bidder_id, bid_amount]
    );

    // Keep current_highest_bid synchronized (preserves autonomous proxy counter-bids)
    await query(
      'UPDATE AUCTIONS SET current_highest_bid = GREATEST(COALESCE(current_highest_bid, 0), $1) WHERE auction_id = $2;',
      [bid_amount, auction_id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Bid submission error:', error);
    // Extract error.message from the driver and return status 400
    return NextResponse.json(
      { error: error.message || 'An error occurred while placing the bid.', code: error.code },
      { status: 400 }
    );
  }
}
