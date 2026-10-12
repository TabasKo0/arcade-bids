import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const instant = false;

export default async function MyAuctionsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect('/login');
  }

  const auctionsResult = await pool.query(
    `SELECT 
       a.auction_id,
       a.starting_price,
       a.reserve_price,
       a.current_highest_bid,
       a.total_bids,
       a.status,
       a.start_time,
       a.current_end_time,
       i.title,
       i.description,
       EXTRACT(EPOCH FROM (a.current_end_time - NOW())) AS seconds_remaining
     FROM AUCTIONS a
     JOIN ITEMS i ON a.item_id = i.item_id
     WHERE i.seller_id = $1
     ORDER BY a.start_time DESC`,
    [userId]
  );
  const auctions = auctionsResult.rows;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Auctions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your listings, adjust reserve prices, or end and cancel active auctions.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create New Auction
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No auctions created yet</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first listing to sell items.
          </p>
          <div className="mt-6">
            <Link
              href="/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Create An Auction
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {auctions.map((auction) => {
              const currentPrice = auction.current_highest_bid || auction.starting_price;
              const isActive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED';

              let statusBadgeColor = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
              if (isActive) {
                statusBadgeColor = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
              } else if (auction.status === 'ENDED') {
                statusBadgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
              } else if (auction.status === 'CANCELLED') {
                statusBadgeColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
              } else if (auction.status === 'RESERVE_NOT_MET') {
                statusBadgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
              }

              return (
                <li key={auction.auction_id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <Link
                    href={`/auction/${auction.auction_id}`}
                    className="block px-6 py-5 focus:outline-none"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">
                            {auction.title}
                          </h2>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadgeColor}`}>
                            {auction.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            Current Bid: <span className="font-semibold text-gray-900 dark:text-white">${currentPrice}</span>
                          </div>
                          <div>
                            Starting: <span className="font-medium text-gray-900 dark:text-white">${auction.starting_price}</span>
                          </div>
                          <div>
                            Reserve:{' '}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {auction.reserve_price ? `$${auction.reserve_price}` : 'None'}
                            </span>
                          </div>
                          <div>
                            Total Bids: <span className="font-medium text-gray-900 dark:text-white">{auction.total_bids}</span>
                          </div>
                          {isActive && auction.seconds_remaining > 0 && (
                            <div>
                              Time Left:{' '}
                              <span className="font-medium text-red-600">
                                {Math.floor(auction.seconds_remaining / 3600)}h {Math.floor((auction.seconds_remaining % 3600) / 60)}m
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="inline-flex items-center px-3.5 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          Manage Auction &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
