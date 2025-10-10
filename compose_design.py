#!/usr/bin/env python3
"""
T-Shirt Design Compositor
Composites user-provided designs onto a T-shirt template with predefined positioning presets.
"""

import argparse
import sys
from pathlib import Path
from PIL import Image


def parse_color(color_input: str) -> tuple:
    """Parse color from hex code or color name to RGBA tuple.

    Supports:
    - Hex codes: #RRGGBB or #RRGGBBAA
    - Named colors: white, black, red, blue, green, etc.
    """
    # Standard color names to RGB mapping
    color_names = {
        'white': (255, 255, 255),
        'black': (0, 0, 0),
        'red': (255, 0, 0),
        'dark-red': (139, 0, 0),
        'green': (0, 128, 0),
        'dark-green': (0, 100, 0),
        'blue': (0, 0, 255),
        'dark-blue': (0, 0, 139),
        'navy': (0, 0, 128),
        'yellow': (255, 255, 0),
        'orange': (255, 165, 0),
        'purple': (128, 0, 128),
        'pink': (255, 192, 203),
        'gray': (128, 128, 128),
        'grey': (128, 128, 128),
        'light-gray': (211, 211, 211),
        'light-grey': (211, 211, 211),
        'dark-gray': (169, 169, 169),
        'dark-grey': (169, 169, 169),
        'brown': (165, 42, 42),
        'beige': (245, 245, 220),
        'cream': (255, 253, 208),
    }

    # Handle hex colors
    if color_input.startswith('#'):
        hex_color = color_input.lstrip('#')
        if len(hex_color) == 6:
            r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
            return (r, g, b, 255)
        elif len(hex_color) == 8:
            r, g, b, a = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16), int(hex_color[6:8], 16)
            return (r, g, b, a)
        else:
            print(f"Error: Invalid hex color '{color_input}'. Use #RRGGBB or #RRGGBBAA format.")
            sys.exit(1)

    # Handle named colors
    color_lower = color_input.lower()
    if color_lower in color_names:
        rgb = color_names[color_lower]
        return rgb + (255,)  # Add full opacity

    # Error if not found
    available_colors = ', '.join(sorted(color_names.keys()))
    print(f"Error: Unknown color '{color_input}'")
    print(f"Available color names: {available_colors}")
    print(f"Or use hex format: #RRGGBB or #RRGGBBAA")
    sys.exit(1)


def load_template(path: Path, fabric_color: tuple = None) -> Image.Image:
    """Load template and optionally recolor white fabric areas with specified color.

    Args:
        path: Path to the template PNG file
        fabric_color: Optional RGBA tuple (R, G, B, A) to replace white fabric areas

    The template has white shirt shapes on transparent/black background.
    When fabric_color is specified, white pixels are replaced with the color.
    """
    try:
        img = Image.open(path)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')

        # If fabric color specified, replace white pixels with the color
        if fabric_color:
            pixels = img.load()
            width, height = img.size

            # Replace white/light pixels (shirt fabric) with the specified color
            for y in range(height):
                for x in range(width):
                    r, g, b, a = pixels[x, y]
                    # If pixel is mostly white (fabric area) and not transparent
                    if r > 200 and g > 200 and b > 200 and a > 200:
                        # Replace RGB with fabric color, keep alpha
                        pixels[x, y] = fabric_color[:3] + (a,)

        return img
    except FileNotFoundError:
        print(f"Error: Template file not found: {path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: Failed to load template: {e}")
        sys.exit(1)


def load_design(path: Path) -> Image.Image:
    """Load design and convert to RGBA."""
    try:
        img = Image.open(path)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        return img
    except FileNotFoundError:
        print(f"Error: Design file not found: {path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: Failed to load design: {e}")
        sys.exit(1)


def analyze_template(template_img: Image.Image) -> dict:
    """Analyze template to find panel boundaries."""
    width, height = template_img.size

    # Template is divided into 2x2 grid:
    # Top-left: Left sleeve | Top-right: Right sleeve
    # Bottom-left: Front panel | Bottom-right: Back panel

    half_width = width // 2
    half_height = height // 2

    return {
        'template_width': width,
        'template_height': height,
        'front_panel': {
            'x_start': 0,
            'x_end': half_width,
            'y_start': half_height,
            'y_end': height
        },
        'back_panel': {
            'x_start': half_width,
            'x_end': width,
            'y_start': half_height,
            'y_end': height
        },
        'left_sleeve': {
            'x_start': 0,
            'x_end': half_width,
            'y_start': 0,
            'y_end': half_height
        },
        'right_sleeve': {
            'x_start': half_width,
            'x_end': width,
            'y_start': 0,
            'y_end': half_height
        }
    }


