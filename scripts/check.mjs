import { access, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const headerPath = path.join(root, "src", "userscript-header.txt");
const sourceFilesPath = path.join(root, "src", "source-files.json");
const requiredMetadata = [
  "// @name         Evolve 2.0",
  "// @namespace    https://github.com/final221/Evolve",
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

function readMetadataVersion(code, label) {
  const match = /^\/\/ @version\s+(\S+)$/mu.exec(code);
  if (!match) {
    throw new Error(`${label} is missing metadata line: // @version`);
  }

  return match[1];
}

function verifyMetadataText(code, label, expectedVersion) {
  for (const line of requiredMetadata) {
    if (!code.includes(line)) {
      throw new Error(`${label} is missing metadata line: ${line}`);
    }
  }
  const version = readMetadataVersion(code, label);
  if (version !== expectedVersion) {
    throw new Error(`${label} has version ${version}, expected ${expectedVersion}`);
  }
}

async function verifyMetadata(filePath, expectedVersion) {
  const code = await readFile(filePath, "utf8");
  verifyMetadataText(code, path.relative(root, filePath), expectedVersion);
}

async function readSource() {
  const sourceFiles = JSON.parse(await readFile(sourceFilesPath, "utf8"));
  const chunks = await Promise.all(
    sourceFiles.map(async (file) => (await readFile(path.join(root, file), "utf8")).replace(/\r\n?/g, "\n"))
  );

  return chunks.join("");
}

const outputPaths = [
  path.join(root, "dist", "evolve_automation.user.js"),
];

const header = await readFile(headerPath, "utf8");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const headerVersion = readMetadataVersion(header, "src/userscript-header.txt");

if (packageJson.version !== headerVersion) {
  throw new Error(`package.json version ${packageJson.version} does not match userscript header version ${headerVersion}`);
}

await parseJavaScriptText(await readSource(), "src/source-files.json");
verifyMetadataText(header, "src/userscript-header.txt", headerVersion);

for (const outputPath of outputPaths) {
  if (await exists(outputPath)) {
    await parseJavaScript(outputPath);
    await verifyMetadata(outputPath, headerVersion);
  }
}

console.log("Userscript source checks passed");
