'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import Link from 'next/link';

export interface AuctionItem {
  auction_id: number;
  item_id?: number;
  title: string;
  description: string;
  seller_username?: string;
  starting_price: number | string;
  current_highest_bid: number | string | null;
  total_bids?: number;
  current_end_time?: string;
  seconds_remaining?: number;
  distance?: number | string | null;
}

export default function AuctionSearch({ initialAuctions = [] }: { initialAuctions?: AuctionItem[] }) {
  const [query, setQuery] = useState('');
  const [auctions, setAuctions] = useState<AuctionItem[]>(initialAuctions);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Unified debounced fetch against /api/search?q={query}
  const fetchSearchResults = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const url = searchQuery.trim()
        ? `/api/search?q=${encodeURIComponent(searchQuery.trim())}`
        : '/api/search';

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Search failed: ${res.statusText}`);
      }

      const data = await res.json();
      const results: AuctionItem[] = Array.isArray(data) ? data : data.results || [];

      startTransition(() => {
        setAuctions(results);
        setHasSearched(Boolean(searchQuery.trim()));
      });
    } catch (err: any) {
      console.error('Failed to search auctions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim() || hasSearched) {
        fetchSearchResults(query);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, fetchSearchResults, hasSearched]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSearchResults(query);
  };

  const handleClear = () => {
    setQuery('');
    fetchSearchResults('');
  };

  return (
    <div className="space-y-8">
      {/* Unified Search Input */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/80 p-4 transition-all">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search auctions, items, or natural descriptions..."
              className="w-full pl-11 pr-24 py-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />

            <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {isLoading && (
                <div className="pr-3 text-blue-500 animate-spin">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 animate-pulse space-y-4"
            >
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-full"></div>
              <div className="h-4 bg-gray-100 dark:bg-gray-700/50 rounded w-2/3"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
            </div>
          ))}
        </div>
      ) : auctions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700/60 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {hasSearched ? 'No matching auctions found' : 'No active auctions right now'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {hasSearched
              ? 'Try using different keywords or clearing your search.'
              : 'Check back soon for new live listings.'}
          </p>
          {hasSearched && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => {
            const currentBid = auction.current_highest_bid || auction.starting_price;
            const distanceNum =
              auction.distance !== undefined && auction.distance !== null
                ? parseFloat(String(auction.distance))
                : null;

            // Subtle, polished badge if distance is highly relevant (< 0.3)
            const isTopMatch = distanceNum !== null && !isNaN(distanceNum) && distanceNum < 0.3;

            return (
              <div
                key={auction.auction_id}
                className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border p-6 flex flex-col justify-between transition-all duration-200 ${
                  isTopMatch
                    ? 'border-emerald-300/80 dark:border-emerald-700/80 ring-1 ring-emerald-500/20'
                    : 'border-gray-100 dark:border-gray-700/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {auction.title}
                    </h2>

                    {/* Subtle relevance badge */}
                    {isTopMatch && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 flex-shrink-0 animate-fade-in shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Top Match
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                    {auction.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Current Bid</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      ${parseFloat(String(currentBid || 0)).toFixed(2)}
                    </span>
                  </div>

                  {auction.seller_username && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Seller</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{auction.seller_username}</span>
                    </div>
                  )}

                  {auction.total_bids !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Total Bids</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{auction.total_bids}</span>
                    </div>
                  )}

                  {auction.seconds_remaining !== undefined && auction.seconds_remaining > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Time Left</span>
                      <span className="font-semibold text-rose-500">
                        {Math.floor(auction.seconds_remaining / 3600)}h {Math.floor((auction.seconds_remaining % 3600) / 60)}m
                      </span>
                    </div>
                  )}

                  <Link
                    href={`/auction/${auction.auction_id}`}
                    className="mt-4 w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all"
                  >
                    View Details &amp; Bid
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
