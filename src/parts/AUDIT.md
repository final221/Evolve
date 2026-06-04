# Audit Guide

Audit `src/parts/`, not `dist/`.

`dist/evolve_automation.user.js` is the Tampermonkey install artifact generated from the ordered files in `src/source-files.json`. The build removes comments outside the userscript metadata and collapses whitespace, so the generated file is intentionally smaller and harder to read than the source parts.

For code review and refactors:

- Start with `src/parts/README.md` to find the relevant numbered part.
- Use `src/source-files.json` only to verify concatenation order.
- Treat `dist/evolve_automation.user.js` as generated output that must be committed because Tampermonkey updates from GitHub raw.
- Run `npm run parts` after adding, removing, or renaming part files.
- Run `npm run build` before publishing changes that should update installed userscripts.
- Run `npm run check` before committing.

The current architecture direction is vertical slices:

- Move repeated defaults and settings UI into data schemas.
- Keep existing setting keys unless a migration is explicitly added.
- Split automation into planner/apply seams where the planner can be tested without the game UI.
- Do not introduce a broad framework until the same helper shape has proven useful across multiple slices.
