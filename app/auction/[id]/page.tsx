import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { notFound } from 'next/navigation';
import BidForm from './BidForm';
import SellerPanel from './SellerPanel';

export const instant = false;

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auctionId = parseInt(id, 10);
  if (isNaN(auctionId)) {
    notFound();
  }

  const userId = await getSessionUserId();

  const result = await pool.query(
    `SELECT 
       a.auction_id,
       i.item_id,
       i.seller_id,
       i.title,
       i.description,
       u.username AS seller_username,
       a.starting_price,
       a.reserve_price,
       a.current_highest_bid,
       a.total_bids,
       a.status,
       a.current_end_time,
       EXTRACT(EPOCH FROM (a.current_end_time - NOW())) AS seconds_remaining
     FROM AUCTIONS a
     JOIN ITEMS i ON a.item_id = i.item_id
     JOIN USERS u ON i.seller_id = u.user_id
     WHERE a.auction_id = $1`,
    [auctionId]
  );

  if (result.rows.length === 0) {
    notFound();
  }

  const auction = result.rows[0];
  const isSeller = userId !== null && userId === auction.seller_id;
  const currentBid = auction.current_highest_bid || auction.starting_price;
  
  // Calculate minimum increment (matching enforce_minimum_increment logic)
  let minIncrement = 1.00;
  if (currentBid >= 100 && currentBid < 500) minIncrement = 5.00;
  else if (currentBid >= 500 && currentBid < 2500) minIncrement = 25.00;
  else if (currentBid >= 2500) minIncrement = 100.00;

  const minNextBid = parseFloat(currentBid) + minIncrement;
  const isActive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{auction.title}</h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Sold by <span className="font-semibold text-gray-700 dark:text-gray-300">{auction.seller_username}</span>
                {isSeller && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    You are the seller
                  </span>
                )}
              </p>
            </div>
            <div className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full dark:bg-blue-900/40 dark:text-blue-300">
              {auction.status}
            </div>
          </div>
          
          <div className="mt-6 prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
            <p>{auction.description}</p>
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Auction Details</h3>
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Starting Price</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">${auction.starting_price}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Current Highest Bid</dt>
                  <dd className="font-medium text-gray-900 dark:text-white text-xl">${currentBid}</dd>
                </div>
                {isSeller && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Reserve Price (Hidden to bidders)</dt>
                    <dd className="font-medium text-amber-700 dark:text-amber-400">
                      {auction.reserve_price ? `$${auction.reserve_price}` : 'None'}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Total Bids</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{auction.total_bids}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Time Left</dt>
                  <dd className="font-medium text-red-600">
                    {auction.seconds_remaining > 0 
                      ? `${Math.floor(auction.seconds_remaining / 3600)}h ${Math.floor((auction.seconds_remaining % 3600) / 60)}m` 
                      : 'Ended'}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              {/* Conditional Rendering: Seller Management Panel vs Bidder View */}
              {isSeller ? (
                <SellerPanel
                  auctionId={auctionId}
                  status={auction.status}
                  reservePrice={auction.reserve_price}
                  currentHighestBid={auction.current_highest_bid}
                  startingPrice={auction.starting_price}
                />
              ) : (
                /* Bidder View */
                <div>
                  {isActive ? (
                    userId ? (
                      <BidForm 
                        auctionId={auctionId} 
                        minNextBid={minNextBid} 
                        currentBid={currentBid}
                      />
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
                        <p className="text-gray-700 dark:text-gray-300 mb-4">You must be logged in to place a bid.</p>
                        <a href="/login" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                          Log In
                        </a>
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
                      <p className="text-gray-700 dark:text-gray-300 font-semibold">
                        This auction is {auction.status.toLowerCase()}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
