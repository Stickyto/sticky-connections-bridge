#!/bin/bash

echo "======================================"
echo " Sticky Connections Bridge Installer "
echo "======================================"

INSTALL_DIR="/usr/local/sticky-connections"
PLIST_PATH="$HOME/Library/LaunchAgents/com.sticky.connections.bridge.plist"

echo "Creating install directory (requires sudo)..."
sudo mkdir -p "$INSTALL_DIR"

echo "Copying binary..."
sudo cp sticky-connections-bridge-macos-arm64 "$INSTALL_DIR/"
sudo chmod +x "$INSTALL_DIR/sticky-connections-bridge-macos-arm64"

echo "Installing LaunchAgent..."
cp com.sticky.connections.bridge.plist "$PLIST_PATH"

echo "Loading service (user domain)..."
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo ""
echo "✅ Sticky Connections Bridge installed and running."
echo ""
