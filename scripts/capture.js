const { chromium } = require('@playwright/test');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://root@localhost:26257/auction_platform_db?sslmode=disable'
});

async function main() {
  const outDir = 'C:\\Users\\souptik\\.gemini\\antigravity-ide\\brain\\84c4d955-212e-46c1-a9d6-858e90b55013\\scratch\\screens';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Get user and auction
  let adminUser = null;
  let firstAuctionId = 1;
  try {
    const userRes = await pool.query("SELECT user_id, username, role FROM USERS WHERE role = 'ADMIN' LIMIT 1");
    adminUser = userRes.rows[0];
    console.log('Admin user:', adminUser);

    const aucRes = await pool.query("SELECT auction_id FROM AUCTIONS ORDER BY auction_id ASC LIMIT 1");
    firstAuctionId = aucRes.rows[0]?.auction_id || 1;
    console.log('First auction id:', firstAuctionId);
  } catch (err) {
    console.warn('DB query error:', err.message);
  } finally {
    await pool.end();
  }

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  if (adminUser) {
    await context.addCookies([
      { name: 'user_id', value: String(adminUser.user_id), domain: 'localhost', path: '/' },
      { name: 'is_authenticated', value: 'true', domain: 'localhost', path: '/' }
    ]);
  }

  const page = await context.newPage();

  const pagesToCapture = [
    { name: '01_home', url: 'http://localhost:3000/' },
    { name: '02_auction_detail', url: `http://localhost:3000/auction/${firstAuctionId}` },
    { name: '03_my_bids', url: 'http://localhost:3000/my-bids' },
    { name: '04_my_auctions', url: 'http://localhost:3000/my-auctions' },
    { name: '05_create', url: 'http://localhost:3000/create' },
    { name: '06_profile', url: 'http://localhost:3000/profile' },
    { name: '07_admin', url: 'http://localhost:3000/admin' },
    { name: '08_receipts', url: 'http://localhost:3000/profile/receipts' },
  ];

  for (const item of pagesToCapture) {
    try {
      console.log(`Navigating to ${item.name} (${item.url})...`);
      await page.goto(item.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.screenshot({ path: path.join(outDir, `${item.name}.png`), fullPage: true });
      console.log(`Captured ${item.name}.png`);
    } catch (e) {
      console.error(`Failed to capture ${item.name}:`, e.message);
    }
  }

  // Also capture logged out view (login & signup)
  const loggedOutContext = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page2 = await loggedOutContext.newPage();
  for (const item of [
    { name: '09_login', url: 'http://localhost:3000/login' },
    { name: '10_signup', url: 'http://localhost:3000/signup' }
  ]) {
    try {
      console.log(`Navigating to ${item.name} (${item.url})...`);
      await page2.goto(item.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page2.screenshot({ path: path.join(outDir, `${item.name}.png`), fullPage: true });
      console.log(`Captured ${item.name}.png`);
    } catch (e) {
      console.error(`Failed to capture ${item.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('All captures finished!');
}

main().catch(console.error);
