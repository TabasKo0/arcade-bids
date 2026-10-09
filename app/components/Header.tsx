import Link from 'next/link';
import { getSessionUserId } from '@/lib/auth';
import { logout } from '@/app/actions/auth';
import pool from '@/lib/db';

export default async function Header() {
  const userId = await getSessionUserId();
  let user = null;

  if (userId) {
    const result = await pool.query('SELECT username FROM USERS WHERE user_id = $1', [userId]);
    if (result.rows.length > 0) {
      user = result.rows[0];
    }
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-gray-900 dark:text-white">AuctionSystem</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/create" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Create Auction
                </Link>
                <Link href="/profile" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  {user.username}
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-red-600 hover:text-red-800 px-3 py-2 rounded-md text-sm font-medium">
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link href="/signup" className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
