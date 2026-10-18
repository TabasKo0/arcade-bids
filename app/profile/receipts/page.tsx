import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReceiptsClient, { ReceiptItem } from './ReceiptsClient';

export const instant = false;

export default async function ReceiptsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect('/login');
  }

  let receipts: ReceiptItem[] = [];

  try {
    const res = await pool.query(
      `SELECT 
         r.receipt_id, 
         r.auction_id,
         r.amount_paid, 
         r.issued_at, 
         i.title,
         u.username AS seller_username
       FROM RECEIPTS r 
       JOIN AUCTIONS a ON r.auction_id = a.auction_id 
       JOIN ITEMS i ON a.item_id = i.item_id 
       LEFT JOIN USERS u ON r.seller_id = u.user_id
       WHERE r.buyer_id = $1 
       ORDER BY r.issued_at DESC`,
      [userId]
    );

    receipts = res.rows.map((row) => ({
      receipt_id: row.receipt_id,
      auction_id: String(row.auction_id),
      amount_paid: parseFloat(String(row.amount_paid || 0)),
      issued_at: row.issued_at ? new Date(row.issued_at).toISOString() : new Date().toISOString(),
      title: row.title,
      seller_username: row.seller_username,
    }));
  } catch (err) {
    console.error('Failed to load receipts:', err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <ReceiptsClient receipts={receipts} />
    </div>
  );
}
