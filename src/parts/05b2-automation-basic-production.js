    function autoAlchemy() {
        let m = AlchemyManager;
        if (!m.isUnlocked()) {
            return;
        }

        let fullList = m.managedPriorityList();
        let adjustAlchemy = Object.fromEntries(fullList.map(res => [res.id, m.currentCount(res.id) * -1]));

        // Calculate required transmutations
        if (!resources.Crystal.isDemanded()) {
            let activeList = fullList.filter(res => m.resWeighting(res.id) > 0 && res.isUseful());
            let totalWeigthing = 0, currentTransmute = 0;
            for (let res of activeList) {
                totalWeigthing += m.resWeighting(res.id);
                currentTransmute += m.currentCount(res.id);
            }
            let manaAvailable = (currentTransmute + resources.Mana.rateOfChange) * ((!settings.autoPylon && resources.Mana.storageRatio > 0.99) ? 1 : settings.magicAlchemyManaUse);
            let crystalAvailable = currentTransmute * 0.15 + resources.Crystal.currentQuantity + resources.Crystal.rateOfChange;
            let maxTransmute = Math.floor(Math.min(manaAvailable, crystalAvailable * (1/0.15)));
            activeList.forEach(res => adjustAlchemy[res.id] += Math.floor(maxTransmute * (m.resWeighting(res.id) / totalWeigthing)));
        }

        // Apply adjustment
        Object.entries(adjustAlchemy).forEach(([id, delta]) => delta < 0 && m.transmuteLess(id, delta * -1));
        Object.entries(adjustAlchemy).forEach(([id, delta]) => delta > 0 && m.transmuteMore(id, delta));
    }

    function autoPylon() {
        let m = RitualManager;
        // If not unlocked then nothing to do
        if (!m.initIndustry()) {
            return;
        }

        let spells = Object.values(m.Productions).filter(spell => spell.isUnlocked());

        // Init adjustment, and sort groups by priorities
        let pylonAdjustments = Object.fromEntries(spells.map(spell => [spell.id, 0]));
        let manaToUse = resources.Mana.rateOfChange * (resources.Mana.storageRatio > 0.99 ? 1 : settings.productionRitualManaUse);
        let usableMana = manaToUse;
        let maxRituals = (settings.productionRitualSafe && game.global.race['witch_hunter'])
            ? (jobs.Priest.count * (haveTech("roguemagic", 4) ? 4 : 1))
            : Number.MAX_SAFE_INTEGER;

        let spellSorter = (a, b) => ((pylonAdjustments[a.id] / a.weighting) - (pylonAdjustments[b.id] / b.weighting)) || b.weighting - a.weighting;
        let remainingSpells = spells.filter(spell => spell.weighting > 0 && (spell !== m.Productions.Factory || jobs.CementWorker.count > 0)).sort(spellSorter);
        spellsLoop:
        while(remainingSpells.length > 0 && maxRituals > 0) {
            let spell = remainingSpells.shift();
            let amount = pylonAdjustments[spell.id];
            let cost = m.costStep(amount);

            if (cost <= manaToUse) {
                pylonAdjustments[spell.id] = amount + 1;
                manaToUse -= cost;
                maxRituals--;
                // Insert spell back to array keeping it sorted
                for (let i = remainingSpells.length - 1; i >= 0; i--) {
                    if (spellSorter(spell, remainingSpells[i]) > 0) {
                        remainingSpells.splice(i + 1, 0, spell);
                        continue spellsLoop;
                    }
                }
                remainingSpells.unshift(spell);
            }
        }
        resources.Mana.rateOfChange - (usableMana - manaToUse);

        let pylonDeltas = spells.map((spell) => pylonAdjustments[spell.id] - m.currentSpells(spell));

        spells.forEach((spell, index) => pylonDeltas[index] < 0 && m.decreaseRitual(spell, pylonDeltas[index] * -1));
        spells.forEach((spell, index) => pylonDeltas[index] > 0 && m.increaseRitual(spell, pylonDeltas[index]));
    }

    function autoQuarry() {
        // Nothing to do here with no quarry, or smoldering
        if (!QuarryManager.initIndustry()) {
            return;
        }

        let chrysotileWeigth = resources.Chrysotile.isDemanded() ? Number.MAX_SAFE_INTEGER : (100 - resources.Chrysotile.storageRatio * 100);
        let stoneWeigth = resources.Stone.isDemanded() ? Number.MAX_SAFE_INTEGER : (100 - resources.Stone.storageRatio * 100);
        if (buildings.MetalRefinery.count > 0) {
            stoneWeigth = Math.max(stoneWeigth, resources.Aluminium.isDemanded() ? Number.MAX_SAFE_INTEGER : (100 - resources.Aluminium.storageRatio * 100));
        }
        chrysotileWeigth *= settings.productionChrysotileWeight;

        let currentRatio = QuarryManager.currentProduction();
        let newRatio = Math.round(chrysotileWeigth / (chrysotileWeigth + stoneWeigth) * 100);

        QuarryManager.increaseProduction(newRatio - currentRatio);
    }

    function autoMine() {
        // Nothing to do here with no mine
        if (!MineManager.initIndustry()) {
            return;
        }

        let adamantiteWeigth = resources.Adamantite.isDemanded() ? Number.MAX_SAFE_INTEGER : (100 - resources.Adamantite.storageRatio * 100);
        let aluminiumWeight = resources.Aluminium.isDemanded() ? Number.MAX_SAFE_INTEGER : (100 - resources.Aluminium.storageRatio * 100);

        adamantiteWeigth *= settings.productionAdamantiteWeight;

        let currentRatio = MineManager.currentProduction();
        let newRatio = Math.round(adamantiteWeigth / (adamantiteWeigth + aluminiumWeight) * 100);

        MineManager.increaseProduction(newRatio - currentRatio);
    }


    function autoExtractor() {
        // Nothing to do here with no moneg
        if (!ExtractorManager.initIndustry()) {
            return;
        }

        let productions = [{id: "common", res1: "Iron", res2: "Aluminium"},
                           {id: "uncommon", res1: "Iridium", res2: "Neutronium"}];
        if (haveTech("tau_roid", 5)) {
            productions.push({id: "rare", res1: "Orichalcum", res2: "Elerium"});
        }

        for (let prod of productions) {
            let res1Weight = resources[prod.res1].isDemanded() ? Number.MAX_SAFE_INTEGER : (100 - resources[prod.res1].storageRatio * 100);
            let res2Weight = resources[prod.res2].isDemanded() ? Number.MAX_SAFE_INTEGER : (100 - resources[prod.res2].storageRatio * 100);

            res2Weight *= settings[`productionExtWeight_${prod.id}`];

            let currentRatio = ExtractorManager.currentProduction(prod.id);
            let newRatio = Math.round(res2Weight / (res1Weight + res2Weight) * 100);

            ExtractorManager.increaseProduction(prod.id, newRatio - currentRatio);
        }
    }

    function autoSmelter() {
        // No smelter; no auto smelter. No soup for you.
        let m = SmelterManager;
        if (!m.initIndustry()) {
            return;
        }

        // Only adjust fuels if race does not have forge trait which means they don't require smelter fuel
        let totalSmelters = m.maxOperating();
        let fuelRemoved = 0;
        if (!game.global.race['forge']) {
            let remainingSmelters = totalSmelters;

            let fuels = m.managedFuelPriorityList();
            let fuelAdjust = {};
            for (let i = 0; i < fuels.length; i++) {
                let fuel = fuels[i];
                if (!fuel.unlocked) {
                    continue;
                }

                let maxAllowedUnits = remainingSmelters;

                // Adjust Inferno to Oil ratio for better efficiency and cost
                if (fuel === m.Fuels.Inferno && fuels[i+1] === m.Fuels.Oil && remainingSmelters > 75) {
                    maxAllowedUnits = Math.floor(0.5 * remainingSmelters + 37.5);
                }

                for (let productionCost of fuel.cost) {
                    let resource = productionCost.resource;
                    // Allow using all resources for fuel until 60s of consumption left, unless demanded.
                    if (resource.currentQuantity < ((maxAllowedUnits * productionCost.quantity) * CONSUMPTION_BALANCE_MIN + productionCost.minRateOfChange) || resource.isDemanded()) {
                        let remainingRateOfChange = resource.rateOfChange + (m.fueledCount(fuel) * productionCost.quantity) - productionCost.minRateOfChange;

                        let affordableAmount = Math.max(0, Math.floor(remainingRateOfChange / productionCost.quantity));
                        if (affordableAmount < maxAllowedUnits) {
                            state.tooltips["smelterFuels" + fuel.id.toLowerCase()] = `Too low ${resource.name} income<br>`;
                        }
                        maxAllowedUnits = Math.min(maxAllowedUnits, affordableAmount);
                    }
                }

                remainingSmelters -= maxAllowedUnits;
                fuelAdjust[fuel.id] = maxAllowedUnits - m.fueledCount(fuel);
            }

            for (let fuel of fuels) {
                if (fuelAdjust[fuel.id] < 0) {
                    fuelRemoved += fuelAdjust[fuel.id] * -1;
                    m.decreaseFuel(fuel, fuelAdjust[fuel.id] * -1);
                }
            }

            for (let fuel of fuels) {
                if (fuelAdjust[fuel.id] > 0) {
                    m.increaseFuel(fuel, fuelAdjust[fuel.id]);
                }
            }
            totalSmelters -= remainingSmelters;
        }

        totalSmelters += m.extraOperating();

        let smelterIronCount = m.smeltingCount(m.Productions.Iron);
        let smelterSteelCount = m.smeltingCount(m.Productions.Steel);
        let smelterIridiumCount = m.smeltingCount(m.Productions.Iridium);

        let maxAllowedIridium = m.Productions.Iridium.unlocked && !resources.Iridium.isCapped()
          ? Math.floor(settings.productionSmeltingIridium * totalSmelters) : 0;
        let maxAllowedSteel = totalSmelters - smelterIridiumCount;

        let smeltAdjust = {
            Iridium: maxAllowedIridium - smelterIridiumCount,
            Steel: smelterIridiumCount - maxAllowedIridium,
        };

        // Adjusting fuel can move production from steel to iron, we need to account that
        if (fuelRemoved > smelterIronCount) {
            let steelRemoved = fuelRemoved - smelterIronCount;
            if (steelRemoved <= smelterSteelCount) {
                smeltAdjust.Steel += steelRemoved;
            } else {
                smeltAdjust.Steel += smelterSteelCount;
                smeltAdjust.Iridium += steelRemoved - smelterSteelCount;
            }
        }

        // We only care about steel. It isn't worth doing a full generic calculation here
        // Just assume that smelters will always be fueled so Iron smelting is unlimited
        // We want to work out the maximum steel smelters that we can have based on our resource consumption
        let steelSmeltingConsumption = m.Productions.Steel.cost;
        for (let productionCost of steelSmeltingConsumption) {
            let resource = productionCost.resource;
            // Allow using all resources for Steel until 60s of consumption left, unless demanded.
            if (resource.currentQuantity < ((smelterSteelCount * productionCost.quantity) * CONSUMPTION_BALANCE_MIN + productionCost.minRateOfChange) || resource.isDemanded()) {
                let remainingRateOfChange = resource.rateOfChange + (smelterSteelCount * productionCost.quantity) - productionCost.minRateOfChange;

                let affordableAmount = Math.max(0, Math.floor(remainingRateOfChange / productionCost.quantity));
                if (affordableAmount < maxAllowedSteel) {
                    state.tooltips["smelterMatssteel"] = `Too low ${resource.name} income<br>`;
                }
                maxAllowedSteel = Math.min(maxAllowedSteel, affordableAmount);
            }
        }

        let ironWeighting = 0;
        let steelWeighting = 0;
        switch (settings.productionSmelting){
            case "iron":
                ironWeighting = resources.Iron.timeToFull;
                if (!ironWeighting) {
                    steelWeighting = resources.Steel.timeToFull;
                }
                break;
            case "steel":
                steelWeighting = resources.Steel.timeToFull;
                if (!steelWeighting) {
                    ironWeighting = resources.Iron.timeToFull;
                }
                break;
            case "storage":
                ironWeighting = resources.Iron.timeToFull;
                steelWeighting = resources.Steel.timeToFull;
                break;
            case "required":
                ironWeighting = resources.Iron.timeToRequired;
                steelWeighting = resources.Steel.timeToRequired;
                break;
        }

        if (resources.Iron.isDemanded()) {
            ironWeighting = Number.MAX_SAFE_INTEGER;
        }
        if (resources.Steel.isDemanded()) {
            steelWeighting = Number.MAX_SAFE_INTEGER;
        }
        if (jobs.Miner.count === 0 && buildings.BeltIronShip.stateOnCount === 0) {
            ironWeighting = 0;
            steelWeighting = 1;
            maxAllowedSteel = totalSmelters - smelterIridiumCount;
        }

        // We have more steel than we can afford OR iron income is too low
        if (smelterSteelCount > maxAllowedSteel || smelterSteelCount > 0 && ironWeighting > steelWeighting) {
            smeltAdjust.Steel--;
        }

        // We can afford more steel AND either steel income is too low OR both steel and iron full, but we can use steel smelters to increase titanium income
        if (smelterSteelCount < maxAllowedSteel && smelterIronCount > 0 &&
             ((steelWeighting > ironWeighting) ||
              (steelWeighting <= 0 && ironWeighting <= 0 && resources.Titanium.storageRatio < 0.99 && haveTech("titanium")))) {
            smeltAdjust.Steel++;
        }

        smeltAdjust.Iron = totalSmelters - (smelterIronCount + smelterSteelCount + smeltAdjust.Steel + smelterIridiumCount + smeltAdjust.Iridium);
        Object.entries(smeltAdjust).forEach(([id, delta]) => delta < 0 && m.decreaseSmelting(id, delta * -1));
        Object.entries(smeltAdjust).forEach(([id, delta]) => delta > 0 && m.increaseSmelting(id, delta));
    }

