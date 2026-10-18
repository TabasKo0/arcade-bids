import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';

export const instant = false;

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  
  if (!userId) {
    redirect('/login');
  }

  const result = await pool.query('SELECT username, email FROM USERS WHERE user_id = $1', [userId]);
  
  if (result.rows.length === 0) {
    // Should not happen unless user deleted but cookie remained
    redirect('/login');
  }

  const user = result.rows[0];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Profile</h1>
        <ProfileForm initialUsername={user.username} initialEmail={user.email} />
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800/80 p-5 rounded-2xl border border-blue-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧾</span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Purchase History &amp; Receipts</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">View cryptographic proof of all your settled auction purchases.</p>
          </div>
        </div>
        <a
          href="/profile/receipts"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          View Receipts &rarr;
        </a>
      </div>
    </div>
  );
}
