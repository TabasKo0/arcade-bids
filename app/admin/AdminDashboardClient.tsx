'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface AdminUser {
  user_id: string;
  username: string;
  email: string;
  role: string;
  wallet_balance: number | string;
}

export interface ShillBidRow {
  bid_id: string | number;
  auction_id: string | number;
  bidder_id: string | number;
  seller_id: string | number;
  bidder_ip: string;
  seller_ip: string;
}

export default function AdminDashboardClient({
  initialUsers,
  initialShillBids,
}: {
  initialUsers: AdminUser[];
  initialShillBids: ShillBidRow[];
}) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [shillBids, setShillBids] = useState<ShillBidRow[]>(initialShillBids);

  // Widget A (The Mint) State
  const [selectedUserId, setSelectedUserId] = useState<string>(
    initialUsers[0]?.user_id || ''
  );
  const [mintAmount, setMintAmount] = useState<string>('5000');
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Widget B (Fraud Radar) State
  const [isRefreshingRadar, setIsRefreshingRadar] = useState(false);
  const [isSimulatingShill, setIsSimulatingShill] = useState(false);
  const [radarNotice, setRadarNotice] = useState<string | null>(null);

  const selectedUser = users.find((u) => String(u.user_id) === String(selectedUserId));

  // Handle Mint Form Submission
  const handleMintPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !mintAmount) return;

    setIsMinting(true);
    setMintResult(null);

    try {
      const res = await fetch('/api/admin/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          amount: parseFloat(mintAmount),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMintResult({
          success: false,
          message: data.error || 'Failed to mint points.',
        });
      } else {
        setMintResult({
          success: true,
          message: data.message,
        });

        // Update local user balance
        setUsers((prev) =>
          prev.map((u) =>
            String(u.user_id) === String(selectedUserId)
              ? { ...u, wallet_balance: data.user.wallet_balance }
              : u
          )
        );
      }
    } catch (err: any) {
      setMintResult({
        success: false,
        message: err.message || 'Network error while minting funds.',
      });
    } finally {
      setIsMinting(false);
    }
  };

  // Refresh Fraud Radar
  const handleRefreshRadar = async () => {
    setIsRefreshingRadar(true);
    setRadarNotice(null);
    try {
      const res = await fetch('/api/admin/shill');
      if (res.ok) {
        const data = await res.json();
        setShillBids(data.shill_bids || []);
        setRadarNotice('Fraud Radar feed updated successfully.');
      }
    } catch (err) {
      console.error('Failed to refresh radar:', err);
    } finally {
      setIsRefreshingRadar(false);
    }
  };

  // Simulate a Shill Bidding Event for Live Demo
  const handleSimulateShill = async () => {
    setIsSimulatingShill(true);
    setRadarNotice(null);
    try {
      const res = await fetch('/api/admin/shill', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setShillBids(data.shill_bids || []);
        setRadarNotice('⚡ Live Demo Event: Simulated shill bid with matching IP address logged and caught by view!');
      } else {
        setRadarNotice(`Notice: ${data.message || data.error}`);
      }
    } catch (err: any) {
      setRadarNotice(`Simulation notice: ${err.message}`);
    } finally {
      setIsSimulatingShill(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Demo Operations
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              CockroachDB Live
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            Admin Control Panel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Simulate liquidity minting and inspect real-time shill bidding fraud detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/backfill"
            className="px-3.5 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          >
            Vector Backfill &rarr;
          </Link>
          <Link
            href="/"
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ========================================================================= */}
        {/* WIDGET A: THE MINT (Add Points to User)                                  */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold border border-amber-300/40">
                🪙
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Widget A: The Mint
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Credit points directly to any registered user's wallet
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
              Live Liquidity
            </span>
          </div>

          <form onSubmit={handleMintPoints} className="space-y-5">
            {/* User Dropdown */}
            <div>
              <label
                htmlFor="user-select"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Target User Account
              </label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="block w-full py-2.5 px-3.5 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.username} ({u.email}) — Balance: ${parseFloat(String(u.wallet_balance)).toFixed(2)} pts [{u.role}]
                  </option>
                ))}
              </select>
            </div>

            {/* Current Balance Card */}
            {selectedUser && (
              <div className="p-4 bg-gradient-to-r from-gray-50 to-amber-50/40 dark:from-gray-900/50 dark:to-amber-950/20 rounded-2xl border border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                    Current Wallet Balance
                  </span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white font-mono tabular-nums">
                    ${parseFloat(String(selectedUser.wallet_balance)).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">User Role</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    {selectedUser.role}
                  </span>
                </div>
              </div>
            )}

            {/* Numeric Input */}
            <div>
              <label
                htmlFor="mint-amount"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Points to Mint ($ Amount)
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-gray-400 font-bold">$</span>
                </div>
                <input
                  type="number"
                  id="mint-amount"
                  min="1"
                  step="0.01"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="5000.00"
                  required
                  className="block w-full pl-8 pr-16 py-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">PTS</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-medium">Quick Presets:</span>
                {['1000', '5000', '25000', '100000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMintAmount(preset)}
                    className="px-2.5 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    +${Number(preset).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Mint Feedback */}
            {mintResult && (
              <div
                className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border animate-fade-in ${
                  mintResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{mintResult.success ? '✓' : '⚠'}</span>
                  <span>{mintResult.message}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isMinting || !selectedUserId || !mintAmount}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isMinting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Minting Points to CockroachDB...
                </>
              ) : (
                `Mint +$${parseFloat(mintAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} Points`
              )}
            </button>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* WIDGET B: FRAUD RADAR (The Shill Bidding View)                            */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/80 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl font-bold border border-rose-300/40">
                🚨
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Widget B: Fraud Radar
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Real-time shill bidding detection (View: <code>flagged_shill_bids_v</code>)
                </p>
              </div>
            </div>

            <button
              onClick={handleRefreshRadar}
              disabled={isRefreshingRadar}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
              title="Refresh Radar Feed"
            >
              <svg
                className={`w-4 h-4 ${isRefreshingRadar ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-gray-900/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/60">
            <p>
              CockroachDB continuously correlates the <code>USER_AUDIT_LOGS</code> of bidders against listing sellers. If matching IP addresses or device hashes are detected, bids are instantly flagged as suspected shill bidding.
            </p>
          </div>

          {radarNotice && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
              <span>{radarNotice}</span>
              <button
                onClick={() => setRadarNotice(null)}
                className="opacity-70 hover:opacity-100 font-bold ml-2"
              >
                &times;
              </button>
            </div>
          )}

          {/* Clean Data Table (auction_id, bidder_ip, seller_ip) */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Auction ID</th>
                  <th scope="col" className="px-4 py-3">Bidder IP</th>
                  <th scope="col" className="px-4 py-3">Seller IP</th>
                  <th scope="col" className="px-4 py-3 text-right">Detection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800 font-mono">
                {shillBids.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <span className="text-2xl">🛡️</span>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                          No Shill Bidding Detected
                        </p>
                        <p className="text-xs text-gray-400 max-w-sm">
                          All active bids currently originate from distinct IP subnets and device signatures.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  shillBids.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                        <Link
                          href={`/auction/${row.auction_id}`}
                          className="hover:underline text-blue-600 dark:text-blue-400 font-sans"
                        >
                          #{row.auction_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-semibold">
                        {row.bidder_ip}
                      </td>
                      <td className="px-4 py-3 text-rose-600 dark:text-rose-400 font-semibold">
                        {row.seller_ip}
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          IP Match Flagged
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Live Demo Trigger Helper */}
          <div className="pt-2 flex items-center justify-between text-xs text-gray-400">
            <span>Demonstration Helper:</span>
            <button
              onClick={handleSimulateShill}
              disabled={isSimulatingShill}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-50"
            >
              {isSimulatingShill ? 'Simulating Event...' : 'Inject Demo Shill Bid &rarr;'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
