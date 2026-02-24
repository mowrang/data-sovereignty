#!/bin/bash

# Promote Code to Staging
# This script helps promote your development code to staging

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Promoting code to staging...${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: ${CURRENT_BRANCH}${NC}"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    echo "Uncommitted files:"
    git status --short
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Cancelled${NC}"
        exit 1
    fi
fi

# Checkout or create staging branch
echo -e "${GREEN}📦 Preparing staging branch...${NC}"
if git show-ref --verify --quiet refs/heads/staging; then
    echo "Staging branch exists, checking out..."
    git checkout staging
    git pull origin staging 2>/dev/null || echo "No remote staging branch"
else
    echo "Creating staging branch..."
    git checkout -b staging
fi

# Merge current branch into staging
echo -e "${GREEN}🔀 Merging ${CURRENT_BRANCH} into staging...${NC}"
if git merge "$CURRENT_BRANCH" --no-edit; then
    echo -e "${GREEN}✅ Merge successful!${NC}"
else
    echo -e "${RED}❌ Merge conflict! Please resolve manually${NC}"
    exit 1
fi

# Push to remote
echo -e "${GREEN}📤 Pushing to remote...${NC}"
read -p "Push to remote? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin staging
    echo -e "${GREEN}✅ Pushed to remote!${NC}"
fi

echo ""
echo -e "${GREEN}✅ Code promoted to staging!${NC}"
echo ""
echo "Next steps:"
echo "  1. Rebuild staging images:"
echo "     npm run staging:build"
echo ""
echo "  2. Restart staging environment:"
echo "     npm run staging:down && npm run staging:up"
echo ""
echo "  3. Test staging:"
echo "     npm run staging:logs"
echo "     Visit: http://localhost:3003"
echo ""
