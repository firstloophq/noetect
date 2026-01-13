#!/bin/bash

# Build and Install Noetect

echo "🔨 Building and installing Noetect..."

# Remove existing app from Applications
echo "📦 Removing existing app from /Applications..."
rm -rf /Applications/Noetect.app

# Build the new bundle
echo "🛠️  Building new bundle..."
cd mac-app && make && cd ..

# Move the new app to Applications
echo "📁 Moving new app to /Applications..."
cp -R mac-app/bundle/Noetect.app /Applications/

echo "✅ Done! Noetect has been installed to /Applications/"
echo "You can now run: open /Applications/Noetect.app"