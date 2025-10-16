# Blender Installation and Troubleshooting Guide

## Overview

The Sharewear T-Shirt Render Engine requires Blender 3.6+ to be installed system-wide and accessible via the `blender` command. This guide covers installation, troubleshooting, and known issues.

## System Requirements

- **Blender Version:** 3.6 or higher (4.x recommended)
- **Operating System:** Linux, macOS, or Windows
- **Command-Line Access:** `blender` command must be in PATH
- **Dependencies:** ffmpeg/libav libraries for video rendering

## Current System Status

Based on the detection during setup:

```
Python: 3.13.7 ✓
Pillow: 11.3.0 ✓
Blender: Installed but library issues detected ⚠
```

## Installation by Platform

### Manjaro/Arch Linux

**Official Repository (Recommended for most cases):**
```bash
sudo pacman -S blender
```

**Known Issue:** Blender 4.5+ has library compatibility issues with ffmpeg 8.x on Manjaro/Arch systems.

#### Symptom:
```
blender: error while loading shared libraries: libavcodec.so.61: cannot open shared object file: No such file or directory
```

#### Missing Libraries Detected:
- libavcodec.so.61 (expected by Blender 4.5, system has .62 from ffmpeg 8.x)
- libavdevice.so.61
- libavformat.so.61
- libavutil.so.59
- libswscale.so.8

#### Root Cause:
Blender 4.5.3 was compiled against ffmpeg 7.x libraries, but Manjaro/Arch has moved to ffmpeg 8.x which provides different library versions (.62 instead of .61).

### Solutions for Manjaro/Arch

#### Solution 1: Use Flatpak (RECOMMENDED)

Flatpak provides Blender in a sandboxed environment with all dependencies bundled:

```bash
# Install Flatpak if not already installed
sudo pacman -S flatpak

# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install Blender
flatpak install flathub org.blender.Blender

# Create alias for convenient access
echo "alias blender='flatpak run org.blender.Blender'" >> ~/.bashrc
# OR for zsh:
echo "alias blender='flatpak run org.blender.Blender'" >> ~/.zshrc

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc
```

**Pros:**
- Self-contained with all dependencies
- Always up-to-date
- No conflicts with system libraries
- Works out of the box

**Cons:**
- Larger installation size (~1GB)
- Slightly slower startup time
- Requires flatpak

#### Solution 2: Use AUR Package (blender-git or blender-bin)

Install a version compiled against current system libraries:

```bash
# Install yay (AUR helper) if not installed
sudo pacman -S yay

# Option A: Binary package (faster)
yay -S blender-bin

# Option B: Git/development version
yay -S blender-git
```

**Pros:**
- Native performance
- Compiles against system libraries
- Latest features (git version)

**Cons:**
- Longer installation time (git version)
- May be less stable (git version)
- Requires AUR access

#### Solution 3: Downgrade ffmpeg (TEMPORARY WORKAROUND)

**WARNING:** This may break other applications that depend on ffmpeg 8.x.

```bash
# Check available ffmpeg versions
ls /var/cache/pacman/pkg/ffmpeg-*

# Downgrade to ffmpeg 7.x (if available in cache)
sudo pacman -U /var/cache/pacman/pkg/ffmpeg-7.*-x86_64.pkg.tar.zst

# Hold ffmpeg package to prevent upgrades
sudo nano /etc/pacman.conf
# Add to [options] section:
# IgnorePkg = ffmpeg
```

**Pros:**
- Quick fix
- Uses official Blender package

**Cons:**
- Breaks system package management
- Security risk (outdated libraries)
- May break other applications
- Not recommended for production

#### Solution 4: Wait for Blender 4.6+ Update

Blender 4.6 (expected Q2 2025) should support ffmpeg 8.x libraries.

```bash
# Monitor for updates
sudo pacman -Syu
```

**Pros:**
- Official fix
- No workarounds needed

**Cons:**
- Requires waiting for release
- Not available yet

### Ubuntu/Debian

```bash
# Official repository (may be older version)
sudo apt update
sudo apt install blender

# OR use Snap for latest version
sudo snap install blender --classic

# OR use official PPA for latest stable
sudo add-apt-repository ppa:thomas-schiex/blender
sudo apt update
sudo apt install blender
```

