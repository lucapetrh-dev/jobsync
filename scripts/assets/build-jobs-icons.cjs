const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');

// Regenerate browser and install icons from the square brand master.
async function main() {
  const source = path.join('public', 'images', 'jobs-icon.png');
  for (const [file, size] of [
    ['src/app/icon.png', 32],
    ['src/app/apple-icon.png', 180],
    ['public/icons/jobs-192.png', 192],
    ['public/icons/jobs-512.png', 512],
  ]) {
    await sharp(source).resize(size, size).png().toFile(file);
  }
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  images.forEach((data, index) => {
    const entry = 6 + index * 16;
    header[entry] = sizes[index];
    header[entry + 1] = sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  await fs.writeFile('src/app/favicon.ico', Buffer.concat([header, ...images]));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
