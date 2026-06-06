    function buildMarketSettings() {
        let sectionId = "market";
        let sectionName = "Market";

        let resetFunction = function() {
            resetMarketSettings(true);
            updateSettingsFromState();
            updateMarketSettingsContent();

            resetCheckbox("autoMarket", "autoGalaxyMarket");
            removeMarketToggles();
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateMarketSettingsContent);
    }

    function updateMarketSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_marketContent');
        currentNode.empty().off("*");

        addSettingsNumber(currentNode, "minimumMoney", "Manual trade minimum money", "Minimum money to keep after bulk buying");
        addSettingsNumber(currentNode, "minimumMoneyPercentage", "Manual trade minimum money percentage", "Minimum percentage of money to keep after bulk buying");
        addSettingsNumber(currentNode, "tradeRouteMinimumMoneyPerSecond", "Trade minimum money /s", "Uses the highest per second amount of these two values. Will trade for resources until this minimum money per second amount is hit");
        addSettingsNumber(currentNode, "tradeRouteMinimumMoneyPercentage", "Trade minimum money percentage /s", "Uses the highest per second amount of these two values. Will trade for resources until this percentage of your money per second amount is hit");
        addSettingsToggle(currentNode, "tradeRouteSellExcess", "Sell excess resources", "With this option enabled script will be allowed to sell resources above amounts needed for constructions or researches, without it script sell only capped resources. As side effect boughts will also be limited to that amounts, to avoid 'buy up to cap -> sell excess' loops.");

        let schema = getMarketStorageSettingsSchema().market;
        renderSettingsTable(currentNode, schema.tables.market);

        addStandardHeading(currentNode, "Galaxy Trades");
        addSettingsNumber(currentNode, "marketMinIngredients", "Minimum materials to preserve", "Galaxy Market will buy resources only when all selling materials above given ratio");

        renderSettingsTable(currentNode, schema.tables.galaxy);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildStorageSettings() {
        let sectionId = "storage";
        let sectionName = "Storage";

        let resetFunction = function() {
            resetStorageSettings(true);
            updateSettingsFromState();
            updateStorageSettingsContent();

            resetCheckbox("autoStorage");
            removeStorageToggles();
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateStorageSettingsContent);
    }

    function updateStorageSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_storageContent');
        currentNode.empty().off("*");

        addSettingsToggle(currentNode, "storageLimitPreMad", "Limit Pre-MAD Storage", "Saves resources and shortens run time by limiting storage pre-MAD");
        addSettingsToggle(currentNode, "storageSafeReassign", "Reassign only empty storages", "Wait until storage is empty before reassigning containers to another resource, to prevent overflowing and wasting resources");
        addSettingsToggle(currentNode, "storageAssignExtra", "Assign buffer storage", "Assigns 3% extra strorage above required amounts, ensuring that required quantity will be actually reached, even if other part of script trying to sell\\eject\\switch production, etc. When manual trades enabled applies additional adjust derieved from selling threshold.");
        addSettingsToggle(currentNode, "storageAssignPart", "Assign partial storage", "When enabled script will be allowed to assign some crates and containers even if resulting storage space won't be enough to build new building. It allows to pre-build stock of resources for further use, but can be potentially dungerous.\nIf script not allowed to reassign non-empty storage it can lock storage in position when stored resources can't be used.\nIf script is allowed to reassign non-empty storage it might waste time producing materials which might need to be disposed.");

        let schema = getMarketStorageSettingsSchema().storage;
        renderSettingsTable(currentNode, schema.tables.storage);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildTraitSettings() {
        let sectionId = "trait";
        let sectionName = "Traits";

        let resetFunction = function() {
            resetMinorTraitSettings(true);
            resetMutableTraitSettings(true);
            updateSettingsFromState();
            updateTraitSettingsContent();

            resetCheckbox("autoMinorTrait", "autoMutateTraits", "autoGenetics");
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateTraitSettingsContent);
    }

    function updateImitateWarning() {
        let race = races[settingsRaw.imitateRace];

        if (race) {
            const raceAvaialableForImitate = race && game.global.stats.synth[race.id];
            if (raceAvaialableForImitate) {
                $("#script_imitate_warning").html(`<span class="has-text-success">You have completed an AI Apocalypse with this race and can imitate it.</span>`);
            } else {
                $("#script_imitate_warning").html(`<span class="has-text-danger">Warning! You have NOT completed an AI Apocalypse with this race, and cannot imitate it.</span>`);
            }
        } else {
            $("#script_imitate_warning").empty();
        }
    }

    function updateTraitSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_traitContent');

        currentNode.empty().off("*");

        addStandardHeading(currentNode, "Major Traits");
        let genusOptions = [{val: "ignore", label: "Ignore", hint: "Do not shift genus"},
                            {val: "none", label: game.loc(`genelab_genus_none`)},
                            ...Object.values(game.races).map(r => r.type).filter((g, i, a) => g && g !== "organism" && g !== "synthetic" && a.indexOf(g) === i).map(g => (
                            {val: g, label: game.loc(`genelab_genus_${g}`)}))];
        addSettingsSelect(currentNode, "shifterGenus", "Mimic genus", "Mimic selected genus, if avaialble. If you want to add some conditional overrides to this setting, keep in mind changing genus redraws game page, frequent changes can drastically harm game performance.", genusOptions);

        const imitateOptions = [{
                val: "ignore",
                label: "Ignore",
                hint: "Do not imitate race. IMPORTANT: script will stall at evolution if none selected"
            },
            ...Object.values(races)
                .map(race => {
                const label = game.global.stats.synth[race.id] ? race.name : `--${race.name}--`

                return {
                    val: race.id,
                    label,
                    hint: race.desc
                }
            })];

        addSettingsSelect(currentNode, "imitateRace", "Imitate race", "Imitate selected race, if available.", imitateOptions).on('change', 'select', function() {
            state.evolutionTarget = null;
            updateImitateWarning();
        });

        currentNode.append(`<div><span id="script_imitate_warning"></span></div>`);
        updateImitateWarning();

        let shrineOptions = [{val: "any", label: "Any", hint: "Build any Shrines, whenever have resources for it"},
                             {val: "equally", label: "Equally", hint: "Build all Shrines equally"},
                             {val: "morale", label: "Morale", hint: "Build only Morale Shrines"},
                             {val: "metal", label: "Metal", hint: "Build only Metal Shrines"},
                             {val: "know", label: "Knowledge", hint: "Build only Knowledge Shrines"},
                             {val: "tax", label: "Tax", hint: "Build only Tax Shrines"},
                             {val: "rotating", label: "Rotating", hint: "Build Shrines during quarter/full phases for rotating effect shrines"}];                             
        addSettingsSelect(currentNode, "buildingShrineType", "Magnificent shrine", "Auto Build shrines only at moons of chosen shrine", shrineOptions);
        addSettingsNumber(currentNode, "slaveIncome", "Minimum income to buy slave", "Script will use Slave Market only when money is capped, or have income above given number");

        let psychicOptions = [{val: "none", label: "Ignore", hint: "Psychic Powers ignored by script"},
                              {val: "auto", label: "Script Managed", hint: "Performs one of available actions in this order: Capture, Mind Break, Boost Profits, Boost Resource, Boost Attack Power."},
                               ...["boost", "murder", "assault", "profit", "stun", "mind_break"].map(p =>
                               ({val: p, label: game.loc(`psychic_${p}_title`), hint: game.loc(`psychic_${p}_desc`)}))];
        addSettingsSelect(currentNode, "psychicPower", "Psychic Powers", "Activates selected power with full energy. 10 murders required to research advanced powers will be performed automatically, if needed.", psychicOptions);

        let psychicBoost = [{val: "auto", label: "Script Managed", hint: "Resource selected by looking for highest income among ones having enough free storage room."},
                             ...Object.values(resources).filter(r => r.atomicMass > 0).map(r => ({val: r.id, label: r.title}))];
        addSettingsSelect(currentNode, "psychicBoostRes", "Boosted Resource", "Resource for Boost Resource Production psychic power.", psychicBoost);

        let wishMinor = [{ val: "none", label: "None", hint: "Disable using minor wishes." },
            ...wishData.minor.map(w => ({ val: w.id, label: poly.loc('wish_for', [poly.loc(w.loc)]) }))];
        addSettingsSelect(currentNode, "wishMinor", "Minor Wish", "Uses this minor wish when available.", wishMinor);
        let wishMajor = [{ val: "none", label: "None", hint: "Disable using major wishes." },
            ...wishData.major.map(w => ({ val: w.id, label: poly.loc('wish_for', [poly.loc(w.loc)]) }))];
        addSettingsSelect(currentNode, "wishMajor", "Major Wish", "Uses this major wish when available.", wishMajor);

        addSettingsToggle(currentNode, "jobScalePop", "High Pop job scale", "Auto Job will automatically scaly breakpoints to match population increase");

        addStandardHeading(currentNode, "Ocular Powers");
        let traitSchema = getJobTraitEjectorSettingsSchema().trait;
        renderSettingsTable(currentNode, traitSchema.minor.tables.ocular);

        // Minor Traits
        addStandardHeading(currentNode, "Minor Traits");

        let sequenceOptions = [{val: "none", label: "Ignore", hint: "Ignored by script, managed by game and player"},
                               {val: "enabled", label: "Enable", hint: "Sequencer enabled"},
                               {val: "disabled", label: "Disable", hint: "Sequencer disabled"},
                               {val: "decode", label: "Decode", hint: "Decode genome only, with no further mutations"}];
        addSettingsSelect(currentNode, "geneticsSequence", "Sequencer", "Manages genome decoding, and mutations", sequenceOptions);

        let boostOptions = [{val: "none", label: "Ignore", hint: "Ignored by script, managed by game and player"},
                            {val: "enabled", label: "Enable", hint: "Booster enabled"},
                            {val: "disabled", label: "Disable", hint: "Booster disabled"}];
        addSettingsSelect(currentNode, "geneticsBoost", "Sequence Booster", "Manages sequencer booster", boostOptions);

        let assembleOptions = [{val: "none", label: "Ignore", hint: "Ignored by script, managed by game and player"},
                               {val: "enabled", label: "Enable", hint: "Auto Sequencer enable"},
                               {val: "disabled", label: "Disable", hint: "Auto Sequencer disable"},
                               {val: "auto", label: "Script Managed", hint: "Gene assembling managed by script, allowing to dump excess knowledge at faster rate, matching income"}];
        addSettingsSelect(currentNode, "geneticsAssemble", "Auto Sequence", "Manages genome decoding, and mutations", assembleOptions);

        renderSettingsTable(currentNode, traitSchema.minor.tables.minor);

        // Trait Mutations

        addStandardHeading(currentNode, "Trait Mutation");
        addSettingsToggle(currentNode, "doNotGoBelowPlasmidSoftcap", "Do not go below Plasmid softcap", "Script will not mutate if the number of remaining plasmids or anti plamids would be lower than the softcap (250 + Phage)");
        addSettingsNumber(currentNode, "minimumPlasmidsToPreserve", "Minimum Plasmids / Anti-Plasmids to preserve", "Script will not mutate if the number of remaining plasmids or anti plamids would be lower than this value");

        renderSettingsTable(currentNode, traitSchema.mutable.tables.mutable);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function makeToggleSwitchesMutuallyExclusive(switch1, settingsKey1, switch2, settingsKey2)
    {
        switch1.on("change", function() {
            if (switch1.prop("checked") && switch2.prop("checked")) {
                switch2.prop("checked", false);
                settingsRaw[settingsKey2] = false;
                updateSettingsFromState();
            }
        });
        switch2.on("change", function() {
            if (switch1.prop("checked") && switch2.prop("checked")) {
                switch1.prop("checked", false);
                settingsRaw[settingsKey1] = false;
                updateSettingsFromState();
            }
        });
    }

