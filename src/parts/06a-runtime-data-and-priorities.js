    function updateScriptData() {
        WarManager.updateGarrison();
        WarManager.updateHell();
        for (let id in resources) {
            resources[id].updateData();
        }
        updateCraftCost();
        MarketManager.updateData();
        BuildingManager.updateBuildings();

        // Parse global production modifiers
        state.globalProductionModifier = 1;
        for (let mod of Object.values(game.breakdown.p.Global ?? {})) {
            state.globalProductionModifier *= 1 + (parseFloat(mod) || 0) / 100;
        }
    }

    function finalizeScriptData() {
        SpyManager.updateForeigns();
        for (let id in resources) {
            resources[id].finalizeData();
        }
        EjectManager.updateResources();
        SupplyManager.updateResources();
        NaniteManager.updateResources();

        // Money is special. They aren't defined as tradable, but still affected by trades
        if (settings.autoMarket) {
            let tradeDiff = game.breakdown.p.consume["Money"]?.Trade || 0;
            if (tradeDiff > 0) {
                resources.Money.rateMods['buy'] = tradeDiff * -1;
            } else if (tradeDiff < 0) {
                resources.Money.rateMods['sell'] = tradeDiff * -1;
                resources.Money.rateOfChange += resources.Money.rateMods['sell'];
            }
        }
        if (settings.autoPylon && RitualManager.initIndustry()) {
            Object.values(RitualManager.Productions)
              .filter(spell => spell.isUnlocked())
              .forEach(spell => resources.Mana.rateOfChange += RitualManager.spellCost(spell));
        }

        // Add clicking to rate of change, so we can sell or eject it.
        if (settings.buildingAlwaysClick || (settings.autoBuild && (resources.Population.currentQuantity <= 15 || (buildings.RockQuarry.count < 1 && !game.global.race['sappy'])))) {
            let resPerClick = getResourcesPerClick() * ticksPerSecond();
            let conjureMod = haveTech("conjuring", 2) ? 10 : 1;
            if (buildings.Food.isClickable() && !game.global.race['fasting']) {
                resources.Food.rateOfChange += resPerClick * settings.buildingClickPerTick * conjureMod;
            }
            if (buildings.Lumber.isClickable()) {
                resources.Lumber.rateOfChange += resPerClick * settings.buildingClickPerTick  * conjureMod;
            }
            if (buildings.Stone.isClickable()) {
                resources.Stone.rateOfChange += resPerClick * settings.buildingClickPerTick  * conjureMod;
            }
            if (buildings.Chrysotile.isClickable()) {
                resources.Chrysotile.rateOfChange += resPerClick * settings.buildingClickPerTick  * conjureMod;
            }
            if (buildings.Slaughter.isClickable()){
                resources.Lumber.rateOfChange += resPerClick * settings.buildingClickPerTick;
                if (game.global.race['soul_eater'] && haveTech("primitive", 2)){
                    resources.Food.rateOfChange += resPerClick * settings.buildingClickPerTick;
                }
                if (resources.Furs.isUnlocked()) {
                    resources.Furs.rateOfChange += resPerClick * settings.buildingClickPerTick;
                }
            }
        }
    }

    function requestStorageFor(list) {
        // Required amount increased by 3% from actual numbers, as other logic of script can and will try to prevent overflowing by selling\ejecting\building projects, and that might cause an issues if we'd need 100% of storage
        let bufferMult = settings.storageAssignExtra ? 1.03 : 1;
        listLoop:
        for (let i = 0; i < list.length; i++) {
            let obj = list[i];
            let storageSuffient = true;
            for (let res in obj.cost) {
                resources[res].maxCost = Math.max(obj.cost[res], resources[res].maxCost);
                if (resources[res].maxQuantity < obj.cost[res] && !resources[res].hasStorage()) {
                    storageSuffient = false;
                }
            }
            if (!storageSuffient) {
                continue listLoop;
            }
            for (let res in obj.cost) {
                let assumeCost = obj.cost[res] * bufferMult;
                if (resources[res].maxQuantity < assumeCost && !resources[res].hasStorage()) {
                    assumeCost = (obj.cost[res] + resources[res].maxQuantity) / 2;
                }
                resources[res].storageRequired = Math.max(assumeCost, resources[res].storageRequired);
            }
        }
    }

    function calculateRequiredStorages() {
        // We need to preserve amount of knowledge required by techs only, while amount still not polluted
        // by buildings - wardenclyffe, labs, etc. This way we can determine what's our real demand is.
        // Otherwise they might start build up knowledge cap just to afford themselves, increasing required
        // cap further, so we'll need more labs, and they'll demand even more knowledge for next level and so on.
        state.knowledgeRequiredByTechs = Math.max(0, ...state.unlockedTechs.map(tech => tech.cost["Knowledge"] ?? 0));

        if (buildings.GorddonEmbassy.isAutoBuildable()) {
            state.knowledgeRequiredByTechs = Math.max(state.knowledgeRequiredByTechs, settings.fleetEmbassyKnowledge);
        }

        // Get list of all objects and techs, and find biggest numbers for each resource
        if (settings.autoFleet && FleetManagerOuter.nextShipExpandable && settings.prioritizeOuterFleet !== "ignore") {
            requestStorageFor([{cost: FleetManagerOuter.nextShipCost}]);
        }
        requestStorageFor(state.unlockedTechs);
        requestStorageFor(state.queuedTargetsAll);
        requestStorageFor(BuildingManager.priorityList.filter((b) => b.isUnlocked() && b.autoBuildEnabled));
        requestStorageFor(ProjectManager.priorityList.filter((p) => p.isUnlocked() && p.autoBuildEnabled));

        // Increase storage for sellable resources, to make sure we'll have required amount before they'll be sold
        if (settings.storageAssignExtra && !game.global.race['no_trade'] && settings.autoMarket) {
            for (let id in resources) {
                if (resources[id].autoSellEnabled && resources[id].autoSellRatio > 0) {
                    resources[id].storageRequired /= resources[id].autoSellRatio;
                }
            }
        }
    }

    function prioritizeDemandedResources() {
        let prioritizedTasks = [];
        // Building and research queues
        if (settings.prioritizeQueue.includes("req")) {
            prioritizedTasks.push(...state.queuedTargets);
        }
        // Active triggers
        if (settings.prioritizeTriggers.includes("req")) {
            prioritizedTasks.push(...state.triggerTargets);
        }
        // Unlocked missions
        if (settings.missionRequest) {
            for (let i = state.missionBuildingList.length - 1; i >= 0; i--) {
                let mission = state.missionBuildingList[i];
                if (mission.isUnlocked() && mission.autoBuildEnabled && (mission !== buildings.BlackholeJumpShip || !settings.prestigeBioseedConstruct || settings.prestigeType !== "whitehole")) {
                    prioritizedTasks.push(mission);
                } else if (mission.isComplete()) { // Mission finished, remove it from list
                    state.missionBuildingList.splice(i, 1);
                }
            }
        }

        // Unlocked and affordable techs, but only if we don't have anything more important
        if (prioritizedTasks.length === 0 && (isEarlyGame() ? settings.researchRequest : settings.researchRequestSpace)) {
            prioritizedTasks = state.unlockedTechs.filter(t => t.isAffordable(true));
        }

        if (prioritizedTasks.length > 0) {
            for (let i = 0; i < prioritizedTasks.length; i++){
                let demandedObject = prioritizedTasks[i];
                for (let res in demandedObject.cost) {
                    let resource = resources[res];
                    let quantity = demandedObject.cost[res];
                    // Double request for project, to make it smoother
                    if (demandedObject instanceof Project && demandedObject.progress < 99) {
                        quantity *= 2;
                    }
                    resource.requestQuantity(quantity);
                }
            }
        }

        // Request money for unification
        if (SpyManager.purchaseMoney && settings.prioritizeUnify.includes("req")) {
            resources.Money.requestQuantity(SpyManager.purchaseMoney);
        }

        if (settings.autoFleet && FleetManagerOuter.nextShipAffordable && settings.prioritizeOuterFleet.includes("req")) {
            for (let res in FleetManagerOuter.nextShipCost) {
                let resource = resources[res];
                resource.requestQuantity(FleetManagerOuter.nextShipCost[res]);
            }
        }

        // Prioritize material for craftables (doesn't use ResourceProductionCost)
        let availableCrafters = JobManager.craftingMax() + JobManager.skilledServantsMax();
        for (let id in crafter) {
            let resource = crafter[id].resource;
            if ((settings.productionFactoryFocusMaterials || resource.isDemanded()) && resource.isUnlocked()) {
                // Only craftables stores their cost, no need for additional checks
                for (let res in resource.cost) {
                    let material = resources[res];
                    // Add craftPreserve, plus minimum consumption:
                    // Craftsmen use 1/140 of game's given cost base per tick, before Crafty
                    // Demand 120s worth of production if we were to put all crafters on this resource (effectively 60s with Crafty)
                    let minExpected = (material.maxQuantity * resource.craftPreserve) + (availableCrafters * (1/140) * CONSUMPTION_BALANCE_TARGET * resource.cost[res]);
                    material.requestQuantity(minExpected);
                }
            }
        }

        // Prioritize an array of materials. Multiplier should include CONSUMPTION_BALANCE_TARGET
        /** @param {ResourceProductionCost|ResourceProductionCost[]} costs */
        const prioritizeCosts = (costs, multiplier = 1, storageThreshold = 0) => {
            if (!Array.isArray(costs)) { costs = [costs]; }
            costs.forEach((cost) => {
                let req = (cost.quantity * multiplier) + (cost?.minRateOfChange??0) + (storageThreshold * cost.resource.maxQuantity);
                cost.resource.requestQuantity(req);
            });
        };

        // For every Vit plant we'd like to power, prioritize 120s of Stanene (100/s)
        let vitPlantCount = (settings.autoPower && buildings.Alien1VitreloyPlant.autoStateEnabled) ? buildings.Alien1VitreloyPlant.count : buildings.Alien1VitreloyPlant.stateOnCount;
        if (vitPlantCount > 0) {
            resources.Stanene.requestQuantity(vitPlantCount * CONSUMPTION_BALANCE_TARGET * 100);
        }

        // For every enabled and unlocked Factory product, if the product is demanded, demand 120s of its materials,
        // assuming every factory is producing it.
        const factoryCount = FactoryManager.maxOperating();
        if (factoryCount > 0) {
            Object.values(FactoryManager.Productions).forEach(prod => {
                if ((settings.productionFactoryFocusMaterials || prod.resource.isDemanded()) && prod.unlocked && prod.enabled && prod.weighting) {
                    prioritizeCosts(prod.cost, factoryCount * CONSUMPTION_BALANCE_TARGET, settings.productionFactoryMinIngredients);
                }
            });
        }
    }

    function checkAffordableCustom(cost, max = false) {
        let check = max ? "maxQuantity" : "currentQuantity";
        for (let res in cost) {
            if (!resources[res] || resources[res][check] < cost[res]) {
                return false;
            }
        }
        return true;
    }

    function getQueuedItemObj(queueItem) {
        // id, name: used by active targets UI
        // title: used in conflict targets
        // cost, isAffordable: used by priority targets check below
        if (queueItem.action === "tp-ship") {
            return {
                id: queueItem.id,
                name: queueItem.label,
                title: queueItem.label,
                cost: poly.shipCosts(queueItem.type),
                isAffordable: function (max) { return checkAffordableCustom(this.cost, max); },
            };
        }
        else if (queueItem.action === "hell-mech") {
            let [gems, supply] = MechManager.getMechCost(queueItem.type);
            return {
                id: queueItem.id,
                name: queueItem.label,
                title: queueItem.label,
                cost: {
                    Soul_Gem: gems,
                    Supply: supply,
                },
                isAffordable: function(max) { return checkAffordableCustom(this.cost, max); },
            };
        }
        else {
            return buildingIds[queueItem.id] || arpaIds[queueItem.id];
        }
    }

    function updatePriorityTargets() {
        state.conflictTargets = [];
        state.queuedTargets = [];
        state.queuedTargetsAll = [];
        state.triggerTargets = [];
        state.unlockedTechs = [];
        state.unlockedBuildings = [];

        // Building and research queues
        let queueSave = settings.prioritizeQueue.includes("save");
        [{type: "queue", noorder: "qAny", map: getQueuedItemObj},
         {type: "r_queue", noorder: "qAny_res", map: (item) => techIds[item.id]}].forEach(queue => {
            if (game.global[queue.type].display) {
                for (let item of game.global[queue.type].queue) {
                    let obj = queue.map(item);
                    if (obj) {
                        state.queuedTargetsAll.push(obj);
                        if (obj.isAffordable(true)) {
                            state.queuedTargets.push(obj);
                            if (queueSave) {
                                state.conflictTargets.push({name: obj.title, cause: "Queue", cost: obj.cost});
                            }
                        }
                    }
                    if (!game.global.settings[queue.noorder]) {
                        break;
                    }
                }
            }
        });

        if (SpyManager.purchaseMoney && settings.prioritizeUnify.includes("save")) {
            state.conflictTargets.push({name: techIds["tech-unification"].title, cause: "Purchase", cost: {Money: SpyManager.purchaseMoney}});
        }

        if (settings.autoFleet && FleetManagerOuter.nextShipAffordable && settings.prioritizeOuterFleet.includes("save")) {
            state.conflictTargets.push({name: FleetManagerOuter.nextShipName, cause: "Ship", cost: FleetManagerOuter.nextShipCost});
        }

        // Reserve gems for mechs
        if (settings.autoMech && MechManager.initLab() && buildings.AsphodelEncampment.count === 0) {
            let mechBay = game.global.portal.mechbay;
            let baySpace = mechBay.max - mechBay.bay;

            // only reserve gems if we have bay space
            if (baySpace > 0) {
                let newSize = !haveTask("mech") ?
                    (settings.mechBuild === "random" ? MechManager.getPreferredSize()[0] : mechBay.blueprint.size) :
                    "titan";
                let [newGems, newSupply, newSpace] = MechManager.getMechCost({ size: newSize });

                if (newGems > 0) {
                    state.conflictTargets.push({
                        name: `Next mech (${newSize})`,
                        cause: "Mech",
                        cost: { Soul_Gem: newGems }
                    });
                }
            }
        }

        if (settings.autoTrigger) {
            TriggerManager.resetTargetTriggers();
            let triggerSave = settings.prioritizeTriggers.includes("save");

            // Active triggers
            for (let trigger of TriggerManager.targetTriggers) {
                let id = trigger.actionId;
                let obj = arpaIds[id] || buildingIds[id] || techIds[id];
                if (obj) {
                    state.triggerTargets.push(obj);
                    if (triggerSave) {
                        state.conflictTargets.push({name: obj.title, cause: "Trigger", cost: obj.cost});
                    }
                }
            }

            // Fake trigger for Embassy
            if (buildings.GorddonEmbassy.isAutoBuildable() && resources.Knowledge.maxQuantity >= settings.fleetEmbassyKnowledge) {
                let obj = buildings.GorddonEmbassy;
                state.triggerTargets.push(obj);
                state.conflictTargets.push({name: obj.title, cause: "Knowledge", cost: obj.cost});
            }
            // Fake trigger for Eden
            if (buildings.TauStarEden.isAutoBuildable() && isPrestigeAllowed("eden")) {
                let obj = buildings.TauStarEden;
                state.triggerTargets.push(obj);
                state.conflictTargets.push({name: obj.title, cause: "Prestige", cost: obj.cost});
            }
            // Fake trigger for Ignition
            if (buildings.TauGas2MatrioshkaBrain.count >= 1000 && buildings.TauGas2IgniteGasGiant.isAutoBuildable() && isPrestigeAllowed("retire")) {
                let obj = buildings.TauGas2IgniteGasGiant;
                state.triggerTargets.push(obj);
                state.conflictTargets.push({name: obj.title, cause: "Prestige", cost: obj.cost});
            }
        }

        $("#tech .action").each(function() {
            let tech = techIds[this.id];
            tech.updateResourceRequirements();
            if (!getTechConflict(tech) || state.triggerTargets.includes(tech) || state.queuedTargetsAll.includes(tech)) {
                state.unlockedTechs.push(tech);
            }
        });
    }

    function checkEvolutionResult() {
        if (!settings.masterScriptToggle || !state.evoCheckNeeded) {
            return true;
        }
        state.evoCheckNeeded = false;

        let needReset = false;
        if (settings.autoEvolution && settings.evolutionBackup) {
            // Sludge and Valdi can't be evolved at random, only intentionally
            if (!["junker", "sludge", "ultra_sludge", "hellspawn"].includes(game.global.race.species)) {
                if (settings.userEvolutionTarget === "auto") {
                    let newRace = races[game.global.race.species];
                    if (newRace.getWeighting() <= 0) {
                        let bestWeighting = Math.max(...Object.values(races).map(r => r.getWeighting()));
                        if (bestWeighting > 0) {
                            GameLog.logDanger("special", `${newRace.name} have no unearned achievements for current prestige, soft resetting and trying again.`, ['progress', 'achievements']);
                            needReset = true;
                        } else {
                            GameLog.logWarning("special", `Can't pick a race with unearned achievements for current prestige. Continuing with ${newRace.name}.`, ['progress', 'achievements']);
                        }
                    }
                } else if (settings.userEvolutionTarget !== game.global.race.species && races[settings.userEvolutionTarget].getHabitability() > 0) {
                    GameLog.logDanger("special", `Wrong race, soft resetting and trying again.`, ['progress']);
                    needReset = true;
                }
            }
        }
        if (settings.autoMutateTraits) {
            let baseRace = game.races[game.global.race.species];
            for (let trait of MutableTraitManager.priorityList) {
                if (trait.resetEnabled && game.global.race[trait.traitName] && !baseRace.traits[trait.traitName]) {
                    GameLog.logDanger("special", `Gained ${trait.name} trait, soft resetting and trying again.`, ['progress']);
                    needReset = true;
                    break;
                }
            }
        }

        if (!needReset && settings.autoEvolution && settings.userEvolutionTarget === "auto") {
            let goals = races[game.global.race.species].getWeighting(true);
            if (goals.length > 0) {
                GameLog.logInfo("special", `Auto Achievement goes for: ${goals.map(s => game.loc(s)).join(", ")}.`, ['progress', 'achievements']);
            } else {
                GameLog.logInfo("special", `Auto Achievement can't pick a goal for this run.`, ['progress', 'achievements']);
            }
        }

        if (needReset) {
            // Let's double check it's actually *soft* reset
            let resetButton = document.querySelector(".reset .button:not(.right)");
            if (resetButton.innerText === game.loc("reset_soft")) {
                if (settings.evolutionQueueEnabled && settingsRaw.evolutionQueue.length > 0) {
                    if (!settings.evolutionQueueRepeat) {
                        addEvolutionSetting();
                    }
                    settingsRaw.evolutionQueue.unshift(settingsRaw.evolutionQueue.pop());
                }
                updateSettingsFromState();

                state.goal = "GameOverMan";
                resetButton.disabled = false;
                resetButton.click();
                return false;
            }
        }
        return true;
    }

    // TODO: quantium lab
