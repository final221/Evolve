    function autoMinorTrait() {
        let m = MinorTraitManager;
        if (!m.isUnlocked()) {
            return;
        }

        let traitList = m.managedPriorityList();
        if (traitList.length === 0) {
            return;
        }

        let totalWeighting = 0;
        let totalGeneCost = 0;

        traitList.forEach(trait => {
            totalWeighting += trait.weighting;
            totalGeneCost += trait.geneCost();
        });

        traitList.forEach(trait => {
            let traitCost = trait.geneCost();
            if (trait.weighting / totalWeighting >= traitCost / totalGeneCost && resources.Genes.currentQuantity >= traitCost) {
                m.buyTrait(trait.traitName);
                resources.Genes.currentQuantity -= traitCost;
            }
        });
    }

    function autoMutateTrait() {
        let m = MutableTraitManager;
        if (!m.isUnlocked()) {
            return;
        }

        let currency = game.global.race.universe === "antimatter" ? resources.AntiPlasmid : resources.Plasmid;

        for (let trait of m.priorityList) {
            if (trait.canGain()) {
                let mutationCost = trait.mutationCost('gain');
                m.gainTrait(trait.traitName);
                GameLog.logSuccess("mutation", `Mutating in ${trait.name} for ${mutationCost} ${currency.name}`, ['progress']);
                currency.currentQuantity -= mutationCost;
                return; // only mutate one trait per tick, to reduce lag
            }

            if (trait.canPurge()) {
                let mutationCost = trait.mutationCost('purge');
                m.purgeTrait(trait.traitName);
                GameLog.logSuccess("mutation", `Mutating out ${trait.name} for ${mutationCost} ${currency.name}`, ['progress']);
                currency.currentQuantity -= mutationCost;
                return; // only mutate one trait per tick, to reduce lag
            }
        }
    }

    function adjustTradeRoutes() {
        let sellWeight = settings.tradeRouteSellExcess
            ? (resource) => (resource.usefulRatio >= 1 ? resource.tradeSellPrice * 1000 : resource.usefulRatio)
            : (resource) => (resource.storageRatio >= 0.99 ? resource.tradeSellPrice * 1000 : resource.usefulRatio);

        let tradableResources = MarketManager.priorityList
          .filter(r => r.isRoutesUnlocked() && (r.autoTradeBuyEnabled || r.autoTradeSellEnabled))
          .sort((a, b) => sellWeight(b) - sellWeight(a));
        let requiredTradeRoutes = {};
        let currentMoneyPerSecond = resources.Money.rateOfChange;
        let tradeRoutesUsed = 0;
        let importRouteCap = MarketManager.getImportRouteCap();
        let exportRouteCap = MarketManager.getExportRouteCap();
        let [maxTradeRoutes, unmanagedTradeRoutes] = MarketManager.getMaxTradeRoutes();

        // Fill trade routes with selling
        for (let i = 0; i < tradableResources.length; i++) {
            let resource = tradableResources[i];
            if (!resource.autoTradeSellEnabled) {
                continue;
            }
            requiredTradeRoutes[resource.id] = 0;

            if (tradeRoutesUsed >= maxTradeRoutes
                || (game.global.race['banana'] && tradeRoutesUsed > 0)
                || (settings.tradeRouteSellExcess
                  ? resource.usefulRatio < 1
                  : resource.storageRatio < 0.99)) {
                continue;
            }

            let routesToAssign = Math.min(exportRouteCap, maxTradeRoutes - tradeRoutesUsed, Math.floor(resource.rateOfChange / resource.tradeRouteQuantity));
            if (routesToAssign > 0) {
                tradeRoutesUsed += routesToAssign;
                requiredTradeRoutes[resource.id] -= routesToAssign;
                currentMoneyPerSecond += resource.tradeSellPrice * routesToAssign;
            }
        }
        let minimumAllowedMoneyPerSecond = Math.min(resources.Money.maxQuantity - resources.Money.currentQuantity, Math.max(settings.tradeRouteMinimumMoneyPerSecond, settings.tradeRouteMinimumMoneyPercentage / 100 * currentMoneyPerSecond));

        // Init adjustment, and sort groups by priorities
        let priorityList = buildPriorityList(tradableResources, (resource) => {
            if (!resource.autoTradeBuyEnabled) {
                return 0;
            }
            requiredTradeRoutes[resource.id] = requiredTradeRoutes[resource.id] ?? 0;

            if (resource.autoTradeWeighting <= 0
                || (settings.tradeRouteSellExcess
                  ? resource.usefulRatio > 0.99
                  : resource.storageRatio > 0.98)) {
                return 0;
            }

            let priority = resource.autoTradePriority;
            if (resource.isDemanded()) {
                priority = Math.max(priority, 100);
                if (!resources.Money.isDemanded()) {
                    // Resource demanded, money not demanded - ignore min money, and spend as much as possible
                    minimumAllowedMoneyPerSecond = 0;
                }
            } else if ((priority < 100 && priority !== -1) && resources.Money.isDemanded()) {
                // Don't buy resources with low priority when money is demanded
                return 0;
            }

            return priority;
        });

        // Calculate amount of routes per resource
        let resSorter = (a, b) => ((requiredTradeRoutes[a.id] / a.autoTradeWeighting) - (requiredTradeRoutes[b.id] / b.autoTradeWeighting)) || b.autoTradeWeighting - a.autoTradeWeighting;
        let remainingRoutes, unassignStep;
        if (getGovernor() === "entrepreneur") {
            remainingRoutes = tradeRoutesUsed - unmanagedTradeRoutes;
            unassignStep = 2;
        } else {
            remainingRoutes = maxTradeRoutes;
            unassignStep = 1;
        }
        outerLoop:
        for (let i = 0; i < priorityList.length && remainingRoutes > 0; i++) {
            let trades = priorityList[i].sort((a, b) => a.autoTradeWeighting - b.autoTradeWeighting);
            assignLoop:
            while(trades.length > 0 && remainingRoutes > 0) {
                let resource = trades.sort(resSorter)[0];
                // TODO: Fast assign for single resource

                if (requiredTradeRoutes[resource.id] >= importRouteCap) {
                    trades.shift();
                    continue;
                }
                // Stop if next route will lower income below allowed minimum
                if (currentMoneyPerSecond - resource.tradeBuyPrice < minimumAllowedMoneyPerSecond) {
                    break outerLoop;
                }

                if (tradeRoutesUsed < maxTradeRoutes) {
                    // Still have unassigned routes
                    currentMoneyPerSecond -= resource.tradeBuyPrice;
                    tradeRoutesUsed++;
                    remainingRoutes--;
                    requiredTradeRoutes[resource.id]++;
                } else {
                    // No free routes, remove selling
                    for (let otherId in requiredTradeRoutes) {
                        if (requiredTradeRoutes[otherId] === undefined) {
                            continue
                        }
                        let otherResource = resources[otherId];
                        let currentRequired = requiredTradeRoutes[otherId];
                        if (currentRequired >= 0 || resource === otherResource) {
                            continue;
                        }

                        if (currentMoneyPerSecond - otherResource.tradeSellPrice - resource.tradeBuyPrice > minimumAllowedMoneyPerSecond && remainingRoutes >= unassignStep) {
                            currentMoneyPerSecond -= otherResource.tradeSellPrice;
                            currentMoneyPerSecond -= resource.tradeBuyPrice;
                            requiredTradeRoutes[otherId]++;
                            requiredTradeRoutes[resource.id]++;
                            remainingRoutes -= unassignStep;
                            continue assignLoop;
                        }
                    }
                    // Couldn't remove route, stop asigning
                    break outerLoop;
                }
            }
        }

        // Adjust our trade routes - always adjust towards zero first to free up trade routes
        let adjustmentTradeRoutes = [];
        for (let i = 0; i < tradableResources.length; i++) {
            let resource = tradableResources[i];
            if (requiredTradeRoutes[resource.id] === undefined) {
                continue;
            }
            adjustmentTradeRoutes[i] = requiredTradeRoutes[resource.id] - resource.tradeRoutes;

            if (requiredTradeRoutes[resource.id] === 0 && resource.tradeRoutes !== 0) {
                MarketManager.zeroTradeRoutes(resource);
                adjustmentTradeRoutes[i] = 0;
            } else if (adjustmentTradeRoutes[i] > 0 && resource.tradeRoutes < 0) {
                MarketManager.addTradeRoutes(resource, adjustmentTradeRoutes[i]);
                adjustmentTradeRoutes[i] = 0;
            } else if (adjustmentTradeRoutes[i] < 0 && resource.tradeRoutes > 0) {
                MarketManager.removeTradeRoutes(resource, -1 * adjustmentTradeRoutes[i]);
                adjustmentTradeRoutes[i] = 0;
            }
        }

        // Adjust our trade routes - we've adjusted towards zero, now adjust the rest
        for (let i = 0; i < tradableResources.length; i++) {
            let resource = tradableResources[i];
            if (requiredTradeRoutes[resource.id] === undefined) {
                continue;
            }

            if (adjustmentTradeRoutes[i] > 0) {
                MarketManager.addTradeRoutes(resource, adjustmentTradeRoutes[i]);
            } else if (adjustmentTradeRoutes[i] < 0) {
                MarketManager.removeTradeRoutes(resource, -1 * adjustmentTradeRoutes[i]);
            }
        }
        // It does change rates of changes of resources, but we don't want to store this changes.
        // Sold resources can be easily reclaimed, and we want to be able to use it for production, ejecting, upkeep, etc, so let's pretend they're still here
        // And bought resources are dungerous to use - we don't want to end with negative income after recalculating trades
        resources.Money.rateOfChange = currentMoneyPerSecond;
    }

