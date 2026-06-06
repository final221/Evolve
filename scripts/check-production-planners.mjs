import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const helperSource = await readFile(path.join(root, "src", "parts", "10c-general-helpers.js"), "utf8");
const automationSource = await readFile(path.join(root, "src", "parts", "05b3-automation-factory-droid-graphene.js"), "utf8");
const marketSource = await readFile(path.join(root, "src", "parts", "05c2-automation-market.js"), "utf8");
const tradeRouteSource = await readFile(path.join(root, "src", "parts", "05d3-automation-traits-trade-outer-fleet.js"), "utf8");

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
vm.runInContext(`${helperSource}\n${automationSource}\n${marketSource}\n${tradeRouteSource}`, context, { filename: "production-planner-sources.js" });

assert.equal(typeof context.buildPriorityList, "function", "buildPriorityList must be available");
assert.equal(typeof context.planFactoryAssignments, "function", "planFactoryAssignments must be available");
assert.equal(typeof context.planMiningDroidAssignments, "function", "planMiningDroidAssignments must be available");
assert.equal(typeof context.planMarketSellAction, "function", "planMarketSellAction must be available");
assert.equal(typeof context.planMarketBuyAction, "function", "planMarketBuyAction must be available");
assert.equal(typeof context.planGalaxyMarketAssignments, "function", "planGalaxyMarketAssignments must be available");
assert.equal(typeof context.planTradeRouteAssignments, "function", "planTradeRouteAssignments must be available");

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

{
  const resource = makeMarketResource("Iron", {
    autoSellEnabled: true,
    storageRatio: 0.9,
    autoSellRatio: 0.5,
    currentQuantity: 900,
    maxQuantity: 1000,
  });

  const result = context.planMarketSellAction(resource, marketTradeContext({
    maxMultiplier: 100,
    moneyCurrentQuantity: 0,
    moneyMaxQuantity: 1000,
    unitSellPrice: 1,
  }));

  assert.equal(result.type, "sell", "market sell planner should return a sell action");
  assert.equal(result.multiplier, 100, "market sell planner should cap oversized sells to the max multiplier");
  assert.equal(result.repetitions, 4, "market sell planner should batch oversized sells without exceeding five clicks");
}

{
  const resource = makeMarketResource("Iron", {
    autoSellEnabled: true,
    storageRatio: 0.5,
    autoSellRatio: 0.5,
    income: 60,
  });

  const result = context.planMarketSellAction(resource, marketTradeContext({
    maxMultiplier: 100,
    moneyCurrentQuantity: 0,
    moneyMaxQuantity: 1000,
    unitSellPrice: 1,
    ticksPerSecond: () => 20,
  }));

  assert.equal(result.multiplier, 6, "market sell planner should sell two ticks of production when storage is exactly at the sell ratio");
  assert.equal(result.repetitions, 1, "market sell planner should use one click when the max multiplier covers the sale");
}

{
  const resource = makeMarketResource("Copper", {
    autoBuyEnabled: true,
    storageRatio: 0.2,
    autoBuyRatio: 0.7,
    maxQuantity: 1000,
  });

  const result = context.planMarketBuyAction(resource, marketTradeContext({
    maxMultiplier: 100,
    moneyCurrentQuantity: 900,
    minimumMoneyAllowed: 100,
    unitBuyPrice: 2,
  }));

  assert.equal(result.type, "buy", "market buy planner should return a buy action");
  assert.equal(result.multiplier, 100, "market buy planner should cap oversized buys to the max multiplier");
  assert.equal(result.repetitions, 4, "market buy planner should batch oversized buys without exceeding five clicks");
}

{
  const resource = makeMarketResource("Copper", {
    autoBuyEnabled: true,
    storageRatio: 0.2,
    autoBuyRatio: 0.7,
  });

  const result = context.planMarketBuyAction(resource, marketTradeContext({
    moneyDemanded: true,
    moneyCurrentQuantity: 900,
  }));

  assert.equal(result, null, "market buy planner should skip buys while money is demanded");
}

