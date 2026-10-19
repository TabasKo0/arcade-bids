'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PixelSprite } from '@/lib/sprites';

export interface ReceiptItem {
  receipt_id: string;
  auction_id: number | string;
  amount_paid: number | string;
  issued_at: string;
  title: string;
  seller_username?: string;
}

export default function ReceiptsClient({ receipts }: { receipts: ReceiptItem[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const totalPointsSpent = receipts.reduce(
    (sum, r) => sum + parseFloat(String(r.amount_paid || 0)),
    0
  );

  return (
    <div className="space-y-6">
      {/* Arcade Pagehead */}
      <header className="pagehead flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-2">
            <span className="tag lime">Immutable Ledger</span>
            <span className="text-xs text-[var(--dim)]">CockroachDB Receipts</span>
          </div>
          <h1 className="h1">Purchase History &amp; Receipts</h1>
          <p className="sub">
            Cryptographic proof of purchase generated atomically upon auction settlement.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/profile" className="btn ghost sm no-underline">
            &larr; My Profile
          </Link>
          <Link href="/" className="btn sm no-underline">
            Explore Auctions
          </Link>
        </div>
      </header>

      {/* Overview Stats */}
      <div className="stats3">
        <section className="panel stat">
          <span className="lbl" style={{ margin: 0 }}>Total Completed Purchases</span>
          <div className="v">{receipts.length}</div>
          <small>Verified transaction receipts</small>
        </section>

        <section className="panel stat">
          <span className="lbl" style={{ margin: 0 }}>Total Points Settled</span>
          <div className="v g">
            ${totalPointsSpent.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <small>Atomic database transfers</small>
        </section>

        <section className="panel stat">
          <span className="lbl" style={{ margin: 0 }}>Ledger Guarantee</span>
          <div className="v s">
            <PixelSprite name="shield" size={24} />
            <span>UUIDv4 Cryptographic</span>
          </div>
          <small>Enforced by close_expired_auction</small>
        </section>
      </div>

      {/* Receipts Table Panel */}
      <section className="panel">
        <div className="tblhead">
          <h2>Verified Receipts Table</h2>
          <span className="text-xs text-[var(--dim)]">
            {receipts.length} recorded {receipts.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {receipts.length === 0 ? (
          <div className="empty-state py-16 px-6 flex flex-col items-center text-center gap-4">
            <PixelSprite name="receipt" size={64} />
            <h2 className="text-lg sm:text-xl font-['Press_Start_2P'] text-[var(--cream)] m-0">No Purchase Receipts Found</h2>
            <p className="text-[var(--dim)] max-w-lg m-0 text-base leading-relaxed">
              When you win an auction that satisfies the reserve price, CockroachDB automatically generates an atomic receipt and records it here.
            </p>
            <Link href="/" className="btn sky sm no-underline mt-3">
              Browse Active Auctions &rarr;
            </Link>
          </div>
        ) : (
          <div className="tscroll">
            <table>
              <thead>
                <tr>
                  <th>Receipt ID</th>
                  <th>Item Title</th>
                  <th>Seller</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.receipt_id}>
                    <td>
                      <code>
                        {r.receipt_id.slice(0, 8)}…{r.receipt_id.slice(-4)}
                      </code>
                      <button
                        onClick={() => handleCopy(r.receipt_id)}
                        className="copy"
                        title="Copy full UUID"
                      >
                        {copiedId === r.receipt_id ? 'COPIED!' : 'COPY'}
                      </button>
                    </td>
                    <td>{r.title}</td>
                    <td>{r.seller_username || 'Verified Seller'}</td>
                    <td className="n">
                      ${parseFloat(String(r.amount_paid)).toFixed(2)} PTS
                    </td>
                    <td className="text-sm text-[var(--dim)]">
                      {new Date(r.issued_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <span className="tag lime">ACID VERIFIED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
