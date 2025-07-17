#!/bin/bash
# Wine installation script for building Windows executables

echo "🍷 Installing Wine for Windows builds..."
echo "This script will install Wine on your WSL/Ubuntu system"
echo "You'll need to enter your sudo password when prompted"
echo ""

# Enable 32-bit architecture support
echo "📦 Enabling 32-bit architecture..."
sudo dpkg --add-architecture i386

# Update package list
echo "🔄 Updating package list..."
sudo apt update

# Install Wine (stable version)
echo "🍷 Installing Wine..."
sudo apt install -y wine wine64 wine32

# Install additional dependencies for electron-builder
echo "📦 Installing additional dependencies..."
sudo apt install -y mono-complete

# Verify installation
echo ""
echo "✅ Checking Wine installation..."
wine --version

echo ""
echo "✅ Wine installation complete!"
echo ""
echo "You can now build Windows executables with:"
echo "cd electron-build && bun run build:win"