# Sharewear T-Shirt Render Engine - Setup Documentation

## Overview

This directory contains Python scripts and utility tools for the Sharewear T-Shirt Render Engine, which enables automatic composition of custom designs onto t-shirt templates and 3D rendering with Blender.

## Quick Start - Validation Scripts

Before using the render engine, use these utility scripts to validate your environment:

```bash
# 1. Check overall system health
node scripts/render-engine/health-check.js

# 2. Test Python environment
node scripts/render-engine/test-python.js --verbose

# 3. Validate template files
node scripts/render-engine/validate-templates.js
```

See [Utility Scripts](#utility-scripts) section below for detailed documentation.

## Architecture

The render engine consists of two main Python scripts:

1. **compose_design.py** - Composites custom designs onto 2D t-shirt templates
2. **render_design.py** - Renders 3D t-shirt models with textures using Blender

These scripts are executed by the `PythonExecutorService` in the Medusa backend.

## Directory Structure

```
apps/server/
├── scripts/
│   └── render-engine/
│       ├── README.md                 # This file
│       ├── requirements.txt          # Python dependencies
│       ├── compose_design.py         # Design composition script
│       └── render_design.py          # 3D rendering script
├── render-assets/
│   ├── templates/                    # 2D t-shirt template images (.png)
│   │   ├── white-tshirt-front.png
│   │   ├── white-tshirt-back.png
│   │   └── ...
│   └── models/                       # 3D Blender models (.blend)
│       ├── tshirt-basic.blend
│       └── ...
└── static/
    └── uploads/                      # User-uploaded designs and rendered outputs
        ├── designs/
        ├── composited/
        └── renders/
```

## System Requirements

### Required Software

1. **Python 3.8+**
   - Version 3.8 or higher required
   - System Python (not Blender's internal Python)
   - Used for: compose_design.py script

2. **Pillow (PIL) 11.0.0+**
   - Python Imaging Library for image composition
   - Install: `pip install Pillow>=11.0.0`

3. **Blender 3.6+**
   - 3D rendering software
   - Must be installed system-wide and accessible via `blender` command
   - Used for: render_design.py script

### Current System Status

Check installed versions:
```bash
python3 --version          # Should be 3.8+
python3 -c "import PIL; print(PIL.__version__)"  # Should be 11.0.0+
blender --version          # Should be 3.6+
```

## Installation

### 1. Install Python Dependencies

```bash
cd apps/server/scripts/render-engine
pip install -r requirements.txt
```

Or install globally:
```bash
pip install Pillow>=11.0.0
```

### 2. Install Blender

#### Manjaro/Arch Linux
```bash
sudo pacman -S blender
```

**Important - Known Issue:** Blender 4.5+ on Manjaro/Arch may have library compatibility issues with system ffmpeg. See [Troubleshooting](#troubleshooting) section below.

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install blender
```

#### macOS
```bash
brew install blender
```

Or download from: https://www.blender.org/download/

### 3. Verify Installation

Run the environment validation:
```bash
cd apps/server
bun run dev
```

Then make a GET request to:
```
http://localhost:9000/admin/render-jobs/health
```

This will return the status of Python, Pillow, and Blender installations.

## Python Scripts

### compose_design.py

**Purpose:** Composites a user's custom design onto a 2D t-shirt template using preset positioning rules.

**Expected Location:** `apps/server/scripts/render-engine/compose_design.py`

**Command-Line Interface:**
```bash
python3 compose_design.py \
  --template /path/to/template.png \
  --design /path/to/user-design.png \
  --preset chest-medium \
  --output /path/to/output.png \
  [--fabric-color "#FFFFFF"]
```

**Arguments:**
- `--template` (required): Path to template PNG file (2D t-shirt mockup)
- `--design` (required): Path to user's uploaded design image
- `--preset` (required): Design placement preset (see below)
- `--output` (required): Path where composited image will be saved
- `--fabric-color` (optional): Base fabric color (hex #RRGGBB or named color)

**Valid Presets:**
- `chest-small` - Small design centered on chest
- `chest-medium` - Medium design centered on chest
- `chest-large` - Large design centered on chest
- `back-small` - Small design on upper back
- `back-medium` - Medium design on upper back
- `back-large` - Large design on upper back
- `back-bottom-small` - Small design on lower back
- `back-bottom-medium` - Medium design on lower back
- `back-bottom-large` - Large design on lower back

**Preset Configuration Format:**
Each preset defines:
```python
{
    "chest-medium": {
        "position": (500, 300),    # (x, y) pixel position on template
        "max_width": 400,           # Maximum design width in pixels
        "max_height": 400,          # Maximum design height in pixels
        "rotation": 0               # Rotation in degrees (optional)
    }
}
```

**Expected Behavior:**
1. Load template PNG file
2. Load user's design image
3. Resize design to fit preset dimensions (maintaining aspect ratio)
4. Apply optional fabric color tinting to template
5. Composite design onto template at preset position
6. Save result as PNG with transparency

**Output:**
- Success: Exit code 0, creates output PNG file
- Failure: Exit code 1, prints error to stderr

**Example Output Messages:**
```
Composited design successfully: /path/to/output.png
```

**Error Handling:**
- Invalid file paths → "Error: Template file not found"
- Invalid preset → "Error: Invalid preset 'invalid-preset'"
- Invalid image format → "Error: Unable to load design image"
- Permission errors → "Error: Cannot write to output path"

---

### render_design.py

**Purpose:** Renders a 3D t-shirt model with applied texture using Blender, producing multiple camera angles and optional animation.

**Expected Location:** `apps/server/scripts/render-engine/render_design.py`

**Command-Line Interface:**
```bash
blender --background /path/to/model.blend \
  --python render_design.py \
  -- \
  /path/to/model.blend \
  /path/to/texture.png \
  /path/to/output-dir \
  128 \
  [--images-only] \
  [--animation-only] \
  [--fabric-color "#FFFFFF"] \
  [--background-color "transparent"]
```

**Arguments:**
- Positional arg 1: Path to Blender .blend file
- Positional arg 2: Path to texture image (composited design)
- Positional arg 3: Output directory for renders
- Positional arg 4: Render samples (quality, typically 128-256)
- `--images-only`: Skip animation rendering
- `--animation-only`: Skip still image rendering
- `--fabric-color`: Base fabric color for areas without texture
- `--background-color`: Background color or "transparent"

**Camera Angles:**
The script should render 6 standard camera angles:
1. `front_0deg` - Front view (0°)
2. `left_90deg` - Left side view (90°)
3. `right_270deg` - Right side view (270°)
4. `back_180deg` - Back view (180°)
5. `front_45deg_left` - Front-left angled view (45°)
6. `front_45deg_right` - Front-right angled view (315°)

**Expected Behavior:**
1. Load Blender .blend file in background mode
2. Locate t-shirt mesh object in scene
3. Apply texture image to material (UV mapped)
4. Set render quality (samples)
5. Set background color/transparency
6. Render each camera angle as PNG
7. Optionally render 360° turntable animation
8. Output file paths to stdout

**Output Format:**
```
Rendered front_0deg: design_front_0deg.png
Rendered left_90deg: design_left_90deg.png
Rendered right_270deg: design_right_270deg.png
Rendered back_180deg: design_back_180deg.png
Rendered front_45deg_left: design_front_45deg_left.png
Rendered front_45deg_right: design_front_45deg_right.png
Rendered animation: design_turntable.mp4
```

**Blender Scene Requirements:**
The .blend file must contain:
- T-shirt mesh object (any name, should be identifiable)
- UV unwrapped mesh for texture mapping
- Material with texture node setup
- Multiple camera objects (or script creates cameras)
- Proper lighting setup
- World/environment settings

**Render Settings:**
- Format: PNG for images, MP4 for animation
- Transparency: Alpha channel support for images
- Resolution: Configurable (typically 1920x1080 or 2048x2048)
- Samples: Passed as argument (128-512 for quality)
- Engine: Cycles or EEVEE (Cycles recommended for quality)

**Error Handling:**
- Missing .blend file → "Error: Blend file not found"
- Missing texture → "Error: Texture file not found"
- Invalid samples → "Error: Samples must be between 1 and 4096"
- Render failure → "Error: Render failed for angle: front_0deg"

---

## Script Implementation Guidelines

When implementing these scripts:

### compose_design.py Implementation

```python
#!/usr/bin/env python3
"""
T-Shirt Design Composition Script
Composites user designs onto t-shirt templates with preset positioning
"""

import argparse
import sys
from PIL import Image, ImageDraw, ImageColor

# Define presets
PRESETS = {
    "chest-small": {"position": (400, 250), "max_width": 250, "max_height": 250},
    "chest-medium": {"position": (500, 300), "max_width": 400, "max_height": 400},
    "chest-large": {"position": (600, 350), "max_width": 600, "max_height": 600},
    # Add more presets...
}

def parse_color(color_str):
    """Parse hex color (#RRGGBB) or named color to RGB tuple"""
    try:
        if color_str.startswith('#'):
            return ImageColor.getrgb(color_str)
        else:
            # Map named colors
            color_map = {
                'white': '#FFFFFF', 'black': '#000000',
                'navy': '#000080', 'red': '#FF0000',
                # Add more colors...
            }
            return ImageColor.getrgb(color_map.get(color_str.lower(), color_str))
    except:
        return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--template', required=True)
    parser.add_argument('--design', required=True)
    parser.add_argument('--preset', required=True, choices=PRESETS.keys())
    parser.add_argument('--output', required=True)
    parser.add_argument('--fabric-color', required=False)
    args = parser.parse_args()

    # Implementation here...
    # 1. Load template and design
    # 2. Get preset configuration
    # 3. Resize design to fit preset
    # 4. Apply fabric color if specified
    # 5. Composite design onto template
    # 6. Save output

    print(f"Composited design successfully: {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

### render_design.py Implementation

```python
#!/usr/bin/env python3
"""
Blender T-Shirt Rendering Script
Renders 3D t-shirt models with textures from multiple camera angles
"""

import bpy
import sys
import os

def setup_scene(texture_path, fabric_color=None, background_color=None):
    """Set up Blender scene with texture and colors"""
    # Find t-shirt mesh
    # Apply texture to material
    # Set render settings
    # Configure cameras
    pass

def render_angle(camera_name, output_path, samples):
    """Render from specific camera angle"""
    # Set active camera
    # Configure output path
    # Render image
    pass

def render_animation(output_path, samples):
    """Render 360° turntable animation"""
    # Set up animation
    # Configure output
    # Render frames
    pass

def main():
    # Parse arguments after '--'
    argv = sys.argv[sys.argv.index("--") + 1:]

    blend_file = argv[0]
    texture_path = argv[1]
    output_dir = argv[2]
    samples = int(argv[3])

    # Parse optional flags
    images_only = '--images-only' in argv
    animation_only = '--animation-only' in argv

    # Implementation here...

    # Output rendered file paths
    print(f"Rendered front_0deg: design_front_0deg.png")
    # ... more outputs

    return 0

if __name__ == "__main__":
    sys.exit(main())
```

## Template Files

### 2D Templates (render-assets/templates/)

Template files should be:
- **Format:** PNG with transparency
- **Resolution:** 2048x2048 or higher
- **Content:** Realistic t-shirt mockup (front or back view)
- **Naming:** Descriptive (e.g., `white-tshirt-front.png`, `black-tshirt-back.png`)

Example template structure:
```
render-assets/templates/
├── white-tshirt-front.png
├── white-tshirt-back.png
├── black-tshirt-front.png
├── black-tshirt-back.png
├── navy-tshirt-front.png
└── navy-tshirt-back.png
```

### 3D Models (render-assets/models/)

Blender files should include:
- **Format:** .blend (Blender 3.6+ compatible)
- **Mesh:** UV unwrapped t-shirt model
- **Material:** Basic material with texture node setup
- **Cameras:** Multiple camera angles or script creates them
- **Lighting:** Professional 3-point lighting or HDRI
- **Naming:** Descriptive (e.g., `tshirt-basic.blend`, `tshirt-vneck.blend`)

Example model structure:
```
render-assets/models/
├── tshirt-basic.blend
├── tshirt-vneck.blend
└── tshirt-longsleeve.blend
```

## Testing

### Manual Testing - Composition Script

```bash
# Test compose_design.py manually
python3 apps/server/scripts/render-engine/compose_design.py \
  --template apps/server/render-assets/templates/white-tshirt-front.png \
  --design /path/to/test-design.png \
  --preset chest-medium \
  --output /tmp/test-output.png
```

Expected result:
- Exit code: 0
- Output file created: `/tmp/test-output.png`
- Console message: "Composited design successfully: /tmp/test-output.png"

### Manual Testing - Render Script

```bash
# Test render_design.py manually
blender --background apps/server/render-assets/models/tshirt-basic.blend \
  --python apps/server/scripts/render-engine/render_design.py \
  -- \
  apps/server/render-assets/models/tshirt-basic.blend \
  /tmp/test-output.png \
  /tmp/renders \
  128
```

Expected result:
- Exit code: 0
- Output files created in `/tmp/renders/`
- Console messages listing each rendered file

### API Testing - Environment Validation

```bash
# Start Medusa server
cd apps/server
bun run dev

# Test environment validation endpoint
curl http://localhost:9000/admin/render-jobs/health
```

Expected response:
```json
{
  "pythonAvailable": true,
  "pythonVersion": "Python 3.13.7",
  "pillowAvailable": true,
  "blenderAvailable": true,
  "blenderVersion": "4.5.3"
}
```

## Troubleshooting

### Issue: Blender library errors on Manjaro/Arch

**Symptom:**
```
blender: error while loading shared libraries: libavcodec.so.61: cannot open shared object file
```

**Cause:** Blender 4.5+ requires ffmpeg 7.x libraries but system has ffmpeg 8.x

**Solutions:**

1. **Downgrade ffmpeg (temporary):**
```bash
sudo pacman -U /var/cache/pacman/pkg/ffmpeg-7.*
```

2. **Use Blender Flatpak (recommended):**
```bash
flatpak install flathub org.blender.Blender
# Add alias to .bashrc or .zshrc:
alias blender='flatpak run org.blender.Blender'
```

3. **Use Blender Snap:**
```bash
sudo pacman -S snapd
sudo snap install blender --classic
```

4. **Build Blender from source with system libraries**

5. **Wait for Blender 4.6+ which supports ffmpeg 8.x**

### Issue: Python script not found

**Symptom:** PythonExecutorService logs "Script not found: compose_design.py"

**Solution:** Ensure scripts are at project root level:
- NOT: `apps/server/scripts/render-engine/compose_design.py`
- YES: `compose_design.py` (at repository root)
- YES: `render_design.py` (at repository root)

The service looks for scripts at: `PROJECT_ROOT/compose_design.py`

### Issue: Pillow not found

**Symptom:** "ModuleNotFoundError: No module named 'PIL'"

**Solution:**
```bash
pip install Pillow
# Or system-wide
sudo pip install Pillow
```

### Issue: Permission denied writing output

**Symptom:** "Error: Cannot write to output path"

**Solution:** Ensure output directories exist and are writable:
```bash
mkdir -p apps/server/static/uploads/composited
mkdir -p apps/server/static/uploads/renders
chmod 755 apps/server/static/uploads
```

### Issue: Template or model files not found

**Symptom:** "Template file not found" or "Blend file not found"

**Solution:** Create template/model directories and add files:
```bash
mkdir -p apps/server/render-assets/templates
mkdir -p apps/server/render-assets/models
# Add your template and model files
```

## Integration with Medusa Backend

The scripts are executed by `PythonExecutorService` which:
- Validates all file paths for security
- Sets execution timeout (5 minutes)
- Captures stdout/stderr for logging
- Returns structured results to RenderJobService

See `apps/server/src/modules/render-engine/services/python-executor-service.ts` for implementation details.

## Performance Considerations

### Composition Performance
- Typical execution time: 1-3 seconds
- Memory usage: ~50-100MB
- Depends on: Image resolution, format conversion

### Rendering Performance
- Typical execution time: 30-120 seconds per job
- Memory usage: ~500MB-2GB
- Depends on: Samples, resolution, animation length
- Optimize by:
  - Using lower samples for previews (64-128)
  - Using EEVEE engine for faster renders
  - Caching Blender instance
  - Running renders in background queue

## Security Considerations

The PythonExecutorService implements multiple security measures:
- Path sanitization and traversal prevention
- Allowed file extension validation
- Process timeout enforcement
- Limited environment variables
- Working directory isolation
- No shell injection (direct process spawn)

Never allow user-controlled Python code execution.

## Utility Scripts

This directory includes three utility scripts for validating and testing the render engine system.

### validate-templates.js

Validates that all render templates exist in the database and their associated files are present.

**Usage:**
```bash
node scripts/render-engine/validate-templates.js [--help]
```

**What it checks:**
- Template records exist in database
- Template image files (.png) are present
- Blend files (.blend) are present
- Available presets are configured

**Exit codes:**
- `0` - All templates valid
- `1` - Validation errors found
- `2` - Script execution error

### test-python.js

Tests the Python environment for all render engine requirements.

**Usage:**
```bash
node scripts/render-engine/test-python.js [--verbose] [--help]
```

**Options:**
- `--verbose`, `-v` - Show detailed output
- `--help`, `-h` - Show help message

**What it tests:**
- Python 3 installation and version
- Pillow (PIL) library availability
- Blender installation and version
- Python script syntax validation
- PythonExecutorService integration

**Exit codes:**
- `0` - All requirements met
- `1` - Missing requirements
- `2` - Script execution error

### health-check.js

Performs a comprehensive health check of the entire render engine system.

**Usage:**
```bash
node scripts/render-engine/health-check.js [--json] [--verbose] [--help]
```

**Options:**
- `--json` - Output results as JSON (useful for CI/CD)
- `--verbose`, `-v` - Show detailed output
- `--help`, `-h` - Show help message

**What it checks:**
1. Python Environment (Python 3, Pillow, Blender)
2. Database & Templates (connectivity, records, files)
3. Python Scripts (existence, syntax)
4. File System (upload/render directory permissions)
5. Service Integration (RenderEngineService, PythonExecutorService, RenderJobService)

**Exit codes:**
- `0` - System is healthy
- `1` - Health check failed
- `2` - Script execution error

**Example JSON output:**
```json
{
  "timestamp": "2025-10-15T12:00:00.000Z",
  "pythonEnvironment": {
    "healthy": true,
    "checks": {
      "python": true,
      "pythonVersion": "Python 3.11.6",
      "pillow": true,
      "pillowVersion": "10.1.0",
      "blender": true,
      "blenderVersion": "4.0.1"
    }
  },
  "overall": {
    "healthy": true,
    "message": "System is healthy"
  }
}
```

### Using Scripts in CI/CD

**GitHub Actions example:**
```yaml
- name: Health Check Render Engine
  run: |
    cd apps/server
    node scripts/render-engine/health-check.js --json
```

**Pre-deployment check:**
```bash
#!/bin/bash
node apps/server/scripts/render-engine/health-check.js
if [ $? -eq 0 ]; then
    echo "Health check passed. Deploying..."
    # deployment commands
else
    echo "Health check failed. Aborting."
    exit 1
fi
```

## Deployment Checklist

- [ ] Python 3.8+ installed
- [ ] Pillow 11.0.0+ installed
- [ ] Blender 3.6+ installed and accessible
- [ ] Scripts placed at correct locations
- [ ] Template files added to render-assets/templates/
- [ ] Model files added to render-assets/models/
- [ ] Output directories created with proper permissions
- [ ] **Run health check:** `node scripts/render-engine/health-check.js`
- [ ] **Validate templates:** `node scripts/render-engine/validate-templates.js`
- [ ] **Test Python environment:** `node scripts/render-engine/test-python.js`
- [ ] Environment validation endpoint tested
- [ ] Manual script testing completed
- [ ] Render quality settings configured
- [ ] Background job queue configured
- [ ] Monitoring and logging enabled

## Additional Resources

- [Pillow Documentation](https://pillow.readthedocs.io/)
- [Blender Python API](https://docs.blender.org/api/current/)
- [Blender Scripting Guide](https://docs.blender.org/manual/en/latest/advanced/scripting/index.html)
- [Medusa v2 Documentation](../../MEDUSA_DOCS.md)

## Support

For issues or questions:
1. Check this README troubleshooting section
2. Review PythonExecutorService logs in `apps/server/logs/`
3. Test scripts manually with verbose output
4. Check Medusa backend health endpoint
