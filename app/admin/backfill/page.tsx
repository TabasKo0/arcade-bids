'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminBackfillPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  const handleRunBackfill = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await fetch('/api/embed/backfill', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setResult({
          success: false,
          message: data.error || 'Failed to execute vector embedding backfill.',
        });
      } else {
        setResult({
          success: true,
          count: data.updated_count,
          message:
            data.updated_count > 0
              ? `Successfully generated 384D MiniLM vector embeddings for ${data.updated_count} item(s)!`
              : 'All items already have vector embeddings indexed in CockroachDB.',
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Network error while triggering backfill.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <div className="flex items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Admin Maintenance
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              CockroachDB Vector Embedding Backfill
            </h1>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            &larr; Back to Platform
          </Link>
        </div>

        <div className="mt-6 space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            This administrative utility scans the CockroachDB <code>ITEMS</code> table for any listings where <code>embedding IS NULL</code>, generates 384-dimensional normalized float vectors using <code>@xenova/transformers</code> (model: <code>all-MiniLM-L6-v2</code>), and updates CockroachDB sequentially using the native <code>VECTOR</code> data type.
          </p>

          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-xs space-y-1">
            <p className="font-semibold text-purple-900 dark:text-purple-200">System Architecture Notes:</p>
            <ul className="list-disc list-inside text-purple-800 dark:text-purple-300 space-y-0.5">
              <li>Embedding Dimension: 384 float values (L2-normalized)</li>
              <li>Distance Metric: Cosine Distance (CockroachDB <code>&lt;=&gt;</code> operator)</li>
              <li>Public UI: Standard unified search without manual calculation buttons</li>
            </ul>
          </div>
        </div>

        {result && (
          <div
            className={`mt-6 p-4 rounded-xl text-sm font-medium border ${
              result.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{result.success ? '✓' : '⚠'}</span>
              <span>{result.message}</span>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleRunBackfill}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Vector Embeddings...
              </>
            ) : (
              'Run Vector Backfill Now'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