def get_position_config(position: str, size: str) -> dict:
    """Return positioning parameters based on position and size."""
    # Position configurations
    position_configs = {
        'chest': {
            'panel': 'front_panel',
            'vertical_offset': 0.25  # Position at 25% down (chest area)
        },
        'dead-center': {
            'panel': 'front_panel',
            'vertical_offset': 0.45  # Position at 45% down (dead center)
        },
        'back': {
            'panel': 'back_panel',
            'vertical_offset': 0.45
        }
    }

    # Size configurations
    size_configs = {
        'large': 0.65,
        'medium': 0.55,
        'small': 0.45
    }

    if position not in position_configs:
        available = ', '.join(position_configs.keys())
        print(f"Error: Unknown position '{position}'")
        print(f"Available positions: {available}")
        sys.exit(1)

    if size not in size_configs:
        available = ', '.join(size_configs.keys())
        print(f"Error: Unknown size '{size}'")
        print(f"Available sizes: {available}")
        sys.exit(1)

    # Combine position and size configurations
    config = position_configs[position].copy()
    config['scale_factor'] = size_configs[size]
    config['margin'] = 0.10

    return config


def get_preset_config(preset_name: str) -> dict:
    """Return positioning parameters for preset."""
    presets = {
        'chest-large': {
            'panel': 'front_panel',
            'scale_factor': 0.65,
            'margin': 0.10,
            'vertical_offset': 0.25
        },
        'chest-medium': {
            'panel': 'front_panel',
            'scale_factor': 0.55,
            'margin': 0.10,
            'vertical_offset': 0.25
        },
        'chest-small': {
            'panel': 'front_panel',
            'scale_factor': 0.45,
            'margin': 0.10,
            'vertical_offset': 0.25
        },
        'dead-center-large': {
            'panel': 'front_panel',
            'scale_factor': 0.65,
            'margin': 0.10,
            'vertical_offset': 0.45
        },
        'dead-center-medium': {
            'panel': 'front_panel',
            'scale_factor': 0.55,
            'margin': 0.10,
            'vertical_offset': 0.45
        },
        'dead-center-small': {
            'panel': 'front_panel',
            'scale_factor': 0.45,
            'margin': 0.10,
            'vertical_offset': 0.45
        },
        'back-large': {
            'panel': 'back_panel',
            'scale_factor': 0.65,
            'margin': 0.10,
            'vertical_offset': 0.45
        },
        'back-medium': {
            'panel': 'back_panel',
            'scale_factor': 0.55,
            'margin': 0.10,
            'vertical_offset': 0.45
        },
        'back-small': {
            'panel': 'back_panel',
            'scale_factor': 0.45,
            'margin': 0.10,
            'vertical_offset': 0.45
        }
    }

    if preset_name not in presets:
        available = ', '.join(sorted(presets.keys()))
        print(f"Error: Unknown preset '{preset_name}'")
        print(f"Available presets: {available}")
        sys.exit(1)

    return presets[preset_name]


def scale_design(design_img: Image.Image, target_width: int, target_height: int) -> Image.Image:
    """Scale design with high quality using Lanczos resampling."""
    return design_img.resize((int(target_width), int(target_height)), Image.Resampling.LANCZOS)


def composite_design(template_img: Image.Image, design_img: Image.Image,
                    template_analysis: dict, position_preset: dict) -> Image.Image:
    """Main compositing logic."""
    # Get the target panel (e.g., front_panel)
    panel_name = position_preset['panel']
    panel = template_analysis[panel_name]

    # Calculate panel dimensions
    panel_width = panel['x_end'] - panel['x_start']
    panel_height = panel['y_end'] - panel['y_start']

    # Apply margins to get printable area
    margin = position_preset['margin']
    printable_x_start = panel['x_start'] + panel_width * margin
    printable_x_end = panel['x_end'] - panel_width * margin
    printable_y_start = panel['y_start'] + panel_height * margin
    printable_y_end = panel['y_end'] - panel_height * margin

    printable_width = printable_x_end - printable_x_start
    printable_height = printable_y_end - printable_y_start

    # Calculate target design dimensions
    design_width, design_height = design_img.size
    design_aspect = design_height / design_width

    target_width = printable_width * position_preset['scale_factor']
    target_height = target_width * design_aspect

    # Ensure design doesn't exceed printable height
    if target_height > printable_height * 0.8:
        target_height = printable_height * 0.8
        target_width = target_height / design_aspect

    # Scale design
    scaled_design = scale_design(design_img, target_width, target_height)

    # Calculate center position
    vertical_offset = position_preset['vertical_offset']
    center_x = printable_x_start + printable_width / 2
    center_y = printable_y_start + printable_height * vertical_offset

    # Calculate paste position (top-left corner)
    paste_x = int(center_x - target_width / 2)
    paste_y = int(center_y - target_height / 2)

    # Create a copy of the template to avoid modifying the original
    output = template_img.copy()

    # Composite onto template using alpha channel for proper transparency
    output.paste(scaled_design, (paste_x, paste_y), scaled_design)

    return output


