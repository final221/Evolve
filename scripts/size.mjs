import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const files = [
  "reference/evolve_automation.original.user.js",
  "src/userscript-header.txt",
  "src/source-files.json",
  "dist/evolve_automation.user.js",
  "dist/evolve_automation.min.user.js",
];

function formatBytes(bytes) {
  return `${bytes.toLocaleString()} bytes (${(bytes / 1024).toFixed(1)} KiB)`;
}

for (const file of files) {
  const filePath = path.join(root, file);
  try {
    const info = await stat(filePath);
    console.log(`${file.padEnd(34)} ${formatBytes(info.size)}`);
  } catch {
    console.log(`${file.padEnd(34)} missing`);
  }
}

const sourceFiles = JSON.parse(await readFile(path.join(root, "src", "source-files.json"), "utf8"));
let sourceBytes = 0;
for (const file of sourceFiles) {
  const info = await stat(path.join(root, file));
  sourceBytes += info.size;
}

console.log(`${"src/parts total".padEnd(34)} ${formatBytes(sourceBytes)}`);
