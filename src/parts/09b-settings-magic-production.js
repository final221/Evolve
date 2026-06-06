    function buildMagicSettings() {
        let sectionId = "magic";
        let sectionName = "Magic";

        let resetFunction = function() {
            resetMagicSettings(true);
            updateSettingsFromState();
            updateMagicSettingsContent();

            resetCheckbox("autoAlchemy", "autoPylon");
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateMagicSettingsContent);
    }

    function updateMagicSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_magicContent');
        currentNode.empty().off("*");

        updateMagicAlchemy(currentNode);
        updateMagicPylon(currentNode);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function updateMagicAlchemy(currentNode) {
        addStandardHeading(currentNode, "Alchemy");
        addSettingsNumber(currentNode, "magicAlchemyManaUse", "Mana income used", "Income portion to use on alchemy. Setting to 1 is not recommended, leftover mana will be used for rituals.");

        renderSettingsTable(currentNode, getMagicSettingsSchema().tables.alchemy);
    }

    function buildProductionSettings() {
        let sectionId = "production";
        let sectionName = "Production";

        let resetFunction = function() {
            resetProductionSettings(true);
            updateSettingsFromState();
            updateProductionSettingsContent();

            resetCheckbox("autoQuarry", "autoMine", "autoExtractor", "autoGraphenePlant", "autoSmelter", "autoCraft", "autoFactory", "autoMiningDroid", "autoReplicator");
            removeCraftToggles();
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateProductionSettingsContent);
    }

    function updateProductionSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_productionContent');
        currentNode.empty().off("*");

        addSettingsNumber(currentNode, "productionChrysotileWeight", "Chrysotile weighting (Quarry, Smoldering)", "Chrysotile weighting for autoQuarry, applies after adjusting to difference between current amounts of Stone and Chrysotile");
        addSettingsNumber(currentNode, "productionAdamantiteWeight", "Adamantite weighting (Mine, The True Path)", "Adamantite weighting for autoMine, applies after adjusting to difference between current amounts of Aluminium and Adamantite");
        addSettingsNumber(currentNode, "productionExtWeight_common", "Aluminium weighting (Extractor Ship, The True Path)", "Aluminium weighting for autoExtractor, applies after adjusting to difference between current amounts of Iron and Aluminium");
        addSettingsNumber(currentNode, "productionExtWeight_uncommon", "Neutronium weighting (Extractor Ship, The True Path)", "Neutronium weighting for autoExtractor, applies after adjusting to difference between current amounts of Iridium and Neutronium");
        addSettingsNumber(currentNode, "productionExtWeight_rare", "Elerium weighting (Extractor Ship, The True Path)", "Elerium weighting for autoExtractor, applies after adjusting to difference between current amounts of Orichalcum and Elerium");
        // Named incorrectly now, affects both factory and craftsmen
        // TODO: Implement focus material mode for other production types
        addSettingsToggle(currentNode, "productionFactoryFocusMaterials", "Prioritize keeping materials stockpiled", `Aggressively request stockpiling ${CONSUMPTION_BALANCE_TARGET}s + min materials worth of materials to ensure factory and craftsmen can always produce`);

        updateProductionTableSmelter(currentNode);
        updateProductionTableFoundry(currentNode);
        updateProductionTableFactory(currentNode);
        updateProductionTableMiningDrone(currentNode);
        updateProductionTableReplicator(currentNode);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function updateProductionTableSmelter(currentNode) {
        addStandardHeading(currentNode, "Smelter");
        let schema = getProductionSettingsSchema();

        let smelterOptions = [{val: "iron", label: "Prioritize Iron", hint: "Produce only Iron, untill storage capped, and switch to Steel after that"},
                              {val: "steel", label: "Prioritize Steel", hint: "Produce as much Steel as possible, untill storage capped, and switch to Iron after that"},
                              {val: "storage", label: "Up to full storages", hint: "Produce both Iron and Steel at ratio which will fill both storages at same time for both"},
                              {val: "required", label: "Up to required amounts", hint: "Produce both Iron and Steel at ratio which will produce maximum amount of resources required for buildings at same time for both"}];
        addSettingsSelect(currentNode, "productionSmelting", "Smelters production", "Distribution of smelters between iron and steel", smelterOptions);
        addSettingsNumber(currentNode, "productionSmeltingIridium", "Iridium ratio", "Share of smelters dedicated to Iridium");

        renderSettingsTable(currentNode, schema.tables.smelter);
    }

    function updateProductionTableFactory(currentNode) {
        addStandardHeading(currentNode, "Factory");
        let schema = getProductionSettingsSchema();
        let weightingOptions = [{val: "none", label: "None", hint: "Use configured weightings with no additional adjustments, resources with x2 weighting will be produced two times more intense than with x1, etc."},
                                {val: "demanded", label: "Prioritize demanded", hint: "Ignore resources once stored amount surpass cost of most expensive building, until all missing resources will be crafted. After that works as with 'none' adjustments."},
                                {val: "buildings", label: "Buildings weightings", hint: "Uses weightings of buildings which are waiting for resources, as multipliers to production weighting. This option requires autoBuild."}];
        addSettingsSelect(currentNode, "productionFactoryWeighting", "Weightings adjustments", "Configures how exactly the resources will be weighted against each other", weightingOptions);
        addSettingsNumber(currentNode, "productionFactoryMinIngredients", "Minimum materials to preserve", "Factory will craft resources only when all required materials above given ratio");

        renderSettingsTable(currentNode, schema.tables.factory);
    }

    function updateProductionTableFoundry(currentNode) {
        addStandardHeading(currentNode, "Foundry");
        let schema = getProductionSettingsSchema();
        let weightingOptions = [{val: "none", label: "None", hint: "Use configured weightings with no additional adjustments, craftables with x2 weighting will be crafted two times more intense than with x1, etc."},
                                {val: "demanded", label: "Prioritize demanded", hint: "Ignore craftables once stored amount surpass cost of most expensive building, until all missing resources will be crafted. After that works as with 'none' adjustments."},
                                {val: "buildings", label: "Buildings weightings", hint: "Uses weightings of buildings which are waiting for craftables, as multipliers to craftables weighting. This option requires autoBuild."}];
        addSettingsSelect(currentNode, "productionFoundryWeighting", "Weightings adjustments", "Configures how exactly craftables will be weighted against each other", weightingOptions);

        let assignOptions = [{val: "always", label: "Always", hint: "Always assign all craftsmens"},
                             {val: "nocraft", label: "No Manual Crafting", hint: "Assign workers only manual crafting is not possible, servants still always will be assigned"},
                             {val: "advanced", label: "Advanced", hint: "Assign workers only to advanced craftables(Scarletite, Quantium), basic craftables will be crafted by servants"},
                             {val: "servants", label: "Servants", hint: "Assign only servants"}];
        addSettingsSelect(currentNode, "productionCraftsmen", "Assign craftsmen", "Configures when workers should be assigned to crafting jobs", assignOptions);


        renderSettingsTable(currentNode, schema.tables.foundry);
    }

    function updateProductionTableMiningDrone(currentNode) {
        addStandardHeading(currentNode, "Mining Droid");
        let schema = getProductionSettingsSchema();

        renderSettingsTable(currentNode, schema.tables.miningDroid);
    }

    function updateProductionTableReplicator(currentNode) {
        addStandardHeading(currentNode, "Replicator");
        let schema = getProductionSettingsSchema();

        addSettingsToggle(currentNode, 'replicatorAssignGovernorTask', 'Assign governor task', 'If active, the replicator scheduler governor task will be set, the power adjustment will be enabled.')
        addSettingsSelect(currentNode, 'replicatorWeightingMode', 'Weighting mode', 'Replicator only picks from enabled resources with the current highest valid priority (or -1 priority). After that, replicator use is split between resources of identical weighting. Setting configures how that split happens.', [
            { val: "mass", hint: "Spends more time on resources that are easy to replicate. A resource with 2x the weighting will have roughly 2x the time spent. Based on differences in atomic mass, resources at similar weightings may have very different quantities.", label: "By atomic mass" },
            { val: "quantity", hint: "Spends more time on resources that are hard to replicate. A resource with 2x the weighting will be focused until you have roughly 2x the amount. Resources at similar weightings will have similar quantities.", label: "By resource quantity" },
            { val: "legacy", hint: "Legacy mode, similar to previous script behavior. Only the resource with the highest weighting is picked. If multiple resources have the same weighting then it will focus exclusively on one of those resources. This mode exists only to give you time to migrate your config to using the priority field.", label: "Legacy (deprecated)" },
        ]);

        renderSettingsTable(currentNode, schema.tables.replicator);
    }

    function updateMagicPylon(currentNode) {
        addStandardHeading(currentNode, "Pylon");
        addSettingsNumber(currentNode, "productionRitualManaUse", "Mana income used", "Income portion to use on rituals. Setting to 1 is not recommended, as it will halt mana regeneration. Applied only when mana not capped - with capped mana script will always use all income.");
        addSettingsToggle(currentNode, "productionRitualSafe", "Safe rituals", "Limit max rituals to safe, unsuspicious amount. Have no effect out of Witch Hunter scenario.");

        renderSettingsTable(currentNode, getMagicSettingsSchema().tables.pylon);
    }
