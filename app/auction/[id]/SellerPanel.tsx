'use client';

import { useState, useTransition } from 'react';
import { updateReservePrice, endAuctionEarly, cancelAuction } from '@/app/actions/seller';

interface SellerPanelProps {
  auctionId: string | number;
  status: string;
  reservePrice: number | null;
  currentHighestBid: number | null;
  startingPrice: number;
  totalBids?: number;
}

export default function SellerPanel({
  auctionId,
  status,
  reservePrice,
  currentHighestBid,
  startingPrice,
  totalBids = 0,
}: SellerPanelProps) {
  const [newReserve, setNewReserve] = useState<string>(
    reservePrice !== null && reservePrice !== undefined ? String(reservePrice) : ''
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isModifiable = status === 'ACTIVE' || status === 'EXTENDED' || status === 'DRAFT';

  const handleUpdateReserve = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newReserve);
    if (isNaN(val) || val < 0) {
      setFeedback({ type: 'error', text: 'Please enter a valid reserve price of $0 or more.' });
      return;
    }

    startTransition(async () => {
      setFeedback(null);
      const res = await updateReservePrice(auctionId, val);
      if (res.error) {
        setFeedback({ type: 'error', text: res.error });
      } else if (res.message) {
        setFeedback({ type: 'success', text: res.message });
      }
    });
  };

  const handleEndEarly = () => {
    const confirmMsg = currentHighestBid
      ? `Are you sure you want to end this auction now and accept the current highest bid of $${currentHighestBid}?`
      : 'No bids have been placed yet. Ending now will mark this auction as completed without a winner. Continue?';

    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      setFeedback(null);
      const res = await endAuctionEarly(auctionId);
      if (res.error) {
        setFeedback({ type: 'error', text: res.error });
      } else if (res.message) {
        setFeedback({ type: 'success', text: res.message });
      }
    });
  };

  const handleCancel = () => {
    if (!window.confirm('Are you sure you want to cancel this auction? This action cannot be undone.')) {
      return;
    }

    startTransition(async () => {
      setFeedback(null);
      const res = await cancelAuction(auctionId);
      if (res.error) {
        setFeedback({ type: 'error', text: res.error });
      } else if (res.message) {
        setFeedback({ type: 'success', text: res.message });
      }
    });
  };

  return (
    <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-amber-200/80 dark:border-amber-800/40">
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Seller Dashboard</h2>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
          Owner Account
        </span>
      </div>

      {/* Seller Dashboard Metrics Widget (Requirement 2) */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white dark:bg-gray-800/90 p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/30 shadow-2xs">
          <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Current Highest Bid</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            ${currentHighestBid ? parseFloat(String(currentHighestBid)).toFixed(2) : parseFloat(String(startingPrice)).toFixed(2)}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {currentHighestBid ? 'Active leading offer' : 'Starting floor'}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800/90 p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/30 shadow-2xs">
          <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Total Bids</span>
          <span className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5 block">
            {totalBids}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Total verified placements
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800/90 p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/30 shadow-2xs">
          <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Starting Price</span>
          <span className="text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5 block">
            ${parseFloat(String(startingPrice)).toFixed(2)}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">Minimum opening</span>
        </div>

        <div className="bg-white dark:bg-gray-800/90 p-4 rounded-xl border border-amber-200/60 dark:border-amber-800/30 shadow-2xs">
          <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Reserve Price</span>
          <span className="text-base font-bold text-amber-700 dark:text-amber-400 mt-0.5 block">
            {reservePrice ? `$${parseFloat(String(reservePrice)).toFixed(2)}` : 'None'}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">Confidential floor</span>
        </div>
      </div>

      <div className="p-3 bg-amber-100/70 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
        <span className="text-base flex-shrink-0 mt-0.5">🔒</span>
        <p className="leading-relaxed">
          <strong>Self-Bidding Prevented:</strong> You are the verified seller of this listing. Bidding is disabled on this account to enforce CockroachDB marketplace integrity.
        </p>
      </div>

      {feedback && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm flex items-start justify-between ${
            feedback.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {!isModifiable && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs">
          This auction is currently <span className="font-semibold">{status}</span>. Management actions can only be executed while an auction is ACTIVE, EXTENDED, or DRAFT.
        </div>
      )}

      <div className="mt-6 space-y-6">
        {/* Action 1: Update Reserve Price */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            1. Update Reserve Price
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Current Reserve: {reservePrice !== null && reservePrice !== undefined ? `$${reservePrice}` : 'None (No reserve)'}
          </p>
          <form onSubmit={handleUpdateReserve} className="mt-3 flex items-center gap-2">
            <div className="relative rounded-md shadow-sm flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newReserve}
                onChange={(e) => setNewReserve(e.target.value)}
                disabled={!isModifiable || isPending}
                placeholder="0.00"
                className="block w-full pl-7 pr-3 py-2 sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={!isModifiable || isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Updating...' : 'Update'}
            </button>
          </form>
        </div>

        {/* Action 2: End Auction Early */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            2. End Auction Early
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Immediately close this auction and finalize the sale with the current highest bidder.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleEndEarly}
              disabled={!isModifiable || isPending}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-emerald-600 text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              End Now &amp; Accept Highest Bid
            </button>
          </div>
        </div>

        {/* Action 3: Cancel Auction */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <label className="block text-sm font-semibold text-red-600 dark:text-red-400">
            3. Cancel Auction
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Withdraw this listing permanently. No winning bid will be declared.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!isModifiable || isPending}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Auction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
