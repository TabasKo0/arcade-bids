import Link from 'next/link';
import { getSessionUserId } from '@/lib/auth';
import { logout } from '@/app/actions/auth';
import pool from '@/lib/db';

export default async function Header() {
  const userId = await getSessionUserId();
  let user: {
    user_id: string;
    username: string;
    wallet_balance: number | string;
    locked_points?: number | string;
    role?: string;
  } | null = null;

  if (userId) {
    try {
      const result = await pool.query(
        `SELECT wallet_balance, (SELECT COALESCE(SUM(current_highest_bid), 0) FROM AUCTIONS a JOIN BIDS b ON a.auction_id = b.auction_id WHERE a.status IN ('ACTIVE', 'EXTENDED') AND b.bid_amount = a.current_highest_bid AND b.bidder_id = u.user_id) AS locked_points, user_id, username, role FROM USERS u WHERE user_id = $1`,
        [userId]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } catch (e) {
      console.error('Failed to load user in header:', e);
    }
  }

  const formattedBalance = user
    ? parseFloat(String(user.wallet_balance || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : '0';

  const lockedPoints = user ? parseFloat(String(user.locked_points || 0)) : 0;
  const formattedLocked = lockedPoints.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 shadow-2xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-sm group-hover:scale-105 transition-transform">
                ⚡
              </span>
              <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Auction<span className="text-blue-600 dark:text-blue-400">Hub</span>
              </span>
            </Link>

            {/* Main Nav Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="/"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Marketplace
              </Link>
              {user && (
                <>
                  <Link
                    href="/my-bids"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    My Bids
                  </Link>
                  <Link
                    href="/my-auctions"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    My Auctions
                  </Link>
                  <Link
                    href="/profile/receipts"
                    className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    Receipts
                  </Link>
                  {user.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>🛡️</span> Admin Panel
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Action Section */}
          <div className="flex items-center space-x-3">
            {user ? (
              <>
                {/* 1. Global Point Display Widget */}
                <Link
                  href={user.role === 'ADMIN' ? '/admin' : '/profile'}
                  title={
                    lockedPoints > 0
                      ? `Wallet Balance: ${formattedBalance} PTS | Locked Liabilities: ${formattedLocked} PTS`
                      : `Wallet Balance: ${formattedBalance} PTS`
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/40 dark:to-emerald-950/40 border border-amber-300/80 dark:border-amber-700/60 rounded-full text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                >
                  <span className="text-sm group-hover:scale-110 transition-transform">🪙</span>
                  <span className="font-mono font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">
                    {formattedBalance}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                    PTS
                  </span>
                  {lockedPoints > 0 && (
                    <span className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-[10px] text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 font-semibold font-mono">
                      <span>(🔒</span>
                      <span>{formattedLocked} Locked)</span>
                    </span>
                  )}
                </Link>

                {/* Create Auction Action Button */}
                <Link
                  href="/create"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                >
                  <span>+</span> Create
                </Link>

                {/* Profile Avatar & Username */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="View Profile"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {user.username.charAt(0)}
                  </div>
                  <span className="hidden lg:inline text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {user.username}
                  </span>
                </Link>

                {/* Logout */}
                <form action={logout}>
                  <button
                    type="submit"
                    className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-blue-600 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-xs transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
