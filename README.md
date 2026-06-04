# Evolve Userscript Builder

This workspace turns the large Evolve Tampermonkey script into a buildable userscript project.

## Source Files

- `src/userscript-header.txt` contains the Tampermonkey metadata block.
- `src/source-files.json` lists the ordered script body chunks.
- `src/parts/` contains the current script body, split along top-level sections.
- `dist/evolve_automation.user.js` is the generated userscript to install in Tampermonkey.

`reference/evolve_automation.original.user.js` is the original imported single-file script kept as a historical comparison point. Fork-owned metadata lives in `src/userscript-header.txt`.

## Commands

```sh
npm run check
npm run parts
npm run build
npm run build -- --bump minor
npm run build -- --bump none
npm run build:check
npm run size
```

`npm run build` is the release build. It bumps `src/userscript-header.txt` and `package.json` once, then rebuilds the committed userscript artifact in `dist/` from that same version. The default bump is `patch`; use `-- --bump minor`, `-- --bump major`, or `-- --bump none` when the change needs a different policy. The low-level `npm run build:script` command rebuilds `dist/evolve_automation.user.js` without changing the version.

Version bump policy:

- `patch`: default for fixes, refactors, settings schema changes, and dist refreshes.
- `minor`: user-visible automation behavior changes or new settings/features.
- `major`: incompatible settings/profile changes or intentionally breaking behavior.
- `none`: metadata-only checks, local rebuilds, or when a version was already bumped in the same change set.

Use `src/parts/README.md` as the navigation map before opening script chunks. Use `src/parts/SURFACES.md` when a change spans data, managers, automation, settings, and UI.

Use `src/parts/AUDIT.md` for the review model. The source parts are the audit surface; `dist/evolve_automation.user.js` is generated install output and is intentionally whitespace-collapsed by the build.

Run `npm run parts` after adding, renaming, deleting, or further splitting files in `src/parts/`. This regenerates `src/source-files.json` and `src/parts/README.md` from the actual part files, keeping the builder's own index from becoming another manual maintenance problem. `npm run check` also verifies that this generated index is current.

The `dist/` userscript file is committed intentionally because Tampermonkey updates from the GitHub raw `dist/evolve_automation.user.js` URL. Run `npm run build` before publishing changes that should reach installed scripts. `npm run check` includes `npm run build:check` so stale generated output fails verification and also checks that `package.json`, `src/userscript-header.txt`, and `dist/evolve_automation.user.js` use the same userscript version.

## Next Refactor Steps

After the generated userscript is smoke-tested in Tampermonkey, begin replacing repeated object/config blocks with declarative tables plus builder helpers.
