# Evolve Userscript Builder

This workspace turns the large Evolve Tampermonkey script into a buildable userscript project.

## Source Files

- `src/userscript-header.txt` contains the Tampermonkey metadata block.
- `src/source-files.json` lists the ordered script body chunks.
- `src/parts/` contains the current script body, split along top-level sections.
- `dist/evolve_automation.user.js` is the generated userscript to install in Tampermonkey.
- `dist/evolve_automation.min.user.js` is an optional stronger-minification artifact.

`reference/evolve_automation.original.user.js` is the original imported single-file script kept as a body reference during the first migration step. Fork-owned metadata lives in `src/userscript-header.txt`.

## Commands

```sh
npm run check
npm run parts
npm run build
npm run build:check
npm run build:min
npm run size
```

`npm run build` is the default safe build. It preserves identifiers and syntax, removes comments outside the userscript header, and trims whitespace.

Use `src/parts/README.md` as the navigation map before opening script chunks. Use `src/parts/SURFACES.md` when a change spans data, managers, automation, settings, and UI.

Run `npm run parts` after adding, renaming, deleting, or further splitting files in `src/parts/`. This regenerates `src/source-files.json` and `src/parts/README.md` from the actual part files, keeping the builder's own index from becoming another manual maintenance problem. `npm run check` also verifies that this generated index is current.

The `dist/` userscript files are committed intentionally because Tampermonkey updates from the GitHub raw `dist/evolve_automation.user.js` URL. Run `npm run build` before publishing changes that should reach installed scripts. `npm run check` includes `npm run build:check` so stale generated output fails verification.

## Next Refactor Steps

After the generated userscript is smoke-tested in Tampermonkey, begin replacing repeated object/config blocks with declarative tables plus builder helpers.
