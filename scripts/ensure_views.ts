import pool from '../lib/db';
import fs from 'fs';
import path from 'path';

async function run() {
  const client = await pool.connect();
  try {
    const viewsSql = fs.readFileSync(path.join(__dirname, '../queries/cdb-views.sql'), 'utf-8');
    await client.query(viewsSql);
    console.log('cdb-views.sql applied successfully.');

    const res = await client.query('SELECT * FROM flagged_shill_bids_v LIMIT 5');
    console.log('flagged_shill_bids_v query test succeeded, row count:', res.rows.length);
  } catch (err) {
    console.error('Error applying views:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
