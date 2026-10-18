import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionUserId } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 1. Read user_id from secure cookies
    const sessionUserId = request.cookies.get('user_id')?.value || (await getSessionUserId());
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query database to check user's role
    const roleRes = await pool.query('SELECT role FROM USERS WHERE user_id = $1', [sessionUserId]);
    if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required.' },
        { status: 403 }
      );
    }

    let userId: string = '';
    let amount: number = 0;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      userId = body.user_id !== undefined ? String(body.user_id) : '';
      amount = parseFloat(String(body.amount));
    } else {
      const formData = await request.formData();
      userId = (formData.get('user_id') as string) || '';
      amount = parseFloat((formData.get('amount') as string) || '0');
    }

    if (!userId || userId.trim() === '') {
      return NextResponse.json(
        { error: 'Valid user_id is required.' },
        { status: 400 }
      );
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number greater than 0.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE USERS 
         SET wallet_balance = wallet_balance + $1 
         WHERE user_id = $2 
         RETURNING user_id, username, email, wallet_balance`,
        [amount, userId]
      );

      if (res.rows.length === 0) {
        return NextResponse.json(
          { error: `User with ID ${userId} not found.` },
          { status: 404 }
        );
      }

      const updatedUser = res.rows[0];
      return NextResponse.json({
        success: true,
        message: `Successfully minted ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} points for ${updatedUser.username}!`,
        user: {
          user_id: String(updatedUser.user_id),
          username: updatedUser.username,
          email: updatedUser.email,
          wallet_balance: parseFloat(String(updatedUser.wallet_balance)),
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (
      error?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      error?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw error;
    }
    console.error('Admin funds mint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mint funds' },
      { status: 500 }
    );
  }
}
