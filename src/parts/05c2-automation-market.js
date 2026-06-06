    function autoMarket(bulkSell, ignoreSellRatio) {
        if (!MarketManager.isUnlocked()) {
            return;
        }

        adjustTradeRoutes();

        // Manual trade disabled
        if (game.global.race['no_trade']) {
            return;
        }

        let minimumMoneyAllowed = Math.max(resources.Money.maxQuantity * settings.minimumMoneyPercentage / 100, settings.minimumMoney);

        let currentMultiplier = MarketManager.multiplier; // Save the current multiplier so we can reset it at the end of the function
        let maxMultiplier = MarketManager.getMaxMultiplier();

        for (let i = 0; i < MarketManager.priorityList.length; i++) {
            let resource = MarketManager.priorityList[i];

            if (!resource.is.tradable || !resource.isUnlocked() || !MarketManager.isBuySellUnlocked(resource)) {
                continue;
            }

            applyMarketTradeAction(planMarketSellAction(resource, { ignoreSellRatio, maxMultiplier }));

            if (bulkSell === true) {
                continue;
            }

            applyMarketTradeAction(planMarketBuyAction(resource, { minimumMoneyAllowed, maxMultiplier }));
        }

        MarketManager.setMultiplier(currentMultiplier); // Reset multiplier
    }

    function planMarketSellAction(resource, context = {}) {
        const ignoreSellRatio = context.ignoreSellRatio ?? false;
        const maxMultiplier = context.maxMultiplier ?? MarketManager.getMaxMultiplier();
        const activeResources = context.resources ?? resources;
        const manager = context.manager ?? MarketManager;
        const currentTicksPerSecond = context.ticksPerSecond ?? ticksPerSecond;

        if (!resource.autoSellEnabled || (!ignoreSellRatio && resource.storageRatio < resource.autoSellRatio)) {
            return null;
        }

        let maxAllowedTotalSellPrice = activeResources.Money.maxQuantity - activeResources.Money.currentQuantity;
        let unitSellPrice = manager.getUnitSellPrice(resource);
        let maxAllowedUnits = Math.floor(maxAllowedTotalSellPrice / unitSellPrice); // only sell up to our maximum money

        if (resource.storageRatio > resource.autoSellRatio) {
            maxAllowedUnits = Math.min(maxAllowedUnits, Math.floor(resource.currentQuantity - (resource.autoSellRatio * resource.maxQuantity))); // If not full sell up to our sell ratio
        } else {
            maxAllowedUnits = Math.min(maxAllowedUnits, Math.floor(resource.income * 2 / currentTicksPerSecond())); // If resource is full then sell up to 2 ticks worth of production
        }

        if (maxAllowedUnits <= maxMultiplier) {
            // Our current max multiplier covers the full amount that we want to sell
            return { type: "sell", resource, multiplier: maxAllowedUnits, repetitions: 1 };
        }

        // Our current max multiplier doesn't cover the full amount that we want to sell. Sell up to 5 batches.
        return { type: "sell", resource, multiplier: maxMultiplier, repetitions: Math.min(5, Math.floor(maxAllowedUnits / maxMultiplier)) }; // Allow up to 5 sales per script loop
    }

    function planMarketBuyAction(resource, context = {}) {
        const minimumMoneyAllowed = context.minimumMoneyAllowed ?? Math.max(resources.Money.maxQuantity * settings.minimumMoneyPercentage / 100, settings.minimumMoney);
        const maxMultiplier = context.maxMultiplier ?? MarketManager.getMaxMultiplier();
        const activeResources = context.resources ?? resources;
        const manager = context.manager ?? MarketManager;

        if (resource.autoBuyEnabled !== true || resource.storageRatio >= resource.autoBuyRatio || activeResources.Money.isDemanded()) {
            return null;
        }

        let storableAmount = Math.floor((resource.autoBuyRatio - resource.storageRatio) * resource.maxQuantity);
        let affordableAmount = Math.floor((activeResources.Money.currentQuantity - minimumMoneyAllowed) / manager.getUnitBuyPrice(resource));
        let maxAllowedUnits = Math.min(storableAmount, affordableAmount);
        if (maxAllowedUnits <= 0) {
            return null;
        }
        if (maxAllowedUnits <= maxMultiplier){
            return { type: "buy", resource, multiplier: maxAllowedUnits, repetitions: 1 };
        }

        return { type: "buy", resource, multiplier: maxMultiplier, repetitions: Math.min(5, Math.floor(maxAllowedUnits / maxMultiplier)) };
    }

    function applyMarketTradeAction(action, manager = MarketManager) {
        if (!action) {
            return;
        }

        manager.setMultiplier(action.multiplier);
        for (let j = 0; j < action.repetitions; j++) {
            if (action.type === "sell") {
                manager.sell(action.resource);
            } else if (action.type === "buy") {
                manager.buy(action.resource);
            }
        }
    }

    function autoGalaxyMarket() {
        // If not unlocked then nothing to do
        if (!GalaxyTradeManager.initIndustry()) {
            return;
        }

        let tradeAdjustments = planGalaxyMarketAssignments();
        applyGalaxyMarketAssignments(poly.galaxyOffers, tradeAdjustments);
    }

    function planGalaxyMarketAssignments(offers = poly.galaxyOffers, context = {}) {
        const activeResources = context.resources ?? resources;
        const activeSettings = context.settings ?? settings;
        const manager = context.manager ?? GalaxyTradeManager;
        const groupByPriority = context.buildPriorityList ?? buildPriorityList;

         // Init adjustment, and sort groups by priorities
        let tradeAdjustments = {};
        let priorityList = groupByPriority(offers, (trade) => {
            let buyResource = activeResources[trade.buy.res];
            let priority = 0;
            if (buyResource.galaxyMarketWeighting > 0) {
                priority = buyResource.isDemanded() ? Math.max(buyResource.galaxyMarketPriority, 100) : buyResource.galaxyMarketPriority;
            }
            tradeAdjustments[buyResource.id] = 0;
            return priority;
        });

        // Calculate amount of factories per product
        let remainingFreighters = manager.maxOperating();
        for (let i = 0; i < priorityList.length && remainingFreighters > 0; i++) {
            let trades = priorityList[i].sort((a, b) => activeResources[a.buy.res].galaxyMarketWeighting - activeResources[b.buy.res].galaxyMarketWeighting);
            while (remainingFreighters > 0) {
                let freightersToDistribute = remainingFreighters;
                let totalPriorityWeight = trades.reduce((sum, trade) => sum + activeResources[trade.buy.res].galaxyMarketWeighting, 0);

                for (let j = trades.length - 1; j >= 0 && remainingFreighters > 0; j--) {
                    let trade = trades[j];
                    let buyResource = activeResources[trade.buy.res];
                    let sellResource = activeResources[trade.sell.res];

                    let calculatedRequiredFreighters = Math.min(remainingFreighters, Math.max(1, Math.floor(freightersToDistribute / totalPriorityWeight * buyResource.galaxyMarketWeighting)));
                    let actualRequiredFreighters = calculatedRequiredFreighters;
                    if (!buyResource.isUseful() || sellResource.isDemanded() || sellResource.storageRatio < activeSettings.marketMinIngredients) {
                        actualRequiredFreighters = 0;
                    }

                    if (actualRequiredFreighters > 0){
                        remainingFreighters -= actualRequiredFreighters;
                        tradeAdjustments[buyResource.id] += actualRequiredFreighters;
                    }

                    // We assigned less than wanted, i.e. we either don't need this product, or can't afford it. In both cases - we're done with it.
                    if (actualRequiredFreighters < calculatedRequiredFreighters) {
                        trades.splice(j, 1);
                    }
                }

                if (freightersToDistribute === remainingFreighters) {
                    break;
                }
            }
        }

        return tradeAdjustments;
    }

    function applyGalaxyMarketAssignments(offers, tradeAdjustments, manager = GalaxyTradeManager) {
        let tradeDeltas = offers.map((trade, index) => tradeAdjustments[trade.buy.res] - manager.currentProduction(index));

        // TODO: Add GalaxyTradeManager.zeroProduction() to save some clicks.
        tradeDeltas.forEach((value, index) => value < 0 && manager.decreaseProduction(index, value * -1));
        tradeDeltas.forEach((value, index) => value > 0 && manager.increaseProduction(index, value));
    }
