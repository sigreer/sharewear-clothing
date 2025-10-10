# 3D Viewer Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Transparency/Z-Fighting (Incorrect Surface Rendering)

**Symptoms:**
- Surfaces appear/disappear incorrectly when rotating
- Wrong faces shown as transparent
- Flickering or "glitchy" rendering

**Root Causes:**
1. **Overlapping geometry** - Multiple faces at the same position
2. **Alpha blending order** - Three.js struggles with transparent material depth sorting
3. **Material settings** - Incorrect blend modes or culling settings

**Solutions Applied (in export_glb.py):**
- ✓ Set `blend_method = 'BLEND'` for proper alpha blending
- ✓ Disabled backface culling with `use_backface_culling = False`
- ✓ Connected texture alpha channel to shader
- ✓ Disabled transmission/refraction (can cause artifacts)

**Additional Viewer-Side Fixes:**

For **model-viewer** (already implemented in viewer-example.html):
```html
<model-viewer
    environment-image="neutral"  <!-- Better lighting for transparency -->
    skybox-image="neutral"       <!-- Consistent background -->
    exposure="1"                 <!-- Proper brightness -->
>
```

For **Three.js** custom viewers:
```javascript
// After loading GLB
gltf.scene.traverse((child) => {
    if (child.isMesh && child.material) {
        // Enable transparency
        child.material.transparent = true;
        child.material.alphaTest = 0.1;  // Discard fully transparent pixels

        // Fix depth sorting
        child.material.depthWrite = true;
        child.material.depthTest = true;

        // Render both sides
        child.material.side = THREE.DoubleSide;

        // Force material update
        child.material.needsUpdate = true;
    }
});
```

**If issues persist:**
1. Check for **duplicate/overlapping geometry** in Blender:
   ```bash
   # In Blender Python console:
   import bpy
   obj = bpy.context.active_object
   bpy.ops.object.mode_set(mode='EDIT')
   bpy.ops.mesh.select_all(action='SELECT')
   bpy.ops.mesh.remove_doubles(threshold=0.0001)
   ```

2. **Simplify the mesh** - Complex geometry increases z-fighting
3. **Disable Draco compression** temporarily - Use `export-glb.sh` without `--draco`

---

### Issue 2: Off-Center Rotation (Model "Orbits" Instead of Spinning)

**Symptoms:**
- Model rotates around an invisible point away from the T-shirt
- T-shirt "orbits" when dragging instead of spinning in place

**Root Cause:**
The Blender model's **origin point** is offset from the geometry center. When exported to GLB, this offset is preserved, causing web viewers to rotate around the wrong point.

**Solution Applied (in export_glb.py):**
```python
# Set origin to geometry center
bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS', center='BOUNDS')

# Move to world origin for consistency
obj.location = (0, 0, 0)
```

**Testing the Fix:**
1. Re-export the model:
   ```bash
   ./export-glb.sh assets/this-is-the-front.png \
     --compose chest-medium \
     -f yellow \
     -o output/fixed-shirt.glb
   ```

2. Verify rotation center in viewer - should spin in place now

**Manual Fix in Blender (if needed):**
1. Open template in Blender: `blender assets/original-blender-template.blend`
2. Select the T-shirt mesh
3. Go to **Object → Set Origin → Origin to Center of Mass (Volume)**
4. Set location to 0,0,0: Press `Alt+G` (clear location)
5. Save and re-export

---

### Issue 3: Large File Size

**Symptoms:**
- GLB file > 10 MB
- Slow loading in browser
- High bandwidth usage

**Solutions:**

1. **Enable Draco compression** (reduces size by ~50%):
   ```bash
   ./export-glb.sh design.png --draco -o output/compressed.glb
   ```

2. **Optimize texture size** in compose_design.py:
   - Current: 4096x4096 template
   - Reduce to 2048x2048 for web (edit `assets/t-shirt-template.png`)

3. **Use progressive loading** in model-viewer:
   ```html
   <model-viewer
       src="model.glb"
       loading="lazy"           <!-- Load only when visible -->
       reveal="interaction"     <!-- Show after user interaction -->
   >
   ```