def save_output(img: Image.Image, output_path: Path) -> None:
    """Save final composited image."""
    try:
        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, 'PNG')
        print(f"Success: Design composited and saved to {output_path}")
    except Exception as e:
        print(f"Error: Failed to save output: {e}")
        sys.exit(1)


def main():
    """Parse args and orchestrate workflow."""
    parser = argparse.ArgumentParser(
        description='Composite a design onto a T-shirt template with predefined positioning.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Using preset (all-in-one configuration)
  %(prog)s --template shirt.png --design logo.png --preset chest-large --output result.png

  # Using position and size separately
  %(prog)s --template shirt.png --design logo.png --position chest --size large --output result.png

  # Using position only (defaults to large size)
  %(prog)s --template shirt.png --design logo.png --position back --output result.png

Available presets:
  back-large, back-medium, back-small
  chest-large, chest-medium, chest-small
  dead-center-large, dead-center-medium, dead-center-small

Available positions:
  chest, dead-center, back

Available sizes:
  small, medium, large
"""
    )
    parser.add_argument(
        '--template',
        type=Path,
        required=True,
        help='Path to template PNG file'
    )
    parser.add_argument(
        '--design',
        type=Path,
        required=True,
        help='Path to input design image'
    )
    parser.add_argument(
        '--preset',
        type=str,
        help='Preset configuration (e.g., chest-large, dead-center-medium, back-small). Cannot be used with --position or --size.'
    )
    parser.add_argument(
        '--position',
        type=str,
        choices=['chest', 'dead-center', 'back'],
        help='Design position on shirt. Cannot be used with --preset.'
    )
    parser.add_argument(
        '--size',
        type=str,
        choices=['small', 'medium', 'large'],
        help='Design size. Cannot be used with --preset.'
    )
    parser.add_argument(
        '--output',
        type=Path,
        required=True,
        help='Path for output PNG file'
    )
    parser.add_argument(
        '-f', '--fabric-color',
        type=str,
        default=None,
        help='Fabric/shirt color as hex (#RRGGBB) or name (white, black, red, yellow, navy, etc.)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose output for debugging'
    )

    args = parser.parse_args()

    # Validate parameter combinations
    if args.preset and (args.position or args.size):
        print("Error: --preset cannot be used with --position or --size")
        print("Use either --preset alone, or --position with optional --size")
        sys.exit(1)

    if not args.preset and not args.position:
        print("Error: Either --preset or --position must be specified")
        parser.print_help()
        sys.exit(1)

    # Determine configuration
    if args.preset:
        if args.verbose:
            print(f"Using preset: {args.preset}")
        position_config = get_preset_config(args.preset)
    else:
        # Default to large size if not specified
        size = args.size if args.size else 'large'
        if not args.size:
            print(f"Info: No size specified, defaulting to 'large'")
        if args.verbose:
            print(f"Using position: {args.position}, size: {size}")
        position_config = get_position_config(args.position, size)

    # Parse fabric color if specified
    fabric_color = None
    if args.fabric_color:
        fabric_color = parse_color(args.fabric_color)
        if args.verbose:
            print(f"Using fabric color: {args.fabric_color} -> RGBA{fabric_color}")

    # Load images
    if args.verbose:
        print(f"Loading template: {args.template}")
    template = load_template(args.template, fabric_color)

    if args.verbose:
        print(f"Loading design: {args.design}")
    design = load_design(args.design)

    # Analyze template
    if args.verbose:
        print("Analyzing template dimensions and panel layout")
    template_analysis = analyze_template(template)

    if args.verbose:
        print(f"Template size: {template_analysis['template_width']}x{template_analysis['template_height']}")

    # Composite design
    if args.verbose:
        print("Compositing design onto template")
    output = composite_design(template, design, template_analysis, position_config)

    # Save output
    save_output(output, args.output)


if __name__ == '__main__':
    main()
