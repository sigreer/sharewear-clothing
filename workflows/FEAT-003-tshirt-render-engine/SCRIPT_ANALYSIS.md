# FEAT-003: Script Evolution Analysis & Required Updates

**Date**: 2025-10-14
**Status**: Backend implementation needs alignment with updated Python scripts

---

## Executive Summary

The backend services (PythonExecutorService) were implemented based on an **earlier version** of the Python scripts. Since then, the scripts have been significantly enhanced with new features. This document identifies critical mismatches and required updates.

---

## Critical Mismatches

### 1. ❌ Preset System - MAJOR MISMATCH

**Backend Implementation (types.ts:21-24)**:
```typescript
export type PresetType =
  | 'chest-large'
  | 'dead-center-medium'
  | 'back-small'
```

**Current Script Support (compose_design.py:219-297)**:
```python
presets = {
    # FRONT PANEL PRESETS
    'chest-small',         # ✓ NEW
    'chest-medium',        # ✓ NEW
    'chest-large',         # ✓ MATCHES

    # BACK PANEL PRESETS (upper back)
    'back-small',          # ✓ MATCHES
    'back-medium',         # ✓ NEW
    'back-large',          # ✓ NEW

    # BACK PANEL PRESETS (lower back)
    'back-bottom-small',   # ✓ NEW
    'back-bottom-medium',  # ✓ NEW
    'back-bottom-large',   # ✓ NEW
}
```

**Issue**: Backend only recognizes 3 presets, but scripts support **9 presets**. The preset `dead-center-medium` doesn't even exist in the current scripts!

**Impact**:
- ❌ Users cannot access 6 of 9 available presets
- ❌ Backend will reject valid preset names
- ❌ The `dead-center-medium` preset will fail at script execution

**Required Changes**:
1. Update `PresetType` in `types.ts` to include all 9 presets
2. Remove the non-existent `dead-center-medium` preset
3. Update `VALID_PRESETS` array in `python-executor-service.ts:88-92`
4. Update `DEFAULT_PRESETS` configuration in `types.ts:135-154`

---

### 2. ❌ Fabric Color Support - MISSING FEATURE

**Current Scripts Support (compose_design.py:451-455, render_design.py:20)**:
```python
# compose_design.py
parser.add_argument(
    '-f', '--fabric-color',
    type=str,
    default=None,
    help='Fabric/shirt color as hex (#RRGGBB) or name (white, black, red, yellow, navy, etc.)'
)

# render_design.py
-f, --fabric-color COLOR    Fabric/shirt base color (hex #RRGGBB or name)
```

**Backend Implementation**:
```typescript
// ExecuteComposeParams - NO fabric color parameter
export type ExecuteComposeParams = {
  templatePath: string
  designPath: string
  preset: PresetType
  outputPath: string
  // ❌ Missing: fabricColor parameter
}
```

**Issue**: Scripts support fabric color customization, but backend doesn't expose this capability.

**Impact**:
- ❌ Cannot render designs on colored shirts (only white default)
- ❌ Major limitation for product variants with different colors
- ❌ Requires manual script execution outside Medusa for colored shirts

**Required Changes**:
1. Add `fabricColor?: string` to `ExecuteComposeParams`
2. Add `fabricColor?: string` to `ExecuteRenderParams`
3. Update `executeCompose()` to pass `-f` flag when color specified
4. Update `executeRender()` to pass `-f` flag when color specified
5. Add fabric color validation (hex codes and named colors)

---

### 3. ❌ Background Color Support - MISSING FEATURE

**Current Scripts Support (render_design.py:21)**:
```python
-b, --background-color COLOR Background color for renders (hex, name, or 'transparent')
```

**Backend Implementation**:
```typescript
// ExecuteRenderParams - NO background color parameter
export type ExecuteRenderParams = {
  blendFile: string
  texturePath: string
  outputDir: string
  samples?: number
  skipAnimation?: boolean
  // ❌ Missing: backgroundColor parameter
}
```

**Issue**: Scripts support background color customization (including transparency), but backend doesn't.

**Impact**:
- ❌ Cannot create renders with specific backgrounds for marketing
- ❌ Cannot generate transparent PNGs vs. solid backgrounds
- ❌ All renders will use default transparent background

**Required Changes**:
1. Add `backgroundColor?: string` to `ExecuteRenderParams`
2. Update `executeRender()` to pass `-b` flag when specified
3. Support special `'transparent'` value

---

### 4. ⚠️ Render Output Modes - PARTIALLY MISSING

**Current Scripts Support (render_design.py:16-19)**:
```python
Options:
  --images-only           Render still images only (6 angles)
  --animation-only        Render animation only (front camera)
  --no-animation          Skip animation (same as --images-only)
```

