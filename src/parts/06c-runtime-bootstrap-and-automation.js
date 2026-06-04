    function initialiseScript() {
        // Init objects and lookup tables
        for (let [key, action] of Object.entries(game.actions.tech)) {
            techIds[action.id] = new Technology(key);
        }
        for (let building of Object.values(buildings)){
            buildingIds[building._vueBinding] = building;
            // Don't force building Jump Ship and Pit Assault, they're prety expensive at the moment when unlocked.
            if (building.isMission() && building !== buildings.BlackholeJumpShip && building !== buildings.PitAssaultForge) {
                state.missionBuildingList.push(building);
            }
        }
        for (let project of Object.values(projects)){
            arpaIds[project._vueBinding] = project;
        }
        for (let job of Object.values(jobs)){
            jobIds[job._originalId] = job;
        }
        for (let job of Object.values(crafter)){
            jobIds[job._originalId] = job;
        }

        updateStandAloneSettings();
        updateStateFromSettings();
        updateSettingsFromState();

        TriggerManager.priorityList.forEach(trigger => {
            trigger.complete = false;
        });

        // If debug logging is enabled then verify the game actions code is both correct and in sync with our script code
        if (checkActions) {
            verifyGameActions();
        }

        // Normal popups
        new MutationObserver(tooltipObserverCallback).observe(document.getElementById("main"), {childList: true});

        // Modals; check script callbacks and add Space Dock tooltips
        new MutationObserver(bodyMutations =>  bodyMutations.forEach(bodyMutation => bodyMutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains("modal")) {
                if (WindowManager.openedByScript) {
                    node.style.display = "none"; // Hide splash
                    new MutationObserver(WindowManager.checkCallbacks).observe(document.getElementById("modalBox"), {childList: true});
                } else {
                    new MutationObserver(tooltipObserverCallback).observe(node, {childList: true});
                }
            }
        }))).observe(document.querySelector("body"), {childList: true});

        // Log filtering
        buildFilterRegExp();
        new MutationObserver(filterLog).observe(document.getElementById("msgQueueLog"), {childList: true});
    }

    function buildFilterRegExp() {
        let regexps = [];
        let validIds = [];
        let strings = settingsRaw.logFilter.split(/[^0-9a-z_%]/g).filter(Boolean);
        for (let i = 0; i < strings.length; i++) {
            let [id, ...params] = strings[i].split("%");
            params = params.map(poly.loc);
            // Loot message built from multiple strings without tokens, let's fake one for regexp below
            let message = poly.loc(id, params.length ? params : undefined) + (id === "civics_garrison_gained" ? "%0" : "");
            if (message === id) {
                continue;
            }
            regexps.push(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%\d/g, ".*"));
            validIds.push(strings[i]);
        }
        if (regexps.length > 0) {
            state.filterRegExp = new RegExp("^(" + regexps.join("|") + ")$");
            settingsRaw.logFilter = validIds.join(", ");
        } else {
            state.filterRegExp = null;
            settingsRaw.logFilter = "";
        }
    }

    function filterLog(mutations) {
        if (!settings.masterScriptToggle || !state.filterRegExp) {
            return;
        }
        mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
            if (state.filterRegExp.test(node.innerText)) {
                node.remove();
            }
        }));
    }

    function getTooltipInfo(obj) {
        let notes = [];
        if (obj === buildings.NeutronCitadel) {
            let diff = getCitadelConsumption(obj.stateOnCount + 1) - getCitadelConsumption(obj.stateOnCount);
            notes.push(`Next level will increase total consumption by ${getNiceNumber(diff)} MW`);
        }
        if (obj === buildings.SpireMechBay && MechManager.initLab()) {
            notes.push(`Current team potential: ${getNiceNumber(MechManager.mechsPotential)}`);
            let supplyCollected = MechManager.activeMechs
              .filter(mech => mech.size === 'collector')
              .reduce((sum, mech) => sum + (mech.power * MechManager.collectorValue), 0);
            if (supplyCollected > 0) {
                notes.push(`Supplies collected: ${getNiceNumber(supplyCollected)} /s`);
            }
        }

        if ((obj instanceof Technology || (!settings.autoARPA && obj._tab === "arpa") || (!settings.autoBuild && obj._tab !== "arpa")) && !state.queuedTargetsAll.includes(obj) && !state.triggerTargets.includes(obj)) {
            let conflict = getCostConflict(obj);
            if (conflict) {
                notes.push(`Conflicts with ${conflict.actionList.map(action => {return `<span class="has-text-info">${action}</span>`;}).join(', ')} for ${conflict.resList.map(res => {return `<span class="has-text-info">${res}</span>`;}).join(', ')} (${conflict.obj.cause})`);
            }
        }

        if (obj instanceof Technology) {
            if (state.queuedTargetsAll.includes(obj)) {
                notes.push("Queued research, processing...");
            } else if (state.triggerTargets.includes(obj)) {
                notes.push("Active trigger, processing...");
            } else {
                let conflict = getTechConflict(obj);
                if (conflict) {
                    notes.push(conflict);
                }
            }
        }

        if (obj === buildings.GorddonFreighter && haveTech('banking', 13)) {
            let count = obj.stateOnCount;
            let total = (((1 + ((count + 1) * 0.03)) / (1 + ((count) * 0.03))) - 1) * 100;
            let crew = total / 3;
            notes.push(`Next level will increase ${buildings.AlphaExchange.title} storage by +${getNiceNumber(total)}% (+${getNiceNumber(crew)}% per crew)`);
        }
        if (obj === buildings.Alien1SuperFreighter && haveTech('banking', 13)) {
            let count = obj.stateOnCount;
            let total = (((1 + ((count + 1) * 0.08)) / (1 + ((count) * 0.08))) - 1) * 100;
            let crew = total / 5;
            notes.push(`Next level will increase ${buildings.AlphaExchange.title} storage by +${getNiceNumber(total)}% (+${getNiceNumber(crew)}% per crew)`);
        }
        if (obj === buildings.Hospital
            || (obj === buildings.BootCamp && game.global.race['artifical'])
            || (obj === buildings.EnceladusBase && game.global.race['orbit_decayed'])) {
            notes.push(`~${getNiceNumber(getHealingRate())} soldiers healed per day`);
        }
        if (obj === buildings.Hospital) {
            let growth = 1 / (getGrowthRate() * 4); // Fast loop, 4 times per second
            notes.push(`~${getNiceNumber(growth)} seconds to increase population`);
        }
        if (obj === buildings.PortalCarport && jobs.HellSurveyor.count > 0) {
            let influx = 5 * (1 + (buildings.BadlandsAttractor.stateOnCount * 0.22));
            let demons = (influx * 10 + influx * 50) / 2;
            let divisor = getGovernor() === 'sports' ? 1100 : 1000;
            divisor *= traitVal('blurry', 0, '+');
            divisor *= traitVal('instinct', 0, '+');
            divisor += haveTech('infernite', 5) ? 250 : 0;
            let danger = demons / divisor;
            let risk = 10 - Math.min(10, jobs.HellSurveyor.count) / 2;
            let rate = (danger / 2 * Math.min(1, danger / risk));
            let wreck = 1 / (rate / 5); // Long loop, once per 5 seconds
            notes.push(`Up to ~${getNiceNumber(wreck)} seconds to break car (with full supression)`);
        }
        if (obj === buildings.PortalRepairDroid) {
            let wallRepair = Math.round(200 * (0.95 ** obj.stateOnCount)) / 4;
            let carRepair = Math.round(180 * (0.92 ** obj.stateOnCount)) / 4;
            notes.push(`${getNiceNumber(wallRepair)} seconds to repair 1% of wall`);
            notes.push(`${getNiceNumber(carRepair)} seconds to repair car`);
        }
        if (obj === buildings.BadlandsAttractor) {
            let influx = 5 * (1 + (obj.stateOnCount * 0.22));
            let gem_chance = game.global.stats.achieve.technophobe?.l >= 5 ? 9000 : 10000;
            if (game.global.race.universe === 'evil' && resources.Dark.currentQuantity > 1) {
                let de = resources.Dark.currentQuantity * (1 + resources.Harmony.currentQuantity * 0.01);
                gem_chance -= Math.round(Math.log2(de) * 2);
            }
            gem_chance = Math.round(gem_chance * (0.948 ** obj.stateOnCount));
            gem_chance = Math.round(gem_chance * traitVal('ghostly', 2, '-'));
            gem_chance = Math.max(12, gem_chance);
            let drop = (1 / gem_chance) * 100;
            notes.push(`~${getNiceNumber(drop)}% chance to find ${resources.Soul_Gem.title}`);
            notes.push(`Up to ~${getNiceNumber(influx*10)}-${getNiceNumber(influx*50)} demons spawned per day`);
        }
        if (obj === buildings.Smokehouse) {
            let spoilage = 50 * (0.9 ** obj.count);
            notes.push(`${getNiceNumber(spoilage)}% of stored ${resources.Food.title} spoiled per second`);
        }
        if (obj === buildings.LakeCoolingTower) {
            let coolers = buildings.LakeCoolingTower.stateOnCount;
            let current = 500 * (0.92 ** coolers);
            let next = 500 * (0.92 ** (coolers+1));
            let diff = ((current - next) * buildings.LakeHarbor.stateOnCount) * (game.global.race['emfield'] ? 1.5 : 1);
            notes.push(`Next level will decrease total consumption by ${getNiceNumber(diff)} MW`);
        }
        if (obj === buildings.DwarfShipyard) {
            if (settings.autoFleet && FleetManagerOuter.nextShipMsg) {
                notes.push(FleetManagerOuter.nextShipMsg);
            }
        }
        if (obj === buildings.IsleSpiritBattery) {
            // Pulled from game's edenic.js in v1.4.8
            const batteries = buildings.IsleSpiritBattery.stateOnCount;
            let coefficient = 0.9;

            if (game.global.race['warlord'] && buildings.AsphodelCorruptor && game.global.tech?.asphodel >= 13) {
                const corruptors = buildings.AsphodelCorruptor.on;
                coefficient = 1 - (1 + (corruptors || 0) * 0.03) / 10;
            }

            const current = 18_000 * (coefficient ** batteries);
            const next = 18_000 * (coefficient ** (batteries + 1));
            const diff = ((current - next) * buildings.IsleSpiritVacuum.stateOnCount) * (game.global.race['emfield'] ? 1.5 : 1);
            notes.push(`Next level will decrease total consumption by ${getNiceNumber(diff)} MW`);
        }

        if (obj.extraDescription) {
            notes.push(obj.extraDescription);
        }
        return notes.join("<br>");
    }

    function tooltipObserverCallback(mutations) {
        if (!settings.masterScriptToggle) {
            return;
        }
        mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
            if (node.id === "popper") {
                let popperObserver = new MutationObserver((popperMutations) => {
                    // Add tooltips once again when popper cleared
                    if (!node.querySelector(".script-tooltip")) {
                        popperObserver.disconnect();
                        addTooltip(node);
                        popperObserver.observe(node, {childList: true});
                    }
                })
                addTooltip(node);
                popperObserver.observe(node, {childList: true});
            }
        }));
    }

    const infusionStep = {"blood-lust": 15, "blood-illuminate": 12, "blood-greed": 16, "blood-hoarder": 14, "blood-artisan": 8, "blood-attract": 4, "blood-wrath": 2};
    function addTooltip(node) {
        $(node).append(`<span class="script-tooltip" hidden></span>`);
        let dataId = node.dataset.id;
        // Tooltips for things with no script objects
        if (dataId === 'powerStatus') {
            $(node).append(`<p class="modal_bd"><span>Disabled</span><span class="has-text-danger">${getNiceNumber(resources.Power.maxQuantity)}</span></p>`);
            return;
        } else if (infusionStep[dataId]) {
            $(node).find('.costList .res-Blood_Stone').append(` (+${infusionStep[dataId]})`);
            return;
        } else if (state.tooltips[dataId]) {
            $(node).append(`<div style="border-top: solid .0625rem #999">${state.tooltips[dataId]}</div>`);
            return;
        }

        let match = null;
        let obj = null;
        if (match = dataId.match(/^popArpa([a-z_-]+)\d*$/)) { // "popArpa[id-with-no-tab][quantity]" for projects
            obj = arpaIds["arpa" + match[1]];
        } else if (match = dataId.match(/^q([A-Za-z_-]+)\d*$/)) { // "q[id][order]" for buildings in queue
            obj = buildingIds[match[1]] || arpaIds[match[1]];
        } else { // "[id]" for buildings and researches
            obj = buildingIds[dataId] || techIds[dataId];
        }
        if (!obj || (obj instanceof Technology && obj.isResearched())) {
            return;
        }

        // Flair, added before other descriptions
        if (obj === buildings.BlackholeStellarEngine && game.global.race.universe !== "magic" && buildings.BlackholeMassEjector.count > 0 && game.global.interstellar.stellar_engine.exotic < 0.025) {
            let massPerSec = (resources.Elerium.atomicMass * game.global.interstellar.mass_ejector.Elerium + resources.Infernite.atomicMass * game.global.interstellar.mass_ejector.Infernite) || -1;
            let missingExotics = (0.025 - game.global.interstellar.stellar_engine.exotic) * 1e10;
            $(node).append(`<div id="popTimer" class="flair has-text-advanced">Contaminated in [${poly.timeFormat(missingExotics / massPerSec)}]</div>`);
        }
        if (obj === buildings.TauRedJeff && buildings.TauRedWomlingLab.count > 0) {
            let expo = game.global.stats.achieve.overlord?.l >= 5 ? 4.9 : 5;
            expo -= game.global.race['lone_survivor'] ? 0.1 : 0;
            let nextTech = ((game.global.tech.womling_tech + 2) ** expo);
            let curTech = game.global.tauceti.womling_lab.tech;
            let completion = Math.floor((curTech / nextTech) * 100);
            $(node).find('div:eq(1)>div:eq(5)').append(` (${completion}%)`);
            let rate = (game.global.tauceti.womling_lab.scientist / 2) * Math.min(1, game.global.tauceti.womling_lab.scientist * 0.1);
            let eta = rate > 0 ? Math.ceil((nextTech - curTech) / rate) : -1;
            $(node).append(`<div id="popTimer" class="flair has-text-advanced">Next Tech Level in ~[${poly.timeFormat(eta)}]</div>`);
        }

        let description = getTooltipInfo(obj);
        if (description) {
            $(node).append(`<div style="border-top: solid .0625rem #999">${description}</div>`);
        }
    }

    function updateOverrides() {
        // Safe mode doesn't update overrides and always disables script toggle
        if (safeMode) {
            Object.assign(settings, settingsRaw);
            settings.masterScriptToggle = false;
            return;
        }

        let xorLists = {};
        let overrides = {};
        for (let key in settingsRaw.overrides) {
            let conditions = settingsRaw.overrides[key];
            for (let i = 0; i < conditions.length; i++) {
                let check = conditions[i];
                try {
                    if (!checkTypes[check.type1]) {
                        throw `${check.type1} variable not found`;
                    }
                    if (!checkTypes[check.type2]) {
                        throw `${check.type2} variable not found`;
                    }
                    if (!checkCompare[check.cmp]) {
                        throw `${checkCompare[check.cmp]} comparator not found`;
                    }
                    let var1 = checkTypes[check.type1].fn(check.arg1);
                    let var2 = checkTypes[check.type2].fn(check.arg2);
                    if (!checkCompare[check.cmp](var1, var2)) {
                        continue;
                    }
                    let ret = checkCustom[check.cmp] ? var2 : check.ret;

                    if (typeof settingsRaw[key] === typeof ret) {
                        // Override single value
                        overrides[key] = ret;
                        break;
                    } else if (typeof settingsRaw[key] === "object") {
                        // Xor lists
                        xorLists[key] = xorLists[key] ?? [];
                        xorLists[key].push(ret);
                    } else {
                        throw `Expected type: ${typeof settingsRaw[key]}; Override type: ${typeof ret}`;
                    }
                } catch (error) {
                    let msg = `Condition ${i+1} for setting ${key} invalid! Fix or remove it. (${error})`;
                    if (!WindowManager.isOpen() && !Object.values(game.global.lastMsg.all).find(log => log.m === msg)) { // Don't spam with errors
                        GameLog.logDanger("special", msg, ['events', 'major_events']);
                    }
                    continue; // Some argument not valid, skip condition
                }
            }
        }

        if (haveTask("bal_storage") || haveTask("combo_storage")) {
            overrides["autoStorage"] = false;
        }
        if (haveTask("trash")) {
            overrides["autoEject"] = false;
        }
        if (haveTask("tax")) {
            overrides["autoTax"] = false;
        }
        let rawTickRate = overrides["tickRate"] ?? settingsRaw["tickRate"];
        overrides["tickRate"] = Math.min(240, Math.max(1, Math.round(rawTickRate*2))/2);

        // Apply overrides
        Object.assign(settings, settingsRaw, overrides);

        // Xor lists
        for (let key in xorLists) {
            settings[key] = settingsRaw[key].slice();
            for (let item of xorLists[key]) {
                let index = settings[key].indexOf(item);
                if (index > -1) {
                    settings[key].splice(index, 1);
                } else {
                    settings[key].push(item);
                }
            }
        }

        let currentNode = $(`#script_override_true_value:visible`);
        if (currentNode.length !== 0) {
            changeDisplayInputNode(currentNode);
        }
    }

    function automateLab() {
        let createCustom = document.querySelector("#celestialLab .create button");
        if (createCustom) {
            updateOverrides(); // Game doesn't tick in lab. Update settings here.
            if (settings.masterScriptToggle && settings.autoPrestige && ["ascension", "terraform", "apotheosis"].includes(settings.prestigeType)) {
                state.goal = "GameOverMan";
                createCustom.click();
                return;
            }
        }
    }

    function automate() {
        if (state.goal === "GameOverMan" || state.forcedUpdate || !state.gameTicked) {
            return;
        }
        state.gameTicked = false;
        if (state.scriptTick < Number.MAX_SAFE_INTEGER) {
            state.scriptTick++;
        } else {
            state.scriptTick = 1;
        }
        if (state.scriptTick % (game.global.settings.at ? settings.tickRate * 2 : settings.tickRate) !== 0) {
            return;
        }

        updateScriptData(); // Sync exposed data with script variables
        updateOverrides();  // Apply settings overrides as soon as possible
        finalizeScriptData(); // Second part of updating data, applying settings

        // Redraw tabs once they unlocked
        if (updateTabs(true)) {
            return;
        }

        // TODO: Properly sepparate updateState between updateScriptData and finalizeScriptData
        updateState();
        updateUI();
        KeyManager.reset();

        // The user has turned off the master toggle. Stop taking any actions on behalf of the player.
        // We've still updated the UI etc. above; just not performing any actions.
        if (!settings.masterScriptToggle) { return; }

        if (state.goal === "Evolution") {
            if (settings.autoEvolution) {
                autoEvolution();
            }
            return;
        }

        if (settings.buildingAlwaysClick || settings.autoBuild){
            autoGatherResources();
        }
        if (settings.autoMarket) {
            autoMarket(); // Invalidates values of resources, changes are random and can't be predicted, but we won't need values anywhere else
        }
        if (settings.autoHell) {
            autoHell();
        }
        if (settings.autoGalaxyMarket) {
            autoGalaxyMarket();
        }
        if (settings.autoMiningDroid) {
            autoMiningDroid();
        }
        if (settings.autoGraphenePlant) {
            autoGraphenePlant();
        }
        if (settings.autoAlchemy) {
            autoAlchemy();
        }
        if (settings.autoPylon) {
            autoPylon();
        }
        if (settings.autoQuarry) {
            autoQuarry();
        }
        if (settings.autoMine) {
            autoMine();
        }
        if (settings.autoExtractor) {
            autoExtractor();
        }
        if (settings.autoSmelter) {
            autoSmelter();
        }
        if (settings.autoStorage) {
            // Called before autoJobs, autoFleet and autoPower - so they wont mess with quantum
            autoStorage();
        }
        if (settings.autoReplicator) {
            autoReplicator();
        }
        if (!settings.autoTrigger || !autoTrigger()) {
            // Only go to autoResearch and autoBuild if triggers not building anything at this very moment, to ensure they won't steal reasources from triggers
            if (settings.autoResearch) {
                autoResearch(); // Called before autoBuild and autoGenetics - knowledge goes to techs first
            }
            if (settings.autoBuild || settings.autoARPA) {
                autoBuild(); // Called after autoStorage to compensate fluctuations of quantum(caused by previous tick's adjustments) levels before weightings
            }
        }
        if (settings.autoFactory) {
            autoFactory();
        }
        if (settings.autoJobs) {
            autoJobs();
        } else if (settings.autoCraftsmen) {
            autoJobs(true);
        }
        if (settings.autoFleet) {
            if (game.global.race['truepath']) {
                autoFleetOuter();
            } else {
                autoFleet(); // Need to know Mine Layers stateOnCount, called before autoPower while it's still valid
            }
        }
        if (settings.autoMech) {
            autoMech(); // Called after autoBuild, to prevent stealing supplies from mechs
        }
        if (settings.autoGenetics) {
            autoGenetics(); // Called after autoBuild and autoResearch to prevent stealing knowledge from them
        }
        if (settings.autoMinorTrait) {
            autoMinorTrait(); // Called after auto assemble to utilize new genes right asap
        }
        if (settings.autoCraft) {
            autoCraft(); // Invalidates quantities of craftables, missing exposed craftingRatio to calculate craft result on script side
        }
        if (settings.autoFight) {
            autoMerc();
            autoSpy(); // Can unoccupy foreign power in rare occasions, without caching back new status, but such desync should not cause any harm
            autoBattle(); // Invalidates garrison, and adds unaccounted amount of resources after attack
        }
        if (settings.autoTax) {
            autoTax();
        }
        if (settings.autoGovernment) {
            autoGovernment();
        }
        if (settings.autoNanite) {
            autoConsume(NaniteManager); // Purge remaining rateOfChange, should be called when it won't be needed anymore
        }
        if (settings.autoSupply) {
            autoConsume(SupplyManager);
        }
        if (settings.autoEject) {
            autoConsume(EjectManager);
        }
        if (settings.autoPower) { // Called after purging of rateOfChange, to know useless resources
            autoPower();
        }
        if (isPrestigeAllowed()) {
            autoPrestige(); // Called after autoBattle to not launch attacks right before reset, killing soldiers
        }
        if (settings.autoMinorTrait) {
            autoShapeshift(); // Shifting genus can remove techs, buildings, resources, etc. Leaving broken preloaded buttons behind. This thing need to be at the very end, to prevent clicking anything before redrawing tabs
            autoPsychic();
            autoOcularPowers();
            autoWish();
        }
        if (settings.autoMutateTraits) {
            autoMutateTrait();
        }

        KeyManager.finish();
        state.soulGemLast = resources.Soul_Gem.currentQuantity;
    }

    function mainAutoEvolveScript() {
        // This is a hack to check that the entire page has actually loaded. The queueColumn is one of the last bits of the DOM
        // so if it is there then we are good to go. Otherwise, wait a little longer for the page to load.
        if (document.getElementById("queueColumn") === null) {
            setTimeout(mainAutoEvolveScript, 100);
            return;
        }

        // We'll need real window to access vue objects
        if (typeof unsafeWindow !== 'undefined') {
            win = unsafeWindow;
        } else {
            win = window;
            // Chrome overrides original JQuery with one required by script, we need to restore it to get $._data with events handlers
            // I'd get rid of this JQuery copy altogether, that's a right way to do it. No duplicate - no conflicts... But that breaks that damn FF.
            if (!win.$._data(win.document).events?.['keydown']) {
                $.noConflict();
            }
        }
        game = win.evolve;

        // Check if game exposing anything
        if (!game) {
            if (state.warnDebug) {
                state.warnDebug = false;
                alert("You need to enable Debug Mode in settings for script to work");
            }
            setTimeout(mainAutoEvolveScript, 100);
            return;
        }

        // Wait until exposed data fully initialized ('p' in fastLoop, 'c' in midLoop)
        if (!game.global?.race || !game.breakdown.p.consume) {
            setTimeout(mainAutoEvolveScript, 100);
            return;
        }

        // Now we can check setting. Ensure game tabs are preloaded
        if (!game.global.settings.tabLoad) {
            if (state.warnPreload) {
                state.warnPreload = false;
                alert("You need to enable Preload Tab Content in settings for script to work");
            }
            setTimeout(mainAutoEvolveScript, 100);
            return;
        }

        // Make sure we have jQuery UI even if script was injected without *monkey
        if (!$.ui) {
            let el = document.createElement("script");
            el.src = "https://code.jquery.com/ui/1.12.1/jquery-ui.min.js";
            el.onload = mainAutoEvolveScript;
            el.onerror = () => alert("Can't load jQuery UI. Check browser console for details.");
            document.body.appendChild(el);
            return;
        }

        // Dealing with userscript sandbox
        // With our @grant none we usually try to run in the page context. This is normally bad for userscripts (can be detected by the page etc)
        // but this is perfect since the game has debug mode built in on purpose just for us. We get the best possible performance too and there
        // is no security risk because we don't use any special browser/userscript/GM_ APIs.
        //
        // But depending on the userscript manager and browser it is possible we end up in the sandbox anyway.
        // They are not all alike in how they load scripts.
        // The default functions in poly. call cloneInto() on a whole bunch of stuff to make the script work when sandboxed in Firefox.
        // Chrome's sandbox is probably just broken in general, but luckily the most common ones will not sandbox us.
        //
        // But, even when we are not sandboxed, some userscript managers set unsafeWindow and cloneInto anyway, for compatibility.
        // This will work fine in the rest of the script's detections, since there it is not performance relevant, but these functions are much slower
        // than the game's original functions. So, include a check to make sure that it is worth using cloneInto.
        // The rest of the checks don't need adjusting as unsafeWindow === window in this case and they all use the same code anyway,
        // so there is no performance loss there.
        // If we don't need the sandboxed functions, we can discard our poly. wrappers and directly call the game's ones.
        needSandboxBypass = typeof unsafeWindow === "object" && typeof cloneInto === "function" && typeof exportFunction === "function" && unsafeWindow !== window;
        if (!needSandboxBypass) {
            poly.adjustCosts = game.adjustCosts;
            poly.loc = game.loc;
            poly.messageQueue = game.messageQueue;
            poly.shipCosts = game.shipCosts;
        }

        addErrorHandler();
        addScriptStyle();
        KeyManager.init();
        initialiseState();
        initialiseRaces();
        initialiseScript();
        updateOverrides();

        // Hook to game loop, to allow script run at full speed in unfocused tab
        const setCallback = (fn) => !needSandboxBypass ? fn : exportFunction(fn, unsafeWindow);
        // This should be the last var set in game's debug.js:updateDebugData(), otherwise we may be working with partially outdated data
        let breakdown = game.breakdown;
        Object.defineProperty(game, 'breakdown', {
            get: setCallback(() => breakdown),
            set: setCallback(v => {
                breakdown = v;
                state.gameTicked = true;
                if (settings.tickSchedule) {
                    setTimeout(automate);
                } else {
                    automate();
                }
            })
        });
        // Game disables workers in lab ui, we need to check that outside of debug hook
        setInterval(automateLab, 2500);

        // Expose saving/loading functions so that they can be called by other scripts
        win.importAutomationSettings = importSettings;
        win.exportAutomationSettings = exportSettings;

        // Safe mode warning, if active. Hope users can't miss it
        if (safeMode) {
            const msg = [
                `Script safe mode is active to let you solve problems in your configuration.`,
                `The masterScriptToggle is always disabled in this mode, and your overrides don't get evaluated.`,
                `Fix the problems that required you to use this mode, then remove ?safemode from the URL to deactivate.`,
            ].join("\n");
            displayScriptWarningNode("Safe mode active", msg, null);
            poly.messageQueue(msg, "warning", true, ['events', 'major_events']);
        }
    }

