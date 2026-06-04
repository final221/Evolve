    const numberSuffix = {
        K: 1000,
        M: 1000000,
        G: 1000000000,
        T: 1000000000000,
        P: 1000000000000000,
        E: 1000000000000000000,
        Z: 1000000000000000000000,
        Y: 1000000000000000000000000,
    }

    const universes = ['standard','heavy','antimatter','evil','micro','magic'];

    // Biomes, traits and geologies in natural order
    const biomeList = ['grassland', 'oceanic', 'forest', 'desert', 'volcanic', 'tundra', 'savanna', 'swamp', 'taiga', 'ashland', 'hellscape', 'eden'];
    const traitList = ['none', 'toxic', 'mellow', 'rage', 'stormy', 'ozone', 'magnetic', 'trashed', 'elliptical', 'flare', 'dense', 'unstable', 'permafrost', 'retrograde', 'kamikaze'];
    const extraList = ['Achievement', 'Orbit', 'Copper', 'Iron', 'Aluminium', 'Coal', 'Oil', 'Titanium', 'Uranium', 'Iridium'];

    // Biomes and traits sorted by habitability
    const planetBiomes = ["eden", "ashland", "volcanic", "taiga", "tundra", "swamp", "oceanic", "forest", "savanna", "grassland", "desert", "hellscape"];
    const planetTraits = ["elliptical", "magnetic", "permafrost", "rage", "retrograde", "none", "stormy", "toxic", "trashed", "dense", "unstable", "ozone", "mellow", "flare", "kamikaze"];
    const planetBiomeGenus = {hellscape: "demonic", eden: "angelic", oceanic: "aquatic", forest: "fey", desert: "sand", volcanic: "heat", tundra: "polar"};
    const fanatAchievements = [{god: 'sharkin', race: 'entish', achieve: 'madagascar_tree'},
                               {god: 'sporgar', race: 'human', achieve: 'infested'},
                               {god: 'shroomi', race: 'troll', achieve: 'godwin'}];

    const challenges = [
        [{id:"plasmid", trait:"no_plasmid"},
         {id:"mastery", trait:"weak_mastery"},
         {id:"nerfed", trait:"nerfed"}],
        [{id:"crispr", trait:"no_crispr"},
         {id:"badgenes", trait:"badgenes"}],
        [{id:"trade", trait:"no_trade"}],
        [{id:"craft", trait:"no_craft"}],
        [{id:"joyless", trait:"joyless"}],
        [{id:"steelen", trait:"steelen"}],
        [{id:"decay", trait:"decay"}],
        [{id:"emfield", trait:"emfield"}],
        [{id:"inflation", trait:"inflation"}],
        [{id:"sludge", trait:"sludge"}],
        [{id:"ultra_sludge", trait:"ultra_sludge"}],
        [{id:"orbit_decay", trait:"orbit_decay"}],
        //[{id:"nonstandard", trait:"nonstandard"}],
        [{id:"gravity_well", trait:"gravity_well"},
         {id:"witch_hunter", trait:"witch_hunter"},
         {id:"warlord", trait:"warlord"}],
        //[{id:"storage_wars", trait:"storage_wars"}],
        [{id:"junker", trait:"junker"}],
        [{id:"cataclysm", trait:"cataclysm"}],
        [{id:"banana", trait:"banana"}],
        [{id:"truepath", trait:"truepath"}],
        [{id:"lone_survivor", trait:"lone_survivor"}],
        [{id:"fasting", trait:"fasting"}],
    ];
    const governors = ["soldier", "criminal", "entrepreneur", "educator", "spiritual", "bluecollar", "noble", "media", "sports", "bureaucrat"];
    const evolutionSettingsToStore = ["userEvolutionTarget", "userEvolutionGenus", "prestigeType", ...challenges.map(c => "challenge_" + c[0].id)];
    const logIgnore = ["food", "lumber", "stone", "chrysotile", "slaughter", "s_alter", "slave_market", "horseshoe", "assembly", "cloning_facility", "ambush_patrol", "raid_supplies", "siege_fortress"];
    const galaxyRegions = ["gxy_stargate", "gxy_gateway", "gxy_gorddon", "gxy_alien1", "gxy_alien2", "gxy_chthonian"];
    const settingsSections = ["toggle", "general", "prestige", "evolution", "research", "market", "storage", "production", "war", "hell", "fleet", "job", "building", "project", "government", "logging", "trait", "weighting", "ejector", "planet", "mech", "magic", "trigger"];
    const mutationCostMultipliers = {sludge: {gain: 10, purge: 10}, ultra_sludge: {gain: 10, purge: 10}, custom: {gain: 10, purge: 10}};
    const mutationCostMultipliersGenus = {hybrid: {gain: 2, purge: 2}};
    const specialRaceTraits = {beast_of_burden: "reindeer", photosynth: "plant"};
    const conflictingTraits = [["dumb", "smart"]];
    const replicableResources = ['Food', 'Lumber', 'Chrysotile', 'Stone', 'Crystal', 'Furs', 'Copper', 'Iron', 'Aluminium', 'Cement', 'Coal', 'Oil', 'Uranium', 'Steel', 'Titanium', 'Alloy', 'Polymer', 'Iridium', 'Helium_3', 'Deuterium', 'Neutronium', 'Adamantite', 'Infernite', 'Elerium', 'Nano_Tube', 'Graphene', 'Stanene', 'Bolognium', 'Unobtainium', 'Vitreloy', 'Orichalcum', 'Water', 'Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal', 'Mythril', 'Aerogel', 'Nanoweave', 'Scarletite', 'Quantium'];

    // Lookup tables, will be filled on init
    var techIds = {};
    var buildingIds = {};
    var arpaIds = {};
    var jobIds = {};
    var evolutions = {};
    var imitations = {};
    var races = {};
    var craftablesList = [];
    var foundryList = [];

    // State variables
    var state = {
        forcedUpdate: false,
        gameTicked: false,
        scriptTick: 1,
        multiplierTick: 0,
        buildingToggles: 0,
        evolutionAttempts: 0,
        tabHash: 0,

        lastWasteful: null,
        lastHighPop: null,
        lastFlier: null,
        lastPopulationCount: 0,
        lastFarmerCount: 0,
        astroSign: null,

        evoCheckNeeded: true,
        warnDebug: true,
        warnPreload: true,

        // We need to keep them separated, as we *don't* want to click on queue targets. Game will handle that. We're just managing resources for them.
        queuedTargets: [],
        queuedTargetsAll: [],
        triggerTargets: [],
        unlockedTechs: [],
        unlockedBuildings: [],
        conflictTargets: [],

        maxSpaceMiners: Number.MAX_SAFE_INTEGER,
        globalProductionModifier: 1,
        moneyIncomes: [],
        moneyMedian: 0,
        soulGemIncomes: [{sec: 0, gems: 0}],
        soulGemPerHour: 0,
        soulGemLast: Number.MAX_SAFE_INTEGER,

        knowledgeRequiredByTechs: 0,

        goal: "Standard",

        missionBuildingList: [],
        tooltips: {},
        filterRegExp: null,
        evolutionTarget: null,

        whiteholeLastStabilise: 0,
        whiteholeLastExoticMass: 0,
    };

    // Class instances
