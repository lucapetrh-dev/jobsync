const sharp = require('sharp');
const fs = require('node:fs/promises');

// Export the detailed artwork without replacing its texture or geometry.
async function main() {
  const light = 'design/branding/jobs-logo-light.png';
  const dark = 'design/branding/jobs-logo-dark.png';
  for (const [file, size, source] of [
    ['public/images/jobs-logo-light.png', 256, light],
    ['public/images/jobs-logo-dark.png', 256, dark],
  ]) {
    await sharp(source).resize(size, size).png().toFile(file);
  }
  // Launcher tiles retain their dark appearance independently of app theme.
  for (const [file, size] of [
    ['src/app/apple-icon.png', 180],
    ['public/icons/jobs-192.png', 192],
    ['public/icons/jobs-512.png', 512],
  ]) {
    const markSize = Math.round(size * 0.92);
    const mark = await sharp(dark).resize(markSize, markSize).png().toBuffer();
    const offset = Math.floor((size - markSize) / 2);
    await sharp({ create: { width: size, height: size, channels: 3, background: '#0b0b0b' } })
      .composite([{ input: mark, left: offset, top: offset }]).png().toFile(file);
  }
  const embedded = async (source, size) => (await sharp(source).resize(size, size).png().toBuffer()).toString('base64');
  const black = await embedded(light, 64);
  const white = await embedded(dark, 64);
  await fs.writeFile('src/app/icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>.dark { display: none; } @media (prefers-color-scheme: dark) { .light { display: none; } .dark { display: inline; } }</style>
  <image class="light" width="64" height="64" href="data:image/png;base64,${black}"/>
  <image class="dark" width="64" height="64" href="data:image/png;base64,${white}"/>
</svg>\n`);
  const fallback = await embedded(light, 256);
  await fs.writeFile('public/images/jobs-icon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><image width="256" height="256" href="data:image/png;base64,${fallback}"/></svg>\n`);
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(size => sharp(light).resize(size, size).png().toBuffer()));
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
