'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PixelSprite } from '@/lib/sprites';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to sign in. Please check your credentials.');
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
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      window.location.href = callbackUrl;
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
      <div className="panel pad hot" style={{ maxWidth: 500, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-block', marginBottom: 12 }}>
            <PixelSprite name="player" size={48} />
          </div>
          <div className="eyebrow" style={{ color: 'var(--sky)', letterSpacing: '0.12em' }}>
            AUTHENTICATION CONSOLE // LOCAL NODE 26257
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
            INSERT CREDENTIALS
          </h1>
          <p className="sub" style={{ fontSize: 20, margin: '0 auto', color: 'var(--dim)' }}>
            Enter your email and security key to enter the live arcade bidding floor.
          </p>
        </div>

        {error && (
          <div className="err" style={{ marginBottom: 20 }} role="alert">
            <span style={{ fontFamily: 'var(--f-display)', fontSize: 10, display: 'block', marginBottom: 4 }}>
              [AUTH_REJECTED]
            </span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
          <div>
            <label htmlFor="email-address" className="lbl">
              EMAIL ADDRESS
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
              placeholder="player1@auctionhub.local"
            />
          </div>

          <div>
            <label htmlFor="password" className="lbl">
              SECURITY KEY / PASSWORD
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field"
              placeholder="••••••••••••"
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              type="submit"
              disabled={isPending}
              className="btn lime wide"
              style={{ padding: '16px 20px', marginBottom: 4 }}
            >
              {isPending ? (
                <span>CONNECTING TO CLUSTER...</span>
              ) : (
                <>
                  <PixelSprite name="bolt" size={16} />
                  <span>SIGN IN TO CONSOLE</span>
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
            <span style={{ color: 'var(--dim)' }}>NO PLAYER RECORD FOUND? </span>
            <Link
              href="/signup"
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
              INSERT COIN // REGISTER &rarr;
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
