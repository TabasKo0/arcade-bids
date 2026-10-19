import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BidForm from './BidForm';
import ProxyBidForm from './ProxyBidForm';
import SellerPanel from './SellerPanel';
import { PixelSprite, getCategorySprite } from '@/lib/sprites';

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
  let userHighestBid: number | null = null;
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

      const myBidRes = await pool.query(
        `SELECT MAX(bid_amount) AS my_max_bid 
         FROM BIDS 
         WHERE auction_id = $1 AND bidder_id = $2`,
        [auctionId, userId]
      );
      if (myBidRes.rows.length > 0 && myBidRes.rows[0].my_max_bid !== null) {
        userHighestBid = parseFloat(String(myBidRes.rows[0].my_max_bid));
      }
    } catch (e) {
      // Non-blocking
    }
  }

  // Fetch recent bids for the Verified Bid Ledger
  let recentBids: any[] = [];
  try {
    const bidsRes = await pool.query(
      `SELECT b.bid_id, b.bidder_id, u.username, b.bid_amount, b.placed_at
       FROM BIDS b
       JOIN USERS u ON b.bidder_id = u.user_id
       WHERE b.auction_id = $1
       ORDER BY b.bid_amount DESC, b.placed_at DESC
       LIMIT 8`,
      [auctionId]
    );
    recentBids = bidsRes.rows;
  } catch (e) {
    // Non-blocking
  }

  const sprite = getCategorySprite(
    undefined,
    auction.title,
    auction.description
  );

  return (
    <div className="space-y-5">
      {/* Back to marketplace */}
      <div>
        <Link href="/" className="back no-underline inline-block">
          « Back to Marketplace
        </Link>
      </div>

      {/* Top Level Item Header Panel */}
      <section className="panel pad">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Listing #{auction.auction_id}</span>
            {isSeller && <span className="tag gold">Your Listing</span>}
            {userHighestBid !== null && (
              <span
                className={`tag ${
                  userHighestBid >= parseFloat(String(currentBid)) ? 'lime' : 'rose'
                }`}
                title={
                  userHighestBid >= parseFloat(String(currentBid))
                    ? 'You currently hold the highest bid'
                    : 'Another bidder has surpassed your bid'
                }
              >
                {userHighestBid >= parseFloat(String(currentBid)) ? '👑 ' : '⚠️ '}
                YOUR BID: ${userHighestBid.toFixed(2)} ({userHighestBid >= parseFloat(String(currentBid)) ? 'WINNING' : 'OUTBID'})
              </span>
            )}
          </div>
          <span
            className={`tag ${
              auction.status === 'ACTIVE'
                ? 'lime'
                : auction.status === 'EXTENDED'
                ? 'gold'
                : 'dark'
            }`}
          >
            {auction.status}
          </span>
        </div>

        <h1 className="h1" style={{ margin: '8px 0 6px', fontSize: 24 }}>
          {auction.title}
        </h1>
        <p className="text-[var(--dim)] text-xs">
          Sold by <b className="text-[var(--cream)]">{auction.seller_username}</b>
        </p>
      </section>

      {/* 2-Column Responsive UX Layout */}
      {/* 2-Column Responsive UX Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Dossier, Specs & Ledger */}
        <div className="lg:col-span-7 space-y-6">
          {/* 3D Voxel / Asset Stage (Hidden behind comments per user instruction; uncomment when ready)
          <section className="panel stage big">
            <div className="vox-sway">
              <PixelSprite name={sprite} size={150} />
            </div>
            <span className="hint">DISTRIBUTED ASSET PREVIEW</span>
          </section>
          */}

          {/* Description Panel */}
          <section className="panel pad">
            <h2 className="h3">Item Description</h2>
            <p className="desc-l text-[var(--cream)] leading-relaxed">
              {auction.description || 'No detailed description provided for this lot.'}
            </p>
          </section>

          {/* Specs & Rules Overview */}
          <section className="panel pad">
            <h2 className="h3">Auction Terms &amp; Protocol</h2>
            <dl className="kv">
              <div>
                <dt>Starting Price</dt>
                <dd>${parseFloat(String(auction.starting_price)).toFixed(2)} PTS</dd>
              </div>
              <div>
                <dt>Current Highest Bid</dt>
                <dd className="big">${parseFloat(String(currentBid)).toFixed(2)} PTS</dd>
              </div>
              <div>
                <dt>Verified Bids</dt>
                <dd>{auction.total_bids} bids</dd>
              </div>
              <div>
                <dt>Reserve Price</dt>
                <dd>
                  {isSeller
                    ? auction.reserve_price
                    ? `$${parseFloat(String(auction.reserve_price)).toFixed(2)} (Private)`
                    : 'None'
                    : auction.reserve_price
                    ? currentBid >= parseFloat(String(auction.reserve_price))
                      ? 'Met'
                      : 'Not Met'
                    : 'None'}
                </dd>
              </div>
              <div>
                <dt>Marketplace Rules</dt>
                <dd>Autonomous trigger-enforced increments</dd>
              </div>
            </dl>
          </section>

          {/* Verified Bid Ledger Panel */}
          <section className="panel pad">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="h3 m-0">Verified Bid Ledger</h2>
              {userHighestBid !== null && (
                <span className="tag lime text-[9px]">
                  YOUR MAX: ${userHighestBid.toFixed(2)} PTS
                </span>
              )}
            </div>
            {recentBids.length === 0 ? (
              <p className="text-xs text-[var(--dim)]">
                No bids placed yet. The first bidder sets the opening price.
              </p>
            ) : (
              <ul className="ledger">
                {recentBids.map((b, idx) => {
                  const isMyBid = userId !== null && String(b.bidder_id) === String(userId);
                  return (
                    <li
                      key={b.bid_id || idx}
                      style={
                        isMyBid
                          ? {
                              borderColor: 'var(--lime)',
                              background: 'rgba(85, 239, 196, 0.08)',
                            }
                          : undefined
                      }
                    >
                      <span className="n">#{recentBids.length - idx}</span>
                      <span className="who">
                        {b.username}
                        {isMyBid && (
                          <span
                            className="tag lime"
                            style={{ fontSize: '8px', padding: '1px 5px', marginLeft: '6px' }}
                          >
                            YOU
                          </span>
                        )}
                        <small>
                          {new Date(b.placed_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </small>
                      </span>
                      <span className={`amt ${isMyBid ? 'text-[var(--lime)] font-bold' : ''}`}>
                        ${parseFloat(String(b.bid_amount)).toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right Column: Active Bidding Deck & Controls */}
        <div className="lg:col-span-5 space-y-6">
          {isSeller ? (
            <SellerPanel
              auctionId={auctionId}
              status={auction.status}
              reservePrice={auction.reserve_price}
              currentHighestBid={auction.current_highest_bid}
              startingPrice={auction.starting_price}
              totalBids={auction.total_bids}
            />
          ) : userId ? (
            <>
              <BidForm
                auctionId={auctionId}
                initialHighestBid={auction.current_highest_bid}
                startingPrice={auction.starting_price}
                initialEndTime={auction.current_end_time}
                initialStatus={auction.status}
                reservePrice={auction.reserve_price}
                totalBids={auction.total_bids}
                bidderId={userId}
                initialUserBid={userHighestBid}
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
            </>
          ) : (
            <section className="panel pad empty">
              <PixelSprite name="player" size={48} />
              <h3 className="font-['Press_Start_2P'] text-sm text-[var(--cream)]">
                Sign In to Place Bids
              </h3>
              <p className="text-xs text-[var(--dim)]">
                Log in to submit live bids and participate in real-time auctions with your wallet points.
              </p>
              <Link href="/login" className="btn lime sm no-underline mt-2">
                Log In to Bid
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
