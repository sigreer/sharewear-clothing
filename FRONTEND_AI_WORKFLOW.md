# Frontend AI Development Workflow

## Overview

This document outlines the comprehensive workflow for AI-assisted development of the NextJS storefront (`apps/storefront1`).

## Project Structure Context

- **Storefront Location**: `apps/storefront1/`
- **Development Port**: 8201 (configured in package.json)
- **Framework**: Next.js 15 with React 19 RC
- **Styling**: Tailwind CSS with ShadCNUI design system
- **Key Dependencies**: Medusa JS SDK, Framer Motion, Lucide React

## Core Workflow Principles

### 1. **Smart Server Detection**
AI agents must ALWAYS check for running servers before taking action:

```bash
# Primary check - your preferred port
curl -f http://localhost:8201 >/dev/null 2>&1

# If server is running, proceed with testing using the existing server.
# If the server is not running, start a new server instance with
# bun run dev from the apps/server dir
```

### 2. **Non-Intrusive Testing**
- Tests run against the live development server
- Visual validation without disrupting development flow
- Automated screenshots for component verification
- Real-time feedback on changes

## Pre-Work Validation Checklist

Before any AI agent begins work, they must complete this checklist:

### Server Status Check
```bash
# 1. Check if development server is running
if curl -f http://localhost:8201 >/dev/null 2>&1; then
  echo "✅ Dev server detected on port 8201"
  SERVER_URL="http://localhost:8201"
else
  echo "❌ No dev server detected on port 8201"
  echo "Please start the server with: cd apps/storefront1 && bun run dev"
  exit 1
fi
```

### Component Structure Validation
```bash
# 2. Verify component directories exist
ls apps/storefront1/src/components/
ls apps/storefront1/src/app/
```

### Dependencies Check
```bash
# 3. Ensure testing dependencies are available
cd apps/storefront1
bun list | grep -E "(playwright|@playwright)"
```

## Development Workflow

### Phase 1: Analysis & Planning
1. **Understand the Request**: Parse user requirements for component/visual changes
2. **Examine Existing Code**: Review current implementation patterns
3. **Plan Changes**: Create a structured plan with specific deliverables
4. **Validate Environment**: Complete pre-work checklist

### Phase 2: Implementation
1. **Make Changes**: Implement requested modifications
2. **Follow Patterns**: Use existing component patterns and styling approaches
3. **Real-time Validation**: Monitor changes in the running dev server
4. **Incremental Testing**: Test individual components as they're modified

### Phase 3: Validation & Testing
1. **Visual Verification**: Take screenshots of affected components
2. **Functional Testing**: Verify interactive elements work correctly
3. **Responsive Testing**: Check mobile and desktop layouts
4. **Cross-browser Validation**: Test in multiple browsers if critical

### Phase 4: Documentation & Handoff
1. **Document Changes**: Note what was modified and why
2. **Provide Testing Instructions**: How to manually verify the changes
3. **List Files Modified**: Clear summary of all changed files
4. **Suggest Next Steps**: Recommend additional improvements if relevant

## Testing Infrastructure

### Playwright Setup
```bash
# Install Playwright (if not already installed)
cd apps/storefront1
bun add -D @playwright/test
bunx playwright install
```

### Configuration Template
Create `apps/storefront1/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8201',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:8201',
    reuseExistingServer: true, // Key setting for your workflow
  },
});
```

### Visual Testing Utilities
Create testing utilities in `apps/storefront1/tests/utils/`:

#### Server Detection Utility
```typescript
// tests/utils/server-check.ts
export async function checkDevServer(port: number = 8201): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}`);
    return response.ok;
  } catch {
    return false;
  }
}
```

#### Visual Comparison Utility
```typescript
// tests/utils/visual-testing.ts
import { Page, expect } from '@playwright/test';

