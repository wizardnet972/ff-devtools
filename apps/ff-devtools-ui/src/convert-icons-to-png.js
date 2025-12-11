const fs = require('fs');
const path = require('path');

async function convertSVGToPNG() {
  try {
    const sharp = require('sharp');
    const iconsDir = path.join(__dirname, 'icons');
    const sizes = [16, 48, 128];
    
    for (const size of sizes) {
      const svgPath = path.join(iconsDir, `icon-${size}.svg`);
      const pngPath = path.join(iconsDir, `icon-${size}.png`);
      
      if (fs.existsSync(svgPath)) {
        await sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(pngPath);
        console.log(`✓ Converted ${size}x${size} icon`);
      }
    }
    
    console.log('\n✅ All icons converted to PNG!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  Sharp library not found. Installing...');
      console.log('Run: npm install --save-dev sharp');
      console.log('Or use the generate-icons.html file in a browser to download PNGs');
    } else {
      console.error('Error:', error.message);
    }
  }
}

convertSVGToPNG();
