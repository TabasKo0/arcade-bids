import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const instant = false;

export default async function MyBidsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect('/login');
  }

  const bidsResult = await pool.query(
    `SELECT 
       a.auction_id, i.title, a.current_highest_bid, a.status, a.current_end_time,
       MAX(b.bid_amount) as my_max_bid,
       (MAX(b.bid_amount) >= a.current_highest_bid) as am_i_winning
     FROM BIDS b
     JOIN AUCTIONS a ON b.auction_id = a.auction_id
     JOIN ITEMS i ON a.item_id = i.item_id
     WHERE b.bidder_id = $1
     GROUP BY a.auction_id, i.title, a.current_highest_bid, a.status, a.current_end_time
     ORDER BY a.current_end_time ASC`,
    [userId]
  );
  const bids = bidsResult.rows;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Bids</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track your active bids, winning positions, and past auction outcomes.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Explore Auctions
        </Link>
      </div>

      {bids.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No bids placed yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You haven't bid on any items yet. Find an auction you like and place your first bid!
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Active Auctions
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {bids.map((bid) => {
              const isWinning = Boolean(bid.am_i_winning);
              const isActive = bid.status === 'ACTIVE' || bid.status === 'EXTENDED';
              const isEnded = bid.status === 'ENDED';
              const isCancelled = bid.status === 'CANCELLED';
              const isReserveNotMet = bid.status === 'RESERVE_NOT_MET';

              let badgeText = 'Outbid';
              let badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';

              if (isActive) {
                if (isWinning) {
                  badgeText = 'Winning';
                  badgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
                } else {
                  badgeText = 'Outbid';
                  badgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
                }
              } else if (isEnded) {
                if (isWinning) {
                  badgeText = 'Won';
                  badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
                } else {
                  badgeText = 'Lost';
                  badgeColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
                }
              } else if (isReserveNotMet) {
                badgeText = 'Reserve Not Met';
                badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
              } else if (isCancelled) {
                badgeText = 'Cancelled';
                badgeColor = 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
              }

              return (
                <li key={bid.auction_id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/auction/${bid.auction_id}`}
                          className="text-base font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                        >
                          {bid.title}
                        </Link>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                        <div>
                          Your Highest Bid: <span className="font-semibold text-gray-900 dark:text-white">${bid.my_max_bid}</span>
                        </div>
                        <div>
                          Current Highest: <span className="font-semibold text-gray-900 dark:text-white">${bid.current_highest_bid}</span>
                        </div>
                        <div>
                          Status: <span className="font-medium text-gray-700 dark:text-gray-300">{bid.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      {isActive && !isWinning && (
                        <Link
                          href={`/auction/${bid.auction_id}`}
                          className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Bid Again
                        </Link>
                      )}
                      <Link
                        href={`/auction/${bid.auction_id}`}
                        className="inline-flex items-center px-3.5 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View Auction
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