---

### Issue 4: Poor Lighting/Appearance

**Symptoms:**
- Model looks flat or washed out
- Colors don't match renders

**Solutions:**

1. **Use environment lighting** in model-viewer:
   ```html
   <model-viewer
       environment-image="neutral"
       exposure="1.2"              <!-- Increase brightness -->
       shadow-intensity="0.8"      <!-- Softer shadows -->
   >
   ```

2. **Add custom HDR environment**:
   ```html
   <model-viewer
       environment-image="https://example.com/studio.hdr"
       skybox-image="https://example.com/studio.hdr"
   >
   ```

3. **Adjust in Three.js**:
   ```javascript
   // Add ambient light
   const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
   scene.add(ambientLight);

   // Add directional light
   const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
   directionalLight.position.set(5, 5, 5);
   scene.add(directionalLight);
   ```

---

## Testing Workflow

1. **Export with fixes**:
   ```bash
   ./export-glb.sh assets/this-is-the-front.png \
     --compose chest-medium \
     -f navy \
     -o output/test-fixed.glb \
     --draco
   ```

2. **Test locally**:
   ```bash
   cd output
   ./start-viewer.sh
   # Open http://localhost:8000/viewer-example.html
   ```

3. **Update viewer to use new file**:
   Edit `output/viewer-example.html`, change `src="test-fixed.glb"`

4. **Verify fixes**:
   - ✓ Model rotates around its center (not orbiting)
   - ✓ Transparent areas render correctly (no flickering)
   - ✓ File size reasonable (< 5-7 MB with Draco)
   - ✓ Loads quickly in browser

---

## Browser Compatibility

**model-viewer** supports:
- ✓ Chrome 66+ (recommended)
- ✓ Firefox 65+
- ✓ Safari 12.1+
- ✓ Edge 79+
- ✓ iOS Safari 12.1+
- ✓ Chrome Android 88+

**Known Issues:**
- **Safari < 15**: Some alpha blending issues (use Draco compression)
- **Firefox < 90**: Slower performance with large models
- **Mobile browsers**: Limit file size to < 5 MB for best performance

---

## Performance Optimization Checklist

- [ ] Enable Draco compression (`--draco`)
- [ ] Texture size ≤ 2048x2048 for web
- [ ] Total GLB file size < 5-7 MB
- [ ] Use lazy loading for multiple models
- [ ] Host files on CDN
- [ ] Enable HTTP/2 or HTTP/3 on server
- [ ] Add loading progress indicator
- [ ] Test on target devices (mobile/desktop)

---

## Debug Commands

**Check GLB file info:**
```bash
# Install glTF validator
npm install -g gltf-validator

# Validate GLB
gltf_validator output/model.glb
```

**Check texture size:**
```bash
identify assets/t-shirt-template.png
# Should show: 4096x4096 or 2048x2048
```

**Monitor file sizes:**
```bash
ls -lh output/*.glb
# Without Draco: ~10-15 MB
# With Draco: ~5-7 MB
```

**Test in different viewers:**
- Online: https://gltf-viewer.donmccurdy.com/
- Babylon.js: https://sandbox.babylonjs.com/
- Three.js: https://threejs.org/editor/

---

## When to Choose Each Export Option

| Use Case | Command |
|----------|---------|
| **Development/Testing** | `./export-glb.sh design.png` (no compression, faster) |
| **Production/Web** | `./export-glb.sh design.png --draco` (smaller files) |
| **Maximum Quality** | `./export-glb.sh design.png -o high.glb` (no compression) |
| **AR/Mobile** | `./export-glb.sh design.png --draco` (must be small) |

---

## Getting Help

If issues persist:
1. Check browser console for errors (F12)
2. Verify GLB file loads in https://gltf-viewer.donmccurdy.com/
3. Test without Draco compression
4. Check Blender template has single mesh with proper UVs
5. Review export_glb.py output for warnings
