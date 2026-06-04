    function buildMechSettings() {
        let sectionId = "mech";
        let sectionName = "Mech & Spire";

        let resetFunction = function() {
            resetMechSettings(true);
            updateSettingsFromState();
            updateMechSettingsContent();

            resetCheckbox("autoMech");
            removeMechInfo();
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateMechSettingsContent);
    }

    function updateMechSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_mechContent');
        currentNode.empty().off("*");

        let scrapOptions = [{val: "none", label: "None", hint: "Nothing will be scrapped automatically"},
                            {val: "single", label: "Full bay", hint: "Scrap mechs only when mech bay is full, and script need more room to build mechs"},
                            {val: "all", label: "All inefficient", hint: "Scrap all inefficient mechs immediately, using refounded resources to build better ones"},
                            {val: "mixed", label: "Excess inefficient", hint: "Scrap as much inefficient mechs as possible, trying to preserve just enough of old mechs to fill bay to max by the time when next floor will be reached, calculating threshold based on progress speed and resources incomes"}];
        addSettingsSelect(currentNode, "mechScrap", "Scrap mechs", "Configures what will be scrapped. Infernal mechs won't ever be scrapped.", scrapOptions);
        addSettingsNumber(currentNode, "mechScrapEfficiency", "Scrap efficiency", "Scrap mechs only when '((OldMechRefund / NewMechCost) / (OldMechDamage / NewMechDamage))' more than given number.&#xA;For the cases when exchanged mechs have same size(1/3 refund) it means that with 1 eff. script allowed to scrap mechs under 33.3%. 1.5 eff. - under 22.2%, 2 eff. - under 16.6%, 0.5 eff. - under 66.6%, 0 eff. - under 100%, etc.&#xA;Efficiency below '1' is not recommended, unless scrap set to 'Full bay', as it's a breakpoint when refunded resources can immidiately compensate lost damage, resulting with best damage growth rate.&#xA;Efficiency above '1' is useful to save resources for more desperate times, or to compensate low soul gems income.");
        addSettingsNumber(currentNode, "mechCollectorValue", "Collector value", "Collectors can't be directly compared with combat mechs, having no firepower. Script will assume that one collector/size is equal to this amount of scout/size. If you feel that script is too reluctant to scrap old collectors - you can decrease this value. Or increase, to make them more persistant. 1 value - 50% collector equial to 50% scout, 0.5 value - 50% collector equial to 25% scout, 2 value - 50% collector equial to 100% scout, etc.");

        let buildOptions = [{val: "none", label: "None", hint: "Nothing will be build automatically"},
                            {val: "random", label: "Random good", hint: "Build random mech with size chosen below, and best possible efficiency"},
                            {val: "user", label: "Current design", hint: "Build whatever currently set in Mech Lab"}];
        addSettingsSelect(currentNode, "mechBuild", "Build mechs", "Configures what will be built. Infernal mechs won't ever be built.", buildOptions);

        // TODO: Make auto truly auto - some way to pick best "per x", depends on current bottleneck
        let sizeOptions = [{val: "auto", label: "Damage Per Size", hint: "Select affordable mech with most damage per size on current floor"},
                           {val: "gems", label: "Damage Per Gems", hint: "Select affordable mech with most damage per gems on current floor"},
                           {val: "supply", label: "Damage Per Supply", hint: "Select affordable mech with most damage per supply on current floor"},
                            ...MechManager.Size.map(id => ({val: id, label: game.loc(`portal_mech_size_${id}`), hint: game.loc(`portal_mech_size_${id}_desc`)}))];
        addSettingsSelect(currentNode, "mechSize", "Preferred mech size", "Size of random mechs", sizeOptions);
        addSettingsSelect(currentNode, "mechSizeGravity", "Gravity mech size", "Override preferred size with this on floors with high gravity", sizeOptions);

        let specialOptions = [{val: "always", label: "Always", hint: "Add special equipment to all mechs"},
                              {val: "prefered", label: "Preferred", hint: "Add special equipment when it doesn't reduce efficiency for current floor"},
                              {val: "random", label: "Random", hint: "Special equipment will have same chance to be added as all others"},
                              {val: "never", label: "Never", hint: "Never add special equipment"}];
        addSettingsSelect(currentNode, "mechSpecial", "Special mechs", "Configures special equip", specialOptions);
        addSettingsNumber(currentNode, "mechWaygatePotential", "Maximum mech potential for Waygate", "Fight Demon Lord only when current mech team potential below given amount. Full bay of best mechs will have `1` potential. Damage against Demon Lord does not affected by floor modifiers, all mechs always does 100% damage to him. Thus it's most time-efficient to fight him at times when mechs can't make good progress against regular monsters, and waiting for rebuilding. Auto Power needs to be on for this to work.");
        addSettingsNumber(currentNode, "mechMinSupply", "Minimum supply income", "Build collectors if current supply income below given number");
        addSettingsNumber(currentNode, "mechMaxCollectors", "Maximum collectors ratio", "Limiter for above option, maximum space used by collectors. 0.5 means up to 50% of total bay capacity will be dedicated to collectors, and such.");
        addSettingsNumber(currentNode, "mechSaveSupplyRatio", "Save up supplies for next floor", "Ratio of supplies to save up for next floor. Script will stop spending supplies on new mechs when it estimates that by the time when floor will be cleared you'll be under this supply ratio. That allows build bunch of new mechs suited for next enemy right after entering new floor. With 1 value script will try to start new floors with full supplies, 0.5 - with half, 0 - any, effectively disabling this option, etc.");
        addSettingsNumber(currentNode, "mechScouts", "Minimum scouts ratio", "Scouts compensate terrain penalty of suboptimal mechs. Build them up to this ratio.");
        addSettingsToggle(currentNode, "mechInfernalCollector", "Build infernal collectors", "Infernal collectors have incresed supply cost, and payback time, but becomes more profitable after ~30 minutes of uptime.");
        addSettingsToggle(currentNode, "mechScoutsRebuild", "Rebuild scouts", "Scouts provides full bonus to other mechs even being infficient, this option prevent rebuilding them saving resources.");
        addSettingsToggle(currentNode, "mechFillBay", "Build smaller mechs when preferred not available", "Build smaller mechs when preferred size can't be used due to low remaining bay space, or supplies cap");
        addSettingsToggle(currentNode, "buildingMechsFirst", "Build spire buildings only with full bay", "Fill mech bays up to current limit before spending resources on additional spire buildings");
        addSettingsToggle(currentNode, "mechBaysFirst", "Scrap mechs only after building maximum bays", "Scrap old mechs only when no new bays and purifiers can be builded");

        addStandardHeading(currentNode, "Mech Stats");
        let statsControls = $(`<div style="margin-top: 5px; display: inline-flex;"></div>`);
        Object.entries({Compact: true, Efficient: true, Special: true, Gravity: false}).forEach(([option, value]) => {
            statsControls.append(`
              <label class="switch" title="This switch have no ingame effect, and used to configure calculator below">
                <input id="script_mechStats${option}" type="checkbox"${value ? " checked" : ""}>
                <span class="check"></span><span style="margin-left: 10px;">${option}</span>
              </label>`);
        });
        statsControls.append(`
          <label class="switch" title="This input have no ingame effect, and used to configure calculator below">
            <input id="script_mechStatsScouts" class="input is-small" style="height: 25px; width: 50px" type="text" value="0">
            <span style="margin-left: 10px;">Scouts</span>
          </label>`);
        statsControls.on('input', calculateMechStats);
        currentNode.append(statsControls);
        currentNode.append(`<table class="selectable"><tbody id="script_mechStatsTable"><tbody></table>`);
        calculateMechStats();

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function calculateMechStats() {
        let cellInfo = '<td><span class="has-text-info">';
        let cellWarn = '<td><span class="has-text-warning">';
        let cellAdv = '<td><span class="has-text-advanced">';
        let cellEnd = '</span></td>';
        let content = "";

        let special = document.getElementById('script_mechStatsSpecial').checked;
        let gravity = document.getElementById('script_mechStatsGravity').checked;
        let efficient = document.getElementById('script_mechStatsEfficient').checked;
        let scouts = parseInt(document.getElementById("script_mechStatsScouts").value) || 0;
        let prepared = document.getElementById('script_mechStatsCompact').checked ? 2 : 0;

        let smallFactor = efficient ? 1 : average(Object.values(MechManager.SmallChassisMod).reduce((list, mod) => list.concat(Object.values(mod)), []));
        let largeFactor = efficient ? 1 : average(Object.values(MechManager.LargeChassisMod).reduce((list, mod) => list.concat(Object.values(mod)), []));
        let weaponFactor = efficient ? 1 : average(Object.values(poly.monsters).reduce((list, mod) => list.concat(Object.values(mod.weapon)), []));

        let rows = [[""], ["Damage Per Size"], ["Damage Per Supply (New)"], ["Damage Per Gems (New)"], ["Damage Per Supply (Rebuild)"], ["Damage Per Gems (Rebuild)"]];
        for (let i = 0; i < MechManager.Size.length - 1; i++) { // Exclude collectors
            let mech = {size: MechManager.Size[i], equip: special ? ['special'] : []};

            let basePower = MechManager.getSizeMod(mech, false);
            let statusMod = gravity ? MechManager.StatusMod.gravity(mech) : 1;
            let terrainMod = poly.terrainRating(mech, i < 2 ? smallFactor : largeFactor, gravity ? ['gravity'] : [], scouts);
            let weaponMod = poly.weaponPower(mech, weaponFactor) * MechManager.SizeWeapons[mech.size];
            let power = basePower * statusMod * terrainMod * weaponMod;

            let [gems, cost, space] = MechManager.getMechCost(mech, prepared);
            let [gemsRef, costRef] = MechManager.getMechRefund(mech, prepared);

            rows[0].push(game.loc("portal_mech_size_" + mech.size));
            rows[1].push((power / space * 100).toFixed(4));
            rows[2].push((power / (cost / 100000) * 100).toFixed(4));
            rows[3].push((power / gems * 100).toFixed(4));
            rows[4].push((power / ((cost - costRef) / 100000) * 100).toFixed(4));
            rows[5].push((power / (gems - gemsRef) * 100).toFixed(4));
        }
        rows.forEach((line, index) => content += "<tr>" + (index === 0 ? cellWarn : cellAdv) + line.join("&nbsp;" + cellEnd + (index === 0 ? cellAdv : cellInfo)) + cellEnd + "</tr>");
        $("#script_mechStatsTable").html(content);
    }

    function buildEjectorSettings() {
        let sectionId = "ejector";
        let sectionName = "Ejector, Supply & Nanite";

        let resetFunction = function() {
            resetEjectorSettings(true);
            updateSettingsFromState();
            updateEjectorSettingsContent();

            resetCheckbox("autoEject", "autoSupply", "autoNanite");
            removeEjectToggles();
            removeSupplyToggles();
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateEjectorSettingsContent);
    }

    function updateEjectorSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_ejectorContent');
        currentNode.empty().off("*");

        let spendOptions = [{val: "cap", label: "Capped", hint: "Use capped resources"},
                            {val: "excess", label: "Excess", hint: "Use excess resources"},
                            {val: "all", label: "All", hint: "Use all resources. This option can prevent script from progressing, and intended to use with additional conditions."},
                            {val: "mixed", label: "Capped > Excess", hint: "Use capped resources first, switching to excess resources when capped alone is not enough."},
                            {val: "full", label: "Capped > Excess > All", hint: "Use capped first, then excess, then everything else. Same as 'All' option can be potentialy dungerous."}];
        let spendDesc = "Configures threshold when script will be allowed to use resources. With any option script will try to use most expensive of allowed resources within selected group. Craftables, when enabled, always use excess amount as threshold, having no cap.";
        addSettingsSelect(currentNode, "ejectMode", "Eject mode", spendDesc, spendOptions);
        addSettingsSelect(currentNode, "supplyMode", "Supply mode", spendDesc, spendOptions);
        addSettingsSelect(currentNode, "naniteMode", "Nanite mode", spendDesc, spendOptions);
        addSettingsToggle(currentNode, "prestigeWhiteholeStabiliseMass", "Stabilize blackhole", "Stabilizes the blackhole with exotic materials, disabled on whitehole runs");
        addSettingsNumber(currentNode, "prestigeWhiteholeStabiliseCooldown", "Cooldown between stabilizes", "Waits this many seconds between stabilizes. Stabilizing too frequently may cause significant lag in late game due to frequent full page redraws. Set to 0 to disable cooldown.");

        currentNode.append(`
          <table style="width:100%">
            <tr>
              <th class="has-text-warning" style="width:20%">Resource</th>
              <th class="has-text-warning" style="width:20%">Atomic Mass</th>
              <th class="has-text-warning" style="width:10%">Eject</th>
              <th class="has-text-warning" style="width:10%">Nanite</th>
              <th class="has-text-warning" style="width:30%">Supply Value</th>
              <th class="has-text-warning" style="width:10%">Supply</th>
            </tr>
            <tbody id="script_ejectorTableBody"></tbody>
          </table>`);

        let tableBodyNode = $('#script_ejectorTableBody');
        let newTableBodyText = "";

        let tabResources = [];
        for (let id in resources) {
            let resource = resources[id];
            if (EjectManager.isConsumable(resource) || SupplyManager.isConsumable(resource) || NaniteManager.isConsumable(resource)) {
                tabResources.push(resource);
                newTableBodyText += `<tr><td id="script_eject_${resource.id}" style="width:20%"></td><td style="width:20%"></td><td style="width:10%"></td><td style="width:10%"></td><td style="width:30%"></td><td style="width:10%"></td></tr>`;
            }
        }

        tableBodyNode.append($(newTableBodyText));

        for (let i = 0; i < tabResources.length; i++) {
            let resource = tabResources[i];
            let ejectElement = $('#script_eject_' + resource.id);

            let color = (resource === resources.Elerium || resource === resources.Infernite) ? "has-text-caution" :
                resource.isCraftable() ? "has-text-danger" :
                !resource.is.tradable ? "has-text-advanced" :
                "has-text-info";

            ejectElement.append(buildTableLabel(resource.name, "", color));
            ejectElement = ejectElement.next();

            if (resource.atomicMass > 0) {
                ejectElement.append(`<span class="mass"><span class="has-text-warning">${resource.atomicMass}</span> kt</span>`);
            }
            ejectElement = ejectElement.next();

            if (EjectManager.isConsumable(resource)) {
                addTableToggle(ejectElement, "res_eject" + resource.id);
            }
            ejectElement = ejectElement.next();

            if (NaniteManager.isConsumable(resource)) {
                addTableToggle(ejectElement, "res_nanite" + resource.id);
            }

            if (SupplyManager.isConsumable(resource)) {
                ejectElement = ejectElement.next();
                ejectElement.append(`<span class="mass">Export <span class="has-text-caution">${SupplyManager.supplyOut(resource.id)}</span>, Gain <span class="has-text-success">${SupplyManager.supplyIn(resource.id)}</span></span>`);

                ejectElement = ejectElement.next();
                addTableToggle(ejectElement, "res_supply" + resource.id);
            }
        }

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

