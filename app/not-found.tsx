import Link from 'next/link';
import { PixelSprite } from '@/lib/sprites';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12">
      <div className="panel pad flex flex-col items-center gap-6 max-w-lg w-full">
        <PixelSprite name="ghost" size={72} />
        <div>
          <span className="tag rose mb-2">ERROR 404 // LOT NOT FOUND</span>
          <h1 className="h1 text-2xl sm:text-3xl mt-2 mb-3 text-[var(--cream)]">
            Sector Uncharted
          </h1>
          <p className="sub text-base text-[var(--dim)] leading-relaxed m-0">
            The auction lot or ledger entry you requested does not exist on CockroachDB cluster or has been purged.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center mt-2">
          <Link href="/" className="btn lime sm no-underline">
            &larr; Return to Marketplace
          </Link>
          <Link href="/my-auctions" className="btn ghost sm no-underline">
            View My Auctions
          </Link>
        </div>
      </div>
    </div>
  );
}
