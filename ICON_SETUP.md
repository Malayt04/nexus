# Adding Your Personal Icon to Nexus AI

## Quick Setup

I've already configured the application to use your personal icon. Now you just need to add your icon files:

### Step 1: Prepare Your Icon Files

You'll need your icon in different formats for different platforms:

- **Windows**: `icon.ico` (recommended: 256x256 pixels)
- **macOS**: `icon.icns` (recommended: 512x512 pixels)  
- **Linux**: `icon.png` (recommended: 512x512 pixels)
- **Application Window**: `nexus-icon.png` (recommended: 64x64 pixels)

### Step 2: Add Icon Files to Resources Folder

Place your icon files in the `resources/` folder (already created):

```
nexus/
├── resources/
│   ├── icon.ico          # Windows installer icon
│   ├── icon.icns         # macOS application icon
│   ├── icon.png          # Linux application icon
│   └── nexus-icon.png    # Window icon (used in development)
└── ...
```

### Step 3: Icon Requirements

**For best results, your icon should be:**
- Square format (1:1 aspect ratio)
- High resolution (at least 512x512 pixels)
- Clear and recognizable at small sizes
- Simple design that works on different backgrounds

### Step 4: Converting Your Icon

If you only have one image file, you can convert it to different formats:

**Online converters:**
- For ICO files: https://convertio.co/png-ico/
- For ICNS files: https://convertio.co/png-icns/

**Or use tools like:**
- GIMP (free image editor)
- Photoshop
- Online icon generators

### Step 5: Test Your Icon

1. Add your icon files to the `resources/` folder
2. Run the application: `npm run dev`
3. Your icon should appear in the window and taskbar

### Step 6: Build with Your Icon

When you build the application for distribution:
```bash
npm run package
```

Your icon will be included in the installer and application bundle.

## File Structure After Adding Icons

```
nexus/
├── resources/
│   ├── icon.ico          # ✅ Your Windows icon
│   ├── icon.icns         # ✅ Your macOS icon
│   ├── icon.png          # ✅ Your Linux icon
│   └── nexus-icon.png    # ✅ Your window icon
├── package.json          # ✅ Already configured
├── src/main/index.ts     # ✅ Already configured
└── ...
```

## Notes

- The application is already configured to use your icons
- Just add the icon files to the `resources/` folder
- The window icon will show immediately when you run `npm run dev`
- The installer icons will be used when you build the application with `npm run package`

## Troubleshooting

If your icon doesn't appear:
1. Make sure the file names match exactly: `icon.ico`, `icon.icns`, `icon.png`, `nexus-icon.png`
2. Check that files are in the `resources/` folder
3. Restart the application after adding icons
4. Make sure your icon files are valid and not corrupted
