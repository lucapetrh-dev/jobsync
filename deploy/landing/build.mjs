import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const local = new URL("./", import.meta.url);

async function dataUrl(path, type) {
  const bytes = await readFile(new URL(path, root));
  return `data:${type};base64,${bytes.toString("base64")}`;
}

const [template, stylesheet, lightLogo, darkLogo, favicon, font] = await Promise.all([
  readFile(new URL("page.html", local), "utf8"),
  readFile(new URL("page.css", local), "utf8"),
  dataUrl("public/images/jobs-logo-light.png", "image/png"),
  dataUrl("public/images/jobs-logo-dark.png", "image/png"),
  dataUrl("public/icons/jobs-192.png", "image/png"),
  dataUrl("src/app/fonts/Geist-Variable.woff2", "font/woff2"),
]);

const css = stylesheet.replaceAll("__FONT__", font);
const styleHash = createHash("sha256").update(css).digest("base64");
const html = template
  .replaceAll("__STYLES__", css)
  .replaceAll("__LOGO_LIGHT__", lightLogo)
  .replaceAll("__LOGO_DARK__", darkLogo)
  .replaceAll("__FAVICON__", favicon);
const contentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'none'",
  `style-src 'sha256-${styleHash}'`,
  "img-src data:",
  "font-src data:",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

await mkdir(new URL(".build/", local), { recursive: true });
await writeFile(new URL(".build/page.mjs", local), [
  `export const html = ${JSON.stringify(html)};`,
  `export const contentSecurityPolicy = ${JSON.stringify(contentSecurityPolicy)};`,
  "",
].join("\n"));
