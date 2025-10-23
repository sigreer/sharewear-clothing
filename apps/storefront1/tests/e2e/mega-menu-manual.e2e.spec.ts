import { test, expect } from '@playwright/test';

/**
 * Manual Mega Menu Tests
 * Simplified version for quick validation
 */

test.describe('Mega Menu - Quick Tests', () => {
  test('should load storefront homepage', async ({ page }) => {
    await page.goto('http://sharewear.local:8201/gb');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/01-homepage-loaded.png',
      fullPage: true
    });

    // Verify navigation exists
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('should display navigation and capture mega-menu', async ({ page }) => {
    await page.goto('http://sharewear.local:8201/gb');
    await page.waitForLoadState('networkidle');

    // Take nav screenshot
    await page.screenshot({
      path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/02-navigation-bar.png',
      clip: { x: 0, y: 0, width: 1920, height: 200 }
    });

    // Find all nav items
    const navItems = await page.locator('nav a, nav button').all();
    console.log(`Found ${navItems.length} navigation items`);

    // Hover over each nav item and capture
    for (let i = 0; i < Math.min(navItems.length, 5); i++) {
      const item = navItems[i];
      const text = await item.textContent();
      console.log(`Testing nav item ${i}: ${text}`);

      await item.hover();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: `/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/03-nav-hover-${i}-${text?.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 20)}.png`,
        clip: { x: 0, y: 0, width: 1920, height: 1000 }
      });
    }
  });

  test('should test mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://sharewear.local:8201/gb');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/04-mobile-view.png',
      fullPage: true
    });
  });
});
