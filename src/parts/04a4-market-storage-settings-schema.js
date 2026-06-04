    function getMarketStorageSettingsSchema() {
        const tradePriorityDefaults = [
            {priority: 1, items: ["Food"]},
            {priority: 2, items: ["Helium_3", "Uranium", "Oil", "Coal"]},
            {priority: 3, items: ["Stone", "Chrysotile", "Lumber"]},
            {priority: 4, items: ["Aluminium", "Iron", "Copper"]},
            {priority: 5, items: ["Furs"]},
            {priority: 6, items: ["Cement"]},
            {priority: 7, items: ["Steel"]},
            {priority: 8, items: ["Titanium"]},
            {priority: 9, items: ["Polymer", "Alloy"]},
            {priority: 10, items: ["Iridium"]},
            {priority: -1, items: ["Crystal"]},
        ];

        const marketResources = () => Object.values(resources).filter(r => r.is.tradable).reverse();
        const storageResources = () => Object.values(resources).filter(r => r.hasStorage()).reverse();

        return {
            market: {
                defaults: {
                    autoMarket: false,
                    autoGalaxyMarket: false,
                    tradeRouteMinimumMoneyPerSecond: 500,
                    tradeRouteMinimumMoneyPercentage: 50,
                    tradeRouteSellExcess: true,
                    minimumMoney: 0,
                    minimumMoneyPercentage: 0,
                    marketMinIngredients: 0,
                },
                priorityRows: marketResources,
                defaultGroups: [
                    {
                        rows: () => MarketManager.priorityList,
                        settings: [
                            {key: row => "res_buy_p_" + row.id, value: (row, index) => index},
                            {key: row => "buy" + row.id, value: false},
                            {key: row => "res_buy_r_" + row.id, value: 0.5},
                            {key: row => "sell" + row.id, value: false},
                            {key: row => "res_sell_r_" + row.id, value: 0.9},
                            {key: row => "res_trade_buy_" + row.id, value: true},
                            {key: row => "res_trade_sell_" + row.id, value: true},
                            {key: row => "res_trade_w_" + row.id, value: 1},
                            {key: row => "res_trade_p_" + row.id, value: 1},
                        ],
                    },
                    {
                        rows: () => tradePriorityDefaults.flatMap(group => group.items.map(item => ({item, priority: group.priority}))),
                        settings: [
                            {key: row => "res_trade_p_" + resources[row.item].id, value: row => row.priority},
                        ],
                    },
                    {
                        rows: () => poly.galaxyOffers.map((trade, index) => ({trade, index, buyResource: resources[trade.buy.res]})),
                        settings: [
                            {key: row => "res_galaxy_w_" + row.buyResource.id, value: 1},
                            {key: row => "res_galaxy_p_" + row.buyResource.id, value: row => row.index + 1},
                        ],
                    },
                ],
                tables: {
                    market: {
                        bodyId: "script_marketTableBody",
                        rows: () => MarketManager.priorityList,
                        rowId: row => row.id,
                        rowValue: row => row.id,
                        rowClass: () => "script-draggable",
                        headerHtml: `
            <tr>
              <th class="has-text-warning" colspan="1"></th>
              <th class="has-text-warning" colspan="4">Manual Trades</th>
              <th class="has-text-warning" colspan="4">Trade Routes</th>
              <th class="has-text-warning" colspan="1"></th>
            </tr>
            <tr>
              <th class="has-text-warning" style="width:15%">Resource</th>
              <th class="has-text-warning" style="width:10%">Buy</th>
              <th class="has-text-warning" style="width:10%">Ratio</th>
              <th class="has-text-warning" style="width:10%">Sell</th>
              <th class="has-text-warning" style="width:10%">Ratio</th>
              <th class="has-text-warning" style="width:10%">In</th>
              <th class="has-text-warning" style="width:10%">Away</th>
              <th class="has-text-warning" style="width:10%">Weighting</th>
              <th class="has-text-warning" style="width:10%">Priority</th>
              <th style="width:5%"></th>
            </tr>`,
                        columns: [
                            {width: "15%", render: (cell, row) => cell.append(buildTableLabel(row.name))},
                            {width: "10%", render: (cell, row) => addTableToggle(cell, "buy" + row.id)},
                            {width: "10%", render: (cell, row) => addTableInput(cell, "res_buy_r_" + row.id)},
                            {width: "10%", render: (cell, row) => addTableToggle(cell, "sell" + row.id)},
                            {width: "10%", render: (cell, row) => addTableInput(cell, "res_sell_r_" + row.id), style: "border-right-width:1px"},
                            {width: "10%", render: (cell, row) => addTableToggle(cell, "res_trade_buy_" + row.id)},
                            {width: "10%", render: (cell, row) => addTableToggle(cell, "res_trade_sell_" + row.id)},
                            {width: "10%", render: (cell, row) => addTableInput(cell, "res_trade_w_" + row.id)},
                            {width: "10%", render: (cell, row) => addTableInput(cell, "res_trade_p_" + row.id)},
                            {width: "5%", render: cell => cell.append('<span class="script-lastcolumn"></span>')},
                        ],
                        afterRender: tableBodyNode => tableBodyNode.sortable({
                            items: "tr:not(.unsortable)",
                            helper: sorterHelper,
                            update: function() {
                                let marketIds = tableBodyNode.sortable('toArray', {attribute: 'value'});
                                for (let i = 0; i < marketIds.length; i++) {
                                    settingsRaw["res_buy_p_" + marketIds[i]] = i;
                                }

                                MarketManager.sortByPriority();
                                updateSettingsFromState();
                            },
                        }),
                    },
                    galaxy: {
                        bodyId: "script_marketGalaxyTableBody",
                        rows: () => poly.galaxyOffers.map((trade, index) => ({trade, index, buyResource: resources[trade.buy.res], sellResource: resources[trade.sell.res]})),
                        rowId: row => row.index,
                        columns: [
                            {header: "Buy", width: "30%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.buyResource.name, "has-text-success"))},
                            {header: "Sell", width: "30%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.sellResource.name, "has-text-danger"))},
                            {header: "Weighting", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "res_galaxy_w_" + row.buyResource.id)},
                            {header: "Priority", width: "20%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "res_galaxy_p_" + row.buyResource.id)},
                        ],
                    },
                },
            },
            storage: {
                defaults: {
                    autoStorage: false,
                    storageLimitPreMad: true,
                    storageSafeReassign: true,
                    storageAssignExtra: true,
                    storageAssignPart: false,
                },
                priorityRows: storageResources,
                defaultGroups: [
                    {
                        rows: () => StorageManager.priorityList,
                        settings: [
                            {key: row => "res_storage" + row.id, value: true},
                            {key: row => "res_storage_p_" + row.id, value: (row, index) => index},
                            {key: row => "res_storage_o_" + row.id, value: row => [resources.Orichalcum, resources.Vitreloy, resources.Bolognium].includes(row)},
                            {key: row => "res_min_store" + row.id, value: 1},
                            {key: row => "res_max_store" + row.id, value: -1},
                        ],
                    },
                ],
                tables: {
                    storage: {
                        bodyId: "script_storageTableBody",
                        rows: () => StorageManager.priorityList,
                        rowId: row => row.id,
                        rowValue: row => row.id,
                        rowClass: () => "script-draggable",
                        columns: [
                            {header: "Resource", width: "35%", color: "has-text-warning", render: (cell, row) => cell.append(buildTableLabel(row.name))},
                            {header: "Enabled", width: "15%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "res_storage" + row.id)},
                            {header: "Store Overflow", width: "15%", color: "has-text-warning", render: (cell, row) => addTableToggle(cell, "res_storage_o_" + row.id)},
                            {header: "Min Storage", width: "15%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "res_min_store" + row.id)},
                            {header: "Max Storage", width: "15%", color: "has-text-warning", render: (cell, row) => addTableInput(cell, "res_max_store" + row.id)},
                            {header: "", width: "5%", render: cell => cell.append('<span class="script-lastcolumn"></span>')},
                        ],
                        afterRender: tableBodyNode => tableBodyNode.sortable({
                            items: "tr:not(.unsortable)",
                            helper: sorterHelper,
                            update: function() {
                                let storageIds = tableBodyNode.sortable('toArray', {attribute: 'value'});
                                for (let i = 0; i < storageIds.length; i++) {
                                    settingsRaw['res_storage_p_' + storageIds[i]] = i;
                                }

                                StorageManager.sortByPriority();
                                updateSettingsFromState();
                            },
                        }),
                    },
                },
            },
        };
    }
