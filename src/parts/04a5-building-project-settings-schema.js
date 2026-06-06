    function getBuildingProjectSettingsSchema() {
        const disabledAutoBuildBuildings = [
            "RedVrCenter",
            "NeutronCitadel",
            "PortalWarDroid",
            "BadlandsPredatorDrone",
            "PortalRepairDroid",
            "SpireWaygate",
            "TauRedContact",
            "TauRedIntroduce",
            "TauRedSubjugate",
            "TauGasName1",
            "TauGasName2",
            "TauGasName3",
            "TauGasName4",
            "TauGasName5",
            "TauGasName6",
            "TauGasName7",
            "TauGasName8",
            "TauGas2Name1",
            "TauGas2Name2",
            "TauGas2Name3",
            "TauGas2Name4",
            "TauGas2Name5",
            "TauGas2Name6",
            "TauGas2Name7",
            "TauGas2Name8",
        ];
        const buildingMaxDefaults = [
            {item: "ForgeHorseshoe", max: 20},
            {item: "RedForgeHorseshoe", max: 20},
            {item: "TauForgeHorseshoe", max: 20},
            {item: "BeltEleriumShip", max: 15},
            {item: "BeltIridiumShip", max: 15},
        ];
        const projectDefaults = [
            {item: "LaunchFacility", autoBuildEnabled: true, autoMax: -1, weighting: 100},
            {item: "SuperCollider", autoBuildEnabled: true, autoMax: -1, weighting: 5},
            {item: "StockExchange", autoBuildEnabled: true, autoMax: -1, weighting: 0.5},
            {item: "Monument", autoBuildEnabled: true, autoMax: -1, weighting: 1},
            {item: "Railway", autoBuildEnabled: true, autoMax: -1, weighting: 0.1},
            {item: "Nexus", autoBuildEnabled: true, autoMax: -1, weighting: 1},
            {item: "RoidEject", autoBuildEnabled: true, autoMax: -1, weighting: 1},
            {item: "ManaSyphon", autoBuildEnabled: false, autoMax: 79, weighting: 1},
            {item: "Depot", autoBuildEnabled: true, autoMax: -1, weighting: 1},
        ];
        const weightingRows = [
            {target: "Any", condition: "New building", setting: "buildingWeightingNew", defaultValue: 3},
            {target: "Powered building", condition: "Low available energy", setting: "buildingWeightingUnderpowered", defaultValue: 0.8},
            {target: "Power plant", condition: "Low available energy", setting: "buildingWeightingNeedfulPowerPlant", defaultValue: 3},
            {target: "Power plant", condition: "Producing more energy than required", setting: "buildingWeightingUselessPowerPlant", defaultValue: 0.01},
            {target: "Knowledge storage", condition: "Have unlocked unafforable researches", setting: "buildingWeightingNeedfulKnowledge", defaultValue: 5},
            {target: "Knowledge storage", condition: "All unlocked researches already affordable", setting: "buildingWeightingUselessKnowledge", defaultValue: 0.01},
            {target: "Building with state (city)", condition: "Some instances of this building are not working", setting: "buildingWeightingNonOperatingCity", defaultValue: 0.2},
            {target: "Building with state (space)", condition: "Some instances of this building are not working", setting: "buildingWeightingNonOperating", defaultValue: 0},
            {target: "Building with consumption", condition: "Missing consumables to operate", setting: "buildingWeightingMissingSupply", defaultValue: 0},
            {target: "Support consumer", condition: "Missing support to operate", setting: "buildingWeightingMissingSupport", defaultValue: 0},
            {target: "Support provider", condition: "Provided support not currently needed", setting: "buildingWeightingUselessSupport", defaultValue: 0.01},
            {target: "All fuel depots", condition: "Missing Oil or Helium for techs and missions", setting: "buildingWeightingMissingFuel", defaultValue: 10},
            {target: "Not housing, barrack, oil derrick, or knowledge building", condition: "MAD prestige enabled, and affordable", setting: "buildingWeightingMADUseless", defaultValue: 0},
            {target: "Mass Ejector", condition: "Existed ejectors not fully utilized", setting: "buildingWeightingUnusedEjectors", defaultValue: 0.1},
            {target: "Freight Yard, Container Port, Munitions Depot", condition: "Have unused crates or containers", setting: "buildingWeightingCrateUseless", defaultValue: 0.01},
            {target: "Horseshoes", condition: "No more Horseshoes needed", setting: "buildingWeightingHorseshoeUseless", defaultValue: 0.1},
            {target: "Meditation Chamber", condition: "No more Meditation Space needed", setting: "buildingWeightingZenUseless", defaultValue: 0.01},
            {target: "Gate Turret", condition: "Gate demons fully supressed", setting: "buildingWeightingGateTurret", defaultValue: 0.01},
            {target: "Warehouses, Garage, Cargo Yard, Storehouse", condition: "Need more storage", setting: "buildingWeightingNeedStorage", defaultValue: 1},
            {target: "Housing", condition: "Less than 90% of houses are used", setting: "buildingWeightingUselessHousing", defaultValue: 1},
            {target: "Orbital Decay", condition: "City and Moon buildings", setting: "buildingWeightingTemporal", defaultValue: 0.2},
            {target: "The True Path", condition: "Solar buildings after reaching Tau Ceti", setting: "buildingWeightingSolar", defaultValue: 0.2},
            {target: "Womlings Missions", condition: "Womlings unlock actions conflicting with Overlord", setting: "buildingWeightingOverlord", defaultValue: 0},
        ];

        return {
            weighting: {
                defaults: {
                    buildingBuildIfStorageFull: false,
                },
                defaultGroups: [
                    {
                        rows: () => weightingRows,
                        settings: [
                            {key: row => row.setting, value: row => row.defaultValue},
                        ],
                    },
                ],
                tables: {
                    weighting: {
                        bodyId: "script_weightingTableBody",
                        rows: () => weightingRows,
                        columns: [
                            {header: "Target", width: "30%", color: "has-text-warning", render: (cell, row) => cell.append(`<span class="has-text-info">${row.target}</span>`)},
                            {header: "Condition", width: "60%", color: "has-text-warning", render: (cell, row) => cell.append(`<span class="has-text-info">${row.condition}</span>`)},
                            {header: "Multiplier", width: "10%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, row.setting)},
                        ],
                    },
                },
            },
            building: {
                defaults: {
                    autoBuild: false,
                    autoPower: false,
                    buildingsIgnoreZeroRate: false,
                    buildingsLimitPowered: true,
                    buildingTowerSuppression: 100,
                    buildingConsumptionCheck: "perResource",
                    buildingsTransportGem: false,
                    buildingsBestFreighter: false,
                    buildingsUseMultiClick: false,
                    buildingEnabledAll: true,
                    buildingStateAll: true,
                },
                defaultGroups: [
                    {
                        rows: () => BuildingManager.priorityList,
                        settings: [
                            {key: row => "bat" + row._vueBinding, value: true},
                            {key: (row, index) => "bld_p_" + row._vueBinding, value: (row, index) => index},
                            {key: row => "bld_m_" + row._vueBinding, value: -1},
                            {key: row => "bld_w_" + row._vueBinding, value: 100},
                            {key: row => "bld_s_" + row._vueBinding, value: true, when: row => row.isSwitchable()},
                            {key: row => "bld_s2_" + row._vueBinding, value: true, when: row => row.is.smart},
                        ],
                    },
                ],
                afterDefaults: def => {
                    def["bld_s2_space-iridium_mine"] = false;
                    def["bld_s2_space-helium_mine"] = false;

                    disabledAutoBuildBuildings.forEach(item => def["bat" + buildings[item]._vueBinding] = false);
                    buildingMaxDefaults.forEach(row => def["bld_m_" + buildings[row.item]._vueBinding] = row.max);
                },
                tables: {
                    building: {
                        bodyId: "script_buildingTableBody",
                        rows: () => [{id: "All"}, ...BuildingManager.priorityList],
                        rowValue: row => row.id ?? row._vueBinding,
                        rowClass: row => row.id === "All" ? "unsortable" : "script-draggable",
                        headerHtml: `
            <tr>
              <th class="has-text-warning" style="width:35%">Building</th>
              <th class="has-text-warning" style="width:15%" title="Enables auto building. Triggers ignores this option, allowing to build disabled things.">Auto Build</th>
              <th class="has-text-warning" style="width:15%" title="Maximum amount of buildings to build. Triggers ignores this option, allowing to build above limit. Can be also used to limit amount of enabled buildings, with respective option above.">Max Build</th>
              <th class="has-text-warning" style="width:15%" title="Script will try to spend 2x amount of resources on building having 2x weighting, and such.">Weighting</th>
              <th class="has-text-warning" style="width:20%" title="First toggle enables basic automation based on priority, power, support, and consumption. Second enables logic made specially for particlular building, their effects are different, but generally it tries to behave smarter than just staying enabled all the time.">Auto Power</th>
            </tr>`,
                        columns: [
                            {width: "35%", render: (cell, row) => {
                                if (row.id === "All") {
                                    cell.attr("id", "script_bldallToggle");
                                    cell.append('<span class="has-text-warning" style="margin-left: 20px;">All Buildings</span>');
                                    return;
                                }

                                cell.attr("id", "script_" + row._vueBinding);
                                cell.append(buildTableLabel(row.name, "", buildingSettingsColor(row)));
                            }},
                            {width: "15%", render: (cell, row) => row.id === "All" ? cell.append(buildAllBuildingEnabledSettingsToggle()) : addTableToggle(cell, "bat" + row._vueBinding)},
                            {width: "15%", render: (cell, row) => {
                                if (row.id !== "All") {
                                    addTableInput(cell, "bld_m_" + row._vueBinding);
                                }
                            }},
                            {width: "15%", render: (cell, row) => {
                                if (row.id !== "All") {
                                    addTableInput(cell, "bld_w_" + row._vueBinding);
                                }
                            }},
                            {width: "20%", render: (cell, row) => {
                                if (row.id === "All") {
                                    cell.append('<span id="script_resetBuildingsPriority" class="script-refresh"></span>');
                                    cell.append(buildAllBuildingStateSettingsToggle());
                                    return;
                                }

                                buildBuildingStateSettingsToggle(cell, row);
                            }},
                        ],
                        afterRender: tableBodyNode => {
                            $("#script_resetBuildingsPriority").on("click", function(){
                                if (confirm("Are you sure you wish to reset buildings priority?")) {
                                    initBuildingState();
                                    for (let i = 0; i < BuildingManager.priorityList.length; i++) {
                                        let id = BuildingManager.priorityList[i]._vueBinding;
                                        settingsRaw["bld_p_" + id] = i;
                                    }
                                    updateSettingsFromState();
                                    updateBuildingSettingsContent();
                                }
                            });

                            tableBodyNode.sortable({
                                items: "tr:not(.unsortable)",
                                helper: sorterHelper,
                                update: function() {
                                    let buildingElements = tableBodyNode.sortable("toArray", {attribute: "value"});
                                    for (let i = 0; i < buildingElements.length; i++) {
                                        settingsRaw["bld_p_" + buildingElements[i]] = i;
                                    }

                                    BuildingManager.sortByPriority();
                                    updateSettingsFromState();
                                },
                            });
                        },
                    },
                },
            },
            project: {
                defaults: {
                    autoARPA: false,
                    arpaScaleWeighting: true,
                    arpaStep: 5,
                },
                priorityRows: () => Object.values(projects),
                defaultGroups: [
                    {
                        rows: () => projectDefaults,
                        settings: [
                            {key: row => "arpa_" + projects[row.item].id, value: row => row.autoBuildEnabled},
                            {key: (row, index) => "arpa_p_" + projects[row.item].id, value: (row, index) => index},
                            {key: row => "arpa_m_" + projects[row.item].id, value: row => row.autoMax},
                            {key: row => "arpa_w_" + projects[row.item].id, value: row => row.weighting},
                        ],
                    },
                ],
                tables: {
                    project: {
                        bodyId: "script_projectTableBody",
                        rows: () => ProjectManager.priorityList,
                        rowId: row => row.id,
                        rowValue: row => row.id,
                        rowClass: () => "script-draggable",
                        columns: [
                            {header: "Project", width: "25%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.name))},
                            {header: "Auto Build", width: "25%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "arpa_" + row.id)},
                            {header: "Max Build", width: "25%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "arpa_m_" + row.id)},
                            {header: "Weighting", width: "25%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "arpa_w_" + row.id)},
                        ],
                        afterRender: tableBodyNode => tableBodyNode.sortable({
                            items: "tr:not(.unsortable)",
                            helper: sorterHelper,
                            update: function() {
                                let projectIds = tableBodyNode.sortable("toArray", {attribute: "value"});
                                for (let i = 0; i < projectIds.length; i++) {
                                    settingsRaw["arpa_p_" + projectIds[i]] = i;
                                }

                                ProjectManager.sortByPriority();
                                updateSettingsFromState();
                            },
                        }),
                    },
                },
            },
        };
    }

    function buildingSettingsColor(building) {
        return (building._tab === "space" || building._tab === "starDock") ? "has-text-danger" :
               (building._tab === "galaxy" || building._tab === "eden") ? "has-text-advanced" :
               building._tab === "interstellar" ? "has-text-special" :
               (building._tab === "portal" || building._tab === "tauceti") ? "has-text-warning" :
               "has-text-info";
    }
