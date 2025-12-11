const fs = require('fs');
const { execSync } = require('child_process');

// Try to use png2icons or create a simple ICO
// For now, let's use a simple approach - copy the 32x32 as ICO
// Actually, let's try installing and using to-ico properly

const toIco = require('to-ico');

async function createIco() {
  try {
    const images = [
      fs.readFileSync('favicon-16.png'),
      fs.readFileSync('favicon-32.png'),
      fs.readFileSync('favicon-48.png')
    ];
    
    const ico = await toIco(images);
    fs.writeFileSync('../public/favicon.ico', ico);
    console.log('Created favicon.ico successfully!');
  } catch (error) {
    console.error('Error creating ICO:', error);
    process.exit(1);
  }
}

createIco();
