/**
 * Visual Testing Utilities
 *
 * These utilities help AI agents perform visual regression testing and component validation
 * without disrupting the user's development workflow.
 */

import { Page, Locator, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

export interface ScreenshotOptions {
  fullPage?: boolean;
  mask?: Locator[];
  clip?: { x: number; y: number; width: number; height: number };
  animations?: 'disabled' | 'allow';
  threshold?: number;
}

export interface ComponentTestResult {
  componentName: string;
  selector: string;
  isVisible: boolean;
  screenshotPath?: string;
  dimensions?: { width: number; height: number };
  errors?: string[];
}

/**
 * Take a screenshot of a specific component
 */
export async function takeComponentScreenshot(
  page: Page,
  selector: string,
  name: string,
  options: ScreenshotOptions = {}
): Promise<string> {
  const element = page.locator(selector);

  // Wait for element to be visible
  await expect(element).toBeVisible({ timeout: 10000 });

  // Wait for any animations to complete
  if (options.animations === 'disabled') {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
        }
      `
    });
  }

  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(process.cwd(), 'tests', 'screenshots');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const screenshotPath = path.join(screenshotsDir, `${name}.png`);

  await element.screenshot({
    path: screenshotPath,
    ...options,
  });

  return screenshotPath;
}

/**
 * Take a full page screenshot with optional masking
 */
export async function takePageScreenshot(
  page: Page,
  name: string,
  options: ScreenshotOptions = {}
): Promise<string> {
  const screenshotsDir = path.join(process.cwd(), 'tests', 'screenshots', 'pages');
  await fs.mkdir(screenshotsDir, { recursive: true });

  const screenshotPath = path.join(screenshotsDir, `${name}.png`);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    ...options,
  });

  return screenshotPath;
}

/**
 * Compare component across different viewports
 */
export async function testComponentResponsiveness(
  page: Page,
  selector: string,
  componentName: string,
  viewports: Array<{ name: string; width: number; height: number }> = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ]
): Promise<ComponentTestResult[]> {
  const results: ComponentTestResult[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // Wait for any layout shifts
    await page.waitForTimeout(500);

    const element = page.locator(selector);
    const isVisible = await element.isVisible();

    let screenshotPath: string | undefined;
    let dimensions: { width: number; height: number } | undefined;
    const errors: string[] = [];

    try {
      if (isVisible) {
        screenshotPath = await takeComponentScreenshot(
          page,
          selector,
          `${componentName}-${viewport.name}`,
          { animations: 'disabled' }
        );

        const boundingBox = await element.boundingBox();
        if (boundingBox) {
          dimensions = { width: boundingBox.width, height: boundingBox.height };
        }
      } else {
        errors.push(`Component not visible at ${viewport.name} viewport`);
      }
    } catch (error) {
      errors.push(`Failed to capture component at ${viewport.name}: ${error}`);
    }

    results.push({
      componentName: `${componentName}-${viewport.name}`,
      selector,
      isVisible,
      screenshotPath,
      dimensions,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  return results;
}

/**
 * Test component in different states (hover, focus, active, etc.)
 */
export async function testComponentStates(
  page: Page,
  selector: string,
  componentName: string,
  states: Array<{
    name: string;
    action: (element: Locator) => Promise<void>;
  }> = []
): Promise<ComponentTestResult[]> {
  const results: ComponentTestResult[] = [];
  const element = page.locator(selector);

  // Default states to test
  const defaultStates = [
    {
      name: 'default',
      action: async () => {
        // Just wait for element to be stable
        await element.waitFor({ state: 'visible' });
      },
    },
    {
      name: 'hover',
      action: async (el: Locator) => {
        await el.hover();
        await page.waitForTimeout(200);
      },
    },
    {
      name: 'focus',
      action: async (el: Locator) => {
        await el.focus();
        await page.waitForTimeout(200);
      },
    },
  ];

  const allStates = [...defaultStates, ...states];

  for (const state of allStates) {
    try {
      await state.action(element);

      const isVisible = await element.isVisible();
      let screenshotPath: string | undefined;

      if (isVisible) {
        screenshotPath = await takeComponentScreenshot(
          page,
          selector,
          `${componentName}-${state.name}`,
          { animations: 'disabled' }
        );
      }

      results.push({
        componentName: `${componentName}-${state.name}`,
        selector,
        isVisible,
        screenshotPath,
      });
    } catch (error) {
      results.push({
        componentName: `${componentName}-${state.name}`,
        selector,
        isVisible: false,
        errors: [`Failed to test ${state.name} state: ${error}`],
      });
    }
  }

  return results;
}

/**
 * Visual regression test helper
 */
export async function compareVisual(
  page: Page,
  name: string,
  options: ScreenshotOptions = {}
): Promise<void> {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    threshold: options.threshold || 0.3,
    animations: options.animations || 'disabled',
    mask: options.mask,
    fullPage: options.fullPage,
    clip: options.clip,
  });
}

/**
 * Wait for all images and fonts to load
 */
export async function waitForResourcesLoaded(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');

  // Wait for images to load
  await page.waitForFunction(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.every(img => img.complete);
  });

  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready);
}

/**
 * Comprehensive component validation
 */
export async function validateComponent(
  page: Page,
  selector: string,
  componentName: string,
  options: {
    testResponsiveness?: boolean;
    testStates?: Array<{ name: string; action: (element: Locator) => Promise<void> }>;
    checkAccessibility?: boolean;
  } = {}
): Promise<{
  isValid: boolean;
  results: ComponentTestResult[];
  accessibilityIssues?: any[];
}> {
  const results: ComponentTestResult[] = [];
  let accessibilityIssues: any[] | undefined;

  // Wait for resources to load
  await waitForResourcesLoaded(page);

  // Basic visibility test
  const element = page.locator(selector);
  const isVisible = await element.isVisible();

  if (!isVisible) {
    return {
      isValid: false,
      results: [{
        componentName,
        selector,
        isVisible: false,
        errors: ['Component is not visible'],
      }],
    };
  }

  // Take basic screenshot
  const screenshotPath = await takeComponentScreenshot(page, selector, componentName);
  results.push({
    componentName,
    selector,
    isVisible: true,
    screenshotPath,
  });

  // Test responsiveness if requested
  if (options.testResponsiveness) {
    const responsivenessResults = await testComponentResponsiveness(
      page,
      selector,
      componentName
    );
    results.push(...responsivenessResults);
  }

  // Test states if provided
  if (options.testStates && options.testStates.length > 0) {
    const stateResults = await testComponentStates(
      page,
      selector,
      componentName,
      options.testStates
    );
    results.push(...stateResults);
  }

  // Check accessibility if requested
  if (options.checkAccessibility) {
    try {
      // This would require @axe-core/playwright
      // accessibilityIssues = await page.accessibility.snapshot();
    } catch (error) {
      console.warn('Accessibility check failed:', error);
    }
  }

  const isValid = results.every(result =>
    result.isVisible && (!result.errors || result.errors.length === 0)
  );

  return {
    isValid,
    results,
    accessibilityIssues,
  };
}

/**
 * Generate a visual testing report
 */
export async function generateVisualReport(
  results: ComponentTestResult[],
  outputPath?: string
): Promise<string> {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.isVisible && (!r.errors || r.errors.length === 0)).length,
      failed: results.filter(r => !r.isVisible || (r.errors && r.errors.length > 0)).length,
    },
    results,
  };

  const reportsDir = path.join(process.cwd(), 'tests', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  const reportPath = outputPath || path.join(reportsDir, `visual-report-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  return reportPath;
}