    function autoFactory() {
        // No factory; no auto factory
        if (!FactoryManager.initIndustry()) {
            return;
        }

        let allProducts = Object.values(FactoryManager.Productions);

        // Init adjustment, and sort groups by priorities
        let factoryAdjustments = {};
        let priorityList = buildPriorityList(allProducts, (production) => {
            state.tooltips["iFactory" + production.id] = `Disabled<br>`;
            if (production.unlocked && production.enabled) {
                if (production.weighting > 0) {
                    let priority = production.resource.isDemanded() ? Math.max(production.priority, 100) : production.priority;
                    if (priority !== 0) {
                        state.tooltips["iFactory" + production.id] = `Low priority<br>`;
                        return priority;
                    }
                }
                factoryAdjustments[production.id] = 0;
            }
            return 0;
        });

        let onDemand = false;
        if (settings.productionFactoryWeighting === "demanded") {
            let usefulProducts = allProducts.filter(production => production.resource.currentQuantity < production.resource.storageRequired);
            if (usefulProducts.length > 0) {
                onDemand = true;
            }
        }

        const scalingFactor =
            settings.productionFactoryWeighting === "buildings" && state.unlockedBuildings.length > 0
                ? (resource) => (findRequiredResourceWeight(resource) ?? 100) :
            settings.productionFactoryWeighting === "demanded" && onDemand
                ? (resource) => (resource.currentQuantity < resource.storageRequired ? 1 : 0) :
            () => 1;
        const scaledWeights = Object.fromEntries(allProducts.map(production => [production.resource.id, production.weighting * scalingFactor(production.resource)]));

        // Calculate amount of factories per product
        let remainingFactories = FactoryManager.maxOperating();
        for (let i = 0; i < priorityList.length && remainingFactories > 0; i++) {
            let products = priorityList[i].sort((a, b) => scaledWeights[a.resource.id] - scaledWeights[b.resource.id]);
            while (remainingFactories > 0) {
                let factoriesToDistribute = remainingFactories;
                let totalPriorityWeight = products.reduce((sum, production) => sum + scaledWeights[production.resource.id], 0);

                for (let j = products.length - 1; j >= 0 && remainingFactories > 0; j--) {
                    let production = products[j];
                    state.tooltips["iFactory" + production.id] = ``;

                    let calculatedRequiredFactories = Math.min(remainingFactories, Math.max(1, Math.floor(factoriesToDistribute / totalPriorityWeight * scaledWeights[production.resource.id])));
                    let actualRequiredFactories = calculatedRequiredFactories;

                    if (!production.resource.isUseful()) {
                        actualRequiredFactories = 0;
                        state.tooltips["iFactory" + production.id] += `Resource capped<br>`;
                    }

                    for (let resourceCost of production.cost) {
                        let usedMaterial = resourceCost.resource;
                        if (!usedMaterial.isUnlocked()) {
                            continue;
                        }
                        if (!production.resource.isDemanded()) {
                            if (!settings.useDemanded && usedMaterial.isDemanded()) {
                                actualRequiredFactories = 0;
                                state.tooltips["iFactory" + production.id] += `${usedMaterial.name} is demanded<br>`;
                                break;
                            }
                            if (usedMaterial.storageRatio < settings.productionFactoryMinIngredients) {
                                actualRequiredFactories = 0;
                                state.tooltips["iFactory" + production.id] += `${usedMaterial.name} under min materials ratio<br>`;
                                break;
                            }
                        }
                        // No need to preserve minimum income when we have enough storage for 60s of running
                        // We can't demand it here, though, due to order of operations
                        // Elsewhere, prioritizeDemandedResources() demands a few specific materials.
                        if (usedMaterial.currentQuantity < ((actualRequiredFactories * resourceCost.quantity) * CONSUMPTION_BALANCE_MIN + resourceCost.minRateOfChange) || usedMaterial.isDemanded()) {
                            let previousCost = FactoryManager.currentProduction(production) * resourceCost.quantity;
                            let currentCost = factoryAdjustments[production.id] * resourceCost.quantity;
                            let rate = usedMaterial.rateOfChange + previousCost - currentCost - resourceCost.minRateOfChange;

                            if (production.resource.isDemanded()) {
                                rate += usedMaterial.currentQuantity;
                            }
                            let affordableAmount = Math.floor(rate / resourceCost.quantity);
                            if (affordableAmount < 1) {
                                state.tooltips["iFactory" + production.id] += `Too low ${usedMaterial.name} income<br>`;
                            }
                            actualRequiredFactories = Math.min(actualRequiredFactories, affordableAmount);
                        }
                    }

                    // If we're going for bioseed - try to balance neutronium\nanotubes ratio
                    if (settings.prestigeType === "bioseed" && settings.prestigeBioseedConstruct && production === FactoryManager.Productions.NanoTube) {
                        let reservedNeutronium = game.global.race['truepath'] ? 500 : 250;
                        if (resources.Neutronium.currentQuantity < reservedNeutronium) {
                            state.tooltips["iFactory" + production.id] += `${reservedNeutronium} ${resources.Neutronium.name} reserved<br>`;
                            actualRequiredFactories = 0;
                        }
                    }

                    if (actualRequiredFactories > 0){
                        remainingFactories -= actualRequiredFactories;
                        factoryAdjustments[production.id] += actualRequiredFactories;
                    }

                    // We assigned less than wanted, i.e. we either don't need this product, or can't afford it. In both cases - we're done with it.
                    if (actualRequiredFactories < calculatedRequiredFactories) {
                        products.splice(j, 1);
                    }
                }

                if (factoriesToDistribute === remainingFactories) {
                    break;
                }
            }
        }

        // First decrease any production so that we have room to increase others
        for (let production of allProducts) {
            if (factoryAdjustments[production.id] !== undefined) {
                let deltaAdjustments = factoryAdjustments[production.id] - FactoryManager.currentProduction(production);

                if (deltaAdjustments < 0) {
                    FactoryManager.decreaseProduction(production, deltaAdjustments * -1);
                }
            }
        }

        // Increase any production required (if they are 0 then don't do anything with them)
        for (let production of allProducts) {
            if (factoryAdjustments[production.id] !== undefined) {
                let deltaAdjustments = factoryAdjustments[production.id] - FactoryManager.currentProduction(production);

                if (deltaAdjustments > 0) {
                    FactoryManager.increaseProduction(production, deltaAdjustments);
                }
            }
        }
    }

    function autoMiningDroid() {
        // If not unlocked then nothing to do
        if (!DroidManager.initIndustry()) {
            return;
        }

        let allProducts = Object.values(DroidManager.Productions);

        // Init adjustment, and sort groups by priorities
        let factoryAdjustments = {};
        let priorityList = buildPriorityList(allProducts, (production) => {
            let priority = 0;
            if (production.weighting > 0) {
                priority = production.resource.isDemanded() ? Math.max(production.priority, 100) : production.priority;
            }
            factoryAdjustments[production.id] = 0;
            return priority;
        });

        // Calculate amount of factories per product
        let remainingFactories = DroidManager.maxOperating();
        for (let i = 0; i < priorityList.length && remainingFactories > 0; i++) {
            let products = priorityList[i].sort((a, b) => a.weighting - b.weighting);
            while (remainingFactories > 0) {
                let factoriesToDistribute = remainingFactories;
                let totalPriorityWeight = products.reduce((sum, production) => sum + production.weighting, 0);

                for (let j = products.length - 1; j >= 0 && remainingFactories > 0; j--) {
                    let production = products[j];

                    let calculatedRequiredFactories = Math.min(remainingFactories, Math.max(1, Math.floor(factoriesToDistribute / totalPriorityWeight * production.weighting)));
                    let actualRequiredFactories = calculatedRequiredFactories;
                    if (!production.resource.isUseful()) {
                        actualRequiredFactories = 0;
                    }

                    if (actualRequiredFactories > 0){
                        remainingFactories -= actualRequiredFactories;
                        factoryAdjustments[production.id] += actualRequiredFactories;
                    }

                    // We assigned less than wanted, i.e. we either don't need this product, or can't afford it. In both cases - we're done with it.
                    if (actualRequiredFactories < calculatedRequiredFactories) {
                        products.splice(j, 1);
                    }
                }

                if (factoriesToDistribute === remainingFactories) {
                    break;
                }
            }
        }
        if (remainingFactories > 0) {
            return;
        }

        // First decrease any production so that we have room to increase others
        for (let production of allProducts) {
            if (factoryAdjustments[production.id] !== undefined) {
                let deltaAdjustments = factoryAdjustments[production.id] - DroidManager.currentProduction(production);

                if (deltaAdjustments < 0) {
                    DroidManager.decreaseProduction(production, deltaAdjustments * -1);
                }
            }
        }

        // Increase any production required (if they are 0 then don't do anything with them)
        for (let production of allProducts) {
            if (factoryAdjustments[production.id] !== undefined) {
                let deltaAdjustments = factoryAdjustments[production.id] - DroidManager.currentProduction(production);

                if (deltaAdjustments > 0) {
                    DroidManager.increaseProduction(production, deltaAdjustments);
                }
            }
        }
    }

    function autoGraphenePlant() {
        // If not unlocked then nothing to do
        if (!GrapheneManager.initIndustry()) {
            return;
        }

        let remainingPlants = GrapheneManager.maxOperating();
        let fuelAdjust = [];

        let sortedFuel = Object.values(GrapheneManager.Fuels).sort((a, b) => b.cost.resource.storageRatio < 0.995 || a.cost.resource.storageRatio < 0.995 ? b.cost.resource.storageRatio - a.cost.resource.storageRatio : b.cost.resource.rateOfChange - a.cost.resource.rateOfChange);
        for (let fuel of sortedFuel) {
            if (remainingPlants === 0) {
                break;
            }

            let resource = fuel.cost.resource;
            if (!resource.isUnlocked()) {
                continue;
            }

            let currentFuelCount = GrapheneManager.fueledCount(fuel);
            let maxFueledForConsumption = remainingPlants;
            if (!resources.Graphene.isUseful()) {
                maxFueledForConsumption = 0;
            } else if (resource.currentQuantity < ((maxFueledForConsumption * fuel.cost.quantity * CONSUMPTION_BALANCE_MIN) + fuel.cost.minRateOfChange)) {
                let rateOfChange = resource.rateOfChange + fuel.cost.quantity * currentFuelCount - fuel.cost.minRateOfChange;

                let affordableAmount = Math.floor(rateOfChange / fuel.cost.quantity);
                maxFueledForConsumption = Math.max(Math.min(maxFueledForConsumption, affordableAmount), 0);
            }

            let deltaFuel = maxFueledForConsumption - currentFuelCount;
            if (deltaFuel !== 0) {
                fuelAdjust.push({res: fuel, delta: deltaFuel});
            }

            remainingPlants -= currentFuelCount + deltaFuel;
        }

        fuelAdjust.forEach(fuel => fuel.delta < 0 && GrapheneManager.decreaseFuel(fuel.res, fuel.delta * -1));
        fuelAdjust.forEach(fuel => fuel.delta > 0 && GrapheneManager.increaseFuel(fuel.res, fuel.delta));
    }

    // TODO: Allow configuring priorities between eject\supply\nanite
