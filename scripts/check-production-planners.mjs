import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const helperSource = await readFile(path.join(root, "src", "parts", "10c-general-helpers.js"), "utf8");
const automationSource = await readFile(path.join(root, "src", "parts", "05b3-automation-factory-droid-graphene.js"), "utf8");

const context = {
  console,
  FactoryManager: { Productions: { NanoTube: { id: "NanoTube" } } },
  DroidManager: { Productions: {} },
  settings: {},
  state: { tooltips: {}, unlockedBuildings: [] },
  resources: { Neutronium: makeResource("Neutronium") },
  game: { global: { race: {} } },
  findRequiredResourceWeight: () => undefined,
  CONSUMPTION_BALANCE_MIN: 60,
};
vm.createContext(context);
vm.runInContext(`${helperSource}\n${automationSource}`, context, { filename: "production-planner-sources.js" });

assert.equal(typeof context.buildPriorityList, "function", "buildPriorityList must be available");
assert.equal(typeof context.planFactoryAssignments, "function", "planFactoryAssignments must be available");
assert.equal(typeof context.planMiningDroidAssignments, "function", "planMiningDroidAssignments must be available");

{
  const high = { id: "high" };
  const fallback = { id: "fallback" };
  const low = { id: "low" };
  const priorities = { high: 10, fallback: -1, low: 1 };
  const groups = context.buildPriorityList([high, fallback, low], item => priorities[item.id]);

  assert.equal(
    JSON.stringify(groups.map(group => group.map(item => item.id))),
    JSON.stringify([["high", "fallback"], ["low"]]),
    "-1 priority should join the highest active group"
  );
}

{
  const normal = makeProduction("normal", { priority: 1, weighting: 1 });
  const demanded = makeProduction("demanded", { priority: 1, weighting: 1, demanded: true });
  const manager = makeManager(2);
  manager.Productions.NanoTube = makeProduction("nanotube");

  const result = context.planFactoryAssignments([normal, demanded], factoryContext(manager));

  assert.equal(result.demanded, 2, "demanded factory products should get the priority boost");
  assert.equal(result.normal, 0, "lower-priority factory products should be explicitly planned to zero");
}

{
  const useful = makeProduction("useful", { priority: 1, weighting: 1 });
  const capped = makeProduction("capped", { priority: 1, weighting: 1, useful: false });
  const manager = makeManager(2);
  manager.Productions.NanoTube = makeProduction("nanotube");

  const result = context.planFactoryAssignments([useful, capped], factoryContext(manager));

  assert.equal(result.useful, 2, "useful factory products should receive capacity");
  assert.equal(result.capped, 0, "capped factory products should be excluded");
}

{
  const material = makeResource("Iron", { currentQuantity: 0, rateOfChange: 15 });
  const limited = makeProduction("limited", {
    priority: 1,
    weighting: 1,
    cost: [{ resource: material, quantity: 10, minRateOfChange: 0 }],
  });
  const manager = makeManager(3);
  manager.Productions.NanoTube = makeProduction("nanotube");

  const result = context.planFactoryAssignments([limited], factoryContext(manager));

  assert.equal(result.limited, 1, "factory planner should limit assignments by affordable material income");
}

{
  const capped = makeProduction("capped", { priority: 1, weighting: 1, useful: false });
  const manager = makeManager(2, { capped: 1 });

  const result = context.planMiningDroidAssignments([capped], { manager });

  assert.equal(JSON.stringify(result), JSON.stringify({ capped: 1 }), "droid planner should preserve current counts when not all droids can be assigned");
}

console.log("Production planner checks passed");

function factoryContext(manager, overrides = {}) {
  return {
    manager,
    settings: {
      productionFactoryWeighting: "none",
      productionFactoryMinIngredients: 0,
      useDemanded: true,
      prestigeType: "none",
      prestigeBioseedConstruct: false,
      ...overrides.settings,
    },
    state: {
      tooltips: {},
      unlockedBuildings: [],
      ...overrides.state,
    },
    resources: {
      Neutronium: makeResource("Neutronium"),
      ...overrides.resources,
    },
    game: {
      global: { race: {} },
      ...overrides.game,
    },
    findRequiredResourceWeight: overrides.findRequiredResourceWeight ?? (() => undefined),
    consumptionBalanceMin: overrides.consumptionBalanceMin ?? 60,
  };
}

function makeManager(maxOperating, current = {}) {
  return {
    Productions: {},
    maxOperating: () => maxOperating,
    currentProduction: production => current[production.id] ?? 0,
    decreaseProduction: () => {},
    increaseProduction: () => {},
  };
}

function makeProduction(id, options = {}) {
  const resource = options.resource ?? makeResource(options.resourceId ?? id, options);
  return {
    id,
    resource,
    unlocked: options.unlocked ?? true,
    enabled: options.enabled ?? true,
    weighting: options.weighting ?? 1,
    priority: options.priority ?? 1,
    cost: options.cost ?? [],
  };
}

function makeResource(id, options = {}) {
  return {
    id,
    name: options.name ?? id,
    currentQuantity: options.currentQuantity ?? 1000,
    storageRequired: options.storageRequired ?? 100,
    storageRatio: options.storageRatio ?? 1,
    rateOfChange: options.rateOfChange ?? 100,
    isDemanded: () => options.demanded ?? false,
    isUseful: () => options.useful ?? true,
    isUnlocked: () => options.unlocked ?? true,
  };
}
