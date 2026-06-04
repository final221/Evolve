    class Job {
        constructor(id, name, flags) {
            this._originalId = id;
            this._originalName = name;
            this._workerBinding = "civ-" + this._originalId;

            this.is = normalizeProperties(flags) ?? {};
        }

        get autoJobEnabled() { return settings['job_' + this._originalId] }
        get isSmartEnabled() { return settings['job_s_' + this._originalId] }
        get priority() { return settingsRaw['job_p_' + this._originalId] }
        getBreakpoint(n) { return settings[`job_b${n+1}_${this._originalId}`] }

        get definition() {
            return game.global.civic[this._originalId];
        }

        get id() {
            return this.definition.job;
        }

        get name() {
            return this.definition.name;
        }

        isUnlocked() {
            return this.definition.display;
        }

        isManaged() {
            if (!this.isUnlocked()) {
                return false;
            }

            return this.autoJobEnabled;
        }

        get workers() {
            return this.definition.workers;
        }

        get servants() {
            return 0;
        }

        get count() {
            return this.workers + (this.servants * traitVal('high_pop', 0, 1));
        }

        get max() {
            return this.definition.max;
        }

        breakpointEmployees(breakpoint, ignoreMax) {
            let breakpointActual = this.getBreakpoint(breakpoint);

            // -1 equals unlimited up to the maximum available jobs for this job
            if (breakpointActual === -1) {
                breakpointActual = Number.MAX_SAFE_INTEGER;
            } else if (settings.jobScalePop && this._originalId !== "hell_surveyor"){
                breakpointActual *= traitVal('high_pop', 0, 1);
            }

            // return the actual workers required for this breakpoint (either our breakpoint or our max, whichever is lower)
            return ignoreMax ? breakpointActual : Math.min(breakpointActual, this.max);
        }

        addWorkers(count) {
            if (this.isDefault()) {
                return false;
            }
            if (count < 0) {
                this.removeWorkers(-1 * count);
            }

            let vue = getVueById(this._workerBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.add();
            }
        }

        removeWorkers(count) {
            if (this.isDefault()) {
                return false;
            }
            if (count < 0) {
                this.addWorkers(-1 * count);
            }

            let vue = getVueById(this._workerBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.sub();
            }
        }

        isDefault() {
            return false;
        }
    }

    class BasicJob extends Job {
        constructor(...args) {
            super(...args);

            this._servantBinding = "servant-" + this._originalId;
        }

        get servants() {
            return game.global.race.servants?.jobs[this._originalId] ?? 0;
        }

        get max() {
            return Number.MAX_SAFE_INTEGER;
        }

        addServants(count) {
            if (count < 0) {
                this.removeServants(-1 * count);
            }

            let vue = getVueById(this._servantBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.add();
            }
        }

        removeServants(count) {
            if (count < 0) {
                this.addServants(-1 * count);
            }

            let vue = getVueById(this._servantBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.sub();
            }
        }

        isDefault() {
            return game.global.civic.d_job === this.id;
        }

        setAsDefault() {
            getVueById(this._workerBinding)?.setDefault(this.id);
        }
    }

    class CraftingJob extends Job {
        constructor(id, name, resource) {
            super(id, name, {serve: true});

            this._crafterBinding = "foundry";
            this._servantBinding = "skilledServants";
            this.resource = resource;
        }

        get definition() {
            return game.global.civic['craftsman'];
        }

        get id() {
            return this.resource.id;
        }

        isUnlocked() {
            return game.global.resource[this._originalId].display;
        }

        get servants() {
            return game.global.race.servants?.sjobs[this._originalId] ?? 0;
        }

        get workers() {
            return game.global.city.foundry?.[this._originalId] ?? 0;
        }

        get max() {
            return game.global.civic.craftsman.max;
        }

        addWorkers(count) {
            if (!this.isUnlocked()) {
                return false;
            }
            if (count < 0) {
                this.removeWorkers(-1 * count);
            }

            let vue = getVueById(this._crafterBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.add(this._originalId);
            }
        }

        removeWorkers(count) {
            if (!this.isUnlocked()) {
                return false;
            }
            if (count < 0) {
                this.addWorkers(-1 * count);
            }

            let vue = getVueById(this._crafterBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.sub(this._originalId);
            }
        }

        addServants(count) {
            if (count < 0) {
                this.removeServants(-1 * count);
            }

            let vue = getVueById(this._servantBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.add(this._originalId);
            }
        }

        removeServants(count) {
            if (count < 0) {
                this.addServants(-1 * count);
            }

            let vue = getVueById(this._servantBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.sub(this._originalId);
            }
        }
    }

    class Resource {
        constructor(name, id, flags) {
            this.name = name;
            this._id = id;

            this.currentQuantity = 0;
            this.maxQuantity = 0;
            this.rateOfChange = 0;
            this.rateMods = {};
            this.tradeBuyPrice = 0;
            this.tradeSellPrice = 0;
            this.tradeRoutes = 0;
            this.incomeAdusted = false;

            this.maxCost = 0;
            this.storageRequired = 1;
            this.requestedQuantity = 0;
            this.cost = {};

            this._vueBinding = "res" + id;
            this._stackVueBinding = "stack-" + id;
            this._marketVueBinding = "market-" + id;

            this.is = normalizeProperties(flags) ?? {};
        }

        get autoCraftEnabled() { return settings['craft' + this.id] }
        get craftWeighting() { return settings['foundry_w_' + this.id] }
        get craftPreserve() { return settings['foundry_p_' + this.id] }
        get autoStorageEnabled() { return settings['res_storage' + this.id] }
        get storagePriority() { return settingsRaw['res_storage_p_' + this.id] }
        get storeOverflow() { return settings['res_storage_o_' + this.id] }
        get minStorage() { return settings['res_min_store' + this.id] }
        get maxStorage() { return settings['res_max_store' + this.id] }
        get marketPriority() { return settingsRaw['res_buy_p_' + this.id] }
        get autoBuyEnabled() { return settings['buy' + this.id] }
        get autoBuyRatio() { return settings['res_buy_r_' + this.id] }
        get autoSellEnabled() { return settings['sell' + this.id] }
        get autoSellRatio() { return settings['res_sell_r_' + this.id] }
        get autoTradeBuyEnabled() { return settings['res_trade_buy_' + this.id] }
        get autoTradeSellEnabled() { return settings['res_trade_sell_' + this.id] }
        get autoTradeWeighting() { return settings['res_trade_w_' + this.id] }
        get autoTradePriority() { return settings['res_trade_p_' + this.id] }
        get galaxyMarketWeighting() { return settings['res_galaxy_w_' + this.id] }
        get galaxyMarketPriority() { return settings['res_galaxy_p_' + this.id] }

        get title() {
            return this.instance?.name || this.name;
        }

        get instance() {
            return game.global.resource[this.id];
        }

        get id() {
            return this._id;
        }

        get currentCrates() {
            return this.instance.crates;
        }

        get currentContainers() {
            return this.instance.containers;
        }

        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            let instance = this.instance;
            this.currentQuantity = instance.amount;
            this.maxQuantity = instance.max >= 0 ? instance.max : Number.MAX_SAFE_INTEGER;
            this.rateOfChange = instance.diff;
            this.rateMods = {};
            this.incomeAdusted = false;
        }

        finalizeData() {
            if (!this.isUnlocked() || this.constructor !== Resource) { // Only needed for base resources
                return;
            }

            // When routes are managed - we're excluding trade diff from operational rate of change.
            if (settings.autoMarket && this.is.tradable) {
                this.tradeRoutes = this.instance.trade;
                this.tradeBuyPrice = game.tradeBuyPrice(this._id);
                this.tradeSellPrice = game.tradeSellPrice(this._id);
                let tradeDiff = game.breakdown.p.consume[this._id]?.Trade || 0;
                if (tradeDiff > 0) {
                    this.rateMods['buy'] = tradeDiff * -1;
                } else if (tradeDiff < 0) {
                    this.rateMods['sell'] = tradeDiff * -1;
                    this.rateOfChange += this.rateMods['sell'];
                }
            }

            // Restore decayed rate
            if (game.global.race['decay'] && this.tradeRouteQuantity > 0 && this.currentQuantity >= 50) {
                this.rateMods['decay'] = (this.currentQuantity - 50) * (0.001 * this.tradeRouteQuantity);
                this.rateOfChange += this.rateMods['decay'];
            }
        }

        calculateRateOfChange(apply) {
            let value = this.rateOfChange;
            for (let mod in this.rateMods) {
                if (apply[mod] ?? apply.all) {
                    value -= this.rateMods[mod];
                }
            }
            return value;
        }

        isDemanded() {
            return this.requestedQuantity > this.currentQuantity;
        }

        get income() {
            return this.calculateRateOfChange({buy: false, all: true});
        }

        get spareQuantity() {
            return this.currentQuantity - this.requestedQuantity;
        }

        get spareMaxQuantity() {
            return this.maxQuantity - this.requestedQuantity;
        }

        isUnlocked() {
            return this.instance?.display ?? false;
        }

        isRoutesUnlocked() {
            return this.isUnlocked() && !(this === resources.Food && (game.global.race['artifical'] || game.global.race['fasting'])) && ((game.global.race['banana'] && this === resources.Food) || (game.global.tech['trade'] && !game.global.race['terrifying']));
        }

        isManagedStorage() {
            return this.hasStorage() && this.autoStorageEnabled;
        }

        get atomicMass() {
            return game.atomic_mass[this.id] ?? 0;
        }

        isUseful() {
            /* This check always cause issues, i'll just disable it for now
            // Spending accumulated resources
            if (settings.autoStorage && settings.storageSafeReassign && !this.storeOverflow && this.currentQuantity > this.minStorage && this.currentQuantity > this.storageRequired &&
              ((this.currentCrates > 0 && this.maxQuantity - StorageManager.crateValue > this.storageRequired) ||
               (this.currentContainers > 0 && this.maxQuantity - StorageManager.containerValue > this.storageRequired))) {
                return false;
            }
            */
            return this.storageRatio < 0.99 || this.isDemanded() || this.rateMods['eject'] > 0 || this.rateMods['supply'] > 0 || (this.storeOverflow && this.currentQuantity < this.maxStorage);
        }

        getProduction(source, locArg) {
            let produced = 0;
            let labelFound = false;
            for (let [label, value] of Object.entries(game.breakdown.p[this._id] ?? {})) {
                if (value.indexOf("%") === -1) {
                    if (labelFound) {
                        break;
                    } else if (label === poly.loc(source, locArg)) {
                        labelFound = true;
                        produced += parseFloat(value) || 0;
                    }
                } else if (labelFound && this.isValidProductionLabel(label)) {
                    produced *= 1 + (parseFloat(value) || 0) / 100;
                }
            }
            return produced * state.globalProductionModifier;
        }

        isValidProductionLabel(label) {
            // Bug as of 1.3.11a: Space Syndicate is already applied to the displayed base value
            // The calculations are correct though
            // This can cause constant Iron flicker in Truepath because the script thinks
            // a worker is producing more than the constant smelter consumption.
            if (this._id === "Iron" && label === `ᄂ${poly.loc('space_syndicate')}`)
                return false;

            // Everything else is valid (at least for now)
            return true;
        }

        getBusyWorkers(workersSource, workersCount, locArg) {
            if (this.incomeAdusted) { // Don't reduce workers of same resource more than once per tick to avoid flickering
                return workersCount;
            }

            let newWorkers = 0;
            if (workersCount > 0) {
                let totalIncome = this.getProduction(workersSource, locArg);
                let resPerWorker = totalIncome / workersCount;
                let usedIncome = totalIncome - this.income;
                if (usedIncome > 0) {
                    newWorkers = Math.ceil(usedIncome / resPerWorker);
                }
            } else if (this.income < 0) {
                newWorkers = 1;
            }

            return newWorkers;
        }

        isCraftable() {
            return game.craftCost.hasOwnProperty(this.id);
        }

        hasStorage() {
            return this.instance?.stackable ?? false;
        }

        get tradeRouteQuantity() {
            return game.tradeRatio[this.id] || -1;
        }

        get storageRatio() {
            return this.maxQuantity > 0 ? this.currentQuantity / this.maxQuantity : 1;
        }

        isCapped() {
            return this.maxQuantity > 0 ? this.currentQuantity + (this.rateOfChange / ticksPerSecond()) >= this.maxQuantity : true;
        }

        get usefulRatio() {
            return this.maxQuantity > 0 && this.storageRequired > 0 ? this.currentQuantity / Math.min(this.maxQuantity, this.storageRequired) : 1;
        }

        get timeToFull() {
            if (this.storageRatio > 0.98) {
                return Number.MIN_SAFE_INTEGER; // Already full.
            }
            let totalRateOfCharge = this.income;
            if (totalRateOfCharge <= 0) {
                return Number.MAX_SAFE_INTEGER; // Won't ever fill with current rate.
            }
            return (this.maxQuantity - this.currentQuantity) / totalRateOfCharge;
        }

        get timeToRequired() {
            if (this.storageRatio > 0.98) {
                return Number.MIN_SAFE_INTEGER; // Already full.
            }
            if (this.storageRequired <= 1) {
                return 0;
            }
            let totalRateOfCharge = this.income;
            if (totalRateOfCharge <= 0) {
                return Number.MAX_SAFE_INTEGER; // Won't ever fill with current rate.
            }
            return (Math.min(this.maxQuantity, this.storageRequired) - this.currentQuantity) / totalRateOfCharge;
        }

        tryCraftX(count) {
            let vue = getVueById(this._vueBinding);
            if (vue === undefined) { return false; }

            KeyManager.set(false, false, false);
            vue.craft(this.id, count);
        }

        requestQuantity(req) {
            if (this.requestedQuantity < req) {
                // We can't request more than our storage.
                // TODO: Resources with consumption can usually never be max due to game processing order
                // and should have their request quantity limit a little lower than max.
                req = Math.min(req, this.maxQuantity);
                this.requestedQuantity = req;
            }
        }
    }

    class SoulGem extends Resource {
        updateData() {
            super.updateData();
            this.rateOfChange = state.soulGemPerHour / 3600;
        }
    }

    class Troops extends Resource {
        updateData() {
            if (!this.isUnlocked()) {
                return;
            }


            this.currentQuantity = WarManager.currentCityGarrison;
            this.maxQuantity = WarManager.maxCityGarrison;
            this.rateOfChange = 0;
        }

        isUnlocked() {
            return WarManager._garrisonVue !== undefined;
        }
    }

    class Supply extends Resource {
        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            this.currentQuantity = game.global.portal.purifier.supply;
            this.maxQuantity = game.global.portal.purifier.sup_max;
            this.rateOfChange = game.global.portal.purifier.diff;
        }

        isUnlocked() {
            return game.global.portal.hasOwnProperty('purifier');
        }
    }

    class Power extends Resource {
        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            this.currentQuantity = game.global.city.power;
            if (haveTask("replicate")) {
                this.currentQuantity += game.global.race.replicator.pow;
            }
            this.rateOfChange = this.currentQuantity;

            this.maxQuantity = 0;
            if (game.global.race.powered) {
                this.maxQuantity += (resources.Population.maxQuantity - resources.Population.currentQuantity) * traitVal('powered', 0);
            }
            for (let building of Object.values(buildings)) {
                if (building.stateOffCount > 0) {
                    let missingAmount = building.stateOffCount;
                    if (building.autoMax < building.count && settings.masterScriptToggle && settings.autoPower && building.autoStateEnabled && settings.buildingsLimitPowered) {
                        missingAmount -= building.count - building.autoMax;
                    }

                    if (building === buildings.NeutronCitadel) {
                        this.maxQuantity += getCitadelConsumption(building.stateOnCount + missingAmount) - getCitadelConsumption(building.stateOnCount);
                    } else {
                        this.maxQuantity += missingAmount * building.powered;
                    }
                }
            }
        }

        get usefulRatio() { // Could be useful for satisfied check in override
            return this.currentQuantity >= this.maxQuantity ? 1 : 0;
        }

        isUnlocked() {
            return game.global.city.powered;
        }
    }

    class Support extends Resource {
        // This isn't really a resource but we're going to make a dummy one so that we can treat it like a resource
        constructor(name, id, region, inRegionId) {
            super(name, id);

            this._region = region;
            this._inRegionId = inRegionId;
        }

        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            this.maxQuantity = game.global[this._region][this.supportId].s_max;
            this.currentQuantity = game.global[this._region][this.supportId].support;
            this.rateOfChange = this.maxQuantity - this.currentQuantity;
        }

        get supportId() {
            return game.actions[this._region][this._inRegionId].info.support;
        }

        get storageRatio() {
            return this.maxQuantity > 0 ? (this.maxQuantity - this.currentQuantity) / this.maxQuantity : 1;
        }

        isUnlocked() {
            return game.global[this._region][this.supportId] !== undefined;
        }
    }

    class BeltSupport extends Support {
        // Unlike other supports this one takes in account available workers
        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            let maxStations = settings.autoPower && buildings.BeltSpaceStation.autoStateEnabled ? buildings.BeltSpaceStation.count : buildings.BeltSpaceStation.stateOnCount;
            let maxWorkers = settings.autoJobs && jobs.SpaceMiner.autoJobEnabled && jobs.SpaceMiner.isSmartEnabled ? state.maxSpaceMiners : jobs.SpaceMiner.count;
            this.maxQuantity = Math.min(maxStations * 3 * traitVal('high_pop', 0, 1), maxWorkers);
            this.currentQuantity = game.global[this._region][this.supportId].support;
            this.rateOfChange = this.maxQuantity - this.currentQuantity;
        }
    }

    class ElectrolysisSupport extends Support {
        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            this.maxQuantity = buildings.TitanElectrolysis.stateOnCount;
            this.currentQuantity = buildings.TitanHydrogen.stateOnCount;
            this.rateOfChange = this.maxQuantity - this.currentQuantity;
        }

        isUnlocked() {
            return game.global.race['truepath'] ? true : false;
        }
    }

    class WomlingsSupport extends Support {
        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            this.maxQuantity = buildings.TauRedWomlingVillage.stateOnCount * (haveTech("womling_pop", 2) ? 6 : 5);
            this.currentQuantity = buildings.TauRedWomlingFarm.stateOnCount * 2 + buildings.TauRedWomlingLab.stateOnCount + buildings.TauRedWomlingMine.stateOnCount * 6;
            this.rateOfChange = this.maxQuantity - this.currentQuantity; // - game.global.tauceti.overseer.injured
        }

        isUnlocked() {
            return haveTech('tau_red', 5) ? true : false;
        }
    }

    class PrestigeResource extends Resource {
        updateData() {
            this.currentQuantity = game.global.prestige[this.id].count;
            this.maxQuantity = Number.MAX_SAFE_INTEGER;
        }

        isUnlocked() {
            return true;
        }
    }

    class Population extends Resource {
        get id() {
            // The population node is special and its id will change to the race name
            return game.global.race.species;
        }
    }

    class Morale extends Resource {
        updateData() {
            this.currentQuantity = game.global.city.morale.current;
            this.maxQuantity = game.global.city.morale.cap;
            this.rateOfChange = game.global.city.morale.potential;
            this.incomeAdusted = false;
        }

        isUnlocked() {
            return true;
        }
    }

    class Thrall extends Resource {
        updateData() {
            if (!this.isUnlocked()) {
                return;
            }

            this.currentQuantity = 0;
            this.rateOfChange = 0;
            for (let i = 0; i < game.global.city.surfaceDwellers.length; i++) {
                this.currentQuantity += game.global.city.captive_housing[`race${i}`];
                this.rateOfChange += game.global.city.captive_housing[`jailrace${i}`];
            }
            this.currentQuantity += this.rateOfChange;
            this.maxQuantity = game.global.city.captive_housing.raceCap;
        }

        isUnlocked() {
            return game.global.city.captive_housing ? true : false;
        }
    }

    class ResourceProductionCost {
        constructor(resource, quantity, minRateOfChange) {
            this.resource = resource;
            this.quantity = quantity;
            this.minRateOfChange = minRateOfChange;
        }
    }

