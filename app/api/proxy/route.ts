import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('user_id')?.value || (await getSessionUserId());
    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('auction_id');

    if (!userId || !auctionId) {
      return NextResponse.json({ active_proxy_limit: null });
    }

    const res = await query(
      `SELECT COALESCE(max_bid_amount, max_limit) AS max_bid_amount
       FROM PROXY_BIDS
       WHERE auction_id = $1 AND bidder_id = $2 AND is_active = TRUE`,
      [auctionId, userId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ active_proxy_limit: null });
    }

    return NextResponse.json({
      active_proxy_limit: parseFloat(String(res.rows[0].max_bid_amount)),
    });
  } catch (error: any) {
    if (
      error?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      error?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. RBAC: Require authentication (cookie user_id)
    const userId = request.cookies.get('user_id')?.value || (await getSessionUserId());
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let auction_id: string = '';
    let max_bid_amount: number = 0;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      auction_id = body.auction_id !== undefined ? String(body.auction_id) : '';
      max_bid_amount = parseFloat(String(body.max_bid_amount));
    } else {
      const formData = await request.formData();
      auction_id = (formData.get('auction_id') as string) || '';
      max_bid_amount = parseFloat((formData.get('max_bid_amount') as string) || '0');
    }

    if (!auction_id || auction_id.trim() === '') {
      return NextResponse.json(
        { error: 'Valid auction_id is required.' },
        { status: 400 }
      );
    }

    if (isNaN(max_bid_amount) || max_bid_amount <= 0) {
      return NextResponse.json(
        { error: 'Valid max_bid_amount greater than 0 is required.' },
        { status: 400 }
      );
    }

    // 2. Validation: Check auction status, ownership, and current_highest_bid
    const aucRes = await query(
      `SELECT a.auction_id, a.current_highest_bid, a.starting_price, a.status, i.seller_id
       FROM AUCTIONS a
       JOIN ITEMS i ON a.item_id = i.item_id
       WHERE a.auction_id = $1`,
      [auction_id]
    );

    if (aucRes.rows.length === 0) {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }

    const auction = aucRes.rows[0];

    // Prevent seller from setting proxy on their own auction
    if (String(auction.seller_id) === String(userId)) {
      return NextResponse.json(
        { error: 'Sellers cannot place or proxy bids on their own auctions.' },
        { status: 400 }
      );
    }

    // Check auction status
    if (auction.status !== 'ACTIVE' && auction.status !== 'EXTENDED') {
      return NextResponse.json(
        { error: 'Cannot set proxy limit on closed or cancelled auction.' },
        { status: 400 }
      );
    }

    // Validate that max_bid_amount is greater than current_highest_bid
    const currentHighest = parseFloat(String(auction.current_highest_bid || 0));
    const startingPrice = parseFloat(String(auction.starting_price || 0));
    const baseline = currentHighest > 0 ? currentHighest : startingPrice;

    if (max_bid_amount <= baseline) {
      return NextResponse.json(
        {
          error: `Proxy limit ($${max_bid_amount.toFixed(2)}) must be greater than current highest bid ($${baseline.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    // 3. Solvency Check: verify wallet_balance - liabilities >= max_bid_amount
    const userRes = await query(
      'SELECT wallet_balance FROM USERS WHERE user_id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const walletBalance = parseFloat(String(userRes.rows[0].wallet_balance || 0));

    // Calculate liabilities on OTHER active auctions where this user holds the highest bid
    const liabRes = await query(
      `SELECT COALESCE(SUM(current_highest_bid), 0) AS liability 
       FROM AUCTIONS 
       WHERE status IN ('ACTIVE', 'EXTENDED') 
         AND auction_id != $1 
         AND current_highest_bid > 0 
         AND auction_id IN (
           SELECT a.auction_id FROM AUCTIONS a 
           JOIN BIDS b ON a.auction_id = b.auction_id 
           WHERE b.bid_amount = a.current_highest_bid AND b.bidder_id = $2 
         )`,
      [auction_id, userId]
    );

    const liability = parseFloat(String(liabRes.rows[0].liability || 0));
    const availablePoints = walletBalance - liability;

    if (availablePoints < max_bid_amount) {
      return NextResponse.json(
        { error: 'Insufficient points to support this proxy limit.' },
        { status: 400 }
      );
    }

    // 4. Execution: Upsert into PROXY_BIDS
    const upsertRes = await query(
      `INSERT INTO PROXY_BIDS (auction_id, bidder_id, max_bid_amount, max_limit, is_active)
       VALUES ($1, $2, $3, $3, TRUE)
       ON CONFLICT (auction_id, bidder_id)
       DO UPDATE SET max_bid_amount = EXCLUDED.max_bid_amount,
                     max_limit = EXCLUDED.max_bid_amount,
                     is_active = TRUE
       RETURNING proxy_id, auction_id, bidder_id, max_bid_amount`,
      [auction_id, userId, max_bid_amount]
    );

    return NextResponse.json({
      success: true,
      message: `Proxy limit of $${max_bid_amount.toFixed(2)} set successfully.`,
      proxy: {
        proxy_id: String(upsertRes.rows[0].proxy_id),
        auction_id: String(upsertRes.rows[0].auction_id),
        bidder_id: String(upsertRes.rows[0].bidder_id),
        max_bid_amount: parseFloat(String(upsertRes.rows[0].max_bid_amount)),
      },
    });
  } catch (error: any) {
    if (
      error?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      error?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw error;
    }
    console.error('Proxy bid API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set proxy limit.' },
      { status: 500 }
    );
  }
}
