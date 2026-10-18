import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const res = await pool.query(
      'SELECT category_id, category_name FROM CATEGORIES ORDER BY category_name ASC;'
    );

    const categories = res.rows.map((row) => ({
      category_id: String(row.category_id),
      category_name: row.category_name,
    }));

    return NextResponse.json(categories);
  } catch (error: any) {
    if (
      error?.digest === 'NEXT_PRERENDER_INTERRUPTED' ||
      error?.digest === 'HANGING_PROMISE_REJECTION'
    ) {
      throw error;
    }
    console.error('Failed to fetch categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
