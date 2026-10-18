'use client';

import { useActionState, useState, useEffect } from 'react';
import { createAuction } from '@/app/actions/auction';

export interface Category {
  category_id: string | number;
  category_name: string;
}

export default function CreateAuctionForm({
  categories: initialCategories = [],
}: {
  categories?: Category[];
}) {
  const [state, formAction, isPending] = useActionState(createAuction, null);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategories[0] ? String(initialCategories[0].category_id) : ''
  );

  // Fetch categories on mount from /api/categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCategories(data);
            setSelectedCategoryId((prev) => prev || String(data[0].category_id));
          }
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }

    loadCategories();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700 rounded-2xl p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          Create New Listing
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          List your item for auction with CockroachDB vector embeddings and automated settlement.
        </p>
      </div>

      <form action={formAction as unknown as (payload: FormData) => void} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
            Item Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            required
            placeholder="e.g. Vintage Swiss Mechanical Watch"
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3.5 py-2.5 dark:bg-gray-700/80 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
            Detailed Description (Embeddings Generated Automatically)
          </label>
          <textarea
            name="description"
            id="description"
            rows={4}
            required
            placeholder="Describe the condition, features, and materials. Our AI engine generates a 384-dimensional vector embedding for semantic search."
            className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3.5 py-2.5 dark:bg-gray-700/80 dark:text-white leading-relaxed"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startingPrice" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Starting Price ($)
            </label>
            <input
              type="number"
              name="startingPrice"
              id="startingPrice"
              step="0.01"
              min="0.01"
              required
              placeholder="50.00"
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3.5 py-2.5 dark:bg-gray-700/80 dark:text-white font-mono"
            />
          </div>

          <div>
            <label htmlFor="reservePrice" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Reserve Price ($) <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="number"
              name="reservePrice"
              id="reservePrice"
              step="0.01"
              min="0"
              placeholder="100.00"
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3.5 py-2.5 dark:bg-gray-700/80 dark:text-white font-mono"
            />
          </div>

          <div>
            <label htmlFor="durationHours" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Duration (Hours)
            </label>
            <input
              type="number"
              name="durationHours"
              id="durationHours"
              min="1"
              max="168"
              defaultValue="24"
              required
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3.5 py-2.5 dark:bg-gray-700/80 dark:text-white font-mono"
            />
          </div>

          {/* Exact CockroachDB Category Dropdown */}
          <div>
            <label htmlFor="categoryId" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              required
              className="block w-full border border-gray-300 dark:border-gray-600 rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3.5 py-2.5 dark:bg-gray-700 dark:text-white cursor-pointer"
            >
              <option value="" disabled>Select a category...</option>
              {categories.map((c) => (
                <option key={String(c.category_id)} value={String(c.category_id)}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state?.error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-xs uppercase tracking-wider">Creation Error</p>
              <p className="mt-0.5">{state.error}</p>
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !selectedCategoryId}
            className="w-full sm:w-auto inline-flex items-center gap-2 justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing Auction...
              </>
            ) : (
              'Publish Auction'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
