    function buildLoggingSettings(parentNode, secondaryPrefix) {
        let sectionId = "logging";
        let sectionName = "Logging";

        let resetFunction = function() {
            resetLoggingSettings(true);
            updateSettingsFromState();
            updateLoggingSettingsContent(secondaryPrefix);
            buildFilterRegExp();
        };

        buildSettingsSection2(parentNode, secondaryPrefix, sectionId, sectionName, resetFunction, updateLoggingSettingsContent);
    }

    function updateLoggingSettingsContent(secondaryPrefix) {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $(`#script_${secondaryPrefix}loggingContent`);
        currentNode.empty().off("*");

        addSettingsHeader1(currentNode, "Script Messages");
        addSettingsToggle(currentNode, "logEnabled", "Enable logging", "Master switch to enable logging of script actions in the game message queue");
        Object.entries(GameLog.Types).forEach(([id, label]) => addSettingsToggle(currentNode, "log_" + id, label, `If logging is enabled then logs ${label} actions`));
        addSettingsString(currentNode, "log_prestige_format", "Prestige Log Format", "Available placeholders: {resetType}, {species}, {timestamp} (in game days). Use {eval: XXX } to log custom information");

        addSettingsHeader1(currentNode, "Game Messages");
        addSettingsToggle(currentNode, "hellTurnOffLogMessages", "Turn off patrol and surveyor log messages", "Automatically turns off the hell patrol and surveyor log messages");
        let stringsUrl = `strings/strings${game.global.settings.locale === "en-US" ? "" : "." + game.global.settings.locale}.json`
        currentNode.append(`
          <div>
            <span>List of message IDs to filter, all game messages can be found <a href="${stringsUrl}" target="_blank">here</a>.</span><br>
            <textarea id="script_logFilter" class="textarea" style="margin-top: 4px;">${settingsRaw.logFilter}</textarea>
          </div>`);

        // Settings textarea
        $("#script_logFilter").on('change', function() {
            settingsRaw.logFilter = this.value;
            buildFilterRegExp();
            this.value = settingsRaw.logFilter;
            updateSettingsFromState();
        });

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function createSettingToggle(node, settingKey, title, enabledCallBack, disabledCallBack) {
        let toggle = $(`
          <label class="switch script_bg_${settingKey}" tabindex="0" title="${title}">
            <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}/>
            <span class="check"></span><span>${settingKey}</span>
          </label><br>`)
        .toggleClass('inactive-row', Boolean(settingsRaw.overrides[settingKey]));

        if (settingsRaw[settingKey] && enabledCallBack) {
            enabledCallBack();
        }

        toggle.on('change', 'input', function() {
            settingsRaw[settingKey] = this.checked;
            updateSettingsFromState();
            if (settingsRaw[settingKey] && enabledCallBack) {
                enabledCallBack();
            }
            if (!settingsRaw[settingKey] && disabledCallBack) {
                disabledCallBack();
            }
        });
        toggle.on('click', {label: `Toggle (${settingKey})`, name: settingKey, type: "boolean"}, openOverrideModal);

        node.append(toggle);
    }

    function updateOptionsUI() {
        // Build secondary options buttons if they don't currently exist
        addOptionUI("s-government-options", "#government .tabs ul", "Government", buildGovernmentSettings);
        addOptionUI("s-foreign-options", "#garrison div h2", "Foreign Affairs", buildWarSettings);
        addOptionUI("s-foreign-options2", "#c_garrison div h2", "Foreign Affairs", buildWarSettings);
        addOptionUI("s-hell-options", "#gFort div h3", "Hell", buildHellSettings);
        addOptionUI("s-hell-options2", "#prtl_fortress div h3", "Hell", buildHellSettings);
        addOptionUI("s-fleet-options", "#hfleet h3", "Fleet", buildFleetSettings);
    }

    function addOptionUI(optionsId, querySelectorText, modalTitle, buildOptionsFunction) {
        if (document.getElementById(optionsId) !== null) { return; } // We've already built the options UI

        let sectionNode = $(querySelectorText);

        if (sectionNode.length === 0) { return; } // The node that we want to add it to doesn't exist yet

        let newOptionNode = $(`<span id="${optionsId}" class="s-options-button has-text-success" style="margin-right:0px">+</span>`);
        sectionNode.prepend(newOptionNode);
        newOptionNode.on('click', function() {
            openOptionsModal(modalTitle, buildOptionsFunction);
        });
    }

    function openOptionsModal(modalTitle, buildOptionsFunction) {
        // Build content
        let modalHeader = $('#scriptModalHeader');
        modalHeader.empty().off("*");
        modalHeader.append(`<span style="user-select: text">${modalTitle}</span>`);

        let modalBody = $('#scriptModalBody');
        modalBody.empty().off("*");
        buildOptionsFunction(modalBody, "c_");

        // Show modal
        let modal = document.getElementById("scriptModal");
        $("html").css('overflow', 'hidden');
        modal.style.display = "block";
    }

    function createOptionsModal() {
        if (document.getElementById("scriptModal") !== null) {
            return;
        }

        // Append the script modal to the document
        $(document.body).append(`
          <div id="scriptModal" class="script-modal content">
            <span id="scriptModalClose" class="script-modal-close">&times;</span>
            <div class="script-modal-content">
              <div id="scriptModalHeader" class="script-modal-header has-text-warning">
                <p>You should never see this modal header...</p>
              </div>
              <div id="scriptModalBody" class="script-modal-body">
                <p>You should never see this modal body...</p>
              </div>
            </div>
          </div>`);

        // Add the script modal close button action
        $('#scriptModalClose').on("click", function() {
            $("#scriptModal").css('display', 'none');
            $('.script-modal-content').removeClass('override-modal');
            $("html").css('overflow-y', 'scroll');
        });

        // If the user clicks outside the modal then close it
        $(window).on("click", function(event) {
            if (event.target.id === "scriptModal") {
                $("#scriptModal").css('display', 'none');
                $('.script-modal-content').removeClass('override-modal');
                $("html").css('overflow-y', 'scroll');
            }
        });
    }

    function updatePrestigeInTopBar() {
        const parentId = 's-prestige-type';
        let parentNode = document.getElementById(parentId);

        if (settings.displayPrestigeTypeInTopBar) {
            if (parentNode === null) {
                // Check for planetWrap parent node
                const planetWrap = document.querySelector('.planetWrap');
                if (planetWrap === null)
                    return; // Return and try again later if it doesn't exist yet

                // Create new parent node
                parentNode = document.createElement('span');
                parentNode.setAttribute('id', parentId);
                parentNode.setAttribute('style', 'border-left: 1px solid; margin-left: 0.75rem; padding-left: 0.75rem;');

                // Add to planetWrap
                planetWrap.append(parentNode);

                // Add helper button to open prestige options modal
                addOptionUI('s-prestige-type-helper-btn', `#${parentId}`, 'Prestige', buildPrestigeSettings);
            }
        }
        else {
            removePrestigeFromTopBar();
            return; // Disable and return if displayPrestigeTypeInTopBar isn't enabled
        }

        // Update if prestigeType changed
        if (parentNode.getAttribute('data-prestige') !== settings.prestigeType) {
            let infoNode = parentNode.querySelector('.info');
            if (infoNode === null) {
                // Create info node if needed
                infoNode = document.createElement('span');
                infoNode.setAttribute('class', 'info');

                parentNode.append(infoNode);
            }

            let prestige = prestigeTypes.find(entry => entry.val === settings.prestigeType);
            if (prestige === undefined) {
                // Somehow failed to find prestige details, mock up an object from settings
                prestige = {label: settings.prestigeType, hint: ""};
            }

            // Update node with new prestige info
            infoNode.title = prestige.hint;
            infoNode.textContent = prestige.label;
            parentNode.setAttribute('data-prestige', settings.prestigeType);
        }
    }

    function removePrestigeFromTopBar() {
        let prestigeNode = document.getElementById("s-prestige-type");
        if (prestigeNode == null) { return; } // Element has not yet been added, nothing to do

        prestigeNode.remove();
    }

    function updateTotalDaysInTopBar() {
        if (settings.displayTotalDaysTypeInTopBar) {
            addTotalDaysToTopBar();
        } else {
            removeTotalDaysFromTopBar();
        }

        const totalDaysNode = document.getElementById("s-total-days-count");
        if (totalDaysNode == null) { return; } // Element has not yet been added, cannot update

        totalDaysNode.textContent = game.global.stats.days;
    }

    function addTotalDaysToTopBar() {
        const nodeId = 's-total-days';
        if (document.getElementById(nodeId) !== null) { return; } // We've already added the info to the top bar

        const calendarNode = $("#topBar .calendar");
        if (calendarNode.length === 0) { return; } // The node that we want to add it to doesn't exist yet

        calendarNode.find('.day').after($(`<span id="s-total-days" class="has-text-warning" style="padding-left: 3px;">(<span id="s-total-days-count"></span>)</span>`));
    }

    function removeTotalDaysFromTopBar() {
        let totalDaysNode = document.getElementById("s-total-days");
        if (totalDaysNode == null) { return; } // Element has not yet been added, nothing to do

        totalDaysNode.remove();
    }

    function updateUI() {
        // Don't touch DOM when the tab is in the background
        if (document.hidden) {
            return;
        }

        let resetScrollPositionRequired = false;
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        createOptionsModal();
        updateOptionsUI();
        updatePrestigeInTopBar();

        let scriptNode = $('#autoScriptContainer');
        if (scriptNode.length === 0) {
            resetScrollPositionRequired = true;
            $('#resources').append(`
              <div id="autoScriptContainer" style="margin-top: 10px;">
                <h3 id="toggleSettingsCollapsed" class="script-collapsible text-center has-text-success">Automation</h3>
                <div id="scriptToggles">
                  <label>More script options available in Settings tab<br>${overrideKeyLabel}+click options to open <span class="inactive-row">advanced configuration</span></label><br>
                </div>
              </div>`);

            if (safeMode) {
                $('#resources').append(`<p>⚠️ Safe mode active, masterScriptToggle is disabled</p>`);
            }

            let collapsibleNode = $('#toggleSettingsCollapsed');
            let togglesNode = $('#scriptToggles');

            collapsibleNode.toggleClass('script-contentactive', !settingsRaw["toggleSettingsCollapsed"]);
            togglesNode.css('display', settingsRaw["toggleSettingsCollapsed"] ? 'none' : 'block');

            collapsibleNode.on('click', function() {
                settingsRaw["toggleSettingsCollapsed"] = !settingsRaw["toggleSettingsCollapsed"];
                collapsibleNode.toggleClass('script-contentactive', !settingsRaw["toggleSettingsCollapsed"]);
                togglesNode.css('display', settingsRaw["toggleSettingsCollapsed"] ? 'none' : 'block');
                updateSettingsFromState();
            });

            createSettingToggle(togglesNode, 'masterScriptToggle', 'Stop taking any actions on behalf of the player.');

            // Dirty performance patch. Settings have a lot of elements, and they stress JQuery selectors way too much. This toggle allow to remove them from DOM completely, when they aren't needed.
            // It doesn't have huge impact anymore, after all script and game changes, but still won't hurt to have an option to increase performance a tiny bit more
            createSettingToggle(togglesNode, 'showSettings', 'You can disable rendering of settings UI once you\'ve done with configuring script, if you experiencing performance issues. It can help a little.', buildScriptSettings, removeScriptSettings);

            createSettingToggle(togglesNode, 'autoPrestige', 'Allows script to finish current run after reaching configured goal. Prestige Type is recommended to be set even with manual resetting, as script uses that to make various decisions such as picking theology techs, or skipping buildings leading in wrong direction.');
            createSettingToggle(togglesNode, 'autoEvolution', 'Runs through the evolution part of the game through to founding a settlement. In Auto Achievements mode will target races that you don\'t have extinction\\greatness achievements for yet.');
            createSettingToggle(togglesNode, 'autoFight', 'Manage spies, and sends troops to battle whenever Soldiers are full and there are no wounded. Adds to your offensive battalion and switches attack type when offensive rating is greater than the rating cutoff for that attack type. Will not manage spies when Spy Operator governor task is active.');
            createSettingToggle(togglesNode, 'autoHell', 'Sends soldiers to hell and sends them out on patrols. Adjusts maximum number of powered attractors based on threat.');
            createSettingToggle(togglesNode, 'autoMech', 'Builds most effective large mechs for current spire floor. Least effective will be scrapped to make room for new ones. Will not build or scrap anything when Mech Constructor governor task is active.', createMechInfo, removeMechInfo);
            createSettingToggle(togglesNode, 'autoFleet', 'Manages Andromeda fleet to supress piracy');
            createSettingToggle(togglesNode, 'autoTax', 'Adjusts tax rates if your current morale is greater than your maximum allowed morale. Will always keep morale above 100%. Disabled when Tax-Morale Balance governor task is active.');
            createSettingToggle(togglesNode, 'autoGovernment', 'Manage changes of government and governor when they becomes available. Governor will be selected once, and won\'t be reassigned, unless manually fired.');
            createSettingToggle(togglesNode, 'autoCraft', 'Automatically produce craftable resources, thresholds when it happens depends on current demands and stocks.', createCraftToggles, removeCraftToggles);
            createSettingToggle(togglesNode, 'autoTrigger', 'Purchase triggered buildings, projects, and researches once conditions met');
            createSettingToggle(togglesNode, 'autoBuild', 'Construct buildings based on their weightings(user configured), and various rules(e.g. it won\'t build building which have no support to run)', createBuildingToggles, removeBuildingToggles);
            createSettingToggle(togglesNode, 'autoARPA', 'Builds ARPA projects if user enables them to be built.', createArpaToggles, removeArpaToggles);
            createSettingToggle(togglesNode, 'autoPower', 'Manages power based on a priority order of buildings. Also disables currently useless buildings to save up resources.');
            createSettingToggle(togglesNode, 'autoStorage', 'Assigns crates and containers to resources needed for buildings enabled for Auto Build, queued buildings, researches, and enabled projects. Disabled when Crate/Container Manager governor task is active.', createStorageToggles, removeStorageToggles);
            createSettingToggle(togglesNode, 'autoMarket', 'Allows for automatic buying and selling of resources once specific ratios are met. Also allows setting up trade routes until a minimum specified money per second is reached. The will trade in and out in an attempt to maximize your trade routes.', createMarketToggles, removeMarketToggles);
            createSettingToggle(togglesNode, 'autoGalaxyMarket', 'Manages galaxy trade routes');
            createSettingToggle(togglesNode, 'autoResearch', 'Performs research when minimum requirements are met.');
            createSettingToggle(togglesNode, 'autoJobs', 'Assigns jobs in a priority order with multiple breakpoints. Starts with a few jobs each and works up from there. Will try to put a minimum number on lumber / stone then fill up capped jobs first.');
            createSettingToggle(togglesNode, 'autoCraftsmen', 'Manage foundry workers, switching between resources at given ratio.');
            createSettingToggle(togglesNode, 'autoAlchemy', 'Manages alchemic transmutations');
            createSettingToggle(togglesNode, 'autoPylon', 'Manages pylon rituals');
            createSettingToggle(togglesNode, 'autoQuarry', 'Manages rock quarry stone to chrysotile ratio for smoldering races');
            createSettingToggle(togglesNode, 'autoMine', 'Manages titan mine aluminium to adamantite ratio in true path');
            createSettingToggle(togglesNode, 'autoExtractor', 'Manages extractor ship mining ratios in true path');
            createSettingToggle(togglesNode, 'autoSmelter', 'Manages smelter fuel and production.');
            createSettingToggle(togglesNode, 'autoFactory', 'Manages factory production.');
            createSettingToggle(togglesNode, 'autoMiningDroid', 'Manages mining droid production.');
            createSettingToggle(togglesNode, 'autoGraphenePlant', 'Manages graphene plant. Not user configurable - just uses least demanded resource for fuel.');
            createSettingToggle(togglesNode, 'autoGenetics', 'Managed genetics settings, and automatically assembles genes more optimally than ingame sequencer');
            createSettingToggle(togglesNode, 'autoMinorTrait', 'Purchase minor traits using genes according to their weighting settings. Also manages Mimic genus, Psychic powers, Ocular powers and wishes.');
            createSettingToggle(togglesNode, 'autoMutateTraits', 'Mutate in or out major and genus traits. WARNING: This will spend Plasmids and Anti-Plasmids.');
            createSettingToggle(togglesNode, 'autoEject', 'Eject excess resources to black hole. Normal resources ejected when they close to storage cap, craftables - when above requirements. Disabled when Mass Ejector Optimizer governor task is active.', createEjectToggles, removeEjectToggles);
            createSettingToggle(togglesNode, 'autoSupply', 'Send excess resources to Spire. Normal resources sent when they close to storage cap, craftables - when above requirements. Takes priority over ejector.', createSupplyToggles, removeSupplyToggles);
            createSettingToggle(togglesNode, 'autoNanite', 'Consume resources to produce Nanite. Normal resources sent when they close to storage cap, craftables - when above requirements. Takes priority over supplies and ejector.');
            createSettingToggle(togglesNode, 'autoReplicator', 'Use excess power to replicate resources.');

            togglesNode.append('<a class="button is-dark is-small" id="bulk-sell"><span>Bulk Sell</span></a>');
            $("#bulk-sell").on('mouseup', function() {
                updateDebugData();
                updateScriptData();
                finalizeScriptData();
                autoMarket(true, true);
            });
        }

        if (scriptNode.next().length) {
            resetScrollPositionRequired = true;
            scriptNode.parent().append(scriptNode);
        }

        if (settingsRaw.activeTargetsUI && $("#active_targets-wrapper").length === 0) {
            buildActiveTargetsUI();
        }
        if (settingsRaw.showSettings && $("#script_settings").length === 0) {
            buildScriptSettings();
        }
        if (settingsRaw.autoCraft && $('#resources .ea-craft-toggle').length === 0) {
            createCraftToggles();
        }
        // Building toggles added to different tabs, game can redraw just one tab, destroying toggles there, and we still have total number of toggles above zero; we'll remember amount of toggle, and redraw it when number differ from what we have in game
        if (settingsRaw.autoBuild) {
            let currentBuildingToggles = $('#mTabCivil .ea-building-toggle').length;
            if (currentBuildingToggles === 0 || currentBuildingToggles !== state.buildingToggles) {
                createBuildingToggles();
            }
        }
        if (settingsRaw.autoStorage && game.global.settings.showStorage && $('#resStorage .ea-storage-toggle').length === 0) {
            createStorageToggles();
        }
        if (settingsRaw.autoMarket && game.global.settings.showMarket && $('#market .ea-market-toggle').length === 0) {
            createMarketToggles();
        }
        if (settingsRaw.autoEject && game.global.settings.showEjector && $('#resEjector .ea-eject-toggle').length === 0) {
            createEjectToggles();
        }
        if (settingsRaw.autoSupply && game.global.settings.showCargo && $('#resCargo .ea-supply-toggle').length === 0) {
            createSupplyToggles();
        }
        if (settingsRaw.autoARPA && game.global.settings.showGenetics && $('#arpaPhysics .ea-arpa-toggle').length === 0) {
            createArpaToggles();
        }

        if (settingsRaw.autoMech && game.global.settings.showMechLab && $('#mechList .ea-mech-info').length < $('#mechList .mechRow').length) {
            createMechInfo();
        }

        // Hell messages
        if (settings.hellTurnOffLogMessages) {
            if (game.global.portal.fortress?.notify === "Yes") {
                $("#fort .b-checkbox").eq(0).click();
            }
            if (game.global.portal.fortress?.s_ntfy === "Yes") {
                $("#fort .b-checkbox").eq(1).click();
            }
        }

        // Soul Gems income rate
        if (resources.Soul_Gem.isUnlocked()) {
            let currentSec = Math.floor(state.scriptTick / 4);
            if (resources.Soul_Gem.currentQuantity > state.soulGemLast) {
                state.soulGemIncomes.push({sec: currentSec, gems: resources.Soul_Gem.currentQuantity - state.soulGemLast})
                state.soulGemLast = resources.Soul_Gem.currentQuantity;
            }
            let gems = 0;
            let i = state.soulGemIncomes.length;
            while (--i >= 0) {
                let income = state.soulGemIncomes[i];
                // Get all gems gained in last hour, or at least 10 last gems in any time frame, if rate is low
                if (currentSec - income.sec > 3600 && gems > 10) {
                    break;
                } else {
                    gems += income.gems;
                }
            }
            // If loop was broken prematurely - clean up old records which we don't need anymore
            if (i >= 0) {
                state.soulGemIncomes = state.soulGemIncomes.splice(i+1);
            }
            let timePassed = currentSec - state.soulGemIncomes[0].sec;
            let gph = gems / timePassed * 3600;
            state.soulGemPerHour = gph;
            if (gph >= 1000) { gph = Math.round(gph); }
            $("#resSoul_Gem span:eq(2)").text(`${gems > 0 && currentSec <= 3600 ? '~' : ''}${getNiceNumber(gph)} /h`);
        }

        // Previous game stats
        if ($("#statsPanel .cstat").length === 1) {
            let backupString = win.LZString.decompressFromUTF16(localStorage.getItem('evolveBak'));
            if (backupString) {
                let oldStats = JSON.parse(backupString).stats;
                let statsData = {knowledge_spent: oldStats.know, starved_to_death: oldStats.starved, died_in_combat: oldStats.died, attacks_made: oldStats.attacks, game_days_played: oldStats.days};
                if (oldStats.dkills > 0) {
                    statsData.demons_kills = oldStats.dkills;
                }
                if (oldStats.sac > 0) {
                    statsData.sacrificed = oldStats.sac;
                }
                if (oldStats.murders > 0) {
                    statsData.murders = oldStats.murders;
                }
                if (oldStats.psykill > 0) {
                    statsData.psymurders = oldStats.psykill;
                }
                let statsString = `<div class="cstat"><span class="has-text-success">Previous Game</span></div>`;
                for (let [label, value] of Object.entries(statsData)) {
                    statsString += `<div><span class="has-text-warning">${game.loc("achieve_stats_" + label)}</span> ${value.toLocaleString()}</div>`;
                }
                $("#statsPanel").append(statsString);
            }
        }

        if (resetScrollPositionRequired) {
            // Leave the scroll position where it was before all our updates to the UI above
            document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
        }

        updateTotalDaysInTopBar();
    }