**Backend Implementation**:
```typescript
export type ExecuteRenderParams = {
  skipAnimation?: boolean  // ✓ Covers --no-animation
  // ❌ Missing: imagesOnly mode
  // ❌ Missing: animationOnly mode
}
```

**Issue**: Backend only supports `skipAnimation` (--no-animation), but scripts have 3 distinct modes.

**Impact**:
- ⚠️ Cannot render animation-only (always renders all 6 angles too)
- ⚠️ Wastes compute time if user only wants animation
- ⚠️ Less flexible than the scripts actually support

**Required Changes**:
1. Replace `skipAnimation` with a `renderMode` enum:
   ```typescript
   renderMode?: 'all' | 'images-only' | 'animation-only'
   ```
2. Map to appropriate flags in `executeRender()`:
   - `'images-only'` → `--images-only`
   - `'animation-only'` → `--animation-only`
   - `'all'` → no flag (default)

---

### 5. ✅ Multiple Camera Angles - CORRECT BUT UNDOCUMENTED

**Current Scripts Behavior (render_design.py:186-200)**:
```python
# Renders 6 camera angles by default:
# - front_0deg
# - left_90deg
# - right_270deg
# - back_180deg
# - front_45deg_left
# - front_45deg_right
```

**Backend Implementation**:
```typescript
export type RenderResult = {
  success: boolean
  renderedImage?: string      // ⚠️ Singular - implies one image
  animation?: string
  error?: string
}
```

**Issue**: Backend expects a single `renderedImage`, but script produces **6 images + 1 animation**.

**Impact**:
- ⚠️ Type definition is misleading
- ⚠️ Workflow needs to handle multiple output files
- ⚠️ File association logic must process all angles

**Required Changes**:
1. Update `RenderResult`:
   ```typescript
   renderedImages?: string[]  // Array of paths (6 angles)
   ```
2. Update `parseRenderOutput()` to extract all image paths from stdout
3. Document expected camera angles in JSDoc

---

### 6. ❌ Wrapper Script Integration - NOT ALIGNED

**Available Wrapper Script**: `render-product.sh`
- Provides simplified interface
- Handles both composition + rendering in one call
- Supports all new features (fabric color, background color, modes)
- Better error handling and user feedback

**Backend Implementation**:
- Calls `compose_design.py` and `render_design.py` separately
- Manually orchestrates the pipeline
- Doesn't leverage wrapper script benefits

**Issue**: Backend reimplements logic already in the wrapper script.

**Impact**:
- ⚠️ Duplicate logic maintenance
- ⚠️ Potential for divergent behavior
- ⚠️ More complex error handling

**Recommendation**: Consider whether to use `render-product.sh` directly or continue with individual script calls. If continuing with individual calls, ensure feature parity.

---

## Updated Type Definitions Required

### PresetType (types.ts)
```typescript
/**
 * Predefined t-shirt design placement presets
 *
 * Front panel presets:
 * - chest-small: Small zone at very top of chest
 * - chest-medium: Medium zone covering chest area
 * - chest-large: Large zone covering most of front
 *
 * Back panel presets (upper back):
 * - back-small: Small zone at top of back
 * - back-medium: Medium zone on upper back
 * - back-large: Large zone covering upper/mid back
 *
 * Back panel presets (lower back):
 * - back-bottom-small: Small zone at lower back
 * - back-bottom-medium: Medium zone at lower back
 * - back-bottom-large: Large zone at lower back
 */
export type PresetType =
  // Front panel
  | 'chest-small'
  | 'chest-medium'
  | 'chest-large'
  // Back panel (upper)
  | 'back-small'
  | 'back-medium'
  | 'back-large'
  // Back panel (lower)
  | 'back-bottom-small'
  | 'back-bottom-medium'
  | 'back-bottom-large'
```

### ExecuteComposeParams (python-executor-service.ts)
```typescript
export type ExecuteComposeParams = {
  /** Path to template PNG file */
  templatePath: string
  /** Path to uploaded design image */
  designPath: string
  /** Preset configuration for design placement */
  preset: PresetType
  /** Output path for composited result */
  outputPath: string
  /** Optional fabric/shirt color (hex #RRGGBB or name like 'black', 'navy') */
  fabricColor?: string
}
```

### ExecuteRenderParams (python-executor-service.ts)
```typescript
export type ExecuteRenderParams = {
  /** Path to .blend template file */
  blendFile: string
  /** Path to composited texture image */
  texturePath: string
  /** Directory for output renders */
  outputDir: string
  /** Render samples for quality (default: 128) */
  samples?: number
  /** Render mode: all angles + animation, images only, or animation only */
  renderMode?: 'all' | 'images-only' | 'animation-only'
  /** Optional fabric/shirt color (hex #RRGGBB or name) - only used without pre-composed texture */
  fabricColor?: string
  /** Optional background color (hex, name, or 'transparent' for transparent background) */
  backgroundColor?: string
}
```

