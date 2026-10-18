import { query } from '@/lib/db';
import AuctionSearch from './components/AuctionSearch';

export const instant = false;

export default async function Home() {
  let initialAuctions = [];
  try {
    const result = await query(`
      SELECT auction_id, title, description, seller_username, starting_price, current_highest_bid, total_bids, seconds_remaining
      FROM active_auctions_v
      ORDER BY seconds_remaining ASC
    `);
    initialAuctions = result.rows;
  } catch (error) {
    console.error('Failed to load initial active auctions:', error);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <span className="text-xs font-semibold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
            Real-Time Marketplace
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            Live Auctions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Discover and bid on real-time listings with intelligent search and instant settlement.
          </p>
        </div>
      </div>

      <AuctionSearch initialAuctions={initialAuctions} />
    </div>
  );
}
