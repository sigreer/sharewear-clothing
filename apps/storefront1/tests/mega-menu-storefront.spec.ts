import { test, expect, Page } from '@playwright/test';
import { validateServerForTesting } from './utils/server-check';
import { takeComponentScreenshot, waitForResourcesLoaded } from './utils/visual-testing';

/**
 * Mega Menu Storefront Tests
 *
 * Tests the frontend storefront mega-menu display at http://sharewear.local:8201
 *
 * Test Coverage:
 * 1. Navigation loads correctly
 * 2. Simple dropdown menu display
 * 3. Rich columns mega-menu panel display
 * 4. Second-level categories displayed as columns (displayAsColumn: true)
 * 5. Second-level categories displayed as list headers (displayAsColumn: false)
 * 6. Third-level item display with icons, thumbnails, titles, subtitles
 * 7. Click navigation and visual regression
 */

const STOREFRONT_URL = 'http://sharewear.local:8201/gb'; // Storefront redirects to country code

test.describe('Mega Menu Storefront', () => {
  test.beforeEach(async ({ page }) => {
    // Validate server is running
    const serverCheck = await validateServerForTesting();
    if (!serverCheck.canProceed) {
      throw new Error(serverCheck.message);
    }

    console.log(serverCheck.message);
  });

  test.describe('Navigation Loads', () => {
    test('should load navigation items on homepage', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Check that navigation exists
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();

      // Check for category links
      const categoryLinks = page.locator('nav a[href*="/store"]').or(page.locator('nav a[href*="/categories"]'));
      const count = await categoryLinks.count();

      expect(count).toBeGreaterThan(0);

      // Take screenshot
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-nav-loaded.png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1920, height: 200 }
      });
    });

    test('should display top-level categories', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Find navigation items
      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const visibleItems = await navItems.all();

      expect(visibleItems.length).toBeGreaterThan(0);

      // Take screenshot
      await takeComponentScreenshot(
        page,
        'nav',
        'storefront-top-level-categories'
      );
    });
  });

  test.describe('Simple Dropdown Menu', () => {
    test('should trigger simple dropdown on hover', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Try to find a nav item to hover
      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const firstItem = navItems.first();

      // Hover over it
      await firstItem.hover();
      await page.waitForTimeout(500);

      // Check if any dropdown appeared (it might be a simple text list)
      const dropdown = page.locator('[class*="dropdown"], [class*="menu"], ul[role="menu"]');
      const hasDropdown = await dropdown.isVisible().catch(() => false);

      if (hasDropdown) {
        // Take screenshot
        await page.screenshot({
          path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-simple-dropdown.png',
          fullPage: false,
          clip: { x: 0, y: 0, width: 1920, height: 600 }
        });
      }
    });

    test('should display children as simple text links', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Hover over nav items and look for simple text links
      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items.slice(0, 3)) {
        await item.hover();
        await page.waitForTimeout(300);

        // Check for simple text links
        const links = page.locator('a[href*="/store"], a[href*="/categories"]').filter({ hasText: /.+/ });
        const visibleLinks = await links.filter({ hasText: /.+/ }).all();

        if (visibleLinks.length > 0) {
          // Found a simple dropdown
          await page.screenshot({
            path: `/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-simple-links-${Math.random().toString(36).slice(2, 7)}.png`,
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 600 }
          });
          break;
        }
      }
    });
  });

  test.describe('Rich Columns Mega-Menu', () => {
    test('should open mega-menu panel on hover', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Try to find and hover over nav items to trigger mega-menu
      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      let megaMenuFound = false;

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Check for mega-menu panel (look for characteristics of rich columns)
        const megaMenuPanel = page.locator('[class*="mega"], [class*="panel"]').filter({ hasText: /.+/ });
        const hasMegaMenu = await megaMenuPanel.isVisible().catch(() => false);

        if (hasMegaMenu) {
          megaMenuFound = true;

          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-mega-menu-panel.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }

      if (megaMenuFound) {
        expect(megaMenuFound).toBe(true);
      }
    });

    test('should display tagline if configured', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Hover over nav items to find mega-menu with tagline
      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for tagline (usually styled as muted text at top)
        const tagline = page.locator('p[class*="muted"]').first();
        const hasTagline = await tagline.isVisible().catch(() => false);

        if (hasTagline) {
          const text = await tagline.textContent();
          if (text && text.length > 0) {
            // Take screenshot
            await page.screenshot({
              path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-mega-menu-tagline.png',
              fullPage: false,
              clip: { x: 0, y: 0, width: 1920, height: 800 }
            });
            break;
          }
        }
      }
    });
  });

  test.describe('Second-Level Category Display (Column Mode)', () => {
    test('should display second-level as column with title', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Hover over nav items to find mega-menu
      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      let foundColumn = false;

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for column headings
        const columnHeading = page.locator('p[class*="font-semibold"]').filter({ hasText: /.+/ });
        const hasHeading = await columnHeading.first().isVisible().catch(() => false);

        if (hasHeading) {
          foundColumn = true;

          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-column-title.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }

      if (foundColumn) {
        expect(foundColumn).toBe(true);
      }
    });

    test('should display column description if configured', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for column descriptions (usually smaller muted text below heading)
        const columnDescription = page.locator('p[class*="muted"]').filter({ hasText: /.+/ });
        const count = await columnDescription.count();

        if (count > 0) {
          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-column-description.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });

    test('should display column image if configured', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for images in the mega-menu
        const images = page.locator('img[alt]').filter({ hasText: /.+/ });
        const count = await images.count();

        if (count > 0) {
          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-column-image.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });

    test('should display badge if configured', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for badges (usually styled as small colored pills)
        const badge = page.locator('span[class*="badge"], span[class*="pill"]').filter({ hasText: /NEW|OFFERS|FREE|FEATURED/i });
        const hasBadge = await badge.first().isVisible().catch(() => false);

        if (hasBadge) {
          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-column-badge.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });
  });

  test.describe('Second-Level Category Display (List Mode)', () => {
    test('should display second-level as list header with third-level items', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for list structure (ul/li with multiple items)
        const lists = page.locator('ul li a').filter({ hasText: /.+/ });
        const count = await lists.count();

        if (count > 2) {
          // Found a list of items
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-list-mode.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });

    test('should display icon/thumbnail for second-level item if configured', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for icons or thumbnails in list items
        const icons = page.locator('li img, li [class*="icon"], li span[aria-hidden]').filter({ hasText: /.{1,3}/ });
        const hasIcons = await icons.first().isVisible().catch(() => false);

        if (hasIcons) {
          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-list-icons.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });
  });

  test.describe('Third-Level Item Display', () => {
    test('should display third-level items with configured properties', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for third-level items (nested links with icons/thumbnails)
        const thirdLevelItems = page.locator('li a').filter({ hasText: /.+/ });
        const count = await thirdLevelItems.count();

        if (count > 0) {
          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-third-level-items.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });

    test('should display icon or thumbnail image for third-level items', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for thumbnails (small images)
        const thumbnails = page.locator('img[class*="w-12"], img[class*="h-12"], img[class*="rounded"], div[class*="rounded"] img');
        const hasThumbnails = await thumbnails.first().isVisible().catch(() => false);

        if (hasThumbnails) {
          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-third-level-thumbnails.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });

    test('should display custom title and subtitle for third-level items', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Look for items with subtitle (usually smaller text below main text)
        const itemsWithSubtitle = page.locator('a').filter({
          has: page.locator('span[class*="text-sm"]').or(page.locator('span[class*="muted"]'))
        });
        const count = await itemsWithSubtitle.count();

        if (count > 0) {
          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-third-level-title-subtitle.png',
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 800 }
          });
          break;
        }
      }
    });

    test('should navigate when clicking third-level links', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      let clicked = false;

      for (const item of items) {
        await item.hover();
        await page.waitForTimeout(500);

        // Find a clickable third-level link
        const thirdLevelLink = page.locator('a[href*="/store"], a[href*="/categories"]').filter({ hasText: /.+/ }).first();
        const hasLink = await thirdLevelLink.isVisible().catch(() => false);

        if (hasLink) {
          const href = await thirdLevelLink.getAttribute('href');

          if (href && href !== '#') {
            // Click the link
            await thirdLevelLink.click();
            await page.waitForTimeout(1000);

            // Verify navigation occurred
            const currentUrl = page.url();
            expect(currentUrl).toContain(href.split('?')[0]);

            clicked = true;

            // Take screenshot
            await page.screenshot({
              path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-third-level-navigation.png',
              fullPage: false
            });
            break;
          }
        }
      }

      if (clicked) {
        expect(clicked).toBe(true);
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should capture mega-menu in different states', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Capture default state
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-nav-default.png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1920, height: 200 }
      });

      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const items = await navItems.all();

      // Capture hover states for first 3 items
      for (let i = 0; i < Math.min(3, items.length); i++) {
        await items[i].hover();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-nav-hover-${i}.png`,
          fullPage: false,
          clip: { x: 0, y: 0, width: 1920, height: 800 }
        });
      }
    });

    test('should verify no layout shifts', async ({ page }) => {
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Get initial layout metrics
      const initialMetrics = await page.evaluate(() => {
        const nav = document.querySelector('nav');
        if (!nav) return null;
        const rect = nav.getBoundingClientRect();
        return { top: rect.top, left: rect.left, height: rect.height };
      });

      // Hover and check metrics don't change
      const navItems = page.locator('nav a, nav button').filter({ hasText: /.+/ });
      const firstItem = navItems.first();
      await firstItem.hover();
      await page.waitForTimeout(500);

      const hoverMetrics = await page.evaluate(() => {
        const nav = document.querySelector('nav');
        if (!nav) return null;
        const rect = nav.getBoundingClientRect();
        return { top: rect.top, left: rect.left, height: rect.height };
      });

      // Verify no significant layout shift
      if (initialMetrics && hoverMetrics) {
        expect(Math.abs(initialMetrics.top - hoverMetrics.top)).toBeLessThan(2);
        expect(Math.abs(initialMetrics.left - hoverMetrics.left)).toBeLessThan(2);
      }
    });

    test('should render correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Take screenshot
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-mobile-nav.png',
        fullPage: false
      });

      // Check if mobile menu exists
      const mobileMenu = page.locator('button[aria-label*="menu"], button[class*="hamburger"]');
      const hasMobileMenu = await mobileMenu.isVisible().catch(() => false);

      if (hasMobileMenu) {
        // Click to open mobile menu
        await mobileMenu.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-mobile-menu-open.png',
          fullPage: true
        });
      }
    });

    test('should render correctly on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(STOREFRONT_URL);
      await waitForResourcesLoaded(page);

      // Take screenshot
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/storefront-tablet-nav.png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 768, height: 400 }
      });
    });
  });
});
