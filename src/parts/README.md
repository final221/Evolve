# Source Parts

These files are concatenated in the order listed by `src/source-files.json`.

Run `npm run parts` after adding, renaming, deleting, or splitting part files. It regenerates the ordered source list and this navigation map from the actual `src/parts/*.js` files, so the split structure has a builder of its own instead of another hand-maintained index.

The build/check scripts verify that the ordered parts parse as JavaScript, the fork metadata is present, and the generated `dist/` userscripts are current. `reference/evolve_automation.original.user.js` remains a historical comparison point, not a byte-for-byte source lock.

## Where To Look First

- `01a-bootstrap-globals.js`: IIFE start, shared globals, platform/safemode constants.
- `01b-job-resource-classes.js`: job/resource wrappers and resource subclasses.
- `01c-action-project-technology-classes.js`: action/building/project/technology wrappers.
- `01d-race-trigger-classes.js`: race weighting/habitability logic and trigger wrapper.
- `01e-trait-classes.js`: minor/mutable/major/genus trait wrappers and Fibonacci helper.
- `02a-constants-and-state.js`: static lists, lookup maps, global registries, shared `state`.
- `02b-resources-and-jobs.js`: `resources`, `jobs`, and `crafter` definitions.
- `02c1-buildings-city.js`: city tab building/action definitions.
- `02c2-buildings-space.js`: space tab building/action definitions through solar system regions.
- `02c3-buildings-tauceti.js`: Tau Ceti building/action definitions.
- `02c4-buildings-interstellar-galaxy-portal.js`: interstellar, galaxy, and portal building/action definitions.
- `02c5-buildings-eden-projects.js`: Eden building/action definitions plus linked building pairs and ARPA projects.
- `02d-weighting-rules.js`: weighting rule constants and `weightingRules`.
- `03a1-managers-traits-basic-industry.js`: trait managers plus quarry/mine/extractor/nanite/supply/eject managers.
- `03a2-managers-advanced-production.js`: alchemy/ritual/smelter/factory/replicator/droid/graphene managers.
- `03a3-managers-market-storage.js`: galaxy trade, government, market, and storage managers.
- `03b1-managers-spy-war.js`: spy and war managers.
- `03b2-manager-outer-fleet.js`: outer fleet ship planning manager.
- `03b3-manager-fleet.js`: fortress fleet manager.
- `03b4-manager-mech.js`: mech manager.
- `03c-managers-script-control.js`: job/building/project/trigger/window/key managers.
- `03d-manager-game-log.js`: script logging helper.
- `04a1-init-craft-state-races.js`: craft cost updates, state initialization, race initialization.
- `04a2-init-building-state.js`: building state initialization.
- `04a3-production-settings-schema.js`: production settings schema.
- `04a4-market-storage-settings-schema.js`: market storage settings schema.
- `04a5-building-project-settings-schema.js`: building project settings schema.
- `04b-settings-defaults.js`: default/reset settings for every settings surface.
- `04c-settings-sync-and-migration.js`: settings state sync, standalone settings, migrations, achievement lookup, queued settings.
- `05a1-automation-evolution-planet.js`: evolution target, universe, planet generation, and planet selection automation.
- `05a2-automation-craft-civic.js`: early crafting, government, mercenary, and spy automation.
- `05a3-automation-battle-hell.js`: battle and hell automation.
- `05b0-automation-jobs.js`: job and servant assignment automation.
- `05b1-automation-tax.js`: tax rate automation.
- `05b2-automation-basic-production.js`: alchemy/pylon, quarry, mine, extractor, and smelter automation.
- `05b3-automation-factory-droid-graphene.js`: factory, mining droid, and graphene plant automation.
- `05b4-automation-consume-replicator.js`: consume and replicator automation.
- `05c1-automation-prestige-magic-genetics.js`: prestige logging/availability, shapeshift/psychic/ocular/wish/genetics automation.
- `05c2-automation-market.js`: market and galaxy market automation.
- `05c3-automation-build-research.js`: gather/build, tech conflict, trigger/research helpers, citadel consumption.
- `05d1-automation-power.js`: hell suppression and power automation.
- `05d2-automation-storage.js`: spire adjustment, supply ratios, storage expansion, auto storage.
- `05d3-automation-traits-trade-outer-fleet.js`: minor/mutable trait automation, trade routes, outer fleet setup.
- `05e-automation-fleet-and-mechs.js`: piracy, fleet automation, mech automation.
- `06a-runtime-data-and-priorities.js`: script data refresh/finalization, storage requirements, demanded resources, priority targets, evolution result checks.
- `06b-runtime-tabs-and-target-ui.js`: tab refresh, active target UI, update-state orchestration, game-action verification.
- `06c-runtime-bootstrap-and-automation.js`: script initialization, log filtering, tooltips, overrides, automation tick loop, main bootstrap.
- `06d-runtime-style-errors-and-cleanup.js`: debug-data refresh, injected CSS, ignored errors, warning display, global error handling, script settings removal.
- `07a-settings-shell-sections.js`: script settings shell, import/export UI, section wrappers, headings, override metadata.
- `07b-settings-overrides.js`: override modal, override condition/return builders, override input rendering.
- `07c-settings-controls.js`: shared settings controls, table inputs/toggles, labels, reset checkbox.
- `08a-settings-general-evolution.js`: general, prestige, government, evolution queue, and planet settings panels.
- `08b-settings-triggers-research.js`: trigger, active target, and research settings panels.
- `08c-settings-war-hell-fleet.js`: war, hell, and fleet settings panels.
- `08d-settings-mech-ejector.js`: mech and ejector settings panels.
- `09a-settings-market-storage-traits.js`: market, storage, and trait settings panels.
- `09b-settings-magic-production.js`: magic and production settings panels.
- `09c-settings-jobs-weighting.js`: job and weighting settings panels.
- `09d-settings-buildings-projects.js`: building and project settings panels.
- `10a-logging-options-topbar-ui.js`: logging settings, options modal, top-bar UI, and main `updateUI`.
- `10b-runtime-toggle-ui.js`: mech info, ARPA/craft/building/eject/supply/market/storage toggle UI.
- `10c-general-helpers.js`: sorting helper, priority grouping, combinations/math, game-state utility helpers, number formatting, eval/Vue/property helpers.
- `10d-settings-import-export.js`: settings import/export flow.
- `11-polyfills-and-close.js`: copied/reimplemented game polyfills and final IIFE close.

## Refactor Rule

Keep split-structure edits separate from behavior edits where practical. For pure token-efficiency splits, only change part files and then run `npm run parts`. For behavior refactors, rebuild and run `npm run check` before publishing.
