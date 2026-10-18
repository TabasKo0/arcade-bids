'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <div className="space-y-8">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Immutable Ledger
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              CockroachDB Receipts
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Purchase History &amp; Receipts
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cryptographic proof of purchase generated atomically upon auction settlement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="px-3.5 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            &larr; My Profile
          </Link>
          <Link
            href="/"
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
          >
            Explore Auctions
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-2xs">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
            Total Completed Purchases
          </span>
          <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
            {receipts.length}
          </span>
          <span className="text-[11px] text-gray-400">Verified transaction receipts</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-2xs">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
            Total Points Settled
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-mono">
            ${totalPointsSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-gray-400">Atomic database transfers</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-2xs">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
            Ledger Guarantee
          </span>
          <span className="text-base font-bold text-gray-900 dark:text-white mt-1.5 flex items-center gap-1.5">
            <span className="text-emerald-500">🔒</span> UUIDv4 Cryptographic
          </span>
          <span className="text-[11px] text-gray-400">Enforced by close_expired_auction</span>
        </div>
      </div>

      {/* Receipts Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/80 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Verified Receipts Table
          </h2>
          <span className="text-xs text-gray-400">
            {receipts.length} recorded entry{receipts.length === 1 ? '' : 'ies'}
          </span>
        </div>

        {receipts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center text-2xl text-gray-400">
              🧾
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              No Purchase Receipts Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
              When you win an auction that satisfies the reserve price, the system automatically generates an atomic receipt and records it here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              Browse Active Auctions &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Receipt ID (UUID)</th>
                  <th scope="col" className="px-6 py-3.5">Purchased Item</th>
                  <th scope="col" className="px-6 py-3.5">Seller</th>
                  <th scope="col" className="px-6 py-3.5">Amount Paid</th>
                  <th scope="col" className="px-6 py-3.5">Timestamp</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
                {receipts.map((r) => {
                  const isCopied = copiedId === r.receipt_id;
                  const formattedDate = new Date(r.issued_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  });

                  return (
                    <tr
                      key={r.receipt_id}
                      className="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      {/* Receipt UUID */}
                      <td className="px-6 py-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-gray-900 dark:text-white select-all text-[11px]"
                            title={r.receipt_id}
                          >
                            {r.receipt_id.slice(0, 18)}...
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(r.receipt_id)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer"
                            title="Copy full UUID"
                          >
                            {isCopied ? (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-sans font-bold">
                                Copied!
                              </span>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Item Title */}
                      <td className="px-6 py-4">
                        <Link
                          href={`/auction/${r.auction_id}`}
                          className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                        >
                          {r.title}
                        </Link>
                        <span className="text-[11px] text-gray-400">
                          Listing #{r.auction_id}
                        </span>
                      </td>

                      {/* Seller */}
                      <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                        {r.seller_username || 'Verified Seller'}
                      </td>

                      {/* Amount Paid */}
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ${parseFloat(String(r.amount_paid)).toFixed(2)} pts
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-[11px]">
                        {formattedDate}
                      </td>

                      {/* Verification Status */}
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Settled
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
