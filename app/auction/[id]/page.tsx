import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BidForm from './BidForm';
import ProxyBidForm from './ProxyBidForm';
import SellerPanel from './SellerPanel';

export const instant = false;

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auctionId = id ? id.trim() : '';
  if (!auctionId) {
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

  let auction = result.rows[0];

  // Lazy settlement: if auction time has expired but status is still ACTIVE/EXTENDED, settle atomically
  if (
    parseFloat(String(auction.seconds_remaining || 0)) <= 0 &&
    (auction.status === 'ACTIVE' || auction.status === 'EXTENDED')
  ) {
    try {
      await pool.query('CALL close_expired_auction($1);', [auctionId]);
      const refreshed = await pool.query(
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
      if (refreshed.rows.length > 0) {
        auction = refreshed.rows[0];
      }
    } catch (settleErr) {
      console.warn('Lazy settlement on page load notice:', settleErr);
    }
  }

  const isSeller = userId !== null && String(userId) === String(auction.seller_id);
  const currentBid = auction.current_highest_bid || auction.starting_price;

  let initialProxyLimit: number | null = null;
  if (userId && !isSeller) {
    try {
      const proxyRes = await pool.query(
        `SELECT COALESCE(max_bid_amount, max_limit) AS proxy_limit 
         FROM PROXY_BIDS 
         WHERE auction_id = $1 AND bidder_id = $2 AND is_active = TRUE`,
        [auctionId, userId]
      );
      if (proxyRes.rows.length > 0) {
        initialProxyLimit = parseFloat(String(proxyRes.rows[0].proxy_limit));
      }
    } catch (e) {
      // Non-blocking
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/80 rounded-2xl overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Listing #{auction.auction_id}
                </span>
                {isSeller && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Your Listing (Seller)
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                {auction.title}
              </h1>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                Sold by <span className="font-semibold text-gray-800 dark:text-gray-200">{auction.seller_username}</span>
              </p>
            </div>

            <div className="flex items-center">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-2xs ${
                  auction.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : auction.status === 'EXTENDED'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {auction.status}
              </span>
            </div>
          </div>

          <div className="mt-6 prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-gray-100 dark:border-gray-700/60 pt-6">
            <p>{auction.description || 'No detailed description provided for this listing.'}</p>
          </div>

          <div className="mt-8 border-t border-gray-100 dark:border-gray-700/60 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Auction Attributes */}
            <div className="space-y-4 bg-gray-50 dark:bg-gray-900/40 p-6 rounded-2xl border border-gray-200 dark:border-gray-700/60">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white pb-3 border-b border-gray-200 dark:border-gray-700">
                Auction Overview
              </h3>
              <dl className="space-y-3.5 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500 dark:text-gray-400">Starting Price</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    ${parseFloat(String(auction.starting_price)).toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500 dark:text-gray-400">Current Highest Bid</dt>
                  <dd className="font-extrabold text-emerald-600 dark:text-emerald-400 text-lg">
                    ${parseFloat(String(currentBid)).toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500 dark:text-gray-400">Verified Bids</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {auction.total_bids} bids
                  </dd>
                </div>
                {isSeller && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500 dark:text-gray-400">Reserve Price (Confidential)</dt>
                    <dd className="font-bold text-amber-600 dark:text-amber-400">
                      {auction.reserve_price ? `$${parseFloat(String(auction.reserve_price)).toFixed(2)}` : 'No reserve'}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700/60 text-xs text-gray-400">
                  <dt>Marketplace Rules</dt>
                  <dd className="font-medium text-gray-600 dark:text-gray-300">Trigger-enforced increments</dd>
                </div>
              </dl>
            </div>

            {/* Right Column: Preventative Bidding Arena OR Seller Dashboard */}
            <div>
              {isSeller ? (
                /* Seller Dashboard Widget: Self-bidding locked */
                <SellerPanel
                  auctionId={auctionId}
                  status={auction.status}
                  reservePrice={auction.reserve_price}
                  currentHighestBid={auction.current_highest_bid}
                  startingPrice={auction.starting_price}
                  totalBids={auction.total_bids}
                />
              ) : userId ? (
                /* Preventative Bidder Form & Proxy Bidding Arena */
                <div className="space-y-6">
                  <BidForm
                    auctionId={auctionId}
                    initialHighestBid={auction.current_highest_bid}
                    startingPrice={auction.starting_price}
                    initialEndTime={auction.current_end_time}
                    initialStatus={auction.status}
                    reservePrice={auction.reserve_price}
                    totalBids={auction.total_bids}
                    bidderId={userId}
                  />

                  <ProxyBidForm
                    auctionId={auctionId}
                    currentHighestBid={parseFloat(String(auction.current_highest_bid || 0))}
                    startingPrice={parseFloat(String(auction.starting_price || 0))}
                    initialProxyLimit={initialProxyLimit}
                    isAuctionClosed={
                      auction.status === 'ENDED' ||
                      auction.status === 'CANCELLED' ||
                      auction.status === 'RESERVE_NOT_MET'
                    }
                  />
                </div>
              ) : (
                /* Unauthenticated Callout */
                <div className="bg-gray-50 dark:bg-gray-800/90 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Sign In to Place Bids</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Log in to your account to submit live bids and participate in real-time auctions.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all"
                  >
                    Log In to Bid
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
