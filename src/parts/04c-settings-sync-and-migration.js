    function updateStateFromSettings() {
        TriggerManager.priorityList = [];
        settingsRaw.triggers.forEach(trigger => TriggerManager.AddTriggerFromSetting(trigger));
    }

    function updateSettingsFromState() {
        settingsRaw.triggers = JSON.parse(JSON.stringify(TriggerManager.priorityList));

        localStorage.setItem('settings', JSON.stringify(settingsRaw));
    }

    function applySettings(def, reset) {
        if (reset) {
            // There's no default overrides, just wipe them all on reset
            for (let key in def) {
                delete settingsRaw.overrides[key];
            }
            Object.assign(settingsRaw, def);
        } else {
            for (let key in def) {
                if (!settingsRaw.hasOwnProperty(key)) {
                    settingsRaw[key] = def[key];
                } else {
                    // Validate settings types, and fix if needed
                    if (typeof settingsRaw[key] === "string" && typeof def[key] === "number") {
                        settingsRaw[key] = Number(settingsRaw[key]);
                    }
                    if (typeof settingsRaw[key] === "number" && typeof def[key] === "string") {
                        settingsRaw[key] = String(settingsRaw[key]);
                    }
                }
            }
        }
    }

    function updateStandAloneSettings() {
        let def = {
            scriptName: "TMVictor",
            overrides: {},
            triggers: [],
        }
        settingsSections.forEach(id => def[id + "SettingsCollapsed"] = true);
        applySettings(def, false); // For non-overridable settings only

        // Pre-default migrate
        if (settingsRaw.hasOwnProperty("masterScriptToggle")) {
            if (!settingsRaw.hasOwnProperty("autoPrestige")) {
                settingsRaw.autoPrestige = true;
                ["job_b1_farmer", "job_b2_farmer", "job_b3_farmer", "job_b1_hunter", "job_b2_hunter", "job_b3_hunter"]
                  .forEach(id => delete settingsRaw[id]);
            }
            if (!settingsRaw.hasOwnProperty("buildingsLimitPowered")) {
                settingsRaw.buildingsLimitPowered = false;
            }
        }

        // Specific migrations that should only be executed once
        if (!settingsRaw.migrationVersion || settingsRaw.migrationVersion < 1) {
            // Moved upwards in default priority list, needs to be executed before resetting building settings
            // Settings may not exist yet here
            if (settingsRaw["bld_p_eden-bliss_den"] && settingsRaw["bld_p_eden-rectory"] && settingsRaw["bld_p_eden-encampment"] && settingsRaw["bld_p_eden-bliss_den"] < settingsRaw["bld_p_eden-rectory"]) {
                settingsRaw["bld_p_eden-rectory"] = settingsRaw["bld_p_eden-encampment"] + 1;
            }
            settingsRaw.migrationVersion = 1;
        }

        // Apply default settings
        resetEvolutionSettings(false);
        resetWarSettings(false);
        resetHellSettings(false);
        resetMechSettings(false);
        resetFleetSettings(false);
        resetGovernmentSettings(false);
        resetBuildingSettings(false);
        resetWeightingSettings(false);
        resetMarketSettings(false);
        resetResearchSettings(false);
        resetProjectSettings(false);
        resetJobSettings(false);
        resetMagicSettings(false);
        resetProductionSettings(false);
        resetStorageSettings(false);
        resetGeneralSettings(false);
        resetPrestigeSettings(false);
        resetEjectorSettings(false);
        resetPlanetSettings(false);
        resetLoggingSettings(false);
        resetTriggerSettings(false);
        resetMinorTraitSettings(false);
        resetMutableTraitSettings(false);

        // Validate overrides types, and fix if needed
        for (let key in settingsRaw.overrides) {
            for (let i = 0; i < settingsRaw.overrides[key].length; i++) {
                let override = settingsRaw.overrides[key][i];
                if (typeof settingsRaw[key] === "string" && typeof override.ret === "number") {
                    override.ret = String(override.ret);
                }
                if (typeof settingsRaw[key] === "number" && typeof override.ret === "string") {
                    override.ret = Number(override.ret);
                }
            }
        }
        // Migrate pre-overrides settings
        settingsRaw.triggers.forEach(t => {
            // Normalize manually-added boolean triggers to match UI
            if (t.requirementType == "Boolean" && t.requirementCount !== 1) {
                t.requirementId = t.requirementCount ? t.requirementId : !t.requirementId;
                t.requirementCount = 1;
            }
            // Migrate old trigger IDs
            if ((t.requirementType === "unlocked" || t.requirementType === "researched") && techIds["tech-" + t.requirementId]) {
                t.requirementId = "tech-" + t.requirementId;
            }
            if (t.actionType === "research" && techIds["tech-" + t.actionId]) {
                t.actionId = "tech-" + t.actionId;
            }
            // Migrate old trigger checks to overrides
            if (t.requirementType === "unlocked") {
                t.requirementType = "ResearchUnlocked";
                t.requirementCount = 1;
            }
            if (t.requirementType === "researched") {
                t.requirementType = "ResearchComplete";
                t.requirementCount = 1;
            }
            if (t.requirementType === "built") {
                t.requirementType = "BuildingCount";
            }
        });
        if (settingsRaw.hasOwnProperty("productionPrioritizeDemanded")) { // Replace checkbox with list
            settingsRaw.productionFoundryWeighting = settingsRaw.productionPrioritizeDemanded ? "demanded" : "none";
        }
        settingsRaw.challenge_plasmid = settingsRaw.challenge_mastery || settingsRaw.challenge_plasmid; // Merge challenge settings
        if (settingsRaw.hasOwnProperty("res_trade_buy_mtr_Food")) { // Reset default market settings for pre-rework configs
            MarketManager.priorityList.forEach(res => settingsRaw['res_trade_buy_' + res.id] = true);
        }
        if (settingsRaw.hasOwnProperty("arpa")) { // Move arpa from object to strings
            Object.entries(settingsRaw.arpa).forEach(([id, enabled]) => settingsRaw["arpa_" + id] = enabled);
        }
        // Remove deprecated pre-overrides settings
        ["buildingWeightingTriggerConflict", "researchAlienGift", "arpaBuildIfStorageFullCraftableMin", "arpaBuildIfStorageFullResourceMaxPercent", "arpaBuildIfStorageFull", "productionMoneyIfOnly", "autoAchievements", "autoChallenge", "autoMAD", "autoSpace", "autoSeeder", "foreignSpyManage", "foreignHireMercCostLowerThan", "userResearchUnification", "btl_Ambush", "btl_max_Ambush", "btl_Raid", "btl_max_Raid", "btl_Pillage", "btl_max_Pillage", "btl_Assault", "btl_max_Assault", "btl_Siege", "btl_max_Siege", "smelter_fuel_Oil", "smelter_fuel_Coal", "smelter_fuel_Lumber", "planetSettingsCollapser", "buildingManageSpire", "hellHandleAttractors", "researchFilter", "challenge_mastery", "hellCountGems", "productionPrioritizeDemanded", "fleetChthonianPower", "productionWaitMana", "arpa", "autoLogging"]
          .forEach(id => delete settingsRaw[id]);
        ["foreignAttack", "foreignOccupy", "foreignSpy", "foreignSpyMax", "foreignSpyOp"]
          .forEach(id => [0, 1, 2].forEach(index => delete settingsRaw[id + index]));
        ["res_storage_w_", "res_trade_buy_mtr_", "res_trade_sell_mps_"]
          .forEach(id => Object.values(resources).forEach(resource => delete settingsRaw[id + resource.id]));
        Object.values(projects).forEach(project => delete settingsRaw['arpa_ignore_money_' + project.id]);
        Object.values(buildings).filter(building => !building.isSwitchable()).forEach(building => delete settingsRaw['bld_s_' + building._vueBinding]);
        // Migrate post-overrides settings
        migrateSetting("prestigeWhiteholeEjectEnabled", "autoEject", (v) => v);
        migrateSetting("mechSaveSupply", "mechSaveSupplyRatio", (v) => v ? 1 : 0);
        migrateSetting("foreignProtectSoldiers", "foreignProtect", (v) => v ? "always" : "never");
        migrateSetting("prestigeWhiteholeEjectExcess", "ejectMode", (v) => v ? "mixed" : "cap");
        migrateSetting("hellHandlePatrolCount", "autoHell", (v) => v, true);
        migrateSetting("unificationRequest", "prioritizeUnify", (v) => v ? "savereq" : "ignore");
        migrateSetting("queueRequest", "prioritizeQueue", (v) => v ? "savereq" : "ignore");
        migrateSetting("triggerRequest", "prioritizeTriggers", (v) => v ? "savereq" : "ignore");
        migrateSetting("govManage", "autoGovernment", (v) => v);
        migrateSetting("storagePrioritizedOnly", "storageAssignPart", (v) => !v);
        migrateSetting("fleetScanEris", "fleet_outer_pr_spc_eris", (v) => v ? 100 : 0);
        migrateSetting("jobDisableCraftsmans", "productionCraftsmen", (v) => v ? "nocraft" : "always");
        migrateSetting("activeTriggerUI", "activeTargetsUI", (v) => v);
        migrateSetting("autoAssembleGene", "autoGenetics", (v) => v);
        // Handle ingame ID change
        migrateSetting("batportal-harbour", "batportal-harbor", (v) => v);
        migrateSetting("bld_p_portal-harbour", "bld_p_portal-harbor", (v) => v);
        migrateSetting("bld_s_portal-harbour", "bld_s_portal-harbor", (v) => v);
        migrateSetting("bld_s2_portal-harbour", "bld_s2_portal-harbor", (v) => v);
        migrateSetting("bld_m_portal-harbour", "bld_m_portal-harbor", (v) => v);
        migrateSetting("bld_w_portal-harbour", "bld_w_portal-harbor", (v) => v);
        // Migrate setting as override, in case if someone actualy use it
        if (settingsRaw.hasOwnProperty("genesAssembleGeneAlways")) {
            if (settingsRaw.overrides.genesAssembleGeneAlways) {
                settingsRaw.overrides.geneticsAssemble = settingsRaw.overrides.genesAssembleGeneAlways.concat(settingsRaw.overrides.geneticsAssemble ?? []);
            }
            if (!settingsRaw.genesAssembleGeneAlways) {
                settingsRaw.overrides.geneticsAssemble = settingsRaw.overrides.geneticsAssemble ?? [];
                settingsRaw.overrides.geneticsAssemble.push({"type1":"ResearchComplete","arg1":"tech-dna_sequencer","type2":"Boolean","arg2":true,"cmp":"==","ret":"none"});
            }
        }
        if (settingsRaw.hasOwnProperty("prestigeWhiteholeEjectAllCount") && settingsRaw.prestigeWhiteholeEjectAllCount <= 20) {
            settingsRaw.overrides.ejectMode = settingsRaw.overrides.ejectMode ?? [];
            settingsRaw.overrides.ejectMode.push({"type1":"BuildingCount","arg1":"interstellar-mass_ejector","type2":"Number","arg2":settingsRaw.prestigeWhiteholeEjectAllCount,"cmp":">=","ret":"all"});
        }
        if (settingsRaw.hasOwnProperty("prestigeAscensionSkipCustom") && !settings.prestigeAscensionSkipCustom) {
            settingsRaw.overrides.autoPrestige = settingsRaw.overrides.autoPrestige ?? [];
            settingsRaw.overrides.autoPrestige.push({"type1":"ResetType","arg1":"ascension","type2":"Boolean","arg2":true,"cmp":"==","ret":false});
        }
        // Garbage collection
        Object.values(crafter).forEach(job => { delete settingsRaw['job_p_' + job._originalId], delete settingsRaw['job_b1_' + job._originalId], delete settingsRaw['job_b2_' + job._originalId], delete settingsRaw['job_b3_' + job._originalId] });
        // Remove deprecated post-overrides settings
        ["res_containers_m_", "res_crates_m_"].forEach(id => Object.values(resources)
          .forEach(res => { delete settingsRaw[id + res.id], delete settingsRaw.overrides[id + res.id] }));
        ["prestigeWhiteholeEjectAllCount", "prestigeWhiteholeDecayRate", "genesAssembleGeneAlways", "buildingsConflictQueue", "buildingsConflictRQueue", "buildingsConflictPQueue", "fleet_outer_pr_spc_hell", "fleet_outer_pr_spc_dwarf", "prestigeEnabledBarracks", "bld_s2_city-garrison", "prestigeAscensionSkipCustom", "prestigeBioseedGECK", "tickTimeout", "minorTraitSettingsCollapsed", "fleetOuterMinSyndicate", "smelter_fuel_p_Star", "replicatorResource"]
          .forEach(id => { delete settingsRaw[id], delete settingsRaw.overrides[id] });
    }

    function migrateSetting(oldSetting, newSetting, mapCb, keepOldValue) {
        if (settingsRaw.hasOwnProperty(oldSetting)) {
            if (!keepOldValue) {
                settingsRaw[newSetting] = mapCb(settingsRaw[oldSetting]);
            }
            delete settingsRaw[oldSetting];
        }
        if (settingsRaw.overrides.hasOwnProperty(oldSetting)) {
            settingsRaw.overrides[oldSetting].forEach(o => o.ret = mapCb(o.ret));
            settingsRaw.overrides[newSetting] = (settingsRaw.overrides[newSetting] ?? []).concat(settingsRaw.overrides[oldSetting]);
            delete settingsRaw.overrides[oldSetting];
        }
    }

    function getStarLevel(context) {
        let a_level = 1;
        if (context.challenge_plasmid) { a_level++; }
        if (context.challenge_trade) { a_level++; }
        if (context.challenge_craft) { a_level++; }
        if (context.challenge_crispr) { a_level++; }
        return a_level;
    }

    function getAchievementStar(id, universe) {
        return game.global.stats.achieve[id]?.[poly.universeAffix(universe)] ?? 0;
    }

    function isAchievementUnlocked(id, level, universe) {
        return getAchievementStar(id, universe) >= level;
    }

    function loadQueuedSettings() {
        if (settings.evolutionQueueEnabled && settingsRaw.evolutionQueue.length > 0) {
            state.evolutionAttempts++;
            let queuedEvolution = settingsRaw.evolutionQueue.shift();
            for (let [settingName, settingValue] of Object.entries(queuedEvolution)) {
                if (typeof settingsRaw[settingName] === typeof settingValue) {
                    settingsRaw[settingName] = settingValue;
                } else {
                    GameLog.logDanger("special", `Type mismatch during loading queued settings: settingsRaw.${settingName} type: ${typeof settingsRaw[settingName]}, value: ${settingsRaw[settingName]}; queuedEvolution.${settingName} type: ${typeof settingValue}, value: ${settingValue};`, ['events', 'major_events']);
                }
            }
            updateOverrides();
            if (settings.evolutionQueueRepeat) {
                settingsRaw.evolutionQueue.push(queuedEvolution);
            }
            updateStandAloneSettings();
            updateStateFromSettings();
            updateSettingsFromState();
            if (settings.showSettings) {
                removeScriptSettings();
                buildScriptSettings();
            }
        }
    }

    function findRequiredResourceWeight(resource) {
        return state.unlockedBuildings.find(building => building.cost[resource.id] > resource.currentQuantity)?.weighting;
    }

