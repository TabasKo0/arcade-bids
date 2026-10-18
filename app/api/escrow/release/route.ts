import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let resultId = body.result_id;

    if (!resultId && body.auction_id) {
      const res = await pool.query(
        'SELECT result_id FROM AUCTION_RESULTS WHERE auction_id = $1',
        [body.auction_id]
      );
      if (res.rows.length > 0) {
        resultId = res.rows[0].result_id;
      }
    }

    if (!resultId) {
      return NextResponse.json(
        { error: 'Valid result_id or auction_id is required' },
        { status: 400 }
      );
    }

    const updateRes = await pool.query(
      `UPDATE PAYMENTS_ESCROW 
       SET status = 'RELEASED', updated_at = CURRENT_TIMESTAMP 
       WHERE result_id = $1 
       RETURNING *`,
      [resultId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Escrow record not found for result_id ' + resultId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      escrow: updateRes.rows[0],
      message: 'Escrow payment released successfully to seller.'
    });
  } catch (error: any) {
    console.error('Escrow release error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to release escrow' },
      { status: 500 }
    );
  }
}
