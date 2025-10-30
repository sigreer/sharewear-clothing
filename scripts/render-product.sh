#!/bin/bash
# Render a product design using Blender headlessly
# Usage: ./render-product.sh <design-image> [OPTIONS]
#
# Options:
#   -o, --output DIR          Output directory (default: output/renders)
#   -s, --samples N           Render samples (default: 128, production: 256-512)
#   -f, --fabric-color COLOR  Fabric/shirt color (hex #RRGGBB or name: white, black, red, etc.)
#   -b, --background-color COLOR  Background color for renders (hex #RRGGBB, name, or 'transparent')
#   --images-only             Render still images only (skip animation)
#   --animation-only          Render animation only (skip still images)
#   --no-animation            Skip animation rendering (same as --images-only)
#   --compose PRESET          Composite design onto template first using preset
#                             (e.g., chest-large, dead-center-medium, back-small)
#   -h, --help                Show this help message
#
# Examples:
#   ./render-product.sh design.png                                        # Render all angles + animation
#   ./render-product.sh logo.png --compose chest-large                    # Composite + render all
#   ./render-product.sh design.png -o output/ -s 64                       # Fast preview (all)
#   ./render-product.sh design.png --images-only                          # Still images only (6 angles)
#   ./render-product.sh design.png --animation-only                       # Animation only
#   ./render-product.sh logo.png --compose back-medium -s 256             # High quality with composition
#   ./render-product.sh design.png -f black -b white                      # Black shirt, white background
#   ./render-product.sh logo.png --compose chest-large -f navy -b transparent  # Navy shirt, transparent bg

set -e  # Exit on error

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
OUTPUT_DIR="output/renders"
SAMPLES=128
RENDER_FLAGS=""
COMPOSE_PRESET=""
FABRIC_COLOR=""
BACKGROUND_COLOR=""
TEMPLATE="$PROJECT_ROOT/assets/t-shirt-template.png"
BLEND_FILE="$PROJECT_ROOT/assets/original-blender-template.blend"

# Parse arguments
DESIGN=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            sed -n '2,25p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -s|--samples)
            SAMPLES="$2"
            shift 2
            ;;
        -f|--fabric-color)
            FABRIC_COLOR="$2"
            shift 2
            ;;
        -b|--background-color)
            BACKGROUND_COLOR="$2"
            shift 2
            ;;
        --images-only)
            RENDER_FLAGS="--images-only"
            shift
            ;;
        --animation-only)
            RENDER_FLAGS="--animation-only"
            shift
            ;;
        --no-animation)
            RENDER_FLAGS="--no-animation"
            shift
            ;;
        --compose)
            COMPOSE_PRESET="$2"
            shift 2
            ;;
        -*)
            echo "Error: Unknown option $1"
            echo "Run with --help for usage"
            exit 1
            ;;
        *)
            if [ -z "$DESIGN" ]; then
                DESIGN="$1"
            else
                echo "Error: Multiple design files specified"
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [ -z "$DESIGN" ]; then
    echo "Error: Design file required"
    echo "Run with --help for usage"
    exit 1
fi

if [ ! -f "$DESIGN" ]; then
    echo "Error: Design file '$DESIGN' not found"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Composite design if requested
RENDER_INPUT="$DESIGN"
if [ -n "$COMPOSE_PRESET" ]; then
    echo "Compositing design with preset: $COMPOSE_PRESET"
    DESIGN_NAME=$(basename "$DESIGN" | sed 's/\.[^.]*$//')
    COMPOSITED="${OUTPUT_DIR}/${DESIGN_NAME}_${COMPOSE_PRESET}_composited.png"

    if [ ! -f "$TEMPLATE" ]; then
        echo "Error: Template file '$TEMPLATE' not found"
        exit 1
    fi

    # Build compose command with optional fabric color using array
    COMPOSE_CMD=(python3 "$SCRIPT_DIR/compose_design.py" --template "$TEMPLATE" --design "$DESIGN" --preset "$COMPOSE_PRESET" --output "$COMPOSITED")

    if [ -n "$FABRIC_COLOR" ]; then
        COMPOSE_CMD+=(-f "$FABRIC_COLOR")
    fi

    "${COMPOSE_CMD[@]}"

    RENDER_INPUT="$COMPOSITED"
    echo ""
fi

# Render with Blender
echo "Rendering: $RENDER_INPUT"
echo "Samples: $SAMPLES (lower = faster, higher = better quality)"
case "$RENDER_FLAGS" in
    --images-only)
        echo "Mode: Still images only (6 camera angles)"
        ;;
    --animation-only)
        echo "Mode: Animation only"
        ;;
    --no-animation)
        echo "Mode: Still images only (6 camera angles)"
        ;;
    *)
        echo "Mode: All camera angles + animation"
        ;;
esac
echo ""

if [ ! -f "$BLEND_FILE" ]; then
    echo "Error: Blend file '$BLEND_FILE' not found"
    exit 1
fi

# Build Blender command - construct argument array properly
BLENDER_CMD=(blender --background "$BLEND_FILE" --python "$SCRIPT_DIR/render_design.py" -- "$BLEND_FILE" "$RENDER_INPUT" "$OUTPUT_DIR" "$SAMPLES")

# Add render flags if set
if [ -n "$RENDER_FLAGS" ]; then
    BLENDER_CMD+=($RENDER_FLAGS)
fi

# Add color arguments if set
# NOTE: Fabric color is only passed to Blender when NOT using --compose
# When using --compose, the fabric color is already baked into the texture
if [ -n "$FABRIC_COLOR" ] && [ -z "$COMPOSE_PRESET" ]; then
    BLENDER_CMD+=(-f "$FABRIC_COLOR")
    echo "Applying fabric color in Blender: $FABRIC_COLOR"
elif [ -n "$FABRIC_COLOR" ] && [ -n "$COMPOSE_PRESET" ]; then
    echo "Fabric color already applied during composition"
fi

if [ -n "$BACKGROUND_COLOR" ]; then
    BLENDER_CMD+=(-b "$BACKGROUND_COLOR")
fi

# Execute Blender command
"${BLENDER_CMD[@]}"
