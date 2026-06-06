    function getPlanetSettingsSchema() {
        const planetRows = () => {
            let tableSize = Math.max(biomeList.length, traitList.length, extraList.length);
            return Array.from({length: tableSize}, (value, index) => ({
                biome: biomeList[index],
                trait: traitList[index],
                extra: extraList[index],
            }));
        };

        return {
            defaultGroups: [
                {
                    rows: () => biomeList,
                    settings: [
                        {key: row => "biome_w_" + row, value: row => (planetBiomes.length - planetBiomes.indexOf(row)) * 10},
                    ],
                },
                {
                    rows: () => traitList,
                    settings: [
                        {key: row => "trait_w_" + row, value: row => (planetTraits.length - planetTraits.indexOf(row)) * 10},
                    ],
                },
                {
                    rows: () => extraList,
                    settings: [
                        {key: row => "extra_w_" + row, value: 0},
                    ],
                },
            ],
            afterDefaults: def => {
                def.extra_w_Achievement = 1000;
            },
            tables: {
                planet: {
                    bodyId: "script_planetTableBody",
                    rows: planetRows,
                    columns: [
                        {header: "Biome", width: "20%", color: "has-text-warning", render: (cell, row) => {
                            if (row.biome) {
                                cell.append(buildTableLabel(game.loc("biome_" + row.biome + "_name")));
                            }
                        }},
                        {header: "Weighting", width: "calc(40% / 3)", color: "has-text-warning", style: "border-right-width:1px", render: (cell, row) => {
                            if (row.biome) {
                                addTableInput(cell, "biome_w_" + row.biome);
                            }
                        }},
                        {header: "Trait", width: "20%", color: "has-text-warning", render: (cell, row) => {
                            if (row.trait) {
                                cell.append(buildTableLabel(row.trait === "none" ? "None" : game.loc("planet_" + row.trait)));
                            }
                        }},
                        {header: "Weighting", width: "calc(40% / 3)", color: "has-text-warning", style: "border-right-width:1px", render: (cell, row) => {
                            if (row.trait) {
                                addTableInput(cell, "trait_w_" + row.trait);
                            }
                        }},
                        {header: "Extra", width: "20%", color: "has-text-warning", render: (cell, row) => {
                            if (row.extra) {
                                cell.append(buildTableLabel(row.extra));
                            }
                        }},
                        {header: "Weighting", width: "calc(40% / 3)", color: "has-text-warning", render: (cell, row) => {
                            if (row.extra) {
                                addTableInput(cell, "extra_w_" + row.extra);
                            }
                        }},
                    ],
                },
            },
        };
    }
