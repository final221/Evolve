    class Action {
        constructor(name, tab, id, location, flags) {
            this.name = name;
            this._tab = tab;
            this._id = id;
            this._location = location;
            this.gameMax = Number.MAX_SAFE_INTEGER;
            this._vueBinding = this._tab + "-" + this.id;
            this.weighting = 0;
            this.extraDescription = "";
            this.consumption = [];
            this.cost = {};
            this.overridePowered = undefined;

            this.is = normalizeProperties(flags) ?? {};
        }

        get autoBuildEnabled() { return settings['bat' + this._vueBinding] }
        get autoStateEnabled() { return settings['bld_s_' + this._vueBinding] }
        get autoStateSmart() { return settings['bld_s2_' + this._vueBinding] }
        get priority() { return settingsRaw['bld_p_' + this._vueBinding] }
        get _weighting() { return settings['bld_w_' + this._vueBinding] }
        get _autoMax() { return settings['bld_m_' + this._vueBinding] }

        get definition() {
            if (this._location !== "") {
                return game.actions[this._tab][this._location][this._id];
            } else {
                return game.actions[this._tab][this._id];
            }
        }

        get instance() {
            return game.global[this._tab][this._id];
        }

        get id() {
            return this._id;
        }

        get title() {
            let def = this.definition;
            return def ? typeof def.title === 'function' ? def.title() : def.title : this.name;
        }

        get desc() {
            let def = this.definition;
            return def ? typeof def.desc === 'function' ? def.desc() : def.desc : this.name;
        }

        get vue() {
            return getVueById(this._vueBinding);
        }

        /* That's a right(ish) way to do, but compared to hardcoded numbers it's a performance tax for... nothing really, as i'll still need to manually declare a lot of things for each new building, and it's already declared for all existing ones. I'll put it on hold for now.
        get gameMax() {
            // queue_complete need an initialized instance to read a current count
            return this.instance && this.definition.queue_complete ? this.instance.count + this.definition.queue_complete() : Number.MAX_SAFE_INTEGER;
        }*/

        get autoMax() {
            // There is a game max. eg. world collider can only be built 1859 times
            return this._autoMax >= 0 && this._autoMax <= this.gameMax ? this._autoMax : this.gameMax;
        }

        isUnlocked() {
            if ((this._tab === "city" && !game.global.settings.showCity) ||
                (this._tab === "space" && (!game.global.settings.showSpace && !game.global.settings.showOuter)) ||
                (this._tab === "interstellar" && !game.global.settings.showDeep) ||
                (this._tab === "portal" && !game.global.settings.showPortal) ||
                (this._tab === "galaxy" && !game.global.settings.showGalactic) ||
                (this._tab === "tauceti" && !game.global.settings.showTau) ||
                (this._tab === "eden" && !game.global.settings.showEden)) {
                return false;
            }
            return this.vue !== undefined;
        }

        isSwitchable() {
            return this.definition.hasOwnProperty("powered") || this.definition.hasOwnProperty("switchable");
        }

        isMission() {
            return this.definition.hasOwnProperty("grant");
        }

        isComplete() {
            return haveTech(this.definition.grant[0], this.definition.grant[1]);
        }

        isSmartManaged() {
            return settings.autoPower && this.isUnlocked() && this.autoStateEnabled && this.autoStateSmart;
        }

        isAutoBuildable() {
            return this.isUnlocked() && this.autoBuildEnabled && this._weighting > 0 && this.count < this.autoMax;
        }

        // export function checkPowerRequirements(c_action) from actions.js
        checkPowerRequirements() {
            for (let [tech, value] of Object.entries(this.definition.power_reqs ?? {})) {
                if (!haveTech(tech, value)){
                    return false;
                }
            }
            return true;
        }

        get powered() {
            if (this.overridePowered !== undefined) {
                return this.overridePowered;
            }

            if (!this.definition.hasOwnProperty("powered") || !this.checkPowerRequirements()) {
                return 0;
            }

            return this.definition.powered();
        }

        updateResourceRequirements() {
            if (!this.isUnlocked()) {
                return;
            }

            this.cost = {};
            if (!this.definition.cost) {
                return;
            }

            let adjustedCosts = poly.adjustCosts(this.definition);
            for (let resourceName in adjustedCosts) {
                if (resources[resourceName]) {
                    let resourceAmount = Number(adjustedCosts[resourceName]());
                    if (resourceAmount > 0) {
                        this.cost[resourceName] = resourceAmount;
                    }
                }
            }
        }

        isAffordable(max = false) {
            return game.checkAffordable(this.definition, max);
        }

        // Whether the action is clickable is determined by whether it is unlocked, affordable and not a "permanently clickable" action
        isClickable() {
            return this.isUnlocked() && this.isAffordable() && this.count < this.gameMax;
        }

        // This is a "safe" click. It will only click if the container is currently clickable.
        // ie. it won't bypass the interface and click the node if it isn't clickable in the UI.
        click() {
            if (!this.isClickable()) {
                return false
            }

            let doMultiClick = this.is.multiSegmented && settings.buildingsUseMultiClick;
            let amountToBuild = 1;
            if (doMultiClick) {
                amountToBuild = this.gameMax - this.count;
                for (let res in this.cost) {
                    amountToBuild = Math.min(amountToBuild, Math.floor(resources[res].currentQuantity / this.cost[res]));
                }
                if (amountToBuild < 1) { // Game allow to spend more resources than available, going negative. If we're here - building is clickable, and we can afford at least one thing for sure.
                    amountToBuild = 1;
                }
            }

            for (let res in this.cost) {
                resources[res].currentQuantity -= this.cost[res] * amountToBuild;
            }

            // Don't log evolution actions and gathering actions
            if (game.global.race.species !== "protoplasm" && !logIgnore.includes(this.id)) {
                if (this.gameMax < Number.MAX_SAFE_INTEGER && this.count + amountToBuild < this.gameMax) {
                    GameLog.logSuccess("multi_construction", poly.loc('build_success', [`${this.title} (${this.count + amountToBuild})`]), ['queue', 'building_queue']);
                } else {
                    GameLog.logSuccess("construction", poly.loc('build_success', [this.title]), ['queue', 'building_queue']);
                }
            }

            KeyManager.set(doMultiClick, doMultiClick, doMultiClick);

            if (this.is.prestige) { logPrestige(); }

            // Try skipping game's laggy postBuild hook by invoking the action() directly, instead of going through the
            // vue action() => game runAction() => game shed.action() => game postBuild() hook.
            // This will greatly reduce the amount of page redraws.
            // refresh is really only needed for first building as there are no buildings where building a second unlocks more stuff.
            if (settings.performanceHackAvoidDrawTech && this.definition.refresh && this.count > 0) {
                this.definition.action();
                return true;
            }

            // Hide active popper from action, so it won't rewrite it
            let popper = $('#popper');
            if (popper.length > 0 && popper.data('id').indexOf(this._vueBinding) === -1) {
                popper.attr('id', 'TotallyNotAPopper');

                // Game bugs in .action() can cause an error to be thrown. We can't really handle it in any good way,
                // but we need to revert the id or a tooltip might get stuck at the bottom of the page.
                try {
                    this.vue.action();
                } finally {
                    popper.attr('id', 'popper');
                }
            } else {
                this.vue.action();
            }

            if (this.is.prestige) {
                state.goal = "GameOverMan";
            }

            return true;
        }

        addSupport(resource) {
            this.consumption.push(normalizeProperties({ resource: resource, rate: () => this.definition.support() * -1 }));
        }

        addResourceConsumption(resource, rate) {
            // TODO: Load fuel from definition, same as for support
            this.consumption.push(normalizeProperties({ resource: resource, rate: rate }));
        }

        getFuelRate(idx) {
            if (!this.consumption[idx]) {
                return 0;
            }

            let resource = this.consumption[idx].resource;
            let rate = this.consumption[idx].rate;
            if (this._tab === "space" && (resource === resources.Oil || resource === resources.Helium_3)) {
                rate = game.fuel_adjust(rate, true);
            }
            else if ((this._tab === "interstellar" || this._tab === "galaxy" || this._tab === "tauceti") && (resource === resources.Deuterium || resource === resources.Helium_3) && this !== buildings.AlphaFusion) {
                rate = game.int_fuel_adjust(rate);
            }
            return rate;
        }

        getMissingConsumption() {
            for (let j = 0; j < this.consumption.length; j++) {
                let resource = this.consumption[j].resource;
                if (resource instanceof Support) {
                    continue;
                }

                // Food fluctuate a lot, ignore it, assuming we always can get more
                if (resource === resources.Food && settings.autoJobs && (jobs.Farmer.autoJobEnabled || jobs.Hunter.autoJobEnabled)) {
                    continue;
                }

                // Now let's actually check it, bought resources excluded from rateOfChange, to prevent losing resources after switching routes
                let consumptionRate = this.getFuelRate(j);
                if (resource.storageRatio < 0.95 && consumptionRate > 0 && resource.calculateRateOfChange({buy: true}) < consumptionRate) {
                    return resource;
                }
            }
            return null;
        }

        getMissingSupport() {
            // In fasting we need to build mining droid first to unlock habitats
            if (game.global.race['fasting'] && this === buildings.AlphaMiningDroid && this.count < 1) {
                return null;
            }

            for (let j = 0; j < this.consumption.length; j++) {
                let resource = this.consumption[j].resource;

                // We're going to build Spire things with no support, to enable them later
                if (resource === resources.Spire_Support && this.autoStateSmart) {
                    continue;
                }
                // Tau Belt support can be overused
                if (resource === resources.Tau_Belt_Support) {
                    continue;
                }
                // Womlings facilities can run understaffed
                if (resource === resources.Womlings_Support && resource.rateOfChange > 0) {
                    continue;
                }

                let rate = this.consumption[j].rate;
                if (!(resource instanceof Support) || rate <= 0) {
                    continue;
                }

                // We don't have spare support for this
                if (resource.rateOfChange < rate) {
                    return resource;
                }
            }
            return null;
        }

        getUselessSupport() {
            // Starbase and Habitats are exceptions, they're always useful
            if (this === buildings.GatewayStarbase || this === buildings.AlphaHabitat ||
               (this === buildings.SpaceNavBeacon && game.global.race['orbit_decayed'])) {
                return null;
            }

            let uselessSupports = [];
            for (let j = 0; j < this.consumption.length; j++) {
                let resource = this.consumption[j].resource;
                let rate = this.consumption[j].rate;
                if (!(resource instanceof Support) || rate >= 0) {
                    continue;
                }
                let minSupport = resource === resources.Belt_Support ? (2 * traitVal('high_pop', 0, 1)) :
                    resource === resources.Gateway_Support ? 5 :
                    resource === resources.Womlings_Support ? 6 : 1;

                if (resource.rateOfChange >= minSupport) {
                    uselessSupports.push(resource);
                } else {
                    // If we have something useful - stop here, we care only about buildings with all supports useless
                    return null;
                }
            }
            return uselessSupports[0] ?? null;
        }

        get count() {
            if (this.isMission()) {
                return this.isComplete() ? 1 : 0;
            }

            if (!this.isUnlocked()) {
                return 0;
            }

            if (this === buildings.Banquet) {
                // Banquet hall uses "level" as build count if >= 1
                return this.instance?.count ? this.instance.level : 0;
            }

            return this.instance?.count ?? 0;
        }

        hasState() {
            if (!this.isUnlocked()) {
                return false;
            }

            return (this.definition.powered && haveTech("high_tech", 2) && this.checkPowerRequirements()) || this.definition.switchable?.() || false;
        }

        get stateOnCount() {
            if (!this.hasState() || this.count < 1) {
                return 0;
            }

            return this.instance.on;
        }

        get stateOffCount() {
            if (!this.hasState() || this.count < 1) {
                return 0;
            }

            return this.instance.count - this.instance.on;
        }

        tryAdjustState(adjustCount) {
            if (adjustCount === 0 || !this.hasState()) {
                return false;
            }

            let vue = this.vue;

            if (adjustCount > 0) {
                for (let m of KeyManager.click(adjustCount)) {
                    vue.power_on();
                }
                return true;
            }
            if (adjustCount < 0) {
                for (let m of KeyManager.click(adjustCount * -1)) {
                    vue.power_off();
                }
                return true;
            }
        }
    }

    class CityAction extends Action {
        get instance() {
            return game.global.city[this._id];
        }
    }

    class Pillar extends Action {
        get count() {
            return this.isUnlocked() ? this.definition.count() : 0;
        }

        get stateOnCount() {
            return this.isUnlocked() ? this.definition.on() : 0;
        }

        isAffordable(max = false) {
            if (game.global.tech.pillars !== 1 || game.global.race.universe === 'micro') {
                return false;
            }
            return game.checkAffordable(this.definition, max);
        }
    }

    class ResourceAction extends Action {
        constructor(name, tab, id, location, res, flags) {
            super(name, tab, id, location, flags);

            this.resource = resources[res];
        }

        get count() {
            return this.resource.currentQuantity;
        }
    }

    class EvolutionAction extends Action {
        constructor(id) {
            super("", "evolution", id, "");
        }

        isUnlocked() {
            let node = document.getElementById(this._vueBinding);
            return node !== null && !node.classList.contains('is-hidden');
        }
    }

    class SpaceDock extends Action {
        isOptionsCached() {
            if (this.count < 1 || game.global.tech['genesis'] < 4) {
                // It doesn't have options yet so I guess all "none" of them are cached!
                // Also return true if we don't have the required tech level yet
                return true;
            }

            // If our tech is unlocked but we haven't cached the vue the the options aren't cached
            if (!buildings.GasSpaceDockProbe.isOptionsCached()
                || game.global.tech['genesis'] >= 5 && !buildings.GasSpaceDockShipSegment.isOptionsCached()
                || game.global.tech['genesis'] === 6 && !buildings.GasSpaceDockPrepForLaunch.isOptionsCached()
                || game.global.tech['genesis'] >= 7 && !buildings.GasSpaceDockLaunch.isOptionsCached()
                || game.global.tech['geck'] >= 1 && !buildings.GasSpaceDockGECK.isOptionsCached()) {
                return false;
            }

            return true;
        }

        cacheOptions() {
            if (this.count < 1 || WindowManager.isOpen()) {
                return false;
            }

            let optionsNode = document.querySelector("#space-star_dock .special");
            WindowManager.openModalWindowWithCallback(optionsNode, this.title, () => {
                buildings.GasSpaceDockProbe.cacheOptions();
                buildings.GasSpaceDockGECK.cacheOptions();
                buildings.GasSpaceDockShipSegment.cacheOptions();
                buildings.GasSpaceDockPrepForLaunch.cacheOptions();
                buildings.GasSpaceDockLaunch.cacheOptions();
            });
            return true;
        }
    }

    class ModalAction extends Action {
        constructor(...args) {
            super(...args);

            this._vue = undefined;
        }

        get vue() {
            return this._vue;
        }

        isOptionsCached() {
            return this._vue !== undefined;
        }

        cacheOptions() {
            this._vue = getVueById(this._vueBinding);
        }

        isUnlocked() {
            // All ModalActions belongs to starDock tab
            if (!game.global.settings.showSpace) {
                return false;
            }
            // We have to override this as there won't be an element unless the modal window is open
            return this._vue !== undefined;
        }
    }

    class Project extends Action {
        constructor(name, id) {
            super(name, "arpa", id, "");
            this._vueBinding = "arpa" + this.id;
            this.currentStep = 1;
        }

        get autoBuildEnabled() { return settings['arpa_' + this._id] }
        get priority() { return settingsRaw['arpa_p_' + this._id] }
        get _autoMax() { return settings['arpa_m_' + this._id] }
        get _weighting() { return settings['arpa_w_' + this._id] }

        updateResourceRequirements() {
            if (!this.isUnlocked()) {
                return;
            }

            this.cost = {};
            let maxStep = Math.min(100 - this.progress, state.triggerTargets.includes(this) ? 100 : settings.arpaStep);

            let adjustedCosts = poly.arpaAdjustCosts(this.definition.cost);
            for (let resourceName in adjustedCosts) {
                if (resources[resourceName]) {
                    let resourceAmount = Number(adjustedCosts[resourceName]());
                    if (resourceAmount > 0) {
                        this.cost[resourceName] = resourceAmount / 100;
                        maxStep = Math.min(maxStep, resources[resourceName].maxQuantity / this.cost[resourceName]);
                    }
                }
            }

            this.currentStep = Math.max(Math.floor(maxStep), 1);
            if (this.currentStep > 1) {
                for (let res in this.cost) {
                    this.cost[res] *= this.currentStep;
                }
            }
        }

        // Override Action's version, because these have a 'grant' but aren't missions.
        isMission() {
            return this.gameMax === 1;
        }

        get count() {
            return this.instance?.rank ?? 0;
        }

        get progress() {
            return this.instance?.complete ?? 0;
        }

        isAffordable(max = false) {
            // Game's .checkAffordable doesn't work correctly on projects
            return checkAffordableCustom(this.cost, max);
        }

        isClickable() {
            return this.isUnlocked() && this.isAffordable(false);
        }

        click() {
            if (!this.isClickable()) {
                return false
            }

            for (let res in this.cost) {
                resources[res].currentQuantity -= this.cost[res];
            }

            if (this.progress + this.currentStep < 100) {
                GameLog.logSuccess("arpa", poly.loc('build_success', [`${this.title} (${this.progress + this.currentStep}%)`]), ['queue', 'building_queue']);
            } else {
                GameLog.logSuccess("construction", poly.loc('build_success', [this.title]), ['queue', 'building_queue']);
                if (this.id === "syphon" && this.count == 79) {
                    logPrestige();
                }
            }

            KeyManager.set(false, false, false);
            // This is a really bad lag hack. ARPAs make a very expensive drawTech() call on every build.
            // After 10 ARPAs, this will never actually accomplish anything; AFAIK nothing needs more than 10 ARPAs.
            // Luckily, drawTech() doesn't draw anything if preload tab content is off and we're not on research.
            // So if we can, we briefly hack that off while buying an ARPA that won't change anything.
            if (settings.performanceHackAvoidDrawTech && this.count >= 10 && !(this.id === "syphon" && this.count >= 79)) {
                let mainVue = win.$('#mainColumn > div:first-child')[0].__vue__;
                mainVue.s.tabLoad = false;
                getVueById(this._vueBinding).build(this.id, this.currentStep);
                mainVue.s.tabLoad = true;

                return true;
            }
            getVueById(this._vueBinding).build(this.id, this.currentStep);
            return true;
        }
    }

    class Technology {
        // These techs have the same name as some others - use a descriptor for disambiguation
        static techDiscriminators = {
            wind_plant: "Power",
            demonic_craftsman: "Evil",
            evil_planning: "Evil",
            adamantite_processing_flier: "Flier",
            alt_anthropology: "Post-Transcendence",
            alt_fanaticism: "Post-Transcendence",
            study_alt: "Post-Preeminence",
            deify_alt: "Post-Preeminence",
            dyson_sphere: "Plans",
            unification: "Plans",
            exotic_infusion: "1st Warning",
            infusion_check: "2nd Warning",
            protocol66: "Warning",
            bac_tanks_tp: "True Path",
            ai_core_tp: "True Path",
            terraforming_tp: "True Path",
            higgs_boson_tp: "True Path",
            stanene_tp: "True Path",
            graphene_tp: "True Path",
            virtual_reality_tp: "True Path",
            adamantite_vault_tp: "True Path",
            iridium_smelting: "True Path",
            bolognium_crates_tp: "True Path",
            adamantite_containers_tp: "True Path",
            orichalcum_panels_tp: "True Path",
            dreadnought_ship: "True Path",
            fusion_generator: "True Path",
            replicator: "Lone Survivor"
        };

        constructor(id) {
            this._id = id;

            this._vueBinding = "tech-" + id;

            this.cost = {};
        }

        get id() {
            return this._id;
        }

        isUnlocked() {
            // vue of researched techs still can be found in #oldTech
            return document.querySelector("#" + this._vueBinding + " > .button:not(.precog)") !== null && getVueById(this._vueBinding) !== undefined;
        }

        get definition() {
            return game.actions.tech[this._id];
        }

        get title() {
            let def = this.definition;
            let title = typeof def.title === 'function' ? def.title() : def.title;
            if (this._id in Technology.techDiscriminators) {
                title += ` (${Technology.techDiscriminators[this._id]})`;
            }
            return title;
        }

        get name() {
            return this.title;
        }

        isAffordable(max = false) {
            return game.checkAffordable(this.definition, max);
        }

        // Whether the action is clickable is determined by whether it is unlocked, affordable and not a "permanently clickable" action
        isClickable() {
            return this.isUnlocked() && this.isAffordable();
        }

        // This is a "safe" click. It will only click if the container is currently clickable.
        // ie. it won't bypass the interface and click the node if it isn't clickable in the UI.
        click() {
            if (!this.isClickable()) {
                return false
            }

            for (let res in this.cost) {
                resources[res].currentQuantity -= this.cost[res];
            }

            getVueById(this._vueBinding).action();

            let def = this.definition;
            let title = typeof def.title === 'function' ? def.title() : def.title;
            GameLog.logSuccess("research", poly.loc('research_success', [title]), ['queue', 'research_queue']);
            return true;
        }

        isResearched() {
            return document.querySelector("#tech-" + this.id + " .oldTech") !== null;
        }

        updateResourceRequirements() {
            if (!this.isUnlocked()) {
                return;
            }

            this.cost = {};
            if (!this.definition.cost) {
                return;
            }

            let adjustedCosts = poly.adjustCosts(this.definition);
            for (let resourceName in adjustedCosts) {
                if (resources[resourceName]) {
                    let resourceAmount = Number(adjustedCosts[resourceName]());
                    if (resourceAmount > 0) {
                        this.cost[resourceName] = resourceAmount;
                    }
                }
            }
        }
    }

