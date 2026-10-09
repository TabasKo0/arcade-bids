'use client';

import { useActionState, useState, useRef, useEffect } from 'react';
import { createAuction } from '@/app/actions/auction';

interface Category {
  category_id: number;
  category_name: string;
}

export default function CreateAuctionForm({ categories }: { categories: Category[] }) {
  const [state, formAction, isPending] = useActionState(createAuction, null);
  
  // Combobox state
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCategories = categories.filter((c) =>
    c.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCategory = categories.find(c => c.category_id === selectedCategoryId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Auction</h1>
      
      <form action={formAction as unknown as (payload: FormData) => void} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
          <input
            type="text"
            name="title"
            id="title"
            required
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            name="description"
            id="description"
            rows={4}
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startingPrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Starting Price ($)</label>
            <input
              type="number"
              name="startingPrice"
              id="startingPrice"
              step="0.01"
              min="0.01"
              required
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="reservePrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reserve Price ($) - Optional</label>
            <input
              type="number"
              name="reservePrice"
              id="reservePrice"
              step="0.01"
              min="0"
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div>
            <label htmlFor="durationHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (Hours)</label>
            <input
              type="number"
              name="durationHours"
              id="durationHours"
              min="1"
              max="168"
              defaultValue="24"
              required
              className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          {/* Searchable Category Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            
            {/* Hidden input to hold the actual selected ID for the form submission */}
            <input type="hidden" name="categoryId" value={selectedCategoryId || ''} required />
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search category..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsOpen(true);
                  // Clear selection if user starts typing something else
                  if (selectedCategory && e.target.value !== selectedCategory.category_name) {
                    setSelectedCategoryId(null);
                  }
                }}
                onFocus={() => setIsOpen(true)}
                className="block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white pr-10"
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>

            {isOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm border border-gray-200 dark:border-gray-700">
                {filteredCategories.length === 0 ? (
                  <div className="cursor-default select-none relative py-2 px-4 text-gray-700 dark:text-gray-300">
                    No categories found.
                  </div>
                ) : (
                  filteredCategories.map((category) => (
                    <div
                      key={category.category_id}
                      onClick={() => {
                        setSelectedCategoryId(category.category_id);
                        setSearchTerm(category.category_name);
                        setIsOpen(false);
                      }}
                      className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-600 hover:text-white ${
                        selectedCategoryId === category.category_id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <span className={`block truncate ${selectedCategoryId === category.category_id ? 'font-semibold' : 'font-normal'}`}>
                        {category.category_name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {state?.error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
            {state.error}
          </div>
        )}

        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !selectedCategoryId}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Auction'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
