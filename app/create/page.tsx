import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreateAuctionForm from './CreateAuctionForm';

export const instant = false;

export default async function CreateAuctionPage() {
  const userId = await getSessionUserId();
  
  if (!userId) {
    redirect('/login');
  }

  const result = await pool.query(
    'SELECT category_id, category_name FROM CATEGORIES ORDER BY category_name ASC'
  );
  
  const categories = result.rows;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <CreateAuctionForm categories={categories} />
    </div>
  );
}
