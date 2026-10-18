import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const cookieUserId = request.cookies.get('user_id')?.value;
    const userId = cookieUserId || (await getSessionUserId());

    if (!userId) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const result = await pool.query(
      'SELECT user_id, username, email, role, rating_score, created_at FROM USERS WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: result.rows[0],
    });
  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('Session me route error:', error);
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}
