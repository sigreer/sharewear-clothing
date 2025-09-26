# AI Testing Workflow - Setup Guide

## Quick Start (5 Minutes)

> **Solo Developer?** This workflow works great without pull requests! See [SOLO_WORKFLOW.md](./SOLO_WORKFLOW.md) for push-based testing.


### Step 1: Get Anthropic API Key

1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)

### Step 2: Add Secret to GitHub

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Navigate to **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Fill in:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Secret**: Paste your API key
6. Click **Add secret**

### Step 3: Enable Workflow Permissions

1. Still in **Settings**, go to **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
4. Click **Save**

### Step 4: Test the Workflow

#### Option A: Create a Test PR
```bash
git checkout -b test-ai-workflow
echo "// Test change" >> apps/server/src/api/test.ts
git add .
git commit -m "test: trigger AI workflow"
git push origin test-ai-workflow
```

Then create a PR on GitHub and watch the workflow run!

#### Option B: Manual Trigger
1. Go to **Actions** tab
2. Select "AI-Powered Testing Assistant" workflow
3. Click **Run workflow**
4. Choose branch and mode
5. Click **Run workflow**

## Verification Checklist

After setup, verify:

- [ ] `ANTHROPIC_API_KEY` secret exists
- [ ] Workflow permissions are enabled
- [ ] Workflow file exists at `.github/workflows/ai-testing.yml`
- [ ] First test run completes successfully
- [ ] PR comment appears with AI suggestions

## Common Setup Issues

### Issue 1: Workflow doesn't trigger
**Symptoms**: No workflow run when PR is created

**Solutions**:
1. Check workflow file is in `.github/workflows/` directory
2. Verify YAML syntax is valid
3. Ensure workflow is not disabled in Actions settings
4. Check branch protection rules aren't blocking Actions

### Issue 2: API key error
**Symptoms**: Workflow fails with authentication error

**Solutions**:
1. Verify secret name is exactly `ANTHROPIC_API_KEY`
2. Check API key is valid in Anthropic console
3. Ensure no extra spaces in the secret value
4. Try regenerating the API key

### Issue 3: Permission denied on PR comment
**Symptoms**: Workflow succeeds but no PR comment

**Solutions**:
1. Enable "Read and write permissions" in Actions settings
2. Enable "Allow GitHub Actions to create and approve pull requests"
3. Check if branch protection requires review before commenting

### Issue 4: Tests not running
**Symptoms**: AI suggestions work but tests don't run

**Solutions**:
1. Ensure Bun is installed in workflow (should be automatic)
2. Check test commands in `package.json` are correct
3. Verify dependencies install successfully
4. Check for database/environment setup issues

## Advanced Configuration

### Set API Rate Limits

Add to workflow env section:
```yaml
env:
  MAX_API_CALLS_PER_RUN: 3
  API_TIMEOUT_SECONDS: 30
```

### Customize for Private Repos

If using GitHub private repository:
```yaml
jobs:
  analyze-changes:
    runs-on: ubuntu-latest
    timeout-minutes: 10  # Prevent runaway costs
```

### Add Cost Notifications

Create `.github/workflows/cost-monitor.yml`:
```yaml
name: Monitor AI Testing Costs

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Check Anthropic usage
        run: |
          # Add script to query Anthropic API for usage
          # Send notification if exceeds threshold
```

## Team Setup

### For Team Admins

1. **Set up shared API key**:
   - Use team/organization Anthropic account
   - Set billing limits in Anthropic console
   - Monitor usage regularly

2. **Configure repository settings**:
   - Enable required status checks
   - Set up CODEOWNERS for workflow changes
   - Document any custom configurations

3. **Train team members**:
   - Share this guide
   - Demonstrate first PR with AI suggestions
   - Set expectations for AI suggestion quality

### For Team Members

1. **Understand the workflow**:
   - Read `AI_TESTING_WORKFLOW.md`
   - Review example suggestions
   - Know when to trust vs. validate AI

2. **Best practices**:
   - Always review AI suggestions critically
   - Prioritize high-priority items first
   - Adapt suggestions to your specific context
   - Report any issues with suggestions

## Cost Management

### Monitor Usage

Check costs regularly:
1. Go to https://console.anthropic.com/
2. Navigate to **Usage** section
3. Review API call history and costs

### Set Budget Alerts

In Anthropic console:
1. Go to **Settings** → **Billing**
2. Set up budget notifications
3. Configure spending limits

### Optimize Costs

Reduce API calls by:
- Triggering only on PR (not every push)
- Limiting to changed files only
- Caching context when possible
- Using smaller context windows

### Expected Costs

**For a typical team**:
- 5 developers
- 20 PRs/week
- Average $1/PR
- **Monthly cost: ~$80**

**Ways to reduce**:
- Run only on labeled PRs (`ai-test` label)
- Skip for docs-only changes
- Use manual trigger for expensive analyses

## Security Considerations

### API Key Security

⚠️ **Never commit API keys to code**

Best practices:
- Use GitHub Secrets (encrypted)
- Rotate keys periodically
- Use separate keys for dev/prod
- Monitor for unauthorized usage

### Workflow Security

The workflow only:
- ✅ Reads code changes (safe)
- ✅ Generates test suggestions (safe)
- ✅ Comments on PRs (safe)
- ❌ Does NOT modify production code
- ❌ Does NOT access external systems
- ❌ Does NOT store sensitive data

### Data Privacy

What's sent to Anthropic:
- Git diff (code changes only)
- File paths
- Test file names
- Project structure info

**Not sent**:
- Secrets/credentials
- API keys
- Database contents
- User data

## Maintenance

### Weekly Tasks
- [ ] Review AI suggestion quality
- [ ] Check workflow success rate
- [ ] Monitor API costs

### Monthly Tasks
- [ ] Analyze most useful suggestions
- [ ] Refine prompts based on feedback
- [ ] Update documentation
- [ ] Review and rotate API keys

### Quarterly Tasks
- [ ] Evaluate ROI (time saved vs. cost)
- [ ] Consider upgrading to auto-generation
- [ ] Train team on new features
- [ ] Review security practices

## Next Steps

After successful setup:

1. **Week 1**: Monitor and observe
   - Let AI suggest tests
   - Don't implement everything
   - Learn what works

2. **Week 2-4**: Refine and optimize
   - Improve prompts for your domain
   - Adjust priority thresholds
   - Share team learnings

3. **Month 2**: Consider automation
   - Evaluate "generate" mode
   - Set up auto-test creation
   - Implement safety guardrails

4. **Month 3+**: Full integration
   - Make it part of standard workflow
   - Expand to other automation
   - Contribute improvements back

## Support Resources

- **Workflow Documentation**: [AI_TESTING_WORKFLOW.md](./AI_TESTING_WORKFLOW.md)
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Anthropic API Docs**: https://docs.anthropic.com/
- **Project Issues**: [GitHub Issues](../../issues)

## Feedback

Help us improve this workflow:
1. Open an issue for bugs or suggestions
2. Share successful test suggestions
3. Document edge cases
4. Contribute prompt improvements

---

**Setup complete?** Create your first test PR and watch the AI work! 🚀