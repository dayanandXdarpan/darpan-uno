#!/bin/bash
# Arduino AI IDE Deployment Script
# Developer: Dayanand Darpan (https://www.dayananddarpan.me/)

echo "🚀 Arduino AI IDE Deployment Script"
echo "======================================"
echo "Developer: Dayanand Darpan"
echo "Website: https://www.dayananddarpan.me/"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $REQUIRED_VERSION or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

print_status "Node.js version check passed: $NODE_VERSION"

# Install dependencies
print_info "Installing dependencies..."
if npm install; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Clean previous builds
print_info "Cleaning previous builds..."
rm -rf dist/
print_status "Previous builds cleaned"

# Build the application
print_info "Building application..."
if npm run build; then
    print_status "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Check if dist folder exists
if [ ! -d "dist" ]; then
    print_error "Build folder 'dist' not found"
    exit 1
fi

print_status "Build verification passed"

echo ""
echo "🎉 Deployment Ready!"
echo "===================="
echo ""
print_info "Available deployment options:"
echo ""
echo "1. 🖥️  Desktop Application:"
echo "   npm run electron"
echo ""
echo "2. 🌐 Web Application:"
echo "   Serve the 'dist/renderer' folder with any web server"
echo "   Example: python -m http.server 8080 (from dist/renderer)"
echo ""
echo "3. 📦 Create Installer:"
echo "   npm run dist (requires electron-builder)"
echo ""
echo "4. 🚀 Quick Test:"
echo "   npm run electron"
echo ""

# Ask user what they want to do
read -p "Would you like to start the desktop application now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Starting Arduino AI IDE..."
    npm run electron
fi

echo ""
print_status "Deployment script completed!"
echo "📋 See DEPLOYMENT_GUIDE.md for detailed instructions"
echo "🌐 Developer: Dayanand Darpan - https://www.dayananddarpan.me/"
