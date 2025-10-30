#!/bin/bash
# Export product design to GLB format for web embedding
# Usage: ./export-glb.sh <design-image> [OPTIONS]
#
# Options:
#   -o, --output FILE         Output GLB file path (default: output/model.glb)
#   -f, --fabric-color COLOR  Fabric/shirt color (hex #RRGGBB or name: white, black, red, etc.)
#   --draco                   Enable Draco compression for smaller file size
#   --compose PRESET          Composite design onto template first using preset
#                             (e.g., chest-large, dead-center-medium, back-small)
#   -h, --help                Show this help message
#
# Examples:
#   ./export-glb.sh design.png                                    # Export with default settings
#   ./export-glb.sh logo.png --compose chest-large               # Composite then export
#   ./export-glb.sh design.png -o models/shirt.glb --draco       # Custom output with compression
#   ./export-glb.sh logo.png --compose back-medium -f navy       # Navy shirt with design on back

set -e  # Exit on error

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
OUTPUT_FILE="output/model.glb"
COMPOSE_PRESET=""
FABRIC_COLOR=""
DRACO_FLAG=""
TEMPLATE="$PROJECT_ROOT/assets/t-shirt-template.png"
BLEND_FILE="$PROJECT_ROOT/assets/original-blender-template.blend"

# Parse arguments
DESIGN=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            sed -n '2,16p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -f|--fabric-color)
            FABRIC_COLOR="$2"
            shift 2
            ;;
        --draco)
            DRACO_FLAG="--draco"
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
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
mkdir -p "$OUTPUT_DIR"

# Composite design if requested
EXPORT_INPUT="$DESIGN"
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

    EXPORT_INPUT="$COMPOSITED"
    echo ""
fi

# Export to GLB with Blender
echo "Exporting to GLB: $OUTPUT_FILE"
if [ -n "$DRACO_FLAG" ]; then
    echo "Draco compression: Enabled"
else
    echo "Draco compression: Disabled (use --draco to enable)"
fi
echo ""

if [ ! -f "$BLEND_FILE" ]; then
    echo "Error: Blend file '$BLEND_FILE' not found"
    exit 1
fi

# Build Blender command
BLENDER_CMD=(blender --background "$BLEND_FILE" --python "$SCRIPT_DIR/export_glb.py" -- "$BLEND_FILE" "$EXPORT_INPUT" "$OUTPUT_FILE")

# Add draco flag if set
if [ -n "$DRACO_FLAG" ]; then
    BLENDER_CMD+=($DRACO_FLAG)
fi

# Execute Blender command
"${BLENDER_CMD[@]}"
