# Component Testing Guide for AI Agents

## Overview

This guide provides step-by-step instructions for AI agents to test their work after implementing frontend components in the ADHD Toys storefront. The testing approach is designed to work seamlessly with your preferred development workflow of keeping the dev server running.

## Quick Start Checklist

Before running any tests, ensure you have the required dependencies:

```bash
cd apps/storefront1

# Install Playwright if not already installed
bun add -D @playwright/test

# Install browsers (one-time setup)
bunx playwright install
```

## Essential Testing Commands

### 1. Server Detection Test
Always run this first to ensure your tests can connect to the development server:

```bash
cd apps/storefront1
bunx playwright test tests/example-component.spec.ts --grep "server"
```

### 2. Visual Component Testing
Test visual appearance and responsiveness:

```bash
# Test all components visually
bunx playwright test --grep "visual"

# Test responsive behavior
bunx playwright test --grep "responsive"

# Generate visual report
bunx playwright show-report
```

### 3. Interactive Component Testing
Test user interactions and component behavior:

```bash
# Test component interactions
bunx playwright test --grep "interactions"

# Test form validation (if applicable)
bunx playwright test --grep "form"
```

### 4. Cross-Browser Testing
Validate consistency across browsers:

```bash
# Test in all configured browsers
bunx playwright test

# Test only in Chromium (fastest for development)
bunx playwright test --project=chromium

# Test mobile behavior
bunx playwright test --project="Mobile Chrome"
```

## Step-by-Step Testing Workflow

### Phase 1: Pre-Testing Validation

1. **Check Server Status**
   ```typescript
   import { validateServerForTesting } from './tests/utils/server-check';

   const serverCheck = await validateServerForTesting();
   console.log(serverCheck.message);
   ```

2. **Verify Component Structure**
   - Ensure your component is accessible via URL or selector
   - Check that required test IDs are present
   - Validate that component renders without JavaScript errors

### Phase 2: Basic Component Testing

1. **Visibility Test**
   ```typescript
   const component = page.locator('[data-testid="your-component"]');
   await expect(component).toBeVisible();
   ```

2. **Screenshot Test**
   ```typescript
   import { takeComponentScreenshot } from './tests/utils/visual-testing';

   await takeComponentScreenshot(
     page,
     '[data-testid="your-component"]',
     'your-component-name'
   );
   ```

### Phase 3: Comprehensive Validation

1. **Responsive Testing**
   ```typescript
   import { testComponentResponsiveness } from './tests/utils/visual-testing';

   const results = await testComponentResponsiveness(
     page,
     '[data-testid="your-component"]',
     'your-component-name'
   );
   ```

2. **State Testing**
   ```typescript
   import { testComponentStates } from './tests/utils/visual-testing';

   const results = await testComponentStates(
     page,
     '[data-testid="your-component"]',
     'your-component-name',
     [
       {
         name: 'hover',
         action: async (element) => {
           await element.hover();
           await page.waitForTimeout(200);
         }
       }
     ]
   );
   ```

### Phase 4: Integration Testing

1. **Data Flow Testing**
   - Test API integration if component fetches data
   - Validate error states and loading states
   - Test component with different data scenarios

2. **User Journey Testing**
   - Test component within complete user workflows
   - Validate component behavior in context
   - Test navigation and state persistence

## Creating Test Files

### Template for New Component Tests

```typescript
import { test, expect } from '@playwright/test';
import { validateServerForTesting } from '../utils/server-check';
import { validateComponent } from '../utils/visual-testing';

test.describe('ComponentName', () => {
  test.beforeEach(async () => {
    const serverCheck = await validateServerForTesting();
    if (!serverCheck.canProceed) {
      throw new Error(serverCheck.message);
    }
  });

  test('should render correctly', async ({ page }) => {
    await page.goto('/page-with-component');

    const validation = await validateComponent(
      page,
      '[data-testid="component-name"]',
      'component-name',
      {
        testResponsiveness: true,
        testStates: [
          { name: 'hover', action: async (el) => await el.hover() }
        ]
      }
    );

    expect(validation.isValid).toBe(true);
  });
});
```

### File Naming Conventions

- `component-name.spec.ts` - For specific component tests
- `page-name.spec.ts` - For page-level tests
- `integration-name.spec.ts` - For integration tests
- `visual-regression.spec.ts` - For visual regression tests

## Testing Different Component Types

### 1. UI Components (Buttons, Cards, etc.)

```typescript
test('button component', async ({ page }) => {
  await page.goto('/component-page');

  const button = page.locator('[data-testid="button"]');

  // Test visibility
  await expect(button).toBeVisible();

  // Test states
  await button.hover();
  await takeComponentScreenshot(page, '[data-testid="button"]', 'button-hover');

  await button.focus();
  await takeComponentScreenshot(page, '[data-testid="button"]', 'button-focus');

  // Test click behavior (if safe)
  await button.click();
  // Add assertions for expected behavior
});
```

### 2. Form Components

```typescript
test('form component', async ({ page }) => {
  await page.goto('/form-page');

  const form = page.locator('form');
  const input = form.locator('input[name="email"]');
  const submitButton = form.locator('button[type="submit"]');

  // Test empty form submission
  await submitButton.click();
  await expect(page.locator('.error')).toBeVisible();

  // Test valid input
  await input.fill('test@example.com');
  await submitButton.click();

  // Take screenshots of different states
  await takeComponentScreenshot(page, 'form', 'form-filled');
});
```

