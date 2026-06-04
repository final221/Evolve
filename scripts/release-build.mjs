import { spawnSync } from "node:child_process";

const allowedBumps = new Set(["major", "minor", "patch", "none"]);

function requestedBump() {
  const bumpArgIndex = process.argv.indexOf("--bump");
  const bump = bumpArgIndex === -1 ? process.argv[2] : process.argv[bumpArgIndex + 1];
  return bump ?? process.env.BUMP ?? "patch";
}

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const bump = requestedBump();
if (!allowedBumps.has(bump)) {
  throw new Error(`Invalid bump "${bump}". Use one of: ${[...allowedBumps].join(", ")}.`);
}

run(["scripts/bump-version.mjs", bump]);
run(["scripts/build.mjs"]);
run(["scripts/build.mjs", "--terser"]);
