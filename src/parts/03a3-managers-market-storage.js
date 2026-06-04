    var GalaxyTradeManager = {
        _industryVueBinding: "galaxyTrade",
        _industryVue: undefined,

        initIndustry() {
            if (buildings.GorddonFreighter.count + buildings.Alien1SuperFreighter.count < 1) {
                return false;
            }

            this._industryVue = getVueById(this._industryVueBinding);
            if (this._industryVue === undefined) {
                return false;
            }

            return true;
        },

        currentOperating() {
            return game.global.galaxy.trade.cur;
        },

        maxOperating() {
            return game.global.galaxy.trade.max;
        },

        currentProduction(production) {
            return game.global.galaxy.trade["f" + production];
        },

        zeroProduction(production) {
            this._industryVue.zero(production);
        },

        increaseProduction(production, count) {
            if (count === 0) {
                return false;
            }
            if (count < 0) {
                return this.decreaseProduction(production, count * -1);
            }

            for (let m of KeyManager.click(count)) {
                this._industryVue.more(production);
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
                this._industryVue.less(production);
            }
        }
    }

    var GovernmentManager = {
        Types: {
            anarchy: {id: "anarchy", isUnlocked: () => false, selectable: false},
            dictator: {id: "dictator", isUnlocked: () => false, selectable: false},
            autocracy: {id: "autocracy", isUnlocked: () => true},
            democracy: {id: "democracy", isUnlocked: () => true},
            oligarchy: {id: "oligarchy", isUnlocked: () => true},
            theocracy: {id: "theocracy", isUnlocked: () => haveTech("gov_theo")},
            republic: {id: "republic", isUnlocked: () => haveTech("govern", 2)},
            socialist: {id: "socialist", isUnlocked: () => haveTech("gov_soc")},
            corpocracy: {id: "corpocracy", isUnlocked: () => haveTech("gov_corp")},
            technocracy: {id: "technocracy", isUnlocked: () => haveTech("govern", 3)},
            federation: {id: "federation", isUnlocked: () => haveTech("gov_fed")},
            magocracy: {id: "magocracy", isUnlocked: () => haveTech("gov_mage")},
        },

        isUnlocked() {
            let node = document.getElementById("govType");
            return node !== null && node.style.display !== "none";
        },

        isEnabled() {
            let node = document.querySelector("#govType button");
            return this.isUnlocked() && node !== null && node.getAttribute("disabled") !== "disabled";
        },

        currentGovernment() {
            return game.global.civic.govern.type;
        },

        setGovernment(government) {
            // Don't try anything if chosen government already set, or modal window is already open
            if (this.currentGovernment() === government || WindowManager.isOpen()) {
                return;
            }

            let optionsNode = document.querySelector("#govType button");
            let title = game.loc('civics_government_type');
            WindowManager.openModalWindowWithCallback(optionsNode, title, () => {
                GameLog.logSuccess("special", `Revolution! Government changed to ${game.loc("govern_" + government)}.`, ['events', 'major_events']);
                getVueById('govModal')?.setGov(government);
            });
        },
    }

    var MarketManager = {
        priorityList: [],
        multiplier: 0,

        updateData() {
            if (game.global.city.market) {
                this.multiplier = game.global.city.market.qty;
            }
        },

        isUnlocked() {
            return haveTech("currency", 2);
        },

        sortByPriority() {
            this.priorityList.sort((a, b) => a.marketPriority - b.marketPriority);
        },

        isBuySellUnlocked(resource) {
            return document.querySelector("#market-" + resource.id + " .order") !== null;
        },

        setMultiplier(multiplier) {
            this.multiplier = Math.min(Math.max(1, multiplier), this.getMaxMultiplier());

            getVueById("market-qty").qty = this.multiplier;
        },

        getMaxMultiplier(){
            return getVueById("market-qty")?.limit() ?? 1;
        },

        getUnitBuyPrice(resource) {
            // marketItem > vBind > purchase from resources.js
            let price = game.global.resource[resource.id].value;

            price *= traitVal('arrogant', 0, '+');
            price *= traitVal('conniving', 0, '-');

            return price;
        },

        getUnitSellPrice(resource) {
            // marketItem > vBind > sell from resources.js
            let divide = 4;

            divide *= traitVal('merchant', 0, '-');
            divide *= traitVal('asymmetrical', 0, '+');
            divide *= traitVal('conniving', 1, '-');

            return game.global.resource[resource.id].value / divide;
        },

        buy(resource) {
            let vue = getVueById(resource._marketVueBinding);
            if (vue === undefined) { return false; }

            let price = this.getUnitBuyPrice(resource) * this.multiplier;
            if (resources.Money.currentQuantity < price) { return false; }

            resources.Money.currentQuantity -= this.multiplier * this.getUnitBuyPrice(resource);
            resource.currentQuantity += this.multiplier;

            vue.purchase(resource.id);
        },

        sell(resource) {
            let vue = getVueById(resource._marketVueBinding);
            if (vue === undefined) { return false; }

            if (resource.currentQuantity < this.multiplier) { return false; }

            resources.Money.currentQuantity += this.multiplier * this.getUnitSellPrice(resource);
            resource.currentQuantity -= this.multiplier;

            vue.sell(resource.id);
        },

        getImportRouteCap() {
            if (haveTech("currency", 6)){
                return 1000000;
            } else if (haveTech("currency", 4)){
                return 100;
            } else {
                return 25;
            }
        },

        getExportRouteCap() {
            if (!game.global.race['banana']){
                return this.getImportRouteCap();
            } else if (haveTech("currency", 6)){
                return 1000000;
            } else if (haveTech("currency", 4)){
                return 25;
            } else {
                return 10;
            }
        },

        getMaxTradeRoutes() {
            let max = game.global.city.market.mtrade;
            let unmanaged = 0;
            for (let resource of this.priorityList) {
                if (!resource.autoTradeBuyEnabled && !resource.autoTradeSellEnabled) {
                    max -= Math.abs(resource.tradeRoutes);
                    unmanaged += resource.tradeRoutes;
                }
            }
            return [max, unmanaged];
        },

        zeroTradeRoutes(resource) {
            getVueById(resource._marketVueBinding)?.zero(resource.id);
        },

        addTradeRoutes(resource, count) {
            if (!resource.isUnlocked()) { return false; }

            let vue = getVueById(resource._marketVueBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.autoBuy(resource.id);
            }
        },

        removeTradeRoutes(resource, count) {
            if (!resource.isUnlocked()) { return false; }

            let vue = getVueById(resource._marketVueBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.autoSell(resource.id);
            }
        }
    }

    var StorageManager = {
        priorityList: [],
        crateValue: 0,
        containerValue: 0,
        _storageVueBinding: "createHead",
        _storageVue: undefined,

        initStorage() {
            if (!this.isUnlocked) {
                return false;
            }

            this._storageVue = getVueById(this._storageVueBinding);
            if (this._storageVue === undefined) {
                return false;
            }

            return true;
        },

        isUnlocked() {
            return haveTech("container");
        },

        sortByPriority() {
            this.priorityList.sort((a, b) => a.storagePriority - b.storagePriority);
        },

        constructCrate(count) {
            if (count <= 0) {
                return;
            }
            for (let m of KeyManager.click(count)) {
                this._storageVue.crate();
            }
        },

        constructContainer(count) {
            if (count <= 0) {
                return;
            }
            for (let m of KeyManager.click(count)) {
                this._storageVue.container();
            }
        },

        assignCrate(resource, count) {
            let vue = getVueById(resource._stackVueBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.addCrate(resource.id);
            }
        },

        unassignCrate(resource, count) {
            let vue = getVueById(resource._stackVueBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.subCrate(resource.id);
            }
        },

        assignContainer(resource, count) {
            let vue = getVueById(resource._stackVueBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.addCon(resource.id);
            }
        },

        unassignContainer(resource, count) {
            let vue = getVueById(resource._stackVueBinding);
            if (vue === undefined) { return false; }

            for (let m of KeyManager.click(count)) {
                vue.subCon(resource.id);
            }
        }
    }

