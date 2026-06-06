    function getWarHellFleetSettingsSchema() {
        const andromedaPriorityDefaults = [
            {id: "gxy_stargate", priority: 0},
            {id: "gxy_alien2", priority: 1},
            {id: "gxy_alien1", priority: 2},
            {id: "gxy_chthonian", priority: 3},
            {id: "gxy_gateway", priority: 4},
            {id: "gxy_gorddon", priority: 5},
        ];
        const outerRegionDefaults = [
            {id: "spc_moon", weighting: 1, defend: 0.9, scouts: 0},
            {id: "spc_red", weighting: 3, defend: 0.9, scouts: 0},
            {id: "spc_gas", weighting: 0, defend: 0.9, scouts: 0},
            {id: "spc_gas_moon", weighting: 0, defend: 0.9, scouts: 0},
            {id: "spc_belt", weighting: 1, defend: 0.9, scouts: 0},
            {id: "spc_titan", weighting: 5, defend: 0.9, scouts: 1},
            {id: "spc_enceladus", weighting: 3, defend: 0.9, scouts: 1},
            {id: "spc_triton", weighting: 10, defend: 0.95, scouts: 2},
            {id: "spc_kuiper", weighting: 5, defend: 0.9, scouts: 2},
            {id: "spc_eris", weighting: 100, defend: 0.01, scouts: 1},
        ];

        return {
            fleet: {
                defaults: {
                    autoFleet: false,
                    fleetOuterCrew: 30,
                    fleetOuterShips: "custom",
                    fleetExploreTau: true,
                    fleetMaxCover: true,
                    fleetEmbassyKnowledge: 6000000,
                    fleetAlienGiftKnowledge: 6500000,
                    fleetAlien2Knowledge: 8000000,
                    fleetAlien2Loses: "none",
                    fleetChthonianLoses: "low",

                    fleet_outer_class: "destroyer",
                    fleet_outer_armor: "neutronium",
                    fleet_outer_weapon: "plasma",
                    fleet_outer_engine: "ion",
                    fleet_outer_power: "fission",
                    fleet_outer_sensor: "lidar",

                    fleet_scout_class: "corvette",
                    fleet_scout_armor: "neutronium",
                    fleet_scout_weapon: "plasma",
                    fleet_scout_engine: "tie",
                    fleet_scout_power: "fusion",
                    fleet_scout_sensor: "quantum",
                },
                defaultGroups: [
                    {
                        rows: () => andromedaPriorityDefaults,
                        settings: [
                            {key: row => "fleet_pr_" + row.id, value: row => row.priority},
                        ],
                    },
                    {
                        rows: () => outerRegionDefaults,
                        settings: [
                            {key: row => "fleet_outer_pr_" + row.id, value: row => row.weighting},
                            {key: row => "fleet_outer_def_" + row.id, value: row => row.defend},
                            {key: row => "fleet_outer_sc_" + row.id, value: row => row.scouts},
                        ],
                    },
                ],
                tables: {
                    andromeda: secondaryPrefix => ({
                        bodyId: `script_${secondaryPrefix}fleetTableBody`,
                        rows: () => galaxyRegions.slice().sort((a, b) => settingsRaw["fleet_pr_" + a] - settingsRaw["fleet_pr_" + b]),
                        rowValue: row => row,
                        rowClass: row => "script-draggable script_bg_fleet_pr_" + row,
                        columns: [
                            {header: "Region", width: "95%", color: "has-text-warning", render: (cell, row) => {
                                const settingName = "fleet_pr_" + row;
                                let nameRef = row === "gxy_alien1" ? "Alien 1 System"
                                            : row === "gxy_alien2" ? "Alien 2 System"
                                            : game.actions.galaxy[row].info.name;
                                cell.append(buildTableLabel(typeof nameRef === "function" ? nameRef() : nameRef));
                                cell.parent()
                                    .toggleClass("inactive-row", Boolean(settingsRaw.overrides[settingName]))
                                    .on("click", {label: `Andromeda region priority (${settingName})`, name: settingName, type: "number"}, openOverrideModal);
                            }},
                            {header: "", width: "5%", render: cell => cell.append('<span class="script-lastcolumn"></span>')},
                        ],
                        afterRender: tableBodyNode => tableBodyNode.sortable({
                            items: "tr:not(.unsortable)",
                            helper: sorterHelper,
                            update: function() {
                                let regionIds = tableBodyNode.sortable("toArray", {attribute: "value"});
                                for (let i = 0; i < regionIds.length; i++) {
                                    settingsRaw["fleet_pr_" + regionIds[i]] = i;
                                }

                                updateSettingsFromState();
                                if (settings.showSettings && secondaryPrefix) {
                                    updateFleetSettingsContent("");
                                }
                            },
                        }),
                    }),
                    outer: secondaryPrefix => ({
                        bodyId: `script_${secondaryPrefix}fleetOuterTable`,
                        rows: () => FleetManagerOuter.Regions,
                        rowId: row => row,
                        columns: [
                            {header: "Region", width: "35%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(outerFleetRegionLabel(row)))},
                            {header: "Weighting", width: "20%", color: "has-text-warning", title: "Weighting determines order of ships dispatching, regions with higher weighting will be get ships sooner", render: (cell, row) => addTableInput(cell, "fleet_outer_pr_" + row)},
                            {header: "Defend", width: "20%", color: "has-text-warning", title: "Desired protection from syndicate, trying to reach 100%(1.0) defense with full uptime might be wasteful due to excesses and fluctuations", render: (cell, row) => addTableInput(cell, "fleet_outer_def_" + row)},
                            {header: "Scouts", width: "20%", color: "has-text-warning", title: "Amounts of scouts to dispatch", render: (cell, row) => addTableInput(cell, "fleet_outer_sc_" + row)},
                            {header: "", width: "5%"},
                        ],
                    }),
                },
            },
        };
    }

    function outerFleetRegionLabel(regionId) {
        let nameRef = game.actions.space[regionId].info.name;
        let gameName = typeof nameRef === "function" ? nameRef() : nameRef;
        let label = regionId.split("_").slice(1)
          .map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(" ");
        return label === gameName ? label : `${label} (${gameName})`;
    }