### 3. Navigation Components

```typescript
test('navigation component', async ({ page }) => {
  await page.goto('/');

  const nav = page.locator('nav');
  await expect(nav).toBeVisible();

  // Test mobile menu toggle (if applicable)
  await page.setViewportSize({ width: 375, height: 667 });
  const mobileMenuButton = page.locator('[data-testid="mobile-menu-toggle"]');

  if (await mobileMenuButton.isVisible()) {
    await mobileMenuButton.click();
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  }
});
```

### 4. Product Components

```typescript
test('product component', async ({ page }) => {
  await page.goto('/products/test-product');

  const productCard = page.locator('[data-testid="product-card"]');
  await expect(productCard).toBeVisible();

  // Test product image
  const image = productCard.locator('img');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('alt');

  // Test price display
  const price = productCard.locator('[data-testid="price"]');
  await expect(price).toBeVisible();
  await expect(price).toContainText(/\$\d+/);
});
```

## Visual Testing Best Practices

### 1. Screenshot Organization
```
tests/screenshots/
├── components/           # Individual component screenshots
│   ├── button-default.png
│   ├── button-hover.png
│   └── card-mobile.png
├── pages/               # Full page screenshots
│   ├── homepage-desktop.png
│   └── homepage-mobile.png
└── error-states/        # Error condition screenshots
    └── network-offline.png
```

### 2. Responsive Testing Strategy
Always test these viewports:
- Mobile: 375x667 (iPhone SE)
- Tablet: 768x1024 (iPad)
- Desktop: 1920x1080 (Common desktop)

### 3. Component State Testing
Test these states for interactive components:
- Default state
- Hover state
- Focus state
- Active state
- Error state
- Loading state

## Performance Testing

### Core Web Vitals Testing
```typescript
test('performance metrics', async ({ page }) => {
  await page.goto('/');

  // Measure LCP (Largest Contentful Paint)
  const lcp = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  });

  expect(lcp).toBeLessThan(2500); // Good LCP is under 2.5s
});
```

## Accessibility Testing

### Basic Accessibility Checks
```typescript
test('accessibility', async ({ page }) => {
  await page.goto('/component-page');

  // Test keyboard navigation
  await page.keyboard.press('Tab');
  const focusedElement = await page.locator(':focus');
  await expect(focusedElement).toBeVisible();

  // Test ARIA labels
  const button = page.locator('button');
  await expect(button).toHaveAttribute('aria-label');

  // Test color contrast (manual check needed)
  await takeComponentScreenshot(page, 'main', 'accessibility-check');
});
```

## Error Handling Testing

### Network Error Simulation
```typescript
test('handles network errors', async ({ page }) => {
  // Block API requests
  await page.route('**/api/**', route => route.abort());

  await page.goto('/');

  // Component should still render basic layout
  await expect(page.locator('main')).toBeVisible();

  // Check for error messages
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible();
});
```

## Test Reporting

### Generate Reports
```bash
# Run tests and generate HTML report
bunx playwright test
bunx playwright show-report

# Generate JSON report for CI
bunx playwright test --reporter=json:test-results.json
```

### Custom Test Reports
```typescript
import { generateVisualReport } from './utils/visual-testing';

// After running visual tests
const reportPath = await generateVisualReport(testResults);
console.log(`Visual test report generated: ${reportPath}`);
```

## Troubleshooting Common Issues

### 1. Server Not Detected
```bash
# Check if server is actually running
curl -f http://sharewear.local:8201 >/dev/null 2>&1 && echo "Running" || echo "Not running"

# Start server if needed
cd apps/storefront1 && bun run dev
```

### 2. Test Timeouts
```typescript
// Increase timeout for slow operations
test('slow loading component', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds

  await page.goto('/slow-page');
  await page.waitForLoadState('networkidle');
});
```

### 3. Screenshot Differences
```bash
# Update baseline screenshots if changes are intentional
bunx playwright test --update-snapshots
```

### 4. Browser Installation Issues
```bash
# Reinstall browsers
bunx playwright install --force
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Playwright tests
  run: |
    cd apps/storefront1
    bunx playwright test
  env:
    CI: true

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: apps/storefront1/playwright-report/
```

## Success Criteria

Before declaring component work complete, ensure:

- [ ] All tests pass in at least Chromium
- [ ] Component renders correctly on mobile, tablet, and desktop
- [ ] Interactive elements work as expected
- [ ] Screenshots are generated and look correct
- [ ] No TypeScript compilation errors
- [ ] No linting errors
- [ ] Performance is acceptable (LCP < 2.5s)
- [ ] Basic accessibility requirements are met

## Quick Commands Reference

```bash
# Essential commands for AI agents
cd apps/storefront1

# Check server status
curl -f http://sharewear.local:8201

# Run all tests
bunx playwright test

# Run specific test
bunx playwright test tests/your-component.spec.ts

# Run tests in headed mode (see browser)
bunx playwright test --headed

# Update screenshots
bunx playwright test --update-snapshots

# Generate report
bunx playwright show-report

# Run only Chromium (fastest)
bunx playwright test --project=chromium

# Debug mode
bunx playwright test --debug
```

This guide ensures that AI agents can comprehensively test their work while respecting your development workflow and providing the confidence that components work correctly across all scenarios.