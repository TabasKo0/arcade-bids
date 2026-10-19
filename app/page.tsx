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
      LIMIT 100
    `);
    initialAuctions = result.rows;
  } catch (error) {
    console.error('Failed to load initial active auctions:', error);
  }

  return (
    <div>
      <AuctionSearch initialAuctions={initialAuctions} />
    </div>
  );
}
