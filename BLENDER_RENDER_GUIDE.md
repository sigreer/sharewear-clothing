# Blender Product Rendering Guide

Automated headless rendering system for applying designs to T-shirt templates and generating product images and turntable animations.

## Quick Start

```bash
# Render a single design (default: 128 samples, with animation)
./render-product.sh path/to/design.png

# Fast preview (64 samples, still image only)
./render-product.sh path/to/design.png output/renders 64 --no-animation

# High quality production render (256 samples)
./render-product.sh path/to/design.png output/renders 256

# Batch process multiple designs
./batch-render.sh designs/ output/batch 128
```

## Scripts

### `render-product.sh`
Single design rendering wrapper.

**Usage:**
```bash
./render-product.sh <design-image> [output-dir] [samples] [--no-animation]
```

**Parameters:**
- `design-image`: Path to your design image (PNG, JPG)
- `output-dir`: Output directory (default: `output/renders`)
- `samples`: Render samples - lower = faster, higher = better quality (default: 128)
  - 64: Fast preview (~6 seconds)
  - 128: Good quality (~12 seconds)
  - 256-512: Production quality (proportionally longer)
- `--no-animation`: Skip animation rendering

**Environment Variables:**
- `BLEND_FILE`: Override default blend template (default: `assets/original-blender-template.blend`)

**Examples:**
```bash
# Use custom blend file
BLEND_FILE=assets/custom-template.blend ./render-product.sh design.png

# Fast preview
./render-product.sh design.png output/ 64 --no-animation

# Production quality with animation
./render-product.sh design.png output/ 512
```

### `batch-render.sh`
Process multiple designs in a directory.

**Usage:**
```bash
./batch-render.sh <designs-directory> [output-dir] [samples] [--no-animation]
```

**Examples:**
```bash
# Render all designs in folder
./batch-render.sh designs/

# Fast batch preview
./batch-render.sh designs/ output/batch/ 64 --no-animation

# Production batch
./batch-render.sh designs/ output/production/ 256
```

### `render_design.py`
Core Python script executed by Blender (not called directly).

**How it works:**
1. Loads the blend template
2. Finds all `TEX_IMAGE` nodes in materials
3. Replaces texture images with your design
4. Configures render settings (samples, denoising)
5. Renders still image
6. Optionally renders turntable animation

## Output Files

### Still Images
Format: `{design-name}_render.png`
- High-resolution PNG
- Transparent or solid background (depends on blend file)
- Denoising applied for clean output

### Animations
Format: `{design-name}_animation.mp4`
- MPEG4/H264 encoded video
- Turntable rotation (preset in blend file)
- High quality constant rate

## Performance

| Samples | Quality | Render Time (still) | Use Case |
|---------|---------|---------------------|----------|
| 64      | Preview | ~6 seconds          | Quick iteration |
| 128     | Good    | ~12 seconds         | Standard preview |
| 256     | High    | ~24 seconds         | Production |
| 512     | Ultra   | ~48 seconds         | Final renders |

*Times are approximate for still images on CPU rendering*

## Blend File Requirements

Your `.blend` template should have:
1. Material with `TEX_IMAGE` node for base color
2. Pre-configured camera and lighting
3. Animation timeline set up for turntable (if using animation)
4. Render settings (resolution, engine) configured

The script will automatically:
- Find and replace texture images
- Override sample count
- Enable denoising
- Configure output format

## Design Image Requirements

- **Format**: PNG, JPG, JPEG
- **Resolution**: Match your blend file's UV mapping (typically 2048x2048 or 4096x4096)
- **Layout**: Design should match the UV unwrap layout in the blend file

## Troubleshooting

### Design not showing on shirt
- Check that your blend file has `TEX_IMAGE` nodes in the material
- Verify the UV mapping matches your design layout
- Ensure the material is using Principled BSDF with image texture connected to Base Color

### Rendering too slow
- Reduce samples: `./render-product.sh design.png output/ 64`
- Skip animation: add `--no-animation` flag
- Check if GPU rendering is available in your blend file settings

### Out of memory
- Reduce render resolution in the blend file
- Lower sample count
- Close other applications

### Wrong blend file being used
- Set `BLEND_FILE` environment variable:
  ```bash
  BLEND_FILE=path/to/template.blend ./render-product.sh design.png
  ```

## Integration with Product Pipeline

```bash
# Example: Generate product images for upload
for design in new-designs/*.png; do
    ./render-product.sh "$design" output/product-images/ 256
done

# Upload to Medusa storage
# ... your upload script here ...
```

## Advanced Usage

### Custom Python Script
Modify `render_design.py` to:
- Change render settings
- Apply different materials
- Render multiple angles
- Add watermarks
- Export different formats

### Multiple Templates
```bash
# Render same design on different products
BLEND_FILE=templates/tshirt.blend ./render-product.sh design.png output/tshirt/
BLEND_FILE=templates/hoodie.blend ./render-product.sh design.png output/hoodie/
BLEND_FILE=templates/tank.blend ./render-product.sh design.png output/tank/
```
