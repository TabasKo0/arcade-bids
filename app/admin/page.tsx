import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import pool from '@/lib/db';
import AdminDashboardClient, { AdminUser, ShillBidRow } from './AdminDashboardClient';

export const instant = false;

export default async function AdminPage() {
  // 1. Read user_id from cookies
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    redirect('/login?callbackUrl=/admin');
  }

  // 2. Fetch the user's role from CockroachDB
  let role: string | null = null;
  try {
    const roleRes = await pool.query(
      'SELECT role FROM USERS WHERE user_id = $1',
      [userId]
    );
    if (roleRes.rows.length > 0) {
      role = roleRes.rows[0].role;
    }
  } catch (err) {
    console.error('Failed to verify admin role:', err);
  }

  // 3. SSR Role Enforcement: Kick non-admin users back to home
  if (role !== 'ADMIN') {
    redirect('/');
  }

  // 4. Strictly render admin dashboard data only when role check passes
  let users: AdminUser[] = [];
  let shillBids: ShillBidRow[] = [];

  try {
    const usersRes = await pool.query(
      'SELECT user_id, username, email, role, wallet_balance FROM USERS ORDER BY username ASC'
    );
    users = usersRes.rows.map((row) => ({
      user_id: String(row.user_id),
      username: row.username,
      email: row.email,
      role: row.role,
      wallet_balance: parseFloat(String(row.wallet_balance || 0)),
    }));
  } catch (err) {
    console.error('Failed to load users for admin dashboard:', err);
  }

  try {
    const shillRes = await pool.query(
      'SELECT bid_id, auction_id, bidder_id, seller_id, bidder_ip, seller_ip FROM flagged_shill_bids_v ORDER BY bid_id DESC'
    );
    shillBids = shillRes.rows;
  } catch (err) {
    console.error('Failed to query flagged_shill_bids_v:', err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <AdminDashboardClient initialUsers={users} initialShillBids={shillBids} />
    </div>
  );
}
