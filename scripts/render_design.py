#!/usr/bin/env python3
"""
Blender Product Renderer
Loads a texture onto a 3D garment model and renders from multiple camera angles.

Usage:
  blender --background template.blend --python render_design.py -- \
    template.blend texture.png output_dir [samples] [OPTIONS]

Arguments:
  template.blend    Path to Blender template file
  texture.png       Path to texture/design image to apply
  output_dir        Output directory for renders
  samples           Render samples (default: 128, higher = better quality)

Options:
  --images-only           Render still images only (6 angles)
  --animation-only        Render animation only (front camera)
  --no-animation          Skip animation (same as --images-only)
  -f, --fabric-color COLOR    Fabric/shirt base color (hex #RRGGBB or name)
  -b, --background-color COLOR Background color for renders (hex, name, or 'transparent')

Available colors:
  Named: white, black, red, blue, navy, green, dark-green, yellow, orange, purple, pink,
         gray, light-gray, dark-gray, brown, beige, cream
  Hex: #RRGGBB format (e.g., #FF5733)

Examples:
  # Render all angles + animation with default transparent background
  blender --background shirt.blend --python render_design.py -- shirt.blend design.png output/ 128

  # Render images only with black shirt on white background
  blender --background shirt.blend --python render_design.py -- \
    shirt.blend design.png output/ 128 --images-only -f black -b white

  # Render animation only with navy shirt
  blender --background shirt.blend --python render_design.py -- \
    shirt.blend design.png output/ 256 --animation-only -f navy
"""

import bpy
import sys
import os


def parse_color_to_rgb(color_input: str) -> tuple:
    """Parse color from hex code or color name to RGB tuple (0-1 range for Blender).

    Supports:
    - Hex codes: #RRGGBB
    - Named colors: white, black, red, blue, green, etc.
    """
    # Standard color names to RGB mapping (0-1 range)
    color_names = {
        'white': (1.0, 1.0, 1.0),
        'black': (0.0, 0.0, 0.0),
        'red': (1.0, 0.0, 0.0),
        'dark-red': (0.545, 0.0, 0.0),
        'green': (0.0, 0.502, 0.0),
        'dark-green': (0.0, 0.392, 0.0),
        'blue': (0.0, 0.0, 1.0),
        'dark-blue': (0.0, 0.0, 0.545),
        'navy': (0.0, 0.0, 0.502),
        'yellow': (1.0, 1.0, 0.0),
        'orange': (1.0, 0.647, 0.0),
        'purple': (0.502, 0.0, 0.502),
        'pink': (1.0, 0.753, 0.796),
        'gray': (0.502, 0.502, 0.502),
        'grey': (0.502, 0.502, 0.502),
        'light-gray': (0.827, 0.827, 0.827),
        'light-grey': (0.827, 0.827, 0.827),
        'dark-gray': (0.663, 0.663, 0.663),
        'dark-grey': (0.663, 0.663, 0.663),
        'brown': (0.647, 0.165, 0.165),
        'beige': (0.961, 0.961, 0.863),
        'cream': (1.0, 0.992, 0.816),
        'transparent': None  # Will be handled specially for world background
    }

    # Handle hex colors
    if color_input.startswith('#'):
        hex_color = color_input.lstrip('#')
        if len(hex_color) == 6:
            r = int(hex_color[0:2], 16) / 255.0
            g = int(hex_color[2:4], 16) / 255.0
            b = int(hex_color[4:6], 16) / 255.0
            return (r, g, b)
        else:
            raise ValueError(f"Invalid hex color '{color_input}'. Use #RRGGBB format.")

    # Handle named colors
    color_lower = color_input.lower()
    if color_lower in color_names:
        return color_names[color_lower]

    # Error if not found
    available_colors = ', '.join(sorted([k for k in color_names.keys() if k != 'transparent']))
    raise ValueError(f"Unknown color '{color_input}'. Available: {available_colors} or hex #RRGGBB")


