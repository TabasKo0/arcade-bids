import Link from 'next/link';
import { getSessionUserId } from '@/lib/auth';
import { logout } from '@/app/actions/auth';
import pool from '@/lib/db';
import { PixelSprite } from '@/lib/sprites';

export default async function Header() {
  const userId = await getSessionUserId();
  let user: {
    user_id: string;
    username: string;
    wallet_balance: number | string;
    locked_points?: number | string;
    role?: string;
  } | null = null;

  if (userId) {
    try {
      const result = await pool.query(
        `SELECT wallet_balance, (SELECT COALESCE(SUM(current_highest_bid), 0) FROM AUCTIONS a JOIN BIDS b ON a.auction_id = b.auction_id WHERE a.status IN ('ACTIVE', 'EXTENDED') AND b.bid_amount = a.current_highest_bid AND b.bidder_id = u.user_id) AS locked_points, user_id, username, role FROM USERS u WHERE user_id = $1`,
        [userId]
      );
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } catch (e) {
      console.error('Failed to load user in header:', e);
    }
  }

  const formattedBalance = user
    ? parseFloat(String(user.wallet_balance || 0)).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : '0';

  const lockedPoints = user ? parseFloat(String(user.locked_points || 0)) : 0;
  const formattedLocked = lockedPoints.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <header className="hud">
      <div className="w-full max-w-[1200px] mx-auto hud-in">
        {/* Left Side: Brand Logo & Navigation */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/" className="logo flex items-center gap-2.5 no-underline cursor-pointer group">
            <PixelSprite name="bolt" size={24} />
            <span className="font-['Press_Start_2P'] text-[14px] tracking-wide text-white">
              ARCADE<span style={{ color: 'var(--gold)' }}>BID</span>
            </span>
          </Link>

          <nav className="nav-group">
            <Link href="/" className="tab no-underline">
              <PixelSprite name="gavel" size={14} />
              <span>Market</span>
            </Link>
            {user && (
              <>
                <Link href="/my-bids" className="tab no-underline">
                  <PixelSprite name="lens" size={14} />
                  <span>My Bids</span>
                </Link>
                <Link href="/my-auctions" className="tab no-underline">
                  <PixelSprite name="chest" size={14} />
                  <span>Auctions</span>
                </Link>
                <Link href="/profile/receipts" className="tab no-underline">
                  <PixelSprite name="receipt" size={14} />
                  <span>Receipts</span>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="tab admin no-underline">
                    <PixelSprite name="shield" size={14} />
                    <span>Admin</span>
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right Side: Wallet, Create, User & Logout */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {user ? (
            <>
              {/* Wallet Pill */}
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/profile'}
                title={
                  lockedPoints > 0
                    ? `Wallet: ${formattedBalance} PTS | Locked: ${formattedLocked} PTS`
                    : `Wallet: ${formattedBalance} PTS`
                }
                className="wallet no-underline cursor-pointer"
              >
                <PixelSprite name="coin" size={16} />
                <span className="text-[8px] text-[var(--goldD)]">PTS</span>
                <span className="text-[11px] text-[var(--gold)]">{formattedBalance}</span>
                {lockedPoints > 0 && (
                  <span className="text-[8px] text-[var(--rose)]" title={`Locked: ${formattedLocked}`}>
                    🔒{formattedLocked}
                  </span>
                )}
              </Link>

              {/* Create Auction Button */}
              <Link
                href="/create"
                className="btn sky sm no-underline"
                style={{ height: 34, padding: '0 12px', display: 'inline-flex', alignItems: 'center', marginBottom: 0 }}
              >
                + CREATE
              </Link>

              {/* User Profile Badge */}
              <Link href="/profile" className="userchip no-underline" title="View Profile">
                <div className="w-5 h-5 bg-[var(--edge)] text-white flex items-center justify-center font-['Press_Start_2P'] text-[8px]">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[9px] text-[var(--cream)]">{user.username}</span>
              </Link>

              {/* Logout Button */}
              <form action={logout} style={{ display: 'inline' }}>
                <button
                  type="submit"
                  className="icon-btn cursor-pointer"
                  title="Sign Out"
                >
                  ✕
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="btn ghost sm no-underline"
                style={{ height: 34, padding: '0 12px', display: 'inline-flex', alignItems: 'center', marginBottom: 0 }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="btn lime sm no-underline"
                style={{ height: 34, padding: '0 12px', display: 'inline-flex', alignItems: 'center', marginBottom: 0 }}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
