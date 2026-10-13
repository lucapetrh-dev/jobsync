// @vitest-environment node
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { expect, test } from "vitest";

async function expectTransparentCorners(bytes: Buffer) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
  expect(alpha(Math.floor(info.width / 2), Math.floor(info.height / 2))).toBe(255);
  for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
    expect(alpha(x, y)).toBe(0);
  }
}

for (const file of [
  "public/images/jobs-icon.svg", "src/app/icon.svg", "src/app/apple-icon.png",
  "public/images/jobs-logo-light.png", "public/images/jobs-logo-dark.png",
  "public/icons/jobs-192.png", "public/icons/jobs-512.png",
]) {
  test(`${file} has no opaque background tile`, async () => {
    await expectTransparentCorners(await readFile(file));
  });
}

test("every legacy favicon size has a transparent background", async () => {
  const ico = await readFile("src/app/favicon.ico");
  const count = ico.readUInt16LE(4);
  expect(count).toBe(3);
  for (let index = 0; index < count; index++) {
    const entry = 6 + index * 16;
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    await expectTransparentCorners(ico.subarray(offset, offset + length));
  }
});
