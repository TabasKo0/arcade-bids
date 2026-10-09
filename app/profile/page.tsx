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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Profile</h1>
        <ProfileForm initialUsername={user.username} initialEmail={user.email} />
      </div>
    </div>
  );
}
