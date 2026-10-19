import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileForm from './ProfileForm';
import { PixelSprite } from '@/lib/sprites';

export const instant = false;

export default async function ProfilePage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect('/login');
  }

  const result = await pool.query(
    'SELECT username, email, role, wallet_balance, created_at FROM USERS WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    redirect('/login');
  }

  const user = result.rows[0];
  const formattedBalance = Number(user.wallet_balance || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div>
      <div style={{ display: 'grid', gap: '24px', maxWidth: 900, margin: '0 auto' }}>
        {/* Player ID Badge */}
        <section className="panel pad hot">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                className="stage"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PixelSprite name="player" size={54} />
              </div>
              <div>
                <div className="eyebrow" style={{ color: 'var(--sky)' }}>
                  PLAYER DOSSIER // COCKROACHDB CITIZEN
                </div>
                <h1
                  className="h1"
                  style={{
                    fontSize: 26,
                    margin: '6px 0',
                    color: 'var(--cream)',
                    textShadow: '3px 3px 0 var(--black)',
                  }}
                >
                  {user.username}
                </h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="tag lime">{user.role || 'CITIZEN'}</span>
                  <span className="tag sky">NODE 26257</span>
                  <span className="tag gold">ID: #{String(userId).slice(0, 8)}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '2px solid rgba(255, 201, 51, 0.3)',
                padding: '14px 20px',
                textAlign: 'right',
              }}
            >
              <div className="lbl" style={{ color: 'var(--gold)' }}>
                AVAILABLE CREDITS
              </div>
              <div className="money" style={{ fontSize: 26 }}>
                {formattedBalance} PTS
              </div>
            </div>
          </div>
        </section>

        {/* Cryptographic Receipts Link Banner */}
        <section className="panel pad violet">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <PixelSprite name="receipt" size={40} />
              <div>
                <div className="eyebrow" style={{ color: 'var(--violetL)' }}>
                  CRYPTOGRAPHIC LEDGER
                </div>
                <h2
                  className="h2"
                  style={{ fontSize: 18, margin: '4px 0', color: 'var(--cream)' }}
                >
                  PURCHASE HISTORY &amp; SETTLEMENT RECEIPTS
                </h2>
                <p className="sub" style={{ fontSize: 18, color: 'var(--dim)', margin: 0 }}>
                  View immutable CockroachDB transaction receipts with SHA-256 signatures for settled auctions.
                </p>
              </div>
            </div>
            <Link
              href="/profile/receipts"
              className="btn sm violet"
              style={{ whiteSpace: 'nowrap' }}
            >
              INSPECT RECEIPTS &rarr;
            </Link>
          </div>
        </section>

        {/* Profile Settings & Account Actions */}
        <ProfileForm initialUsername={user.username} initialEmail={user.email} />
      </div>
    </div>
  );
}
