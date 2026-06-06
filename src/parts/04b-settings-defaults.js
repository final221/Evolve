    function resetWarSettings(reset) {
        let def = {
            autoFight: false,
            foreignAttackLivingSoldiersPercent: 90,
            foreignAttackHealthySoldiersPercent: 90,
            foreignHireMercMoneyStoragePercent: 90,
            foreignHireMercCostLowerThanIncome: 1,
            foreignHireMercDeadSoldiers: 1,
            foreignMinAdvantage: 40,
            foreignMaxAdvantage: 80,
            foreignMaxSiegeBattalion: 10,
            foreignProtect: "auto",
            foreignPacifist: false,
            foreignUnification: true,
            foreignForceSabotage: true,
            foreignOccupyLast: true,
            foreignTrainSpy: true,
            foreignSpyMax: 2,
            foreignPowerRequired: 75,
            foreignPolicyInferior: "Annex",
            foreignPolicySuperior: "Sabotage",
            foreignPolicyRival: "Influence",
        }

        applySettings(def, reset);
    }

    function resetHellSettings(reset) {
        let def = {
            autoHell: false,
            hellHomeGarrison: 10,
            hellMinSoldiers: 20,
            hellMinSoldiersPercent: 90,
            hellAssaultReserve: true,
            hellTargetFortressDamage: 100,
            hellLowWallsMulti: 3,
            hellHandlePatrolSize: true,
            hellPatrolMinRating: 30,
            hellPatrolThreatPercent: 8,
            hellPatrolDroneMod: 5,
            hellPatrolDroidMod: 5,
            hellPatrolBootcampMod: 0,
            hellBolsterPatrolPercentTop: 50,
            hellBolsterPatrolPercentBottom: 20,
            hellBolsterPatrolRating: 300,
            hellAttractorTopThreat: 9000,
            hellAttractorBottomThreat: 6000,
            warlordHandleFortress: true,
            warlordMinimumMinions: 1000,
        }

        applySettings(def, reset);
    }

    function resetGeneralSettings(reset) {
        let def = {
            masterScriptToggle: true,
            showSettings: true,
            autoPrestige: false,
            tickRate: 4,
            tickSchedule: false,
            researchRequest: true,
            researchRequestSpace: false,
            missionRequest: true,
            useDemanded: true,
            prioritizeTriggers: "savereq",
            prioritizeQueue: "savereq",
            prioritizeUnify: "savereq",
            prioritizeOuterFleet: "ignore",
            buildingAlwaysClick: false,
            buildingClickPerTick: 50,
            activeTargetsUI: false,
            displayPrestigeTypeInTopBar: true,
            displayTotalDaysTypeInTopBar: false,
            scriptSettingsExportFilename: "evolve-script-settings.json",
            performanceHackAvoidDrawTech: false,
        }

        applySettings(def, reset);
    }

    function resetPrestigeSettings(reset) {
        let def = {
            prestigeType: "none",
            prestigeMADIgnoreArpa: true,
            prestigeMADWait: true,
            prestigeMADPopulation: 1,
            prestigeWaitAT: false,
            prestigeGECK: 0,
            prestigeBioseedConstruct: true,
            prestigeBioseedProbes: 3,
            prestigeWhiteholeSaveGems: true,
            prestigeWhiteholeMinMass: 8,
            prestigeAscensionPillar: true,
            prestigeDemonicFloor: 100,
            prestigeDemonicPotential: 0.6,
            prestigeDemonicBomb: false,
            prestigeVaxStrat: "none",
        }

        applySettings(def, reset);
    }

    function resetGovernmentSettings(reset) {
        let def = {
            autoTax: false,
            autoGovernment: false,
            generalRequestedTaxRate: -1,
            generalMinimumTaxRate: 20,
            generalMinimumMorale: 105,
            generalMaximumMorale: 500,
            govInterim: GovernmentManager.Types.democracy.id,
            govFinal: GovernmentManager.Types.technocracy.id,
            govSpace: GovernmentManager.Types.corpocracy.id,
            govGovernor: "none",
        }

        applySettings(def, reset);
    }

    function resetEvolutionSettings(reset) {
        let def = {
            autoEvolution: false,
            userUniverseTargetName: "none",
            userPlanetTargetName: "none",
            userEvolutionTarget: "auto",
            userEvolutionGenus: "fungi",
            evolutionQueue: [],
            evolutionQueueEnabled: false,
            evolutionQueueRepeat: false,
            evolutionAutoUnbound: true,
            evolutionBackup: false,
        }
        challenges.forEach(set => def["challenge_" + set[0].id] = false);

        applySettings(def, reset);
    }

    function resetResearchSettings(reset) {
        let def = {
            autoResearch: false,
            userResearchTheology_1: "auto",
            userResearchTheology_2: "auto",
            researchIgnore: ["tech-purify"],
        }

        applySettings(def, reset);
    }

    function resetMarketSettings(reset) {
        let schema = getMarketStorageSettingsSchema().market;
        MarketManager.priorityList = schema.priorityRows();
        let def = {};
        applySettingsSchemaDefaults(def, schema);

        applySettings(def, reset);
        MarketManager.sortByPriority();
    }

    function resetStorageSettings(reset) {
        let schema = getMarketStorageSettingsSchema().storage;
        StorageManager.priorityList = schema.priorityRows();
        let def = {};
        applySettingsSchemaDefaults(def, schema);

        applySettings(def, reset);
        StorageManager.sortByPriority();
    }

    function resetMinorTraitSettings(reset) {
        let schema = getJobTraitEjectorSettingsSchema().trait.minor;
        MinorTraitManager.priorityList = schema.priorityRows();
        let def = {};
        applySettingsSchemaDefaults(def, schema);

        applySettings(def, reset);
        MinorTraitManager.sortByPriority();
    }

    function resetMutableTraitSettings(reset) {
        let schema = getJobTraitEjectorSettingsSchema().trait.mutable;
        MutableTraitManager.priorityList = schema.priorityRows();
        let def = {};
        applySettingsSchemaDefaults(def, schema);

        applySettings(def, reset);
        MutableTraitManager.sortByPriority();
    }

    function resetJobSettings(reset) {
        let schema = getJobTraitEjectorSettingsSchema().job;
        JobManager.priorityList = schema.priorityRows();
        let def = {};
        applySettingsSchemaDefaults(def, schema);

        applySettings(def, reset);
        JobManager.sortByPriority();
    }

    function resetWeightingSettings(reset) {
        let def = {
            buildingBuildIfStorageFull: false,
            buildingWeightingNew: 3,
            buildingWeightingUselessPowerPlant: 0.01,
            buildingWeightingNeedfulPowerPlant: 3,
            buildingWeightingUnderpowered: 0.8,
            buildingWeightingUselessKnowledge: 0.01,
            buildingWeightingNeedfulKnowledge: 5,
            buildingWeightingMissingFuel: 10,
            buildingWeightingNonOperatingCity: 0.2,
            buildingWeightingNonOperating: 0,
            buildingWeightingMissingSupply: 0,
            buildingWeightingMissingSupport: 0,
            buildingWeightingUselessSupport: 0.01,
            buildingWeightingMADUseless: 0,
            buildingWeightingUnusedEjectors: 0.1,
            buildingWeightingCrateUseless: 0.01,
            buildingWeightingHorseshoeUseless: 0.1,
            buildingWeightingZenUseless: 0.01,
            buildingWeightingGateTurret: 0.01,
            buildingWeightingNeedStorage: 1,
            buildingWeightingUselessHousing: 1,
            buildingWeightingTemporal: 0.2,
            buildingWeightingSolar: 0.2,
            buildingWeightingOverlord: 0,
        }

        applySettings(def, reset);
    }

    function resetBuildingSettings(reset) {
        initBuildingState();
        let def = {};
        applySettingsSchemaDefaults(def, getBuildingProjectSettingsSchema().building);

        applySettings(def, reset);
        BuildingManager.sortByPriority();
    }

    function resetProjectSettings(reset) {
        let schema = getBuildingProjectSettingsSchema().project;
        ProjectManager.priorityList = schema.priorityRows();
        let def = {};
        applySettingsSchemaDefaults(def, schema);

        applySettings(def, reset);
        ProjectManager.sortByPriority();
    }

    function resetMagicSettings(reset) {
        AlchemyManager.priorityList = Object.values(resources).filter(r => AlchemyManager.transmuteTier(r) > 0);
        let def = {
            autoAlchemy: false,
            autoPylon: false,
            magicAlchemyManaUse: 0.5,
            productionRitualManaUse: 0.5,
            productionRitualSafe: true,
        }

        // Alchemy
        for (let i = 0; i < AlchemyManager.priorityList.length; i++) {
            let resource = AlchemyManager.priorityList[i];
            let id = resource.id;

            def['res_alchemy_' + id] = true; // resEnabled
            def['res_alchemy_w_' + id] = 0; // resWeighting
        }

        // Pylon
        for (let spell of Object.values(RitualManager.Productions)) {
            def['spell_w_' + spell.id] = 100; // weighting
        }
        def['spell_w_hunting'] = 10;
        def['spell_w_farmer'] = 1;

        applySettings(def, reset);
    }

    function resetProductionSettings(reset) {
        let def = {};
        applySettingsSchemaDefaults(def, getProductionSettingsSchema());

        applySettings(def, reset);
    }

    function resetTriggerSettings(reset) {
        let def = {
            autoTrigger: false
        }

        // Add default triggers only on reset, or first run, but not on casual update
        if (reset || !settingsRaw.hasOwnProperty("autoTrigger")) {
            TriggerManager.priorityList = [];
            TriggerManager.AddTrigger("BuildingCount", "space-moon_mission", 1, "build", "space-moon_base", 1);
            TriggerManager.AddTrigger("BuildingCount", "space-moon_base", 1, "build", "space-iridium_mine", 1);
            TriggerManager.AddTrigger("BuildingCount", "space-moon_base", 1, "build", "space-helium_mine", 1);
            settingsRaw.triggers = JSON.parse(JSON.stringify(TriggerManager.priorityList));
        }
        applySettings(def, reset);
    }

    function resetLoggingSettings(reset) {
        let def = {
            hellTurnOffLogMessages: true,
            logFilter: "",
            logEnabled: true,
        }
        Object.keys(GameLog.Types).forEach(id => def["log_" + id] = true);
        def["log_mercenary"] = false;
        def["log_multi_construction"] = false;
        def["log_prestige"] = false;
        def["log_prestige_format"] = "Reset: {resetType}, Species: {species}, Duration: {timeStamp} days";

        applySettings(def, reset);
    }

    function resetPlanetSettings(reset) {
        let def = {};
        biomeList.forEach(biome => def["biome_w_" + biome] = (planetBiomes.length - planetBiomes.indexOf(biome)) * 10);
        traitList.forEach(trait => def["trait_w_" + trait] = (planetTraits.length - planetTraits.indexOf(trait)) * 10);
        extraList.forEach(extra => def["extra_w_" + extra] = 0);
        def["extra_w_Achievement"] = 1000;

        applySettings(def, reset);
    }

    function resetFleetSettings(reset) {
        let def = {
            autoFleet: false,
            fleetOuterCrew: 30,
            fleetOuterShips: "custom",
            fleetExploreTau: true,
            fleetMaxCover: true,
            fleetEmbassyKnowledge: 6000000,
            fleetAlienGiftKnowledge: 6500000,
            fleetAlien2Knowledge: 8000000,
            fleetAlien2Loses: "none",
            fleetChthonianLoses: "low",

            // Default combat ship
            fleet_outer_class: 'destroyer',
            fleet_outer_armor: 'neutronium',
            fleet_outer_weapon: 'plasma',
            fleet_outer_engine: 'ion',
            fleet_outer_power: 'fission',
            fleet_outer_sensor: 'lidar',

            // Default scout ship
            fleet_scout_class: 'corvette',
            fleet_scout_armor: 'neutronium',
            fleet_scout_weapon: 'plasma',
            fleet_scout_engine: 'tie',
            fleet_scout_power: 'fusion',
            fleet_scout_sensor: 'quantum',

            // Default andromeda regions priority
            fleet_pr_gxy_stargate: 0,
            fleet_pr_gxy_alien2: 1,
            fleet_pr_gxy_alien1: 2,
            fleet_pr_gxy_chthonian: 3,
            fleet_pr_gxy_gateway: 4,
            fleet_pr_gxy_gorddon: 5,
        }

        const setOuterRegion = (id, weighting, protect, scouts) => {
            def['fleet_outer_pr_' + id] = weighting;
            def['fleet_outer_def_' + id] = protect;
            def['fleet_outer_sc_' + id] = scouts;
        };
        setOuterRegion("spc_moon", 1, 0.9, 0); // Iridium
        setOuterRegion("spc_red", 3, 0.9, 0); // Titanium
        setOuterRegion("spc_gas", 0, 0.9, 0); // Helium
        setOuterRegion("spc_gas_moon", 0, 0.9, 0); // Oil
        setOuterRegion("spc_belt", 1, 0.9, 0); // Iridium
        setOuterRegion("spc_titan", 5, 0.9, 1); // Adamantite
        setOuterRegion("spc_enceladus", 3, 0.9, 1); // Quantium
        setOuterRegion("spc_triton", 10, 0.95, 2); // Encrypted data
        setOuterRegion("spc_kuiper", 5, 0.9, 2); // Orichalcum
        setOuterRegion("spc_eris", 100, 0.01, 1); // Encrypted data

        applySettings(def, reset);
    }

    function resetMechSettings(reset) {
        let def = {
            autoMech: false,
            mechScrap: "mixed",
            mechScrapEfficiency: 1.5,
            mechCollectorValue: 0.5,
            mechBuild: "random",
            mechSize: "titan",
            mechSizeGravity: "auto",
            mechFillBay: true,
            mechScouts: 0.05,
            mechScoutsRebuild: false,
            mechMinSupply: 1000,
            mechMaxCollectors: 0.5,
            mechInfernalCollector: true,
            mechSpecial: "prefered",
            mechSaveSupplyRatio: 1,
            buildingMechsFirst: true,
            mechBaysFirst: true,
            mechWaygatePotential: 0.4,
        }

        applySettings(def, reset);
    }

    function resetEjectorSettings(reset) {
        let schema = getJobTraitEjectorSettingsSchema().ejector;
        schema.preparePriorityRows();
        let def = {};
        applySettingsSchemaDefaults(def, schema);

        applySettings(def, reset);
    }

