# AI Testing for Solo Developers (No PRs Required)

## Overview

This workflow is designed for solo developers who work directly on `main` or feature branches without pull requests. AI analyzes your commits and creates actionable GitHub Issues with test suggestions.

## How It Works for Solo Development

### Your Workflow (Unchanged)
```bash
# 1. Make your changes
git add .
git commit -m "feat: add product filtering"

# 2. Push to GitHub
git push origin main

# 3. AI automatically analyzes and creates issues
# ✅ No PR needed!
```

### What Happens Automatically

1. **Push detected** → Workflow triggers
2. **AI analyzes changes** → Examines diff and context
3. **Tests run** → Existing Jest/Playwright tests execute
4. **Issue created** → GitHub Issue with test suggestions (if high-priority items found)
5. **Report generated** → Downloadable markdown report

## Three Ways to Get Test Suggestions

### 1. **GitHub Issues** (Automatic - Recommended)
When you push to `main`:
- AI creates a GitHub Issue with test suggestions
- Issue includes checkboxes for tracking
- Labeled with `testing` and `ai-suggested`
- Only creates issues for **high-priority** suggestions

**Example Issue:**
```
🧪 Test Suggestions: feat: add product filtering

## Summary
New filtering logic requires validation tests

### 🔧 Server Tests
- [ ] 🔴 unit - `apps/server/src/modules/product/__tests__/filter.unit.spec.ts`
  - Test product filtering by category, price range
  - High priority: Core business logic needs validation

### 🎨 Storefront Tests
- [ ] 🔴 e2e - `apps/storefront1/tests/product-filtering.spec.ts`
  - Test filter UI interactions
  - High priority: Critical user-facing feature
```

### 2. **Workflow Artifacts** (Always Available)
Every run generates a downloadable report:
1. Go to **Actions** tab
2. Click on latest workflow run
3. Download `test-suggestions-report` artifact
4. Open `test-suggestions.md` locally

### 3. **Action Logs** (Real-time)
View suggestions in workflow logs:
1. Go to **Actions** tab
2. Click on workflow run
3. Expand "Generate AI Test Suggestions" job
4. See JSON output in logs

## Triggering the Workflow

### Automatic Triggers
Workflow runs on push to:
- `main` branch
- `develop` branch
- Any `feature/*` branch

### Manual Trigger
Test on any branch without pushing:
1. Go to **Actions** → **AI-Powered Testing Assistant**
2. Click **Run workflow**
3. Select branch
4. Choose mode: `suggest`
5. View results in artifacts

## Customizing Trigger Branches

Edit `.github/workflows/ai-testing.yml`:

```yaml
on:
  push:
    branches:
      - main           # Your main branch
      - develop        # Development branch
      - 'feature/**'   # All feature branches
      # Add more patterns as needed
```

**Examples:**
```yaml
- 'feat/**'          # Branches like feat/filtering
- 'fix/**'           # Branches like fix/bug-123
- '!draft/**'        # Exclude draft branches
```

## Managing AI-Generated Issues

### Prevent Issue Spam
The workflow is smart:
- ✅ Only creates issues for **high-priority** tests
- ✅ Creates ONE issue per push (not per test)
- ✅ Uses meaningful commit message in title
- ✅ Skips if no critical tests needed

### Turn Off Issue Creation
If you prefer artifacts only, comment out this section:

```yaml
# - name: Create GitHub Issue (if push to main)
#   if: github.event_name == 'push' && github.ref == 'refs/heads/main'
#   ...
```

### Auto-Close Old Issues
Add to your workflow (optional):

```yaml
- name: Close old AI issues
  uses: actions/github-script@v7
  with:
    script: |
      const issues = await github.rest.issues.listForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        labels: 'ai-suggested',
        state: 'open'
      });

      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      for (const issue of issues.data) {
        if (new Date(issue.created_at) < weekAgo) {
          await github.rest.issues.update({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issue.number,
            state: 'closed'
          });
        }
      }
```

## Example Solo Workflow

### Morning: Add New Feature
```bash
git checkout -b feature/cart-subtotal
# ... make changes ...
git add apps/server/src/modules/cart/
git commit -m "feat: add cart subtotal calculation"
git push origin feature/cart-subtotal
```

**AI creates issue:**
- 🔴 Unit test for subtotal calculation logic
- 🔴 Integration test for cart API endpoint

### Afternoon: Implement Tests
1. Check GitHub Issues
2. See AI suggestions
3. Implement tests
4. Check off items in issue
5. Close issue when done

