import bpy
import sys
import os

def replace_texture_and_render(blend_file, texture_path, output_dir, samples=128, animation=True):
    """
    Replace texture in blend file and render image + animation

    Args:
        blend_file: Path to .blend template
        texture_path: Path to texture image
        output_dir: Output directory for renders
        samples: Number of render samples (default 128, lower = faster)
        animation: Whether to render animation (default True)
    """
    # Load the blend file
    bpy.ops.wm.open_mainfile(filepath=blend_file)

    # Find and replace base color image texture
    for mat in bpy.data.materials:
        if mat.use_nodes:
            for node in mat.node_tree.nodes:
                if node.type == 'TEX_IMAGE':
                    # Load new image
                    node.image = bpy.data.images.load(texture_path, check_existing=True)

    # Setup output paths
    design_name = os.path.splitext(os.path.basename(texture_path))[0]

    # Optimize render settings
    scene = bpy.context.scene
    scene.cycles.samples = samples  # Reduce samples for faster renders
    scene.cycles.use_denoising = True  # Enable denoising to compensate for lower samples

    # Render still image
    scene.render.filepath = os.path.join(output_dir, f"{design_name}_render.png")
    scene.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    print(f"✓ Rendered still image: {design_name}_render.png")

    # Render animation (turntable) if requested
    if animation:
        scene.render.filepath = os.path.join(output_dir, f"{design_name}_animation")
        scene.render.image_settings.file_format = 'FFMPEG'
        scene.render.ffmpeg.format = 'MPEG4'
        scene.render.ffmpeg.codec = 'H264'
        scene.render.ffmpeg.constant_rate_factor = 'HIGH'  # Good quality
        scene.render.ffmpeg.ffmpeg_preset = 'GOOD'
        bpy.ops.render.render(animation=True)
        print(f"✓ Rendered animation: {design_name}_animation.mp4")

    print(f"✓ Completed rendering {design_name}")

if __name__ == "__main__":
    # Parse arguments: blender file, texture, output directory, [samples], [skip-animation]
    # Usage: -- blend_file texture_path output_dir [samples] [--no-animation]
    args = sys.argv[sys.argv.index('--') + 1:]

    blend_file = args[0]
    texture_path = args[1]
    output_dir = args[2]
    samples = int(args[3]) if len(args) > 3 and args[3].isdigit() else 128
    animation = '--no-animation' not in args

    os.makedirs(output_dir, exist_ok=True)
    replace_texture_and_render(blend_file, texture_path, output_dir, samples, animation)
