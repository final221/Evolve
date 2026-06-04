    function buildGeneralSettings() {
        let sectionId = "general";
        let sectionName = "General";

        let resetFunction = function() {
            resetGeneralSettings(true);
            updateSettingsFromState();
            updateGeneralSettingsContent();
            removeActiveTargetsUI();
            removePrestigeFromTopBar();

            resetCheckbox("masterScriptToggle", "showSettings", "autoPrestige", "displayPrestigeTypeInTopBar", "displayTotalDaysTypeInTopBar");
            // No need to call showSettings callback, it enabled if button was pressed, and will be still enabled on default settings
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateGeneralSettingsContent);
    }

    function updateGeneralSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_generalContent');
        currentNode.empty().off("*");

        addSettingsNumber(currentNode, "tickRate", "Script tick rate", "Script runs once per this amount of game ticks. Game tick every 250ms, thus with rate 4 script will run once per second. You can set it lower to make script act faster, or increase it if you have performance issues. Tick rate should be a positive integer.");
        addSettingsToggle(currentNode, "tickSchedule", "Schedule script ticks", "When enabled script will schedule its ticks to run after game ticks, instead of executing both at once. Splitting of long task allows browser to update UI in between of game and script ticks, making game run smoother, but less throttling-proof - that can make tick rate float inconsistently.");

        addSettingsHeader1(currentNode, "Prioritization");
        let priority = [{val: "ignore", label: "Ignore", hint: "Does nothing"},
                        {val: "save", label: "Save", hint: "Missing resources preserved from using."},
                        {val: "req", label: "Request", hint: "Production and buying of missing resources will be prioritized."},
                        {val: "savereq", label: "Request & Save", hint: "Missing resources will be prioritized, and preserved from using."}];

        addSettingsToggle(currentNode, "useDemanded", "Allow using prioritized resources for crafting", "When disabled script won't make craftables out of prioritized resources in foundry and factory.");
        addSettingsToggle(currentNode, "researchRequest", "Prioritize resources for Pre-MAD researches", "Readjust trade routes and production to resources required for unlocked and affordable researches. Works only with no active triggers, or queue. Missing resources will have 100 priority where applicable(autoMarket, autoGalaxyMarket, autoFactory, autoMiningDroid), or just 'top priority' where not(autoTax, autoCraft, autoCraftsmen, autoQuarry, autoMine, autoExtractor, autoSmelter).");
        addSettingsToggle(currentNode, "researchRequestSpace", "Prioritize resources for Space+ researches", "Readjust trade routes and production to resources required for unlocked and affordable researches. Works only with no active triggers, or queue. Missing resources will have 100 priority where applicable(autoMarket, autoGalaxyMarket, autoFactory, autoMiningDroid), or just 'top priority' where not(autoTax, autoCraft, autoCraftsmen, autoQuarry, autoMine, autoExtractor, autoSmelter).");
        addSettingsToggle(currentNode, "missionRequest", "Prioritize resources for missions", "Readjust trade routes and production to resources required for unlocked and affordable missions. Missing resources will have 100 priority where applicable(autoMarket, autoGalaxyMarket, autoFactory, autoMiningDroid), or just 'top priority' where not(autoTax, autoCraft, autoCraftsmen, autoQuarry, autoMine, autoExtractor, autoSmelter).");

        addSettingsSelect(currentNode, "prioritizeQueue", "Queue", "Alter script behaviour to speed up queued items, prioritizing missing resources.", priority);
        addSettingsSelect(currentNode, "prioritizeTriggers", "Triggers", "Alter script behaviour to speed up triggers, prioritizing missing resources.", priority);
        addSettingsSelect(currentNode, "prioritizeUnify", "Unification", "Alter script behaviour to speed up unification, prioritizing money required to purchase foreign cities.", priority);
        addSettingsSelect(currentNode, "prioritizeOuterFleet", "Ship Yard Blueprint (The True Path)", "Alter script behaviour to assist fleet building, prioritizing resources required for current design of ship.", priority);

        addSettingsHeader1(currentNode, "Auto clicker");
        addSettingsToggle(currentNode, "buildingAlwaysClick", "Always autoclick resources", "By default script will click only during early stage of autoBuild, to bootstrap production. With this toggled on it will continue clicking forever");
        addSettingsNumber(currentNode, "buildingClickPerTick", "Maximum clicks per tick", "Number of clicks performed at once, each script tick. Will not ever click more than needed to fill storage.");

        addSettingsHeader1(currentNode, "Additional UI");
        addSettingsToggle(currentNode, "activeTargetsUI", "Display detailed queue", "Add UI in right column to display currently active queued buildings, technologies, and triggers and their resources.", buildActiveTargetsUI, removeActiveTargetsUI);
        addSettingsToggle(currentNode, "displayPrestigeTypeInTopBar", "Display prestige type in top bar", "Show the currently selected prestige type in the top bar", updatePrestigeInTopBar, updatePrestigeInTopBar);
        addSettingsToggle(currentNode, "displayTotalDaysTypeInTopBar", "Display total days in top bar", "Show the total days next to this year's days", updateTotalDaysInTopBar, updateTotalDaysInTopBar);

        addSettingsHeader1(currentNode, "Misc");
        addSettingsString(currentNode, "scriptSettingsExportFilename", "Export Filename", "Configures the filename used when using the 'Script Settings as File' button. This is useful if you keep multiple different profiles around.");

        addSettingsHeader1(currentNode, "Experimental");
        addSettingsToggle(currentNode, "performanceHackAvoidDrawTech", "Enable performance hack: drawTech avoidance", "Enables very experimental and potentially buggy performance hacks designed to avoid excessive redraws of the research tab, which appears to be very CPU-intensive to redraw. This improves game performance when buying lots of buildings, but also causes potentially limitless amounts of bugs as important game code may be skipped.");

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildPrestigeSettings(parentNode, secondaryPrefix) {
        let sectionId = "prestige";
        let sectionName = "Prestige";

        let resetFunction = function() {
            resetPrestigeSettings(true);
            updateSettingsFromState();
            updatePrestigeSettingsContent(secondaryPrefix);
        };

        buildSettingsSection2(parentNode, secondaryPrefix, sectionId, sectionName, resetFunction, updatePrestigeSettingsContent);
    }

    function updatePrestigeSettingsContent(secondaryPrefix) {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $(`#script_${secondaryPrefix}prestigeContent`);
        currentNode.empty().off("*");

        currentNode.append(`
          <div class="script_bg_prestigeType" style="display: inline-block; width: 90%; text-align: left; margin-bottom: 10px;">
            <label>
              <span>Prestige Type</span>
              <select class="script_prestigeType" style="height: 18px; width: 150px; float: right;">
                ${prestigeOptions}
              </select>
            </label>
          </div>`);

        currentNode.find('.script_prestigeType')
          .val(settingsRaw.prestigeType)
          .on('change', function() {
            // Special processing for prestige options. If they are ready to prestige then warn the user about enabling them.
            if (isPrestigeAllowed()) {
                let confirmationText = "";
                if (this.value === "mad" && haveTech("mad")) {
                    confirmationText = "MAD has already been researched.";
                } else if (this.value === "bioseed" && isBioseederPrestigeAvailable()) {
                    confirmationText = "Required probes are built, and bioseeder ship is ready to launch.";
                } else if (this.value === "cataclysm" && isCataclysmPrestigeAvailable()) {
                    confirmationText = "Dial It To 11 is unlocked. You may prestige immediately.";
                } else if (this.value === "whitehole" && isWhiteholePrestigeAvailable()) {
                    confirmationText = "Required mass is reached, and exotic infusion is unlocked.";
                } else if (this.value === "apocalypse" && isApocalypsePrestigeAvailable()) {
                    confirmationText = "Protocol 66 is unlocked.";
                } else if (this.value === "ascension" && (game.global.race['witch_hunter'] ? isWitchAscensionPrestigeAvailable() : isAscensionPrestigeAvailable())) {
                    confirmationText = (game.global.race['witch_hunter'] ? "Absorption Chamber is built and ready." : "Ascension machine is built and powered.");
                } else if (this.value === "demonic" && (game.global.race['witch_hunter'] ? isWitchAscensionPrestigeAvailable(true) : isDemonicPrestigeAvailable())) {
                    confirmationText = (game.global.race['witch_hunter'] ? "Absorption Chamber is built and ready." : "Required floor is reached, and demon lord is already dead.");
                } else if (this.value === "terraform" && buildings.RedTerraform.isUnlocked()) {
                    confirmationText = "Terraformer is built and powered.";
                } else if (this.value === "matrix" && buildings.TauStarBluePill.isUnlocked()) {
                    confirmationText = "Matrix is built and powered.";
                } else if (this.value === "retire" && buildings.TauGas2MatrioshkaBrain.count >= 1000
                                                   && buildings.TauGas2IgniteGasGiant.isUnlocked()
                                                   && buildings.TauGas2IgniteGasGiant.isAffordable()) {
                    confirmationText = "Ignition Device is built and ready.";
                } else if (this.value === "eden" && buildings.TauStarEden.isUnlocked()
                                                 && buildings.TauStarEden.isAffordable()) {
                    confirmationText = "Garden Of Eden is ready to build.";
                } else if (this.value === "apotheosis" && buildings.PalaceApotheosis.isUnlocked()) {
                    confirmationText = "Apotheosis is ready to build.";
                }
                if (confirmationText !== "") {
                    confirmationText += " You may prestige immediately. Are you sure you want to toggle this prestige?";
                    if (!confirm(confirmationText)) {
                        this.value = "none";
                    }
                }
            }
            settingsRaw.prestigeType = this.value;
            $(".script_prestigeType").val(settingsRaw.prestigeType);

            state.goal = "Standard";
            updateSettingsFromState();
        });
        currentNode.find(".script_bg_prestigeType")
          .toggleClass('inactive-row', Boolean(settingsRaw.overrides.prestigeType))
          .on('click', {label: "Prestige Type (prestigeType)", name: "prestigeType", type: "select", options: prestigeOptions}, openOverrideModal);

        addSettingsToggle(currentNode, "prestigeWaitAT", "Disable prestiging under Accelerated Time", "Delay reset until all accelerated time will be used, to avoid wasting it");
        addSettingsToggle(currentNode, "prestigeMADIgnoreArpa", "Ignore early game A.R.P.A.", "Disables building any A.R.P.A. projects until MAD is researched, or rival have appeared");
        addSettingsToggle(currentNode, "prestigeBioseedConstruct", "Ignore useless buildings", "Space Dock, Bioseeder Ship and Probes will be constructed only when Bioseed prestige enabled. World Collider won't be constructed during Bioseed. Jump Ship won't be constructed during Whitehole. Stellar Engine won't be constucted during Vacuum Collapse. Mana Syphon won't be constructed during Witch Hunter's Ascension and Demonic Infusion.");

        addSettingsHeader1(currentNode, "Mutual Assured Destruction");
        addSettingsToggle(currentNode, "prestigeMADWait", "Wait for maximum population", "Wait for maximum population and soldiers to maximize plasmids gain");
        addSettingsNumber(currentNode, "prestigeMADPopulation", "Required population", "Required number of workers and soldiers before performing MAD reset");

        addSettingsHeader1(currentNode, "Bioseed");
        addSettingsNumber(currentNode, "prestigeBioseedProbes", "Required probes", "Required number of probes before launching bioseeder ship");
        addSettingsNumber(currentNode, "prestigeGECK", "Required G.E.C.K", "Required number of G.E.C.K. for Bioseed. Unlike any other buildings G.E.C.K. won't ever be constructed during inappropriate runs, or above this number. To prevent losing plasmids. It can, however, be built with triggers - you should not build G.E.C.K with triggers, unless you absolutely sure you know what you're doing.");

        addSettingsHeader1(currentNode, "Whitehole");
        addSettingsToggle(currentNode, "prestigeWhiteholeSaveGems", "Save up Soul Gems for reset", "Save up enough Soul Gems for reset, only excess gems will be used. This option does not affect triggers.");
        addSettingsNumber(currentNode, "prestigeWhiteholeMinMass", "Minimum solar mass for reset", "Required minimum solar mass of blackhole before prestiging. Script do not stabilize on blackhole run, this number will need to be reached naturally");

        addSettingsHeader1(currentNode, "Ascension");
        addSettingsToggle(currentNode, "prestigeAscensionPillar", "Wait for Pillar", "Wait for Pillar before ascending, unless it was done earlier");

        addSettingsHeader1(currentNode, "Demonic Infusion");
        addSettingsNumber(currentNode, "prestigeDemonicFloor", "Minimum spire floor for reset", "Perform reset after climbing up to this spire floor");
        addSettingsNumber(currentNode, "prestigeDemonicPotential", "Maximum mech potential for reset", "Perform reset only if current mech team potential below given amount. Full bay of best mechs will have `1` potential. This allows to postpone reset if your team is still good after reaching target floor, and can quickly clear another floor");
        addSettingsToggle(currentNode, "prestigeDemonicBomb", "Use Dark Energy Bomb", "Kill Demon Lord with Dark Energy Bomb");

        addSettingsHeader1(currentNode, "Matrix");
        let cureStrat = [{val: "none", label: "None", hint: "Do not select strategy"},
                         {val: "strat1", label: game.loc(`tech_vax_strat1`), hint: game.loc(`tech_vax_strat1_effect`)},
                         {val: "strat2", label: game.loc(`tech_vax_strat2`), hint: game.loc(`tech_vax_strat2_effect`)},
                         {val: "strat3", label: game.loc(`tech_vax_strat3`), hint: game.loc(`tech_vax_strat3_effect`)},
                         {val: "strat4", label: game.loc(`tech_vax_strat4`), hint: game.loc(`tech_vax_strat4_effect`)}];
        addSettingsSelect(currentNode, "prestigeVaxStrat", "Vaccination Strategy", "Alter script behaviour to speed up queued items, prioritizing missing resources.", cureStrat);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildGovernmentSettings(parentNode, secondaryPrefix) {
        let sectionId = "government";
        let sectionName = "Government";

        let resetFunction = function() {
            resetGovernmentSettings(true);
            updateSettingsFromState();
            updateGovernmentSettingsContent(secondaryPrefix);

            resetCheckbox("autoTax", "autoGovernment");
        };

        buildSettingsSection2(parentNode, secondaryPrefix, sectionId, sectionName, resetFunction, updateGovernmentSettingsContent);
    }

    function updateGovernmentSettingsContent(secondaryPrefix) {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $(`#script_${secondaryPrefix}governmentContent`);
        currentNode.empty().off("*");

        addSettingsNumber(currentNode, "generalRequestedTaxRate", "Forced tax rate", "Set tax rate as close to this value as possible, ignores morale. Set to -1 to disable this option");
        addSettingsNumber(currentNode, "generalMinimumTaxRate", "Minimum allowed tax rate", "Minimum tax rate for autoTax. Will still go below this amount if money storage is full");
        addSettingsNumber(currentNode, "generalMinimumMorale", "Minimum allowed morale", "Use this to set a minimum allowed morale. Remember that less than 100% can cause riots and weather can cause sudden swings");
        addSettingsNumber(currentNode, "generalMaximumMorale", "Maximum allowed morale", "Use this to set a maximum allowed morale. The tax rate will be raised to lower morale to this maximum");

        let governmentOptions = [{val: "none", label: "None", hint: "Do not select government"}, ...Object.values(GovernmentManager.Types).filter(g => g.selectable !== false).map(g => ({val: g.id, label: game.loc(`govern_${g.id}`), hint: game.loc(`govern_${g.id}_desc`)}))];
        addSettingsSelect(currentNode, "govInterim", "Interim Government", "Temporary low tier government until you research other governments", governmentOptions);
        addSettingsSelect(currentNode, "govFinal", "Second Government", "Second government choice, chosen once becomes available. Can be the same as above", governmentOptions);
        addSettingsSelect(currentNode, "govSpace", "Space Government", "Government for bioseed+. Chosen once you researched Quantum Manufacturing. Can be the same as above", governmentOptions);

        let governorsOptions = [{val: "none", label: "None", hint: "Do not select governor"}, ...governors.map(id => ({val: id, label: game.loc(`governor_${id}`), hint: game.loc(`governor_${id}_desc`)}))];
        addSettingsSelect(currentNode, "govGovernor", "Governor", "Chosen governor will be appointed.", governorsOptions);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildEvolutionSettings() {
        let sectionId = "evolution";
        let sectionName = "Evolution";

        let resetFunction = function() {
            resetEvolutionSettings(true);
            updateSettingsFromState();
            updateEvolutionSettingsContent();

            resetCheckbox("autoEvolution");
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateEvolutionSettingsContent);
    }

    function updateRaceWarning() {
        let race = races[settingsRaw.userEvolutionTarget];
        if (race && race.getCondition() !== '') {
            let suited = race.getHabitability();
            if (suited === 1) {
                $("#script_race_warning").html(`<span class="has-text-success">This race have special requirements: ${race.getCondition()} This condition is met.</span>`);
            } else if (suited === 0) {
                $("#script_race_warning").html(`<span class="has-text-danger">Warning! This race have special requirements: ${race.getCondition()} This condition is not met.</span>`);
            } else {
                $("#script_race_warning").html(`<span class="has-text-warning">Warning! This race have special requirements: ${race.getCondition()} This condition is bypassed. Race will have ${100 - suited * 100}% penalty.</span>`);
            }
        } else {
            $("#script_race_warning").empty();
        }
    }

    function updateEvolutionSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_evolutionContent');
        currentNode.empty().off("*");

        // Target universe
        let universeOptions = [{val: "none", label: "None", hint: "Wait for user selection"},
                               ...universes.map(id => ({val: id, label: game.loc(`universe_${id}`), hint: game.loc(`universe_${id}_desc`)}))];
        addSettingsSelect(currentNode, "userUniverseTargetName", "Target Universe", "Chosen universe will be automatically selected after appropriate reset", universeOptions);

        // Target planet
        let planetOptions = [{val: "none", label: "None", hint: "Wait for user selection"},
                             {val: "habitable", label: "Most habitable", hint: "Picks most habitable planet, based on biome and trait"},
                             {val: "achieve", label: "Most achievements", hint: "Picks planet with most unearned achievements. Takes in account extinction achievements for planet exclusive races, and greatness achievements for planet biome, trait, and exclusive genus."},
                             {val: "weighting", label: "Highest weighting", hint: "Picks planet with highest weighting. Should be configured in Planet Weighting Settings section."}];
        addSettingsSelect(currentNode, "userPlanetTargetName", "Target Planet", "Chosen planet will be automatically selected after appropriate reset. Warning! Script ignores changes made by G.E.C.K., you need to select planet manually after using it.", planetOptions);

        // Target evolution
        let raceOptions = [{val: "auto", label: "Auto Achievements", hint: "Picks race giving most achievements upon completing run. Tracks all achievements limited to specific races and resets. Races unique to current planet biome are prioritized, when available."},
                           ...Object.values(races).map(race => (
                           {val: race.id, label: race.name, hint: race.desc}))];
        addSettingsSelect(currentNode, "userEvolutionTarget", "Target Race", "Chosen race will be automatically selected during next evolution", raceOptions)
          .on('change', 'select', function() {
            state.evolutionTarget = null;
            updateRaceWarning();
        });

        let genusOptions = [...Object.values(game.races).map(r => r.type).filter((g, i, a) => g && g !== "organism" && a.indexOf(g) === i).map(g => ({val: g, label: game.loc(`genelab_genus_${g}`)}))];
        addSettingsSelect(currentNode, "userEvolutionGenus", "Preferred genus", "Chosen genus will be picked if target race have such option. Works only with challenge races, and hybrids. If chosen genus is not allowed, then first valid option will be picked instead.", genusOptions);

        currentNode.append(`<div><span id="script_race_warning"></span></div>`);
        updateRaceWarning();

        addSettingsToggle(currentNode, "evolutionAutoUnbound", "Allow unbound races", "Allow Auto Achievement to pick biome restricted races on unsuited biomes, after getting unbound.");
        addSettingsToggle(currentNode, "evolutionBackup", "Soft Reset", "Perform soft resets until you'll get chosen race. Has no effect after getting mass extinction perk.");

        // Challenges
        for (let i = 0; i < challenges.length; i++) {
            let set = challenges[i];
            addSettingsToggle(currentNode, `challenge_${set[0].id}`,
              set.map(c => game.loc(`evo_challenge_${c.id}`)).join(" | "),
              set.map(c => game.loc(`evo_challenge_${c.id}_effect`)).join("&#xA;"));
        }

        addStandardHeading(currentNode, "Evolution Queue");
        addSettingsToggle(currentNode, "evolutionQueueEnabled", "Queue Enabled", "When enabled script with evolve with queued settings, from top to bottom. During that script settings will be overriden with settings stored in queue. Queued target will be removed from list after evolution.");
        addSettingsToggle(currentNode, "evolutionQueueRepeat", "Repeat Queue", "When enabled applied evolution targets will be moved to the end of queue, instead of being removed");


        currentNode.append(`
          <div style="margin-top: 5px; display: inline-block; width: 90%; text-align: left;">
            <label for="script_evolution_prestige">Prestige for new evolutions:</label>
            <select id="script_evolution_prestige" style="height: 18px; width: 150px; float: right;">
              <option value = "auto" title = "Inherited from current Prestige Settings">Current Prestige</option>
              ${prestigeOptions}
            </select>
          </div>
          <div style="margin-top: 10px;">
            <button id="script_evlution_add" class="button">Add New Evolution</button>
          </div>`);

        $("#script_evlution_add").on("click", addEvolutionSetting);
        currentNode.append(`
          <table style="width:100%">
            <tr>
              <th class="has-text-warning" style="width:25%">Race</th>
              <th class="has-text-warning" style="width:70%" title="Settings applied before evolution. Changed settings not limited to initial template, you can manually add any script options to JSON.">Settings</th>
              <th style="width:5%"></th>
            </tr>
            <tbody id="script_evolutionQueueTable"></tbody>
          </table>`);

        let tableBodyNode = $('#script_evolutionQueueTable');
        for (let i = 0; i < settingsRaw.evolutionQueue.length; i++) {
            tableBodyNode.append(buildEvolutionQueueItem(i));
        }

        tableBodyNode.sortable({
            items: "tr:not(.unsortable)",
            helper: sorterHelper,
            update: function() {
                let newOrder = tableBodyNode.sortable('toArray', {attribute: 'value'});
                settingsRaw.evolutionQueue = newOrder.map((i) => settingsRaw.evolutionQueue[i]);

                updateSettingsFromState();
                updateEvolutionSettingsContent();
            },
        } );

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildEvolutionQueueItem(id) {
        let queuedEvolution = settingsRaw.evolutionQueue[id];
        for (let settingName of evolutionSettingsToStore) {
            queuedEvolution[settingName] = queuedEvolution[settingName] ?? settings[settingName];
        }

        let raceName = "";
        let raceClass = "";
        let prestigeName = "";
        let prestigeClass = "";

        let race = races[queuedEvolution.userEvolutionTarget];
        let isValdi = queuedEvolution.challenge_junker || race === races.junker;
        let isSludge = queuedEvolution.challenge_sludge || race === races.sludge;
        let isUltraSludge = queuedEvolution.challenge_ultra_sludge || race === races.ultra_sludge;
        let isHellspawn = queuedEvolution.challenge_warlord || race === races.hellspawn;

        const getRaceColor = (race) => {
            let suited = race.getHabitability();
            if (suited === 1) {
                return "has-text-info";
            } else if (suited === 0) {
                return "has-text-danger";
            } else {
                return "has-text-warning";
            }
        };

        let uniqPicked = isValdi + isSludge + isUltraSludge + isHellspawn;
        if (uniqPicked > 1) {
            raceName = "Valdi, Sludge and Hellspawn can not be combined!";
            raceClass = "has-text-danger";
        } else if (uniqPicked === 1) {
            let name = isValdi ? races.junker.name :
                       isSludge ? races.sludge.name :
                       isUltraSludge ? races.ultra_sludge.name :
                       isHellspawn ? races.hellspawn.name : "???";
            if (race && race !== races.junker && race !== races.sludge && race !== races.ultra_sludge) {
                raceName = name + ", " + game.loc(`genelab_genus_${race.genus}`);
                raceClass = getRaceColor(race);
            } else {
                raceName = name + ", " + game.loc(`genelab_genus_${queuedEvolution.userEvolutionGenus}`);
                raceClass = getRaceColor(Object.values(races).find(r => r.genus === queuedEvolution.userEvolutionGenus));
            }
        } else if (queuedEvolution.userEvolutionTarget === "auto") {
            raceName = "Auto Achievements";
            raceClass = "has-text-advanced";
        } else if (race) {
            raceName = race.name;
            raceClass = getRaceColor(race);
            if (race.genus == "hybrid") {
                if (game.races[race.id].hybrid.includes(queuedEvolution.userEvolutionGenus)) {
                    raceName += ", " + game.loc(`genelab_genus_${queuedEvolution.userEvolutionGenus}`);
                } else {
                    raceName += ", " + game.loc(`genelab_genus_${game.races[race.id].hybrid[0]}`);
                }
            }
        } else {
            raceName = "Unrecognized race!";
            raceClass = "has-text-danger";
        }

        let star = $(`#settings a.dropdown-item:contains("${game.loc(game.global.settings.icon)}") svg`).clone();
        star.removeClass();
        star.addClass("star" + getStarLevel(queuedEvolution));

        if (queuedEvolution.prestigeType !== "none") {
            let prestige = prestigeTypes.find(prest => prest.val === queuedEvolution.prestigeType);
            if (prestige) {
                prestigeName = `(${prestige.short_label ?? prestige.label})`;
                prestigeClass = "has-text-info";
            } else {
                prestigeName = "Unrecognized prestige!";
                prestigeClass = "has-text-danger";
            }
        }

        let queueNode = $(`
          <tr id="script_evolution_${id}" value="${id}" class="script-draggable">
            <td style="width:25%"><span class="${raceClass}">${raceName}</span> <span class="${prestigeClass}">${prestigeName}</span> ${star.prop('outerHTML') ?? (getStarLevel(queuedEvolution)-1) + "*"}</td>
            <td style="width:70%"><textarea class="textarea">${JSON.stringify(queuedEvolution, null, 4)}</textarea></td>
            <td style="width:5%"><a class="button is-dark is-small" style="width: 26px; height: 26px"><span>X</span></a></td>
          </tr>`);

        // Delete button
        queueNode.find(".button").on('click', function() {
            settingsRaw.evolutionQueue.splice(id, 1);
            updateSettingsFromState();
            updateEvolutionSettingsContent();
        });


        // Settings textarea
        queueNode.find(".textarea").on('change', function() {
            try {
                let queuedEvolution = JSON.parse(this.value);
                settingsRaw.evolutionQueue[id] = queuedEvolution;
                updateSettingsFromState();
                updateEvolutionSettingsContent();
            } catch (error) {
                queueNode.find('td:eq(0)').html(`<span class="has-text-danger">${error}</span>`);
            }
        });

        return queueNode;
    }

    function addEvolutionSetting() {
        let queuedEvolution = {};
        for (let settingName of evolutionSettingsToStore) {
            let settingValue = settingsRaw[settingName];
            queuedEvolution[settingName] = settingValue;
        }

        let overridePrestige = $("#script_evolution_prestige").first().val();
        if (overridePrestige && overridePrestige !== "auto") {
            queuedEvolution.prestigeType = overridePrestige;
        }

        let queueLength = settingsRaw.evolutionQueue.push(queuedEvolution);
        updateSettingsFromState();

        let tableBodyNode = $('#script_evolutionQueueTable');
        tableBodyNode.append(buildEvolutionQueueItem(queueLength-1));
    }

    function buildPlanetSettings() {
        let sectionId = "planet";
        let sectionName = "Planet Weighting";

        let resetFunction = function() {
            resetPlanetSettings(true);
            updateSettingsFromState();
            updatePlanetSettingsContent();
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updatePlanetSettingsContent);
    }

    function updatePlanetSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_planetContent');
        currentNode.empty().off("*");

        currentNode.append(`
          <span>Planet Weighting = Biome Weighting + Trait Weighting + (Extras Intensity * Extras Weightings)</span>
          <table style="width:100%">
            <tr>
              <th class="has-text-warning" style="width:20%">Biome</th>
              <th class="has-text-warning" style="width:calc(40% / 3)">Weighting</th>
              <th class="has-text-warning" style="width:20%">Trait</th>
              <th class="has-text-warning" style="width:calc(40% / 3)">Weighting</th>
              <th class="has-text-warning" style="width:20%">Extra</th>
              <th class="has-text-warning" style="width:calc(40% / 3)">Weighting</th>
            </tr>
            <tbody id="script_planetTableBody"></tbody>
          </table>`);

        let tableBodyNode = $('#script_planetTableBody');
        let newTableBodyText = "";

        let tableSize = Math.max(biomeList.length, traitList.length, extraList.length);
        for (let i = 0; i < tableSize; i++) {
            newTableBodyText += `<tr><td id="script_planet_${i}" style="width:20%"></td><td style="width:calc(40% / 3);border-right-width:1px"></td><td style="width:20%"></td><td style="width:calc(40% / 3);border-right-width:1px"></td><td style="width:20%"></td><td style="width:calc(40% / 3)"></td>/tr>`;
        }
        tableBodyNode.append($(newTableBodyText));

        for (let i = 0; i < tableSize; i++) {
            let tableElement = $('#script_planet_' + i);

            if (i < biomeList.length) {
                tableElement.append(buildTableLabel(game.loc("biome_" +  biomeList[i] + "_name")));
                tableElement = tableElement.next();
                addTableInput(tableElement, "biome_w_" + biomeList[i]);
            } else {
                tableElement = tableElement.next();
            }
            tableElement = tableElement.next();

            if (i < traitList.length) {
                tableElement.append(buildTableLabel(i == 0 ? "None" : game.loc("planet_" + traitList[i])));
                tableElement = tableElement.next();
                addTableInput(tableElement, "trait_w_" + traitList[i]);
            } else {
                tableElement = tableElement.next();
            }
            tableElement = tableElement.next();

            if (i < extraList.length) {
                tableElement.append(buildTableLabel(extraList[i]));
                tableElement = tableElement.next();
                addTableInput(tableElement, "extra_w_" + extraList[i]);
            }
        }

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

