    function buildTriggerSettings() {
        let sectionId = "trigger";
        let sectionName = "Trigger";

        let resetFunction = function() {
            resetTriggerSettings(true);
            updateSettingsFromState();
            updateTriggerSettingsContent();

            resetCheckbox("autoTrigger");
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateTriggerSettingsContent);
    }

    function updateTriggerSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_triggerContent');
        currentNode.empty().off("*");

        currentNode.append('<div style="margin-top: 10px;"><button id="script_trigger_add" class="button">Add New Trigger</button></div>');
        $("#script_trigger_add").on("click", addTriggerSetting);

        currentNode.append(`
          <table style="width:100%">
            <tr>
              <th class="has-text-warning" colspan="3">Requirement</th>
              <th class="has-text-warning" colspan="5">Action</th>
            </tr>
            <tr>
              <th class="has-text-warning" style="width:16%">Type</th>
              <th class="has-text-warning" style="width:18%">Value</th>
              <th class="has-text-warning" style="width:6%" title="Numerical variables compared to this value using '>=', boolean variables - using '=='. String variables not currently supported by triggers.">Result</th>
              <th class="has-text-warning" style="width:16%">Type</th>
              <th class="has-text-warning" style="width:18%">Id</th>
              <th class="has-text-warning" style="width:6%">Count</th>
              <th style="width:20%"></th>
            </tr>
            <tbody id="script_triggerTableBody"></tbody>
          </table>`);

        let tableBodyNode = $('#script_triggerTableBody');
        let newTableBodyText = "";

        for (let i = 0; i < TriggerManager.priorityList.length; i++) {
            const trigger = TriggerManager.priorityList[i];
            newTableBodyText += `
            <tr id="script_trigger_${trigger.seq}" value="${trigger.seq}" class="script-draggable">
              <td style="width:16%"></td>
              <td style="width:18%"></td>
              <td style="width:6%"></td>
              <td style="width:16%"></td>
              <td style="width:18%"></td>
              <td style="width:6%"></td>
              <td style="width:20%"></td>
            </tr>`;
        }
        tableBodyNode.append($(newTableBodyText));

        for (let i = 0; i < TriggerManager.priorityList.length; i++) {
            const trigger = TriggerManager.priorityList[i];

            buildTriggerRequirementType(trigger);
            buildTriggerRequirementId(trigger);
            buildTriggerRequirementCount(trigger);

            buildTriggerActionType(trigger);
            buildTriggerActionId(trigger);
            buildTriggerActionCount(trigger);

            buildTriggerSettingsColumn(trigger);
        }

        tableBodyNode.sortable({
            items: "tr:not(.unsortable)",
            helper: sorterHelper,
            update: function() {
                let triggerIds = tableBodyNode.sortable('toArray', {attribute: 'value'});
                for (let i = 0; i < triggerIds.length; i++) {
                    TriggerManager.getTrigger(parseInt(triggerIds[i])).priority = i;
                }

                TriggerManager.sortByPriority();
                updateSettingsFromState();
            },
        });

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

    function addTriggerSetting() {
        let trigger = TriggerManager.AddTrigger("Boolean", false, 1, "research", "tech-club", 0);
        updateSettingsFromState();

        let tableBodyNode = $('#script_triggerTableBody');
        let newTableBodyText = "";

        newTableBodyText += `
        <tr id="script_trigger_${trigger.seq}" value="${trigger.seq}" class="script-draggable">
          <td style="width:16%"></td>
          <td style="width:18%"></td>
          <td style="width:6%"></td>
          <td style="width:16%"></td>
          <td style="width:18%"></td>
          <td style="width:6%"></td>
          <td style="width:20%"></td>
        </tr>`;

        tableBodyNode.append($(newTableBodyText));

        buildTriggerRequirementType(trigger);
        buildTriggerRequirementId(trigger);
        buildTriggerRequirementCount(trigger);

        buildTriggerActionType(trigger);
        buildTriggerActionId(trigger);
        buildTriggerActionCount(trigger);

        buildTriggerSettingsColumn(trigger);
    }

    function buildTriggerRequirementType(trigger) {
        let triggerElement = $('#script_trigger_' + trigger.seq).children().eq(0);
        triggerElement.empty().off("*");

        // Requirement Type
        let types = Object.entries(checkTypes)
          .filter((c) => !overrideOnlyChecks.includes(c[0]) || trigger.requirementType === c[0])
          .map(([id, type]) => `<option value="${id}" title="${type.desc}">${id.replace(/([A-Z])/g, ' $1').trim()}</option>`).join();
        let typeSelectNode = $(`
          <select style="width: 100%">
            <option value = "chain" title = "This condition is met when above trigger is complete, always true for first trigger in list">Chain</option>
            ${types}
          </select>`);

        typeSelectNode.val(trigger.requirementType);

        triggerElement.append(typeSelectNode);

        typeSelectNode.on('change', function() {
            trigger.updateRequirementType(this.value);

            buildTriggerRequirementId(trigger);
            buildTriggerRequirementCount(trigger);

            updateSettingsFromState();
        });

        return;
    }

    function buildTriggerRequirementId(trigger) {
        let triggerElement = $('#script_trigger_' + trigger.seq).children().eq(1);
        triggerElement.empty().off("*");

        let check = checkTypes[trigger.requirementType];
        if (check) {
            triggerElement.append(buildInputNode(check.arg, check.options, trigger.requirementId, function(result){
                trigger.requirementId = result;
                trigger.complete = false;
                updateSettingsFromState();
            }));
        }
    }

    function buildTriggerRequirementCount(trigger) {
        let triggerElement = $('#script_trigger_' + trigger.seq).children().eq(2);
        triggerElement.empty().off("*");

        if (trigger.requirementType !== "Boolean" && checkTypes[trigger.requirementType]) {
            let retType = retBools.includes(trigger.requirementType) ? "boolean" : "number";
            triggerElement.append(buildInputNode(retType, null, trigger.requirementCount, function(result){
                trigger.requirementCount = Number(result);
                trigger.complete = false;
                updateSettingsFromState();
            }));
        }
    }

    function buildTriggerActionType(trigger) {
        let triggerElement = $('#script_trigger_' + trigger.seq).children().eq(3);
        triggerElement.empty().off("*");

        // Action Type
        let typeSelectNode = $(`
          <select style="width: 100%">
            <option value = "research" title = "Research technology">Research</option>
            <option value = "build" title = "Build buildings up to 'count' amount">Build</option>
            <option value = "arpa" title = "Build projects up to 'count' amount">A.R.P.A.</option>
          </select>`);
        typeSelectNode.val(trigger.actionType);

        triggerElement.append(typeSelectNode);

        typeSelectNode.on('change', function() {
            trigger.updateActionType(this.value);

            buildTriggerActionId(trigger);
            buildTriggerActionCount(trigger);

            updateSettingsFromState();
        });

        return;
    }

    function buildTriggerActionId(trigger) {
        let triggerElement = $('#script_trigger_' + trigger.seq).children().eq(4);
        triggerElement.empty().off("*");


        let argDef = trigger.actionType === "research" ? argType.research :
                     trigger.actionType === "build" ? argType.building :
                     trigger.actionType === "arpa" ? argType.project :
                     null;

        if (argDef) {
            triggerElement.append(buildInputNode(argDef.arg, argDef.options, trigger.actionId, function(result){
                trigger.actionId = result;
                trigger.complete = false;
                updateSettingsFromState();
            }));
        }
    }

    function buildTriggerActionCount(trigger) {
        let triggerElement = $('#script_trigger_' + trigger.seq).children().eq(5);
        triggerElement.empty().off("*");

        if (trigger.actionType === "build" || trigger.actionType === "arpa") {
            triggerElement.append(buildInputNode("number", null, trigger.actionCount, function(result){
                trigger.actionCount = Number(result);
                trigger.complete = false;
                updateSettingsFromState();
            }));
        }
    }

    function buildTriggerSettingsColumn(trigger) {
        let triggerElement = $('#script_trigger_' + trigger.seq).children().eq(6);
        triggerElement.empty().off("*");

        let deleteTriggerButton = $('<a class="button is-small" style="width: 26px; height: 26px"><span>X</span></a>');
        triggerElement.append(deleteTriggerButton);
        deleteTriggerButton.on('click', function() {
            TriggerManager.RemoveTrigger(trigger.seq);
            updateSettingsFromState();
            updateTriggerSettingsContent();
        });

        let duplicateTriggerButton = $('<a class="button is-small" style="width: 26px; height: 26px"><span>&#9282;</span></a>');
        triggerElement.append(duplicateTriggerButton);
        duplicateTriggerButton.on('click', function() {
            TriggerManager.DuplicateTrigger(trigger.seq);
            updateSettingsFromState();
            updateTriggerSettingsContent();
        });

        let evalizeTriggerButton = $('<a class="button is-small" style="width: 26px; height: 26px"><span>E</span></a>');
        triggerElement.append(evalizeTriggerButton);
        evalizeTriggerButton.on('click', function() {
            TriggerManager.EvalizeTrigger(trigger.seq);
        });
    }

    function buildActiveTargetsUI() {
        $("#buildQueue").before(`
            <div id="active_targets-wrapper" class="bldQueue vscroll right">
                <h2 class="has-text-success">Detailed Queue</h2>
                <div id="active_targets">
                    <div class="target-type-box triggers" style="display: none;">
                        <h2>Triggers</h2>
                        <ul class="active_targets-list triggers"></ul>
                    </div>
                    <div class="target-type-box buildings" style="display: none;">
                        <h2>Buildings</h2>
                        <ul class="active_targets-list buildings"></ul>
                    </div>
                    <div class="target-type-box research" style="display: none;">
                        <h2>Research</h2>
                        <ul class="active_targets-list research"></ul>
                    </div>
                    <div class="target-type-box arpa" style="display: none;">
                        <h2>A.R.P.A.</h2>
                        <ul class="active_targets-list arpa"></ul>
                    </div>
                </div>
            </div>`);

        // game assumes only message and build queue, and hardcodes heights accordingly. This overrides that to ensure scroll bars are added on message queue when active targets queue crowds it out
        if (typeof ResizeObserver === 'function') {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.borderBoxSize) {
                        const elementHeight = entry.borderBoxSize[0].blockSize;
                        const totalHeight = `${elementHeight + $(`#buildQueue`).outerHeight()}px`;

                        $("#msgQueue").css('max-height', `calc((100vh - ${totalHeight}) - 6rem)`);
                    }
                }
            });

            resizeObserver.observe($("#active_targets-wrapper")[0]);
        }
    }

    function removeActiveTargetsUI() {
        $("#active_targets-wrapper").remove();
    }

    function buildResearchSettings() {
        let sectionId = "research";
        let sectionName = "Research";

        let resetFunction = function() {
            resetResearchSettings(true);
            updateSettingsFromState();
            updateResearchSettingsContent();

            resetCheckbox("autoResearch");
        };

        buildSettingsSection(sectionId, sectionName, resetFunction, updateResearchSettingsContent);
    }

    function updateResearchSettingsContent() {
        let currentScrollPosition = document.documentElement.scrollTop || document.body.scrollTop;

        let currentNode = $('#script_researchContent');
        currentNode.empty().off("*");

        // Theology 1
        let theology1Options = [{val: "auto", label: "Script Managed", hint: "Picks Anthropology for MAD prestige, and Fanaticism for others. Achieve-worthy combos are exception, on such runs Fanaticism will be always picked."},
                                {val: "tech-anthropology", label: game.loc('tech_anthropology'), hint: game.loc('tech_anthropology_effect')},
                                {val: "tech-fanaticism", label: game.loc('tech_fanaticism'), hint: game.loc('tech_fanaticism_effect')}];
        addSettingsSelect(currentNode, "userResearchTheology_1", "Target Theology 1", "Theology 1 technology to research, have no effect after getting Transcendence perk", theology1Options);

        // Theology 2
        let theology2Options = [{val: "auto", label: "Script Managed", hint: "Picks Deify for Ascension, Demonic Infusion, Apotheosis, AI Apocalypse, Terraform, Matrix, Retirement and Eden prestiges, or Study for others prestiges"},
                                {val: "tech-study", label: game.loc('tech_study'), hint: game.loc('tech_study_desc')},
                                {val: "tech-deify", label: game.loc('tech_deify'), hint: game.loc('tech_deify_desc')}];
        addSettingsSelect(currentNode, "userResearchTheology_2", "Target Theology 2", "Theology 2 technology to research", theology2Options);

        addSettingsList(currentNode, "researchIgnore", "Ignored researches", "Listed researches won't be purchased without manual input, or user defined trigger. On top of this list script will also ignore some other special techs, such as Limit Collider, Dark Energy Bomb, Exotic Infusion, etc.", techIds);

        document.documentElement.scrollTop = document.body.scrollTop = currentScrollPosition;
    }

