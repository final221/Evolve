import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";
import { minify } from "terser";

const root = process.cwd();
const headerPath = path.join(root, "src", "userscript-header.txt");
const sourceFilesPath = path.join(root, "src", "source-files.json");
const outDir = path.join(root, "dist");
const useTerser = process.argv.includes("--terser");
const outFile = useTerser ? "evolve_automation.min.user.js" : "evolve_automation.user.js";
const outPath = path.join(outDir, outFile);

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, "\n");
}

function validateHeader(header) {
  const lines = header.trimEnd().split("\n");
  if (lines[0] !== "// ==UserScript==") {
    throw new Error("src/userscript-header.txt must start with // ==UserScript==");
  }
  if (lines.at(-1) !== "// ==/UserScript==") {
    throw new Error("src/userscript-header.txt must end with // ==/UserScript==");
  }
}

async function readSource() {
  const sourceFiles = JSON.parse(await readFile(sourceFilesPath, "utf8"));
  const chunks = await Promise.all(
    sourceFiles.map(async (file) => normalizeNewlines(await readFile(path.join(root, file), "utf8")))
  );

  return chunks.join("");
}

async function buildBody(source) {
  const esbuildResult = await transform(source, {
    loader: "js",
    target: "esnext",
    minifyWhitespace: true,
    minifyIdentifiers: false,
    minifySyntax: false,
    legalComments: "none",
  });

  if (!useTerser) {
    return esbuildResult.code;
  }

  const terserResult = await minify(esbuildResult.code, {
    compress: {
      passes: 2,
    },
    mangle: false,
    format: {
      comments: false,
    },
  });

  if (!terserResult.code) {
    throw new Error("Terser returned empty output");
  }

  return terserResult.code;
}

const header = normalizeNewlines(await readFile(headerPath, "utf8"));
const source = await readSource();

validateHeader(header);

const body = await buildBody(source);
const output = `${header.trimEnd()}\n${body.trimStart()}\n`;

await mkdir(outDir, { recursive: true });
await writeFile(outPath, output, "utf8");

console.log(`Built ${path.relative(root, outPath)}`);
