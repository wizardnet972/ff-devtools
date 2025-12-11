# Icon Generation Guide

This extension requires PNG icon files for Chrome extension compatibility.

## Quick Start

### Option 1: Using Sharp (Recommended)
```bash
npm install --save-dev sharp
node src/convert-icons-to-png.js
```

### Option 2: Using Browser
1. Open `src/generate-icons.html` in your browser
2. Right-click each icon and "Save image as" to save as PNG
3. Save them as `icon-16.png`, `icon-48.png`, and `icon-128.png` in the `src/icons/` directory

### Option 3: Using ImageMagick
```bash
cd src/icons
convert icon-16.svg icon-16.png
convert icon-48.svg icon-48.png
convert icon-128.svg icon-128.png
```

### Option 4: Using Inkscape
```bash
cd src/icons
inkscape icon-16.svg --export-filename=icon-16.png
inkscape icon-48.svg --export-filename=icon-48.png
inkscape icon-128.svg --export-filename=icon-128.png
```

## Icon Files Required

The extension needs these PNG files in `src/icons/`:
- `icon-16.png` - 16x16 pixels (toolbar icon)
- `icon-48.png` - 48x48 pixels (extension management page)
- `icon-128.png` - 128x128 pixels (Chrome Web Store)

## Build Configuration

Make sure your `project.json` includes the icons directory in the build assets:
```json
{
  "glob": "icons/**/*",
  "input": "apps/ff-devtools-ui/src",
  "output": "/icons"
}
```
