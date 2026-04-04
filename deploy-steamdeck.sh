#!/bin/bash

# Deploy Electron build to Steam Deck via SSH
# Steam Deck IP: 192.168.1.11

set -e

STEAM_DECK_IP="192.168.1.11"
STEAM_DECK_USER="deck"
REMOTE_DIR="/home/deck/Games/kids-drawing"
RELEASE_DIR="./release"

# Find the AppImage (Steam Deck uses Linux x64)
APPIMAGE=$(find "$RELEASE_DIR" -name "*.AppImage" -type f 2>/dev/null | head -n 1)

if [ -z "$APPIMAGE" ]; then
    echo "Error: No AppImage found in $RELEASE_DIR"
    echo "Run 'pnpm electron:build:steamdeck' first to create the build"
    exit 1
fi

APPIMAGE_NAME=$(basename "$APPIMAGE")

echo "Found AppImage: $APPIMAGE_NAME"
echo "Deploying to Steam Deck at $STEAM_DECK_IP..."

# Create remote directory if it doesn't exist
ssh "${STEAM_DECK_USER}@${STEAM_DECK_IP}" "mkdir -p $REMOTE_DIR"

# Copy the AppImage to Steam Deck
echo "Copying $APPIMAGE_NAME to Steam Deck..."
scp "$APPIMAGE" "${STEAM_DECK_USER}@${STEAM_DECK_IP}:${REMOTE_DIR}/"

# Make it executable on the Steam Deck
ssh "${STEAM_DECK_USER}@${STEAM_DECK_IP}" "chmod +x '${REMOTE_DIR}/${APPIMAGE_NAME}'"

echo ""
echo "Done! AppImage deployed to Steam Deck at:"
echo "  ${REMOTE_DIR}/${APPIMAGE_NAME}"
echo ""
echo "To run on Steam Deck, execute:"
echo "  ${REMOTE_DIR}/${APPIMAGE_NAME}"
