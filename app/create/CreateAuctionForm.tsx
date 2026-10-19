'use client';

import { useActionState, useState, useEffect } from 'react';
import Link from 'next/link';
import { createAuction } from '@/app/actions/auction';
import { PixelSprite, getCategorySprite } from '@/lib/sprites';

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

  // Live preview state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [durationHours, setDurationHours] = useState('24');

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

  const selectedCategoryName =
    categories.find((c) => String(c.category_id) === String(selectedCategoryId))
      ?.category_name || '';

  const sprite = getCategorySprite(selectedCategoryName, title, description);

  return (
    <div className="create">
      {/* Left Column: Form */}
      <section className="panel pad">
        <h1 className="h2" style={{ marginBottom: '24px' }}>
          Create New Listing
        </h1>

        <form action={formAction as unknown as (payload: FormData) => void} className="form">
          <div>
            <label htmlFor="title" className="lbl">
              Item Title
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mechanical Gaming Keyboard"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="description" className="lbl">
              Detailed Description <small>- 384-DIM Vector Embedding</small>
            </label>
            <textarea
              name="description"
              id="description"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, features, and materials. Cosine matching is indexed automatically."
              className="field"
            ></textarea>
          </div>

          <div className="g2">
            <div>
              <label htmlFor="startingPrice" className="lbl">
                Starting Price ($)
              </label>
              <input
                type="number"
                name="startingPrice"
                id="startingPrice"
                step="0.01"
                min="0.01"
                required
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                placeholder="50.00"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="reservePrice" className="lbl">
                Reserve Price ($) <small>- Optional</small>
              </label>
              <input
                type="number"
                name="reservePrice"
                id="reservePrice"
                step="0.01"
                min="0"
                placeholder="100.00"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="durationHours" className="lbl">
                Duration (Hours)
              </label>
              <input
                type="number"
                name="durationHours"
                id="durationHours"
                min="1"
                max="168"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                required
                className="field"
              />
            </div>

            <div>
              <label htmlFor="categoryId" className="lbl">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                required
                className="field"
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
            <div className="err text-xs">
              <strong className="block uppercase font-['Press_Start_2P']">Creation Error</strong>
              <span>{state.error}</span>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: '14px' }}>
            <Link href="/my-auctions" className="btn ghost sm no-underline">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending || !selectedCategoryId}
              className="btn lime sm"
            >
              {isPending ? 'Publishing...' : 'Publish Auction'}
            </button>
          </div>
        </form>
      </section>

      {/* Right Column: Live Arcade Preview */}
      <aside className="preview">
        <span className="eyebrow" style={{ marginBottom: '14px', display: 'block' }}>
          Live Preview
        </span>
        <article className="panel hot card">
          <div className="card-header">
            <span className="tag lime">PREVIEW</span>
            {selectedCategoryName && (
              <span className="tag sky text-[8px]">{selectedCategoryName}</span>
            )}
          </div>

          {/* 3D Stage with Voxel Sprite (hidden for now)
          <div className="stage">
            {selectedCategoryName && (
              <span className="tag sky absolute top-3 left-3">{selectedCategoryName}</span>
            )}
            <div className="vox-sway">
              <PixelSprite name={sprite} size={110} />
            </div>
          </div>
          */}
          <div className="card-body">
            <h3>{title || 'Your item title'}</h3>
            <p className="desc">
              {description || 'Describe condition, features, and anything a bidder should know.'}
            </p>
            <dl className="kv">
              <div>
                <dt>Opening Bid</dt>
                <dd className="big">
                  ${parseFloat(startingPrice || '0').toFixed(2)} PTS
                </dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd className="hot">{durationHours || 24}h 00m</dd>
              </div>
            </dl>
          </div>
        </article>
      </aside>
    </div>
  );
}
