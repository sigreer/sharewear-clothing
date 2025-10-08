#!/bin/bash
# Batch render multiple designs
# Usage: ./batch-render.sh <designs-directory> [output-dir] [samples] [--no-animation]
#
# Examples:
#   ./batch-render.sh designs/                        # Render all designs in designs/
#   ./batch-render.sh designs/ output/batch/ 64       # Fast preview batch
#   ./batch-render.sh designs/ output/ 256            # High quality batch

DESIGNS_DIR=$1
OUTPUT_DIR=${2:-output/renders}
SAMPLES=${3:-128}
NO_ANIM=$4

if [ -z "$DESIGNS_DIR" ]; then
    echo "Usage: $0 <designs-directory> [output-dir] [samples] [--no-animation]"
    exit 1
fi

if [ ! -d "$DESIGNS_DIR" ]; then
    echo "Error: Directory '$DESIGNS_DIR' not found"
    exit 1
fi

# Find all image files in the directory
shopt -s nullglob
DESIGNS=("$DESIGNS_DIR"/*.{png,jpg,jpeg,PNG,JPG,JPEG})

if [ ${#DESIGNS[@]} -eq 0 ]; then
    echo "No image files found in $DESIGNS_DIR"
    exit 1
fi

echo "Found ${#DESIGNS[@]} designs to render"
echo "Output directory: $OUTPUT_DIR"
echo "Samples: $SAMPLES"
echo "Animation: $([ "$NO_ANIM" = "--no-animation" ] && echo "disabled" || echo "enabled")"
echo ""

# Render each design
count=1
for design in "${DESIGNS[@]}"; do
    echo "[$count/${#DESIGNS[@]}] Rendering: $(basename "$design")"
    ./render-product.sh "$design" "$OUTPUT_DIR" "$SAMPLES" $NO_ANIM
    echo ""
    ((count++))
done

echo "✓ Batch rendering complete!"
echo "Output location: $OUTPUT_DIR"
