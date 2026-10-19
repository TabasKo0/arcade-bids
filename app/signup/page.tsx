'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PixelSprite } from '@/lib/sprites';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER' | 'BOTH'>('BOTH');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create account. Please try again.');
        setIsPending(false);
        return;
      }

      // Store in localStorage for client-side persistence and visibility
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('user_id', data.user.user_id);
        localStorage.setItem('username', data.user.username);
      }

      // Full navigation to reload SSR components (such as Header) with session cookies
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'A network error occurred. Please try again.');
      setIsPending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 0',
      }}
    >
      <div className="panel pad lime" style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-block', marginBottom: 12 }}>
            <PixelSprite name="coin" size={48} />
          </div>
          <div className="eyebrow" style={{ color: 'var(--lime)', letterSpacing: '0.12em' }}>
            NEW PLAYER REGISTRATION // +10,000 PTS INITIAL MINT
          </div>
          <h1
            className="h1"
            style={{
              fontSize: 22,
              margin: '10px 0 6px',
              color: 'var(--gold)',
              textShadow: '3px 3px 0 var(--roseD), 6px 6px 0 var(--black)',
            }}
          >
            INITIALIZE PLAYER
          </h1>
          <p className="sub" style={{ fontSize: 20, margin: '0 auto', color: 'var(--dim)' }}>
            Join the distributed auction platform. Every new account is credited with 10,000 PTS wallet balance.
          </p>
        </div>

        {error && (
          <div className="err" style={{ marginBottom: 20 }} role="alert">
            <span style={{ fontFamily: 'var(--f-display)', fontSize: 10, display: 'block', marginBottom: 4 }}>
              [REGISTRATION_FAILED]
            </span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div>
            <label htmlFor="username" className="lbl">
              PLAYER CALLSIGN / USERNAME
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="field"
              placeholder="e.g. cyber_bidder"
            />
          </div>

          <div>
            <label htmlFor="email-address" className="lbl">
              COMM CHANNEL / EMAIL ADDRESS
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field"
              placeholder="player@auctionhub.local"
            />
          </div>

          <div>
            <label htmlFor="password" className="lbl">
              SECURITY KEY (MIN 6 CHARACTERS)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="field"
              placeholder="••••••••••••"
            />
          </div>

          <div>
            <label htmlFor="role" className="lbl">
              CONSOLE ACCESS PRIVILEGES
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="field"
            >
              <option value="BOTH">FULL ACCESS - BUYER &amp; SELLER (BOTH)</option>
              <option value="BUYER">BIDDER ONLY - BUYER</option>
              <option value="SELLER">AUCTIONEER ONLY - SELLER</option>
            </select>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              type="submit"
              disabled={isPending}
              className="btn lime wide"
              style={{ padding: '16px 20px', marginBottom: 4 }}
            >
              {isPending ? (
                <span>INITIALIZING CITIZEN RECORD...</span>
              ) : (
                <>
                  <PixelSprite name="bolt" size={16} />
                  <span>MINT ACCOUNT &amp; CLAIM 10,000 PTS</span>
                </>
              )}
            </button>
          </div>

          <div
            style={{
              textAlign: 'center',
              marginTop: 18,
              paddingTop: 18,
              borderTop: '2px dashed rgba(184, 171, 230, 0.25)',
              fontSize: 18,
            }}
          >
            <span style={{ color: 'var(--dim)' }}>ALREADY HAVE A CREDENTIAL? </span>
            <Link
              href="/login"
              style={{
                color: 'var(--sky)',
                textDecoration: 'underline',
                fontFamily: 'var(--f-display)',
                fontSize: 10,
                letterSpacing: '0.04em',
                display: 'inline-block',
                marginTop: 4,
              }}
            >
              SIGN IN TO CONSOLE &rarr;
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
