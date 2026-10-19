import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auctionId = id ? id.trim() : '';
    if (!auctionId) {
      return NextResponse.json({ error: 'Invalid auction id' }, { status: 400 });
    }

    // Check if auction is expired in time and should be settled
    const checkSql = `
      SELECT status, current_end_time,
             (current_end_time <= NOW()) AS is_past_end
      FROM AUCTIONS
      WHERE auction_id = $1
    `;
    const checkRes = await query(checkSql, [auctionId]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const { status, is_past_end } = checkRes.rows[0];
    if (is_past_end && (status === 'ACTIVE' || status === 'EXTENDED')) {
      try {
        await query('CALL close_expired_auction($1);', [auctionId]);
      } catch (procErr) {
        console.warn('Procedure close_expired_auction notice:', procErr);
      }
    }

    // Fetch refreshed auction details with winning bidder username
    const auctionSql = `
      SELECT 
         a.auction_id,
         i.item_id,
         i.seller_id,
         i.title,
         i.description,
         u.username AS seller_username,
         a.starting_price,
         a.reserve_price,
         a.current_highest_bid,
         a.total_bids,
         a.status,
         a.current_end_time,
         EXTRACT(EPOCH FROM (a.current_end_time - NOW())) AS seconds_remaining,
         w.winning_username,
         ar.result_id,
         pe.status AS escrow_status,
         pe.amount_held AS escrow_amount_held
      FROM AUCTIONS a
      JOIN ITEMS i ON a.item_id = i.item_id
      JOIN USERS u ON i.seller_id = u.user_id
      LEFT JOIN AUCTION_RESULTS ar ON ar.auction_id = a.auction_id
      LEFT JOIN PAYMENTS_ESCROW pe ON pe.result_id = ar.result_id
      LEFT JOIN LATERAL (
        SELECT bu.username AS winning_username
        FROM BIDS b
        JOIN USERS bu ON b.bidder_id = bu.user_id
        WHERE b.auction_id = a.auction_id
        ORDER BY b.bid_amount DESC, b.bid_time ASC
        LIMIT 1
      ) w ON true
      WHERE a.auction_id = $1
    `;

    const result = await query(auctionSql, [auctionId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    const row = result.rows[0];

    // Fetch caller's active proxy limit if authenticated
    const userId = request.cookies.get('user_id')?.value;
    let userProxyLimit: number | null = null;
    let userHighestBid: number | null = null;
    if (userId) {
      try {
        const proxyRes = await query(
          `SELECT COALESCE(max_bid_amount, max_limit) AS proxy_limit 
           FROM PROXY_BIDS 
           WHERE auction_id = $1 AND bidder_id = $2 AND is_active = TRUE`,
          [auctionId, userId]
        );
        if (proxyRes.rows.length > 0) {
          userProxyLimit = parseFloat(String(proxyRes.rows[0].proxy_limit));
        }

        const myBidRes = await query(
          `SELECT MAX(bid_amount) AS my_max_bid 
           FROM BIDS 
           WHERE auction_id = $1 AND bidder_id = $2`,
          [auctionId, userId]
        );
        if (myBidRes.rows.length > 0 && myBidRes.rows[0].my_max_bid !== null) {
          userHighestBid = parseFloat(String(myBidRes.rows[0].my_max_bid));
        }
      } catch (e) {
        // Non-blocking
      }
    }

    return NextResponse.json({
      ...row,
      user_proxy_limit: userProxyLimit,
      user_highest_bid: userHighestBid,
    });
  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('Auction details API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch auction details' },
      { status: 500 }
    );
  }
}
