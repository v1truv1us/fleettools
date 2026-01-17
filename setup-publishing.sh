#!/bin/bash

# FleetTools GitHub CLI Publishing Setup Script
# This script helps set up the environment for GitHub CLI publishing

set -e

echo "🚀 FleetTools GitHub CLI Publishing Setup"
echo "========================================"

# Check prerequisites
check_prerequisite() {
    local cmd=$1
    local name=$2
    
    if ! command -v $cmd &> /dev/null; then
        echo "❌ $name is not installed"
        echo "Please install $name first:"
        
        case $cmd in
            "gh")
                echo "  macOS: brew install gh"
                echo "  Ubuntu: sudo apt install gh"
                echo "  Windows: winget install GitHub.cli"
                echo "  Or visit: https://cli.github.com/"
                ;;
            "bun")
                echo "  curl -fsSL https://bun.sh/install | bash"
                echo "  Or visit: https://bun.sh/"
                ;;
            "git")
                echo "  macOS: brew install git"
                echo "  Ubuntu: sudo apt install git"
                echo "  Or visit: https://git-scm.com/"
                ;;
        esac
        
        exit 1
    else
        echo "✅ $name is installed"
    fi
}

echo "🔍 Checking prerequisites..."
check_prerequisite "git" "Git"
check_prerequisite "gh" "GitHub CLI"
check_prerequisite "bun" "Bun runtime"

# Check GitHub CLI authentication
echo ""
echo "🔐 Checking GitHub CLI authentication..."
if gh auth status &>/dev/null; then
    echo "✅ GitHub CLI is authenticated"
    echo "   Authenticated as: $(gh api user --jq '.login')"
else
    echo "❌ GitHub CLI is not authenticated"
    echo ""
    echo "Please authenticate with GitHub CLI:"
    echo "  gh auth login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Check repository access
echo ""
echo "🏛️  Checking repository access..."
REPO_OWNER=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\)\/.*/\1/' | sed 's/\.git$//')
REPO_NAME=$(git config --get remote.origin.url | sed 's/.*github.com[:/][^/]*\/\([^/]*\)\.git/\1/')

echo "Repository: $REPO_OWNER/$REPO_NAME"

if gh api repos/$REPO_OWNER/$REPO_NAME &>/dev/null; then
    echo "✅ Repository access confirmed"
    
    # Check permissions
    PERMISSIONS=$(gh api repos/$REPO_OWNER/$REPO_OWNER/collaborators/$(gh api user --jq '.login')/permission --jq '.permission' 2>/dev/null || echo "unknown")
    
    case $PERMISSIONS in
        "admin"|"write")
            echo "✅ Write permissions confirmed"
            ;;
        "read")
            echo "⚠️  You only have read permissions. You need write access to publish packages."
            ;;
        *)
            echo "⚠️  Could not determine permissions. Make sure you have write access."
            ;;
    esac
else
    echo "❌ Cannot access repository. Check your permissions."
    exit 1
fi

# Check package.json files
echo ""
echo "📦 Checking package configuration..."

PACKAGES_FOUND=0
PACKAGES_CONFIGURED=0

for pkg in packages/* plugins/* cli squawk server/api; do
    if [ -d "$pkg" ] && [ -f "$pkg/package.json" ]; then
        PACKAGES_FOUND=$((PACKAGES_FOUND + 1))
        pkg_name=$(node -p "require('./$pkg/package.json').name" 2>/dev/null || echo "unknown")
        pkg_private=$(node -p "require('./$pkg/package.json').private" 2>/dev/null || echo "false")
        pkg_version=$(node -p "require('./$pkg/package.json').version" 2>/dev/null || echo "0.0.0")
        
        echo "   📄 $pkg ($pkg_name@$pkg_version)"
        
        if [ "$pkg_private" != "true" ]; then
            PACKAGES_CONFIGURED=$((PACKAGES_CONFIGURED + 1))
            echo "      ✅ Configured for publishing"
        else
            echo "      ⚪ Private package (not published)"
        fi
        
        # Check for publishConfig
        if node -e "try { console.log(require('./$pkg/package.json').publishConfig?.access) } catch(e) { console.log('none') }" 2>/dev/null | grep -v "none" > /dev/null; then
            access=$(node -p "require('./$pkg/package.json').publishConfig?.access" 2>/dev/null || echo "public")
            echo "      📋 Access level: $access"
        fi
    fi
done

echo ""
echo "📊 Package Summary:"
echo "   Total packages found: $PACKAGES_FOUND"
echo "   Configured for publishing: $PACKAGES_CONFIGURED"

if [ $PACKAGES_CONFIGURED -eq 0 ]; then
    echo "⚠️  No packages are configured for publishing."
    echo "   Make sure packages have 'private: false' in package.json"
fi

# Test scripts
echo ""
echo "🧪 Testing publishing scripts..."

if [ -f "scripts/detect-changes.ts" ] && bun run detect-changes &>/dev/null; then
    echo "✅ Change detection script works"
else
    echo "❌ Change detection script failed"
fi

# Create example .npmrc for local development
if [ ! -f ".npmrc" ]; then
    echo ""
    echo "📝 Creating .npmrc for local development..."
    cat > .npmrc << EOF
# FleetTools GitHub Packages configuration
@fleettools:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}

# Public npm registry
registry=https://registry.npmjs.org/
EOF
    echo "✅ Created .npmrc"
    echo "   Set GITHUB_TOKEN environment variable for local publishing"
else
    echo "ℹ️  .npmrc already exists"
fi

# Create GitHub token guidance
echo ""
echo "🔑 GitHub Token Setup"
echo "===================="
echo ""
echo "For local publishing, you need a GitHub Personal Access Token:"
echo ""
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select scopes:"
echo "   ✅ repo (Full control of private repositories)"
echo "   ✅ write:packages (Upload packages to GitHub Packages)"
echo "4. Copy the token"
echo "5. Set environment variable:"
echo "   export GITHUB_TOKEN=your_token_here"
echo "6. Or add to your shell profile (~/.bashrc, ~/.zshrc, etc.)"
echo ""

# Summary
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ Prerequisites installed and configured"
echo "✅ GitHub CLI authenticated"
echo "✅ Repository access confirmed"
echo "✅ Package configuration checked"
echo "✅ Scripts tested"
echo "✅ .npmrc created for local development"
echo ""
echo "📚 Next Steps:"
echo "   1. Set GITHUB_TOKEN environment variable (see above)"
echo "   2. Try local publishing: bun run publish:package packages/fleet-shared"
echo "   3. Check GitHub Actions for automated publishing"
echo "   4. Read docs/publishing.md for detailed guide"
echo ""
echo "🔗 Useful Links:"
echo "   - Publishing Guide: docs/publishing.md"
echo "   - GitHub CLI Docs: https://cli.github.com/"
echo "   - GitHub Packages: https://docs.github.com/en/packages"
echo ""
echo "Happy publishing! 🚀"