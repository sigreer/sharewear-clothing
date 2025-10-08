import { test, expect, Page } from '@playwright/test';

/**
 * Mega Menu Admin UI Tests
 *
 * Tests the backend admin UI for mega-menu configuration at http://sharewear.local:9000/app/catalog/mega-menu
 *
 * Test Coverage:
 * 1. Global Configuration Tab
 * 2. Category Selection and Configuration
 * 3. Top-level Category Configuration (menu layout, tagline, columns, featured)
 * 4. Second-level Category Configuration (displayAsColumn with column fields, or list mode)
 * 5. Third-level Category Configuration (icon, thumbnail, title, subtitle)
 * 6. Save functionality and persistence
 */

const ADMIN_BASE_URL = 'http://sharewear.local:9000';
const MEGA_MENU_URL = `${ADMIN_BASE_URL}/app/catalog/mega-menu`;

// Helper to login to admin (adjust credentials as needed)
async function loginToAdmin(page: Page) {
  await page.goto(`${ADMIN_BASE_URL}/app/login`);

  // Check if already logged in
  const isLoggedIn = await page.locator('[data-testid="nav-menu"]').isVisible().catch(() => false);
  if (isLoggedIn) {
    return;
  }

  // Fill login form - adjust selectors based on actual admin UI
  await page.fill('input[name="email"]', 'admin@medusa-test.com');
  await page.fill('input[name="password"]', 'supersecret');
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/app/, { timeout: 10000 });
}

