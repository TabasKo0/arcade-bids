'use client';

import { useActionState, useState } from 'react';
import { updateProfile, deleteAccount } from '@/app/actions/profile';
import { PixelSprite } from '@/lib/sprites';

export default function ProfileForm({
  initialUsername,
  initialEmail,
}: {
  initialUsername: string;
  initialEmail: string;
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      {/* Edit Profile Panel */}
      <section className="panel pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <PixelSprite name="gavel" size={24} />
          <div>
            <div className="eyebrow">ACCOUNT SETTINGS</div>
            <h2 className="h2" style={{ fontSize: 18, margin: 0, color: 'var(--gold)' }}>
              PLAYER CREDENTIALS
            </h2>
          </div>
        </div>

        <form action={formAction as unknown as (payload: FormData) => void} style={{ display: 'grid', gap: 18 }}>
          <div>
            <label htmlFor="username" className="lbl">
              PLAYER CALLSIGN / USERNAME
            </label>
            <input
              type="text"
              name="username"
              id="username"
              defaultValue={initialUsername}
              required
              className="field"
            />
          </div>

          <div>
            <label htmlFor="email" className="lbl">
              COMM CHANNEL / EMAIL ADDRESS
            </label>
            <input
              type="email"
              name="email"
              id="email"
              defaultValue={initialEmail}
              required
              className="field"
            />
          </div>

          {state?.error && (
            <div className="err" role="alert">
              <span style={{ fontFamily: 'var(--f-display)', fontSize: 10, display: 'block', marginBottom: 4 }}>
                [ERROR_RESPONSE]
              </span>
              {state.error}
            </div>
          )}

          {state?.success && (
            <div
              style={{
                background: 'rgba(93, 242, 138, 0.15)',
                borderLeft: '8px solid var(--lime)',
                padding: '10px 14px',
                color: 'var(--limeL)',
              }}
            >
              <span style={{ fontFamily: 'var(--f-display)', fontSize: 10, display: 'block', marginBottom: 4 }}>
                [SUCCESS]
              </span>
              Player profile updated successfully.
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={isPending}
              className="btn lime"
              style={{ minWidth: 200 }}
            >
              {isPending ? (
                'COMMITTING CHANGES...'
              ) : (
                <>
                  <PixelSprite name="bolt" size={16} />
                  <span>SAVE CHANGES</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Danger Zone Panel */}
      <section className="panel pad rose">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <PixelSprite name="shield" size={24} />
          <div>
            <div className="eyebrow" style={{ color: 'var(--roseL)' }}>DANGER ZONE</div>
            <h2 className="h2" style={{ fontSize: 18, margin: 0, color: 'var(--rose)' }}>
              TERMINATE ACCOUNT
            </h2>
          </div>
        </div>

        <p className="sub" style={{ fontSize: 18, marginBottom: 18, color: 'var(--cream)' }}>
          Permanently delete your player profile and revoke database privileges. Active bids and auctions will be locked.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn sm rose"
          >
            DELETE PLAYER ACCOUNT
          </button>
        ) : (
          <div
            style={{
              background: '#2b0c1b',
              border: '2px dashed var(--rose)',
              padding: '18px',
              display: 'grid',
              gap: 14,
            }}
          >
            <p style={{ color: 'var(--roseL)', fontSize: 20, margin: 0 }}>
              WARNING: Are you sure you want to permanently delete your account? This action cannot be reversed.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <form
                action={async () => {
                  await deleteAccount();
                }}
              >
                <button type="submit" className="btn sm rose">
                  CONFIRM: PERMANENTLY DELETE
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn sm ghost"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
