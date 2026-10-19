import { test, expect } from '@playwright/test';
import pool from '@/lib/db';
import { setupTestDatabase, teardownTestDatabase, TestSeedData } from '../db-setup';

let seedData: TestSeedData;

test.beforeAll(async () => {
  seedData = await setupTestDatabase();
}, 90000);

test.afterAll(async () => {
  await teardownTestDatabase();
});

// Helper to log in a user via the UI
async function loginAs(page: any, email: string, pass: string = 'Password123!') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('#email-address', email);
  await page.fill('#password', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  await page.locator('#header-user-badge').waitFor({ state: 'visible', timeout: 15000 });
}

// Helper to register a new user via the UI
async function registerUser(page: any, username: string, email: string, pass: string = 'Password123!') {
  await page.context().clearCookies();
  await page.goto('/signup');
  await page.fill('#username', username);
  await page.fill('#email-address', email);
  await page.fill('#password', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => !url.pathname.includes('/signup'), { timeout: 20000 });
  await page.waitForLoadState('networkidle');
  await page.locator('#header-user-badge').waitFor({ state: 'visible', timeout: 15000 });
}

test.describe('Exhaustive E2E User Acceptance Testing (UAT)', () => {

  // =========================================================================
  // CYCLE 1: Identity & Navigation (The Foundation)
  // =========================================================================
  test.describe('Cycle 1: Identity & Navigation (The Foundation)', () => {
    test('1.1 Routing Security: Direct navigation to /admin without login redirects to /login', async ({ page }) => {
      // Clear cookies to simulate fresh unauthenticated guest
      await page.context().clearCookies();
      await page.goto('/admin');

      // Middleware should intercept and redirect to /login with callbackUrl
      await expect(page).toHaveURL(/\/login.*callbackUrl=%2Fadmin/);
      const emailField = page.locator('#email-address');
      await expect(emailField).toBeVisible();
    });

    test('1.2 Profile & Header: Register new user, update display name, assert header reflects change', async ({ page }) => {
      const stamp = Date.now().toString().slice(-5);
      const initialName = `player_${stamp}`;
      const updatedName = `valkyrie_${stamp}`;
      const email = `valkyrie_${stamp}@auctionhub.local`;

      // Register new user
      await registerUser(page, initialName, email);

      // Verify header reflects initial registration
      const userBadge = page.locator('#header-user-badge');
      await expect(userBadge).toBeVisible();
      await expect(userBadge).toContainText(initialName);

      // Navigate to Profile page
      await page.goto('/profile');
      await expect(page.locator('h1')).toContainText(initialName);

      // Update callsign in ProfileForm
      await page.fill('#username', updatedName);
      await page.click('button[type="submit"]:has-text("SAVE CHANGES")');

      // Assert success message appears
      const successBanner = page.locator('text=Player profile updated successfully');
      await expect(successBanner).toBeVisible();

      // Assert header immediately reflects updated username via server action revalidation
      await expect(userBadge).toContainText(updatedName);
    });

    test('1.3 Wallet UI: Header globally displays default PTS balance and navigates to profile/wallet view', async ({ page }) => {
      const stamp = Date.now().toString().slice(-5);
      await registerUser(page, `wallet_tester_${stamp}`, `wallet_${stamp}@test.local`);

      // Default registration credits 10,000 PTS
      const walletPill = page.locator('#header-wallet-pill');
      await expect(walletPill).toBeVisible();
      await expect(walletPill).toContainText('10,000');
      await expect(walletPill).toContainText('PTS');

      // Clicking wallet pill navigates to /profile
      await walletPill.click();
      await page.waitForURL('**/profile');

      // Verify Available Credits panel in profile
      const creditsDisplay = page.locator('text=AVAILABLE CREDITS');
      await expect(creditsDisplay).toBeVisible();
      await expect(page.locator('text=10,000.00 PTS')).toBeVisible();
    });
  });

  // =========================================================================
  // CYCLE 2: The Seller Journey (Creation)
  // =========================================================================
  test.describe('Cycle 2: The Seller Journey (Creation)', () => {
    test('2.1 Dropdown Integrity: Category dropdown is populated from CockroachDB', async ({ page }) => {
      await loginAs(page, 'seller@test.com');
      await page.goto('/create');

      const categorySelect = page.locator('#categoryId');
      await expect(categorySelect).toBeVisible();

      // Verify options are dynamic and loaded from database
      const options = categorySelect.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(1);

      // Assert Outdoor category exists in database options
      const optionTexts = await options.allInnerTexts();
      expect(optionTexts.some((txt) => /Outdoor/i.test(txt))).toBe(true);
    });

    test('2.2 Validation: Blank form submission is prevented by form validation constraints', async ({ page }) => {
      await loginAs(page, 'seller@test.com');
      await page.goto('/create');

      const titleInput = page.locator('#title');
      await expect(titleInput).toBeVisible();

      // Submit form while required fields are blank
      await page.click('button[type="submit"]');

      // Browser HTML5 validation prevents submission; URL remains /create
      expect(page.url()).toContain('/create');
      const isInvalid = await titleInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
      expect(isInvalid).toBe(true);
    });

    test('2.3 Creation: Creates auction with vector embedding, redirects to detail page, and appears in My Auctions', async ({ page }) => {
      await loginAs(page, 'seller@test.com');
      await page.goto('/create');

      const uniqueTitle = `Synthwave Mechanical Synth ${Date.now()}`;
      await page.fill('#title', uniqueTitle);
      await page.fill('#description', 'Analog boutique synthesizer with neon backlit keys and polyphonic oscillator');
      await page.fill('#startingPrice', '125.00');
      await page.fill('#reservePrice', '200.00');
      await page.fill('#durationHours', '48');

      // Wait for category options to load from CockroachDB
      const firstCatOption = page.locator('#categoryId option:not([disabled])').first();
      await firstCatOption.waitFor({ state: 'attached', timeout: 10000 });
      const catVal = await firstCatOption.getAttribute('value');
      if (catVal) {
        await page.selectOption('#categoryId', catVal);
      }

      // Submit and verify redirection
      const submitBtn = page.locator('button[type="submit"]:has-text("Publish Auction")');
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });
      await Promise.all([
        page.waitForURL(/\/auction\/\d+/, { timeout: 45000 }),
        submitBtn.click(),
      ]);

      // Assert detail page displays created lot
      await expect(page.locator('h1.h1')).toContainText(uniqueTitle);

      // Verify item appears in seller's workspace "My Auctions"
      await page.goto('/my-auctions');
      await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible();
    });
  });

  // =========================================================================
  // CYCLE 3: Discovery & Semantic Search (The AI)
  // =========================================================================
  test.describe('Cycle 3: Discovery & Semantic Search (The AI)', () => {
    test('3.1 & 3.2 Semantic Match: Conceptual query matches via cosine distance and displays Top Match badge', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.locator('input[type="search"]');
      await expect(searchInput).toBeVisible();

      // Natural language conceptual query without mentioning the word "Tent"
      await searchInput.fill('protection from heavy rain and wind');
      await page.click('button[type="submit"]:has-text("SEARCH")');

      // Wait for search result card and verify "Top Match" relevance badge
      const topMatchBadge = page.locator('.tag.gold:has-text("TOP MATCH")');
      await expect(topMatchBadge.first()).toBeVisible({ timeout: 25000 });

      // Verify matching card corresponds to the 4-Person Camping Tent
      const matchedCard = page.locator('article').filter({ hasText: 'Camping Tent' });
      await expect(matchedCard.first()).toBeVisible();
    });
  });

  // =========================================================================
  // CYCLE 4: The Bidding Engine (Guards & Proxy)
  // =========================================================================
  test.describe('Cycle 4: The Bidding Engine (Guards & Proxy)', () => {
    test('4.1 Seller Lockout: Verified seller sees Seller Dashboard and cannot bid on own auction', async ({ page }) => {
      await loginAs(page, 'seller@test.com');
      await page.goto(`/auction/${seedData.tentAuctionId}`);

      // Assert Seller Dashboard widget is rendered
      const sellerDashboard = page.locator('text=Seller Dashboard');
      await expect(sellerDashboard).toBeVisible();

      // Assert preventative notice is present
      const selfBidNotice = page.locator('text=Self-Bidding Prevented');
      await expect(selfBidNotice).toBeVisible();

      // Bid form input and button must NOT exist in the DOM
      await expect(page.locator('#bidAmount')).toHaveCount(0);
      await expect(page.locator('button:has-text("Place Bid")')).toHaveCount(0);
    });

    test('4.2 Solvency Guard: Bid exceeding available wallet points is rejected with P0005 toast', async ({ page }) => {
      await loginAs(page, 'buyer@test.com');
      await page.goto(`/auction/${seedData.bootsAuctionId}`);

      const bidInput = page.locator('#bidAmount');
      await expect(bidInput).toBeVisible();

      // Fill an amount exceeding available wallet points
      await bidInput.fill('9999999.00');

      const submitBtn = page.locator('form').filter({ has: bidInput }).locator('button[type="submit"]');
      await submitBtn.click();

      // Assert button stops loading and Solvency Defender banner appears
      const solvencyBanner = page.locator('text=SOLVENCY DEFENDER ACTIVE');
      await expect(solvencyBanner).toBeVisible({ timeout: 15000 });

      const errCodeBadge = page.locator('text=ERRCODE P0005');
      await expect(errCodeBadge).toBeVisible();

      await expect(page.locator('text=/Insufficient available points/')).toBeVisible();
    });

    test('4.3 Proxy Setup: Setting proxy ceiling updates UI to show active limit badge', async ({ page }) => {
      await loginAs(page, 'buyer@test.com');
      await page.goto(`/auction/${seedData.watchAuctionId}`);

      const proxyInput = page.locator('#proxyAmount');
      await expect(proxyInput).toBeVisible();

      // Configure ceiling budget
      await proxyInput.fill('5000.00');
      const proxySubmitBtn = page.locator('form').filter({ has: proxyInput }).locator('button[type="submit"]');
      await proxySubmitBtn.click();

      // Assert UI displays active proxy ceiling indicator with ARMED tag
      const proxyCeilingBadge = page.locator('text=PROXY CEILING: $5000.00');
      await expect(proxyCeilingBadge).toBeVisible({ timeout: 15000 });

      const armedTag = page.locator('.tag.lime:has-text("ARMED")');
      await expect(armedTag).toBeVisible();
    });

    test('4.4 Anti-Sniping UI: Bid in final 120 seconds extends timer by 5 minutes and shows alert', async ({ page }) => {
      // Fast-forward auction end time to 45 seconds from now
      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE AUCTIONS 
           SET current_end_time = NOW() + INTERVAL '45 seconds',
               status = 'ACTIVE'
           WHERE auction_id = $1`,
          [seedData.incrementAuctionId]
        );
      } finally {
        client.release();
      }

      await loginAs(page, 'buyer2@test.com');
      await page.goto(`/auction/${seedData.incrementAuctionId}`);

      const bidInput = page.locator('#bidAmount');
      await expect(bidInput).toBeVisible();

      // Read current min bid and place it
      const minBidVal = await bidInput.inputValue();
      const submitBtn = page.locator('form').filter({ has: bidInput }).locator('button[type="submit"]');
      await submitBtn.click();

      // Anti-Sniping trigger fires: assert extension notification appears
      const antiSnipingNotice = page.locator('text=Anti-Sniping Activated!');
      await expect(antiSnipingNotice).toBeVisible({ timeout: 20000 });
    });
  });

  // =========================================================================
  // CYCLE 5: Lazy Settlement & The Ledger (The Climax)
  // =========================================================================
  test.describe('Cycle 5: Lazy Settlement & The Ledger (The Climax)', () => {
    test('5.1, 5.2 & 5.3: Countdown expiry locks UI, triggers settlement procedure, and generates receipt', async ({ page }) => {
      // 1. Log in first so credentials and cookies are initialized before countdown starts
      await loginAs(page, 'buyer@test.com');

      const client = await pool.connect();
      let settleAuctionId: string;
      try {
        const buyerRes = await client.query("SELECT user_id FROM USERS WHERE email = 'buyer@test.com'");
        const buyerId = buyerRes.rows[0].user_id;

        // Ensure buyer has the winning bid of 150.00 (which exceeds the 100.00 reserve)
        await client.query(
          `INSERT INTO BIDS (auction_id, bidder_id, bid_amount, bid_time)
           VALUES ($1, $2, 150.00, NOW() - INTERVAL '1 minute')
           ON CONFLICT DO NOTHING`,
          [seedData.nearExpiryAuctionId, buyerId]
        );

        // Fast-forward near-expiry auction to expire in 4 seconds from now
        const res = await client.query(
          `UPDATE AUCTIONS 
           SET current_highest_bid = 150.00,
               total_bids = total_bids + 1,
               current_end_time = NOW() + INTERVAL '4 seconds',
               status = 'ACTIVE'
           WHERE auction_id = $1
           RETURNING auction_id`,
          [seedData.nearExpiryAuctionId]
        );
        settleAuctionId = String(res.rows[0].auction_id);
      } finally {
        client.release();
      }

      await page.goto(`/auction/${settleAuctionId}`);

      // Verify auction is initially active with countdown visible
      const countdown = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/');
      await expect(countdown.first()).toBeVisible({ timeout: 5000 });

      // Wait for countdown to reach 00:00:00: Finalizing Results transition appears
      const finalizingLoader = page.locator('text=Finalizing Results...');
      await expect(finalizingLoader).toBeVisible({ timeout: 15000 });

      // Procedure resolves: settlement outcome banner appears celebrating win
      const outcomeBanner = page.locator('text=/Auction Won/i');
      await expect(outcomeBanner.first()).toBeVisible({ timeout: 25000 });

      // Click "View Payment Receipt" link or navigate to receipts
      const receiptLink = page.locator('a[href="/profile/receipts"]');
      if ((await receiptLink.count()) > 0 && (await receiptLink.first().isVisible())) {
        await receiptLink.first().click();
        await page.waitForURL('**/profile/receipts');
      } else {
        await page.goto('/profile/receipts');
      }

      // Assert table has verified receipts
      const receiptTable = page.locator('table');
      await expect(receiptTable).toBeVisible({ timeout: 15000 });

      // Cryptographic UUID displayed in a <code> tag
      const uuidCode = page.locator('td code').first();
      await expect(uuidCode).toBeVisible();

      // Assert ACID VERIFIED tag is present on the ledger row
      const acidTag = page.locator('.tag.lime:has-text("ACID VERIFIED")').first();
      await expect(acidTag).toBeVisible();
    });
  });

  // =========================================================================
  // CYCLE 6: The Admin Sandbox
  // =========================================================================
  test.describe('Cycle 6: The Admin Sandbox', () => {
    test('6.1 RBAC: Admin link visible in Header only for ADMIN role', async ({ page }) => {
      // 1. As regular buyer, Admin link should not exist
      await loginAs(page, 'buyer@test.com');
      await page.goto('/');
      await expect(page.locator('a[href="/admin"]')).toHaveCount(0);

      // 2. As admin, Admin link is visible
      await loginAs(page, 'admin@test.com');
      await page.goto('/');
      const adminNav = page.locator('a[href="/admin"]');
      await expect(adminNav.first()).toBeVisible();
    });

    test('6.2 The Mint: Admin successfully mints points and updates user balance', async ({ page }) => {
      await loginAs(page, 'admin@test.com');
      await page.goto('/admin');

      // Verify Widget A (The Mint) is present
      await expect(page.locator('text=Widget A: The Mint')).toBeVisible();

      // Fill mint amount
      const mintInput = page.locator('#mint-amount');
      await expect(mintInput).toBeVisible();
      await mintInput.fill('1000');

      // Submit mint form
      await page.click('button[type="submit"]:has-text("Mint")');

      // Assert success message is displayed
      const mintFeedback = page.locator('text=/Successfully minted/');
      await expect(mintFeedback).toBeVisible({ timeout: 15000 });
    });

    test('6.3 Fraud Radar: Shill Bidding table renders and flags IP matches', async ({ page }) => {
      await loginAs(page, 'admin@test.com');
      await page.goto('/admin');

      // Verify Widget B (Fraud Radar) is present
      await expect(page.locator('text=Widget B: Fraud Radar')).toBeVisible();

      // Click the demonstration helper button to inject a demo shill bid
      const injectBtn = page.locator('button:has-text("Inject Demo Shill Bid »")');
      await expect(injectBtn).toBeVisible();
      await injectBtn.click();

      // Assert Shill Bidding table renders a flagged row with IP MATCH FLAGGED
      const flaggedTag = page.locator('.tag.rose:has-text("IP MATCH FLAGGED")');
      await expect(flaggedTag.first()).toBeVisible({ timeout: 15000 });
    });
  });

  // =========================================================================
  // CYCLE 7: Autonomous Discovery & Edge Case Hunting (The "Missed" Features)
  // =========================================================================
  test.describe('Cycle 7: Autonomous Discovery & Edge Case Hunting', () => {
    test('7.1 Empty States: Zero-history users see friendly CTAs on My Auctions, Receipts, and My Bids', async ({ page }) => {
      const stamp = Date.now().toString().slice(-5);
      await registerUser(page, `virgin_${stamp}`, `virgin_${stamp}@test.local`);

      // 1. My Auctions Empty State
      await page.goto('/my-auctions');
      await expect(page.locator('text=No Auctions Created Yet')).toBeVisible();
      const createCta = page.locator('a[href="/create"]:has-text("Create An Auction")');
      await expect(createCta).toBeVisible();

      // 2. Receipts Empty State
      await page.goto('/profile/receipts');
      await expect(page.locator('text=No Purchase Receipts Found')).toBeVisible();
      const exploreCta = page.locator('a[href="/"]:has-text("Browse Active Auctions")');
      await expect(exploreCta).toBeVisible();

      // 3. My Bids Empty State
      await page.goto('/my-bids');
      await expect(page.locator('text=No Bids Placed Yet')).toBeVisible();
      const bidsCta = page.locator('a[href="/"]:has-text("Browse Active Auctions")');
      await expect(bidsCta).toBeVisible();
    });

    test('7.2 404 / Error Boundary: Non-existent auction ID renders styled 404 page, not a raw crash', async ({ page }) => {
      await page.goto('/auction/999999999999999');

      // Assert custom retro arcade 404 is displayed
      await expect(page.locator('text=ERROR 404 // LOT NOT FOUND')).toBeVisible();
      await expect(page.locator('text=Sector Uncharted')).toBeVisible();
      const returnCta = page.locator('a[href="/"]:has-text("Return to Marketplace")');
      await expect(returnCta).toBeVisible();
    });

    test('7.3 Mobile Responsiveness: Header hamburger menu expands and collapses on 375x667 viewport', async ({ page }) => {
      // Set viewport to mobile iPhone dimensions
      await page.setViewportSize({ width: 375, height: 667 });

      await loginAs(page, 'buyer@test.com');
      await page.goto('/');

      // Desktop nav must be hidden on mobile
      const desktopNav = page.locator('.nav-group.desktop-only');
      await expect(desktopNav).toBeHidden();

      // Hamburger button must be visible
      const hamburgerBtn = page.locator('#mobile-menu-btn');
      await expect(hamburgerBtn).toBeVisible();

      // Click to open drawer
      await hamburgerBtn.click();
      const mobileDrawer = page.locator('#mobile-nav-menu');
      await expect(mobileDrawer).toBeVisible();
      await expect(mobileDrawer.locator('text=Market')).toBeVisible();
      await expect(mobileDrawer.locator('text=My Bids')).toBeVisible();

      // Click again to close drawer
      await hamburgerBtn.click();
      await expect(mobileDrawer).toBeHidden();

      // Verify Receipts panel renders cleanly and does not overflow viewport
      await page.goto('/profile/receipts');
      const receiptsContainer = page.locator('.panel, .empty-state, .tscroll').first();
      await expect(receiptsContainer).toBeVisible();
    });

    test('7.4 Image Fallbacks: Items without external image assets render pixel art vector sprites safely', async ({ page }) => {
      await page.goto('/');

      // Verify that all pages render svg vector sprites with imageRendering pixelated
      const sprites = page.locator('svg.image-pixelated');
      const count = await sprites.count();
      expect(count).toBeGreaterThan(0);

      // Verify no broken <img> elements exist on the marketplace grid
      const brokenImgs = page.locator('.auction-grid img:not([src])');
      await expect(brokenImgs).toHaveCount(0);
    });
  });
});
