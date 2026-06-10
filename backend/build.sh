#!/usr/bin/env bash
# Render build script - runs during deployment
# Install system dependencies for pyzbar
apt-get update && apt-get install -y libzbar0

# Install Python dependencies
pip install -r requirements.txt
