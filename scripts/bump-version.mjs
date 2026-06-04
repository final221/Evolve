import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const headerPath = path.join(root, "src", "userscript-header.txt");
const packagePath = path.join(root, "package.json");
const allowedBumps = new Set(["major", "minor", "patch", "none"]);

function requestedBump() {
  const bumpArgIndex = process.argv.indexOf("--bump");
  const bump = bumpArgIndex === -1 ? process.argv[2] : process.argv[bumpArgIndex + 1];
  return bump ?? process.env.BUMP ?? "patch";
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version);
  if (!match) {
    throw new Error(`Unsupported version "${version}". Expected semver x.y.z.`);
  }

  return match.slice(1).map(Number);
}

function bumpVersion(version, bump) {
  let [major, minor, patch] = parseVersion(version);

  if (bump === "major") {
    return `${major + 1}.0.0`;
  }
  if (bump === "minor") {
    return `${major}.${minor + 1}.0`;
  }
  if (bump === "patch") {
    return `${major}.${minor}.${patch + 1}`;
  }

  return version;
}

function findHeaderVersion(header) {
  const match = /^\/\/ @version\s+(\S+)$/mu.exec(header);
  if (!match) {
    throw new Error("src/userscript-header.txt is missing // @version metadata.");
  }

  return match[1];
}

function setHeaderVersion(header, version) {
  return header.replace(/^\/\/ @version\s+\S+$/mu, `// @version      ${version}`);
}

const bump = requestedBump();
if (!allowedBumps.has(bump)) {
  throw new Error(`Invalid bump "${bump}". Use one of: ${[...allowedBumps].join(", ")}.`);
}

const header = await readFile(headerPath, "utf8");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const headerVersion = findHeaderVersion(header);

if (packageJson.version !== headerVersion) {
  throw new Error(`Version mismatch before bump: package.json has ${packageJson.version}, userscript header has ${headerVersion}.`);
}

const nextVersion = bumpVersion(headerVersion, bump);

if (bump !== "none") {
  packageJson.version = nextVersion;
  await writeFile(headerPath, setHeaderVersion(header, nextVersion), "utf8");
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

console.log(bump === "none" ? `Version unchanged at ${nextVersion}` : `Version bumped ${headerVersion} -> ${nextVersion}`);
