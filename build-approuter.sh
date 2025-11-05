#!/bin/bash

set -e

echo "Building Expo web application..."
npm install --legacy-peer-deps
npm run build:web

echo "Creating resources directory in approuter..."
mkdir -p approuter/resources

echo "Copying web build to approuter/resources..."
rm -rf approuter/resources/*
cp -r dist/* approuter/resources/

echo "Build complete! Contents of approuter/resources:"
ls -lh approuter/resources/

echo "Approuter is ready for deployment"
