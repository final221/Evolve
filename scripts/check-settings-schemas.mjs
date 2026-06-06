import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const schemaSources = await Promise.all([
  "04a3-production-settings-schema.js",
  "04a4-market-storage-settings-schema.js",
  "04a5-building-project-settings-schema.js",
  "04a6-job-trait-ejector-settings-schema.js",
  "04a7-war-hell-fleet-settings-schema.js",
].map(file => readFile(path.join(root, "src", "parts", file), "utf8")));

const context = makeContext();
vm.createContext(context);
vm.runInContext(schemaSources.join("\n"), context, { filename: "settings-schema-sources.js" });

assert.equal(typeof context.applySettingsSchemaDefaults, "function", "applySettingsSchemaDefaults must be available");
assert.equal(typeof context.getProductionSettingsSchema, "function", "getProductionSettingsSchema must be available");
assert.equal(typeof context.getMagicSettingsSchema, "function", "getMagicSettingsSchema must be available");
assert.equal(typeof context.getMarketStorageSettingsSchema, "function", "getMarketStorageSettingsSchema must be available");
assert.equal(typeof context.getBuildingProjectSettingsSchema, "function", "getBuildingProjectSettingsSchema must be available");
assert.equal(typeof context.getJobTraitEjectorSettingsSchema, "function", "getJobTraitEjectorSettingsSchema must be available");
assert.equal(typeof context.getWarHellFleetSettingsSchema, "function", "getWarHellFleetSettingsSchema must be available");

checkProductionDefaults(context);
checkMagicDefaults(context);
checkMarketStorageDefaults(context);
checkBuildingProjectDefaults(context);
checkWeightingDefaults(context);
checkJobEjectorDefaults(context);
checkTraitDefaults(context);
checkFleetDefaults(context);

console.log("Settings schema regression checks passed");

function checkProductionDefaults(context) {
  const def = {};

  context.applySettingsSchemaDefaults(def, context.getProductionSettingsSchema());

  assert.equal(def.autoFactory, false, "factory automation should default off");
  assert.equal(def.productionFoundryWeighting, "demanded", "foundry weighting mode should default to demanded");
  assert.equal(def.productionCraftsmen, "nocraft", "craftsmen mode should keep the no-craft default");
  assert.equal(def.production_Nano_Tube, true, "Nano Tube factory production should default enabled");
  assert.equal(def.production_w_Nano_Tube, 4, "Nano Tube factory weighting should be preserved");
  assert.equal(def.production_p_Nano_Tube, 3, "Nano Tube factory priority should be preserved");
  assert.equal(def.droid_w_Uranium, 5, "Uranium mining droid weighting should be preserved");
  assert.equal(def.droid_pr_Uranium, -1, "Uranium mining droid fallback priority should be preserved");
  assert.equal(def.smelter_fuel_p_Coal, 0, "smelter fuels should default from manager order");
  assert.equal(def.smelter_fuel_p_Oil, 1, "smelter fuel order should assign consecutive priorities");
  assert.equal(def.replicator_Food, true, "replicator resources should default enabled");
  assert.equal(def.replicator_w_Nano_Tube, 1, "replicator weightings should default to one");
  assert.equal(def.replicator_p_Nano_Tube, 1, "replicator priorities should default to one");
}

function checkMagicDefaults(context) {
  const schema = context.getMagicSettingsSchema();
  const def = {};

  context.AlchemyManager.priorityList = schema.priorityRows();
  context.applySettingsSchemaDefaults(def, schema);

  assert.equal(def.autoAlchemy, false, "alchemy automation should default off");
  assert.equal(def.autoPylon, false, "pylon automation should default off");
  assert.equal(def.magicAlchemyManaUse, 0.5, "alchemy mana usage should default to half income");
  assert.equal(def.productionRitualManaUse, 0.5, "ritual mana usage should default to half income");
  assert.equal(def.productionRitualSafe, true, "safe rituals should default enabled");
  assert.equal(def.res_alchemy_Stone, true, "transmutable resources should default enabled");
  assert.equal(def.res_alchemy_w_Stone, 0, "alchemy weighting should default to zero");
  assert.equal(Object.hasOwn(def, "res_alchemy_Food"), false, "non-transmutable resources should be excluded");
  assert.equal(def.spell_w_hunting, 10, "hunting ritual weighting should keep the historical override");
  assert.equal(def.spell_w_farmer, 1, "farmer ritual weighting should keep the historical override");
  assert.equal(def.spell_w_knowledge, 100, "ordinary ritual weighting should default to 100");
}

