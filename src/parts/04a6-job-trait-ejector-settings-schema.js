    function getJobTraitEjectorSettingsSchema() {
        const jobBreakpoints = [
            {item: "Colonist", b1: -1, b2: -1, b3: -1},
            {item: "Teamster", b1: 10, b2: -1, b3: -1},
            {item: "Meditator", b1: -1, b2: -1, b3: -1},
            {item: "Hunter", b1: -1, b2: -1, b3: -1},
            {item: "Farmer", b1: -1, b2: -1, b3: -1},
            {item: "Forager", b1: 4, b2: 10, b3: 0},
            {item: "Lumberjack", b1: 4, b2: 10, b3: 0},
            {item: "QuarryWorker", b1: 4, b2: 10, b3: 0},
            {item: "CrystalMiner", b1: 2, b2: 5, b3: 0},
            {item: "Scavenger", b1: 0, b2: 0, b3: 0},
            {item: "TitanColonist", b1: -1, b2: -1, b3: -1},
            {item: "PitMiner", b1: 1, b2: 12, b3: -1},
            {item: "Miner", b1: 3, b2: 5, b3: -1},
            {item: "CoalMiner", b1: 2, b2: 4, b3: -1},
            {item: "CementWorker", b1: 4, b2: 8, b3: -1},
            {item: "Professor", b1: 6, b2: 10, b3: -1},
            {item: "Scientist", b1: 3, b2: 6, b3: -1},
            {item: "Entertainer", b1: 2, b2: 5, b3: -1},
            {item: "HellSurveyor", b1: 1, b2: 1, b3: -1},
            {item: "SpaceMiner", b1: 1, b2: 3, b3: -1},
            {item: "Torturer", b1: 1, b2: 1, b3: -1},
            {item: "Archaeologist", b1: 1, b2: 1, b3: -1},
            {item: "GhostTrapper", b1: 1, b2: 1, b3: -1},
            {item: "ElysiumMiner", b1: 1, b2: 1, b3: -1},
            {item: "Banker", b1: 3, b2: 5, b3: -1},
            {item: "Priest", b1: 0, b2: 0, b3: -1},
            {item: "Unemployed", b1: 0, b2: 0, b3: 0},
        ];

        const consumableResources = () => Object.values(resources)
            .filter(resource => EjectManager.isConsumable(resource) || SupplyManager.isConsumable(resource) || NaniteManager.isConsumable(resource));
        const minorTraitRows = () => Object.entries(game.traits)
            .filter(([id, trait]) => trait.type === "minor" || id === "mastery" || id === "fortify")
            .map(([id, trait]) => new MinorTrait(id));
        const mutableTraitRows = () => Object.entries(game.traits)
            .filter(([id, trait]) => (trait.type === "major" || trait.type === "genus") && !["xenophobic", "rigid", "soul_eater"].includes(id))
            .map(([id, trait]) => trait.type === "major" ? new MajorTrait(id) : new GenusTrait(id))
            .sort((a, b) => Object.keys(poly.genus_traits).indexOf(a.genus) - Object.keys(poly.genus_traits).indexOf(b.genus) || a.type < b.type);

        return {
            job: {
                defaults: {
                    autoJobs: false,
                    autoCraftsmen: false,
                    jobSetDefault: true,
                    jobManageServants: true,
                    jobLumberWeighting: 50,
                    jobQuarryWeighting: 50,
                    jobCrystalWeighting: 50,
                    jobScavengerWeighting: 5,
                    jobRaiderWeighting: 20,
                    jobForagerWeighting: 50,
                    jobDisableMiners: true,
                },
                priorityRows: () => Object.values(jobs),
                defaultGroups: [
                    {
                        rows: () => JobManager.priorityList,
                        settings: [
                            {key: row => "job_" + row._originalId, value: true},
                            {key: (row, index) => "job_p_" + row._originalId, value: (row, index) => index},
                            {key: row => "job_s_" + row._originalId, value: true, when: row => row.is.smart},
                        ],
                    },
                    {
                        rows: () => jobBreakpoints,
                        settings: [
                            {key: row => "job_b1_" + jobs[row.item]._originalId, value: row => row.b1},
                            {key: row => "job_b2_" + jobs[row.item]._originalId, value: row => row.b2},
                            {key: row => "job_b3_" + jobs[row.item]._originalId, value: row => row.b3},
                        ],
                    },
                ],
                tables: {
                    job: {
                        bodyId: "script_jobTableBody",
                        rows: () => JobManager.priorityList,
                        rowValue: row => row._originalId,
                        rowClass: () => "script-draggable",
                        headerHtml: `
            <tr>
              <th class="has-text-warning" style="width:35%">Job</th>
              <th class="has-text-warning" style="width:17%">1st Pass</th>
              <th class="has-text-warning" style="width:17%">2nd Pass</th>
              <th class="has-text-warning" style="width:17%">3rd Pass</th>
              <th class="has-text-warning" style="width:9%" title="When enabled script will limit amount of assigned workers down to maximum useful quantity, moving idling workers to other jobs">Smart</th>
              <td style="width:5%"><span id="script_resetJobsPriority" class="script-refresh"></span></td>
            </tr>`,
                        columns: [
                            {width: "35%", render: (cell, row) => {
                                cell.attr("id", "script_" + row._originalId);
                                buildJobSettingsToggle(cell, row);
                            }},
                            {width: "17%", render: (cell, row) => buildJobSettingsInput(cell, row, 1)},
                            {width: "17%", render: (cell, row) => buildJobSettingsInput(cell, row, 2)},
                            {width: "17%", render: (cell, row) => buildJobSettingsInput(cell, row, 3)},
                            {width: "9%", render: (cell, row) => {
                                if (row.is.smart) {
                                    addTableToggle(cell, "job_s_" + row._originalId);
                                }
                            }},
                            {width: "5%", render: cell => cell.append($('<span class="script-lastcolumn"></span>'))},
                        ],
                        afterRender: tableBodyNode => {
                            $("#script_resetJobsPriority").on("click", function(){
                                if (confirm("Are you sure you wish to reset jobs priority?")) {
                                    JobManager.priorityList = Object.values(jobs);
                                    for (let i = 0; i < JobManager.priorityList.length; i++) {
                                        let id = JobManager.priorityList[i]._originalId;
                                        settingsRaw["job_p_" + id] = i;
                                    }
                                    updateSettingsFromState();
                                    updateJobSettingsContent();
                                }
                            });

                            tableBodyNode.sortable({
                                items: "tr:not(.unsortable)",
                                helper: sorterHelper,
                                update: function() {
                                    let sortedIds = tableBodyNode.sortable("toArray", {attribute: "value"});
                                    for (let i = 0; i < sortedIds.length; i++) {
                                        settingsRaw["job_p_" + sortedIds[i]] = i;
                                    }

                                    JobManager.sortByPriority();
                                    updateSettingsFromState();
                                },
                            });
                        },
                    },
                },
            },
            trait: {
                minor: {
                    defaults: {
                        autoMinorTrait: false,
                        shifterGenus: "ignore",
                        imitateRace: "ignore",
                        buildingShrineType: "know",
                        slaveIncome: 25000,
                        jobScalePop: true,
                        psychicPower: "auto",
                        psychicBoostRes: "auto",
                        wishMinor: "none",
                        wishMajor: "none",

                        autoGenetics: false,
                        geneticsSequence: "none",
                        geneticsBoost: "none",
                        geneticsAssemble: "auto",
                    },
                    priorityRows: minorTraitRows,
                    defaultGroups: [
                        {
                            rows: () => MinorTraitManager.priorityList,
                            settings: [
                                {key: row => "mTrait_" + row.traitName, value: true},
                                {key: (row, index) => "mTrait_p_" + row.traitName, value: (row, index) => index},
                                {key: row => "mTrait_w_" + row.traitName, value: 1},
                            ],
                        },
                        {
                            rows: () => Object.values(ocularPowerData),
                            settings: [
                                {key: row => "ocularPower_" + row.id, value: true},
                                {key: row => "ocularPower_p_" + row.id, value: 100},
                            ],
                        },
                    ],
                    tables: {
                        ocular: {
                            bodyId: "script_ocularPowersTableBody",
                            rows: () => Object.values(ocularPowerData),
                            rowId: row => row.id,
                            columns: [
                                {header: "Name", width: "50%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(game.loc(`ocular_${row.id}`), game.loc(`ocular_${row.id}_desc`, row.locParam)))},
                                {header: "Enabled", width: "25%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "ocularPower_" + row.id)},
                                {header: "Priority", width: "25%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "ocularPower_p_" + row.id)},
                            ],
                        },
                        minor: {
                            bodyId: "script_minorTraitTableBody",
                            rows: () => MinorTraitManager.priorityList,
                            rowValue: row => row.traitName,
                            rowClass: () => "script-draggable",
                            columns: [
                                {header: "Minor Trait", width: "20%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(game.loc("trait_" + row.traitName + "_name"), game.loc("trait_" + row.traitName)))},
                                {header: "Enabled", width: "20%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "mTrait_" + row.traitName)},
                                {header: "Weighting", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "mTrait_w_" + row.traitName)},
                                {header: "", width: "40%", render: cell => cell.append('<span class="script-lastcolumn"></span>')},
                            ],
                            afterRender: tableBodyNode => tableBodyNode.sortable({
                                items: "tr:not(.unsortable)",
                                helper: sorterHelper,
                                update: function() {
                                    let minorTraitNames = tableBodyNode.sortable("toArray", {attribute: "value"});
                                    for (let i = 0; i < minorTraitNames.length; i++) {
                                        settingsRaw["mTrait_p_" + minorTraitNames[i]] = i;
                                    }

                                    MinorTraitManager.sortByPriority();
                                    updateSettingsFromState();
                                },
                            }),
                        },
                    },
                },
                mutable: {
                    defaults: {
                        autoMutateTraits: false,
                        doNotGoBelowPlasmidSoftcap: true,
                        minimumPlasmidsToPreserve: 0,
                    },
                    priorityRows: mutableTraitRows,
                    defaultGroups: [
                        {
                            rows: () => MutableTraitManager.priorityList,
                            settings: [
                                {key: (row, index) => "mutableTrait_p_" + row.traitName, value: (row, index) => index},
                                {key: row => "mutableTrait_purge_" + row.traitName, value: false},
                                {key: row => "mutableTrait_gain_" + row.traitName, value: false, when: row => row.isGainable()},
                                {key: row => "mutableTrait_reset_" + row.traitName, value: false, when: row => poly.neg_roll_traits.includes(row.traitName)},
                            ],
                        },
                    ],
                    tables: {
                        mutable: {
                            bodyId: "script_mutateTraitTableBody",
                            rows: () => MutableTraitManager.priorityList,
                            rowValue: row => row.traitName,
                            rowClass: () => "script-draggable",
                            headerHtml: `
        <tr>
            <th class="has-text-warning" style="width:30%">Species / Genus</th>
            <th class="has-text-warning" style="width:25%">Trait</th>
            <th class="has-text-warning" style="width:10%">Cost</th>
            <th class="has-text-warning" style="width:10%">Add</th>
            <th class="has-text-warning" style="width:10%">Remove</th>
            <th class="has-text-warning" style="width:10%">Reset</th>
            <th class="has-text-warning" style="width:5%"></th>
        </tr>`,
                            columns: [
                                {width: "30%", render: (cell, row) => cell.append(buildTableLabel(row.source === "" ? "-" : game.loc((row.type === "major" ? "race_" : "genelab_genus_") + row.source), row.type === "major" ? "Major" : "Genus", row.type === "genus" ? "has-text-special" : "has-text"))},
                                {width: "25%", render: (cell, row) => cell.append(buildTableLabel(row.name, game.loc("trait_" + row.traitName), row.isPositive ? "has-text-success" : "has-text-danger"))},
                                {width: "10%", render: (cell, row) => cell.append(buildTableLabel(`${row.baseCost * 5}`, `${row.baseCost * 5 * mutationCostMultipliers["custom"]["gain"]} for Custom${row.traitName !== "ooze" ? " and Sludge" : ""}`))},
                                {width: "10%", render: (cell, row) => {
                                    if (row.isGainable()) {
                                        addTableToggle(cell, "mutableTrait_gain_" + row.traitName);
                                    }
                                }},
                                {width: "10%", render: (cell, row) => {
                                    addTableToggle(cell, "mutableTrait_purge_" + row.traitName);
                                    if (row.isGainable()) {
                                        makeToggleSwitchesMutuallyExclusive($(".script_mutableTrait_gain_" + row.traitName), "mutableTrait_gain_" + row.traitName, $(".script_mutableTrait_purge_" + row.traitName), "mutableTrait_purge_" + row.traitName);
                                    }
                                }},
                                {width: "10%", render: (cell, row) => {
                                    if (poly.neg_roll_traits.includes(row.traitName)) {
                                        addTableToggle(cell, "mutableTrait_reset_" + row.traitName);
                                    }
                                }},
                                {width: "5%", render: cell => cell.append('<span class="script-lastcolumn"></span>')},
                            ],
                            afterRender: tableBodyNode => tableBodyNode.sortable({
                                items: "tr:not(.unsortable)",
                                helper: sorterHelper,
                                update: function() {
                                    let mutableTraitNames = tableBodyNode.sortable("toArray", {attribute: "value"});
                                    for (let i = 0; i < mutableTraitNames.length; i++) {
                                        settingsRaw["mutableTrait_p_" + mutableTraitNames[i]] = i;
                                    }

                                    MutableTraitManager.sortByPriority();
                                    updateSettingsFromState();
                                },
                            }),
                        },
                    },
                },
            },
            ejector: {
                defaults: {
                    autoEject: false,
                    autoSupply: false,
                    autoNanite: false,
                    ejectMode: "cap",
                    supplyMode: "mixed",
                    naniteMode: "full",
                    prestigeWhiteholeStabiliseMass: true,
                    prestigeWhiteholeStabiliseCooldown: 120,
                },
                preparePriorityRows: () => {
                    if (game.global.race.universe === "magic") {
                        EjectManager.priorityList = Object.values(resources)
                          .filter(r => EjectManager.isConsumable(r))
                          .sort((a, b) => b.atomicMass - a.atomicMass);
                    } else {
                        EjectManager.priorityList = Object.values(resources)
                          .filter(r => EjectManager.isConsumable(r) && r !== resources.Elerium && r !== resources.Infernite)
                          .sort((a, b) => b.atomicMass - a.atomicMass);
                        EjectManager.priorityList.unshift(resources.Infernite);
                        EjectManager.priorityList.unshift(resources.Elerium);
                    }

                    SupplyManager.priorityList = Object.values(resources)
                      .filter(r => SupplyManager.isConsumable(r))
                      .sort((a, b) => SupplyManager.supplyIn(b.id) - SupplyManager.supplyIn(a.id));

                    NaniteManager.priorityList = Object.values(resources)
                      .filter(r => NaniteManager.isConsumable(r))
                      .sort((a, b) => b.atomicMass - a.atomicMass);
                },
                defaultGroups: [
                    {
                        rows: () => EjectManager.priorityList,
                        settings: [
                            {key: row => "res_eject" + row.id, value: row => row.is.tradable ?? false},
                        ],
                    },
                    {
                        rows: () => SupplyManager.priorityList,
                        settings: [
                            {key: row => "res_supply" + row.id, value: row => row.is.tradable ?? false},
                        ],
                    },
                    {
                        rows: () => NaniteManager.priorityList,
                        settings: [
                            {key: row => "res_nanite" + row.id, value: row => row.is.tradable ?? false},
                        ],
                    },
                ],
                afterDefaults: def => {
                    def["res_eject" + resources.Elerium.id] = true;
                    def["res_eject" + resources.Infernite.id] = true;
                },
                tables: {
                    ejector: {
                        bodyId: "script_ejectorTableBody",
                        rows: consumableResources,
                        rowId: row => row.id,
                        columns: [
                            {header: "Resource", width: "20%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.name, "", ejectorResourceColor(row)))},
                            {header: "Atomic Mass", width: "20%", color: "has-text-warning", render: (cell, row) => {
                                if (row.atomicMass > 0) {
                                    cell.append(`<span class="mass"><span class="has-text-warning">${row.atomicMass}</span> kt</span>`);
                                }
                            }},
                            {header: "Eject", width: "10%", color: "has-text-warning", render: (cell, row) => {
                                if (EjectManager.isConsumable(row)) {
                                    addTableToggle(cell, "res_eject" + row.id);
                                }
                            }},
                            {header: "Nanite", width: "10%", color: "has-text-warning", render: (cell, row) => {
                                if (NaniteManager.isConsumable(row)) {
                                    addTableToggle(cell, "res_nanite" + row.id);
                                }
                            }},
                            {header: "Supply Value", width: "30%", color: "has-text-warning", render: (cell, row) => {
                                if (SupplyManager.isConsumable(row)) {
                                    cell.append(`<span class="mass">Export <span class="has-text-caution">${SupplyManager.supplyOut(row.id)}</span>, Gain <span class="has-text-success">${SupplyManager.supplyIn(row.id)}</span></span>`);
                                }
                            }},
                            {header: "Supply", width: "10%", color: "has-text-warning", render: (cell, row) => {
                                if (SupplyManager.isConsumable(row)) {
                                    addTableToggle(cell, "res_supply" + row.id);
                                }
                            }},
                        ],
                    },
                },
            },
        };
    }

    function ejectorResourceColor(resource) {
        return (resource === resources.Elerium || resource === resources.Infernite) ? "has-text-caution" :
               resource.isCraftable() ? "has-text-danger" :
               !resource.is.tradable ? "has-text-advanced" :
               "has-text-info";
    }
