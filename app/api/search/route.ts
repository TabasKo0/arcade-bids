import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');

    if (!q || !q.trim()) {
      const sql = `
        SELECT 
            i.item_id, 
            i.title, 
            i.description, 
            a.auction_id, 
            a.starting_price,
            a.current_highest_bid, 
            a.current_end_time,
            a.total_bids,
            u.username AS seller_username
        FROM ITEMS i
        JOIN AUCTIONS a ON i.item_id = a.item_id
        LEFT JOIN USERS u ON i.seller_id = u.user_id
        WHERE a.status IN ('ACTIVE', 'EXTENDED')
        ORDER BY i.created_at DESC
        LIMIT 10;
      `;
      const { rows } = await query(sql);
      return NextResponse.json(rows);
    }

    // Semantic search with embedding
    const queryVector = await generateEmbedding(q.trim());
    const sql = `
      SELECT 
          i.item_id, 
          i.title, 
          i.description, 
          a.auction_id, 
          a.starting_price,
          a.current_highest_bid, 
          a.current_end_time,
          a.total_bids,
          u.username AS seller_username,
          (i.embedding <=> $1::VECTOR) AS distance
      FROM ITEMS i
      JOIN AUCTIONS a ON i.item_id = a.item_id
      LEFT JOIN USERS u ON i.seller_id = u.user_id
      WHERE i.embedding IS NOT NULL AND a.status IN ('ACTIVE', 'EXTENDED')
      ORDER BY distance ASC
      LIMIT 10;
    `;

    const { rows } = await query(sql, [JSON.stringify(queryVector)]);
    return NextResponse.json(rows);
  } catch (error: any) {
    if (error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during search' },
      { status: 500 }
    );
  }
}
