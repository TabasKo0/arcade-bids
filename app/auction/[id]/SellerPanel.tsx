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
    <div className="panel hot pad space-y-5">
      <div className="flex items-center justify-between pb-3 border-b-4 border-dotted border-[rgba(184,171,230,0.25)]">
        <div className="flex items-center gap-2">
          <span className="dot"></span>
          <h2 className="font-['Press_Start_2P'] text-xs text-[var(--gold)]">Seller Dashboard</h2>
        </div>
        <span className="tag gold">Owner Account</span>
      </div>

      {/* Metrics */}
      <dl className="kv">
        <div>
          <dt>Current Highest Bid</dt>
          <dd className="big">
            ${currentHighestBid ? parseFloat(String(currentHighestBid)).toFixed(2) : parseFloat(String(startingPrice)).toFixed(2)} PTS
          </dd>
        </div>
        <div>
          <dt>Total Bids</dt>
          <dd>{totalBids} verified</dd>
        </div>
        <div>
          <dt>Starting Price</dt>
          <dd>${parseFloat(String(startingPrice)).toFixed(2)}</dd>
        </div>
        <div>
          <dt>Reserve Price</dt>
          <dd>{reservePrice ? `$${parseFloat(String(reservePrice)).toFixed(2)}` : 'None'}</dd>
        </div>
      </dl>

      <div className="p-3 bg-[var(--black)] border-l-4 border-[var(--gold)] text-xs text-[var(--dim)] flex items-start gap-2">
        <span>🔒</span>
        <p className="leading-relaxed">
          <strong>Self-Bidding Prevented:</strong> You are the verified seller. Bidding is disabled on this account to enforce CockroachDB marketplace integrity.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs flex items-start justify-between ${
            feedback.type === 'success'
              ? 'bg-[var(--black)] border-l-4 border-[var(--lime)] text-[var(--limeL)]'
              : 'err'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-2 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {!isModifiable && (
        <div className="p-3 bg-[var(--black)] text-[var(--dim)] text-xs border border-[var(--ink3)]">
          This auction is currently <span className="font-bold text-[var(--rose)]">{status}</span>. Actions can only be executed while an auction is ACTIVE or EXTENDED.
        </div>
      )}

      <div className="space-y-4 pt-2">
        {/* Action 1: Update Reserve Price */}
        <div className="bg-[var(--black)] p-4 border border-[var(--ink3)] space-y-2">
          <label className="lbl" style={{ margin: 0 }}>
            1. Update Reserve Price
          </label>
          <p className="text-xs text-[var(--dim)]">
            Current: {reservePrice !== null && reservePrice !== undefined ? `$${reservePrice}` : 'None'}
          </p>
          <form onSubmit={handleUpdateReserve} className="flex items-center gap-2">
            <div className="money-in flex-1">
              <span>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newReserve}
                onChange={(e) => setNewReserve(e.target.value)}
                disabled={!isModifiable || isPending}
                placeholder="0.00"
                className="field sm"
              />
            </div>
            <button
              type="submit"
              disabled={!isModifiable || isPending}
              className="btn sky sm"
            >
              {isPending ? 'Updating...' : 'Save'}
            </button>
          </form>
        </div>

        {/* Action 2: End Auction Early */}
        <div className="bg-[var(--black)] p-4 border border-[var(--ink3)] space-y-2">
          <label className="lbl" style={{ margin: 0 }}>
            2. End Auction Early
          </label>
          <p className="text-xs text-[var(--dim)]">
            Immediately close this auction and finalize sale with the current highest bidder.
          </p>
          <button
            type="button"
            onClick={handleEndEarly}
            disabled={!isModifiable || isPending}
            className="btn lime wide sm mt-3 mb-1"
          >
            End Now &amp; Accept Highest Bid
          </button>
        </div>

        {/* Action 3: Cancel Auction */}
        <div className="bg-[var(--black)] p-4 border border-[var(--ink3)] space-y-2">
          <label className="lbl" style={{ margin: 0, color: 'var(--rose)' }}>
            3. Cancel Auction
          </label>
          <p className="text-xs text-[var(--dim)]">
            Withdraw this listing permanently. No winning bid will be declared.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            disabled={!isModifiable || isPending}
            className="btn rose wide sm mt-3 mb-1"
          >
            Cancel Auction
          </button>
        </div>
      </div>
    </div>
  );
}
