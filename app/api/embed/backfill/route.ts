import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateEmbedding } from '@/lib/embedding';

export async function POST() {
  try {
    const { rows: items } = await query(
      'SELECT item_id, title, description FROM ITEMS WHERE embedding IS NULL;'
    );

    let updated_count = 0;

    // CockroachDB constraint: Execute vector updates sequentially to avoid performance degradation
    for (const item of items) {
      const textToEmbed = `${item.title} ${item.description || ''}`.trim();
      const vector = await generateEmbedding(textToEmbed || item.title);

      await query('UPDATE ITEMS SET embedding = $1::VECTOR WHERE item_id = $2;', [
        JSON.stringify(vector),
        item.item_id,
      ]);

      updated_count++;
    }

    return NextResponse.json({ success: true, updated_count });
  } catch (error: any) {
    console.error('Backfill embedding error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to backfill embeddings' },
      { status: 500 }
    );
  }
}
