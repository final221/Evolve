    function autoGatherResources() {
        // Don't spam click once we've got a bit of population going
        if (!settings.buildingAlwaysClick && resources.Population.currentQuantity > 15 && (buildings.RockQuarry.count > 0 || game.global.race['sappy'])) {
            return;
        }

        // Uses exposed action handlers, bypassing vue - they much faster, and that's important with a lot of calls
        let resPerClick = getResourcesPerClick();
        let amount = 0;
        if (buildings.Food.isClickable() && !game.global.race['fasting']){
            if (haveTech("conjuring", 1)) {
                amount = Math.floor(Math.min((resources.Food.maxQuantity - resources.Food.currentQuantity) / (resPerClick * 10), resources.Mana.currentQuantity, settings.buildingClickPerTick));
                resources.Mana.currentQuantity -= amount;
                resources.Food.currentQuantity += amount * resPerClick;
            } else {
                amount = Math.ceil(Math.min((resources.Food.maxQuantity - resources.Food.currentQuantity) / resPerClick, settings.buildingClickPerTick));
                resources.Food.currentQuantity = Math.min(resources.Food.currentQuantity + amount * resPerClick, resources.Food.maxQuantity);
            }
            let food = game.actions.city.food;
            for (let i = 0; i < amount; i++) {
                food.action();
            }
        }
        if (buildings.Lumber.isClickable()){
            if (haveTech("conjuring", 2)) {
                amount = Math.floor(Math.min((resources.Lumber.maxQuantity - resources.Lumber.currentQuantity) / (resPerClick * 10), resources.Mana.currentQuantity, settings.buildingClickPerTick));
                resources.Mana.currentQuantity -= amount;
                resources.Lumber.currentQuantity += amount * resPerClick;
            } else {
                amount = Math.ceil(Math.min((resources.Lumber.maxQuantity - resources.Lumber.currentQuantity) / resPerClick, settings.buildingClickPerTick));
                resources.Lumber.currentQuantity = Math.min(resources.Lumber.currentQuantity + amount * resPerClick, resources.Lumber.maxQuantity);
            }
            let lumber = game.actions.city.lumber;
            for (let i = 0; i < amount; i++) {
                lumber.action();
            }
        }
        if (buildings.Stone.isClickable()){
            if (haveTech("conjuring", 2)) {
                amount = Math.floor(Math.min((resources.Stone.maxQuantity - resources.Stone.currentQuantity) / (resPerClick * 10), resources.Mana.currentQuantity, settings.buildingClickPerTick));
                resources.Mana.currentQuantity -= amount;
                resources.Stone.currentQuantity += amount * resPerClick;
            } else {
                amount = Math.ceil(Math.min((resources.Stone.maxQuantity - resources.Stone.currentQuantity) / resPerClick, settings.buildingClickPerTick));
                resources.Stone.currentQuantity = Math.min(resources.Stone.currentQuantity + amount * resPerClick, resources.Stone.maxQuantity);
            }
            let stone = game.actions.city.stone;
            for (let i = 0; i < amount; i++) {
                stone.action();
            }
        }
        if (buildings.Chrysotile.isClickable()){
            if (haveTech("conjuring", 2)) {
                amount = Math.floor(Math.min((resources.Chrysotile.maxQuantity - resources.Chrysotile.currentQuantity) / (resPerClick * 10), resources.Mana.currentQuantity, settings.buildingClickPerTick));
                resources.Mana.currentQuantity -= amount;
                resources.Chrysotile.currentQuantity += amount * resPerClick;
            } else {
                amount = Math.ceil(Math.min((resources.Chrysotile.maxQuantity - resources.Chrysotile.currentQuantity) / resPerClick, settings.buildingClickPerTick));
                resources.Chrysotile.currentQuantity = Math.min(resources.Chrysotile.currentQuantity + amount * resPerClick, resources.Chrysotile.maxQuantity);
            }
            let chrysotile = game.actions.city.chrysotile;
            for (let i = 0; i < amount; i++) {
                chrysotile.action();
            }
        }
        if (buildings.Slaughter.isClickable()){
            amount = Math.min(Math.max(resources.Lumber.maxQuantity - resources.Lumber.currentQuantity, resources.Food.maxQuantity - resources.Food.currentQuantity, resources.Furs.maxQuantity - resources.Furs.currentQuantity) / resPerClick, settings.buildingClickPerTick);
            let slaughter = game.actions.city.slaughter;
            for (let i = 0; i < amount; i++) {
                slaughter.action();
            }
            resources.Lumber.currentQuantity = Math.min(resources.Lumber.currentQuantity + amount * resPerClick, resources.Lumber.maxQuantity);
            if (game.global.race['soul_eater'] && haveTech("primitive") && !game.global.race['fasting']){
                resources.Food.currentQuantity = Math.min(resources.Food.currentQuantity + amount * resPerClick, resources.Food.maxQuantity);
            }
            if (resources.Furs.isUnlocked()) {
                resources.Furs.currentQuantity = Math.min(resources.Furs.currentQuantity + amount * resPerClick, resources.Furs.maxQuantity);
            }
        }
    }

    function autoBuild() {
        BuildingManager.updateWeighting();
        ProjectManager.updateWeighting();

        let ignoredList = [...state.queuedTargets, ...state.triggerTargets];
        let buildingList = [...BuildingManager.managedPriorityList(), ...ProjectManager.managedPriorityList()];

        // Sort array so we'll have prioritized buildings on top. We'll need that below to avoid deathlocks, when building 1 waits for building 2, and building 2 waits for building 3. That's something we don't want to happen when building 1 and building 3 doesn't conflicts with each other.
        state.unlockedBuildings = buildingList.sort((a, b) => b.weighting - a.weighting);

        let estimatedTime = {};
        let affordableCache = {};
        let consumptionsUsed = {};
        const isAffordable = (building) => (affordableCache[building._vueBinding] ?? (affordableCache[building._vueBinding] = building.isAffordable()));
        const usesUsedConsumption = (
            settings.buildingConsumptionCheck === 'perResource' ? (building) => (building.consumption.some((c) => c.rate >= 0 && consumptionsUsed[c.resource._id])) :
            settings.buildingConsumptionCheck === 'unlimited' ? (building) => false :
            // onePerTick or any invalid A?B type override
            (building) => (Object.keys(consumptionsUsed).length > 0)
        );

        // Loop through the auto build list and try to buy them
        buildingsLoop:
        for (let i = 0; i < buildingList.length; i++) {
            let building = buildingList[i];

            // Only go further if it's affordable building, and not current target
            if (ignoredList.includes(building) || !isAffordable(building)) {
                continue;
            }

            // Results of buying multiple things using the same consumption/support in one tick are often bad
            if (usesUsedConsumption(building)) {
                continue;
            }

            // Check queue and trigger conflicts
            let conflict = getCostConflict(building);
            if (conflict && !building.is.important) {
                building.extraDescription += `Conflicts with ${conflict.actionList.map(action => {return `<span class="has-text-info">${action}</span>`;}).join(', ')} for ${conflict.resList.map(res => {return `<span class="has-text-info">${res}</span>`;}).join(', ')} (${conflict.obj.cause})<br>`;
                continue;
            }

            // Checks weights, if this building doesn't demands any overflowing resources(unless we ignoring overflowing)
            if (!settings.buildingBuildIfStorageFull || !Object.keys(building.cost).some(res => resources[res].storageRatio > 0.98)) {
                for (let j = 0; j < buildingList.length; j++) {
                    let other = buildingList[j];
                    let weightDiffRatio = other.weighting / building.weighting;

                    // Buildings sorted by weighting, so once we reached something with lower weighting - all remaining also lower, and we don't care about them
                    if (weightDiffRatio <= 1.000001) {
                        break;
                    }
                    // And we don't want to process clickable buildings - all buildings with highter weighting should already been proccessed.
                    // If that thing is affordable, but wasn't bought - it means something block it, and it won't be builded soon anyway, so we'll ignore it's demands.
                    // Unless that thing have x10 weight, and we absolutely don't want to waste its resources
                    if (weightDiffRatio < 10 && isAffordable(other)){
                        continue;
                    }

                    // Calculate time to build for competing building, if it's not cached
                    let estimation = estimatedTime[other._vueBinding];
                    if (!estimation){
                        estimation = [];

                        for (let res in other.cost) {
                            let resource = resources[res];
                            let quantity = other.cost[res];

                            // Ignore locked
                            if (!resource.isUnlocked()) {
                                continue;
                            }

                            let totalRateOfCharge = resource.rateOfChange;
                            if (totalRateOfCharge > 0) {
                                estimation[resource.id] = (quantity - resource.currentQuantity) / totalRateOfCharge;
                            } else if (settings.buildingsIgnoreZeroRate && resource.storageRatio < 0.975 && resource.currentQuantity < quantity) {
                                estimation[resource.id] = Number.MAX_SAFE_INTEGER;
                            } else {
                                // Craftables and such, which not producing at this moment. We can't realistically calculate how much time it'll take to fulfil requirement(too many factors), so let's assume we can get it any any moment.
                                estimation[resource.id] = 0;
                            }
                        }
                        estimation.total = Math.max(0, ...Object.values(estimation));
                        estimatedTime[other._vueBinding] = estimation;
                    }

                    // Compare resource costs
                    for (let res in building.cost) {
                        let resource = resources[res];
                        let thisQuantity = building.cost[res];

                        // Ignore locked and capped resources
                        if (!resource.isUnlocked() || (resource.storageRatio > 0.99 && resource.currentQuantity >= resource.storageRequired)){
                            continue;
                        }

                        // Check if we're actually conflicting on this resource
                        let otherQuantity = other.cost[res];
                        if (otherQuantity === undefined){
                            continue;
                        }

                        // We have enought resources for both buildings, no need to preserve it
                        if (resource.currentQuantity >= (otherQuantity + thisQuantity)) {
                            continue;
                        }

                        // We can use up to this amount of resources without delaying competing building
                        // Not very accurate, as income can fluctuate wildly for foundry, factory, and such, but should work as bottom line
                        if (thisQuantity <= (estimation.total - estimation[resource.id]) * resource.rateOfChange) {
                            continue;
                        }

                        // Check if cost difference is below weighting threshold, so we won't wait hours for 10x amount of resources when weight is just twice higher
                        let costDiffRatio = otherQuantity / thisQuantity;
                        if (costDiffRatio >= weightDiffRatio) {
                            continue;
                        }

                        // If we reached here - then we want to delay with our current building. Return all way back to main loop, and try to build something else
                        building.extraDescription += `Conflicts with <span class="has-text-info">${other.title}</span> for <span class="has-text-info">${resource.name}</span><br>`;
                        continue buildingsLoop;
                    }
                }
            }

            // Build building
            if (building.click()) {
                // Same for gems when we're saving them, and missions as they tends to unlock new stuff
                if (building.isMission() || (building.cost["Soul_Gem"] && settings.prestigeType === "whitehole" && settings.prestigeWhiteholeSaveGems)) {
                    return;
                }
                // Only one building with consumption per tick, so we won't build few red buildings having just 1 extra support, and such
                // Buildings that add support (negative rate) don't count
                building.consumption.forEach(c => {
                    if (c.rate >= 0) {
                        consumptionsUsed[c.resource._id] = true;
                    }
                });
                // Mark all processed building as unaffordable for remaining loop, so they won't appear as conflicting
                for (let key in affordableCache) {
                    affordableCache[key] = false;
                }
            }
        }
    }

    function getTechConflict(tech) {
        let itemId = tech._vueBinding;

        // Skip ignored techs
        if (settings.researchIgnore.includes(itemId)) {
            return "Ignored research";
        }

        // Don't click any reset options without user consent... that would be a dick move, man.
        if (itemId === "tech-exotic_infusion" || itemId === "tech-infusion_check" || itemId === "tech-infusion_confirm" ||
            itemId === "tech-dial_it_to_11" || itemId === "tech-limit_collider" || itemId === "tech-demonic_infusion" ||
            itemId === "tech-protocol66" || itemId === "tech-protocol66a" || itemId === "tech-final_ingredient") {
            return "Reset research";
        }

        // Save soul gems for reset
        if (settings.prestigeType === "whitehole" && settings.prestigeWhiteholeSaveGems && itemId !== "tech-virtual_reality" &&
            tech.cost["Soul_Gem"] > resources.Soul_Gem.currentQuantity - 10) {
            return "Saving up Soul Gems for prestige";
        }

        if (itemId === "tech-isolation_protocol" && settings.prestigeType !== "retire") {
            return "Progression fork to Retirement reset";
        }

        if (itemId === "tech-outerplane_summon" && settings.prestigeType !== "demonic") {
            return "Progression fork to Witch Hunter's Demonic Infusion";
        }

        if (itemId === "tech-focus_cure" && settings.prestigeType !== "matrix") {
            return "Progression fork to Matrix reset";
        }

        if (itemId === "tech-purify_essence" && settings.prestigeType !== "apotheosis") {
            return "Progression fork to Apotheosis";
        }

        if ((itemId === "tech-vax_strat1" || itemId === "tech-vax_strat2" || itemId === "tech-vax_strat3" || itemId === "tech-vax_strat4") && !itemId.includes(settings.prestigeVaxStrat)) {
            return "Undesirable Vaccination Strategy";
        }

        // Don't use Dark Bomb if not enabled
        if (itemId === "tech-dark_bomb" && (!settings.prestigeDemonicBomb || settings.prestigeType !== "demonic")) {
            return "Dark Bomb disabled";
        }

        // Don't waste phage and plasmid on ascension techs if we're not going there
        if ((itemId === "tech-incorporeal" || itemId === "tech-tech_ascension") && settings.prestigeType !== "ascension" && settings.prestigeType !== "apotheosis") {
            return "Not needed for current prestige";
        }

        // Alien Gift
        if (itemId === "tech-xeno_gift" && resources.Knowledge.maxQuantity < settings.fleetAlienGiftKnowledge) {
            return `${getNumberString(settings.fleetAlienGiftKnowledge)} Max Knowledge required`;
        }

        // Unification
        if ((itemId === "tech-unification2" || itemId === "tech-unite") && !settings.foreignUnification) {
            return "Unification disabled";
        }

        // If user wants to stabilize blackhole then do it, unless we're on blackhole run
        if (itemId === "tech-stabilize_blackhole") {
            if (!settings.prestigeWhiteholeStabiliseMass) {
                return "Blackhole stabilization disabled";
            }
            if (settings.prestigeType === "whitehole") {
                return "Disabled during whilehole reset";
            }
            if (settings.prestigeWhiteholeStabiliseCooldown > 0 && state.whiteholeLastStabilise) {
                let diff = (Date.now() - state.whiteholeLastStabilise) / 1000;
                if (diff < settings.prestigeWhiteholeStabiliseCooldown) {
                    return `On cooldown for ${Math.ceil(settings.prestigeWhiteholeStabiliseCooldown - diff)} more seconds`;
                }
            }
        }

        if (itemId !== settings.userResearchTheology_1 && (itemId === "tech-anthropology" || itemId === "tech-fanaticism")) {
            const isFanatRace = () => Object.values(fanatAchievements).reduce((result, combo) => result || (game.global.race.species === combo.race && game.global.race.gods === combo.god && !isAchievementUnlocked(combo.achieve, game.alevel())), false);
            if (itemId === "tech-anthropology" && !(settings.userResearchTheology_1 === "auto" && settings.prestigeType === "mad" && !isFanatRace())) {
                return "Undesirable theology path";
            }
            if (itemId === "tech-fanaticism" && !(settings.userResearchTheology_1 === "auto" && (settings.prestigeType !== "mad" || isFanatRace()))) {
                return "Undesirable theology path";
            }
        }

        if (itemId !== settings.userResearchTheology_2 && (itemId === "tech-deify" || itemId === "tech-study")) {
            let longRun = ["ascension", "demonic", "apotheosis", "apocalypse", "terraform", "matrix", "retire", "eden"].includes(settings.prestigeType);
            if (itemId === "tech-deify" && !(settings.userResearchTheology_2 === "auto" && longRun)) {
                return "Undesirable theology path";
            }
            if (itemId === "tech-study" && !(settings.userResearchTheology_2 === "auto" && !longRun)) {
                return "Undesirable theology path";
            }
        }
        return false;
    }

    function autoTrigger() {
        let triggerActive = false;
        for (let trigger of state.triggerTargets) {
            if (trigger.click()) {
                triggerActive = true;
            }
        }
        return triggerActive;
    }

    function autoResearch() {
        for (let tech of state.unlockedTechs) {
            if (tech.isAffordable() && !getCostConflict(tech) && tech.click()) {
                BuildingManager.updateBuildings(); // Cache cost if we just unlocked some building
                ProjectManager.updateProjects();
                return;
            }
        }
    }

    function getCitadelConsumption(amount) {
        return (30 + (amount - 1) * 2.5) * amount * (game.global.race['emfield'] ? 1.5 : 1);
    }

