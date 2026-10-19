import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PixelSprite, getCategorySprite } from '@/lib/sprites';

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
    <div className="space-y-6">
      {/* Arcade Pagehead */}
      <header className="pagehead flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="eyebrow">SELLER WORKSPACE</div>
          <h1 className="h1">My Auctions</h1>
          <p className="sub">
            Manage your listings, adjust reserve prices, or end and cancel active auctions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/create" className="btn sky no-underline">
            Create New Auction
          </Link>
        </div>
      </header>

      {auctions.length === 0 ? (
        <section className="panel empty-state py-16 px-6 flex flex-col items-center text-center gap-4">
          <PixelSprite name="chest" size={64} />
          <h2 className="text-lg sm:text-xl font-['Press_Start_2P'] text-[var(--cream)] m-0">No Auctions Created Yet</h2>
          <p className="text-[var(--dim)] max-w-lg m-0 text-base leading-relaxed">
            Get started by creating your first listing to sell items on the distributed platform.
          </p>
          <Link href="/create" className="btn sky sm no-underline mt-3">
            Create An Auction
          </Link>
        </section>
      ) : (
        <div className="list">
          {auctions.map((auction) => {
            const currentPrice = auction.current_highest_bid || auction.starting_price;
            const isActive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED';

            let statusTag = 'dark';
            if (isActive) {
              statusTag = 'lime';
            } else if (auction.status === 'ENDED') {
              statusTag = 'gold';
            } else if (auction.status === 'CANCELLED') {
              statusTag = 'rose';
            } else if (auction.status === 'RESERVE_NOT_MET') {
              statusTag = 'dark';
            }

            const sprite = getCategorySprite(undefined, auction.title, auction.description);

            return (
              <article key={auction.auction_id} className="panel lrow manage">
                <div className="thumb">
                  <PixelSprite name={sprite} size={48} />
                </div>
                <div className="info">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      href={`/auction/${auction.auction_id}`}
                      className="text-[var(--cream)] hover:text-[var(--gold)] no-underline"
                    >
                      <h3>{auction.title}</h3>
                    </Link>
                    <span className={`tag ${statusTag}`}>
                      {auction.status}
                    </span>
                  </div>
                  <div className="stats">
                    <span>
                      Current Bid: <b className="m">${parseFloat(String(currentPrice)).toFixed(2)} PTS</b>
                    </span>
                    <span>
                      Starting: <b>${parseFloat(String(auction.starting_price)).toFixed(2)}</b>
                    </span>
                    <span>
                      Reserve: <b>{auction.reserve_price ? `$${parseFloat(String(auction.reserve_price)).toFixed(2)}` : 'None'}</b>
                    </span>
                    <span>
                      Bids: <b>{auction.total_bids}</b>
                    </span>
                    {isActive && auction.seconds_remaining > 0 && (
                      <span>
                        Time Left: <b className="hot">{Math.floor(auction.seconds_remaining / 3600)}h {Math.floor((auction.seconds_remaining % 3600) / 60)}m</b>
                      </span>
                    )}
                  </div>
                </div>

                <div className="actions">
                  <Link
                    href={`/auction/${auction.auction_id}`}
                    className="btn ghost sm no-underline"
                  >
                    Manage Auction &rarr;
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
