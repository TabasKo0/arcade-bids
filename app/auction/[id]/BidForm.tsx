'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CountdownTimer from '@/app/components/CountdownTimer';

interface BidFormProps {
  auctionId: string | number;
  initialHighestBid: number | string | null;
  startingPrice: number | string;
  initialEndTime: string | Date;
  initialStatus: string;
  reservePrice: number | string | null;
  totalBids?: number;
  bidderId?: string | number | null;
}

export default function BidForm({
  auctionId,
  initialHighestBid,
  startingPrice,
  initialEndTime,
  initialStatus,
  reservePrice,
  totalBids = 0,
  bidderId,
}: BidFormProps) {
  const router = useRouter();

  // Real-time state
  const [currentHighestBid, setCurrentHighestBid] = useState<number>(
    parseFloat(String(initialHighestBid || 0))
  );
  const [currentTotalBids, setCurrentTotalBids] = useState<number>(totalBids);
  const [currentEndTime, setCurrentEndTime] = useState<string | Date>(initialEndTime);
  const [status, setStatus] = useState<string>(initialStatus);

  // UX states
  const [isExtended, setIsExtended] = useState(false);
  const [extendedNotice, setExtendedNotice] = useState(false);
  const [isAuctionClosed, setIsAuctionClosed] = useState(
    initialStatus === 'ENDED' ||
      initialStatus === 'RESERVE_NOT_MET' ||
      new Date(initialEndTime).getTime() <= Date.now()
  );
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<{
    type: 'WON' | 'RESERVE_NOT_MET' | 'ENDED' | 'NO_BIDS';
    winner?: string;
  } | null>(null);

  // Dynamic increment calculation (CockroachDB enforce_minimum_increment logic)
  const calculateRequiredIncrement = (baseBid: number) => {
    if (baseBid < 100) return 1.0;
    if (baseBid < 500) return 5.0;
    if (baseBid < 2500) return 25.0;
    return 100.0;
  };

  const currentBase = currentHighestBid > 0 ? currentHighestBid : parseFloat(String(startingPrice || 0));
  const minIncrement = calculateRequiredIncrement(currentBase);
  const minRequiredBid = currentHighestBid > 0 ? currentHighestBid + minIncrement : currentBase;

  // Form input state
  const [bidAmount, setBidAmount] = useState<string>(minRequiredBid.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSolvencyError, setIsSolvencyError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update bid input default whenever highest bid changes
  useEffect(() => {
    const nextMin = currentHighestBid > 0 ? currentHighestBid + calculateRequiredIncrement(currentHighestBid) : currentBase;
    setBidAmount(nextMin.toFixed(2));
  }, [currentHighestBid, currentBase]);

  const parsedInputBid = parseFloat(bidAmount);
  const isBelowMin = isNaN(parsedInputBid) || parsedInputBid < minRequiredBid;

  // Handle countdown expiration
  const handleCountdownExpire = async () => {
    if (isAuctionClosed) return;

    setIsAuctionClosed(true);
    setIsFinalizing(true);

    // 2-second transition state per Requirement 3
    setTimeout(async () => {
      try {
        const res = await fetch(`/api/auction/${auctionId}`);
        const data = await res.json();

        const highestBid = parseFloat(String(data.current_highest_bid || 0));
        const resPrice = data.reserve_price ? parseFloat(String(data.reserve_price)) : null;

        if (highestBid <= 0 || !data.winning_username) {
          setFinalOutcome({ type: 'NO_BIDS' });
        } else if (resPrice !== null && highestBid < resPrice) {
          setFinalOutcome({ type: 'RESERVE_NOT_MET' });
        } else {
          setFinalOutcome({
            type: 'WON',
            winner: data.winning_username,
          });
        }
      } catch (err) {
        console.error('Settlement fetch error:', err);
      } finally {
        setIsFinalizing(false);
      }
    }, 2000);
  };

  // Submit bid
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBelowMin || isAuctionClosed || isSubmitting) return;

    setErrorMessage(null);
    setIsSolvencyError(false);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          bidder_id: bidderId ?? undefined,
          bid_amount: parsedInputBid,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.code === 'P0005' || (data.error && data.error.includes('Insufficient available points'))) {
          setIsSolvencyError(true);
          setErrorMessage(
            'Insufficient available points. Note: Points tied up as the highest bid in other active auctions cannot be spent here.'
          );
        } else {
          setIsSolvencyError(false);
          setErrorMessage(data.error || 'Failed to place bid.');
        }
      } else {
        setSuccessMessage(`Success! Your bid of $${parsedInputBid.toFixed(2)} has been placed.`);

        // Revalidate auction data to check for anti-sniping extension & highest bid updates
        const refreshRes = await fetch(`/api/auction/${auctionId}`);
        if (refreshRes.ok) {
          const fresh = await refreshRes.json();
          const prevTime = new Date(currentEndTime).getTime();
          const freshTime = new Date(fresh.current_end_time).getTime();

          // Anti-sniping detection: current_end_time increased
          if (freshTime > prevTime) {
            setIsExtended(true);
            setExtendedNotice(true);
          }

          setCurrentHighestBid(parseFloat(String(fresh.current_highest_bid)));
          setCurrentTotalBids(fresh.total_bids);
          setCurrentEndTime(fresh.current_end_time);
          setStatus(fresh.status);
        }

        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'A network error occurred while placing your bid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/80 p-6 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm space-y-6">
      {/* Live Countdown & Anti-Sniping visual display */}
      <div className="border-b border-gray-200 dark:border-gray-600/70 pb-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Time Remaining
        </span>
        <div className="mt-2 flex items-center justify-between flex-wrap gap-3">
          <CountdownTimer
            endTime={currentEndTime}
            onExpire={handleCountdownExpire}
            isExtended={isExtended}
          />
          <div className="text-right">
            <span className="text-xs text-gray-500 dark:text-gray-400 block">Leading Bid</span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              ${currentBase.toFixed(2)}
            </span>
          </div>
        </div>

        {extendedNotice && (
          <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2 animate-fade-in">
            <span className="text-base">⚡</span>
            <span>
              <strong>Anti-Sniping Activated!</strong> A bid in the closing minutes automatically extended this auction by 5 minutes.
            </span>
          </div>
        )}
      </div>

      {/* Expiration Transition State: 2s Spinner */}
      {isFinalizing && (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-800 shadow-xs space-y-3 animate-pulse">
          <div className="w-8 h-8 mx-auto border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white">Finalizing Results...</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Verifying final bid rankings and executing settlement on CockroachDB.
          </p>
        </div>
      )}

      {/* Final Outcome Banners (Requirement 3) */}
      {!isFinalizing && finalOutcome && (
        <div className="space-y-4">
          {finalOutcome.type === 'WON' && (
            <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-md text-center space-y-2">
              <span className="text-3xl block">🏆</span>
              <h4 className="text-lg font-bold tracking-tight">
                Auction Won by {finalOutcome.winner || 'Highest Bidder'}!
              </h4>
              <p className="text-xs text-emerald-100 font-medium">
                Reserve price was satisfied. Proceeding to Escrow settlement.
              </p>
            </div>
          )}

          {finalOutcome.type === 'RESERVE_NOT_MET' && (
            <div className="p-5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-center space-y-1">
              <span className="text-2xl block">🛑</span>
              <h4 className="text-base font-bold">Auction Ended: Reserve Not Met</h4>
              <p className="text-xs text-rose-600 dark:text-rose-400">
                The highest bid did not satisfy the seller's confidential reserve price.
              </p>
            </div>
          )}

          {finalOutcome.type === 'NO_BIDS' && (
            <div className="p-5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-center space-y-1">
              <h4 className="text-base font-bold">Auction Closed</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This auction ended with no bids placed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Active Bidding Form (Hidden if Finalized or Outcome Displayed) */}
      {!isFinalizing && !finalOutcome && (
        <div>
          {/* Solvency Trigger Rejection Toast / Banner (P0005) */}
          {isSolvencyError && (
            <div className="mb-4 flex items-start gap-3.5 p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-2xl text-amber-900 dark:text-amber-200 text-sm shadow-sm animate-shake">
              <div className="w-9 h-9 rounded-xl bg-amber-200/80 dark:bg-amber-900/80 flex items-center justify-center flex-shrink-0 text-amber-800 dark:text-amber-200 text-base font-bold shadow-2xs">
                🛡️
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Solvency Defender Active
                  </p>
                  <span className="text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-900/90 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                    ERRCODE P0005
                  </span>
                </div>
                <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-amber-950 dark:text-amber-100">
                  {errorMessage}
                </p>
                <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                  <span>Need more points for this auction?</span>
                  <Link href="/admin" className="font-bold underline hover:text-amber-950 dark:hover:text-white">
                    Deposit via Admin Mint &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Standard Trigger Rejection Error Banner */}
          {!isSolvencyError && errorMessage && (
            <div className="mb-4 flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm animate-shake">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold text-xs tracking-wider uppercase text-red-800 dark:text-red-200">Bid Error</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 flex items-start gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
              <svg className="w-5 h-5 flex-shrink-0 text-emerald-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-semibold text-xs tracking-wider uppercase text-emerald-800 dark:text-emerald-200">Bid Accepted</p>
                <p className="mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label htmlFor="bidAmount" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Your Bid Amount
                </label>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Min Next: <strong className="text-gray-800 dark:text-gray-200">${minRequiredBid.toFixed(2)}</strong> (+${minIncrement.toFixed(2)})
                </span>
              </div>

              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-base font-bold">$</span>
                </div>
                <input
                  type="number"
                  id="bidAmount"
                  name="bidAmount"
                  step="0.01"
                  min={minRequiredBid}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  disabled={isSubmitting || isAuctionClosed}
                  required
                  className={`block w-full pl-8 pr-12 text-base font-bold border rounded-xl py-3 focus:outline-none transition-all dark:bg-gray-800 dark:text-white ${
                    isBelowMin && !isAuctionClosed
                      ? 'border-amber-400 focus:ring-2 focus:ring-amber-400 text-amber-900 dark:text-amber-200'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500'
                  } ${isAuctionClosed ? 'opacity-60 bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Preventative helper text */}
              {isBelowMin && !isAuctionClosed && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                  <span>ℹ</span> Must be at least ${minRequiredBid.toFixed(2)} (required increment: +${minIncrement.toFixed(2)})
                </p>
              )}
            </div>

            {/* Submit Button with Preventative Lock */}
            <button
              type="submit"
              disabled={isSubmitting || isBelowMin || isAuctionClosed}
              className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-all ${
                isAuctionClosed
                  ? 'bg-gray-500 cursor-not-allowed opacity-75'
                  : isBelowMin
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-md hover:shadow-lg'
              }`}
            >
              {isAuctionClosed ? (
                'Auction Closed'
              ) : isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Placing Bid...
                </span>
              ) : isBelowMin ? (
                `Enter $${minRequiredBid.toFixed(2)} or more`
              ) : (
                `Place Bid of $${parsedInputBid.toFixed(2)}`
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
