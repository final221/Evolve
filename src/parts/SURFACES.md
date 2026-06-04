# Cross-Surface Map

Use this file before broad searches. It maps common change intents to the narrow source files that usually need to be considered together.

## Build And Source Order

- Source order is generated from `src/parts/*.js` by `npm run parts`.
- Behavior equivalence is checked by `npm run check`, which verifies generated indexes and exact reconstruction of `reference/evolve_automation.original.user.js`.
- Do not hand-edit `src/source-files.json`; add/rename/delete part files, then run `npm run parts`.

## Data To Runtime Objects

- Building/project wrappers:
  - definitions: `02c*-buildings-*.js`
  - wrapper classes: `01c-action-project-technology-classes.js`
  - manager lists: `03c-managers-script-control.js`
  - state initialization: `04a2-init-building-state.js`
  - automation use: `05c3-automation-build-research.js`, `06a-runtime-data-and-priorities.js`
  - settings UI: `09d-settings-buildings-projects.js`

- Resources/jobs/crafters:
  - definitions: `02b-resources-and-jobs.js`
  - wrapper classes: `01b-job-resource-classes.js`
  - job manager: `03c-managers-script-control.js`
  - craft cost/state setup: `04a1-init-craft-state-races.js`
  - automation use: `05b0-automation-jobs.js`, `05b2-automation-basic-production.js`, `05b3-automation-factory-droid-graphene.js`
  - settings UI: `09c-settings-jobs-weighting.js`, `09b-settings-magic-production.js`

- Race/evolution:
  - classes: `01d-race-trigger-classes.js`
  - static lists/state: `02a-constants-and-state.js`
  - race initialization: `04a1-init-craft-state-races.js`
  - default settings: `04b-settings-defaults.js`
  - automation use: `05a1-automation-evolution-planet.js`
  - settings UI: `08a-settings-general-evolution.js`

## Automation To Settings

- Every setting normally has three surfaces:
  - default/reset value in `04b-settings-defaults.js`
  - state sync/migration in `04c-settings-sync-and-migration.js`
  - UI control in one of `08*-settings-*.js` or `09*-settings-*.js`

- Building priorities and weightings:
  - rules/data: `02d-weighting-rules.js`
  - manager ordering: `03c-managers-script-control.js`
  - default settings: `04b-settings-defaults.js`
  - automation: `05c3-automation-build-research.js`
  - UI: `09d-settings-buildings-projects.js`, `09c-settings-jobs-weighting.js`

- Market/storage:
  - resource data: `02b-resources-and-jobs.js`
  - managers: `03a3-managers-market-storage.js`
  - defaults: `04b-settings-defaults.js`
  - automation: `05c2-automation-market.js`, `05d2-automation-storage.js`
  - UI: `09a-settings-market-storage-traits.js`

- Power/support:
  - resource/action wrappers: `01b-job-resource-classes.js`, `01c-action-project-technology-classes.js`
  - building definitions: `02c*-buildings-*.js`
  - defaults: `04b-settings-defaults.js`
  - automation: `05d1-automation-power.js`
  - UI: `09d-settings-buildings-projects.js`

## Late-Game Feature Areas

- Fleet/mechs:
  - managers: `03b2-manager-outer-fleet.js`, `03b3-manager-fleet.js`, `03b4-manager-mech.js`
  - automation: `05d3-automation-traits-trade-outer-fleet.js`, `05e-automation-fleet-and-mechs.js`
  - runtime UI/mech info: `10b-runtime-toggle-ui.js`
  - settings UI: `08c-settings-war-hell-fleet.js`, `08d-settings-mech-ejector.js`

- War/hell:
  - managers: `03b1-managers-spy-war.js`
  - automation: `05a3-automation-battle-hell.js`, `05d1-automation-power.js`
  - settings UI: `08c-settings-war-hell-fleet.js`
  - polyfills/game copies: `11-polyfills-and-close.js`

- Magic/psychic/wish/genetics:
  - automation: `05c1-automation-prestige-magic-genetics.js`
  - managers: `03a2-managers-advanced-production.js`
  - settings UI: `09b-settings-magic-production.js`

## Runtime Loop And UI Shell

- Main bootstrap/tick loop:
  - `06c-runtime-bootstrap-and-automation.js`
  - data refresh: `06a-runtime-data-and-priorities.js`
  - active target/tab UI: `06b-runtime-tabs-and-target-ui.js`
  - error/style handling: `06d-runtime-style-errors-and-cleanup.js`

- Settings shell and shared controls:
  - shell/sections: `07a-settings-shell-sections.js`
  - overrides: `07b-settings-overrides.js`
  - shared controls: `07c-settings-controls.js`
  - helper UI/toggles: `10a-logging-options-topbar-ui.js`, `10b-runtime-toggle-ui.js`

- Import/export:
  - UI entry: `07a-settings-shell-sections.js`
  - logic: `10d-settings-import-export.js`
  - settings sync: `04c-settings-sync-and-migration.js`
