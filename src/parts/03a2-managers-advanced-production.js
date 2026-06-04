    var EjectManager = {
        _ejectVuePrefix: "eject",
        storageShift: 1.015,
        priorityList: [],

        resEnabled: (id) => settings['res_eject' + id],

        isUnlocked() {
            return buildings.BlackholeMassEjector.count > 0;
        },

        isUseful() {
            return true; // Never stop ejecting
        },

        initIndustry() {
            return this.isUnlocked();
        },

        isConsumable(res) {
            return game.atomic_mass.hasOwnProperty(res.id);
        },

        updateResources() {
            if (!this.isUnlocked() || (!settings.autoEject && !haveTask("trash"))) {
                return;
            }
            for (let resource of this.priorityList) {
                if (resource.isUnlocked()) {
                    resource.rateMods['eject'] = this.currentConsume(resource.id);
                    resource.rateOfChange += resource.rateMods['eject'];
                }
            }
        },

        managedPriorityList() {
            return !game.global.race['artifical'] ? this.priorityList
              : this.priorityList.filter(r => r !== resources.Food);
        },

        maxConsume() {
            return game.global.interstellar.mass_ejector.on * 1000;
        },

        currentConsume(id) {
            return game.global.interstellar.mass_ejector[id];
        },

        useRatio() {
            switch (settings.ejectMode) {
                case "cap":
                    return [0.985];
                case "excess":
                    return [-1];
                case "all":
                    return [0.055];
                case "mixed":
                    return [0.985, -1];
                case "full":
                    return [0.985, -1, 0.055];
                default:
                    return [];
            }
        },

        maxConsumeCraftable(resource) {
            let extraIncome = resource.calculateRateOfChange({buy: false, supply: true, nanite: true});
            let extraStore = resource.currentQuantity - (resource.storageRequired * this.storageShift);
            return Math.max(extraIncome, extraStore);
        },

        maxConsumeForRatio(resource, keepRatio) {
            let extraIncome = resource.calculateRateOfChange({buy: false, supply: true, nanite: true});
            let extraStore = (resource.storageRatio - keepRatio) * resource.maxQuantity;
            return Math.max(extraIncome, extraStore);
        },

        consumeMore(id, count) {
            let vue = getVueById(this._ejectVuePrefix + id);
            if (vue === undefined) { return false; }

            resources[id].rateMods['eject'] += count;

            for (let m of KeyManager.click(count)) {
                vue.ejectMore(id);
            }
        },

        consumeLess(id, count) {
            let vue = getVueById(this._ejectVuePrefix + id);
            if (vue === undefined) { return false; }

            resources[id].rateMods['eject'] -= count;

            for (let m of KeyManager.click(count)) {
                vue.ejectLess(id);
            }
        }
    }

    var AlchemyManager = {
        _alchemyVuePrefix: "alchemy",
        priorityList: [],

        resEnabled: id => settings['res_alchemy_' + id],
        resWeighting: id => settings['res_alchemy_w_' + id],

        isUnlocked() {
            return haveTech('alchemy');
        },

        managedPriorityList() {
            return this.priorityList.filter(res => this.resEnabled(res.id) && res.isUnlocked() && this.transmuteTier(res) <= game.global.tech.alchemy && (!game.global.race['artifical'] || res !== resources.Food));
        },

        transmuteTier(res) {
            return !game.tradeRatio.hasOwnProperty(res.id) || res === resources.Crystal ? 0 :
                   res.instance?.hasOwnProperty("trade") ? 1 : 2;
        },

        currentCount(id) {
            return game.global.race.alchemy[id];
        },

        transmuteMore(id, count) {
            let vue = getVueById(this._alchemyVuePrefix + id);
            if (vue === undefined) { return false; }

            resources.Mana.rateOfChange -= count * 1;
            resources.Crystal.rateOfChange -= count * 0.5;

            for (let m of KeyManager.click(count)) {
                vue.addSpell(id);
            }
        },

        transmuteLess(id, count) {
            let vue = getVueById(this._alchemyVuePrefix + id);
            if (vue === undefined) { return false; }

            resources.Mana.rateOfChange += count * 1;
            resources.Crystal.rateOfChange += count * 0.5;

            for (let m of KeyManager.click(count)) {
                vue.subSpell(id);
            }
        }
    }

    var RitualManager = {
        _industryVueBinding: "iPylon",
        _industryVue: undefined,

        Productions: addProps({
            Farmer: {id: 'farmer', isUnlocked: () => !game.global.race['orbit_decayed'] && !game.global.race['cataclysm'] && !game.global.race['carnivore'] && !game.global.race['soul_eater'] && !game.global.race['artifical'] && !game.global.race['unfathomable']},
            Miner: {id: 'miner', isUnlocked: () => !game.global.race['cataclysm']},
            Lumberjack: {id: 'lumberjack', isUnlocked: () => !game.global.race['orbit_decayed'] && !game.global.race['cataclysm'] && isLumberRace() && !game.global.race['evil']},
            Science: {id: 'science', isUnlocked: () => true},
            Factory: {id: 'factory', isUnlocked: () => true},
            Army: {id: 'army', isUnlocked: () => true},
            Hunting: {id: 'hunting', isUnlocked: () => true},
            Crafting: {id: 'crafting', isUnlocked: () => haveTech("magic", 4)},
        }, (s) => s.id, [{s: 'spell_w_', p: "weighting"}]),

        initIndustry() {
            if ((buildings.Pylon.count < 1 && buildings.RedPylon.count < 1 && buildings.TauPylon.count < 1) || !game.global.race['casting']) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        currentSpells(spell) {
            return game.global.race.casting[spell.id];
        },

        spellCost(spell) {
            return this.manaCost(this.currentSpells(spell));
        },

        costStep(level) {
            if (level === 0) {
                return 0.0025;
            }
            let cost = this.manaCost(level);
            return ((cost / level * 1.0025 + 0.0025) * (level + 1)) - cost;
        },

        // export function manaCost(spell,rate) from industry.js
        manaCost(level) {
            return level * ((1.0025) ** level - 1);
        },

        increaseRitual(spell, count) {
            if (count === 0 || !spell.isUnlocked()) {
                return false;
            }
            if (count < 0) {
                return this.decreaseRitual(spell, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.addSpell(spell.id);
            }
        },

        decreaseRitual(spell, count) {
            if (count === 0 || !spell.isUnlocked()) {
                return false;
            }
            if (count < 0) {
                return this.increaseRitual(count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.subSpell(spell.id);
            }
        }
    }

    var SmelterManager = {
        _industryVueBinding: "iSmelter",
        _industryVue: undefined,

        Productions: normalizeProperties({
            Iron: {id: "Iron", unlocked: () => true, resource: resources.Iron, cost: []},
            Steel: {id: "Steel", unlocked: () => resources.Steel.isUnlocked() && haveTech("smelting", 2), resource: resources.Steel,
                    cost: [new ResourceProductionCost(resources.Coal, 0.25, 1.25), new ResourceProductionCost(resources.Iron, 2, 6)]},
            Iridium: {id: "Iridium", unlocked: () => resources.Iridium.isUnlocked() && (haveTech("m_smelting", 2) || haveTech("irid_smelting")), resource: resources.Iridium, cost: []},
        }, [ResourceProductionCost]),

        Fuels: addProps(normalizeProperties({
            Oil: {id: "Oil", unlocked: () => game.global.resource.Oil.display, cost: [new ResourceProductionCost(resources.Oil, 0.35, 2)]},
            Coal: {id: "Coal", unlocked: () => game.global.resource.Coal.display, cost: [new ResourceProductionCost(resources.Coal, () => !isLumberRace() ? 0.15 : 0.25, 2)]},
            Wood: {id: "Wood", unlocked: () => isLumberRace() || game.global.race['evil'], cost: [new ResourceProductionCost(() => game.global.race['evil'] ? game.global.race['soul_eater'] && game.global.race.species !== 'wendigo' ? resources.Food : resources.Furs : resources.Lumber, () => game.global.race['evil'] && !game.global.race['soul_eater'] || game.global.race.species === 'wendigo' ? 1 : 3, 6)]},
            Inferno: {id: "Inferno", unlocked: () => haveTech("smelting", 8), cost: [new ResourceProductionCost(resources.Coal, 50, 50), new ResourceProductionCost(resources.Oil, 35, 50), new ResourceProductionCost(resources.Infernite, 0.5, 50)]},
        }, [ResourceProductionCost]), (f) => f.id, [{s: "smelter_fuel_p_", p: "priority"}]),

        initIndustry() {
            if (game.global.race['steelen'] || (buildings.Smelter.count < 1 && !game.global.race['cataclysm'] && !game.global.race['orbit_decayed'] && !haveTech("isolation") && !game.global.race['warlord'])) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        managedFuelPriorityList() {
            return Object.values(this.Fuels).sort((a, b) => a.priority - b.priority);
        },

        fueledCount(fuel) {
            if (!fuel.unlocked) {
                return 0;
            }

            return game.global.city.smelter[fuel.id];
        },

        smeltingCount(production) {
            if (!production.unlocked) {
                return 0;
            }

            return game.global.city.smelter[production.id];
        },

        increaseFuel(fuel, count) {
            if (count === 0 || !fuel.unlocked) {
                return false;
            }
            if (count < 0) {
                return this.decreaseFuel(fuel, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.addFuel(fuel.id);
            }
        },

        decreaseFuel(fuel, count) {
            if (count === 0 || !fuel.unlocked) {
                return false;
            }
            if (count < 0) {
                return this.increaseFuel(fuel, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.subFuel(fuel.id);
            }
        },

        increaseSmelting(id, count) {
            if (count === 0 || !this.Productions[id].unlocked) {
                return false;
            }
            if (count < 0) {
                return this.decreaseSmelting(id, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.addMetal(id);
            }
        },

        decreaseSmelting(id, count) {
            if (count === 0 || !this.Productions[id].unlocked) {
                return false;
            }
            if (count < 0) {
                return this.increaseSmelting(id, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.subMetal(id);
            }
        },

        maxOperating() {
            return game.global.city.smelter.cap - game.global.city.smelter.Star;
        },

        extraOperating() {
            return game.global.city.smelter.Star;
        },

        currentFueled() {
            return this._industryVue.$options.filters.on();
        }
    }

    var FactoryManager = {
        _industryVueBinding: "iFactory",
        _industryVue: undefined,

        Productions: addProps(normalizeProperties({
            LuxuryGoods:          {id: "Lux", resource: resources.Money, unlocked: () => true,
                                   cost: [new ResourceProductionCost(resources.Furs, () => FactoryManager.f_rate("Lux", "fur"), 5)]},
            Furs:                 {id: "Furs", resource: resources.Furs, unlocked: () => haveTech("synthetic_fur"),
                                   cost: [new ResourceProductionCost(resources.Money, () => FactoryManager.f_rate("Furs", "money"), 1000),
                                          new ResourceProductionCost(resources.Polymer, () => FactoryManager.f_rate("Furs", "polymer"), 10)]},
            Alloy:                {id: "Alloy", resource: resources.Alloy, unlocked: () => true,
                                   cost: [new ResourceProductionCost(resources.Copper, () => FactoryManager.f_rate("Alloy", "copper"), 5),
                                          new ResourceProductionCost(resources.Aluminium, () => FactoryManager.f_rate("Alloy", "aluminium"), 5)]},
            Polymer:              {id: "Polymer", resource: resources.Polymer, unlocked: () => haveTech("polymer"),
                                   cost: function(){ return !isLumberRace() ? this.cost_kk : this.cost_normal},
                                   cost_kk:       [new ResourceProductionCost(resources.Oil, () => FactoryManager.f_rate("Polymer", "oil_kk"), 2)],
                                   cost_normal:   [new ResourceProductionCost(resources.Oil, () => FactoryManager.f_rate("Polymer", "oil"), 2),
                                                   new ResourceProductionCost(resources.Lumber, () => FactoryManager.f_rate("Polymer", "lumber"), 50)]},
            NanoTube:             {id: "Nano", resource: resources.Nano_Tube, unlocked: () => haveTech("nano"),
                                   cost: [new ResourceProductionCost(resources.Coal, () => FactoryManager.f_rate("Nano_Tube", "coal"), 15),
                                          new ResourceProductionCost(resources.Neutronium, () => FactoryManager.f_rate("Nano_Tube", "neutronium"), 0.2)]},
            Stanene:              {id: "Stanene", resource: resources.Stanene, unlocked: () => haveTech("stanene"),
                                   cost: [new ResourceProductionCost(resources.Aluminium, () => FactoryManager.f_rate("Stanene", "aluminium"), 50),
                                          new ResourceProductionCost(resources.Nano_Tube, () => FactoryManager.f_rate("Stanene", "nano"), 5)]},
        }, [ResourceProductionCost]), (p) => p.resource.id,
          [{s: 'production_', p: "enabled"},
           {s: 'production_w_', p: "weighting"},
           {s: 'production_p_', p: "priority"}]),

        initIndustry() {
            if (buildings.Factory.count < 1 && buildings.RedFactory.count < 1 && buildings.TauFactory.count < 1 && buildings.WastelandHellFactory.count < 1) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }
            return true;
        },

        f_rate(production, resource) {
            return game.f_rate[production][resource][game.global.tech['factory'] || 0];
        },

        currentOperating() {
            let total = 0;
            for (let key in this.Productions) {
                let production = this.Productions[key];
                total += game.global.city.factory[production.id];
            }
            return total;
        },

        maxOperating() {
            let max = buildings.Factory.stateOnCount
                    + buildings.RedFactory.stateOnCount
                    + buildings.AlphaMegaFactory.stateOnCount * 2
                    + buildings.TauFactory.stateOnCount * (haveTech("isolation") ? 5 : 3)
                    + buildings.WastelandHellFactory.stateOnCount * (3 + (game.global.portal?.hell_factory?.rank || 1));
            if (!game.global.city.factory) {
                return max;
            }
            for (let key in this.Productions) {
                let production = this.Productions[key];
                if (production.unlocked && !production.enabled) {
                    max -= game.global.city.factory[production.id];
                }
            }
            return max;
        },

        currentProduction(production) {
            return production.unlocked ? game.global.city.factory[production.id] : 0;
        },

        increaseProduction(production, count) {
            if (count === 0 || !production.unlocked) {
                return false;
            }
            if (count < 0) {
                return this.decreaseProduction(production, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.addItem(production.id);
            }
        },

        decreaseProduction(production, count) {
            if (count === 0 || !production.unlocked) {
                return false;
            }
            if (count < 0) {
                return this.increaseProduction(production, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.subItem(production.id);
            }
        }
    }

    var ReplicatorManager = {
        _industryVueBinding: "iReplicator",
        _industryVue: undefined,

        Productions: addProps(normalizeProperties(
            replicableResources.map(resId => resources[resId]).reduce((a, res) => ({ ...a, [res.id]: {id: res.id, resource: res, unlocked: () => res.isUnlocked(), cost: []}}), {})),
            (p) => p.resource.id,
          [{s: 'replicator_', p: "enabled"},
           {s: 'replicator_w_', p: "weighting"},
           {s: 'replicator_p_', p: "priority"}]),

        initIndustry() {
            if (!haveTech('replicator')) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }
            return true;
        },

        setResource(res) {
            if (this._industryVue.avail(res)) {
                this._industryVue.setVal(res);
            }
        }
    }

    var DroidManager = {
        _industryVueBinding: "iDroid",
        _industryVue: undefined,

        Productions: addProps({
            Adamantite: {id: "adam", resource: resources.Adamantite},
            Uranium: {id: "uran", resource: resources.Uranium},
            Coal: {id: "coal", resource: resources.Coal},
            Aluminium: {id: "alum", resource: resources.Aluminium},
        }, (p) => p.resource.id,
          [{s: 'droid_w_', p: "weighting"},
           {s: 'droid_pr_', p: "priority"}]),

        initIndustry() {
            if (buildings.AlphaMiningDroid.count < 1) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        currentOperating() {
            let total = 0;
            for (let key in this.Productions) {
                let production = this.Productions[key];
                total += game.global.interstellar.mining_droid[production.id];
            }
            return total;
        },

        maxOperating() {
            return game.global.interstellar.mining_droid.on;
        },

        currentProduction(production) {
            return game.global.interstellar.mining_droid[production.id];
        },

        increaseProduction(production, count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.decreaseProduction(production, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.addItem(production.id);
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
                this._industryVue.subItem(production.id);
            }
        }
    }

    var GrapheneManager = {
        _industryVueBinding: "iGraphene",
        _industryVue: undefined,
        _graphPlant: null,

        Fuels: {
            Lumber: {id: "Lumber", cost: new ResourceProductionCost(resources.Lumber, 350, 100), add: "addWood", sub: "subWood"},
            Coal: {id: "Coal", cost: new ResourceProductionCost(resources.Coal, 25, 10), add: "addCoal", sub: "subCoal"},
            Oil: {id: "Oil", cost: new ResourceProductionCost(resources.Oil, 15, 10), add: "addOil", sub: "subOil"},
        },

        initIndustry() {
            this._graphPlant = game.global.race['warlord'] ? buildings.WastelandTwistedLab
            : game.global.race['truepath'] ? buildings.TitanGraphene
            : buildings.AlphaGraphenePlant;
            if ((this._graphPlant.instance?.count ?? 0) < 1) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        maxOperating() {
            return this._graphPlant.instance.on;
        },

        fueledCount(fuel) {
            return this._graphPlant.instance[fuel.id];
        },

        increaseFuel(fuel, count) {
            if (count === 0 || !fuel.cost.resource.isUnlocked()) {
                return false;
            }
            if (count < 0) {
                return this.decreaseFuel(fuel, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue[fuel.add]();
            }
        },

        decreaseFuel(fuel, count) {
            if (count === 0 || !fuel.cost.resource.isUnlocked()) {
                return false;
            }
            if (count < 0) {
                return this.increaseFuel(fuel, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue[fuel.sub]();
            }
        }
    }