{
  const offers = [
    makeGalaxyOffer("Iron", "Copper"),
    makeGalaxyOffer("Alloy", "Copper"),
  ];
  const resources = {
    Copper: makeGalaxyResource("Copper", { storageRatio: 1 }),
    Iron: makeGalaxyResource("Iron", { galaxyMarketPriority: 1, galaxyMarketWeighting: 1 }),
    Alloy: makeGalaxyResource("Alloy", { galaxyMarketPriority: 1, galaxyMarketWeighting: 3 }),
  };

  const result = context.planGalaxyMarketAssignments(offers, galaxyMarketContext(resources, { maxOperating: 4 }));

  assert.equal(result.Iron, 1, "galaxy market planner should reserve at least one freighter for lower weighted equal-priority offers");
  assert.equal(result.Alloy, 3, "galaxy market planner should distribute remaining freighters by weighting");
}

{
  const offers = [
    makeGalaxyOffer("Iron", "Copper"),
    makeGalaxyOffer("Alloy", "Copper"),
  ];
  const resources = {
    Copper: makeGalaxyResource("Copper", { storageRatio: 1 }),
    Iron: makeGalaxyResource("Iron", { galaxyMarketPriority: 1, galaxyMarketWeighting: 1, demanded: true }),
    Alloy: makeGalaxyResource("Alloy", { galaxyMarketPriority: 1, galaxyMarketWeighting: 3 }),
  };

  const result = context.planGalaxyMarketAssignments(offers, galaxyMarketContext(resources, { maxOperating: 4 }));

  assert.equal(result.Iron, 4, "demanded galaxy market resources should receive the priority boost");
  assert.equal(result.Alloy, 0, "lower-priority galaxy market offers should be explicitly planned to zero");
}

{
  const offers = [
    makeGalaxyOffer("Iron", "Copper"),
    makeGalaxyOffer("Alloy", "Titanium"),
  ];
  const resources = {
    Copper: makeGalaxyResource("Copper", { storageRatio: 0.2 }),
    Titanium: makeGalaxyResource("Titanium", { storageRatio: 1, demanded: true }),
    Iron: makeGalaxyResource("Iron", { galaxyMarketPriority: 1, galaxyMarketWeighting: 1 }),
    Alloy: makeGalaxyResource("Alloy", { galaxyMarketPriority: 1, galaxyMarketWeighting: 1 }),
  };

  const result = context.planGalaxyMarketAssignments(offers, galaxyMarketContext(resources, { maxOperating: 2 }));

  assert.equal(result.Iron, 0, "galaxy market planner should skip offers with ingredients below the minimum ratio");
  assert.equal(result.Alloy, 0, "galaxy market planner should skip offers that sell demanded resources");
}

{
  const sell = makeTradeResource("Iron", {
    autoTradeSellEnabled: true,
    storageRatio: 0.995,
    usefulRatio: 1.2,
    tradeSellPrice: 5,
    rateOfChange: 25,
    tradeRouteQuantity: 10,
  });
  const buy = makeTradeResource("Copper", {
    autoTradeBuyEnabled: true,
    storageRatio: 0.5,
    usefulRatio: 0.5,
    autoTradeWeighting: 1,
    autoTradePriority: 1,
    tradeBuyPrice: 10,
  });

  const result = context.planTradeRouteAssignments([sell, buy], tradeRouteContext([sell, buy], { maxRoutes: 4 }));

  assert.equal(result.requiredTradeRoutes.Iron, -2, "trade-route planner should fill export routes for excess resources");
  assert.equal(result.requiredTradeRoutes.Copper, 2, "trade-route planner should spend remaining routes on imports");
  assert.equal(result.currentMoneyPerSecond, 90, "trade-route planner should account for planned route income");
}

{
  const lowPriorityBuy = makeTradeResource("Copper", {
    autoTradeBuyEnabled: true,
    storageRatio: 0.5,
    autoTradeWeighting: 1,
    autoTradePriority: 1,
    tradeBuyPrice: 10,
  });

  const result = context.planTradeRouteAssignments([lowPriorityBuy], tradeRouteContext([lowPriorityBuy], {
    moneyDemanded: true,
    maxRoutes: 2,
  }));

  assert.equal(result.requiredTradeRoutes.Copper, 0, "trade-route planner should skip low-priority imports when money is demanded");
}