function checkMarketStorageDefaults(context) {
  const schema = context.getMarketStorageSettingsSchema();
  const marketDef = {};
  const storageDef = {};

  context.MarketManager.priorityList = schema.market.priorityRows();
  context.StorageManager.priorityList = schema.storage.priorityRows();
  context.applySettingsSchemaDefaults(marketDef, schema.market);
  context.applySettingsSchemaDefaults(storageDef, schema.storage);

  assert.equal(marketDef.autoMarket, false, "market automation should default off");
  assert.equal(marketDef.autoGalaxyMarket, false, "galaxy market automation should default off");
  assert.equal(marketDef.tradeRouteSellExcess, true, "trade routes should default to selling excess");
  assert.equal(marketDef.buyFood, false, "manual market buys should default disabled");
  assert.equal(marketDef.sellFood, false, "manual market sells should default disabled");
  assert.equal(marketDef.res_buy_r_Food, 0.5, "manual buy ratio should be preserved");
  assert.equal(marketDef.res_sell_r_Food, 0.9, "manual sell ratio should be preserved");
  assert.equal(marketDef.res_trade_buy_Food, true, "trade route imports should default enabled");
  assert.equal(marketDef.res_trade_sell_Food, true, "trade route exports should default enabled");
  assert.equal(marketDef.res_trade_p_Food, 1, "Food trade route priority should use historical override");
  assert.equal(marketDef.res_trade_p_Crystal, -1, "Crystal trade route priority should remain fallback");
  assert.equal(marketDef.res_galaxy_w_Deuterium, 1, "galaxy market weightings should default to one");
  assert.equal(marketDef.res_galaxy_p_Deuterium, 1, "galaxy priorities should follow offer order");
  assert.equal(marketDef.res_galaxy_p_Cash, 2, "galaxy priorities should assign consecutive values");

  assert.equal(storageDef.autoStorage, false, "storage automation should default off");
  assert.equal(storageDef.storageLimitPreMad, true, "pre-MAD storage limiting should default enabled");
  assert.equal(storageDef.res_storageFood, true, "storage resources should default enabled");
  assert.equal(storageDef.res_storage_o_Food, false, "ordinary resources should not default to overflow storage");
  assert.equal(storageDef.res_storage_o_Orichalcum, true, "Orichalcum should default to overflow storage");
  assert.equal(storageDef.res_min_storeFood, 1, "minimum storage should default to one");
  assert.equal(storageDef.res_max_storeFood, -1, "maximum storage should default unlimited");
}

function checkBuildingProjectDefaults(context) {
  const schema = context.getBuildingProjectSettingsSchema();
  const buildingDef = {};
  const projectDef = {};

  context.applySettingsSchemaDefaults(buildingDef, schema.building);
  context.ProjectManager.priorityList = schema.project.priorityRows();
  context.applySettingsSchemaDefaults(projectDef, schema.project);

  assert.equal(buildingDef.autoBuild, false, "building automation should default off");
  assert.equal(buildingDef.autoPower, false, "power automation should default off");
  assert.equal(buildingDef.buildingsLimitPowered, true, "power limiting should default enabled");
  assert.equal(buildingDef["batcity-farm"], true, "ordinary buildings should default enabled for auto-build");
  assert.equal(buildingDef["bld_p_city-farm"], 0, "building priorities should follow manager order");
  assert.equal(buildingDef["bld_m_city-farm"], -1, "building max should default unlimited");
  assert.equal(buildingDef["bld_w_city-farm"], 100, "building weighting should default to 100");
  assert.equal(buildingDef["bld_s_city-farm"], true, "switchable buildings should default enabled for power handling");
  assert.equal(buildingDef["bld_s2_city-farm"], true, "smart buildings should default enabled for smart handling");
  assert.equal(Object.hasOwn(buildingDef, "bld_s_city-bank"), false, "non-switchable buildings should not get power toggles");
  assert.equal(buildingDef["bld_s2_space-iridium_mine"], false, "iridium mine smart power should stay disabled by default");
  assert.equal(buildingDef["bld_s2_space-helium_mine"], false, "helium mine smart power should stay disabled by default");
  assert.equal(buildingDef["batportal-neutron_citadel"], false, "known-problem buildings should default auto-build off");
  assert.equal(buildingDef["bld_m_city-forge_horseshoe"], 20, "horseshoe buildings should keep the historical max");
  assert.equal(buildingDef["bld_m_space-belt_elerium_ship"], 15, "belt ship buildings should keep the historical max");

  assert.equal(projectDef.autoARPA, false, "ARPA automation should default off");
  assert.equal(projectDef.arpaScaleWeighting, true, "ARPA scale weighting should default enabled");
  assert.equal(projectDef.arpa_launch_facility, true, "launch facility should default enabled");
  assert.equal(projectDef.arpa_p_launch_facility, 0, "ARPA project priorities should follow historical order");
  assert.equal(projectDef.arpa_w_supercollider, 5, "supercollider weighting should be preserved");
  assert.equal(projectDef.arpa_m_mana_syphon, 79, "mana syphon should keep the historical max");
  assert.equal(projectDef.arpa_mana_syphon, false, "mana syphon should default disabled");
}

