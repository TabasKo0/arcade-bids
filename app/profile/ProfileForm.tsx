'use client';

import { useActionState, useState } from 'react';
import { updateProfile, deleteAccount } from '@/app/actions/profile';

export default function ProfileForm({ initialUsername, initialEmail }: { initialUsername: string, initialEmail: string }) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-8">
      <form action={formAction as unknown as (payload: FormData) => void} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            defaultValue={initialUsername}
            required
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
          <input
            type="email"
            name="email"
            id="email"
            defaultValue={initialEmail}
            required
            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {state?.error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
            {state.error}
          </div>
        )}
        
        {state?.success && (
          <div className="text-green-600 text-sm bg-green-50 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-800">
            Profile updated successfully.
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
        <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex justify-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:border-red-800 dark:text-red-400 dark:hover:bg-gray-700"
          >
            Delete Account
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-400 mb-4">
              Are you sure you want to delete your account? This action cannot be undone and will anonymize all your data.
            </p>
            <div className="flex space-x-4">
              <form action={async () => { await deleteAccount(); }}>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Yes, Delete My Account
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
