'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 shadow-sm p-6 space-y-5 transition-all">
      {/* Header & Toggle Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-200/60 dark:border-indigo-800/60">
            🤖
          </span>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Autonomous Proxy Bidding
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Trigger-Driven
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Autonomous counter-bidding executed natively inside CockroachDB
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
        >
          {isOpen ? 'Minimize' : 'Set Max Auto-Bid'}
        </button>
      </div>

      {/* Active Proxy Badge Display */}
      {activeProxyLimit !== null && (
        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold">
              Active Proxy Limit: ${activeProxyLimit.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Auto-Defense Armed
          </span>
        </div>
      )}

      {isOpen && (
        <div className="space-y-4 pt-1">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
            Enter your ceiling budget. Whenever a competing user bids, CockroachDB's{' '}
            <code>AFTER INSERT</code> trigger immediately submits the minimum required increment for you up to your ceiling.
          </p>

          {/* Solvency Error Banner */}
          {isSolvencyError && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-1.5 animate-shake">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <span>🛡️</span>
                <span>Solvency Limit Reached</span>
              </div>
              <p className="font-medium leading-relaxed">{errorMessage}</p>
              <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-[11px]">
                <span>Need to top up your wallet balance?</span>
                <Link href="/admin" className="font-bold underline hover:text-amber-950 dark:hover:text-white">
                  Admin Mint &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* General Error Banner */}
          {!isSolvencyError && errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-medium">
              ⚠ {errorMessage}
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-medium">
              ✓ {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label
                  htmlFor="proxyAmount"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
                >
                  Maximum Proxy Limit ($)
                </label>
                <span className="text-[11px] text-gray-400">
                  Must exceed: <strong className="text-gray-700 dark:text-gray-200">${baseline.toFixed(2)}</strong>
                </span>
              </div>

              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-gray-400 font-bold">$</span>
                </div>
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
                  className="block w-full pl-8 pr-16 py-2.5 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">MAX</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-gray-400">Quick Ceilings:</span>
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
                    className="px-2 py-0.5 text-[11px] font-semibold bg-gray-100 dark:bg-gray-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-gray-700 dark:text-gray-300 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                  >
                    {preset.label} (${preset.val.toFixed(0)})
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isAuctionClosed || parseFloat(maxAmount) <= baseline}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authorizing Proxy Ceiling...
                </>
              ) : activeProxyLimit !== null ? (
                `Update Proxy Limit to $${parseFloat(maxAmount || '0').toFixed(2)}`
              ) : (
                `Set Proxy Limit of $${parseFloat(maxAmount || '0').toFixed(2)}`
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
