# T-Shirt Design Compositor - Technical Specification

## Overview
A Python script that composites user-provided designs onto a T-shirt template, positioning them according to predefined presets. The script should handle transparency, scaling, and positioning to prepare designs for 3D rendering in Blender.

## Script Name
`compose_design.py`

## Dependencies
```
Pillow (PIL)
argparse
pathlib
```

## Input Files

### Template Image
- **File**: `template.png` (4096x4096px recommended, or provided dimensions)
- **Format**: PNG with alpha channel
- **Layout**: 
  - Top row: Two sleeves
  - Bottom row: Front panel (left), Back panel (right)
  - White areas = printable regions
  - Black areas = no-print zones

### Design Image
- **Format**: Any common image format (PNG, JPG, etc.)
- **Alpha channel**: Should be preserved if present
- **Size**: Arbitrary (will be scaled by script)

## Command-Line Interface

```bash
python compose_design.py \
  --template <path_to_template> \
  --design <path_to_design_image> \
  --position <preset_name> \
  --output <output_path>
```

### Arguments
- `--template` (required): Path to template PNG file
- `--design` (required): Path to input design image
- `--position` (required): Position preset name (start with "chest-large")
- `--output` (required): Path for output PNG file
- `--color` (optional): Shirt color variant, default "white" (future: "black")

### Example Usage
```bash
python compose_design.py \
  --template ./template.png \
  --design ./barbecue_invite.png \
  --position chest-large \
  --output ./design_output.png
```

## Position Presets

### Phase 1: "chest-large"
The initial preset to implement for centered chest placement.

**Requirements:**
1. Analyze template to identify front panel boundaries
2. Calculate center point of front chest area
3. Design should occupy approximately 60-70% of chest width
4. Maintain aspect ratio of input design
5. Center both horizontally and vertically within chest area
6. Position should be visually centered (slightly above geometric center is often better)

**Algorithm suggestion:**
1. Detect front panel bounds (bottom-left quadrant of template)
2. Define safe print zone (avoid getting too close to neckline/armholes)
3. Calculate target width: `chest_width * 0.65`
4. Scale design proportionally to fit target width
5. Position center of design at chest center point (or slightly higher)

### Future Presets (not implemented yet)
- `chest-small`: 40-50% of chest width
- `chest-medium`: 50-60% of chest width
- `back-large`: Same logic for back panel
- `left-chest`: Small logo position (pocket area)
- `sleeve-left`: Sleeve positioning
- `sleeve-right`: Sleeve positioning

## Technical Requirements

### Image Processing
1. **Load template**: Open as RGBA
2. **Load design**: Convert to RGBA if needed
3. **Scale design**: Use high-quality resampling (Pillow's `LANCZOS`)
4. **Composite**: Properly blend alpha channels
5. **Export**: PNG with full transparency preserved

### Template Analysis
Since template dimensions may vary, the script should:
1. Detect actual template dimensions
2. Calculate panel positions (assume 2x2 grid layout)
3. Derive coordinates for each printable area

**Suggested coordinate system:**
```
Template divided into quadrants:
- Top-left: Left sleeve
- Top-right: Right sleeve  
- Bottom-left: Front panel
- Bottom-right: Back panel
```

### Positioning Logic for "chest-large"

**Pseudo-algorithm:**
```python
# 1. Get template dimensions
template_width, template_height = template_image.size

# 2. Define front panel region (bottom-left quadrant)
front_x_start = 0
front_x_end = template_width // 2
front_y_start = template_height // 2
front_y_end = template_height

# 3. Calculate printable area within front panel
# (Avoid neckline, armholes, hem - suggest 10% margin)
margin = 0.10
printable_x_start = front_x_start + (front_x_end - front_x_start) * margin
printable_x_end = front_x_end - (front_x_end - front_x_start) * margin
printable_y_start = front_y_start + (front_y_end - front_y_start) * margin
printable_y_end = front_y_end - (front_y_end - front_y_start) * margin

printable_width = printable_x_end - printable_x_start
printable_height = printable_y_end - printable_y_start

# 4. Calculate target design dimensions
target_width = printable_width * 0.65  # 65% of printable width
design_aspect = design_height / design_width
target_height = target_width * design_aspect

# 5. Ensure design doesn't exceed printable height
if target_height > printable_height * 0.8:
    target_height = printable_height * 0.8
    target_width = target_height / design_aspect

# 6. Scale design
scaled_design = design_image.resize(
    (int(target_width), int(target_height)), 
    Image.LANCZOS
)

# 7. Calculate center position (slightly above geometric center)
center_x = printable_x_start + printable_width / 2
center_y = printable_y_start + printable_height * 0.45  # 45% down (visually centered)

# 8. Calculate paste position (top-left corner)
paste_x = int(center_x - target_width / 2)
paste_y = int(center_y - target_height / 2)

# 9. Composite onto template
template_image.paste(scaled_design, (paste_x, paste_y), scaled_design)
```

## Output

### Output File
- **Format**: PNG
- **Transparency**: Preserved from template
- **Dimensions**: Same as input template
- **Content**: Template with design composited at specified position

### Success Criteria
- Design is visible and correctly positioned
- No distortion of aspect ratio
- Alpha channel properly handled
- Clean edges (high-quality resampling)
- Design does not overlap non-printable areas

## Error Handling

The script should handle:
1. **Missing files**: Clear error if template or design not found
2. **Invalid image formats**: Graceful error for corrupted/unsupported files
3. **Invalid position preset**: List available presets
4. **Output path errors**: Check write permissions
5. **Design too large**: Warn if design exceeds recommended size limits

## Validation & Testing

### Test Cases
1. **Basic functionality**: Provided barbecue design on template
2. **Aspect ratios**: Test with square, portrait, and landscape designs
3. **Transparency**: Test with fully opaque and semi-transparent designs
4. **Small designs**: Ensure quality is maintained when upscaling
5. **Large designs**: Ensure proper downscaling

### Expected Output for Test Case
Given the barbecue invitation design:
- Should appear centered on front chest
- Should be large and prominent but not touching neckline or armholes
- Should maintain vibrant colors and sharp edges
- Background should remain transparent (or template color)

## Code Structure Suggestions

```python
# Recommended module organization:

def load_template(path):
    """Load and validate template image"""
    pass

def load_design(path):
    """Load design and convert to RGBA"""
    pass

def get_position_preset(preset_name):
    """Return positioning parameters for preset"""
    # Return dict with: target_region, scale_factor, offset, etc.
    pass

def analyze_template(template_img):
    """Analyze template to find panel boundaries"""
    pass

def scale_design(design_img, target_width, target_height):
    """Scale design with high quality"""
    pass

def composite_design(template_img, design_img, position_preset):
    """Main compositing logic"""
    pass

def save_output(img, output_path):
    """Save final composited image"""
    pass

def main():
    """Parse args and orchestrate workflow"""
    pass
```

## Future Enhancements (Not in MVP)

1. **Color variants**: Invert design colors for black shirts
2. **Multi-position**: Apply design to multiple locations in one run
3. **Batch processing**: Process multiple designs at once
4. **Visual preview**: Generate a quick preview before full render
5. **Custom positioning**: Accept pixel coordinates instead of presets
6. **Rotation/skew**: Apply transformations to design
7. **Config file**: Store presets in JSON/YAML configuration

## Notes

- All measurements should be calculated relative to template dimensions (no hardcoded pixels)
- Prioritize image quality over speed (this is offline processing)
- Comment the positioning math clearly for future adjustments
- Consider adding `--verbose` flag for debugging output