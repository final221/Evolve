    function buildJobSettings() {
        let sectionId = "job";
        let sectionName = "Job";

        let resetFunction = function() {
            resetJobSettings(true);
            updateSettingsFromState();
            updateJobSettingsContent();

            resetCheckbox("autoJobs", "autoCraftsmen");
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateJobSettingsContent);
    }

    function updateJobSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_jobContent');
        currentNode.empty().off("*");

        addSettingsToggle(currentNode, "jobSetDefault", "Set default job", "Automatically sets the default job in order of Quarry Worker -> Lumberjack -> Crystal Miner -> Scavenger -> Hunter -> Farmer -> Unemployed");
        addSettingsToggle(currentNode, "jobManageServants", "Manage Servants", "Automatically manage servants, they will be used as substitute of regular workers, sharing same breakpoints and priorities, i.e. for breakpoint 10 script might assign 8 workers and 2 servants, and such.");
        addSettingsNumber(currentNode, "jobLumberWeighting", "Final Lumberjack Weighting", "AFTER allocating breakpoints this weighting will be used to split weighted jobs");
        addSettingsNumber(currentNode, "jobQuarryWeighting", "Final Quarry Worker Weighting", "AFTER allocating breakpoints this weighting will be used to split weighted jobs");
        addSettingsNumber(currentNode, "jobCrystalWeighting", "Final Crystal Miner Weighting", "AFTER allocating breakpoints this weighting will be used to split weighted jobs");
        addSettingsNumber(currentNode, "jobScavengerWeighting", "Final Scavenger Weighting", "AFTER allocating breakpoints this weighting will be used to split weighted jobs");
        addSettingsNumber(currentNode, "jobRaiderWeighting", "Final Raider Weighting", "AFTER allocating breakpoints this weighting will be used to split weighted jobs");
        addSettingsNumber(currentNode, "jobForagerWeighting", "Final Forager Weighting", "AFTER allocating breakpoints this weighting will be used to split weighted jobs");
        addSettingsToggle(currentNode, "jobDisableMiners", "Disable miners in Andromeda", "Disable Miners and Coal Miners after reaching Andromeda");

        currentNode.append(`
          <table style="width:100%">
            <tr>
              <th class="has-text-warning" style="width:35%">Job</th>
              <th class="has-text-warning" style="width:17%">1st Pass</th>
              <th class="has-text-warning" style="width:17%">2nd Pass</th>
              <th class="has-text-warning" style="width:17%">3rd Pass</th>
              <th class="has-text-warning" style="width:9%" title="When enabled script will limit amount of assigned workers down to maximum useful quantity, moving idling workers to other jobs">Smart</th>
              <td style="width:5%"><span id="script_resetJobsPriority" class="script-refresh"></span></td>
            </tr>
            <tbody id="script_jobTableBody"></tbody>
          </table>`);

        $('#script_resetJobsPriority').on("click", function(){
            if (confirm("Are you sure you wish to reset jobs priority?")) {
                JobManager.priorityList = Object.values(jobs);
                for (let i = 0; i < JobManager.priorityList.length; i++) {
                    let id = JobManager.priorityList[i]._originalId;
                    settingsRaw['job_p_' + id] = i;
                }
                updateSettingsFromState();
                updateJobSettingsContent();
            }
        });

        let tableBodyNode = $('#script_jobTableBody');
        let newTableBodyText = "";

        for (let i = 0; i < JobManager.priorityList.length; i++) {
            const job = JobManager.priorityList[i];
            newTableBodyText += `<tr value="${job._originalId}" class="script-draggable"><td id="script_${job._originalId}" style="width:35%"></td><td style="width:17%"></td><td style="width:17%"></td><td style="width:17%"></td><td style="width:9%"></td><td style="width:5%"></td></tr>`;
        }
        tableBodyNode.append($(newTableBodyText));

        for (let i = 0; i < JobManager.priorityList.length; i++) {
            const job = JobManager.priorityList[i];
            let jobElement = $('#script_' + job._originalId);

            buildJobSettingsToggle(jobElement, job);
            jobElement = jobElement.next();
            buildJobSettingsInput(jobElement, job, 1);
            jobElement = jobElement.next();
            buildJobSettingsInput(jobElement, job, 2);
            jobElement = jobElement.next();
            buildJobSettingsInput(jobElement, job, 3);
            jobElement = jobElement.next();
            if (job.is.smart) {
                addTableToggle(jobElement, "job_s_" + job._originalId);
            }

            jobElement = jobElement.next();
            jobElement.append($('<span class="script-lastcolumn"></span>'));
        }

        tableBodyNode.sortable({
            items: "tr:not(.unsortable)",
            helper: sorterHelper,
            update: function() {
                let sortedIds = tableBodyNode.sortable('toArray', {attribute: 'value'});
                for (let i = 0; i < sortedIds.length; i++) {
                    settingsRaw['job_p_' + sortedIds[i]] = i;
                }

                JobManager.sortByPriority();
                updateSettingsFromState();
            },
        });

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function buildJobSettingsToggle(node, job) {
        let settingKey = "job_" + job._originalId;
        let color = job === jobs.Unemployed ? 'warning' : job instanceof CraftingJob ? 'danger' : job instanceof BasicJob ? 'info' : 'advanced';
        node.addClass("script_bg_" + settingKey + (settingsRaw.overrides[settingKey] ? " inactive-row" : ""))
            .append(addToggleCallbacks($(`
          <label tabindex="0" class="switch" style="margin-top:4px; margin-left:10px;">
            <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}>
            <span class="check" style="height:5px; max-width:15px"></span>
            <span class="has-text-${color}" style="margin-left: 20px;">${job._originalName}</span>
          </label>`), settingKey));
    }

    function buildJobSettingsInput(node, job, breakpoint) {
        if (job instanceof CraftingJob) {
            node.append(`<span>Managed</span>`);
        } else if (breakpoint === 3 && job.is.split) {
            node.append(`<span>Weighted</span>`);
        } else {
            addTableInput(node, `job_b${breakpoint}_${job._originalId}`);
        }
    }

    function buildWeightingSettings() {
        let sectionId = "weighting";
        let sectionName = "AutoBuild Weighting";

        let resetFunction = function() {
            resetWeightingSettings(true);
            updateSettingsFromState();
            updateWeightingSettingsContent();
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateWeightingSettingsContent);
    }

    function updateWeightingSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_weightingContent');
        currentNode.empty().off("*");

        addSettingsToggle(currentNode, "buildingBuildIfStorageFull", "Ignore weighting and build if any storage is full", "Ignore weighting and immediately construct building if it uses any capped resource, preventing wasting them by overflowing. Weight still need to be positive(above zero) for this to happen.");

        currentNode.append(`
          <table style="width:100%">
            <tr>
              <th class="has-text-warning" style="width:30%">Target</th>
              <th class="has-text-warning" style="width:60%">Condition</th>
              <th class="has-text-warning" style="width:10%">Multiplier</th>
            </tr>
            <tbody id="script_weightingTableBody"></tbody>
          </table>`);

        let tableBodyNode = $('#script_weightingTableBody');

        addWeightingRule(tableBodyNode, "Any", "New building", "buildingWeightingNew");
        addWeightingRule(tableBodyNode, "Powered building", "Low available energy", "buildingWeightingUnderpowered");
        addWeightingRule(tableBodyNode, "Power plant", "Low available energy", "buildingWeightingNeedfulPowerPlant");
        addWeightingRule(tableBodyNode, "Power plant", "Producing more energy than required", "buildingWeightingUselessPowerPlant");
        addWeightingRule(tableBodyNode, "Knowledge storage", "Have unlocked unafforable researches", "buildingWeightingNeedfulKnowledge");
        addWeightingRule(tableBodyNode, "Knowledge storage", "All unlocked researches already affordable", "buildingWeightingUselessKnowledge");
        addWeightingRule(tableBodyNode, "Building with state (city)", "Some instances of this building are not working", "buildingWeightingNonOperatingCity");
        addWeightingRule(tableBodyNode, "Building with state (space)", "Some instances of this building are not working", "buildingWeightingNonOperating");
        addWeightingRule(tableBodyNode, "Building with consumption", "Missing consumables to operate", "buildingWeightingMissingSupply");
        addWeightingRule(tableBodyNode, "Support consumer", "Missing support to operate", "buildingWeightingMissingSupport");
        addWeightingRule(tableBodyNode, "Support provider", "Provided support not currently needed", "buildingWeightingUselessSupport");
        addWeightingRule(tableBodyNode, "All fuel depots", "Missing Oil or Helium for techs and missions", "buildingWeightingMissingFuel");
        addWeightingRule(tableBodyNode, "Not housing, barrack, oil derrick, or knowledge building", "MAD prestige enabled, and affordable", "buildingWeightingMADUseless");
        addWeightingRule(tableBodyNode, "Mass Ejector", "Existed ejectors not fully utilized", "buildingWeightingUnusedEjectors");
        addWeightingRule(tableBodyNode, "Freight Yard, Container Port, Munitions Depot", "Have unused crates or containers", "buildingWeightingCrateUseless");
        addWeightingRule(tableBodyNode, "Horseshoes", "No more Horseshoes needed", "buildingWeightingHorseshoeUseless");
        addWeightingRule(tableBodyNode, "Meditation Chamber", "No more Meditation Space needed", "buildingWeightingZenUseless");
        addWeightingRule(tableBodyNode, "Gate Turret", "Gate demons fully supressed", "buildingWeightingGateTurret");
        addWeightingRule(tableBodyNode, "Warehouses, Garage, Cargo Yard, Storehouse", "Need more storage", "buildingWeightingNeedStorage");
        addWeightingRule(tableBodyNode, "Housing", "Less than 90% of houses are used", "buildingWeightingUselessHousing");
        addWeightingRule(tableBodyNode, "Orbital Decay", "City and Moon buildings", "buildingWeightingTemporal");
        addWeightingRule(tableBodyNode, "The True Path", "Solar buildings after reaching Tau Ceti", "buildingWeightingSolar");
        addWeightingRule(tableBodyNode, "Womlings Missions", "Womlings unlock actions conflicting with Overlord", "buildingWeightingOverlord");

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function addWeightingRule(table, targetName, conditionDesc, settingKey){
        let ruleNode = $(`
          <tr>
            <td style="width:30%"><span class="has-text-info">${targetName}</span></td>
            <td style="width:60%"><span class="has-text-info">${conditionDesc}</span></td>
            <td style="width:10%"></td>
          </tr>`);
        addTableInput(ruleNode.find('td:eq(2)'), settingKey);
        table.append(ruleNode);
    }

