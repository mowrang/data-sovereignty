#!/bin/bash

# Promote Code to Production
# This script helps promote staging code to production

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Promoting code to production...${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: ${CURRENT_BRANCH}${NC}"

# Check if we're on staging
if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo -e "${YELLOW}⚠️  Warning: You're not on staging branch${NC}"
    echo "Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Cancelled${NC}"
        exit 1
    fi
fi

# Confirm production deployment
echo -e "${RED}⚠️  WARNING: This will deploy to PRODUCTION!${NC}"
echo ""
read -p "Are you sure you want to deploy to production? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}Cancelled${NC}"
    exit 1
fi

# Determine main branch (main or master)
if git show-ref --verify --quiet refs/heads/main; then
    MAIN_BRANCH="main"
elif git show-ref --verify --quiet refs/heads/master; then
    MAIN_BRANCH="master"
else
    echo -e "${RED}Error: No main or master branch found${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Preparing ${MAIN_BRANCH} branch...${NC}"
git checkout "$MAIN_BRANCH"
git pull origin "$MAIN_BRANCH" 2>/dev/null || echo "No remote $MAIN_BRANCH branch"

# Merge staging into main/master
echo -e "${GREEN}🔀 Merging staging into ${MAIN_BRANCH}...${NC}"
if git merge staging --no-edit; then
    echo -e "${GREEN}✅ Merge successful!${NC}"
else
    echo -e "${RED}❌ Merge conflict! Please resolve manually${NC}"
    exit 1
fi

# Create git tag for release
echo -e "${GREEN}🏷️  Creating release tag...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG_NAME="v1.0.${TIMESTAMP}"
read -p "Create release tag ${TAG_NAME}? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git tag -a "$TAG_NAME" -m "Release: Production deployment ${TIMESTAMP}"
    echo -e "${GREEN}✅ Tag created: ${TAG_NAME}${NC}"
fi

# Push to remote
echo -e "${GREEN}📤 Pushing to remote...${NC}"
read -p "Push to remote? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$MAIN_BRANCH"
    if [ -n "$TAG_NAME" ] && [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin "$TAG_NAME"
    fi
    echo -e "${GREEN}✅ Pushed to remote!${NC}"
fi

echo ""
echo -e "${GREEN}✅ Code promoted to production!${NC}"
echo ""
echo "Next steps:"
echo "  1. Rebuild production images:"
echo "     npm run prod:build"
echo ""
echo "  2. Restart production environment:"
echo "     npm run prod:down && npm run prod:up"
echo ""
echo "  3. Monitor production:"
echo "     npm run prod:logs"
echo "     Visit: https://abirad.com"
echo ""
echo -e "${YELLOW}⚠️  Remember to monitor production after deployment!${NC}"
echo ""
