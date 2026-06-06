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

        renderSettingsTable(currentNode, getJobTraitEjectorSettingsSchema().job.tables.job);

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

        renderSettingsTable(currentNode, getBuildingProjectSettingsSchema().weighting.tables.weighting);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }
