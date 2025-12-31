#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * nhimbe Logo Generator Script
 * Generates SVG logo files for the nhimbe brand
 *
 * Usage: node tools/generate-logos.js
 */

const fs = require('fs');
const path = require('path');

// Brand Colors
const COLORS = {
  light: '#004D40',
  dark: '#64FFDA',
  cream: '#FAF9F5',
  charcoal: '#0A0A0A'
};

/**
 * Generate the Nhimbe Community Path icon SVG
 * 5 pillars: 3 hexagons (on wave peaks + center) + 2 profile icons (at wave ends)
 */
function generateIconSVG(size, color, strokeWidth = 2) {
  const scale = size / 64;
  const sw = strokeWidth * Math.max(1, scale);
  const thinSw = sw * 0.5;

  let svg = '';

  // === HEXAGON POSITIONS ===
  const hexPositions = [
    { x: 20, y: 20, r: 4, filled: false },   // Upper peak (small outline)
    { x: 32, y: 32, r: 7, filled: true },    // Center CORE (large solid)
    { x: 44, y: 44, r: 4, filled: false }    // Lower peak (small outline)
  ];

  // === DIAGONAL LINE connecting at hexagon EDGES ===
  const hex1 = hexPositions[0];
  const hex3 = hexPositions[2];
  const angle = Math.atan2((hex3.y - hex1.y), (hex3.x - hex1.x));

  const lineX1 = (hex1.x + Math.cos(angle) * hex1.r) * scale;
  const lineY1 = (hex1.y + Math.sin(angle) * hex1.r) * scale;
  const lineX2 = (hex3.x - Math.cos(angle) * hex3.r) * scale;
  const lineY2 = (hex3.y - Math.sin(angle) * hex3.r) * scale;
  svg += `<line x1="${lineX1.toFixed(2)}" y1="${lineY1.toFixed(2)}" x2="${lineX2.toFixed(2)}" y2="${lineY2.toFixed(2)}" stroke="${color}" stroke-width="${thinSw}" stroke-linecap="round"/>`;

  // === S-CURVE WAVE ===
  const gapRadius = 5;
  let pathD = '';
  for (let x = 4 + gapRadius; x <= 60 - gapRadius; x += 0.5) {
    const t = (x - 4) / 56;
    const y = 32 + Math.sin(t * Math.PI * 2) * 12;
    const sx = x * scale;
    const sy = y * scale;
    pathD += (pathD === '' ? 'M ' : ' L ') + `${sx.toFixed(2)} ${sy.toFixed(2)}`;
  }
  svg += `<path d="${pathD}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  // === 3 HEXAGONS ===
  hexPositions.forEach(hex => {
    const hcx = hex.x * scale;
    const hcy = hex.y * scale;
    const hr = hex.r * scale;
    let hexPath = '';
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 - 30) * Math.PI / 180;
      const hx = hcx + Math.cos(a) * hr;
      const hy = hcy + Math.sin(a) * hr;
      hexPath += (i === 0 ? 'M ' : ' L ') + `${hx.toFixed(2)} ${hy.toFixed(2)}`;
    }
    hexPath += ' Z';

    if (hex.filled) {
      svg += `<path d="${hexPath}" fill="${color}"/>`;
    } else {
      svg += `<path d="${hexPath}" stroke="${color}" stroke-width="${thinSw}" fill="none"/>`;
    }
  });

  // === 2 PROFILE ICONS ===
  const personPositions = [
    { x: 4, y: 32 },
    { x: 60, y: 32 }
  ];

  const headR = 2.5 * scale;
  const shoulderW = 6 * scale;
  const shoulderH = 3 * scale;

  personPositions.forEach(pos => {
    const px = pos.x * scale;
    const py = pos.y * scale;

    const headY = py - headR - 0.5 * scale;
    svg += `<circle cx="${px.toFixed(2)}" cy="${headY.toFixed(2)}" r="${headR.toFixed(2)}" stroke="${color}" stroke-width="${sw}" fill="none"/>`;

    const shoulderTopY = py + 0.5 * scale;
    const shoulderBottomY = shoulderTopY + shoulderH;
    const sLeft = px - shoulderW / 2;
    const sRight = px + shoulderW / 2;
    svg += `<path d="M ${sLeft.toFixed(2)} ${shoulderBottomY.toFixed(2)} Q ${sLeft.toFixed(2)} ${shoulderTopY.toFixed(2)} ${px.toFixed(2)} ${shoulderTopY.toFixed(2)} Q ${sRight.toFixed(2)} ${shoulderTopY.toFixed(2)} ${sRight.toFixed(2)} ${shoulderBottomY.toFixed(2)}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
  });

  return svg;
}

