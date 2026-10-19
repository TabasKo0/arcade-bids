'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { PixelSprite } from '@/lib/sprites';

interface ProxyBidFormProps {
  auctionId: string | number;
  currentHighestBid: number;
  startingPrice: number;
  initialProxyLimit?: number | null;
  isAuctionClosed?: boolean;
}

export default function ProxyBidForm({
  auctionId,
  currentHighestBid,
  startingPrice,
  initialProxyLimit = null,
  isAuctionClosed = false,
}: ProxyBidFormProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeProxyLimit, setActiveProxyLimit] = useState<number | null>(initialProxyLimit);
  const [liveHighestBid, setLiveHighestBid] = useState<number>(currentHighestBid);

  const baseline = liveHighestBid > 0 ? liveHighestBid : startingPrice;
  const suggestedMin = baseline + (baseline < 100 ? 1 : baseline < 500 ? 5 : baseline < 2500 ? 25 : 100);

  const [maxAmount, setMaxAmount] = useState<string>(
    activeProxyLimit ? activeProxyLimit.toString() : (suggestedMin * 1.5).toFixed(2)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSolvencyError, setIsSolvencyError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live polling for auction status & user active proxy limit (SWR-style interval)
  useEffect(() => {
    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auction/${auctionId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.current_highest_bid !== undefined) {
            setLiveHighestBid(parseFloat(String(data.current_highest_bid || 0)));
          }
          if (data.user_proxy_limit !== undefined) {
            setActiveProxyLimit(data.user_proxy_limit !== null ? parseFloat(String(data.user_proxy_limit)) : null);
          }
        }
      } catch (err) {
        // Non-blocking background poll
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [auctionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(maxAmount);

    if (isNaN(parsedAmount) || parsedAmount <= baseline) {
      setErrorMessage(`Your maximum auto-bid must be greater than $${baseline.toFixed(2)}.`);
      setIsSolvencyError(false);
      return;
    }

    setErrorMessage(null);
    setIsSolvencyError(false);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_id: auctionId,
          max_bid_amount: parsedAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (
          data.error &&
          (data.error.includes('Insufficient points') || data.error.includes('solvency'))
        ) {
          setIsSolvencyError(true);
          setErrorMessage(data.error);
        } else {
          setIsSolvencyError(false);
          setErrorMessage(data.error || 'Failed to configure proxy limit.');
        }
      } else {
        setActiveProxyLimit(parsedAmount);
        setSuccessMessage(`Auto-bid limit of $${parsedAmount.toFixed(2)} activated.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while configuring proxy limit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel violet pad space-y-4">
      {/* Header & Toggle Section */}
      <div className="proxyhead flex items-start gap-3">
        <PixelSprite name="shield" size={36} />
        <div className="grow">
          <h3 className="font-['Press_Start_2P'] text-xs text-[var(--violetL)]">
            Autonomous Proxy Bidding
          </h3>
          <span className="text-xs text-[var(--dim)]">
            Autonomous counter-bidding executed natively inside CockroachDB
          </span>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="tag violet">Trigger-Driven</span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="minbtn"
          >
            {isOpen ? 'Minimize' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Active Proxy Badge Display */}
      {activeProxyLimit !== null && (
        <div className="flex items-center justify-between p-3 bg-[var(--black)] border-l-4 border-[var(--lime)] text-xs">
          <div className="flex items-center gap-2">
            <span className="dot"></span>
            <span className="font-['Press_Start_2P'] text-[10px] text-[var(--limeL)]">
              PROXY CEILING: ${activeProxyLimit.toFixed(2)}
            </span>
          </div>
          <span className="tag lime">ARMED</span>
        </div>
      )}

      {isOpen && (
        <div className="space-y-4 pt-1">
          <p className="text-xs text-[var(--dim)] leading-relaxed bg-[var(--black)] p-3 border-l-4 border-[var(--violet)]">
            Enter your ceiling budget. Whenever a competing user bids, CockroachDB's{' '}
            <code className="text-[var(--violetL)]">AFTER INSERT</code> trigger immediately submits the minimum required increment for you up to your ceiling.
          </p>

          {/* Solvency Error Banner */}
          {isSolvencyError && (
            <div className="err mb-2 text-xs">
              <strong className="block font-['Press_Start_2P'] text-[10px] text-[var(--rose)]">Solvency Limit Reached</strong>
              <p>{errorMessage}</p>
              <div className="pt-2 border-t border-[rgba(255,255,255,0.1)] flex items-center justify-between text-[11px] mt-1">
                <span>Need to top up your balance?</span>
                <Link href="/admin" className="text-[var(--gold)] underline hover:text-white">
                  Admin Mint &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {!isSolvencyError && errorMessage && (
            <div className="err mb-2 text-xs">
              ⚠ {errorMessage}
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-[var(--black)] border-l-8 border-[var(--lime)] text-[var(--limeL)] text-xs font-medium">
              ✓ {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-3.5 border-t border-[rgba(184,171,230,0.2)]">
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <label
                  htmlFor="proxyAmount"
                  className="lbl"
                  style={{ margin: 0 }}
                >
                  Ceiling Budget ($)
                </label>
                <span className="text-xs text-[var(--dim)]">
                  Must exceed: <strong className="text-[var(--cream)]">${baseline.toFixed(2)}</strong>
                </span>
              </div>

              <div className="money-in">
                <span>$</span>
                <input
                  type="number"
                  id="proxyAmount"
                  step="0.01"
                  min={(baseline + 0.01).toFixed(2)}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  disabled={isSubmitting || isAuctionClosed}
                  required
                  placeholder={suggestedMin.toFixed(2)}
                  className="field"
                />
              </div>

              {/* Quick Presets */}
              <div className="mt-2.5 mb-4 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-[var(--dim)] mr-1">Quick Ceilings:</span>
                {[
                  { label: '+$25', val: baseline + 25 },
                  { label: '+$50', val: baseline + 50 },
                  { label: '+$100', val: baseline + 100 },
                  { label: '+50%', val: baseline * 1.5 },
                  { label: '+100%', val: baseline * 2 },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMaxAmount(preset.val.toFixed(2))}
                    disabled={isAuctionClosed}
                    className="chipb"
                  >
                    {preset.label} (${preset.val.toFixed(0)})
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isAuctionClosed || parseFloat(maxAmount) <= baseline}
              className="btn violet wide mt-3"
            >
              {isSubmitting ? (
                'Authorizing Proxy Ceiling...'
              ) : activeProxyLimit !== null ? (
                `Update Proxy Limit to $${parseFloat(maxAmount || '0').toFixed(2)}`
              ) : (
                `Arm Proxy Bidder ($${parseFloat(maxAmount || '0').toFixed(2)})`
              )}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
