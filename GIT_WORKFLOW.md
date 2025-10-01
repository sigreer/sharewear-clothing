---
alwaysApply: false
---
# Git Version Control Requirements and Best Practice Guidance

## General

- Keep commits atomic: one purpose, one file group.
- Avoid renaming and editing in one commit – Git can't track this well.
- Avoid formatting changes mixed with logic changes.
- Respect any project-level .gitattributes and .gitignore files.

## When Adding New Features

- Always create a new branch from the latest main before making changes.
- Branch names must follow the format: feature/<feature-name> (e.g. feature/batch-scheduler-loop)
- Do not commit directly to main under any circumstances.

## Never Merge to main

- Do not automatically merge feature branches into main, even if CI passes.
- All branches must be manually reviewed and merged outside of agent control.
- Agents may create a pull request or leave a merge-ready commit message, but must not run git merge or git push origin main.

## Keeping Feature Branches in Sync

- Regularly rebase the feature branch against the latest main using:
```bash
git fetch origin
git rebase origin/main
```
- Only rebase if no uncommitted changes are present.
f
- Squash commits if appropriate before final merge to keep history clean.

## When Submitting Changes

- Agents should indicate the feature is complete by:
 - Printing a message like: Feature branch ready: feature/<feature-name>
 - Optionally generating a summary of changes for review.

## When Creating a Batch of Commits

- Use git diffs to inspect changes
- Prefix all commits with *FEATURE*, *LINT*, *REFACTOR*, *FIX*, *TEST*, *CI*, *DOCS* or *BACKUP*
- Group files into commits based on the issue - 'Atomic commits'

## Medusa-Specific Workflow

### Repository Structure

```
origin     -> Your private repository (GitHub/GitLab)
upstream   -> Official Medusa starter (https://github.com/medusajs/medusa-starter.git)
```

### Initial Setup

1. **Run the setup script:**
   ```bash
   ./setup-git-remotes.sh
   ```

2. **Push to your private repository:**
   ```bash
   git push -u origin main
   ```

### Custom Modules and Customizations

Keep all customizations in clearly identifiable locations:
- `src/modules/` - Custom modules (like Mailtrap integration)
- `src/api/` - Custom API routes
- `src/workflows/` - Custom workflows
- Root utilities like `change-password.js`
## Commit Guidelines

- Use clear, descriptive commit messages:
 - ✅ Add scheduler class and basic interval logic
 - ✅ Refactor contact manager into separate module
 - ❌ update stuff
- Squash commits if appropriate before final merge to keep history clean.

## When Submitting Changes

- Agents should indicate the feature is complete by:
 - Printing a message like: Feature branch ready: feature/<feature-name>
 - Optionally generating a summary of changes for review.

## When Creating a Batch of Commits

- Use git diffs to inspect changes
- Prefix all commits with *FEATURE*, *LINT*, *REFACTOR*, *FIX*, *TEST*, *CI*, *DOCS* or *BACKUP*
- Group files into commits based on the issue - 'Atomic commits'

## Medusa-Specific Workflow

### Repository Structure

```
origin     -> Your private repository (GitHub/GitLab)
upstream   -> Official Medusa starter (https://github.com/medusajs/medusa-starter.git)
```

### Initial Setup

1. **Run the setup script:**
   ```bash
   ./setup-git-remotes.sh
   ```

2. **Push to your private repository:**
   ```bash
   git push -u origin main
   ```

### Custom Modules and Customizations

Keep all customizations in clearly identifiable locations:
- `src/modules/` - Custom modules (like Mailtrap integration)
- `src/api/` - Custom API routes
- `src/workflows/` - Custom workflows
- Root utilities like `change-password.js`

### Upgrading from Medusa

#### Safe Upgrade Process

1. **Create an upgrade branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b upgrade/medusa-v2.x
   ```

2. **Fetch upstream changes:**
   ```bash
   git fetch upstream
   ```

3. **Review what's new:**
   ```bash
   git log HEAD..upstream/main --oneline
   git diff HEAD..upstream/main
   ```

4. **Merge or cherry-pick updates:**
   ```bash
   # Option A: Merge all changes
   git merge upstream/main

   # Option B: Cherry-pick specific commits
   git cherry-pick <commit-hash>
   ```

5. **Resolve conflicts:**
   - Prioritize your customizations
   - Update dependencies in package.json files
   - Test thoroughly

6. **Test the upgrade:**
   ```bash
   bun install
   bun run setup  # Migrate DB, etc.
   bun run dev    # Test functionality
   bun run test   # Run tests
   ```

7. **Merge back to main:**
   ```bash
   git checkout main
   git merge upgrade/medusa-v2.x
   git push origin main
   ```

### Managing Conflicts

#### Common Conflict Areas

1. **package.json** - Dependency version conflicts
2. **medusa-config.ts** - Configuration changes
3. **CLAUDE.md** - Documentation updates
4. **.gitignore** - File exclusion rules

#### Conflict Resolution Strategy

1. **Dependencies**: Always use the latest compatible versions
2. **Configuration**: Preserve your customizations, merge new options
3. **Documentation**: Keep your customizations, add new Medusa features
4. **Core files**: Favor upstream changes, re-apply customizations

### Branch Protection

#### Recommended Branch Rules

For your private repository:

- **main branch**:
  - Require PR reviews
  - Require status checks (tests)
  - No direct pushes

- **Feature branches**:
  - Squash and merge to main
  - Delete after merge

### Release Strategy

#### Versioning

Use semantic versioning for your releases:
- `v1.0.0` - Initial production release
- `v1.1.0` - New features, Medusa upgrades
- `v1.0.1` - Bug fixes

#### Release Process

```bash
# Create release branch
git checkout -b release/v1.1.0

# Update version in package.json
# Update CHANGELOG.md
# Final testing

# Create release commit
git commit -m "chore: release v1.1.0"

# Merge to main
git checkout main
git merge release/v1.1.0

# Tag the release
git tag -a v1.1.0 -m "Release v1.1.0: Added Mailtrap integration"
git push origin main --tags
```

### Backup Strategy

#### Regular Backups

1. **Push frequently** to your private repository
2. **Tag stable versions** for easy rollback
3. **Document customizations** in commit messages
4. **Keep CLAUDE.md updated** with your modifications

#### Recovery Process

If an upgrade breaks something:

```bash
# Revert to last known good state
git checkout main
git reset --hard v1.0.0  # or last good commit
git push origin main --force-with-lease
```

### Team Collaboration

#### Multiple Developers

1. **Feature branches** for all work
2. **Code reviews** via PR/MR
3. **Shared understanding** of customization areas
4. **Documentation** of all custom integrations

#### Access Control

- **Admin access**: Senior developers, DevOps
- **Write access**: All developers
- **Read access**: QA, stakeholders

### Monitoring Medusa Updates

#### Stay Updated

1. **Watch the Medusa repository** for releases
2. **Follow Medusa blog** for breaking changes
3. **Test upgrades** in development first
4. **Plan upgrade windows** for minimal disruption

#### Upgrade Checklist

- [ ] Review Medusa release notes
- [ ] Create upgrade branch
- [ ] Fetch upstream changes
- [ ] Test in development environment
- [ ] Update custom modules if needed
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues

### Emergency Procedures

#### Hotfix Process

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/critical-fix

# Make minimal fix
git commit -m "fix: critical issue"

# Deploy directly to main
git checkout main
git merge hotfix/critical-fix
git push origin main

# Tag for tracking
git tag hotfix-$(date +%Y%m%d-%H%M)
git push origin --tags
```

This workflow ensures you maintain control over your private repository while benefiting from official Medusa updates and improvements.