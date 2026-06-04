    function updateTabs(update) {
        let oldHash = state.tabHash;
        state.tabHash = 0 // Not really a hash, but it should never go down, that's enough to track unlocks. (Except market after mutation in terrifying, 1000 weight should prevent all possible issues)
          + (game.global.race['smoldering'] && buildings.RockQuarry.count ? 1 : 0) // Chrysotile production
          + (game.global.race['shapeshifter'] ? 1 : 0) // Shifter UI
          + (game.global.race['servants'] ? 1 : 0) // Servants UI
          + (game.global.settings.showMarket ? 1000 : 0) // Market tab unlocked
          + (game.global.galaxy.trade ? 1 : 0) // Galaxy trades unlocked
          + (game.global.settings.showEjector ? 1 : 0) // Ejector tab unlocked
          + (game.global.settings.showCargo ? 1 : 0) // Supply tab unlocked
          + (game.global.tech.alchemy ?? 0) // Basic & advanced transmutations
          + (game.global.tech.queue ? 1 : 0) // Queue unlocked
          + (game.global.tech.r_queue ? 1 : 0) // Research queue unlocked
          + (game.global.tech.govern ? 1 : 0) // Government unlocked
          + (game.global.tech.spy >= 2 ? 1 : 0) // SpyOp governor task
          + (game.global.tech.trade ? 1 : 0) // Trade Routes unlocked
          + (resources.Crates.isUnlocked() ? 1 : 0) // Crates in storage tab
          + (resources.Containers.isUnlocked() ? 1 : 0) // Containers in storage tab
          + (game.global.tech.m_smelting >= 2 ? 1 : 0) // TP Iridium smelting
          + (game.global.tech.irid_smelting ? 1 : 0) // Iridium smelting
          + (buildings.TitanQuarters.count > 0 ? 1 : 0) // Titan Mine unlocked
          + (game.global.race['orbit_decayed'] ? 1 : 0) // City tab gone
          + (game.global.tech.womling_tech ?? 0) // Womling techs
          + (game.global.tech.focus_cure ?? 0) // Cure techs
          + (game.global.tech.isolation ? 1 : 0) // Solar tabs gone
          + (game.global.tech.m_ignite ? 1 : 0) // Ignition Device built
          + (buildings.TauStarRingworld.count >= 1000 ? 1 : 0) // Ringworld built
          + (game.global.tech.tau_gas2 >= 5 ? 1 : 0) // Alien Space Station built
          + (game.global.tech.replicator ? 1 : 0) // Matter Replicator unlocked
          + (game.global.tauceti.tau_factory?.count > 0 ? 1 : 0) // Factory built in lone survivor
          + (game.global.space.g_factory?.count > 0 ? 1 : 0) // Graphene plant built in lone survivor
          + (game.global.tauceti.mining_ship?.count > 0 ? 1 : 0) // Extractor ship built
          + (game.global.tech.psychicthrall ?? 0) // Psychic powers
          + (game.global.tech.psychic ?? 0) // Psychic powers
          + (game.global.tech.edenic >= 1 ? 1 : 0) // Spire floor 50 Eden access
          + (game.global.tech.isle >= 3 ? 1 : 0) // Edenic north/south piers -> spirit syphon tech
          + (game.global.tech.palace >= 4 ? 1 : 0) // Edenic sealed tomb -> energy drain tech
        ;

        if (game.global.settings.showShipYard) { // TP Ship Yard
          state.tabHash += 1
            + (game.global.tech.syard_class ?? 0) // Tiers of unlocked components
            + (game.global.tech.syard_power ?? 0)
            + (game.global.tech.syard_weapon ?? 0)
            + (game.global.tech.syard_armor ?? 0)
            + (game.global.tech.syard_engine ?? 0)
            + (game.global.tech.syard_sensor ?? 0)
            + (haveTech('titan', 3) && haveTech('enceladus', 2) ? 1 : 0) // Enceladus syndicate
            + (haveTech('triton', 2) ? 1 : 0) // Triton syndicate
            + (haveTech('kuiper') ? 1 : 0) // Kuiper syndicate
            + (haveTech('eris') ? 1 : 0) // Eris syndicate
            + (haveTech('eris', 2) ? 1 : 0) // Eris scanning
            + (haveTech('titan_ai_core') ? 1 : 0) // AI core built, drones unlocked
            + (haveTech('tauceti') ? 1 : 0); // Interstellar drive researched, explorer inlocked
        }

        if (game.global.race['shapeshifter']){
            state.tabHash += (game.global.race.ss_genus ?? 'none').split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
        }

        if (update && state.tabHash !== oldHash){
            let mainVue = win.$('#mainColumn > div:first-child')[0].__vue__;
            mainVue.s.civTabs = 7;
            mainVue.s.tabLoad = false;
            mainVue.toggleTabLoad();
            mainVue.s.tabLoad = true;
            mainVue.toggleTabLoad();
            mainVue.s.civTabs = game.global.settings.civTabs;
            return true;
        } else {
            return false;
        }
    }

    function getMultiSegmentedTimeLeft(target) {
        let remainingSegments = target.gameMax - target.count;

        if (target instanceof Project) {
            remainingSegments = (100 - target.progress) / target.currentStep;
        }

        let longestResource = '',
            longestTimeLeft = 0;

        Object.keys(target.cost).forEach(resource => {
            const resourceCostTotal = (target.cost[resource] * remainingSegments);
            const resourceTimeLeftRaw = (resourceCostTotal - game.global.resource[resource].amount) / game.global.resource[resource].diff;

            if (resourceTimeLeftRaw > longestTimeLeft && resourceCostTotal > game.global.resource[resource].amount) {
                longestResource = resource;
                longestTimeLeft = resourceTimeLeftRaw;
            }
        });

        const timeLeft = longestTimeLeft === Infinity ? 'Never' : poly.timeFormat(longestTimeLeft);

        return {
            resource: longestResource,
            timeLeft
        };
    }

    function updateActiveTargetsUI(queuedTargets, type) {
        if (queuedTargets.length) {
            $(`#active_targets .target-type-box.${type}`).show();
        } else {
            $(`#active_targets .target-type-box.${type}`).hide();
            return;
        }

        $(`#active_targets ul.active_targets-list.${type}`).html(queuedTargets.map(target => {
            let targetName = target.name,
                targetTimeLeft = '',
                targetSegments = '',
                researchTimeLeft = 0,
                isArpaProject = type === 'arpa' || target instanceof Project,
                isMultiSegmented = target.is && target.is.multiSegmented,
                isTablessBuilding = type === 'buildings' && !target._tab;

            if (target.count && !isMultiSegmented) {
                targetName += ` #${target.count + 1}`;
            }

            if (target.instance && target.instance.time) {
                targetTimeLeft = `${target.instance.time}`;
            }

            const costs = target.cost;

            if (target instanceof Technology) {
                if ($.isEmptyObject(target.cost)) {
                    targetTimeLeft = 'Waiting on prerequisite';
                } else if (target.cost.Knowledge > game.global.resource.Knowledge.max) {
                    targetTimeLeft = 'Not enough Knowledge';
                }
            } else if (isArpaProject) {
                targetName += ` (${target.progress}%)`;

                const segmentedTimeLeft = getMultiSegmentedTimeLeft(target);
                targetTimeLeft = `${segmentedTimeLeft.timeLeft}</span> <span class="has-text-danger">(${segmentedTimeLeft.resource})</span>`;
            }

            const costsHTML = Object.keys(costs).map(resource => {
                let res = resources[resource],
                    className = 'has-text-success',
                    resourceTimeLeft = '';

                let resourceCost = costs[resource];

                if (isArpaProject) {
                    resourceCost = costs[resource] * ((100 - target.progress) / target.currentStep);
                } else if (isMultiSegmented) {
                    resourceCost = costs[resource] * (target.gameMax - target.count);
                }

                if (res.currentQuantity < resourceCost) {
                    className = 'has-text-danger';

                    if (res.maxQuantity >= resourceCost && res.income > 0) {
                        const timeLeftRaw = (resourceCost - res.currentQuantity) / res.income;

                        if (target instanceof Technology && timeLeftRaw > researchTimeLeft) {
                            researchTimeLeft = timeLeftRaw;
                        }

                        resourceTimeLeft = `${poly.timeFormat(timeLeftRaw)}`;
                        if (res === resources.Soul_Gem) {
                            resourceTimeLeft = `~${resourceTimeLeft}`;
                        }
                    } else if (isArpaProject && res.name === 'Knowledge' && res.income > 0) {
                        resourceTimeLeft = poly.timeFormat(res.currentQuantity / res.income);
                    } else {
                        targetTimeLeft = resourceTimeLeft = 'Never';
                    }
                }

                const progressBarWidth = (res.currentQuantity / resourceCost) * 100;

                const isReplicatingClassName = (game.global.race.replicator && game.global.race.replicator.res === resource) ? 'is-replicating' : '';

                return `
                    <li>
                        <div class='active_targets-resource-row'>
                            <div class='active_targets-resource-text'>
                                <span class='${className}'>${res.title}</span>
                            </div>
                            <div class="percentage-full-progress-bar-wrapper ${isReplicatingClassName}">
                                <div class="percentage-full-progress-bar" style="width: ${progressBarWidth}%;"></div>
                            </div>
                            <div class="active_targets-time-left">${resourceTimeLeft}</div>
                        </div>
                    </li>`;
            }).join('');

            if (isMultiSegmented) {
                targetSegments = `(${target.count} / ${target.gameMax})`;

                const segmentedTimeLeft = getMultiSegmentedTimeLeft(target);
                targetTimeLeft = `${segmentedTimeLeft.timeLeft} <span class="has-text-danger">(${segmentedTimeLeft.resource})</span>`;
            }

            if (target instanceof Technology && targetTimeLeft === '') {
                targetTimeLeft = poly.timeFormat(researchTimeLeft);
            }

            const targetNameDisplay = `<span class="active-target-title name">${targetName} </span><span class="active-target-title time">${targetTimeLeft} <span class="active-target-segments has-text-special">${targetSegments}</span></span>`;


            // for finding element in queue
            let queueid = '';
            if (type === 'buildings') {
                queueid = isTablessBuilding ? `${target.id}` : `${target._tab}-${target.id}`;
            } else if (type === 'arpa') {
                queueid = `${target._tab}${target.id}`;
            } else if (type === 'research' || type === 'triggers') {
                queueid = target.id;
            }

            return `
                    <li class="active-target-li">
                        ${targetNameDisplay} <span class="active-target-remove-x ${type}" data-queueid="${queueid}" data-type="${type}">＋</span>
                        <ul class="active_targets-sub-list">
                            ${costsHTML}
                        </ul>
                    </li>
                `;
        }));
    }

    function updateState() {
        if (game.global.race.species === "protoplasm") {
            state.goal = "Evolution";
        } else if (state.goal === "Evolution") {
            // Check what we got after evolution
            if (!checkEvolutionResult()) {
                return;
            }
            state.goal = "Standard";
            if (settingsRaw.triggers.length > 0) { // We've moved from evolution to standard play. There are technology descriptions that we couldn't update until now.
                updateTriggerSettingsContent();
            }
        } else if (game.global.stats.days === 1 && (game.global.race.slow || game.global.race.hyper || game.global.race.species === "junker")) {
            // Fallback check, in case if game reloaded page after evolution
            if (!checkEvolutionResult()) {
                return;
            }
        }

        // Reset required storage and prioritized resources
        for (let id in resources) {
            resources[id].maxCost = 0;
            resources[id].storageRequired = 1;
            resources[id].requestedQuantity = 0;
        }
        StorageManager.crateValue = poly.crateValue();
        StorageManager.containerValue = poly.containerValue();
        updatePriorityTargets();  // Set queuedTargets and triggerTargets
        ProjectManager.updateProjects(); // Set obj.cost, uses triggerTargets
        calculateRequiredStorages(); // Uses obj.cost
        prioritizeDemandedResources(); // Set res.requestedQuantity, uses queuedTargets and triggerTargets

        state.tooltips = {};
        state.moneyIncomes.shift();
        for (let i = state.moneyIncomes.length; i < 11; i++) {
            state.moneyIncomes.push(resources.Money.rateOfChange);
        }
        state.moneyMedian = [...state.moneyIncomes].sort((a,b) => a - b)[5];

        // This comes from the "const towerSize = (function(){" in portal.js in the game code
        let towerSize = 1000;
        if (game.global.hasOwnProperty('pillars')){
            for (let pillar in game.global.pillars) {
                if (game.global.pillars[pillar]){
                    towerSize -= game.global.pillars[pillar] * 2 + 2;
                }
            }
        }
        if (towerSize < 250){ towerSize = 250; }

        state.astroSign = poly.astrologySign();

        buildings.GateEastTower.gameMax = towerSize;
        buildings.GateWestTower.gameMax = towerSize;

        // Check to see if user stabilized by detecting exotic mass going down
        if ((game.global.interstellar?.stellar_engine?.exotic ?? 0) < state.whiteholeLastExoticMass) {
            state.whiteholeLastStabilise = Date.now();
        }
        state.whiteholeLastExoticMass = game.global.interstellar?.stellar_engine?.exotic ?? 0;

        // Space dock is special and has a modal window with more buildings!
        if (!buildings.GasSpaceDock.isOptionsCached()) {
            buildings.GasSpaceDock.cacheOptions();
        }

        if (settings.activeTargetsUI) {
            const queuedTargets = state.queuedTargetsAll;

            const triggersList = state.triggerTargets,
                buildingsList = [],
                researchList = [],
                arpaList = [];

            queuedTargets.forEach(target => {
                if (target instanceof Technology) {
                    researchList.push(target);
                } else if (target instanceof Project) {
                    arpaList.push(target);
                } else {
                    buildingsList.push(target);
                }
            });

            updateActiveTargetsUI(triggersList, 'triggers');
            updateActiveTargetsUI(buildingsList, 'buildings');
            updateActiveTargetsUI(researchList, 'research');
            updateActiveTargetsUI(arpaList, 'arpa');

            // remove from queue by clicking
            $(".active-target-remove-x").click(function() {
                const queueId = $(this).data('queueid'),
                    type = $(this).data('type');

                const $queuedItem = $(".queued").filter((id, el) => {return el.id.indexOf(queueId) > -1});

                if (type === 'triggers') {
                    const clickedTrigger = TriggerManager.targetTriggers.find(trigger => trigger.actionId.includes(queueId));

                    if (clickedTrigger !== undefined && clickedTrigger !== null) {
                        clickedTrigger.complete = true;
                    }
                } else if ($queuedItem?.length) {
                    $queuedItem[0].click();
                }

                $("#active_targets-wrapper").css('height', 'auto');
            });
        } else {
            $(".active-target-remove-x").off('click');
        }
    }

    function verifyGameActions() {
        // Check that actions that exist in game also exist in our script
        verifyGameActionsExist(game.actions.city, buildings, false);
        verifyGameActionsExist(game.actions.space, buildings, true);
        verifyGameActionsExist(game.actions.interstellar, buildings, true);
        verifyGameActionsExist(game.actions.portal, buildings, true);
        verifyGameActionsExist(game.actions.galaxy, buildings, true);
        verifyGameActionsExist(game.actions.tauceti, buildings, true);
        verifyGameActionsExist(game.actions.eden, buildings, true);
    }

    function verifyGameActionsExist(gameObject, scriptObject, hasSubLevels) {
        let scriptKeys = Object.keys(scriptObject);
        for (let gameActionKey in gameObject) {
            if (!hasSubLevels) {
                verifyGameActionExists(scriptKeys, scriptObject, gameActionKey, gameObject);
            } else {
                // This object has sub levels - iterate through them
                let gameSubObject = gameObject[gameActionKey];
                for (let gameSubActionKey in gameSubObject) {
                    verifyGameActionExists(scriptKeys, scriptObject, gameSubActionKey, gameSubObject);
                }
            }
        }
    }

    function verifyGameActionExists(scriptKeys, scriptObject, gameActionKey, gameObject) {
        // We know that we don't have the info objects defined in our script
        // gift is a special santa gift. Leave it to the player.
        // bonfire and firework belongs to seasonal events
        // replicator is a fake building
        if (["info", "gift", "bonfire", "firework", "replicator"].includes(gameActionKey)) {
            return;
        }

        let scriptActionFound = false;

        for (let i = 0; i < scriptKeys.length; i++) {
            const scriptAction = scriptObject[scriptKeys[i]];
            if (scriptAction.id === gameActionKey) {
                scriptActionFound = true;
                break;
            }
        }

        if (!scriptActionFound) {
            console.log("Game action key not found in script: " + gameActionKey + " (" + gameObject[gameActionKey].id + ")");
            console.log(gameObject[gameActionKey]);
        }
    }

