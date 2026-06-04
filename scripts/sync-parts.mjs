import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const partsDir = path.join(root, "src", "parts");
const sourceFilesPath = path.join(root, "src", "source-files.json");
const readmePath = path.join(partsDir, "README.md");
const checkOnly = process.argv.includes("--check");

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, "\n");
}

function toProjectPath(fileName) {
  return `src/parts/${fileName}`;
}

function sortParts(a, b) {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

function humanizePartName(fileName) {
  return fileName
    .replace(/\.js$/u, "")
    .replace(/^\d+[a-z]?\d*-/u, "")
    .replace(/-/gu, " ");
}

function partDescription(fileName, descriptions) {
  const description = descriptions.get(fileName) ?? `${humanizePartName(fileName)}.`;
  return description.replace(/\.{2,}$/u, ".");
}

function parseExistingDescriptions(readme) {
  const descriptions = new Map();
  const pattern = /^- `([^`]+)`: (.+)$/gmu;
  let match;

  while ((match = pattern.exec(readme)) !== null) {
    descriptions.set(match[1], match[2]);
  }

  return descriptions;
}

async function readExistingReadme() {
  try {
    return normalizeNewlines(await readFile(readmePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

async function readPartFiles() {
  const entries = await readdir(partsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name)
    .sort(sortParts);
}

async function assertPartsLookOrdered(partFiles) {
  const invalidNames = partFiles.filter((fileName) => !/^\d+[a-z]?\d*-.+\.js$/u.test(fileName));
  if (invalidNames.length > 0) {
    throw new Error(`Part files must start with an order prefix: ${invalidNames.join(", ")}`);
  }

  const sourceFiles = JSON.parse(await readFile(sourceFilesPath, "utf8"));
  const missingFiles = sourceFiles.filter((filePath) => !partFiles.includes(path.basename(filePath)));
  if (checkOnly && missingFiles.length > 0) {
    throw new Error(`src/source-files.json references missing part files: ${missingFiles.join(", ")}`);
  }
}

function buildReadme(partFiles, descriptions) {
  const bullets = partFiles
    .map((fileName) => `- \`${fileName}\`: ${partDescription(fileName, descriptions)}`)
    .join("\n");

  return `# Source Parts

These files are concatenated in the order listed by \`src/source-files.json\`.

Run \`npm run parts\` after adding, renaming, deleting, or splitting part files. It regenerates the ordered source list and this navigation map from the actual \`src/parts/*.js\` files, so the split structure has a builder of its own instead of another hand-maintained index.

The build/check scripts verify that the ordered parts plus \`src/userscript-header.txt\` still reconstruct \`reference/evolve_automation.original.user.js\` exactly, after newline normalization.

## Where To Look First

${bullets}

## Refactor Rule

Do not edit behavior and split structure in the same change unless \`npm run check\` proves the ordered parts still reconstruct the reference exactly before the behavior edit. For pure token-efficiency splits, only change part files and then run \`npm run parts\`.
`;
}

async function compareOrWrite(filePath, expected) {
  const current = normalizeNewlines(await readFile(filePath, "utf8"));
  if (current === expected) {
    return false;
  }

  if (checkOnly) {
    throw new Error(`${path.relative(root, filePath)} is out of date. Run npm run parts.`);
  }

  await writeFile(filePath, expected, "utf8");
  return true;
}

const partFiles = await readPartFiles();
await assertPartsLookOrdered(partFiles);

const existingReadme = await readExistingReadme();
const descriptions = parseExistingDescriptions(existingReadme);
const sourceFiles = partFiles.map(toProjectPath);
const generatedSourceFiles = `${JSON.stringify(sourceFiles, null, 2)}\n`;
const generatedReadme = buildReadme(partFiles, descriptions);

const wroteSourceFiles = await compareOrWrite(sourceFilesPath, generatedSourceFiles);
const wroteReadme = await compareOrWrite(readmePath, generatedReadme);

if (checkOnly) {
  console.log("Part index is up to date");
} else {
  const changed = [wroteSourceFiles && "src/source-files.json", wroteReadme && "src/parts/README.md"].filter(Boolean);
  console.log(changed.length > 0 ? `Updated ${changed.join(", ")}` : "Part index already up to date");
}
