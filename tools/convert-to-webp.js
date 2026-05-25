const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..', 'assets', 'categories');
const QUALITY = 80;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (/\.(jpe?g)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function convert(file) {
  try {
    const out = file.replace(/\.(jpe?g)$/i, '.webp');
    // skip if webp already exists and newer
    try {
      const [sIn, sOut] = await Promise.all([fs.stat(file), fs.stat(out).catch(() => null)]);
      if (sOut && sOut.mtimeMs >= sIn.mtimeMs) {
        console.log('Skipping (up-to-date):', out);
        return;
      }
    } catch (err) {
      // continue
    }

    await sharp(file).webp({ quality: QUALITY }).toFile(out);
    console.log('Converted:', path.relative(process.cwd(), file), '->', path.relative(process.cwd(), out));
  } catch (err) {
    console.error('Failed to convert', file, err.message);
  }
}

(async () => {
  console.log('Scanning for JPG/JPEG files in', ROOT);
  try {
    const files = await walk(ROOT);
    if (files.length === 0) {
      console.log('No JPG/JPEG files found.');
      return;
    }

    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      await convert(f);
    }

    console.log('Conversion complete.');
    console.log('Note: This script leaves original JPGs intact and writes .webp files alongside them.');
  } catch (err) {
    console.error('Error scanning folders:', err.message);
    process.exit(1);
  }
})();