function checkWeightingDefaults(context) {
  const def = {};

  context.applySettingsSchemaDefaults(def, context.getBuildingProjectSettingsSchema().weighting);

  assert.equal(def.buildingBuildIfStorageFull, false, "storage-full weighting bypass should default off");
  assert.equal(def.buildingWeightingNew, 3, "new building weighting should be preserved");
  assert.equal(def.buildingWeightingUnderpowered, 0.8, "underpowered weighting should be preserved");
  assert.equal(def.buildingWeightingNeedfulKnowledge, 5, "needed knowledge weighting should be preserved");
  assert.equal(def.buildingWeightingMissingFuel, 10, "missing fuel weighting should be preserved");
  assert.equal(def.buildingWeightingNeedStorage, 1, "needed storage weighting should be preserved");
  assert.equal(def.buildingWeightingOverlord, 0, "womling mission weighting should be preserved");
}

function checkJobEjectorDefaults(context) {
  const schema = context.getJobTraitEjectorSettingsSchema();
  const jobDef = {};
  const ejectorDef = {};

  context.JobManager.priorityList = schema.job.priorityRows();
  context.applySettingsSchemaDefaults(jobDef, schema.job);

  assert.equal(jobDef.autoJobs, false, "job automation should default off");
  assert.equal(jobDef.autoCraftsmen, false, "craftsmen automation should default off");
  assert.equal(jobDef.jobSetDefault, true, "default job assignment should stay enabled");
  assert.equal(jobDef.job_Farmer, true, "ordinary jobs should default enabled");
  assert.equal(jobDef.job_p_Colonist, 0, "job priorities should follow manager order");
  assert.equal(jobDef.job_p_Farmer, 4, "job priorities should assign consecutive manager order");
  assert.equal(jobDef.job_s_Farmer, true, "smart jobs should get smart defaults");
  assert.equal(Object.hasOwn(jobDef, "job_s_Crafting"), false, "non-smart jobs should not get smart defaults");
  assert.equal(jobDef.job_b1_Farmer, -1, "farmer first breakpoint should be preserved");
  assert.equal(jobDef.job_b1_Forager, 4, "forager first breakpoint should be preserved");
  assert.equal(jobDef.job_b2_Forager, 10, "forager second breakpoint should be preserved");
  assert.equal(jobDef.job_b3_Forager, 0, "forager weighted pass should be preserved");
  assert.equal(jobDef.job_b1_Banker, 3, "banker first breakpoint should be preserved");
  assert.equal(jobDef.job_b3_Unemployed, 0, "unemployed third breakpoint should be preserved");

  schema.ejector.preparePriorityRows();
  context.applySettingsSchemaDefaults(ejectorDef, schema.ejector);

  assert.equal(ejectorDef.autoEject, false, "ejector automation should default off");
  assert.equal(ejectorDef.autoSupply, false, "supply automation should default off");
  assert.equal(ejectorDef.autoNanite, false, "nanite automation should default off");
  assert.equal(ejectorDef.ejectMode, "cap", "eject mode should preserve capped default");
  assert.equal(ejectorDef.supplyMode, "mixed", "supply mode should preserve mixed default");
  assert.equal(ejectorDef.naniteMode, "full", "nanite mode should preserve full default");
  assert.equal(ejectorDef.res_ejectElerium, true, "Elerium should always default enabled for eject");
  assert.equal(ejectorDef.res_ejectInfernite, true, "Infernite should always default enabled for eject");
  assert.equal(ejectorDef.res_ejectFood, true, "tradable eject resources should default enabled");
  assert.equal(ejectorDef.res_supplyFood, true, "tradable supply resources should default enabled");
  assert.equal(ejectorDef.res_naniteFood, true, "tradable nanite resources should default enabled");
  assert.equal(ejectorDef.res_ejectSoul_Gem, false, "non-tradable eject resources should default disabled");
}

