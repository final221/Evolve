import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const profilePath = path.join(root, "evolve-script-settings.json");
const migrationPath = path.join(root, "src", "parts", "04c-settings-sync-and-migration.js");

const profile = JSON.parse(await readFile(profilePath, "utf8"));
const migrationSource = await readFile(migrationPath, "utf8");

assert.equal(profile.scriptName, "TMVictor", "settings profile scriptName changed");
assert.equal(typeof profile.overrides, "object", "settings profile must export overrides");
assert.ok(!Array.isArray(profile.overrides), "settings profile overrides must be an object");
assert.ok(Array.isArray(profile.triggers), "settings profile must export triggers");

const expectedProductionKeys = {
  autoFactory: "boolean",
  autoMiningDroid: "boolean",
  autoReplicator: "boolean",
  productionFactoryWeighting: "string",
  productionFactoryMinIngredients: "number",
  productionFactoryFocusMaterials: "boolean",
  productionFoundryWeighting: "string",
  productionCraftsmen: "string",
  productionSmelting: "string",
  productionSmeltingIridium: "number",
  replicatorAssignGovernorTask: "boolean",
  replicatorWeightingMode: "string",
};

const expectedMarketStorageKeys = {
  autoMarket: "boolean",
  autoGalaxyMarket: "boolean",
  tradeRouteMinimumMoneyPerSecond: "number",
  tradeRouteMinimumMoneyPercentage: "number",
  tradeRouteSellExcess: "boolean",
  minimumMoney: "number",
  minimumMoneyPercentage: "number",
  marketMinIngredients: "number",
  autoStorage: "boolean",
  storageLimitPreMad: "boolean",
  storageSafeReassign: "boolean",
  storageAssignExtra: "boolean",
  storageAssignPart: "boolean",
};

for (const [key, type] of Object.entries({...expectedProductionKeys, ...expectedMarketStorageKeys})) {
  assert.equal(typeof profile[key], type, `${key} must be present as ${type}`);
}

const tableKeys = [
  "production_Money",
  "production_w_Money",
  "production_p_Money",
  "production_Nano_Tube",
  "production_w_Nano_Tube",
  "production_p_Nano_Tube",
  "droid_w_Adamantite",
  "droid_pr_Adamantite",
  "droid_w_Coal",
  "droid_pr_Coal",
  "replicator_Food",
  "replicator_w_Food",
  "replicator_p_Food",
  "replicator_Nano_Tube",
  "replicator_w_Nano_Tube",
  "replicator_p_Nano_Tube",
  "buyFood",
  "res_buy_p_Food",
  "res_buy_r_Food",
  "sellFood",
  "res_sell_r_Food",
  "res_trade_buy_Food",
  "res_trade_sell_Food",
  "res_trade_w_Food",
  "res_trade_p_Food",
  "res_galaxy_w_Deuterium",
  "res_galaxy_p_Deuterium",
  "res_storageOrichalcum",
  "res_storage_p_Orichalcum",
  "res_storage_o_Orichalcum",
  "res_min_storeOrichalcum",
  "res_max_storeOrichalcum",
];

for (const key of tableKeys) {
  assert.ok(Object.hasOwn(profile, key), `${key} must be present in the exported profile`);
}

assert.ok(!Object.hasOwn(profile, "productionPrioritizeDemanded"), "profile should not export deprecated productionPrioritizeDemanded");
assert.match(
  migrationSource,
  /settingsRaw\.hasOwnProperty\("productionPrioritizeDemanded"\)/u,
  "old productionPrioritizeDemanded imports must still migrate"
);
assert.match(
  migrationSource,
  /settingsRaw\.productionFoundryWeighting\s*=\s*settingsRaw\.productionPrioritizeDemanded\s*\?\s*"demanded"\s*:\s*"none"/u,
  "productionPrioritizeDemanded must migrate to productionFoundryWeighting"
);

JSON.parse(JSON.stringify(profile));

console.log("Settings profile checks passed");
