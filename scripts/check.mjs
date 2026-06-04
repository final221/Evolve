import { access, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const headerPath = path.join(root, "src", "userscript-header.txt");
const sourceFilesPath = path.join(root, "src", "source-files.json");
const requiredMetadata = [
  "// @name         Evolve 2.0",
  "// @namespace    https://github.com/final221/Evolve",
  "// @version      0.1.0",
  "// @downloadURL  https://raw.githubusercontent.com/final221/Evolve/main/dist/evolve_automation.user.js",
  "// @updateURL    https://raw.githubusercontent.com/final221/Evolve/main/dist/evolve_automation.user.js",
  "// @author       Fynn",
  "// @match        https://pmotschmann.github.io/Evolve/",
  "// @require      https://code.jquery.com/jquery-3.7.1.min.js",
  "// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js",
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function parseJavaScript(filePath) {
  const code = await readFile(filePath, "utf8");
  new vm.Script(code, { filename: path.relative(root, filePath) });
}

async function parseJavaScriptText(code, filename) {
  new vm.Script(code, { filename });
}

async function verifyMetadata(filePath) {
  const code = await readFile(filePath, "utf8");
  for (const line of requiredMetadata) {
    if (!code.includes(line)) {
      throw new Error(`${path.relative(root, filePath)} is missing metadata line: ${line}`);
    }
  }
}

async function readSource() {
  const sourceFiles = JSON.parse(await readFile(sourceFilesPath, "utf8"));
  const chunks = await Promise.all(
    sourceFiles.map(async (file) => (await readFile(path.join(root, file), "utf8")).replace(/\r\n?/g, "\n"))
  );

  return chunks.join("");
}

function stripUserscriptHeader(code, filename) {
  const headerEnd = "// ==/UserScript==";
  const headerEndIndex = code.indexOf(headerEnd);
  if (headerEndIndex === -1) {
    throw new Error(`${filename} is missing ${headerEnd}`);
  }

  const bodyStart = code.indexOf("\n", headerEndIndex + headerEnd.length);
  return bodyStart === -1 ? "" : code.slice(bodyStart + 1);
}

async function verifyOriginalSplit() {
  const originalPath = path.join(root, "reference", "evolve_automation.original.user.js");
  if (!(await exists(originalPath))) {
    return;
  }

  const original = (await readFile(originalPath, "utf8")).replace(/\r\n?/g, "\n");
  const originalBody = stripUserscriptHeader(original, path.relative(root, originalPath));
  const body = await readSource();

  if (originalBody !== body) {
    throw new Error("src/source-files.json no longer reconstructs the body of reference/evolve_automation.original.user.js");
  }
}

const outputPaths = [
  path.join(root, "dist", "evolve_automation.user.js"),
  path.join(root, "dist", "evolve_automation.min.user.js"),
];

await parseJavaScriptText(await readSource(), "src/source-files.json");
await verifyMetadata(headerPath);
await verifyOriginalSplit();

for (const outputPath of outputPaths) {
  if (await exists(outputPath)) {
    await parseJavaScript(outputPath);
    await verifyMetadata(outputPath);
  }
}

console.log("Userscript source checks passed");
