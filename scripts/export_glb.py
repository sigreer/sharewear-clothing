#!/usr/bin/env python3
"""
Blender GLB Exporter
Exports the 3D garment model with applied texture to GLB format for web embedding.

Usage:
  blender --background template.blend --python export_glb.py -- \
    template.blend texture.png output.glb

Arguments:
  template.blend    Path to Blender template file
  texture.png       Path to texture/design image to apply
  output.glb        Output GLB file path

Options:
  --draco           Use Draco compression (smaller file size)
  --no-draco        Disable Draco compression (default, better compatibility)

Examples:
  # Export with texture applied
  blender --background shirt.blend --python export_glb.py -- \
    shirt.blend design.png output/model.glb

  # Export with Draco compression for smaller file size
  blender --background shirt.blend --python export_glb.py -- \
    shirt.blend design.png output/model.glb --draco
"""

import bpy
import sys
import os


def export_glb(blend_file, texture_path, output_path, use_draco=False):
    """
    Export Blender scene to GLB format with texture applied.

    Args:
        blend_file: Path to .blend template
        texture_path: Path to texture image
        output_path: Output GLB file path
        use_draco: Whether to use Draco compression (default False for better compatibility)
    """
    # Load the blend file
    bpy.ops.wm.open_mainfile(filepath=blend_file)

    # Center the mesh origin for proper rotation in web viewers
    # This ensures the model rotates around its center, not an offset point
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            # Select the object
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)

            # Set origin to geometry center (mass center)
            bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS', center='BOUNDS')

            # Optionally move to world origin for consistent positioning
            obj.location = (0, 0, 0)

            print(f"Centered origin for mesh: {obj.name}")

            obj.select_set(False)

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

                # Connect texture alpha to shader alpha for transparency
                if bsdf_node and tex_node.outputs.get('Alpha'):
                    alpha_input = bsdf_node.inputs.get('Alpha')
                    if alpha_input and not alpha_input.is_linked:
                        links.new(tex_node.outputs['Alpha'], alpha_input)
                        print(f"  ✓ Connected texture alpha to shader alpha")

                    # Enable blend mode for proper transparency
                    mat.blend_method = 'BLEND'
                    if hasattr(mat, 'shadow_method'):
                        mat.shadow_method = 'HASHED'

                    # Fix transparency rendering issues
                    mat.use_backface_culling = False  # Render both sides of fabric

                    # Set BSDF for better alpha handling
                    if bsdf_node:
                        # Ensure alpha is respected in shader
                        bsdf_node.inputs['Alpha'].default_value = 1.0
                        # Disable screen space refraction (can cause artifacts)
                        if 'Transmission' in bsdf_node.inputs:
                            bsdf_node.inputs['Transmission'].default_value = 0.0

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # Export settings (Blender 4.5 compatible)
    export_settings = {
        'filepath': output_path,
        'export_format': 'GLB',  # GLB is binary glTF (single file)
        'export_draco_mesh_compression_enable': use_draco,
        'export_draco_mesh_compression_level': 6 if use_draco else 0,
        'export_texture_dir': '',  # Embed textures in GLB
        'export_materials': 'EXPORT',
        'export_image_format': 'AUTO',  # Auto-detect best format
        'export_texcoords': True,
        'export_normals': True,
        'export_tangents': False,
        'export_cameras': False,  # Don't export cameras for web viewer
        'export_lights': False,   # Don't export lights, use web viewer lighting
        'export_animations': False,  # Static model for now
    }

    print(f"\nExporting to GLB format...")
    print(f"Output: {output_path}")
    print(f"Draco compression: {'Enabled' if use_draco else 'Disabled'}")

    # Export to GLB
    bpy.ops.export_scene.gltf(**export_settings)

    # Get file size
    file_size = os.path.getsize(output_path)
    file_size_mb = file_size / (1024 * 1024)

    print(f"\n✓ GLB export completed successfully!")
    print(f"  File size: {file_size_mb:.2f} MB")
    print(f"  Location: {output_path}")

    if not use_draco and file_size_mb > 5:
        print(f"\n  Tip: Consider using --draco flag to reduce file size for web")


if __name__ == "__main__":
    # Parse arguments: blend file, texture, output path, [flags]
    args = sys.argv[sys.argv.index('--') + 1:]

    if len(args) < 3:
        print("Error: Missing required arguments")
        print(__doc__)
        sys.exit(1)

    blend_file = args[0]
    texture_path = args[1]
    output_path = args[2]

    # Check for draco flag
    use_draco = '--draco' in args

    # Export
    try:
        export_glb(blend_file, texture_path, output_path, use_draco)
    except Exception as e:
        print(f"\nError during export: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
