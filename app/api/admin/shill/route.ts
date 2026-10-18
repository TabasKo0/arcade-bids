import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Read user_id from secure cookies
    const sessionUserId = request.cookies.get('user_id')?.value || (await getSessionUserId());
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query database to check user's role
    const roleRes = await pool.query('SELECT role FROM USERS WHERE user_id = $1', [sessionUserId]);
    if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    const res = await pool.query(
      'SELECT bid_id, auction_id, bidder_id, seller_id, bidder_ip, seller_ip FROM flagged_shill_bids_v ORDER BY bid_id DESC LIMIT 50'
    );
    return NextResponse.json({
      success: true,
      shill_bids: res.rows,
    });
  } catch (err: any) {
    if (
      err?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      err?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw err;
    }
    console.error('Failed to query flagged_shill_bids_v:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to query shill bids' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Read user_id from secure cookies
    const sessionUserId = request.cookies.get('user_id')?.value || (await getSessionUserId());
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query database to check user's role
    const roleRes = await pool.query('SELECT role FROM USERS WHERE user_id = $1', [sessionUserId]);
    if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    const client = await pool.connect();
    try {
      // Find an active auction with an existing bid
      const aucRes = await client.query(`
        SELECT a.auction_id, b.bid_id, b.bidder_id, i.seller_id
        FROM AUCTIONS a
        JOIN ITEMS i ON a.item_id = i.item_id
        JOIN BIDS b ON a.auction_id = b.auction_id
        WHERE a.status IN ('ACTIVE', 'EXTENDED')
        ORDER BY b.bid_time DESC
        LIMIT 1
      `);

      if (aucRes.rows.length === 0) {
        return NextResponse.json(
          { message: 'No active auctions with bids available to demonstrate shill simulation.' },
          { status: 200 }
        );
      }

      const { bidder_id, seller_id } = aucRes.rows[0];
      const demoIp = '198.51.100.42'; // Suspicious matching IP
      const demoDevice = 'device_fp_suspicious_hash_demo';

      // Insert matching audit logs for both users
      await client.query(`
        INSERT INTO USER_AUDIT_LOGS (user_id, ip_address, device_hash)
        VALUES ($1, $2, $3)
      `, [bidder_id, demoIp, demoDevice]);

      await client.query(`
        INSERT INTO USER_AUDIT_LOGS (user_id, ip_address, device_hash)
        VALUES ($1, $2, $3)
      `, [seller_id, demoIp, demoDevice]);

      // Query refreshed view
      const viewRes = await client.query(
        'SELECT bid_id, auction_id, bidder_id, seller_id, bidder_ip, seller_ip FROM flagged_shill_bids_v ORDER BY bid_id DESC'
      );

      return NextResponse.json({
        success: true,
        message: 'Demo shill bidding telemetry injected successfully.',
        shill_bids: viewRes.rows,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    if (
      err?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      err?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw err;
    }
    console.error('Shill simulation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to simulate shill bid' },
      { status: 500 }
    );
  }
}