### Evening: Push to Main
```bash
git checkout main
git merge feature/cart-subtotal
git push origin main
```

**AI validates:**
- Runs all tests (including your new ones)
- Suggests any additional edge cases
- Creates issue if gaps found

## Cost Optimization for Solo Devs

### Reduce Trigger Frequency
Option 1: Only on main branch
```yaml
on:
  push:
    branches:
      - main  # Only production pushes
```

Option 2: Manual only
```yaml
on:
  workflow_dispatch:  # Remove push trigger
```

### Set Daily Limits
Add rate limiting (custom script):
```yaml
- name: Check daily limit
  run: |
    COUNT=$(gh run list --workflow=ai-testing.yml --created=$(date +%Y-%m-%d) --json conclusion | jq length)
    if [ $COUNT -gt 10 ]; then
      echo "Daily limit reached, skipping AI analysis"
      exit 0
    fi
```

### Skip for Small Changes
```yaml
- name: Check diff size
  run: |
    LINES=$(git diff ${{ github.event.before }} ${{ github.sha }} | wc -l)
    if [ $LINES -lt 20 ]; then
      echo "Small change, skipping AI analysis"
      exit 0
    fi
```

## Integration with Your Workflow

### Pre-Commit Hook (Optional)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
echo "💡 Tip: AI will analyze this commit after push"
echo "   Check GitHub Issues for test suggestions"
```

### Commit Message Template
```
feat: <description>

AI-Test-Priority: high|medium|low|skip
```

Then filter in workflow:
```yaml
- name: Check priority
  run: |
    PRIORITY=$(git log -1 --pretty=%B | grep "AI-Test-Priority:" | cut -d: -f2)
    if [ "$PRIORITY" == "skip" ]; then
      exit 0
    fi
```

### VS Code Integration
Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Check AI Test Suggestions",
      "type": "shell",
      "command": "gh run list --workflow=ai-testing.yml --limit 1 --json conclusion,url --jq '.[0].url' | xargs open"
    }
  ]
}
```

Run with `Cmd+Shift+P` → "Tasks: Run Task" → "Check AI Test Suggestions"

## Comparison: PR vs Push Workflow

| Feature | PR Workflow | Push Workflow (Solo) |
|---------|-------------|---------------------|
| **Trigger** | Pull request | Direct push |
| **Output** | PR comment | GitHub Issue |
| **Workflow** | Branch → PR → Review → Merge | Feature → Push → Issue → Implement |
| **Best For** | Teams | Solo developers |
| **Overhead** | Higher (PR management) | Lower (direct push) |
| **Tracking** | PR comments | Issues with checkboxes |

## Troubleshooting Solo Workflow

### Issue: No issues are created
**Reasons:**
- No high-priority suggestions (this is good!)
- AI analysis failed (check logs)
- Not pushing to `main` (check trigger branches)

**Solution:**
- Check workflow run in Actions tab
- Download artifact to see all suggestions
- Lower priority threshold in workflow

### Issue: Too many issues created
**Solution:**
Increase priority threshold:
```javascript
// Change from:
const hasHighPriority =
  suggestions.server?.some(t => t.priority === 'high') ||
  suggestions.storefront?.some(t => t.priority === 'high');

// To:
const hasHighPriority =
  (suggestions.server?.filter(t => t.priority === 'high').length > 2) ||
  (suggestions.storefront?.filter(t => t.priority === 'high').length > 2);
```

### Issue: Want suggestions but no issues
**Solution:**
Always use artifacts:
1. Every run creates `test-suggestions-report`
2. Download from Actions tab
3. Review locally
4. No GitHub Issue clutter

## Advanced: Local-First Approach

Prefer local files over GitHub Issues?

### Option 1: Commit Report to Repo
```yaml
- name: Commit report to repo
  run: |
    git config user.name "AI Testing Bot"
    git config user.email "bot@example.com"
    git add test-suggestions.md
    git commit -m "docs: AI test suggestions for ${{ github.sha }}"
    git push
```

### Option 2: Send to Email/Slack
```yaml
- name: Send email notification
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: "AI Test Suggestions: ${{ github.event.head_commit.message }}"
    body: file://test-suggestions.md
    to: you@example.com
```

### Option 3: Save to Notion/Linear
Use webhooks or integrations to post suggestions to your project management tool.

## Next Steps

1. **Setup** - Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. **Test** - Make a commit and watch it work
3. **Refine** - Adjust triggers and thresholds
4. **Automate** - Consider Phase 2 (auto-generation)

---

**You're in control**: The AI suggests, you decide. No PRs, no overhead, just helpful test recommendations when you need them.