def replace_texture_and_render(blend_file, texture_path, output_dir, samples=128, render_images=True, render_animation=True, fabric_color=None, background_color=None):
    """
    Replace texture in blend file and render image + animation

    Args:
        blend_file: Path to .blend template
        texture_path: Path to texture image
        output_dir: Output directory for renders
        samples: Number of render samples (default 128, lower = faster)
        render_images: Whether to render still images from all camera angles (default True)
        render_animation: Whether to render animation (default True)
        fabric_color: Optional RGB tuple (0-1 range) for fabric material color
        background_color: Optional RGB tuple (0-1 range) or None for transparent background
    """
    # Load the blend file
    bpy.ops.wm.open_mainfile(filepath=blend_file)

    # Find and replace base color image texture
    for mat in bpy.data.materials:
        if mat.use_nodes:
            nodes = mat.node_tree.nodes
            links = mat.node_tree.links

            # Find the base color texture node and BSDF
            tex_node = None
            bsdf_node = None

            for node in nodes:
                if node.type == 'TEX_IMAGE' and node.name == 'Image Texture':
                    tex_node = node
                elif node.type == 'BSDF_PRINCIPLED':
                    bsdf_node = node

            if tex_node:
                # Load new image
                tex_node.image = bpy.data.images.load(texture_path, check_existing=True)
                print(f"Loaded texture into material '{mat.name}'")

                # IMPORTANT: Connect texture alpha to shader alpha for transparency
                if bsdf_node and tex_node.outputs.get('Alpha'):
                    alpha_input = bsdf_node.inputs.get('Alpha')
                    if alpha_input and not alpha_input.is_linked:
                        links.new(tex_node.outputs['Alpha'], alpha_input)
                        print(f"  ✓ Connected texture alpha to shader alpha")

                    # Enable blend mode for proper transparency
                    mat.blend_method = 'BLEND'
                    if hasattr(mat, 'shadow_method'):
                        mat.shadow_method = 'HASHED'

    # Set fabric color if specified (only used when rendering without composed texture)
    # NOTE: When using --compose with fabric color, the color is already in the texture
    # This option is for directly rendering a design on colored fabric without pre-composition
    if fabric_color:
        print(f"Note: Fabric color specified as RGB{fabric_color}")
        print("WARNING: When using --compose with -f flag, fabric color is already in the texture.")
        print("The fabric color parameter in render_design.py is ignored when texture is present.")
        # We don't override the texture - the color should come from compose_design.py

    # Setup output paths
    design_name = os.path.splitext(os.path.basename(texture_path))[0]

    # Optimize render settings
    scene = bpy.context.scene
    scene.cycles.samples = samples  # Reduce samples for faster renders
    scene.cycles.use_denoising = True  # Enable denoising to compensate for lower samples
    scene.render.image_settings.file_format = 'PNG'

    # Set background color (world shader)
    if background_color is not None:
        # Enable transparent background or set solid color
        scene.render.film_transparent = False
        if scene.world and scene.world.use_nodes:
            # Find Background node and set color
            for node in scene.world.node_tree.nodes:
                if node.type == 'BACKGROUND':
                    node.inputs['Color'].default_value = background_color + (1.0,)  # Add alpha
                    print(f"Set background color to RGB{background_color}")
                    break
    else:
        # Use transparent background (default)
        scene.render.film_transparent = True
        print("Using transparent background")

    # Render still images from all camera angles
    if render_images:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        print(f"\nRendering {len(cameras)} camera angles...")

        for camera in cameras:
            # Set this camera as the active camera
            scene.camera = camera

            # Extract angle name from camera name
            angle_name = camera.name.replace("Camera_", "")

            # Render still image
            scene.render.filepath = os.path.join(output_dir, f"{design_name}_{angle_name}.png")
            bpy.ops.render.render(write_still=True)
            print(f"✓ Rendered {angle_name}: {design_name}_{angle_name}.png")
    else:
        print("\nSkipping still image rendering (--images-only not set)")

    # Render animation (turntable) if requested - always use front camera
    if render_animation:
        front_camera = bpy.data.objects.get("Camera_front_0deg")
        if front_camera:
            scene.camera = front_camera
            scene.render.filepath = os.path.join(output_dir, f"{design_name}_animation")
            scene.render.image_settings.file_format = 'FFMPEG'
            scene.render.ffmpeg.format = 'MPEG4'
            scene.render.ffmpeg.codec = 'H264'
            scene.render.ffmpeg.constant_rate_factor = 'HIGH'  # Good quality
            scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
            bpy.ops.render.render(animation=True)
            print(f"✓ Rendered animation from front camera: {design_name}_animation.mp4")
        else:
            print("⚠ Warning: Front camera not found, skipping animation")

    # Summary
    summary_parts = []
    if render_images:
        cameras = [obj for obj in bpy.data.objects if obj.type == 'CAMERA']
        summary_parts.append(f"{len(cameras)} angles")
    if render_animation:
        summary_parts.append("animation")

    print(f"\n✓ Completed rendering {design_name} - {' + '.join(summary_parts) if summary_parts else 'nothing (no render flags set)'}")

if __name__ == "__main__":
    # Parse arguments: blender file, texture, output directory, [samples], [flags]
    # Usage: -- blend_file texture_path output_dir [samples] [--images-only|--animation-only|--no-animation] [-f color] [-b color]
    args = sys.argv[sys.argv.index('--') + 1:]

    blend_file = args[0]
    texture_path = args[1]
    output_dir = args[2]
    samples = int(args[3]) if len(args) > 3 and args[3].isdigit() else 128

    # Determine what to render based on flags
    render_images = True
    render_animation = True
    fabric_color = None
    background_color = None

    if '--images-only' in args:
        render_animation = False
    elif '--animation-only' in args:
        render_images = False
    elif '--no-animation' in args:
        render_animation = False

    # Parse color arguments
    try:
        if '-f' in args:
            idx = args.index('-f')
            if idx + 1 < len(args):
                fabric_color = parse_color_to_rgb(args[idx + 1])
        elif '--fabric-color' in args:
            idx = args.index('--fabric-color')
            if idx + 1 < len(args):
                fabric_color = parse_color_to_rgb(args[idx + 1])

        if '-b' in args:
            idx = args.index('-b')
            if idx + 1 < len(args):
                bg_input = args[idx + 1]
                if bg_input.lower() != 'transparent':
                    background_color = parse_color_to_rgb(bg_input)
        elif '--background-color' in args:
            idx = args.index('--background-color')
            if idx + 1 < len(args):
                bg_input = args[idx + 1]
                if bg_input.lower() != 'transparent':
                    background_color = parse_color_to_rgb(bg_input)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)
    replace_texture_and_render(blend_file, texture_path, output_dir, samples, render_images, render_animation, fabric_color, background_color)
