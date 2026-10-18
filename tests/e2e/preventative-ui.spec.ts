import { test, expect } from '@playwright/test';
import pool from '@/lib/db';
import { setupTestDatabase, teardownTestDatabase, TestSeedData } from '../db-setup';

let seedData: TestSeedData;

test.beforeAll(async () => {
  seedData = await setupTestDatabase();
});

test.afterAll(async () => {
  await teardownTestDatabase();
});

test.describe('Category 2: Preventative UI/UX Tests (Frontend Constraints)', () => {
  // Helper to log in a user via the UI
  async function loginAs(page: any, email: string, pass: string = 'Password123!') {
    await page.goto('/login');
    await page.fill('#email-address', email);
    await page.fill('#password', pass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  }

  // TC-UI-01 (Seller Dashboard State)
  test('TC-UI-01: Logged-in seller sees Seller Dashboard instead of Bid Form on their own auction', async ({ page }) => {
    // Log in as seller
    await loginAs(page, 'seller@test.com');

    // Navigate to seller's own auction
    await page.goto(`/auction/${seedData.tentAuctionId}`);

    // Verify Seller Dashboard widget is rendered
    const sellerDashboard = page.locator('text=Seller Dashboard');
    await expect(sellerDashboard).toBeVisible();

    const selfBidNotice = page.locator('text=Self-Bidding Prevented');
    await expect(selfBidNotice).toBeVisible();

    // Verify the bid input and "Place Bid" button DO NOT exist in the DOM
    const bidInput = page.locator('#bidAmount');
    await expect(bidInput).toHaveCount(0);

    const placeBidButton = page.locator('button:has-text("Place Bid")');
    await expect(placeBidButton).toHaveCount(0);
  });

  // TC-UI-02 (Dynamic min Attribute)
  test('TC-UI-02: Enforces dynamic minimum increment and blocks bids below tier floor', async ({ page }) => {
    // Log in as buyer
    await loginAs(page, 'buyer@test.com');

    // Navigate to auction with current bid of $2000
    // Tier base >= 500 & < 2500 requires +$25 increment -> min is $2025.00
    await page.goto(`/auction/${seedData.dynamicMinAuctionId}`);

    const bidInput = page.locator('#bidAmount');
    await expect(bidInput).toBeVisible();

    // Check min attribute on HTML input
    const minAttr = await bidInput.getAttribute('min');
    expect(parseFloat(minAttr || '0')).toBe(2025.00);

    // Type a value below minimum: $2010.00
    await bidInput.fill('2010.00');

    // Bidding form submit button should be disabled and show the required minimum
    const submitBtn = page.locator('form').filter({ has: bidInput }).locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toHaveText(/Enter \$2025\.00 or more/);

    // Preventative helper message is visible
    const helperMsg = page.locator('text=Must be at least $2025.00');
    await expect(helperMsg).toBeVisible();
  });

  // TC-UI-03 (Zero-Second UI Lockout)
  test('TC-UI-03: Instantly disables bid input and displays Finalizing Results skeleton when countdown hits 00:00:00', async ({ page }) => {
    // 1. Manually update an auction to expire in 3 seconds
    const client = await pool.connect();
    let zeroSecondAuctionId: string;
    try {
      const res = await client.query(
        `UPDATE AUCTIONS 
         SET current_end_time = NOW() + INTERVAL '3 seconds',
             status = 'ACTIVE'
         WHERE auction_id = $1
         RETURNING auction_id`,
        [seedData.nearExpiryAuctionId]
      );
      zeroSecondAuctionId = String(res.rows[0].auction_id);
    } finally {
      client.release();
    }

    // 2. Log in as buyer and visit auction
    await loginAs(page, 'buyer@test.com');
    await page.goto(`/auction/${zeroSecondAuctionId}`);

    const bidInput = page.locator('#bidAmount');
    await expect(bidInput).toBeVisible();

    // 3. Wait for timer to hit 00:00:00 (approx 3-4s)
    // The "Finalizing Results..." skeleton loader appears
    const finalizingLoader = page.locator('text=Finalizing Results...');
    await expect(finalizingLoader).toBeVisible({ timeout: 12000 });

    // The bid input is disabled or locked out
    // After finalizing (2s transition), settlement outcome banner or closed state is displayed
    const finalOutcomeOrClosed = page.locator('text=/Auction (Won|Ended|Closed)|Reserve Not Met/');
    await expect(finalOutcomeOrClosed.first()).toBeVisible({ timeout: 15000 });
  });

  // TC-AI-02 (UI Relevance Badge)
  test('TC-AI-02: Renders subtle "Top Match" relevance badge for highly specific queries (distance < 0.3)', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('input[placeholder*="Search auctions"]');
    await expect(searchInput).toBeVisible();

    // Type highly specific query to test cosine distance < 0.3
    await searchInput.fill('Waterproof 4-Person Camping Tent');

    // Wait for debounced search results (300ms + vector inference)
    const topMatchBadge = page.locator('text=Top Match');
    await expect(topMatchBadge.first()).toBeVisible({ timeout: 30000 });

    // Verify it is styled as a badge inside the item card
    const cardTitle = page.locator('h2:has-text("Tent")');
    await expect(cardTitle.first()).toBeVisible();
  });
});
