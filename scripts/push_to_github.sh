#!/bin/bash
# Usage: ./scripts/push_to_github.sh <your-github-username>

GITHUB_USER=${1:-"YOUR_GITHUB_USERNAME"}
REPO_NAME="crab-agent"

echo "🦀 Pushing $CRAB agent to GitHub..."

# Init git repo
git init
git add .
git commit -m "🦀 initial commit — crab agent awakens"

# Create repo on GitHub via API (requires gh CLI or manual)
echo ""
echo "Now run one of these:"
echo ""
echo "Option A — GitHub CLI (recommended):"
echo "  gh repo create $REPO_NAME --public --push --source=."
echo ""
echo "Option B — Manual:"
echo "  1. Create repo at https://github.com/new — name it '$REPO_NAME'"
echo "  2. Then run:"
echo "     git remote add origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "     git branch -M main"
echo "     git push -u origin main"
