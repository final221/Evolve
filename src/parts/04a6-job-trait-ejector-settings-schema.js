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