### RenderResult (python-executor-service.ts)
```typescript
export type RenderResult = {
  /** Whether execution succeeded */
  success: boolean
  /** Array of paths to rendered still images (typically 6 camera angles) */
  renderedImages?: string[]
  /** Path to animation file if successful and generated */
  animation?: string
  /** Error message if failed */
  error?: string
}
```

---

## Script Features Reference

### compose_design.py Capabilities
- ✅ 9 preset positions (front chest, back upper, back lower)
- ✅ Fabric color recoloring (hex or 17+ named colors)
- ✅ Template analysis and panel detection
- ✅ Aspect ratio preservation with max height constraints
- ✅ High-quality Lanczos resampling
- ✅ RGBA transparency support

### render_design.py Capabilities
- ✅ 6 camera angles (front, left, right, back, front-left-45, front-right-45)
- ✅ 360° turntable animation from front camera
- ✅ Fabric color shader modification (when not using pre-composed texture)
- ✅ Background color control (solid or transparent)
- ✅ Three render modes (all, images-only, animation-only)
- ✅ Configurable quality (samples: 1-4096)
- ✅ Denoising enabled for quality/speed balance
- ✅ H264 video encoding with HIGH quality preset

### render-product.sh Capabilities
- ✅ All-in-one workflow: composition + rendering
- ✅ Smart fabric color handling (pre-composition vs. shader)
- ✅ User-friendly argument parsing
- ✅ Progress feedback and error messages
- ✅ Example usage documentation in help text

---

## Migration Path

### Phase 1: Critical Fixes (Immediate)
1. ✅ Update `PresetType` to include all 9 presets
2. ✅ Remove non-existent `dead-center-medium` preset
3. ✅ Update validation arrays in PythonExecutorService

### Phase 2: Color Support (High Priority)
1. Add `fabricColor` parameter to both services
2. Add `backgroundColor` parameter to render service
3. Implement color validation (hex + named colors)
4. Update script execution to pass color flags

### Phase 3: Enhanced Render Control (Medium Priority)
1. Replace `skipAnimation` with `renderMode` enum
2. Update `RenderResult` to return arrays of images
3. Update output parsing logic

### Phase 4: Documentation & Testing (Required)
1. Update JSDoc comments with new features
2. Update workflow documentation
3. Add tests for new color features
4. Add tests for all 9 presets
5. Update admin UI mockups/requirements

---

## Validation Checklist

Before proceeding with workflow implementation:

- [ ] All 9 presets defined in TypeScript types
- [ ] Fabric color support added to compose execution
- [ ] Background color support added to render execution
- [ ] Render mode enum implemented (all/images/animation)
- [ ] RenderResult updated for multiple images
- [ ] Color validation implemented (hex + named)
- [ ] VALID_PRESETS array updated
- [ ] DEFAULT_PRESETS configuration expanded (or removed if not needed)
- [ ] JSDoc comments updated with examples
- [ ] Task breakdown updated to reflect new features
- [ ] API schemas updated for color parameters
- [ ] Admin UI requirements updated for preset selector (9 options)

---

## Recommended Action

**DO NOT PROCEED** with API routes or Admin UI implementation until Phase 1 & 2 are completed. The current backend will:
1. Reject 6 out of 9 valid presets
2. Fail when trying to use `dead-center-medium`
3. Not support colored shirts (major limitation)
4. Not support custom backgrounds

These are **blocking issues** that must be resolved before building higher-level integrations.

---

## Questions for Resolution

1. **Preset Set**: Should we support all 9 presets, or is there a business reason to limit to 3?
   - If limiting: Which 3 should we keep?
   - If expanding: Need to design preset selector UI for 9 options

2. **Color Support**: Is fabric color customization required for MVP?
   - If yes: Need color picker in admin UI
   - If yes: Need to decide on color palette vs. free input

3. **Wrapper Script**: Should we refactor to use `render-product.sh` directly?
   - Pros: Less code, better tested, more maintainable
   - Cons: Less granular control, different error handling

4. **Migration Strategy**: Should we fix the existing implementation or start fresh?
   - Fix existing: Preserve work done, incremental updates
   - Start fresh: Opportunity to align architecture with current scripts

---

**Report compiled**: 2025-10-14
**Reviewed by**: AI Assistant
**Action required**: Product/Engineering decision on scope before continuing
