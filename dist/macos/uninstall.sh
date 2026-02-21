#!/bin/bash

PLIST_PATH="$HOME/Library/LaunchAgents/com.sticky.connections.bridge.plist"
INSTALL_DIR="/usr/local/sticky-connections"

echo "Stopping service..."
launchctl unload "$PLIST_PATH" 2>/dev/null

echo "Removing files..."
rm -f "$PLIST_PATH"
rm -rf "$INSTALL_DIR"

echo "Uninstalled."