### macOS

```bash
# Using Homebrew
brew install blender

# OR download from official website
# https://www.blender.org/download/
```

### Windows

Download installer from: https://www.blender.org/download/

Ensure `blender` is added to PATH:
1. Install Blender
2. Add installation directory to PATH environment variable
3. Typical path: `C:\Program Files\Blender Foundation\Blender 4.5\`

## Verification

After installation, verify Blender is working:

```bash
# Check Blender version
blender --version

# Expected output (example):
# Blender 4.5.3
# build date: 2024-02-14
# build time: 12:34:56
# build commit date: 2024-02-14
# build commit time: 12:34:56
# build hash: abc123def456
# build platform: Linux
# build type: Release
```

If you see library errors instead, refer to the Solutions section above.

## Testing Blender with Medusa Backend

### Method 1: Use Health Endpoint

```bash
# Start Medusa server
cd apps/server
bun run dev

# In another terminal, test health endpoint
curl http://localhost:9000/admin/render-jobs/health

# Expected response:
{
  "pythonAvailable": true,
  "pythonVersion": "Python 3.13.7",
  "pillowAvailable": true,
  "blenderAvailable": true,
  "blenderVersion": "4.5.3"
}
```

If `blenderAvailable: false`, check the server logs for error details.

### Method 2: Manual Test Render

```bash
# Ensure you have test files
# - Template Blender file: apps/server/render-assets/models/tshirt-basic.blend
# - Test texture: /tmp/test-texture.png

# Test Blender in background mode
blender --background --version

# Test full render script (once models are available)
blender --background apps/server/render-assets/models/tshirt-basic.blend \
  --python render_design.py \
  -- \
  apps/server/render-assets/models/tshirt-basic.blend \
  /tmp/test-texture.png \
  /tmp/test-renders \
  64 \
  --images-only
```

## Recommended Setup for Development

For development on Manjaro/Arch:

1. **Install Flatpak Blender** (most reliable)
2. **Set up alias** in your shell config
3. **Test with health endpoint**
4. **Monitor for official Blender updates**

```bash
# Complete setup commands
sudo pacman -S flatpak
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install -y flathub org.blender.Blender
echo "alias blender='flatpak run org.blender.Blender'" >> ~/.bashrc
source ~/.bashrc
blender --version
```

## Recommended Setup for Production

For production deployment:

1. **Use Docker/containers** with Blender pre-installed
2. **Pin specific Blender version** for consistency
3. **Include all dependencies** in container image
4. **Test render pipeline** during deployment

Example Dockerfile snippet:
```dockerfile
FROM ubuntu:22.04

# Install Blender and dependencies
RUN apt-get update && \
    apt-get install -y blender python3 python3-pip && \
    pip3 install Pillow && \
    rm -rf /var/lib/apt/lists/*

# Verify Blender installation
RUN blender --version
```

## Additional Resources

- **Blender Official Website:** https://www.blender.org/
- **Blender Python API Docs:** https://docs.blender.org/api/current/
- **Arch Linux Blender Wiki:** https://wiki.archlinux.org/title/Blender
- **Flatpak Setup Guide:** https://flatpak.org/setup/

## Getting Help

If you encounter issues:

1. **Check health endpoint** for diagnostic info
2. **Review Medusa logs** in `apps/server/logs/`
3. **Test Blender manually** from command line
4. **Check library dependencies** with `ldd /usr/bin/blender`
5. **Consult platform-specific guides** above

## Summary - Quick Reference

| Platform | Recommended Method | Command |
|----------|-------------------|---------|
| Manjaro/Arch | Flatpak | `flatpak install flathub org.blender.Blender` |
| Ubuntu/Debian | Official PPA | `sudo apt install blender` |
| macOS | Homebrew | `brew install blender` |
| Windows | Official Installer | Download from blender.org |

**Current Issue:** Library version mismatch on Manjaro/Arch (libavcodec.so.61 not found)
**Current Fix:** Use Flatpak Blender with alias
**Permanent Fix:** Wait for Blender 4.6+ or use AUR builds
