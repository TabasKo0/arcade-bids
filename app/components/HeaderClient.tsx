'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { PixelSprite } from '@/lib/sprites';

export interface HeaderUser {
  user_id: string;
  username: string;
  wallet_balance: number | string;
  locked_points?: number | string;
  role?: string;
}

export default function HeaderClient({ user }: { user: HeaderUser | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="w-full max-w-[1200px] mx-auto hud-in relative">
        {/* Left Side: Brand Logo, Hamburger (mobile) & Desktop Nav */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            id="mobile-menu-btn"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden icon-btn cursor-pointer !w-9 !h-9 flex items-center justify-center"
            title="Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <Link href="/" className="logo flex items-center gap-2.5 no-underline cursor-pointer group">
            <PixelSprite name="bolt" size={24} />
            <span className="font-['Press_Start_2P'] text-[13px] sm:text-[14px] tracking-wide text-white">
              ARCADE<span style={{ color: 'var(--gold)' }}>BID</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-group desktop-only hidden md:flex" aria-label="Desktop navigation">
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
        <div className="flex items-center gap-2 sm:gap-2.5">
          {user ? (
            <>
              {/* Wallet Pill */}
              <Link
                href={user.role === 'ADMIN' ? '/admin' : '/profile'}
                id="header-wallet-pill"
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
                id="header-create-btn"
                className="btn sky sm no-underline hidden sm:inline-flex"
                style={{ height: 34, padding: '0 12px', alignItems: 'center', marginBottom: 0 }}
              >
                + CREATE
              </Link>

              {/* User Profile Badge */}
              <Link href="/profile" id="header-user-badge" className="userchip no-underline" title="View Profile">
                <div className="w-5 h-5 bg-[var(--edge)] text-white flex items-center justify-center font-['Press_Start_2P'] text-[8px]">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[9px] text-[var(--cream)] hidden sm:inline">{user.username}</span>
              </Link>

              {/* Logout Button */}
              <form action={logout} style={{ display: 'inline' }}>
                <button
                  type="submit"
                  id="header-logout-btn"
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

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <nav
            id="mobile-nav-menu"
            aria-label="Mobile navigation"
            className="md:hidden absolute top-[100%] left-0 right-0 bg-[var(--hud)] border-b-4 border-[var(--edge)] p-4 flex flex-col gap-2 z-50 shadow-2xl animate-in slide-in-from-top-2"
          >
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="tab no-underline w-full justify-start"
            >
              <PixelSprite name="gavel" size={14} />
              <span>Market</span>
            </Link>
            {user && (
              <>
                <Link
                  href="/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tab no-underline w-full justify-start text-[var(--skyL)]"
                >
                  <PixelSprite name="bolt" size={14} />
                  <span>+ Create Auction</span>
                </Link>
                <Link
                  href="/my-bids"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tab no-underline w-full justify-start"
                >
                  <PixelSprite name="lens" size={14} />
                  <span>My Bids</span>
                </Link>
                <Link
                  href="/my-auctions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tab no-underline w-full justify-start"
                >
                  <PixelSprite name="chest" size={14} />
                  <span>Auctions</span>
                </Link>
                <Link
                  href="/profile/receipts"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tab no-underline w-full justify-start"
                >
                  <PixelSprite name="receipt" size={14} />
                  <span>Receipts</span>
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="tab no-underline w-full justify-start"
                >
                  <PixelSprite name="player" size={14} />
                  <span>Profile ({user.username})</span>
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="tab admin no-underline w-full justify-start"
                  >
                    <PixelSprite name="shield" size={14} />
                    <span>Admin Panel</span>
                  </Link>
                )}
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