export async function takeComponentScreenshot(
  page: Page,
  selector: string,
  name: string
) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await element.screenshot({ path: `tests/screenshots/${name}.png` });
}
```

## AI Agent Roles & Responsibilities

### Frontend React Developer Agent
**Primary Focus**: Component development, state management, React patterns

**Key Responsibilities**:
- Implement React components following project patterns
- Manage component state and props effectively
- Optimize rendering performance
- Ensure TypeScript compliance
- Follow existing code conventions

**Success Criteria**:
- Components render without errors
- TypeScript passes without issues
- Follows established component patterns
- Maintains performance standards

### Visual Designer Agent
**Primary Focus**: UI/UX implementation, styling, responsive design

**Key Responsibilities**:
- Implement visual designs with Tailwind CSS
- Ensure responsive behavior across devices
- Maintain design system consistency
- Optimize for accessibility
- Create smooth animations with Framer Motion

**Success Criteria**:
- Visual accuracy matches design requirements
- Responsive design works on all screen sizes
- Accessibility standards are met
- Animations enhance user experience

### Testing Agent
**Primary Focus**: Quality assurance, automated testing, validation

**Key Responsibilities**:
- Create and run automated tests
- Perform visual regression testing
- Validate component functionality
- Document test results
- Identify potential issues

**Success Criteria**:
- All tests pass successfully
- Visual regressions are caught
- Components work across browsers
- Documentation is complete

### Integration Agent
**Primary Focus**: API integration, data flow, performance optimization

**Key Responsibilities**:
- Integrate with Medusa backend APIs
- Implement data fetching patterns
- Optimize API calls and caching
- Handle error states gracefully
- Ensure data flow integrity

**Success Criteria**:
- API integrations work correctly
- Error handling is robust
- Performance is optimized
- Data flow is predictable

## Common Commands & Scripts

### Server Management
```bash
# Start development server (if needed)
cd apps/storefront1 && bun run dev

# Check if server is running
curl -f http://localhost:8201 >/dev/null 2>&1 && echo "Server running" || echo "Server not running"

# Build for production testing
cd apps/storefront1 && bun run build
```

### Testing Commands
```bash
# Run Playwright tests
cd apps/storefront1 && bunx playwright test

# Run tests in headed mode (for debugging)
cd apps/storefront1 && bunx playwright test --headed

# Generate test report
cd apps/storefront1 && bunx playwright show-report
```

### Linting & Type Checking
```bash
# Run ESLint
cd apps/storefront1 && bun run lint

# Type check with TypeScript
cd apps/storefront1 && bunx tsc --noEmit
```

## File Organization

### Component Structure
```
apps/storefront1/src/components/
├── ui/           # Reusable UI components
├── search/       # Search-related components
├── kokonutui/    # KokonutUI components
└── layout/       # Layout components
```

### Testing Structure
```
apps/storefront1/tests/
├── components/   # Component-specific tests
├── pages/        # Page-level tests
├── utils/        # Testing utilities
├── screenshots/  # Visual regression screenshots
└── fixtures/     # Test data and fixtures
```

## Best Practices for AI Agents

### 1. **Always Check Server First**
Never assume the server needs to be started. Always check if it's already running.

### 2. **Follow Existing Patterns**
Study existing components before creating new ones. Maintain consistency.

### 3. **Test Incrementally**
Don't wait until the end to test. Validate changes as you make them.

### 4. **Document Thoroughly**
Explain what you did, why you did it, and how to verify it works.

### 5. **Respect User Workflow**
Don't disrupt the user's development environment. Work alongside, not against.

### 6. **Provide Clear Instructions**
Give the user specific steps to verify your work manually.

## Troubleshooting

### Port Conflicts
If port 8201 is in use by something other than the Next.js dev server:
```bash
# Find what's using the port
lsof -i :8201

# Or use netstat
netstat -tlnp | grep 8201
```

### Server Not Responding
If the server is running but not responding:
```bash
# Check server health
curl -I http://localhost:8201

# Check Next.js specific endpoints
curl http://localhost:8201/_next/static/
```

### Build Issues
If builds are failing:
```bash
# Clean build cache
cd apps/storefront1 && rm -rf .next

# Reinstall dependencies
cd apps/storefront1 && rm -rf node_modules && bun install
```

## Success Metrics

### For AI Agents
- [ ] Server detection works 100% of the time
- [ ] No unnecessary server restarts
- [ ] All tests pass before completion
- [ ] Visual regressions are caught
- [ ] Components work across devices
- [ ] Code follows project patterns
- [ ] TypeScript compiles without errors
- [ ] Performance remains optimal

### For User Experience
- [ ] Development flow is uninterrupted
- [ ] Changes are visible in real-time
- [ ] Testing provides confidence
- [ ] Documentation is helpful
- [ ] Issues are caught early
- [ ] Handoff is smooth

This workflow ensures that AI agents can effectively contribute to your frontend development while respecting your preferred development environment and providing robust testing capabilities.