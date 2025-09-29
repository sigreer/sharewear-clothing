/**
 * Example Component Test
 *
 * This file demonstrates the testing workflow for AI agents working on the storefront.
 * It shows how to use the server detection and visual testing utilities.
 */

import { test, expect } from '@playwright/test';
import { validateServerForTesting } from './utils/server-check';
import { validateComponent, takeComponentScreenshot } from './utils/visual-testing';

test.describe('Example Component Testing Workflow', () => {
  test.beforeEach(async () => {
    // CRITICAL: Always validate server before running tests
    const serverCheck = await validateServerForTesting();

    if (!serverCheck.canProceed) {
      throw new Error(serverCheck.message);
    }

    console.log(serverCheck.message);
  });

  test('should demonstrate basic component testing', async ({ page }) => {
    // Navigate to the page containing your component
    await page.goto('/');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Example: Test a navigation component
    const navigation = page.locator('nav');
    await expect(navigation).toBeVisible();

    // Take a screenshot of the component
    await takeComponentScreenshot(page, 'nav', 'navigation-component');

    // Example: Test a specific component by data-testid
    // const productCard = page.locator('[data-testid="product-card"]');
    // await expect(productCard).toBeVisible();
  });

  test('should demonstrate comprehensive component validation', async ({ page }) => {
    await page.goto('/');

    // Example of comprehensive component testing
    // Replace 'main' with your actual component selector
    const validation = await validateComponent(
      page,
      'main',
      'main-content',
      {
        testResponsiveness: true,
        testStates: [
          {
            name: 'loaded',
            action: async () => {
              await page.waitForLoadState('networkidle');
            }
          }
        ],
        checkAccessibility: false // Set to true when @axe-core/playwright is installed
      }
    );

    // Validate that the component passed all tests
    expect(validation.isValid).toBe(true);

    // Log results for debugging
    console.log('Component validation results:', validation.results);

    // Check that screenshots were taken
    const screenshotResults = validation.results.filter(r => r.screenshotPath);
    expect(screenshotResults.length).toBeGreaterThan(0);
  });

  test('should test component interactions', async ({ page }) => {
    await page.goto('/');

    // Example: Test interactive elements
    // Replace with actual interactive components in your app

    // Test button interactions
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();

      // Test hover state
      await firstButton.hover();
      await page.waitForTimeout(200);

      // Take screenshot of hover state
      await takeComponentScreenshot(page, 'button:first-child', 'button-hover-state');

      // Test click if it's a safe action (not a form submission)
      // await firstButton.click();
    }
  });

  test('should test responsive behavior', async ({ page }) => {
    await page.goto('/');

    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Wait for layout to settle
      await page.waitForTimeout(500);

      // Test that main content is visible
      await expect(page.locator('main')).toBeVisible();

      // Take full page screenshot for this viewport
      await page.screenshot({
        path: `tests/screenshots/pages/homepage-${viewport.name}.png`,
        fullPage: true,
      });
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test how the app handles network errors or missing data

    // Block network requests to simulate offline state
    await page.route('**/*', route => {
      if (route.request().url().includes('/api/')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/');

    // The app should still render basic layout even without API data
    await expect(page.locator('body')).toBeVisible();

    // Take screenshot of error state
    await page.screenshot({
      path: 'tests/screenshots/error-states/network-offline.png',
      fullPage: true,
    });
  });
});

// Example of testing a specific component type
test.describe('Product Components', () => {
  test.skip('should test product card component', async ({ page }) => {
    // This is a template for testing product-specific components
    // Uncomment and modify when you have product pages

    /*
    await page.goto('/products/example-product');

    const productCard = page.locator('[data-testid="product-card"]');
    await expect(productCard).toBeVisible();

    // Test product image
    const productImage = productCard.locator('img');
    await expect(productImage).toBeVisible();

    // Test product title
    const productTitle = productCard.locator('h2, h3');
    await expect(productTitle).toBeVisible();

    // Test price display
    const price = productCard.locator('[data-testid="price"]');
    await expect(price).toBeVisible();

    // Take component screenshot
    await takeComponentScreenshot(page, '[data-testid="product-card"]', 'product-card');
    */
  });
});

// Example of testing form components
test.describe('Form Components', () => {
  test.skip('should test form validation', async ({ page }) => {
    // This is a template for testing form components
    // Uncomment and modify when you have forms

    /*
    await page.goto('/contact');

    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Test form submission with empty fields
    const submitButton = form.locator('button[type="submit"]');
    await submitButton.click();

    // Check for validation errors
    const errorMessages = page.locator('.error, [role="alert"]');
    await expect(errorMessages.first()).toBeVisible();

    // Take screenshot of validation state
    await takeComponentScreenshot(page, 'form', 'form-validation-errors');
    */
  });
});