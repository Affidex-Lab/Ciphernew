import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Android icon sizes
const androidSizes = [
  { name: 'mipmap-hdpi/ic_launcher.png', size: 72 },
  { name: 'mipmap-hdpi/ic_launcher_round.png', size: 72 },
  { name: 'mipmap-hdpi/ic_launcher_foreground.png', size: 162 },
  { name: 'mipmap-mdpi/ic_launcher.png', size: 48 },
  { name: 'mipmap-mdpi/ic_launcher_round.png', size: 48 },
  { name: 'mipmap-mdpi/ic_launcher_foreground.png', size: 108 },
  { name: 'mipmap-xhdpi/ic_launcher.png', size: 96 },
  { name: 'mipmap-xhdpi/ic_launcher_round.png', size: 96 },
  { name: 'mipmap-xhdpi/ic_launcher_foreground.png', size: 216 },
  { name: 'mipmap-xxhdpi/ic_launcher.png', size: 144 },
  { name: 'mipmap-xxhdpi/ic_launcher_round.png', size: 144 },
  { name: 'mipmap-xxhdpi/ic_launcher_foreground.png', size: 324 },
  { name: 'mipmap-xxxhdpi/ic_launcher.png', size: 192 },
  { name: 'mipmap-xxxhdpi/ic_launcher_round.png', size: 192 },
  { name: 'mipmap-xxxhdpi/ic_launcher_foreground.png', size: 432 },
];

async function generateIcons() {
  const svgBuffer = fs.readFileSync('public/seedless.svg');
  const androidDir = 'android/app/src/main/res';

  // Ensure directories exist
  androidSizes.forEach(icon => {
    const dir = path.dirname(path.join(androidDir, icon.name));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate Android icons
  for (const icon of androidSizes) {
    const outputPath = path.join(androidDir, icon.name);
    
    // Create a white background for non-foreground icons
    const isForground = icon.name.includes('foreground');
    
    try {
      if (isForground) {
        // For foreground icons, just resize without background
        await sharp(svgBuffer)
          .resize(icon.size, icon.size, { 
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(outputPath);
      } else {
        // For regular icons, add white background
        await sharp(svgBuffer)
          .resize(Math.round(icon.size * 0.7), Math.round(icon.size * 0.7), { 
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .extend({
            top: Math.round(icon.size * 0.15),
            bottom: Math.round(icon.size * 0.15),
            left: Math.round(icon.size * 0.15),
            right: Math.round(icon.size * 0.15),
            background: { r: 136, g: 118, b: 221, alpha: 1 } // Purple background matching brand
          })
          .png()
          .toFile(outputPath);
      }
      
      console.log(`Generated ${outputPath}`);
    } catch (error) {
      console.error(`Error generating ${outputPath}:`, error);
    }
  }

  // Generate splash screen
  const splashPath = path.join(androidDir, 'drawable/splash.png');
  const splashDir = path.dirname(splashPath);
  
  if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
  }

  await sharp(svgBuffer)
    .resize(512, 512, { 
      fit: 'contain',
      background: { r: 136, g: 118, b: 221, alpha: 1 }
    })
    .extend({
      top: 768,
      bottom: 768,
      left: 256,
      right: 256,
      background: { r: 136, g: 118, b: 221, alpha: 1 }
    })
    .png()
    .toFile(splashPath);
  
  console.log(`Generated ${splashPath}`);
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);