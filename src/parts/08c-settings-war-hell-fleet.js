    function buildWarSettings(parentNode, secondaryPrefix) {
        let sectionId = "war";
        let sectionName = "Foreign Affairs";

        let resetFunction = function() {
            resetWarSettings(true);
            updateSettingsFromState();
            updateWarSettingsContent(secondaryPrefix);

            resetCheckbox("autoFight");
        };

        buildSettingsSection2(parentNode, secondaryPrefix, sectionId, sectionName, resetFunction, updateWarSettingsContent);
    }

    function updateWarSettingsContent(secondaryPrefix) {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $(`#script_${secondaryPrefix}warContent`);
        currentNode.empty().off("*");

        addSettingsHeader1(currentNode, "Foreign Powers");
        addSettingsToggle(currentNode, "foreignPacifist", "Pacifist", "Turns attacks off and on");

        addSettingsToggle(currentNode, "foreignUnification", "Perform unification", "Perform unification once all three powers are controlled. autoResearch should be enabled for this to work.");
        addSettingsToggle(currentNode, "foreignOccupyLast", "Occupy last foreign power", "Occupy last foreign power once other two are controlled, and unification is researched to speed up unification. Disable if you want annex\\purchase achievements.");
        addSettingsToggle(currentNode, "foreignForceSabotage", "Sabotage foreign power when useful", "Perform sabotage against current target if it's useful(power above 50), regardless of required power, and default action defined above");
        addSettingsToggle(currentNode, "foreignTrainSpy", "Train spies", "Train spies to use against foreign powers");
        addSettingsNumber(currentNode, "foreignSpyMax", "Maximum spies", "Maximum spies per foreign power");

        addSettingsNumber(currentNode, "foreignPowerRequired", "Military Power to switch target", "Switches to attack next foreign power once its power lowered down to this number. When exact numbers not know script tries to approximate it.");

        let policyOptions = [{val: "Ignore", label: "Ignore", hint: ""},
                             ...Object.entries(SpyManager.Types).map(([name, task]) => (
                             {val: name, label: game.loc("civics_spy_" + task.id), hint: ""})),
                             {val: "Occupy", label: "Occupy", hint: ""}];
        addSettingsSelect(currentNode, "foreignPolicyInferior", "Inferior Power", "Perform this against inferior foreign power, with military power equal or below given threshold. Complex actions includes required preparation - Annex and Purchase will incite and influence, Occupy will sabotage, until said options will be available.", policyOptions);
        addSettingsSelect(currentNode, "foreignPolicySuperior", "Superior Power", "Perform this against superior foreign power, with military power above given threshold. Complex actions includes required preparation - Annex and Purchase will incite and influence, Occupy will sabotage, until said options will be available.", policyOptions);

        let rivalOptions = [{val: "Ignore", label: "Ignore", hint: "Does nothing"},
                            {val: "Influence", label: "Alliance", hint: "Influence rival up to best relations"},
                            {val: "Sabotage", label: "War", hint: "Sabotage and plunder rival"},
                            {val: "Betrayal", label: "Betrayal", hint: "Influence rival up to best relations, and start sabotaging. Once military power reached minimum - start plundering it"}];
        addSettingsSelect(currentNode, "foreignPolicyRival", "Rival Power (The True Path)", "Perform this against rival foreign power.", rivalOptions);

        // Campaign panel
        addSettingsHeader1(currentNode, "Campaigns");
        addSettingsNumber(currentNode, "foreignAttackLivingSoldiersPercent", "Minimum percentage of alive soldiers for attack", "Only attacks if you ALSO have the target battalion size of healthy soldiers available, so this setting will only take effect if your battalion does not include all of your soldiers");
        addSettingsNumber(currentNode, "foreignAttackHealthySoldiersPercent", "Minimum percentage of healthy soldiers for attack", "Set to less than 100 to take advantage of being able to heal more soldiers in a game day than get wounded in a typical attack");
        addSettingsNumber(currentNode, "foreignHireMercMoneyStoragePercent", "Hire mercenary if money storage greater than percent", "Hire a mercenary if remaining money after purchase will be greater than this percent");
        addSettingsNumber(currentNode, "foreignHireMercCostLowerThanIncome", "OR if cost lower than money earned in X seconds", "Combines with the money storage percent setting to determine when to hire mercenaries");
        addSettingsNumber(currentNode, "foreignHireMercDeadSoldiers", "AND amount of dead soldiers above this number", "Hire a mercenary only when current amount of dead soldiers above given number");

        addSettingsNumber(currentNode, "foreignMinAdvantage", "Minimum advantage", "Minimum advantage to launch campaign, ignored during ambushes. 100% chance to win will be reached at approximately(influenced by traits and selected campaign) 75% advantage.");
        addSettingsNumber(currentNode, "foreignMaxAdvantage", "Maximum advantage", "Once campaign is selected, your battalion will be limited in size down to this advantage, reducing potential loses");
        addSettingsNumber(currentNode, "foreignMaxSiegeBattalion", "Maximum siege battalion", "Maximum battalion for siege campaign. Only try to siege if it's possible with up to given amount of soldiers. Siege is expensive, if you'll be doing it with too big battalion it might be less profitable than other combat campaigns. This option does not applied to unifying sieges, it affect only looting.");

        let protectOptions = [{val: "never", label: "Never", hint: "No additional limits to battalion size. Always send maximum soldiers allowed with current Max Advantage."},
                              {val: "always", label: "Always", hint: "Limit battalions to sizes which will neven suffer any casualties in successful fights. You still will lose soldiers after failures, increasing minimum advantage can improve winning odds. This option designed to use with armored races favoring frequent attacks, with no approppriate build it may prevent any attacks from happening."},
                              {val: "auto", label: "Auto", hint: "Tries to maximize total number of attacks, alternating between full and safe attacks based on soldiers condition, to get most from both healing and recruiting."}];
        addSettingsSelect(currentNode, "foreignProtect", "Protect soldiers", "Configures safety of attacks. This option does not applies to unifying sieges, it affect only looting.", protectOptions);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildHellSettings(parentNode, secondaryPrefix) {
        let sectionId = "hell";
        let sectionName = "Hell";

        let resetFunction = function() {
            resetHellSettings(true);
            updateSettingsFromState();
            updateHellSettingsContent(secondaryPrefix);

            resetCheckbox("autoHell");
        };

        buildSettingsSection2(parentNode, secondaryPrefix, sectionId, sectionName, resetFunction, updateHellSettingsContent);
    }

    function updateHellSettingsContent(secondaryPrefix) {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $(`#script_${secondaryPrefix}hellContent`);
        currentNode.empty().off("*");

        addSettingsHeader1(currentNode, "Entering Hell");
        addSettingsNumber(currentNode, "hellHomeGarrison", "Soldiers to stay out of hell", "Home garrison maximum");
        addSettingsNumber(currentNode, "hellMinSoldiers", "Minimum soldiers to be available for hell (pull out if below)", "Don't enter hell if not enough soldiers, or get out if already in");
        addSettingsNumber(currentNode, "hellMinSoldiersPercent", "Alive soldier percentage for entering hell", "Don't enter hell if too many soldiers are dead, but don't get out");

        addSettingsHeader1(currentNode, "Hell Garrison");
        addSettingsToggle(currentNode, "hellAssaultReserve", "Always reserve hell troops to Secure the Pit", "With this option enabled hell soldiers will be put to fortress once Secure the Pit is unlocked, to fulfil its costs. It makes saving resources and setting triggers for it easier, at cost of less efficient use of manpower.");
        addSettingsNumber(currentNode, "hellTargetFortressDamage", "Target wall damage per siege (overestimates threat)", "Actual damage will usually be lower due to patrols and drones");
        addSettingsNumber(currentNode, "hellLowWallsMulti", "Garrison bolster factor for damaged walls", "Multiplies target defense rating by this when close to 0 wall integrity, half as much increase at half integrity");

        addSettingsHeader1(currentNode, "Patrol Size");
        addSettingsToggle(currentNode, "hellHandlePatrolSize", "Automatically adjust patrol size", "Sets patrol attack rating based on current threat, lowers it depending on buildings, increases it to the minimum rating, and finally increases it based on dead soldiers. Handling patrol count has to be turned on.");
        addSettingsNumber(currentNode, "hellPatrolMinRating", "Minimum patrol attack rating", "Will never go below this");
        addSettingsNumber(currentNode, "hellPatrolThreatPercent", "Percent of current threat as base patrol rating", "Demon encounters have a rating of 2 to 10 percent of current threat");
        addSettingsNumber(currentNode, "hellPatrolDroneMod", "&emsp;Lower Rating for each active Predator Drone by", "Predators reduce threat before patrols fight");
        addSettingsNumber(currentNode, "hellPatrolDroidMod", "&emsp;Lower Rating for each active War Droid by", "War Droids boost patrol attack rating by 1 or 2 soldiers depending on tech");
        addSettingsNumber(currentNode, "hellPatrolBootcampMod", "&emsp;Lower Rating for each Bootcamp by", "Bootcamps help regenerate soldiers faster");
        addSettingsNumber(currentNode, "hellBolsterPatrolRating", "Increase patrol rating by up to this when soldiers die", "Larger patrols are less effective, but also have fewer deaths");
        addSettingsNumber(currentNode, "hellBolsterPatrolPercentTop", "&emsp;Start increasing patrol rating at this home garrison fill percent", "This is the higher number");
        addSettingsNumber(currentNode, "hellBolsterPatrolPercentBottom", "&emsp;Full patrol rating increase below this home garrison fill percent", "This is the lower number");

        // Attractors
        addSettingsHeader1(currentNode, "Attractors");
        addSettingsNumber(currentNode, "hellAttractorBottomThreat", "&emsp;All Attractors on below this threat", "Turn more and more attractors off when getting nearer to the top threat. Auto Power needs to be on for this to work.");
        addSettingsNumber(currentNode, "hellAttractorTopThreat", "&emsp;All Attractors off above this threat", "Turn more and more attractors off when getting nearer to the top threat. Auto Power needs to be on for this to work.");

        // Warlord
        addSettingsHeader1(currentNode, "Warlord Specific Settings");
        addSettingsToggle(currentNode, "warlordHandleFortress", "Automatically attack enemy fortresses during Warlord", "Attacks an enemy fortress when minions are above the specified threshold");
        addSettingsNumber(currentNode, "warlordMinimumMinions", "&emsp;Minimum minions required to attack an enemy fortress", "Will not attack if there are fewer than this many minions");

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildFleetSettings(parentNode, secondaryPrefix) {
        let sectionId = "fleet";
        let sectionName = "Fleet";

        let resetFunction = function() {
            resetFleetSettings(true);
            updateSettingsFromState();
            updateFleetSettingsContent(secondaryPrefix);

            resetCheckbox("autoFleet");
        };

        buildSettingsSection2(parentNode, secondaryPrefix, sectionId, sectionName, resetFunction, updateFleetSettingsContent);
    }

    function updateFleetSettingsContent(secondaryPrefix) {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $(`#script_${secondaryPrefix}fleetContent`);
        currentNode.empty().off("*");

        updateFleetAndromeda(currentNode, secondaryPrefix);
        updateFleetOuter(currentNode, secondaryPrefix);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function updateFleetOuter(currentNode, secondaryPrefix) {
        addStandardHeading(currentNode, "Outer Solar");

        let shipOptions = [{val: "none", label: "None", hint: "Ship building disabled"},
                           {val: "user", label: "Current design", hint: "Build whatever currently set in Ship Yard"},
                           {val: "manual", label: "Manual mode", hint: "Assists accumulating resources needed for current blueprint, without building or deploying anything. It also might need tweaking prioritization settings to work."},
                           {val: "custom", label: "Presets", hint: "Build ships with components configured below. All components need to be unlocked, and resulting design should have enough power"}];
        addSettingsSelect(currentNode, "fleetOuterShips", "Ships to build", "Once avalable and affordable script will build ship of selected design, and send it to region with most piracy * weighting", shipOptions);
        addSettingsNumber(currentNode, "fleetOuterCrew", "Minimum idle soldiers", "Only build ships when amount of idle soldiers above give number");
        addSettingsToggle(currentNode, "fleetExploreTau", "Explore Tau Ceti", "Send explorer to Tau Ceti");

        addSettingsHeader1(currentNode, "Fighter");
        for (let [type, parts] of Object.entries(FleetManagerOuter.ShipConfig)) {
            let partOptions = parts.map(id => ({val: id, label: game.loc(`outer_shipyard_${type}_${id}`)}));
            addSettingsSelect(currentNode, `fleet_outer_${type}`, game.loc(`outer_shipyard_${type}`), "Preset ship component", partOptions);
        }
        addSettingsHeader1(currentNode, "Scout");
        for (let [type, parts] of Object.entries(FleetManagerOuter.ShipConfig)) {
            let partOptions = parts.map(id => ({val: id, label: game.loc(`outer_shipyard_${type}_${id}`)}));
            addSettingsSelect(currentNode, `fleet_scout_${type}`, game.loc(`outer_shipyard_${type}`), "Preset ship component", partOptions);
        }

        renderSettingsTable(currentNode, getWarHellFleetSettingsSchema().fleet.tables.outer(secondaryPrefix));
    }

    function updateFleetAndromeda(currentNode, secondaryPrefix) {
        addStandardHeading(currentNode, "Andromeda");
        addSettingsToggle(currentNode, "fleetMaxCover", "Maximize protection of prioritized systems", "Adjusts ships distribution to fully supress piracy in prioritized regions. Some potential defense will be wasted, as it will use big ships to cover small holes, when it doesn't have anything fitting better. This option is not required: all your dreadnoughts still will be used even without this option.");
        addSettingsNumber(currentNode, "fleetEmbassyKnowledge", "Minimum knowledge for Embassy", "Building Embassy increases maximum piracy up to 100, script won't Auto Build it until this knowledge cap is reached.");
        addSettingsNumber(currentNode, "fleetAlienGiftKnowledge", "Minimum knowledge for Alien Gift", "Researching Alien Gift increases maximum piracy up to 250, script won't Auto Research it until this knowledge cap is reached.");
        addSettingsNumber(currentNode, "fleetAlien2Knowledge", "Minimum knowledge for Alien 2 Assault", "Assaulting Alien 2 increases maximum piracy up to 500, script won't do it until this knowledge cap is reached. Regardless of set value it won't ever try to assault until you have big enough fleet to do it without loses.");

        let alien2AssaultOptions = [{val: "none", label: "No Losses", hint: "Min fleet strength 650. No losses."},
                              {val: "suicide", label: "Suicide Mission", hint: "Attack as soon as we hit 400 fleet rating. There will be losses."}];
        addSettingsSelect(currentNode, "fleetAlien2Loses", "Alien 2 Mission", "Assault Alien 2 when chosen outcome is achievable. You should really keep the default, unless you're speed running and want to take it out ASAP with losses.", alien2AssaultOptions);

        let assaultOptions = [{val: "ignore", label: "Manual assault", hint: "Won't ever launch assault mission on Chthonian"},
                              {val: "high", label: "High casualties", hint: "Unlock Chthonian using mixed fleet, high casualties (1250+ total fleet power, 500 will be lost)"},
                              {val: "avg", label: "Average casualties", hint: "Unlock Chthonian using mixed fleet, average casualties (2500+ total fleet power, 160 will be lost)"},
                              {val: "low", label: "Low casualties", hint: "Unlock Chthonian using mixed fleet, low casualties (4500+ total fleet power, 80 will be lost)"},
                              {val: "frigate", label: "Frigate", hint: "Unlock Chthonian loosing Frigate ship(s) (4500+ total fleet power, suboptimal for banana\\instinct runs)"},
                              {val: "dread", label: "Dreadnought", hint: "Unlock Chthonian with Dreadnought suicide mission"}];
        addSettingsSelect(currentNode, "fleetChthonianLoses", "Chthonian Mission", "Assault Chthonian when chosen outcome is achievable. Mixed fleet formed to clear mission with minimum possible wasted ships, e.g. for low causlities it can sacriface 8 scouts, or 2 corvettes and 2 scouts, or frigate, and such. Whatever will be first available. It also takes in account perks and challenges, adjusting fleet accordingly.", assaultOptions);

        renderSettingsTable(currentNode, getWarHellFleetSettingsSchema().fleet.tables.andromeda(secondaryPrefix));
    }