/**
 * Generate full SVG for different variants
 */
function generateSVG(variant, isDark, transparent = false) {
  const color = isDark ? COLORS.dark : COLORS.light;
  const bg = isDark ? COLORS.charcoal : COLORS.cream;

  let width, height, content, bgRect;

  bgRect = transparent ? '' : `<rect width="100%" height="100%" fill="${bg}"/>`;

  if (variant === 'primary') {
    width = 120;
    height = 120;
    content = `<g transform="translate(4, 16) scale(1.75)">${generateIconSVG(64, color, 1.5)}</g>`;
  } else if (variant === 'horizontal') {
    width = 240;
    height = 64;
    content = `<g transform="translate(8, 8) scale(0.75)">${generateIconSVG(64, color, 2)}</g>`;
    content += `<text x="68" y="42" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="28" fill="${color}">nhimbe</text>`;
  } else if (variant === 'stacked') {
    width = 100;
    height = 120;
    content = `<g transform="translate(10, 8) scale(1.25)">${generateIconSVG(64, color, 1.8)}</g>`;
    content += `<text x="50" y="108" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="20" fill="${color}" text-anchor="middle">nhimbe</text>`;
  } else if (variant === 'wordmark') {
    width = 120;
    height = 36;
    content = `<text x="60" y="26" font-family="Plus Jakarta Sans, sans-serif" font-weight="700" font-size="24" fill="${color}" text-anchor="middle">nhimbe</text>`;
  } else if (variant === 'icon-only') {
    // Square icon without padding - good for favicons
    width = 64;
    height = 64;
    content = generateIconSVG(64, color, 2);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${bgRect}
  ${content}
</svg>`;
}

/**
 * Generate favicon SVG (simple icon)
 */
function generateFaviconSVG() {
  const color = COLORS.dark;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${COLORS.charcoal}" rx="6"/>
  <g transform="translate(2, 2) scale(0.4375)">${generateIconSVG(64, color, 2.5)}</g>
</svg>`;
}

/**
 * Generate Apple Touch Icon SVG
 */
function generateAppleTouchIconSVG() {
  const color = COLORS.dark;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${COLORS.charcoal}"/>
  <g transform="translate(30, 30) scale(1.875)">${generateIconSVG(64, color, 1.5)}</g>
</svg>`;
}

// Main execution
function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const logoDir = path.join(publicDir, 'logos');

  // Ensure directories exist
  if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
  }

  console.log('Generating nhimbe logo assets...\n');

  // Generate logo variants
  const variants = ['primary', 'horizontal', 'stacked', 'wordmark', 'icon-only'];
  const modes = [
    { isDark: false, name: 'light' },
    { isDark: true, name: 'dark' }
  ];
  const backgrounds = [
    { transparent: false, suffix: '' },
    { transparent: true, suffix: '-transparent' }
  ];

  let fileCount = 0;

  variants.forEach(variant => {
    modes.forEach(mode => {
      backgrounds.forEach(bg => {
        const filename = `nhimbe-${variant}-${mode.name}${bg.suffix}.svg`;
        const filepath = path.join(logoDir, filename);
        const svg = generateSVG(variant, mode.isDark, bg.transparent);
        fs.writeFileSync(filepath, svg);
        console.log(`  ✓ ${filename}`);
        fileCount++;
      });
    });
  });

  // Generate favicon
  const faviconSvg = generateFaviconSVG();
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
  console.log('  ✓ favicon.svg');
  fileCount++;

  // Generate Apple Touch Icon
  const appleTouchSvg = generateAppleTouchIconSVG();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), appleTouchSvg);
  console.log('  ✓ apple-touch-icon.svg');
  fileCount++;

  // Generate main logo for public folder (dark mode primary)
  const mainLogo = generateSVG('primary', true, true);
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), mainLogo);
  console.log('  ✓ logo.svg');
  fileCount++;

  // Generate horizontal logo for headers
  const headerLogo = generateSVG('horizontal', true, true);
  fs.writeFileSync(path.join(publicDir, 'logo-horizontal.svg'), headerLogo);
  console.log('  ✓ logo-horizontal.svg');
  fileCount++;

  console.log(`\n✅ Generated ${fileCount} logo files`);
  console.log(`   Location: ${logoDir}`);
}

main();
