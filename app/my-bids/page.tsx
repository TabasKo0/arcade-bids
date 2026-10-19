import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PixelSprite, getCategorySprite } from '@/lib/sprites';

export const instant = false;

export default async function MyBidsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect('/login');
  }

  const bidsResult = await pool.query(
    `SELECT 
       a.auction_id, i.title, i.description, a.current_highest_bid, a.status, a.current_end_time,
       MAX(b.bid_amount) as my_max_bid,
       (MAX(b.bid_amount) >= a.current_highest_bid) as am_i_winning
     FROM BIDS b
     JOIN AUCTIONS a ON b.auction_id = a.auction_id
     JOIN ITEMS i ON a.item_id = i.item_id
     WHERE b.bidder_id = $1
     GROUP BY a.auction_id, i.title, i.description, a.current_highest_bid, a.status, a.current_end_time
     ORDER BY a.current_end_time ASC`,
    [userId]
  );
  const bids = bidsResult.rows;

  return (
    <div className="space-y-6">
      {/* Arcade Pagehead */}
      <header className="pagehead flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="eyebrow">PORTFOLIO TRACKER</div>
          <h1 className="h1">My Bids</h1>
          <p className="sub">
            Track your active bids, winning positions, and past auction outcomes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="btn no-underline">
            Explore Auctions
          </Link>
        </div>
      </header>

      {bids.length === 0 ? (
        <section className="panel empty-state py-16 px-6 flex flex-col items-center text-center gap-4">
          <PixelSprite name="gavel" size={64} />
          <h2 className="text-lg sm:text-xl font-['Press_Start_2P'] text-[var(--cream)] m-0">No Bids Placed Yet</h2>
          <p className="text-[var(--dim)] max-w-lg m-0 text-base leading-relaxed">
            You haven't bid on any items yet. Find an auction you like and place your first bid!
          </p>
          <Link href="/" className="btn sky sm no-underline mt-3">
            Browse Active Auctions
          </Link>
        </section>
      ) : (
        <div className="list">
          {bids.map((bid) => {
            const isWinning = Boolean(bid.am_i_winning);
            const isActive = bid.status === 'ACTIVE' || bid.status === 'EXTENDED';
            const isEnded = bid.status === 'ENDED';
            const isCancelled = bid.status === 'CANCELLED';
            const isReserveNotMet = bid.status === 'RESERVE_NOT_MET';

            let badgeText = 'Outbid';
            let badgeTag = 'rose';

            if (isActive) {
              if (isWinning) {
                badgeText = 'Winning';
                badgeTag = 'lime';
              } else {
                badgeText = 'Outbid';
                badgeTag = 'rose';
              }
            } else if (isEnded) {
              if (isWinning) {
                badgeText = 'Won';
                badgeTag = 'gold';
              } else {
                badgeText = 'Lost';
                badgeTag = 'dark';
              }
            } else if (isReserveNotMet) {
              badgeText = 'Reserve Not Met';
              badgeTag = 'dark';
            } else if (isCancelled) {
              badgeText = 'Cancelled';
              badgeTag = 'rose';
            }

            const sprite = getCategorySprite(undefined, bid.title, bid.description);

            return (
              <article key={bid.auction_id} className="panel lrow">
                <div className="thumb">
                  <PixelSprite name={sprite} size={48} />
                </div>
                <div className="info">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      href={`/auction/${bid.auction_id}`}
                      className="text-[var(--cream)] hover:text-[var(--gold)] no-underline"
                    >
                      <h3>{bid.title}</h3>
                    </Link>
                    <span className={`tag ${badgeTag}`}>
                      {badgeText}
                    </span>
                  </div>
                  <div className="stats">
                    <span>
                      Your Highest Bid: <b className="m">${parseFloat(String(bid.my_max_bid)).toFixed(2)} PTS</b>
                    </span>
                    <span>
                      Current Highest: <b>${parseFloat(String(bid.current_highest_bid)).toFixed(2)} PTS</b>
                    </span>
                    <span>
                      Status: <b>{bid.status}</b>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/auction/${bid.auction_id}`}
                    className="btn ghost sm no-underline"
                  >
                    View Auction
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