function checkTraitDefaults(context) {
  const schema = context.getJobTraitEjectorSettingsSchema();
  const minorDef = {};
  const mutableDef = {};

  context.MinorTraitManager.priorityList = schema.trait.minor.priorityRows();
  context.applySettingsSchemaDefaults(minorDef, schema.trait.minor);

  assert.equal(minorDef.autoMinorTrait, false, "minor trait automation should default off");
  assert.equal(minorDef.shifterGenus, "ignore", "genus mimic should default ignored");
  assert.equal(minorDef.imitateRace, "ignore", "race imitation should default ignored");
  assert.equal(minorDef.autoGenetics, false, "genetics automation should default off");
  assert.equal(minorDef.geneticsAssemble, "auto", "gene assembly should keep automatic default");
  assert.equal(minorDef.mTrait_mastery, true, "mastery minor trait should default enabled");
  assert.equal(minorDef.mTrait_p_mastery, 0, "minor trait priorities should follow manager order");
  assert.equal(minorDef.mTrait_w_mastery, 1, "minor trait weighting should default to one");
  assert.equal(minorDef.ocularPower_capture, true, "ocular powers should default enabled");
  assert.equal(minorDef.ocularPower_p_capture, 100, "ocular power priority should default to 100");

  context.MutableTraitManager.priorityList = schema.trait.mutable.priorityRows();
  context.applySettingsSchemaDefaults(mutableDef, schema.trait.mutable);

  assert.equal(mutableDef.autoMutateTraits, false, "mutable trait automation should default off");
  assert.equal(mutableDef.doNotGoBelowPlasmidSoftcap, true, "plasmid softcap protection should default enabled");
  assert.equal(mutableDef.minimumPlasmidsToPreserve, 0, "minimum preserved plasmids should default zero");
  assert.equal(mutableDef.mutableTrait_p_strong, 0, "mutable trait priorities should follow sorted manager order");
  assert.equal(mutableDef.mutableTrait_purge_strong, false, "mutable trait purge should default disabled");
  assert.equal(mutableDef.mutableTrait_gain_strong, false, "gainable major traits should get disabled gain default");
  assert.equal(mutableDef.mutableTrait_reset_weak, false, "negative-roll traits should get disabled reset default");
  assert.equal(Object.hasOwn(mutableDef, "mutableTrait_gain_herbivore"), false, "genus traits should not get gain defaults");
  assert.equal(Object.hasOwn(mutableDef, "mutableTrait_p_xenophobic"), false, "unobtainable traits should be excluded");
}

function checkFleetDefaults(context) {
  const def = {};

  context.applySettingsSchemaDefaults(def, context.getWarHellFleetSettingsSchema().fleet);

  assert.equal(def.autoFleet, false, "fleet automation should default off");
  assert.equal(def.fleetOuterShips, "custom", "outer fleet ship mode should default to presets");
  assert.equal(def.fleetOuterCrew, 30, "outer fleet crew reserve should be preserved");
  assert.equal(def.fleetMaxCover, true, "Andromeda max cover should default enabled");
  assert.equal(def.fleetAlien2Loses, "none", "Alien 2 assault should default to no losses");
  assert.equal(def.fleetChthonianLoses, "low", "Chthonian assault should default to low losses");
  assert.equal(def.fleet_outer_class, "destroyer", "combat ship class preset should be preserved");
  assert.equal(def.fleet_outer_power, "fission", "combat ship power preset should be preserved");
  assert.equal(def.fleet_scout_class, "corvette", "scout ship class preset should be preserved");
  assert.equal(def.fleet_scout_sensor, "quantum", "scout ship sensor preset should be preserved");
  assert.equal(def.fleet_pr_gxy_stargate, 0, "Andromeda priorities should preserve Stargate first");
  assert.equal(def.fleet_pr_gxy_gorddon, 5, "Andromeda priorities should preserve Gorddon last");
  assert.equal(def.fleet_outer_pr_spc_moon, 1, "outer moon weighting should be preserved");
  assert.equal(def.fleet_outer_pr_spc_eris, 100, "outer Eris weighting should be preserved");
  assert.equal(def.fleet_outer_def_spc_triton, 0.95, "outer Triton defense should be preserved");
  assert.equal(def.fleet_outer_sc_spc_kuiper, 2, "outer Kuiper scout count should be preserved");
}

