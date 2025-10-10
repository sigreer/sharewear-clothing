# 3D Model Viewer

This directory contains exported 3D models and an example viewer.

## Quick Start

**Option 1: Using the included script (easiest)**
```bash
./start-viewer.sh
```
Then open your browser to: **http://localhost:8000/viewer-example.html**

**Option 2: Manual server start**
```bash
cd output
python3 -m http.server 8000
```
Then open your browser to: **http://localhost:8000/viewer-example.html**

## Why Do I Need a Web Server?

Browsers block loading local files (like `.glb` models) from `file://` URLs due to CORS security policy.

❌ **This won't work:**
- Double-clicking `viewer-example.html`
- Opening via `file:///path/to/viewer-example.html`

✅ **This works:**
- Serving via HTTP: `http://localhost:8000/viewer-example.html`

## Files in This Directory

- **`yellow-shirt.glb`** - 3D model without compression (9.95 MB)
- **`yellow-shirt-compressed.glb`** - 3D model with Draco compression (5.31 MB)
- **`viewer-example.html`** - Interactive 3D viewer demo
- **`start-viewer.sh`** - Quick start script to launch web server
- **`this-is-the-front_chest-medium_composited.png`** - Texture used by the 3D model

## Using in Production

For production/ecommerce integration:

1. **Upload GLB file** to your web hosting/CDN
2. **Update model-viewer src** to point to your hosted URL:
   ```html
   <model-viewer src="https://yourdomain.com/models/yellow-shirt-compressed.glb">
   ```

See [../GLB_EXPORT_GUIDE.md](../GLB_EXPORT_GUIDE.md) for complete integration examples.

## Troubleshooting

**Problem: "Failed to fetch" or CORS error**
- Make sure you're using `http://localhost` not `file://`
- Run the web server with `./start-viewer.sh` or `python3 -m http.server`

**Problem: Model loads but appears black/dark**
- This is normal in the local viewer - the model has proper materials
- When deployed, use environment lighting: `environment-image="neutral"`

**Problem: Server already running on port 8000**
- Stop it: `lsof -ti:8000 | xargs kill`
- Or use a different port: `python3 -m http.server 8001`