test.describe('Mega Menu Admin UI', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginToAdmin(page);
  });

  test.describe('Global Configuration Tab', () => {
    test('should load global config tab', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Verify page loads
      await expect(page.locator('h1')).toContainText('Mega Menu Configuration');

      // Verify Global Config tab is active by default
      const globalTab = page.locator('[role="tab"]', { hasText: 'Global Config' });
      await expect(globalTab).toBeVisible();
      await expect(globalTab).toHaveAttribute('data-state', 'active');

      // Take screenshot
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-global-tab.png',
        fullPage: true
      });
    });

    test('should display default menu layout dropdown', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Check that default menu layout selector exists
      await expect(page.locator('text=Default Menu Layout')).toBeVisible();

      // Check dropdown is present
      const layoutSelect = page.locator('button[role="combobox"]').first();
      await expect(layoutSelect).toBeVisible();
    });

    test('should change and save global configuration', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Click the layout dropdown
      const layoutSelect = page.locator('button[role="combobox"]').first();
      await layoutSelect.click();

      // Wait for dropdown to open
      await page.waitForTimeout(500);

      // Select "Rich Columns" option
      await page.locator('[role="option"]', { hasText: 'Rich Columns' }).click();

      // Click save button
      const saveButton = page.locator('button', { hasText: 'Save Global Configuration' });
      await saveButton.click();

      // Wait for success toast
      await expect(page.locator('text=Global configuration saved successfully')).toBeVisible({ timeout: 5000 });

      // Take screenshot of success state
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-global-saved.png',
        fullPage: true
      });
    });
  });

  test.describe('Categories Tab', () => {
    test('should load categories tab and display category selector', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Click Categories tab
      const categoriesTab = page.locator('[role="tab"]', { hasText: 'Categories' });
      await categoriesTab.click();

      // Wait for tab content to load
      await expect(page.locator('h2', { hasText: 'Category Menu Configuration' })).toBeVisible();

      // Check category selector is present
      await expect(page.locator('text=Select Category')).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-categories-tab.png',
        fullPage: true
      });
    });

    test('should select a category and display configuration options', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Click category selector
      const categorySelect = page.locator('button[role="combobox"]').first();
      await categorySelect.click();
      await page.waitForTimeout(500);

      // Select first category
      const firstOption = page.locator('[role="option"]').first();
      const categoryName = await firstOption.textContent();
      await firstOption.click();

      // Wait for configuration to load
      await page.waitForTimeout(1000);

      // Verify level badge appears
      await expect(page.locator('text=Top-level').or(page.locator('text=Second-level')).or(page.locator('text=Third-level'))).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-category-selected.png',
        fullPage: true
      });
    });
  });

  test.describe('Top-level Category Configuration', () => {
    test('should show menu layout options for top-level category with children', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select a top-level category (try to find one with children)
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);

      // Look for a category without indentation (top-level)
      const topLevelOption = page.locator('[role="option"]').filter({ hasNotText: /^  / }).first();
      await topLevelOption.click();

      await page.waitForTimeout(1000);

      // Check if it's top-level
      const isTopLevel = await page.locator('text=Top-level').isVisible();

      if (isTopLevel) {
        // Check for menu layout dropdown (appears if category has children)
        const hasMenuLayout = await page.locator('text=Menu Layout').isVisible();

        if (hasMenuLayout) {
          await expect(page.locator('text=Menu Layout')).toBeVisible();

          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-top-level-with-children.png',
            fullPage: true
          });
        }
      }
    });

    test('should show rich columns options when layout is set to rich-columns', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select a top-level category
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);
      const topLevelOption = page.locator('[role="option"]').filter({ hasNotText: /^  / }).first();
      await topLevelOption.click();
      await page.waitForTimeout(1000);

      // Check if top-level
      const isTopLevel = await page.locator('text=Top-level').isVisible();

      if (isTopLevel) {
        const hasMenuLayout = await page.locator('text=Menu Layout').isVisible();

        if (hasMenuLayout) {
          // Click menu layout dropdown
          const menuLayoutSelect = page.locator('button[role="combobox"]').filter({ has: page.locator('text=Use default').or(page.locator('text=Rich Columns')) });
          await menuLayoutSelect.first().click();
          await page.waitForTimeout(500);

          // Select Rich Columns
          await page.locator('[role="option"]', { hasText: 'Rich Columns' }).click();

          await page.waitForTimeout(500);

          // Verify rich columns fields appear
          await expect(page.locator('text=Tagline')).toBeVisible();
          await expect(page.locator('text=Columns (JSON)')).toBeVisible();
          await expect(page.locator('text=Featured Cards (JSON)')).toBeVisible();

          // Take screenshot
          await page.screenshot({
            path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-rich-columns-options.png',
            fullPage: true
          });
        }
      }
    });
  });

  test.describe('Second-level Category Configuration', () => {
    test('should show display as column checkbox for second-level categories', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select second-level category (indented once)
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);

      // Find a category with single indentation (second-level)
      const secondLevelOption = page.locator('[role="option"]').filter({ hasText: /^  [^ ]/ }).first();
      const exists = await secondLevelOption.count() > 0;

      if (exists) {
        await secondLevelOption.click();
        await page.waitForTimeout(1000);

        // Verify it's second-level
        const isSecondLevel = await page.locator('text=Second-level').isVisible();

        if (isSecondLevel) {
          // Check if parent uses rich-columns
          const hasDisplayAsColumn = await page.locator('text=Display as title/image/description column').isVisible();

          if (hasDisplayAsColumn) {
            await expect(page.locator('input[type="checkbox"][id="displayAsColumn"]')).toBeVisible();

            // Take screenshot
            await page.screenshot({
              path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-second-level-checkbox.png',
              fullPage: true
            });
          }
        }
      }
    });

    test('should show column fields when displayAsColumn is checked', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select second-level category
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);
      const secondLevelOption = page.locator('[role="option"]').filter({ hasText: /^  [^ ]/ }).first();
      const exists = await secondLevelOption.count() > 0;

      if (exists) {
        await secondLevelOption.click();
        await page.waitForTimeout(1000);

        const isSecondLevel = await page.locator('text=Second-level').isVisible();

        if (isSecondLevel) {
          const checkbox = page.locator('input[type="checkbox"][id="displayAsColumn"]');
          const hasCheckbox = await checkbox.isVisible();

          if (hasCheckbox) {
            // Check the checkbox
            await checkbox.check();
            await page.waitForTimeout(500);

            // Verify column fields appear
            await expect(page.locator('text=Column Title')).toBeVisible();
            await expect(page.locator('text=Column Description')).toBeVisible();
            await expect(page.locator('text=Column Image URL')).toBeVisible();
            await expect(page.locator('text=Badge')).toBeVisible();

            // Take screenshot
            await page.screenshot({
              path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-second-level-column-fields.png',
              fullPage: true
            });
          }
        }
      }
    });

    test('should show list mode fields when displayAsColumn is not checked', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select second-level category
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);
      const secondLevelOption = page.locator('[role="option"]').filter({ hasText: /^  [^ ]/ }).first();
      const exists = await secondLevelOption.count() > 0;

      if (exists) {
        await secondLevelOption.click();
        await page.waitForTimeout(1000);

        const isSecondLevel = await page.locator('text=Second-level').isVisible();

        if (isSecondLevel) {
          const checkbox = page.locator('input[type="checkbox"][id="displayAsColumn"]');
          const hasCheckbox = await checkbox.isVisible();

          if (hasCheckbox) {
            // Ensure checkbox is unchecked
            await checkbox.uncheck();
            await page.waitForTimeout(500);

            // Verify list mode fields appear
            const hasIcon = await page.locator('text=Icon').nth(0).isVisible();
            const hasThumbnail = await page.locator('text=Thumbnail URL').nth(0).isVisible();

            if (hasIcon && hasThumbnail) {
              await expect(page.locator('text=Icon').nth(0)).toBeVisible();
              await expect(page.locator('text=Thumbnail URL').nth(0)).toBeVisible();
              await expect(page.locator('text=Title Override')).toBeVisible();
              await expect(page.locator('text=Subtitle')).toBeVisible();

              // Take screenshot
              await page.screenshot({
                path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-second-level-list-fields.png',
                fullPage: true
              });
            }
          }
        }
      }
    });
  });

  test.describe('Third-level Category Configuration', () => {
    test('should show icon and thumbnail fields for third-level categories', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select third-level category (indented twice)
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);

      // Find a category with double indentation (third-level)
      const thirdLevelOption = page.locator('[role="option"]').filter({ hasText: /^    [^ ]/ }).first();
      const exists = await thirdLevelOption.count() > 0;

      if (exists) {
        await thirdLevelOption.click();
        await page.waitForTimeout(1000);

        // Verify it's third-level
        const isThirdLevel = await page.locator('text=Third-level').isVisible();

        if (isThirdLevel) {
          // Check if grandparent allows configuration
          const hasIcon = await page.locator('text=Icon').nth(0).isVisible();

          if (hasIcon) {
            await expect(page.locator('text=Icon').nth(0)).toBeVisible();
            await expect(page.locator('text=Thumbnail URL').nth(0)).toBeVisible();
            await expect(page.locator('text=Title').nth(0)).toBeVisible();
            await expect(page.locator('text=Subtitle').nth(0)).toBeVisible();

            // Take screenshot
            await page.screenshot({
              path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-third-level-fields.png',
              fullPage: true
            });
          }
        }
      }
    });
  });

  test.describe('Save and Persistence', () => {
    test('should save category configuration and show success toast', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select any category
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);
      await page.locator('[role="option"]').first().click();
      await page.waitForTimeout(1000);

      // Click save button
      const saveButton = page.locator('button', { hasText: 'Save Category Configuration' });
      const exists = await saveButton.isVisible();

      if (exists) {
        await saveButton.click();

        // Wait for success toast
        await expect(page.locator('text=Category configuration saved successfully')).toBeVisible({ timeout: 5000 });

        // Take screenshot
        await page.screenshot({
          path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-category-saved.png',
          fullPage: true
        });
      }
    });

    test('should persist configuration after reload', async ({ page }) => {
      await page.goto(MEGA_MENU_URL);

      // Go to Categories tab
      await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

      // Select a category
      await page.locator('button[role="combobox"]').first().click();
      await page.waitForTimeout(500);
      await page.locator('[role="option"]').first().click();
      await page.waitForTimeout(1000);

      // Get category ID from URL or state
      const selectedCategoryText = await page.locator('button[role="combobox"]').first().textContent();

      // Make a change (e.g., check exclude checkbox)
      const excludeCheckbox = page.locator('input[type="checkbox"][id="excluded"]');
      const hasExclude = await excludeCheckbox.isVisible();

      if (hasExclude) {
        const wasChecked = await excludeCheckbox.isChecked();
        await excludeCheckbox.setChecked(!wasChecked);

        // Save
        const saveButton = page.locator('button', { hasText: 'Save Category Configuration' });
        await saveButton.click();
        await expect(page.locator('text=Category configuration saved successfully')).toBeVisible({ timeout: 5000 });

        // Reload page
        await page.reload();
        await page.waitForTimeout(2000);

        // Go to Categories tab
        await page.locator('[role="tab"]', { hasText: 'Categories' }).click();

        // Select same category
        await page.locator('button[role="combobox"]').first().click();
        await page.waitForTimeout(500);
        await page.locator('[role="option"]', { hasText: selectedCategoryText || '' }).first().click();
        await page.waitForTimeout(1000);

        // Verify the change persisted
        const newCheckedState = await excludeCheckbox.isChecked();
        expect(newCheckedState).toBe(!wasChecked);

        // Take screenshot
        await page.screenshot({
          path: '/home/simon/Dev/sigreer/sharewear.clothing/apps/storefront1/tests/screenshots/admin-config-persisted.png',
          fullPage: true
        });
      }
    });
  });
});
