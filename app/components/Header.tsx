import { getSessionUserId } from '@/lib/auth';
import pool from '@/lib/db';
import HeaderClient, { HeaderUser } from './HeaderClient';

export default async function Header() {
  const userId = await getSessionUserId();
  let user: HeaderUser | null = null;

  if (userId) {
    try {
      const result = await pool.query(
        `SELECT wallet_balance, (SELECT COALESCE(SUM(current_highest_bid), 0) FROM AUCTIONS a JOIN BIDS b ON a.auction_id = b.auction_id WHERE a.status IN ('ACTIVE', 'EXTENDED') AND b.bid_amount = a.current_highest_bid AND b.bidder_id = u.user_id) AS locked_points, user_id, username, role FROM USERS u WHERE user_id = $1`,
        [userId]
      );
      if (result.rows.length > 0) {
        user = {
          user_id: String(result.rows[0].user_id),
          username: result.rows[0].username,
          wallet_balance: parseFloat(String(result.rows[0].wallet_balance || 0)),
          locked_points: parseFloat(String(result.rows[0].locked_points || 0)),
          role: result.rows[0].role,
        };
      }
    } catch (e) {
      console.error('Failed to load user in header:', e);
    }
  }

  return <HeaderClient user={user} />;
}
