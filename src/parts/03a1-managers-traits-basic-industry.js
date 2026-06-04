    var MinorTraitManager = {
        priorityList: [],
        _traitVueBinding: "geneticBreakdown",

        isUnlocked() {
            return haveTech("genetics", 3);
        },

        sortByPriority() {
            this.priorityList.sort((a, b) => a.priority - b.priority);
        },

        managedPriorityList() {
            return this.priorityList.filter(trait => trait.enabled && trait.isUnlocked());
        },

        buyTrait(traitName) {
            getVueById(this._traitVueBinding)?.gene(traitName);
        }
    }

    var MutableTraitManager = {
        priorityList: [],
        _traitVueBinding: "geneticBreakdown",

        isUnlocked() {
            return haveTech("genetics", 3) && game.global.genes['mutation'];
        },

        sortByPriority() {
            this.priorityList.sort((a, b) => a.priority - b.priority);
        },

        gainTrait(traitName) {
            getVueById(this._traitVueBinding)?.gain(traitName);
        },

        purgeTrait(traitName) {
            getVueById(this._traitVueBinding)?.purge(traitName);
        },

        get minimumPlasmidsToPreserve() {
            return Math.max(0, settings.minimumPlasmidsToPreserve, settings.doNotGoBelowPlasmidSoftcap ? resources.Phage.currentQuantity + 250 : 0);
        }
    }

    var QuarryManager = {
        _industryVueBinding: "iQuarry",
        _industryVue: undefined,

        initIndustry() {
            if (!game.global.race['smoldering'] || buildings.RockQuarry.count < 1) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        currentProduction() {
            return game.global.city.rock_quarry.asbestos;
        },

        increaseProduction(count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.decreaseProduction(count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.add();
            }
        },

        decreaseProduction(count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.increaseProduction(count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.sub();
            }
        }
    }

    var MineManager = {
        _industryVueBinding: "iTMine",
        _industryVue: undefined,

        initIndustry() {
            if (buildings.TitanMine.count < 1) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        currentProduction() {
            return game.global.space.titan_mine.ratio;
        },

        increaseProduction(count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.decreaseProduction(count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.add();
            }
        },

        decreaseProduction(count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.increaseProduction(count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.sub();
            }
        }
    }

    var ExtractorManager = {
        _industryVueBinding: "iMiningShip",
        _industryVue: undefined,

        initIndustry() {
            if (!haveTech("tau_roid", 4) || buildings.TauBeltMiningShip.count < 1) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        currentProduction(production) {
            return game.global.tauceti.mining_ship[production];
        },

        increaseProduction(production, count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.decreaseProduction(production, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.add(production);
            }
        },

        decreaseProduction(production, count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.increaseProduction(production, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.sub(production);
            }
        }
    }

    var NaniteManager = {
        _industryVueBinding: "iNFactory",
        _industryVue: undefined,
        storageShift: 1.005,
        priorityList: [],

        // export const nf_resources from industry.js
        Resources: [
            'Lumber', 'Chrysotile', 'Stone', 'Crystal', 'Furs', 'Copper', 'Iron', 'Aluminium',
            'Cement', 'Coal', 'Oil', 'Uranium', 'Steel', 'Titanium', 'Alloy', 'Polymer',
            'Iridium', 'Helium_3', 'Water', 'Deuterium', 'Neutronium', 'Adamantite', 'Bolognium', 'Orichalcum',
        ],

        resEnabled: (id) => settings['res_nanite' + id],

        isUnlocked() {
            return game.global.race['deconstructor'] && (buildings.NaniteFactory.count > 0 || buildings.RedNaniteFactory.count > 0 || buildings.TauNaniteFactory.count > 0);
        },

        isUseful() {
            return resources.Nanite.storageRatio < 1;
        },

        initIndustry() {
            if (!this.isUnlocked()) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        isConsumable(res) {
            return this.Resources.includes(res.id);
        },

        updateResources() {
            if (!this.isUnlocked() || !settings.autoNanite) {
                return;
            }
            for (let resource of this.priorityList) {
                if (resource.isUnlocked()) {
                    resource.rateMods['nanite'] = this.currentConsume(resource.id);
                    resource.rateOfChange += resource.rateMods['nanite'];
                }
            }
        },

        managedPriorityList() {
            return this.priorityList;
        },

        maxConsume() {
            return game.global.city.nanite_factory.count * 50;
        },

        currentConsume(id) {
            return game.global.city.nanite_factory[id];
        },

        useRatio() {
            switch (settings.naniteMode) {
                case "cap":
                    return [0.965];
                case "excess":
                    return [-1];
                case "all":
                    return [0.035];
                case "mixed":
                    return [0.965, -1];
                case "full":
                    return [0.965, -1, 0.035];
                default:
                    return [];
            }
        },

        maxConsumeCraftable(resource) {
            let extraIncome = resource.rateOfChange;
            let extraStore = resource.currentQuantity - (resource.storageRequired * this.storageShift);
            return Math.max(extraIncome, extraStore);
        },

        maxConsumeForRatio(resource, keepRatio) {
            let extraIncome = resource.rateOfChange;
            let extraStore = (resource.storageRatio - keepRatio) * resource.maxQuantity;
            return Math.max(extraIncome, extraStore);
        },

        consumeMore(id, count) {
            resources[id].rateMods['nanite'] += count;

            for (let m of KeyManager.click(count)) {
                this._industryVue.addItem(id);
            }
        },

        consumeLess(id, count) {
            resources[id].rateMods['nanite'] -= count;

            for (let m of KeyManager.click(count)) {
                this._industryVue.subItem(id);
            }
        }
    }

    var SupplyManager = {
        _supplyVuePrefix: "supply",
        storageShift: 1.010,
        priorityList: [],

        resEnabled: (id) => settings['res_supply' + id],

        isUnlocked() {
            return buildings.LakeTransport.count > 0;
        },

        isUseful() {
            return resources.Supply.storageRatio < 1 && buildings.LakeTransport.stateOnCount > 0 && buildings.LakeBireme.stateOnCount > 0;
        },

        initIndustry() {
            return this.isUnlocked();
        },

        isConsumable(res) {
            return poly.supplyValue.hasOwnProperty(res.id);
        },

        updateResources() {
            if (!this.isUnlocked() || !settings.autoSupply) {
                return;
            }
            for (let resource of this.priorityList) {
                if (resource.isUnlocked()) {
                    resource.rateMods['supply'] = this.currentConsume(resource.id) * this.supplyOut(resource.id);
                    resource.rateOfChange += resource.rateMods['supply'];
                }
            }
        },

        supplyIn(id) {
            return poly.supplyValue[id]?.in ?? 0;
        },

        supplyOut(id) {
            return poly.supplyValue[id]?.out ?? 0;
        },

        managedPriorityList() {
            return this.priorityList;
        },

        maxConsume() {
            return game.global.portal.transport.cargo.max;
        },

        currentConsume(id) {
            return game.global.portal.transport.cargo[id];
        },

        useRatio() {
            switch (settings.supplyMode) {
                case "cap":
                    return [0.975];
                case "excess":
                    return [-1];
                case "all":
                    return [0.045];
                case "mixed":
                    return [0.975, -1];
                case "full":
                    return [0.975, -1, 0.045];
                default:
                    return [];
            }
        },

        maxConsumeCraftable(resource) {
            let extraIncome = resource.calculateRateOfChange({buy: false, nanite: true});
            let extraStore = resource.currentQuantity - (resource.storageRequired * this.storageShift);
            return Math.max(extraIncome, extraStore) / this.supplyOut(resource.id);
        },

        maxConsumeForRatio(resource, keepRatio) {
            let extraIncome = resource.calculateRateOfChange({buy: false, nanite: true});
            let extraStore = (resource.storageRatio - keepRatio) * resource.maxQuantity;
            return Math.max(extraIncome, extraStore) / this.supplyOut(resource.id);
        },

        consumeMore(id, count) {
            let vue = getVueById(this._supplyVuePrefix + id);
            if (vue === undefined) { return false; }

            resources[id].rateMods['supply'] += (count * this.supplyOut(id));

            for (let m of KeyManager.click(count)) {
                vue.supplyMore(id);
            }
        },

        consumeLess(id, count) {
            let vue = getVueById(this._supplyVuePrefix + id);
            if (vue === undefined) { return false; }

            resources[id].rateMods['supply'] -= (count * this.supplyOut(id));

            for (let m of KeyManager.click(count)) {
                vue.supplyLess(id);
            }
        }
    }

