#!/bin/bash
# Render a product design using Blender headlessly
# Usage: ./render-product.sh <design-image> [output-dir] [samples] [--no-animation]
#
# Examples:
#   ./render-product.sh design.png                    # Default: 128 samples, with animation
#   ./render-product.sh design.png output/            # Custom output dir
#   ./render-product.sh design.png output/ 64         # Fast preview (64 samples)
#   ./render-product.sh design.png output/ 128 --no-animation  # Still image only

DESIGN=$1
OUTPUT_DIR=${2:-output/renders}
SAMPLES=${3:-128}
NO_ANIM=$4

if [ -z "$DESIGN" ]; then
    echo "Usage: $0 <design-image> [output-dir] [samples] [--no-animation]"
    echo ""
    echo "  samples: Lower = faster (default: 128, production: 256-512)"
    echo "  --no-animation: Skip animation rendering (faster)"
    exit 1
fi

if [ ! -f "$DESIGN" ]; then
    echo "Error: Design file '$DESIGN' not found"
    exit 1
fi

echo "Rendering: $DESIGN"
echo "Samples: $SAMPLES (lower = faster, higher = better quality)"
echo "Animation: $([ "$NO_ANIM" = "--no-animation" ] && echo "disabled" || echo "enabled")"
echo ""

BLEND_FILE="${BLEND_FILE:-assets/original-blender-template.blend}"

blender --background \
  "$BLEND_FILE" \
  --python render_design.py \
  -- \
  "$BLEND_FILE" \
  "$DESIGN" \
  "$OUTPUT_DIR" \
  "$SAMPLES" \
  $NO_ANIM