function makeContext() {
  const resources = Object.fromEntries([
    "Food",
    "Helium_3",
    "Uranium",
    "Oil",
    "Coal",
    "Stone",
    "Chrysotile",
    "Lumber",
    "Aluminium",
    "Iron",
    "Copper",
    "Furs",
    "Cement",
    "Steel",
    "Titanium",
    "Polymer",
    "Alloy",
    "Iridium",
    "Crystal",
    "Deuterium",
    "Cash",
    "Orichalcum",
    "Vitreloy",
    "Bolognium",
    "Plywood",
    "Brick",
    "Wrought_Iron",
    "Sheet_Metal",
    "Mythril",
    "Aerogel",
    "Nanoweave",
    "Scarletite",
    "Quantium",
    "LuxuryGoods",
    "Nano_Tube",
    "Stanene",
    "Adamantite",
    "Mana",
  ].map(id => [id, makeResource(id)]));

  const traits = {
    mastery: { type: "minor", val: 1 },
    fortify: { type: "minor", val: 1 },
    sneaky: { type: "minor", val: 1 },
    strong: { type: "major", val: 2 },
    weak: { type: "major", val: -2 },
    herbivore: { type: "genus", val: 1 },
    xenophobic: { type: "major", val: -5 },
  };
  const MinorTrait = function(traitName) {
    this.traitName = traitName;
  };
  const MajorTrait = function(traitName) {
    this.traitName = traitName;
    this.baseCost = Math.abs(traits[traitName].val);
    this.isPositive = traits[traitName].val >= 0;
    this.type = "major";
    this.source = "human";
    this.genus = "humanoid";
    this.name = `trait_${traitName}_name`;
  };
  MajorTrait.prototype.isGainable = function() {
    return this.traitName !== "frail" && this.traitName !== "ooze";
  };
  const GenusTrait = function(traitName) {
    this.traitName = traitName;
    this.baseCost = Math.abs(traits[traitName].val);
    this.isPositive = traits[traitName].val >= 0;
    this.type = "genus";
    this.source = "humanoid";
    this.genus = "humanoid";
    this.name = `trait_${traitName}_name`;
  };
  GenusTrait.prototype.isGainable = function() {
    return false;
  };

  const buildings = Object.fromEntries([
    ["Farm", makeBuilding("city-farm", { name: "Farm", switchable: true, smart: true })],
    ["Bank", makeBuilding("city-bank", { name: "Bank", switchable: false, smart: false })],
    ["SpaceIridiumMine", makeBuilding("space-iridium_mine", { tab: "space", switchable: true, smart: true })],
    ["SpaceHeliumMine", makeBuilding("space-helium_mine", { tab: "space", switchable: true, smart: true })],
    ["RedVrCenter", makeBuilding("space-red_vr_center", { tab: "space" })],
    ["NeutronCitadel", makeBuilding("portal-neutron_citadel", { tab: "portal" })],
    ["PortalWarDroid", makeBuilding("portal-war_droid", { tab: "portal" })],
    ["BadlandsPredatorDrone", makeBuilding("eden-predator_drone", { tab: "eden" })],
    ["PortalRepairDroid", makeBuilding("portal-repair_droid", { tab: "portal" })],
    ["SpireWaygate", makeBuilding("portal-spire_waygate", { tab: "portal" })],
    ["TauRedContact", makeBuilding("tauceti-red_contact", { tab: "tauceti" })],
    ["TauRedIntroduce", makeBuilding("tauceti-red_introduce", { tab: "tauceti" })],
    ["TauRedSubjugate", makeBuilding("tauceti-red_subjugate", { tab: "tauceti" })],
    ["ForgeHorseshoe", makeBuilding("city-forge_horseshoe")],
    ["RedForgeHorseshoe", makeBuilding("space-red_forge_horseshoe", { tab: "space" })],
    ["TauForgeHorseshoe", makeBuilding("tauceti-forge_horseshoe", { tab: "tauceti" })],
    ["BeltEleriumShip", makeBuilding("space-belt_elerium_ship", { tab: "space" })],
    ["BeltIridiumShip", makeBuilding("space-belt_iridium_ship", { tab: "space" })],
    ...Array.from({ length: 8 }, (_, index) => [`TauGasName${index + 1}`, makeBuilding(`tauceti-gas_name_${index + 1}`, { tab: "tauceti" })]),
    ...Array.from({ length: 8 }, (_, index) => [`TauGas2Name${index + 1}`, makeBuilding(`tauceti-gas2_name_${index + 1}`, { tab: "tauceti" })]),
  ]);

  const projects = {
    LaunchFacility: makeProject("launch_facility", "Launch Facility"),
    SuperCollider: makeProject("supercollider", "Super Collider"),
    StockExchange: makeProject("stock_exchange", "Stock Exchange"),
    Monument: makeProject("monument", "Monument"),
    Railway: makeProject("railway", "Railway"),
    Nexus: makeProject("nexus", "Nexus"),
    RoidEject: makeProject("roid_eject", "Roid Eject"),
    ManaSyphon: makeProject("mana_syphon", "Mana Syphon"),
    Depot: makeProject("depot", "Depot"),
  };

  const jobs = {
    Colonist: makeJob("Colonist"),
    Teamster: makeJob("Teamster"),
    Meditator: makeJob("Meditator"),
    Hunter: makeJob("Hunter"),
    Farmer: makeJob("Farmer", { smart: true }),
    Forager: makeJob("Forager", { split: true }),
    Lumberjack: makeJob("Lumberjack", { split: true }),
    QuarryWorker: makeJob("QuarryWorker", { split: true }),
    CrystalMiner: makeJob("CrystalMiner", { split: true }),
    Scavenger: makeJob("Scavenger", { split: true }),
    TitanColonist: makeJob("TitanColonist"),
    PitMiner: makeJob("PitMiner"),
    Miner: makeJob("Miner"),
    CoalMiner: makeJob("CoalMiner"),
    CementWorker: makeJob("CementWorker"),
    Professor: makeJob("Professor"),
    Scientist: makeJob("Scientist"),
    Entertainer: makeJob("Entertainer"),
    HellSurveyor: makeJob("HellSurveyor"),
    SpaceMiner: makeJob("SpaceMiner"),
    Torturer: makeJob("Torturer"),
    Archaeologist: makeJob("Archaeologist"),
    GhostTrapper: makeJob("GhostTrapper"),
    ElysiumMiner: makeJob("ElysiumMiner"),
    Banker: makeJob("Banker"),
    Priest: makeJob("Priest"),
    Unemployed: makeJob("Unemployed"),
    Crafting: makeJob("Crafting"),
  };

  resources.Elerium = makeResource("Elerium", { atomicMass: 100 });
  resources.Infernite = makeResource("Infernite", { atomicMass: 90 });
  resources.Soul_Gem = makeResource("Soul_Gem", { atomicMass: 75, tradable: false });

  const factoryProductions = {
    LuxuryGoods: makeProduction(resources.LuxuryGoods),
    Furs: makeProduction(resources.Furs),
    Alloy: makeProduction(resources.Alloy),
    Polymer: makeProduction(resources.Polymer),
    NanoTube: makeProduction(resources.Nano_Tube),
    Stanene: makeProduction(resources.Stanene),
  };

  const droidProductions = {
    Adamantite: makeProduction(resources.Adamantite),
    Aluminium: makeProduction(resources.Aluminium),
    Uranium: makeProduction(resources.Uranium),
    Coal: makeProduction(resources.Coal),
  };

  return {
    $: () => {
      throw new Error("rendering is not exercised by this schema regression test");
    },
    resources,
    buildings,
    projects,
    jobs,
    MinorTrait,
    MajorTrait,
    GenusTrait,
    MinorTraitManager: { priorityList: [], sortByPriority: () => {} },
    MutableTraitManager: { priorityList: [], sortByPriority: () => {} },
    ocularPowerData: [
      { id: "capture" },
      { id: "boost" },
    ],
    craftablesList: [],
    sorterHelper: () => {},
    buildTableLabel: value => value,
    addTableToggle: () => {},
    addTableInput: () => {},
    updateSettingsFromState: () => {},
    initBuildingState: () => {},
    updateBuildingSettingsContent: () => {},
    buildAllBuildingEnabledSettingsToggle: () => "",
    buildAllBuildingStateSettingsToggle: () => "",
    buildBuildingStateSettingsToggle: () => {},
    confirm: () => false,
    settingsRaw: {},
    SmelterManager: {
      Fuels: {
        Coal: { id: "Coal" },
        Oil: { id: "Oil" },
      },
      managedFuelPriorityList: () => [],
    },
    FactoryManager: { Productions: factoryProductions },
    DroidManager: { Productions: droidProductions },
    AlchemyManager: {
      priorityList: [],
      transmuteTier: resource => ({ Stone: 1, Crystal: 2 }[resource.id] ?? 0),
    },
    RitualManager: {
      Productions: {
        hunting: { id: "hunting" },
        farmer: { id: "farmer" },
        knowledge: { id: "knowledge" },
      },
    },
    ReplicatorManager: {
      Productions: {
        Food: makeProduction(resources.Food),
        NanoTube: makeProduction(resources.Nano_Tube),
      },
    },
    MarketManager: { priorityList: [] },
    StorageManager: { priorityList: [] },
    BuildingManager: {
      priorityList: [
        buildings.Farm,
        buildings.Bank,
        buildings.SpaceIridiumMine,
        buildings.SpaceHeliumMine,
        buildings.NeutronCitadel,
      ],
    },
    ProjectManager: { priorityList: [] },
    JobManager: { priorityList: [], sortByPriority: () => {} },
    FleetManagerOuter: {
      Regions: ["spc_moon", "spc_eris"],
      ShipConfig: {},
    },
    galaxyRegions: ["gxy_stargate", "gxy_gorddon"],
    EjectManager: {
      priorityList: [],
      isConsumable: resource => ["Food", "Elerium", "Infernite", "Soul_Gem"].includes(resource.id),
    },
    SupplyManager: {
      priorityList: [],
      isConsumable: resource => ["Food", "Soul_Gem"].includes(resource.id),
      supplyIn: id => ({ Food: 10, Soul_Gem: 50 }[id] ?? 0),
      supplyOut: id => ({ Food: 1, Soul_Gem: 5 }[id] ?? 0),
    },
    NaniteManager: {
      priorityList: [],
      isConsumable: resource => ["Food"].includes(resource.id),
    },
    game: {
      traits,
      races: {
        custom: { type: "custom", traits: {} },
        human: { type: "humanoid", traits: { strong: 1, weak: -1 } },
      },
      global: { race: { universe: "standard" } },
      actions: {
        space: {
          spc_moon: { info: { name: "Moon" } },
          spc_eris: { info: { name: "Eris" } },
        },
        galaxy: {
          gxy_stargate: { info: { name: "Stargate" } },
          gxy_gorddon: { info: { name: "Gorddon" } },
        },
      },
      loc: id => id,
    },
    specialRaceTraits: {},
    mutationCostMultipliers: { custom: { gain: 1 } },
    mutationCostMultipliersGenus: {},
    poly: {
      genus_traits: { humanoid: { herbivore: 1 } },
      neg_roll_traits: ["weak"],
      galaxyOffers: [
        { buy: { res: "Deuterium" }, sell: { res: "Food" } },
        { buy: { res: "Cash" }, sell: { res: "Coal" } },
      ],
    },
  };
}

function makeResource(id, options = {}) {
  return {
    id,
    name: id.replaceAll("_", " "),
    atomicMass: options.atomicMass ?? 1,
    is: { tradable: options.tradable ?? true },
    hasStorage: () => true,
    isCraftable: () => options.craftable ?? false,
  };
}

function makeProduction(resource) {
  return {
    id: resource.id,
    resource,
  };
}

function makeBuilding(vueBinding, options = {}) {
  return {
    id: vueBinding,
    name: options.name ?? vueBinding,
    _vueBinding: vueBinding,
    _tab: options.tab ?? "city",
    is: { smart: options.smart ?? false },
    isSwitchable: () => options.switchable ?? false,
  };
}

function makeProject(id, name) {
  return { id, name };
}

function makeJob(id, options = {}) {
  return {
    _originalId: id,
    _originalName: id,
    is: {
      smart: options.smart ?? false,
      split: options.split ?? false,
    },
  };
}
