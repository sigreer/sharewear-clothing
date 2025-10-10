#!/bin/bash
# Start local web server to view 3D models
# This is required because browsers block loading local files via file:// protocol

PORT=8000

echo "Starting web server on port $PORT..."
echo ""
echo "✓ Server running at: http://localhost:$PORT"
echo "✓ Open this URL in your browser: http://localhost:$PORT/viewer-example.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server $PORT
