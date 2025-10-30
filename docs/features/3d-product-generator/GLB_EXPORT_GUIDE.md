# GLB Export Guide for 3D Product Viewer

This guide explains how to export your product designs as interactive 3D GLB models for embedding in ecommerce stores.

## Quick Start

Export a 3D model with a custom design and fabric color:

```bash
./export-glb.sh ./assets/design.png --compose chest-medium -f yellow -o ./output/model.glb
```

## Export Options

### Basic Export
```bash
./export-glb.sh design.png
```
Creates `output/model.glb` with the design applied to a white shirt.

### With Composition & Fabric Color
```bash
./export-glb.sh logo.png --compose chest-large -f navy -o ./models/navy-shirt.glb
```
- Composites the logo onto the chest area (large size)
- Changes fabric color to navy
- Outputs to custom path

### With Draco Compression (Recommended)
```bash
./export-glb.sh design.png --compose back-medium -f black -o ./output/shirt.glb --draco
```
- Reduces file size by ~50% (9.95 MB → 5.31 MB)
- Better for web performance
- Supported by all modern 3D viewers

## Available Options

| Flag | Description | Example |
|------|-------------|---------|
| `-o, --output` | Output GLB file path | `-o models/shirt.glb` |
| `-f, --fabric-color` | Fabric color (hex or name) | `-f navy`, `-f #1a1a1a` |
| `--compose` | Position preset | `--compose chest-large` |
| `--draco` | Enable Draco compression | `--draco` |

### Composition Presets
- **chest-large**, **chest-medium**, **chest-small** - Front chest area
- **back-large**, **back-medium**, **back-small** - Back area
- **dead-center-large**, **dead-center-medium**, **dead-center-small** - Center front

### Fabric Colors
Named colors: `white`, `black`, `red`, `blue`, `navy`, `green`, `dark-green`, `yellow`, `orange`, `purple`, `pink`, `gray`, `light-gray`, `dark-gray`, `brown`, `beige`, `cream`

Hex colors: `#RRGGBB` format (e.g., `#FF5733`)

## File Sizes

| Compression | File Size | Reduction |
|-------------|-----------|-----------|
| None | 9.95 MB | - |
| Draco | 5.31 MB | 46% |

**Recommendation**: Use `--draco` for production to reduce bandwidth and loading time.

## Web Integration

### Option 1: model-viewer (Recommended)

The easiest way to embed 3D models in your website:

```html
<!-- Include the model-viewer library -->
<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js"></script>

<!-- Add your 3D model -->
<model-viewer
    src="yellow-shirt.glb"
    alt="Yellow t-shirt with custom design"
    camera-controls
    auto-rotate
    environment-image="neutral"
    shadow-intensity="1"
    style="width: 100%; height: 600px;"
>
</model-viewer>
```

**Features**:
- ✨ Zero configuration
- 📱 Mobile & desktop support
- 🔄 Auto-rotate
- 📷 AR support (iOS/Android)
- ⚡ Progressive loading

### Option 2: Three.js

For custom 3D experiences:

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Setup scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Load GLB model
const loader = new GLTFLoader();
loader.load('yellow-shirt.glb', (gltf) => {
    scene.add(gltf.scene);

    // Center and scale model
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(center);
});

// Add controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 1, 3);
```

### Option 3: Shopify Integration

For Shopify stores, use the built-in 3D model support:

1. Upload GLB file to Shopify Admin → Settings → Files
2. In your product template:

```liquid
{% if product.media %}
  {% for media in product.media %}
    {% if media.media_type == 'model' %}
      <model-viewer
        src="{{ media | model_viewer_url }}"
        alt="{{ product.title }}"
        camera-controls
        auto-rotate
        ar
      ></model-viewer>
    {% endif %}
  {% endfor %}
{% endif %}
```

### Option 4: React/Next.js

Using `@google/model-viewer` React wrapper:

```bash
npm install @google/model-viewer
```

```tsx
import '@google/model-viewer';

export function ProductViewer({ modelUrl, alt }) {
  return (
    <model-viewer
      src={modelUrl}
      alt={alt}
      camera-controls
      auto-rotate
      environment-image="neutral"
      style={{ width: '100%', height: '600px' }}
    />
  );
}
```

## Example HTML Viewer

See [output/viewer-example.html](output/viewer-example.html) for a complete working example with:
- Interactive 3D viewing
- Mobile touch support
- Auto-rotation
- Shadow and lighting
- Integration examples

Open it in your browser:
```bash
cd output
python3 -m http.server 8000
# Visit http://localhost:8000/viewer-example.html
```

## Performance Optimization

### 1. Use Draco Compression
```bash
./export-glb.sh design.png --draco  # 46% smaller files
```

### 2. Optimize Textures
The export automatically:
- Embeds textures in GLB (single file)
- Uses appropriate texture compression
- Preserves alpha channels for transparency

### 3. CDN Hosting
Host GLB files on a CDN for faster global delivery:
- Cloudflare
- AWS CloudFront
- Vercel Edge Network

### 4. Lazy Loading
```html
<model-viewer
    src="model.glb"
    loading="lazy"  <!-- Only load when visible -->
    reveal="interaction"  <!-- Wait for user interaction -->
>
</model-viewer>
```

## Browser Support

GLB/glTF 2.0 is supported by:
- ✅ Chrome/Edge (WebGL)
- ✅ Firefox (WebGL)
- ✅ Safari (WebGL)
- ✅ iOS Safari (AR QuickLook)
- ✅ Android Chrome (Scene Viewer)

## Troubleshooting

### Model appears dark or unlit
Add environment lighting:
```html
<model-viewer environment-image="neutral" exposure="1">
```

### Model is too large/small
Adjust camera orbit:
```html
<model-viewer camera-orbit="0deg 75deg 2.5m">
```

### Slow loading
1. Use `--draco` compression
2. Host on CDN
3. Enable lazy loading
4. Reduce texture resolution

### Colors look different
Ensure your design uses RGB color space, not CMYK.

## API Reference

Complete `export-glb.sh` usage:

```bash
./export-glb.sh <design-image> [OPTIONS]

Options:
  -o, --output FILE         Output GLB file path (default: output/model.glb)
  -f, --fabric-color COLOR  Fabric/shirt color (hex #RRGGBB or name)
  --draco                   Enable Draco compression for smaller file size
  --compose PRESET          Composite design onto template first
  -h, --help                Show help message

Examples:
  ./export-glb.sh design.png
  ./export-glb.sh logo.png --compose chest-large
  ./export-glb.sh design.png -o models/shirt.glb --draco
  ./export-glb.sh logo.png --compose back-medium -f navy
```

## Next Steps

1. **Test locally**: Open `output/viewer-example.html` in your browser
2. **Integrate**: Choose model-viewer, Three.js, or Shopify
3. **Optimize**: Use `--draco` for production
4. **Deploy**: Host GLB files on CDN
5. **Monitor**: Track loading performance with Web Vitals

## Additional Resources

- [model-viewer documentation](https://modelviewer.dev/)
- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [glTF 2.0 specification](https://www.khronos.org/gltf/)
- [Shopify 3D models](https://help.shopify.com/en/manual/products/product-media/3d-models)
