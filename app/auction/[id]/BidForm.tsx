'use client';

import { useActionState } from 'react';
import { placeBid } from '@/app/actions/auction';

export default function BidForm({ auctionId, minNextBid, currentBid }: { auctionId: number, minNextBid: number, currentBid: number }) {
  const [state, formAction, isPending] = useActionState(placeBid, null);

  return (
    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Place a Bid</h3>
      <form action={formAction as unknown as (payload: FormData) => void} className="space-y-4">
        <input type="hidden" name="auctionId" value={auctionId} />
        
        <div>
          <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bid Amount (Min: ${minNextBid.toFixed(2)})
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="bidAmount"
              id="bidAmount"
              step="0.01"
              min={minNextBid}
              defaultValue={minNextBid}
              required
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md py-2 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        {state?.error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Placing bid...' : `Bid $${minNextBid.toFixed(2)} or more`}
        </button>
      </form>
    </div>
  );
}