{
  const demandedBuy = makeTradeResource("Copper", {
    autoTradeBuyEnabled: true,
    storageRatio: 0.5,
    autoTradeWeighting: 1,
    autoTradePriority: 1,
    tradeBuyPrice: 50,
    demanded: true,
  });

  const result = context.planTradeRouteAssignments([demandedBuy], tradeRouteContext([demandedBuy], {
    moneyRateOfChange: 60,
    settings: { tradeRouteMinimumMoneyPerSecond: 100 },
  }));

  assert.equal(result.requiredTradeRoutes.Copper, 1, "demanded imports should ignore the configured minimum money income when money is not demanded");
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

function marketTradeContext(overrides = {}) {
  return {
    maxMultiplier: overrides.maxMultiplier ?? 100,
    minimumMoneyAllowed: overrides.minimumMoneyAllowed ?? 0,
    resources: {
      Money: {
        currentQuantity: overrides.moneyCurrentQuantity ?? 0,
        maxQuantity: overrides.moneyMaxQuantity ?? 1000,
        isDemanded: () => overrides.moneyDemanded ?? false,
      },
    },
    manager: {
      getUnitSellPrice: () => overrides.unitSellPrice ?? 1,
      getUnitBuyPrice: () => overrides.unitBuyPrice ?? 1,
    },
    ticksPerSecond: overrides.ticksPerSecond ?? (() => 1),
  };
}

function makeMarketResource(id, options = {}) {
  return {
    id,
    autoSellEnabled: options.autoSellEnabled ?? false,
    autoSellRatio: options.autoSellRatio ?? 1,
    autoBuyEnabled: options.autoBuyEnabled ?? false,
    autoBuyRatio: options.autoBuyRatio ?? 0,
    storageRatio: options.storageRatio ?? 0,
    currentQuantity: options.currentQuantity ?? 0,
    maxQuantity: options.maxQuantity ?? 100,
    income: options.income ?? 0,
  };
}

function galaxyMarketContext(resources, overrides = {}) {
  return {
    manager: {
      maxOperating: () => overrides.maxOperating ?? 1,
    },
    resources,
    settings: {
      marketMinIngredients: overrides.marketMinIngredients ?? 0.5,
    },
  };
}

function makeGalaxyOffer(buyResourceId, sellResourceId) {
  return {
    buy: { res: buyResourceId },
    sell: { res: sellResourceId },
  };
}

function makeGalaxyResource(id, options = {}) {
  return {
    id,
    storageRatio: options.storageRatio ?? 1,
    galaxyMarketPriority: options.galaxyMarketPriority ?? 0,
    galaxyMarketWeighting: options.galaxyMarketWeighting ?? 0,
    isDemanded: () => options.demanded ?? false,
    isUseful: () => options.useful ?? true,
  };
}

function tradeRouteContext(tradeResources, overrides = {}) {
  return {
    manager: {
      priorityList: tradeResources,
      getImportRouteCap: () => overrides.importCap ?? 2,
      getExportRouteCap: () => overrides.exportCap ?? 2,
      getMaxTradeRoutes: () => [overrides.maxRoutes ?? 1, overrides.unmanagedRoutes ?? 0],
    },
    settings: {
      tradeRouteSellExcess: false,
      tradeRouteMinimumMoneyPerSecond: 0,
      tradeRouteMinimumMoneyPercentage: 0,
      ...overrides.settings,
    },
    resources: {
      Money: makeTradeMoney(overrides),
      ...Object.fromEntries(tradeResources.map(resource => [resource.id, resource])),
    },
    game: { global: { race: overrides.race ?? {} } },
    governor: overrides.governor ?? "none",
  };
}

function makeTradeMoney(options = {}) {
  return {
    currentQuantity: options.moneyCurrentQuantity ?? 0,
    maxQuantity: options.moneyMaxQuantity ?? 1000,
    rateOfChange: options.moneyRateOfChange ?? 100,
    isDemanded: () => options.moneyDemanded ?? false,
  };
}

function makeTradeResource(id, options = {}) {
  return {
    id,
    tradeRoutes: options.tradeRoutes ?? 0,
    storageRatio: options.storageRatio ?? 0,
    usefulRatio: options.usefulRatio ?? options.storageRatio ?? 0,
    rateOfChange: options.rateOfChange ?? 0,
    tradeRouteQuantity: options.tradeRouteQuantity ?? 1,
    tradeSellPrice: options.tradeSellPrice ?? 1,
    tradeBuyPrice: options.tradeBuyPrice ?? 1,
    autoTradeBuyEnabled: options.autoTradeBuyEnabled ?? false,
    autoTradeSellEnabled: options.autoTradeSellEnabled ?? false,
    autoTradeWeighting: options.autoTradeWeighting ?? 0,
    autoTradePriority: options.autoTradePriority ?? 0,
    isRoutesUnlocked: () => options.routesUnlocked ?? true,
    isDemanded: () => options.demanded ?? false,
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
