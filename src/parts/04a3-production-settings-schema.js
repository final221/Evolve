    function getProductionSettingsSchema() {
        const foundryDefaults = [
            {item: "Plywood", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 1, craftPreserve: 0},
            {item: "Brick", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 1, craftPreserve: 0},
            {item: "Wrought_Iron", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 1, craftPreserve: 0},
            {item: "Sheet_Metal", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 2, craftPreserve: 0},
            {item: "Mythril", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 3, craftPreserve: 0},
            {item: "Aerogel", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 3, craftPreserve: 0},
            {item: "Nanoweave", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 10, craftPreserve: 0},
            {item: "Scarletite", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 1, craftPreserve: 0},
            {item: "Quantium", autoCraftEnabled: true, crafterEnabled: true, craftWeighting: 1, craftPreserve: 0},
        ];
        const factoryDefaults = [
            {item: "LuxuryGoods", enabled: true, weighting: 1, priority: 2},
            {item: "Furs", enabled: true, weighting: 1, priority: 1},
            {item: "Alloy", enabled: true, weighting: 1, priority: 3},
            {item: "Polymer", enabled: true, weighting: 1, priority: 3},
            {item: "NanoTube", enabled: true, weighting: 4, priority: 3},
            {item: "Stanene", enabled: true, weighting: 4, priority: 3},
        ];
        const droidDefaults = [
            {item: "Adamantite", weighting: 15, priority: 1},
            {item: "Aluminium", weighting: 1, priority: 1},
            {item: "Uranium", weighting: 5, priority: -1},
            {item: "Coal", weighting: 5, priority: -1},
        ];

        return {
            defaults: {
                autoQuarry: false,
                autoMine: false,
                autoExtractor: false,
                autoGraphenePlant: false,
                autoSmelter: false,
                autoCraft: false,
                autoFactory: false,
                autoMiningDroid: false,
                autoReplicator: false,
                productionChrysotileWeight: 2,
                productionAdamantiteWeight: 1,
                productionExtWeight_common: 1,
                productionExtWeight_uncommon: 1,
                productionExtWeight_rare: 1,
                productionFoundryWeighting: "demanded",
                productionCraftsmen: "nocraft",
                productionSmelting: "required",
                productionSmeltingIridium: 0.5,
                productionFactoryWeighting: "none",
                productionFactoryMinIngredients: 0,
                productionFactoryFocusMaterials: false,
                replicatorAssignGovernorTask: true,
                replicatorWeightingMode: "mass",
            },
            defaultGroups: [
                {
                    rows: () => foundryDefaults,
                    settings: [
                        {key: row => "craft" + resources[row.item].id, value: row => row.autoCraftEnabled},
                        {key: row => "job_" + resources[row.item].id, value: row => row.crafterEnabled},
                        {key: row => "foundry_w_" + resources[row.item].id, value: row => row.craftWeighting},
                        {key: row => "foundry_p_" + resources[row.item].id, value: row => row.craftPreserve},
                    ],
                },
                {
                    rows: () => Object.values(SmelterManager.Fuels).map((fuel, index) => ({fuel, index})),
                    settings: [
                        {key: row => "smelter_fuel_p_" + row.fuel.id, value: row => row.index},
                    ],
                },
                {
                    rows: () => factoryDefaults,
                    settings: [
                        {key: row => "production_" + FactoryManager.Productions[row.item].resource.id, value: row => row.enabled},
                        {key: row => "production_w_" + FactoryManager.Productions[row.item].resource.id, value: row => row.weighting},
                        {key: row => "production_p_" + FactoryManager.Productions[row.item].resource.id, value: row => row.priority},
                    ],
                },
                {
                    rows: () => droidDefaults,
                    settings: [
                        {key: row => "droid_w_" + DroidManager.Productions[row.item].resource.id, value: row => row.weighting},
                        {key: row => "droid_pr_" + DroidManager.Productions[row.item].resource.id, value: row => row.priority},
                    ],
                },
                {
                    rows: () => Object.values(ReplicatorManager.Productions),
                    settings: [
                        {key: row => "replicator_" + row.id, value: true},
                        {key: row => "replicator_w_" + row.id, value: 1},
                        {key: row => "replicator_p_" + row.id, value: 1},
                    ],
                },
            ],
            tables: {
                smelter: {
                    bodyId: "script_productionTableBodySmelter",
                    rows: () => SmelterManager.managedFuelPriorityList(),
                    rowValue: row => row.id,
                    rowClass: () => "script-draggable",
                    columns: [
                        {header: "Fuel", width: "95%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.id))},
                        {header: "", width: "5%", render: cell => cell.append('<span class="script-lastcolumn"></span>')},
                    ],
                    afterRender: tableBodyNode => tableBodyNode.sortable({
                        items: "tr:not(.unsortable)",
                        helper: sorterHelper,
                        update: function() {
                            let fuelIds = tableBodyNode.sortable('toArray', {attribute: 'value'});
                            for (let i = 0; i < fuelIds.length; i++) {
                                settingsRaw["smelter_fuel_p_" + fuelIds[i]] = i;
                            }

                            updateSettingsFromState();
                        },
                    }),
                },
                factory: {
                    bodyId: "script_productionTableBodyFactory",
                    rows: () => Object.values(FactoryManager.Productions),
                    rowId: row => row.resource.id,
                    columns: [
                        {header: "Resource", width: "35%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.resource.name))},
                        {header: "Enabled", width: "20%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "production_" + row.resource.id)},
                        {header: "Weighting", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "production_w_" + row.resource.id)},
                        {header: "Priority", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "production_p_" + row.resource.id)},
                        {header: "", width: "5%"},
                    ],
                },
                foundry: {
                    bodyId: "script_productionTableBodyFoundry",
                    rows: () => craftablesList,
                    rowId: row => row.id,
                    columns: [
                        {header: "Resource", width: "21%", color: "has-text-warning", title: "Resource name", render: (cell, row) => cell.append(buildTableLabel(row.name))},
                        {header: "Enabled", width: "17%", color: "has-text-warning", title: "Resource won't ever be crafted with this option disabled", render: (cell, row) => addTableToggle(cell, "craft" + row.id)},
                        {header: "Craftsmen", width: "17%", color: "has-text-warning", title: "Resource won't use foundry workers for craft with this option disabled", render: (cell, row) => addTableToggle(cell, "job_" + row.id)},
                        {header: "Weighting", width: "20%", color: "has-text-warning", title: "Ratio between resources. Script assign craftsmans to resource with lowest 'amount / weighting'. Ignored by manual crafting.", render: (cell, row) => {
                            if (row === resources.Scarletite || row === resources.Quantium) {
                                cell.append('<span>Managed</span>');
                            } else {
                                addTableInput(cell, "foundry_w_" + row.id);
                            }
                        }},
                        {header: "Min Materials", width: "20%", color: "has-text-warning", title: "Only craft resource when storage ratio of all required materials above given number. E.g. bricks with 0.1 min materials will be crafted only when cement storage at least 10% filled.", render: (cell, row) => addTableInput(cell, "foundry_p_" + row.id)},
                        {header: "", width: "5%"},
                    ],
                },
                miningDroid: {
                    bodyId: "script_productionTableBodyMiningDrone",
                    rows: () => Object.values(DroidManager.Productions),
                    rowId: row => row.resource.id,
                    columns: [
                        {header: "Resource", width: "35%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.resource.name))},
                        {header: "", width: "20%", color: "has-text-warning"},
                        {header: "Weighting", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "droid_w_" + row.resource.id)},
                        {header: "Priority", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "droid_pr_" + row.resource.id)},
                        {header: "", width: "5%"},
                    ],
                },
                replicator: {
                    bodyId: "script_productionTableBodyReplicator",
                    rows: () => Object.values(ReplicatorManager.Productions),
                    rowId: row => row.resource.id,
                    columns: [
                        {header: "Resource", width: "35%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.resource.name))},
                        {header: "Enabled", width: "20%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "replicator_" + row.resource.id)},
                        {header: "Weighting", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "replicator_w_" + row.resource.id)},
                        {header: "Priority", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "replicator_p_" + row.resource.id)},
                        {header: "", width: "5%"},
                    ],
                },
            },
        };
    }

    function getMagicSettingsSchema() {
        return {
            defaults: {
                autoAlchemy: false,
                autoPylon: false,
                magicAlchemyManaUse: 0.5,
                productionRitualManaUse: 0.5,
                productionRitualSafe: true,
            },
            priorityRows: () => Object.values(resources).filter(r => AlchemyManager.transmuteTier(r) > 0),
            defaultGroups: [
                {
                    rows: () => AlchemyManager.priorityList,
                    settings: [
                        {key: row => "res_alchemy_" + row.id, value: true},
                        {key: row => "res_alchemy_w_" + row.id, value: 0},
                    ],
                },
                {
                    rows: () => Object.values(RitualManager.Productions),
                    settings: [
                        {key: row => "spell_w_" + row.id, value: 100},
                    ],
                },
            ],
            afterDefaults: def => {
                def.spell_w_hunting = 10;
                def.spell_w_farmer = 1;
            },
            tables: {
                alchemy: {
                    bodyId: "script_alchemyTableBody",
                    rows: () => AlchemyManager.priorityList,
                    rowId: row => row.id,
                    columns: [
                        {header: "Resource", width: "20%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.name, "", AlchemyManager.transmuteTier(row) > 1 ? "has-text-advanced" : "has-text-info"))},
                        {header: "Enabled", width: "20%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "res_alchemy_" + row.id)},
                        {header: "Weighting", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "res_alchemy_w_" + row.id)},
                        {header: "", width: "40%"},
                    ],
                },
                pylon: {
                    bodyId: "script_magicTableBodyPylon",
                    rows: () => Object.values(RitualManager.Productions),
                    rowId: row => row.id,
                    columns: [
                        {header: "Ritual", width: "55%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(game.loc(`modal_pylon_spell_${row.id}`)))},
                        {header: "Weighting", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "spell_w_" + row.id)},
                        {header: "", width: "25%"},
                    ],
                },
            },
        };
    }

    function applySettingsSchemaDefaults(def, schema) {
        Object.assign(def, schema.defaults);
        for (let group of schema.defaultGroups ?? []) {
            let rows = group.rows();
            for (let index = 0; index < rows.length; index++) {
                let row = rows[index];
                for (let setting of group.settings) {
                    if (setting.when && !setting.when(row, index)) {
                        continue;
                    }
                    def[setting.key(row, index)] = typeof setting.value === "function" ? setting.value(row, index) : setting.value;
                }
            }
        }
        schema.afterDefaults?.(def);
    }

    function renderSettingsTable(parentNode, tableConfig) {
        let rows = tableConfig.rows();
        let headers = tableConfig.headerHtml ?? `<tr>${tableConfig.columns.map(column => {
            let title = column.title ? ` title="${column.title}"` : "";
            let color = column.color ? ` class="${column.color}"` : "";
            return `<th${color}${title} style="width:${column.width}">${column.header ?? ""}</th>`;
        }).join("")}</tr>`;
        let bodyRows = rows.map((row, rowIndex) => {
            let rowId = tableConfig.rowId?.(row, rowIndex);
            let rowValue = tableConfig.rowValue?.(row, rowIndex);
            let rowClass = tableConfig.rowClass?.(row, rowIndex);
            let attributes = [
                rowValue !== undefined ? `value="${rowValue}"` : "",
                rowClass ? `class="${rowClass}"` : "",
            ].filter(Boolean).join(" ");
            let prefix = attributes ? `<tr ${attributes}>` : "<tr>";
            let cells = tableConfig.columns.map((column, columnIndex) => {
                let id = rowId !== undefined && columnIndex === 0 ? ` id="${tableConfig.bodyId}_${rowId}"` : "";
                let style = `width:${column.width}${column.style ? ";" + column.style : ""}`;
                return `<td${id} style="${style}"></td>`;
            }).join("");
            return `${prefix}${cells}</tr>`;
        }).join("");

        parentNode.append(`
          <table style="width:100%">
            ${headers}
            <tbody id="${tableConfig.bodyId}">${bodyRows}</tbody>
          </table>`);

        let tableBodyNode = $('#' + tableConfig.bodyId);
        rows.forEach((row, rowIndex) => {
            let rowNode = tableBodyNode.children().eq(rowIndex);
            tableConfig.columns.forEach((column, columnIndex) => {
                column.render?.(rowNode.children().eq(columnIndex), row, rowIndex);
            });
        });
        tableConfig.afterRender?.(tableBodyNode, rows);
        return tableBodyNode;
    }
