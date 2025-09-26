# AI-Powered Testing Workflow

## Overview

This automated workflow uses Claude AI to analyze code changes and suggest appropriate tests, helping maintain code quality and catch regressions early.

**Works with or without Pull Requests!**
- **With PRs**: AI comments on pull requests
- **Without PRs** (Solo devs): AI creates GitHub Issues on push
- See [SOLO_WORKFLOW.md](./SOLO_WORKFLOW.md) for solo development guide

## How It Works

### Trigger Points
The workflow runs automatically on:
- **Pull Request events**: opened, synchronized (new commits), reopened
- **Manual trigger**: via GitHub Actions UI with configurable modes

### Workflow Jobs

#### 1. **Analyze Changes**
- Detects which parts of the codebase changed (server/storefront)
- Extracts git diff and changed file list
- Determines test scope

#### 2. **AI Test Suggestions**
- Gathers project context (architecture, existing tests, changes)
- Calls Claude API with structured prompt
- Receives JSON-formatted test suggestions including:
  - Test type (unit/integration/e2e)
  - File path for test
  - Description of what to test
  - Priority level (high/medium/low)
  - Reasoning for the test

#### 3. **Run Existing Tests**
- Executes relevant test suites based on changes:
  - **Server changes**: Jest unit + integration tests
  - **Storefront changes**: Playwright E2E tests
- Uploads test results and coverage reports

#### 4. **Comment on PR**
- Posts AI suggestions as formatted PR comment
- Updates existing comment instead of creating duplicates
- Includes priority indicators and clear action items

## Setup Requirements

### 1. Anthropic API Key
Add your Anthropic API key to GitHub repository secrets:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Claude API key from https://console.anthropic.com/

### 2. GitHub Token Permissions
Ensure the workflow has PR comment permissions:

1. Go to repository **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

## Cost Estimation

### Anthropic API Costs
- **Model**: Claude 3.5 Sonnet
- **Input**: ~$0.003 per 1K tokens
- **Output**: ~$0.015 per 1K tokens
- **Estimated per PR**: $0.50 - $2.00
- **Monthly (30 PRs)**: ~$15 - $60

### GitHub Actions
- **Free tier**: 2,000 minutes/month (private repos)
- **This workflow**: ~5-10 minutes per run
- **Likely within free tier** for most teams

## Testing Modes

### Mode 1: Suggest (Default)
**Current implementation** - Conservative approach:
- ✅ AI analyzes changes
- ✅ Suggests tests in PR comments
- ✅ Developers implement manually
- ✅ Low risk, high control

### Mode 2: Generate (Planned)
**Future enhancement** - Semi-automated:
- AI writes test files
- Commits to temporary branch
- Creates draft PR for review
- Moderate automation

### Mode 3: Full-Auto (Planned)
**Advanced automation** - Aggressive:
- AI generates and commits tests directly
- Tests run automatically
- Auto-updates PR
- Requires trust boundaries

## Manual Trigger

Run the workflow manually for experimentation:

1. Go to **Actions** tab
2. Select "AI-Powered Testing Assistant"
3. Click **Run workflow**
4. Choose mode: `suggest` (others coming soon)
5. Select branch
6. Click **Run workflow**

## Example Output

When the workflow runs, you'll see a PR comment like:

```markdown
## 🤖 AI Testing Assistant Report

### Summary
Added new product filtering feature - requires unit tests for the filter logic
and E2E tests for the UI interaction.

### 🔧 Server Test Suggestions

1. 🔴 **unit** - `apps/server/src/modules/product/__tests__/filter.unit.spec.ts`
   - Test product filtering by category, price range, and availability
   - *Reason:* New filtering logic needs validation for edge cases

2. 🟡 **integration** - `apps/server/integration-tests/http/products.spec.ts`
   - Test filter API endpoint with various query parameters
   - *Reason:* Ensure API correctly handles filter combinations

### 🎨 Storefront Test Suggestions

1. 🔴 **e2e** - `apps/storefront1/tests/product-filtering.spec.ts`
   - Test filter UI interactions and result updates
   - *Reason:* Critical user-facing functionality

---
*This is an automated suggestion. Review and implement tests as needed.*
```

## Best Practices

### For Developers
1. **Review AI suggestions critically** - AI is helpful but not perfect
2. **Prioritize high-priority tests first** (🔴)
3. **Adapt suggestions to your context** - use as starting point
4. **Add edge cases** the AI might miss
5. **Update existing tests** when refactoring

### For Teams
1. **Start conservative** - use "suggest" mode initially
2. **Build trust gradually** - increase automation over time
3. **Monitor costs** - track API usage in Anthropic console
4. **Refine prompts** - customize for your domain
5. **Share learnings** - document what works

## Customization

### Adjust AI Prompt
Edit the prompt in `.github/workflows/ai-testing.yml` at line ~140 to:
- Focus on specific test types
- Include domain-specific context
- Enforce testing standards
- Reference internal guidelines

### Modify Test Scope
Edit the test matrix at line ~240 to:
- Add new test types
- Change test commands
- Adjust conditions

### Change Trigger Conditions
Edit the `on:` section to trigger on:
- Specific branches only
- Specific file patterns
- Scheduled runs (cron)

## Troubleshooting

### Issue: Workflow doesn't run
**Solution**: Check branch protection rules and workflow permissions

### Issue: AI suggestions are generic
**Solution**: Enhance context gathering to include more project-specific info

### Issue: API rate limits
**Solution**: Implement caching or reduce frequency

### Issue: Tests fail in CI but pass locally
**Solution**: Check environment differences, database state, timing issues

## Future Enhancements

### Phase 2 (Planned)
- [ ] Auto-generate test files
- [ ] Visual regression tracking
- [ ] Test coverage delta reporting

### Phase 3 (Planned)
- [ ] Auto-fix failing tests
- [ ] Performance regression detection
- [ ] Security test suggestions

### Phase 4 (Planned)
- [ ] Multi-model comparison
- [ ] Cost optimization
- [ ] Team analytics dashboard

## Architecture Diagram

```
┌─────────────┐
│   Git Push  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  GitHub Actions     │
│  Trigger on PR      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Analyze Changes    │
│  - Git diff         │
│  - Changed files    │
│  - Detect scope     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Gather Context     │
│  - Project info     │
│  - Existing tests   │
│  - Code changes     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Call Claude API    │
│  - Send context     │
│  - Get suggestions  │
│  - Parse JSON       │
└──────┬──────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Run Tests      │  │  Post Comment   │
│  - Jest         │  │  - Format       │
│  - Playwright   │  │  - Prioritize   │
│  - Coverage     │  │  - Action items │
└─────────────────┘  └─────────────────┘
```

## Contributing

To improve this workflow:
1. Test changes in a fork first
2. Document new features in this file
3. Update cost estimates if adding API calls
4. Consider backward compatibility

## Support

- **Workflow Issues**: Check GitHub Actions logs
- **AI Quality**: Refine prompts or provide more context
- **Cost Concerns**: Adjust frequency or scope
- **Feature Requests**: Open an issue in the repository