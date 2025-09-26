#!/bin/bash

# ADHD Toys - Git Remote Setup Script
# This script helps set up your private repository with upstream Medusa tracking

echo "🚀 ADHD Toys - Git Remote Setup"
echo "================================"
echo

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository. Run 'git init' first."
    exit 1
fi

echo "📋 This script will help you set up:"
echo "   • Your private repository as 'origin'"
echo "   • Official Medusa starter as 'upstream' for upgrades"
echo

# Get the private repository URL from user
read -p "🔗 Enter your private repository URL (GitHub/GitLab): " PRIVATE_REPO_URL

if [ -z "$PRIVATE_REPO_URL" ]; then
    echo "❌ Error: Repository URL is required."
    exit 1
fi

echo
echo "🔧 Setting up remotes..."

# Add the private repository as origin
git remote add origin "$PRIVATE_REPO_URL"
echo "✅ Added private repository as 'origin'"

# Add the official Medusa starter as upstream
git remote add upstream https://github.com/medusajs/medusa-starter.git
echo "✅ Added Medusa starter as 'upstream'"

# Verify remotes
echo
echo "📍 Current remotes:"
git remote -v

echo
echo "🎯 Next steps:"
echo "   1. Push to your private repository:"
echo "      git push -u origin main"
echo
echo "   2. To upgrade Medusa in the future:"
echo "      git fetch upstream"
echo "      git merge upstream/main  # or cherry-pick specific updates"
echo
echo "   3. Always test upgrades in a feature branch first:"
echo "      git checkout -b upgrade/medusa-v2.x"
echo "      git fetch upstream"
echo "      git merge upstream/main"
echo "      # Test your application"
echo "      git checkout main"
echo "      git merge upgrade/medusa-v2.x"
echo

echo "✨ Setup complete! Your repository is ready for private development with Medusa upgrades."