'use client';

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PixelSprite, getCategorySprite } from '@/lib/sprites';

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
  category?: string;
}

const CATEGORIES = [
  'ALL',
  'Electronics',
  'Gaming',
  'Audio',
  'Sports',
  'Outdoors',
  'Fitness',
  'Collectibles',
];

export default function AuctionSearch({
  initialAuctions = [],
}: {
  initialAuctions?: AuctionItem[];
}) {
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [sortBy, setSortBy] = useState('ending');
  const [auctions, setAuctions] = useState<AuctionItem[]>(initialAuctions);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [, startTransition] = useTransition();

  // Reset pagination whenever search, filter, or page-size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCat, sortBy, pageSize]);

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

  // Client-side filtering & sorting
  const processedAuctions = useMemo(() => {
    let list = [...auctions];

    // Filter by category
    if (selectedCat !== 'ALL') {
      const matchCat = selectedCat.toLowerCase();
      list = list.filter((a) => {
        const text = `${a.title} ${a.description} ${a.category || ''}`.toLowerCase();
        return text.includes(matchCat);
      });
    }

    // Sort
    list.sort((a, b) => {
      const priceA = parseFloat(String(a.current_highest_bid || a.starting_price || 0));
      const priceB = parseFloat(String(b.current_highest_bid || b.starting_price || 0));

      if (sortBy === 'price-lo') return priceA - priceB;
      if (sortBy === 'price-hi') return priceB - priceA;
      if (sortBy === 'bids') return (b.total_bids || 0) - (a.total_bids || 0);
      return (a.seconds_remaining || 0) - (b.seconds_remaining || 0);
    });

    return list;
  }, [auctions, selectedCat, sortBy]);

  const totalItems = processedAuctions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Paginated slice
  const paginatedAuctions = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return processedAuctions.slice(startIdx, startIdx + pageSize);
  }, [processedAuctions, safePage, pageSize]);

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(targetPage);
    if (typeof window !== 'undefined') {
      const gridElement = document.getElementById('auction-marketplace-grid');
      if (gridElement) {
        gridElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Arcade Search Panel */}
      <section className="panel searchbox">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 w-full">
            <div className="flex-none flex items-center justify-center">
              <PixelSprite name="lens" size={26} />
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search auctions or natural descriptions (e.g. 'wireless headphones')..."
              className="field flex-1 min-w-0 !m-0"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="btn ghost sm flex-none whitespace-nowrap !mb-0"
                title="Clear query"
              >
                CLEAR
              </button>
            )}
            <button type="submit" className="btn sky sm flex-none whitespace-nowrap !mb-0">
              {isLoading ? 'SCANNING...' : 'SEARCH'}
            </button>
          </div>
        </form>

        {/* Filter Chips */}
        <div className="filters">
          <span className="lbl" style={{ margin: '0 4px 0 0', alignSelf: 'center' }}>CATEGORY:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chipb ${selectedCat === cat ? 'active' : ''}`}
              aria-pressed={selectedCat === cat}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results Metadata & Sort Dropdown */}
        <div className="flex items-center justify-between gap-4 flex-wrap mt-4 pt-3.5 border-t border-[rgba(184,171,230,0.15)]">
          <div className="meta" style={{ margin: 0 }}>
            {totalItems} {totalItems === 1 ? 'LISTING' : 'LISTINGS'}
            {totalPages > 1 ? ` · PAGE ${safePage} OF ${totalPages}` : ''}
            {hasSearched ? ` · SEMANTIC MATCH ON "${query.toUpperCase()}"` : ''} ·{' '}
            {auctions.length} LIVE IN DATABASE
          </div>

          <div className="sortwrap" style={{ margin: 0 }}>
            <label htmlFor="sortSelect" className="lbl">
              SORT:
            </label>
            <select
              id="sortSelect"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="field sm"
              style={{ minWidth: 170 }}
            >
              <option value="ending">Ending Soon</option>
              <option value="price-lo">Price: Low to High</option>
              <option value="price-hi">Price: High to Low</option>
              <option value="bids">Most Bids</option>
            </select>
          </div>
        </div>
      </section>

      {/* Grid or Empty State */}
      {isLoading ? (
        <div className="auction-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel card opacity-60 animate-pulse">
              <div className="card-body">
                <div className="h-5 bg-[var(--ink3)] rounded w-3/4 mb-3" />
                <div className="h-4 bg-[var(--ink3)] rounded w-full mb-2" />
                <div className="h-4 bg-[var(--ink3)] rounded w-2/3 mb-6" />
                <div className="h-10 bg-[var(--edge)] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : processedAuctions.length === 0 ? (
        <section className="panel empty-state py-16 px-6 flex flex-col items-center text-center gap-4">
          <PixelSprite name="lens" size={64} />
          <h2 className="text-lg sm:text-xl font-['Press_Start_2P'] text-[var(--cream)] m-0">
            {hasSearched ? 'Nothing Matches That Query' : 'No Active Auctions Right Now'}
          </h2>
          <p className="text-[var(--dim)] max-w-lg m-0 text-base leading-relaxed">
            {hasSearched
              ? 'Try fewer keywords or describe the item naturally. Vector search understands concepts like "outdoor gear" or "mechanical keyboard".'
              : 'New distributed lots are minted frequently. Check back soon or create your own.'}
          </p>
          {hasSearched && (
            <button onClick={handleClear} className="btn sky sm mt-2">
              Clear Search &amp; Show All
            </button>
          )}
        </section>
      ) : (
        <div className="auction-grid" id="auction-marketplace-grid">
          {paginatedAuctions.map((auction) => {
            const currentBid = parseFloat(
              String(auction.current_highest_bid || auction.starting_price || 0)
            );
            const distanceNum =
              auction.distance !== undefined && auction.distance !== null
                ? parseFloat(String(auction.distance))
                : null;
            const isTopMatch =
              distanceNum !== null && !isNaN(distanceNum) && distanceNum < 0.3;
            const sprite = getCategorySprite(
              auction.category,
              auction.title,
              auction.description
            );

            const hours =
              auction.seconds_remaining && auction.seconds_remaining > 0
                ? Math.floor(auction.seconds_remaining / 3600)
                : 0;
            const mins =
              auction.seconds_remaining && auction.seconds_remaining > 0
                ? Math.floor((auction.seconds_remaining % 3600) / 60)
                : 0;

            return (
              <article key={auction.auction_id} className="panel card">
                {/* Status Header */}
                <div className="card-header">
                  <div className="flex items-center gap-2">
                    <span className="tag lime">LIVE</span>
                    {isTopMatch && <span className="tag gold">TOP MATCH</span>}
                  </div>
                  <span className="tag dark text-[8px]">#{auction.auction_id}</span>
                </div>

                {/* Asset / Voxel Stage (Hidden behind comments for future toggle)
                <div className="stage">
                  <span className="tag lime">LIVE</span>
                  {isTopMatch && <span className="tag gold you">TOP MATCH</span>}
                  <div className="vox-sway">
                    <PixelSprite name={sprite} size={110} />
                  </div>
                </div>
                */}

                {/* Card Content */}
                <div className="card-body">
                  <h3>{auction.title}</h3>
                  <p className="desc">{auction.description || 'No description provided.'}</p>

                  <dl className="kv" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                    <div>
                      <dt>CURRENT BID</dt>
                      <dd className="big">{currentBid.toFixed(2)} PTS</dd>
                    </div>

                    {auction.seller_username && (
                      <div>
                        <dt>SELLER</dt>
                        <dd>{auction.seller_username}</dd>
                      </div>
                    )}

                    {auction.total_bids !== undefined && (
                      <div>
                        <dt>BIDS</dt>
                        <dd>{auction.total_bids}</dd>
                      </div>
                    )}

                    {auction.seconds_remaining !== undefined && (
                      <div>
                        <dt>TIME LEFT</dt>
                        <dd className="hot">
                          {auction.seconds_remaining > 0
                            ? `${hours}h ${mins}m`
                            : 'CLOSING'}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <Link
                    href={`/auction/${auction.auction_id}`}
                    className="btn wide no-underline"
                    style={{ marginTop: '16px', marginBottom: '4px' }}
                  >
                    ENTER BIDDING →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Retro Synthwave Pagination Deck */}
      {totalItems > 0 && (
        <nav
          aria-label="Marketplace pagination"
          className="panel pad flex items-center justify-between flex-wrap gap-4 mt-8"
        >
          <div className="text-xs text-[var(--dim)]">
            SHOWING <b className="text-[var(--gold)]">{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalItems)}</b> OF <b className="text-[var(--cream)]">{totalItems}</b> LISTINGS
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => handlePageChange(safePage - 1)}
                className="btn sm ghost"
                title="Previous Page"
              >
                &laquo; PREV
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (totalPages > 7 && pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - safePage) > 1) {
                  if (Math.abs(pageNum - safePage) === 2) {
                    return <span key={pageNum} className="text-xs text-[var(--dim)] px-1">...</span>;
                  }
                  return null;
                }
                const isCurrent = pageNum === safePage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`btn sm ${isCurrent ? 'lime' : 'ghost'}`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => handlePageChange(safePage + 1)}
                className="btn sm ghost"
                title="Next Page"
              >
                NEXT &raquo;
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-[var(--dim)]">
            <span>PER PAGE:</span>
            {[6, 9, 12, 18].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`chipb ${pageSize === size ? 'active' : ''}`}
                style={{ padding: '6px 10px', fontSize: '9px' }}
              >
                {size}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
