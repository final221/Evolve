        AsphodelMission: new Action("Asphodel Mission", "eden", "survery_meadows", "eden_asphodel"),
        AsphodelEncampment: new Action("Asphodel Encampment", "eden", "encampment", "eden_asphodel"),
        AsphodelSoulEngine: new Action("Asphodel Soul Engine", "eden", "soul_engine", "eden_asphodel"),
        AsphodelMechStation: new Action("Asphodel Mech Station", "eden", "mech_station", "eden_asphodel", {multiSegmented: true}),
        AsphodelHarvester: new Action("Asphodel Harvester", "eden", "asphodel_harvester", "eden_asphodel", {smart: true}),
        AsphodelProcessor: new Action("Asphodel Muon Processor", "eden", "ectoplasm_processor", "eden_asphodel"),
        AsphodelResearchStation: new Action("Asphodel Research Station", "eden", "research_station", "eden_asphodel"),
        AsphodelWarehouse: new Action("Asphodel Warehouse", "eden", "warehouse", "eden_asphodel"),
        AsphodelStabilizer: new Action("Asphodel Stabilizer", "eden", "stabilizer", "eden_asphodel"),
        AsphodelRuneGate: new Action("Asphodel Rune Gate", "eden", "rune_gate", "eden_asphodel", {multiSegmented: true}),
        AsphodelRuneGateOpen: new Action("Asphodel Rune Gate (Complete)", "eden", "rune_gate_open", "eden_asphodel"),
        AsphodelBunker: new Action("Asphodel Bunker", "eden", "bunker", "eden_asphodel", {garrison: true}),
        AsphodelBlissDen: new Action("Asphodel Bliss Den", "eden", "bliss_den", "eden_asphodel"),
        AsphodelRectory: new Action("Asphodel Rectory", "eden", "rectory", "eden_asphodel", {housing: true}),
        AsphodelCorruptor: new Action("Asphodel Corruptor (Warlord)", "eden", "corruptor", "eden_asphodel"),

        ElysiumMission: new Action("Elysium Mission", "eden", "survey_fields", "eden_elysium"),
        ElysiumFortress: new Action("Elysium Celestial Fortress", "eden", "fortress", "eden_elysium"),
        ElysiumSiege: new Action("Elysium Siege Fortress", "eden", "siege_fortress", "eden_elysium"),
        ElysiumRaid: new Action("Elysium Raid Supplies", "eden", "raid_supplies", "eden_elysium"),
        ElysiumAmbush: new Action("Elysium Ambush Patrol", "eden", "ambush_patrol", "eden_elysium"),
        ElysiumRuinedFortress: new Action("Elysium Ruined Fortress", "eden", "ruined_fortress", "eden_elysium"),
        ElysiumScout: new Action("Elysium Scout", "eden", "scout_elysium", "eden_elysium"),
        ElysiumFireSupportBase: new Action("Elysium Fire Support Base", "eden", "fire_support_base", "eden_elysium", {multiSegmented: true}),
        ElysiumMine: new Action("Elysium Mine", "eden", "elysanite_mine", "eden_elysium"),
        ElysiumSacredSmelter: new Action("Elysium Sacred Smelter", "eden", "sacred_smelter", "eden_elysium"),
        ElysiumEleriumContainment: new Action("Elysium Elerium Containment", "eden", "elerium_containment", "eden_elysium"),
        ElysiumPillbox: new Action("Elysium Pillbox", "eden", "pillbox", "eden_elysium"), // TODO: Need some interaction with autoHell
        ElysiumRestaurant: new Action("Elysium Restaurant", "eden", "restaurant", "eden_elysium"),
        ElysiumEternalBank: new Action("Elysium Eternal Bank", "eden", "eternal_bank", "eden_elysium"),
        ElysiumArchive: new Action("Elysium Archive", "eden", "archive", "eden_elysium"),
        ElysiumNorthPier: new Action("Elysium North Pier", "eden", "north_pier", "eden_elysium", {multiSegmented: true}),
        ElysiumRushmore: new Action("Elysium Rushmore", "eden", "rushmore", "eden_elysium"),
        ElysiumReincarnation: new Action("Elysium Reincarnation", "eden", "reincarnation", "eden_elysium"),
        ElysiumCement: new Action("Elysium Cement", "eden", "eden_cement", "eden_elysium"),

        IsleSouthPier: new Action("Isle South Pier", "eden", "south_pier", "eden_isle", {multiSegmented: true}),
        IsleWestTower: new Action("Isle West Tower", "eden", "west_tower", "eden_isle"),
        IsleGarrison: new Action("Isle Garrison", "eden", "isle_garrison", "eden_isle"),
        IsleEastTower: new Action("Isle East Tower", "eden", "east_tower", "eden_isle"),
        IsleSpiritVacuum: new Action("Isle Spirit Vacuum", "eden", "spirit_vacuum", "eden_isle"),
        IsleSpiritBattery: new Action("Isle Spirit Battery", "eden", "spirit_battery", "eden_isle"),
        IsleSoulCompactor: new Action("Isle Soul Compactor", "eden", "soul_compactor", "eden_isle"),

        PalaceMission: new Action("Palace Mission", "eden", "scout_palace", "eden_palace"),
        PalaceThrone: new Action("Palace Throne", "eden", "throne", "eden_palace"),
        PalaceInfuser: new Action("Palace Infuser", "eden", "infuser", "eden_palace", {multiSegmented: true}),
        PalaceApotheosis: new Action("Palace Apotheosis", "eden", "apotheosis", "eden_palace", {prestige: true}),
        PalaceConduit: new Action("Palace Conduit", "eden", "conduit", "eden_palace", {multiSegmented: true}),
        PalaceTomb: new Action("Palace Tomb", "eden", "tomb", "eden_palace", {multiSegmented: true}),

    }

    var linkedBuildings = [
        [buildings.LakeTransport, buildings.LakeBireme],
        [buildings.SpirePort, buildings.SpireBaseCamp],
    ]

    var projects = {
        LaunchFacility: new Project("Launch Facility", "launch_facility"),
        SuperCollider: new Project("Supercollider", "lhc"),
        StockExchange: new Project("Stock Exchange", "stock_exchange"),
        Monument: new Project("Monument", "monument"),
        Railway: new Project("Railway", "railway"),
        Nexus: new Project("Nexus", "nexus"),
        RoidEject: new Project("Asteroid Redirect", "roid_eject"),
        ManaSyphon: new Project("Mana Syphon", "syphon"),
        Depot: new Project("Depot", "tp_depot"),
    }

    const wrGlobalCondition = 0; // Generic condition will be checked once per tick. Takes nothing and return bool - whether following rule is applicable, or not
    const wrIndividualCondition = 1; // Individual condition, checks every building, and return any value; if value casts to true - rule aplies
    const wrDescription = 2; // Description displayed in tooltip when rule applied, takes return value of individual condition, and building
    const wrMultiplier = 3; // Weighting mulptiplier. Called first without any context; rules returning x1 also won't be checked
