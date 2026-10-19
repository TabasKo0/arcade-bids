'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PixelSprite } from '@/lib/sprites';

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
    <div className="space-y-8">
      {/* Arcade Pagehead */}
      <header className="pagehead flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-2">
            <span className="tag violet" style={{ padding: '8px 10px 7px' }}>
              Demo Operations
            </span>
            <span className="ok flex items-center text-xs">
              <i className="dot"></i>CockroachDB Live
            </span>
          </div>
          <h1 className="h1">Admin Control Panel</h1>
          <p className="sub">
            Simulate liquidity minting and inspect real-time shill bidding fraud detection.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/backfill" className="btn ghost sm no-underline">
            Vector Backfill &rarr;
          </Link>
          <Link href="/" className="btn sm no-underline">
            Back to Marketplace
          </Link>
        </div>
      </header>

      <div className="widgets">
        {/* ========================================================================= */}
        {/* WIDGET A: THE MINT (Add Points to User)                                  */}
        {/* ========================================================================= */}
        <section className="panel hot pad">
          <div className="whead">
            <PixelSprite name="coin" size={48} />
            <div className="grow">
              <h2>Widget A: The Mint</h2>
              <p>Credit points directly to any registered user's wallet</p>
            </div>
            <span className="tag lime">Live Liquidity</span>
          </div>

          <form onSubmit={handleMintPoints} className="space-y-4">
            {/* User Dropdown */}
            <div>
              <label htmlFor="user-select" className="lbl">
                Target User Account
              </label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="field"
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
              <div className="balbox">
                <div>
                  <span className="lbl" style={{ margin: '0 0 8px' }}>
                    Current Wallet Balance
                  </span>
                  <div className="money">
                    ${parseFloat(String(selectedUser.wallet_balance)).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="lbl" style={{ margin: '0 0 8px' }}>User Role</span>
                  <span className="tag sky">
                    {selectedUser.role}
                  </span>
                </div>
              </div>
            )}

            {/* Numeric Input */}
            <div>
              <label htmlFor="mint-amount" className="lbl">
                Points to Mint ($ Amount)
              </label>
              <div className="money-in">
                <span>$</span>
                <input
                  type="number"
                  id="mint-amount"
                  min="1"
                  step="0.01"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="5000.00"
                  required
                  className="field"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="presets mt-2.5 mb-4">
                <span className="text-xs text-[var(--dim)] mr-1">Quick Presets:</span>
                {['1000', '5000', '25000', '100000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMintAmount(preset)}
                    className="chipb"
                  >
                    +${Number(preset).toLocaleString('en-US')}
                  </button>
                ))}
              </div>
            </div>

            {/* Mint Feedback */}
            {mintResult && (
              <div
                className={`p-3 text-xs ${
                  mintResult.success
                    ? 'bg-[var(--black)] border-l-4 border-[var(--lime)] text-[var(--limeL)]'
                    : 'err'
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
              className="btn wide mt-4"
            >
              {isMinting ? (
                'Minting Points to CockroachDB...'
              ) : (
                `Mint +$${parseFloat(mintAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })} Points`
              )}
            </button>
          </form>
        </section>

        {/* ========================================================================= */}
        {/* WIDGET B: FRAUD RADAR (The Shill Bidding View)                            */}
        {/* ========================================================================= */}
        <section className="panel rose pad">
          <div className="whead">
            <div className="radar">
              <PixelSprite name="radar" size={96} />
            </div>
            <div className="grow">
              <h2>Widget B: Fraud Radar</h2>
              <p>Real-time shill bidding detection (View: flagged_shill_bids_v)</p>
            </div>
            <button
              onClick={handleRefreshRadar}
              disabled={isRefreshingRadar}
              className="icon-btn"
              title="Refresh Radar Feed"
            >
              {isRefreshingRadar ? 'SCANNING' : 'SCAN'}
            </button>
          </div>

          <div className="explain">
            CockroachDB continuously correlates the <code>USER_AUDIT_LOGS</code> of bidders against listing sellers. If matching IP addresses or device hashes are detected, bids are instantly flagged as suspected shill bidding.
          </div>

          {radarNotice && (
            <div className="p-3 bg-[var(--black)] border-l-4 border-[var(--sky)] text-xs text-[var(--skyL)] mb-3 flex items-center justify-between">
              <span>{radarNotice}</span>
              <button
                onClick={() => setRadarNotice(null)}
                className="font-bold ml-2 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          {/* Clean Data Table (auction_id, bidder_ip, seller_ip) */}
          <div className="tscroll bg-[var(--black)]">
            <table>
              <thead>
                <tr>
                  <th>Auction ID</th>
                  <th>Bidder IP</th>
                  <th>Seller IP</th>
                  <th>Detection</th>
                </tr>
              </thead>
              <tbody>
                {shillBids.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <PixelSprite name="shield" size={48} />
                        <h3 className="font-['Press_Start_2P'] text-xs text-[var(--cream)]">
                          No Shill Bidding Detected
                        </h3>
                        <p className="text-xs text-[var(--dim)] max-w-sm">
                          All active bids currently originate from distinct IP subnets and device signatures.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  shillBids.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <Link
                          href={`/auction/${row.auction_id}`}
                          className="text-[var(--sky)] hover:underline"
                        >
                          #{row.auction_id}
                        </Link>
                      </td>
                      <td className="text-[var(--rose)] font-bold">{row.bidder_ip}</td>
                      <td className="text-[var(--rose)] font-bold">{row.seller_ip}</td>
                      <td>
                        <span className="tag rose">IP MATCH FLAGGED</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Live Demo Trigger Helper */}
          <div className="helper">
            <span>Demonstration Helper:</span>
            <button
              onClick={handleSimulateShill}
              disabled={isSimulatingShill}
              className="linkbtn"
            >
              {isSimulatingShill ? 'Simulating Event...' : 'Inject Demo Shill Bid »'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
