import pool from '@/lib/db';
import Link from 'next/link';

export const instant = false;

export default async function Home() {
  const result = await pool.query(`
    SELECT auction_id, title, description, seller_username, starting_price, current_highest_bid, total_bids, seconds_remaining
    FROM active_auctions_v
    ORDER BY seconds_remaining ASC
  `);

  const auctions = result.rows;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Active Auctions</h1>
      
      {auctions.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No active auctions at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <div key={auction.auction_id} className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6 flex flex-col">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{auction.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-grow line-clamp-3">{auction.description}</p>
              
              <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Current Bid:</span>
                  <span className="font-medium text-gray-900 dark:text-white">${auction.current_highest_bid || auction.starting_price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Seller:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{auction.seller_username}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Bids:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{auction.total_bids}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Time left:</span>
                  <span className="font-medium text-red-600">
                    {Math.max(0, Math.floor(auction.seconds_remaining / 3600))}h {Math.max(0, Math.floor((auction.seconds_remaining % 3600) / 60))}m
                  </span>
                </div>
              </div>

              <Link
                href={`/auction/${auction.auction_id}`}
                className="mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
