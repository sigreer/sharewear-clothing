# Rendering Scripts

This directory contains scripts for rendering product designs using Blender and Python.

## Prerequisites

- **Blender** (tested with Blender 4.5+)
- **Python 3** with PIL/Pillow (`pip install Pillow`)
- Template files in `../assets/`:
  - `t-shirt-template.png` - 2D template for design composition
  - `original-blender-template.blend` - 3D Blender template

## Scripts Overview

### 1. Composition Script (Python)

**`compose_design.py`** - Composite a 2D design onto the T-shirt template

```bash
# Usage from project root:
python3 scripts/compose_design.py --template assets/t-shirt-template.png \
  --design my-logo.png --preset chest-large --output output/composited.png

# With fabric color:
python3 scripts/compose_design.py --template assets/t-shirt-template.png \
  --design my-logo.png --preset chest-large -f navy --output output/composited.png
```

**Available presets:**
- Front: `chest-small`, `chest-medium`, `chest-large`
- Back upper: `back-small`, `back-medium`, `back-large`
- Back lower: `back-bottom-small`, `back-bottom-medium`, `back-bottom-large`

**Available colors:** white, black, red, blue, navy, green, yellow, orange, purple, pink, gray, brown, beige, cream, or hex codes (#RRGGBB)

### 2. 3D Rendering Script (Python)

**`render_design.py`** - Render 3D product with Blender (called via Blender)

```bash
# Usage (called by render-product.sh):
blender --background assets/original-blender-template.blend \
  --python scripts/render_design.py -- \
  assets/original-blender-template.blend design.png output/ 128
```

### 3. GLB Export Script (Python)

**`export_glb.py`** - Export 3D model to GLB format for web (called via Blender)

```bash
# Usage (called by export-glb.sh):
blender --background assets/original-blender-template.blend \
  --python scripts/export_glb.py -- \
  assets/original-blender-template.blend design.png output/model.glb
```

### 4. Product Rendering Wrapper (Bash)

**`render-product.sh`** - Main script for rendering product images and animations

```bash
# Run from project root:
cd /path/to/sharewear.clothing

# Basic usage - render all angles + animation:
./scripts/render-product.sh design.png

# With composition preset:
./scripts/render-product.sh logo.png --compose chest-large

# Fast preview (64 samples):
./scripts/render-product.sh design.png -s 64

# Still images only (no animation):
./scripts/render-product.sh design.png --images-only

# Custom output directory:
./scripts/render-product.sh design.png -o custom-output/

# With fabric and background colors:
./scripts/render-product.sh design.png --compose chest-large -f navy -b white
```

**Options:**
- `-o, --output DIR` - Output directory (default: output/renders)
- `-s, --samples N` - Render quality: 64=preview, 128=standard, 256+=production
- `-f, --fabric-color COLOR` - Shirt color (hex or name)
- `-b, --background-color COLOR` - Background color (hex, name, or 'transparent')
- `--images-only` - Render 6 camera angles only
- `--animation-only` - Render turntable animation only
- `--compose PRESET` - Composite design first using preset

### 5. GLB Export Wrapper (Bash)

**`export-glb.sh`** - Export 3D model for web embedding

```bash
# Run from project root:
./scripts/export-glb.sh design.png

# With composition and compression:
./scripts/export-glb.sh logo.png --compose chest-large --draco

# Custom output:
./scripts/export-glb.sh design.png -o models/shirt.glb

# Navy shirt with design on back:
./scripts/export-glb.sh logo.png --compose back-medium -f navy
```

**Options:**
- `-o, --output FILE` - Output GLB file (default: output/model.glb)
- `-f, --fabric-color COLOR` - Shirt color
- `--draco` - Enable Draco compression (smaller files)
- `--compose PRESET` - Composite design first

### 6. Batch Rendering (Bash)

**`batch-render.sh`** - Render multiple designs in batch

```bash
# Run from project root:
./scripts/batch-render.sh designs-directory/

# With custom output and quality:
./scripts/batch-render.sh designs/ output/batch/ 256

# No animations (faster):
./scripts/batch-render.sh designs/ output/preview/ 64 --no-animation
```

## Workflow Examples

### Simple Workflow - Just Render a Design

```bash
cd /path/to/sharewear.clothing
./scripts/render-product.sh my-logo.png
```

Output: `output/renders/my-logo_*.png` (6 angles) + `my-logo_animation.mp4`

### Composite + Render Workflow

```bash
cd /path/to/sharewear.clothing

# Composite design onto chest, then render
./scripts/render-product.sh logo.png --compose chest-large -s 256

# Result: High quality renders with design positioned on chest
```

### Create Web 3D Model

```bash
cd /path/to/sharewear.clothing

# Export GLB with design composited on back
./scripts/export-glb.sh logo.png --compose back-medium --draco -o output/shirt.glb
```

### Batch Production Rendering

```bash
cd /path/to/sharewear.clothing

# Render all designs in folder with high quality
./scripts/batch-render.sh designs-to-render/ output/production/ 256
```

## File Locations

All scripts now reside in `scripts/` directory but **must be run from the project root** for correct path resolution:

```
sharewear.clothing/
├── scripts/
│   ├── compose_design.py       # Python composition script
│   ├── render_design.py        # Python Blender rendering script
│   ├── export_glb.py           # Python GLB export script
│   ├── render-product.sh       # Main render wrapper
│   ├── export-glb.sh           # GLB export wrapper
│   ├── batch-render.sh         # Batch rendering
│   └── README.md               # This file
├── assets/
│   ├── t-shirt-template.png    # Required for composition
│   └── original-blender-template.blend  # Required for 3D rendering
└── output/                     # Default output location
```

## Troubleshooting

### "Template file not found"
- Ensure you're running scripts from the project root directory
- Verify `assets/t-shirt-template.png` and `assets/original-blender-template.blend` exist

### "Design file not found"
- Provide absolute path or path relative to project root
- Example: `./scripts/render-product.sh assets/gary.png`

### Low quality renders
- Increase samples: `-s 256` or `-s 512`
- Higher samples = better quality but slower render

### Large GLB files
- Use `--draco` flag for compression
- Reduces file size significantly for web use

## Integration with Medusa Backend

These scripts are called by the Render Engine module in the Medusa backend:

- **Design composition**: `apps/server/src/modules/render-engine/services/python-executor-service.ts`
- **3D rendering**: Same service, executes via Bull queue
- **Job management**: `apps/server/src/modules/render-engine/services/render-job-service.ts`

The render engine workflow automatically handles:
1. Uploading user designs
2. Compositing onto templates
3. Rendering 3D product images
4. Associating renders with product media gallery
