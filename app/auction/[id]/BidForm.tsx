'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import CountdownTimer from '@/app/components/CountdownTimer';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

  // SWR hook for real-time auction synchronization
  const { data: swrAuctionData, mutate: mutateAuction } = useSWR(
    `/api/auction/${auctionId}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

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
  } | null>(() => {
    if (initialStatus === 'ENDED') {
      return { type: 'WON', winner: 'Highest Bidder' };
    }
    if (initialStatus === 'RESERVE_NOT_MET') {
      return { type: 'RESERVE_NOT_MET' };
    }
    return null;
  });

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

  // Lazy settlement trigger when countdown reaches 00:00:00
  const handleCountdownExpire = async () => {
    if (isAuctionClosed && finalOutcome) return;

    setIsAuctionClosed(true);
    setIsFinalizing(true);

    try {
      // 1. Fire POST request to /api/auction/${auctionId}/settle
      const settleRes = await fetch(`/api/auction/${auctionId}/settle`, {
        method: 'POST',
      });

      if (!settleRes.ok) {
        console.warn('Settlement API response status:', settleRes.status);
      }

      // 2. Execute mutate() call to SWR to re-fetch the auction data
      const fresh = await mutateAuction();
      await mutate(`/api/auction/${auctionId}`);

      // Retain the finalizing arcade state briefly for smooth transition UX
      await new Promise((resolve) => setTimeout(resolve, 800));

      const data = fresh || (await fetch(`/api/auction/${auctionId}`).then((r) => r.json()));
      const highestBid = parseFloat(String(data?.current_highest_bid || 0));
      const resPrice = data?.reserve_price ? parseFloat(String(data.reserve_price)) : null;

      if (data?.status === 'RESERVE_NOT_MET' || (resPrice !== null && highestBid < resPrice)) {
        setFinalOutcome({ type: 'RESERVE_NOT_MET' });
      } else if (highestBid > 0 && data?.winning_username) {
        setFinalOutcome({
          type: 'WON',
          winner: data.winning_username,
        });
      } else {
        setFinalOutcome({ type: 'NO_BIDS' });
      }

      if (data?.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Lazy settlement execution error:', err);
    } finally {
      setIsFinalizing(false);
      router.refresh();
    }
  };

  // Trigger lazy settlement on mount if already past expiration time but not yet settled
  useEffect(() => {
    if (
      (initialStatus === 'ACTIVE' || initialStatus === 'EXTENDED') &&
      new Date(initialEndTime).getTime() <= Date.now() &&
      !finalOutcome
    ) {
      handleCountdownExpire();
    }
  }, []);

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
    <div className="panel hot pad space-y-6">
      {/* Live Countdown & Anti-Sniping visual display */}
      <div className="flex items-end justify-between flex-wrap gap-4 pb-5 border-b-4 border-dotted border-[rgba(184,171,230,0.25)]">
        <div>
          <span className="lbl">Time Remaining</span>
          <div className="mt-2">
            <CountdownTimer
              endTime={currentEndTime}
              onExpire={handleCountdownExpire}
              isExtended={isExtended}
            />
          </div>
        </div>

        <div className="text-right">
          <span className="lbl">Leading Bid</span>
          <div className="money text-2xl sm:text-3xl">
            ${currentBase.toFixed(2)} PTS
          </div>
        </div>
      </div>

      {extendedNotice && (
        <div className="p-3 bg-[var(--black)] border-l-4 border-[var(--gold)] text-[var(--goldL)] text-xs flex items-center gap-2">
          <span>⚡</span>
          <span>
            <strong>Anti-Sniping Activated!</strong> A bid in the closing minutes automatically extended this auction by 5 minutes.
          </span>
        </div>
      )}

      {/* Expiration Transition State: Spinner */}
      {isFinalizing && (
        <div className="p-8 text-center bg-[var(--black)] border border-[var(--sky)] space-y-3 animate-pulse">
          <div className="w-8 h-8 mx-auto border-4 border-[var(--sky)] border-t-transparent rounded-full animate-spin"></div>
          <h4 className="text-sm font-['Press_Start_2P'] text-[var(--cream)]">Finalizing Results...</h4>
          <p className="text-xs text-[var(--dim)]">
            Verifying final bid rankings and executing settlement on CockroachDB.
          </p>
        </div>
      )}

      {/* Final Outcome Banners */}
      {!isFinalizing && finalOutcome && (
        <div className="space-y-4">
          {finalOutcome.type === 'WON' && (
            <div className="panel pad text-center space-y-3 border-2 border-[var(--gold)] bg-[var(--black)]">
              <span className="text-4xl block">🏆</span>
              <div>
                <h4 className="text-base sm:text-lg font-['Press_Start_2P'] text-[var(--gold)]">
                  Auction Won by {finalOutcome.winner || 'Highest Bidder'}!
                </h4>
                <p className="text-xs text-[var(--limeL)] mt-1">
                  Reserve price was satisfied. Point settlement completed and held in Escrow.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
                <Link
                  href="/profile/receipts"
                  className="btn sm no-underline"
                >
                  🧾 View Payment Receipt
                </Link>
                <Link
                  href="/my-bids"
                  className="btn ghost sm no-underline"
                >
                  🔒 Escrow Protected
                </Link>
              </div>
            </div>
          )}

          {finalOutcome.type === 'RESERVE_NOT_MET' && (
            <div className="panel pad border-2 border-[var(--rose)] text-center space-y-2 bg-[var(--black)]">
              <span className="text-2xl block">🛑</span>
              <h4 className="text-sm font-['Press_Start_2P'] text-[var(--rose)]">
                Auction Ended: Reserve Not Met
              </h4>
              <p className="text-xs text-[var(--dim)]">
                The highest bid did not satisfy the seller's confidential reserve price.
              </p>
            </div>
          )}

          {finalOutcome.type === 'NO_BIDS' && (
            <div className="panel pad text-center space-y-2 bg-[var(--black)]">
              <h4 className="text-sm font-['Press_Start_2P'] text-[var(--cream)]">
                Auction Closed
              </h4>
              <p className="text-xs text-[var(--dim)]">
                This auction ended with no bids placed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Active Bidding Form */}
      {!isFinalizing && !finalOutcome && (
        <div className="bidform">
          {/* Solvency Trigger Rejection Toast / Banner (P0005) */}
          {isSolvencyError && (
            <div className="mb-4 p-4 bg-[var(--black)] border-l-8 border-[var(--gold)] text-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-['Press_Start_2P'] text-[10px] text-[var(--gold)]">
                  SOLVENCY DEFENDER ACTIVE
                </span>
                <span className="tag gold">ERRCODE P0005</span>
              </div>
              <p className="text-xs text-[var(--cream)] leading-relaxed">
                {errorMessage}
              </p>
              <div className="pt-2 border-t border-[rgba(184,171,230,0.2)] flex items-center justify-between text-xs">
                <span className="text-[var(--dim)]">Need more points?</span>
                <Link href="/admin" className="text-[var(--gold)] underline hover:text-white">
                  Deposit via Admin Mint &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Standard Trigger Rejection Error Banner */}
          {!isSolvencyError && errorMessage && (
            <div className="err mb-4">
              <strong className="block text-xs uppercase font-['Press_Start_2P']">Bid Error</strong>
              <span className="text-xs">{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-3 bg-[var(--black)] border-l-8 border-[var(--lime)] text-xs text-[var(--limeL)]">
              <strong className="block font-['Press_Start_2P'] text-[10px]">Bid Accepted</strong>
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="bidtop mb-2">
                <label htmlFor="bidAmount" className="lbl" style={{ margin: 0 }}>
                  Your Bid Amount
                </label>
                <span className="min text-xs text-[var(--dim)]">
                  Min Next: <strong className="text-[var(--cream)]">${minRequiredBid.toFixed(2)}</strong> (+${minIncrement.toFixed(2)})
                </span>
              </div>

              <div className="money-in">
                <span>$</span>
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
                  className="field"
                />
              </div>

              {/* Quick Increment Buttons */}
              {!isAuctionClosed && (
                <div className="quick mt-3 flex gap-2 flex-wrap">
                  {[minIncrement, minIncrement * 2, minIncrement * 5, minIncrement * 10].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      className="chipb"
                      onClick={() => setBidAmount((minRequiredBid + inc).toFixed(2))}
                    >
                      +${inc.toFixed(0)}
                    </button>
                  ))}
                </div>
              )}

              {/* Preventative helper text */}
              {isBelowMin && !isAuctionClosed && (
                <p className="text-xs text-[var(--rose)] mt-1.5 font-medium">
                  Must be at least ${minRequiredBid.toFixed(2)} (required increment: +${minIncrement.toFixed(2)})
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isBelowMin || isAuctionClosed}
              className={`btn wide ${
                isAuctionClosed || isBelowMin ? 'ghost' : 'lime'
              }`}
            >
              {isAuctionClosed ? (
                'Auction Closed'
              ) : isSubmitting ? (
                'Placing Bid...'
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
