    class Race {
        constructor(id) {
            this.id = id;
            this.evolutionTree = {};
        }

        get name() {
            return game.races[this.id].name ?? `Custom (${this.id} slot)`;
        }

        get desc() {
            let nameRef = game.races[this.id].desc;
            return typeof nameRef === "function" ? nameRef() :
                   typeof nameRef === "string" ? nameRef :
                   "Custom"; // Nonexistent custom
        }

        get genus() {
            return game.races[this.id].type;
        }

        getWeighting(verbose) {
            // Locked races always have zero weighting
            let habitability = this.getHabitability();
            if (habitability < (settings.evolutionAutoUnbound ? 0.8 : 1)) {
                return -1;
            }

            // Races not allowed to execute MAD, invalid targets for MAD auto achievements even if there is nothing else to do
            const noMADRace = ["sludge", "ultra_sludge", "hellspawn"];
            // Races that can't meaningfully contribute to genus pillar for Enlightenment, due to not-saved user chosen genus or otherwise
            // (they do, however, have a per-race pillar!)
            const noPillarRace = ["custom", "junker", "sludge", "ultra_sludge", "hybrid", "hellspawn"];
            // Genera that don't have a greatness achievement, and so should never get a weighting boost from missing greatness achievement
            const noGreatnessGenus = ["hybrid"];
            // Races that can't execute any greatness reset, and so should never be used for greatness automation
            const noGreatnessRace = ["hellspawn"];
            // Races that don't have an extinction achievement, invalid target for any extinction autoachievement
            const noExtinctionRace = ["hellspawn"];
            // Challenges races get a huge penalty applied as they shouldn't be done automatically, unless there is nothing else to do
            const challengeRace = ["junker", "sludge", "ultra_sludge", "hellspawn"];

            // List of resets that grant greatness
            const greatnessReset = ["bioseed", "ascension", "terraform", "matrix", "retire", "eden", "apotheosis"];

            // Subjectively chosen race lists that are known to perform well, slightly preferring them when multiple valid options are available for the same achievement
            // "Mid" resets, "high" will likely also grant an Enlightenment tick
            const midTierReset = ["bioseed", "cataclysm", "whitehole", "vacuum", "terraform"];
            const highTierReset = ["ascension", "demonic", "apotheosis"];
            const bestForMid = ["human", "cath", "capybara", "gnome", "cyclops", "gecko", "dracnid", "entish", "shroomi", "antid", "sharkin", "dryad", "salamander", "yeti", "kamel", "imp", "unicorn", "synth", "shoggoth"];
            const bestForHigh = ["human", "cath", "capybara", "gnome", "cyclops", "gecko", "dracnid", "entish", "shroomi", "scorpid", "sharkin", "dryad", "salamander", "wendigo", "kamel", "balorg", "unicorn", "nano", "ghast"];

            // Imitates to prioritize if farming TP3
            const goodImitates = ["wyvern", "dwarf", "dracnid", "octigoran", "unicorn", "salamander", "cyclops", "kamel", "arraak", "troll", "custom"];
            // Races who cannot enter TP or cannot unlock imitate even if they can, due to either challenge conflicts or special case in rewards
            const noImitates = ["junker", "nano", "synth", "hellspawn"];

            let goals = [];
            let weighting = 0;
            let starLevel = getStarLevel(settings);
            const checkAchievement = (baseWeight, id) => {
                let improve = starLevel - getAchievementStar(id);
                if (improve > 0) {
                    weighting += baseWeight * improve;
                    goals.push(`achieve_${id}_name`);
                    if (game.global.race.universe !== "micro" && game.global.race.universe !== "standard") {
                        weighting += baseWeight * Math.max(0, starLevel - getAchievementStar(id, "standard"));
                    }
                }
            }

            // Check pillar
            if (
                (
                    (settings.prestigeType === "ascension" && settings.prestigeAscensionPillar) ||
                    ["demonic", "apotheosis"].includes(settings.prestigeType)
                ) &&
                game.global.race.universe !== 'micro'
            ) {
                let speciesPillarLevel = game.global.pillars[this.id] ?? 0;
                let canPillar = !speciesPillarLevel && resources.Harmony.currentQuantity >= 1;
                let canUpgrade = speciesPillarLevel && speciesPillarLevel < starLevel;
                if (canPillar || canUpgrade) {
                    weighting += 1000 * Math.max(0, starLevel - speciesPillarLevel);
                    // Strongly prioritize pillaring new non-challenge species to upgrading old ones or Equilibrium
                    if (!speciesPillarLevel && !challengeRace.includes(this.id)) weighting += 100000;

                    goals.push("feat_equilibrium_name");
                    // Check genus pillar for Enlightenment
                    if (!noPillarRace.includes(this.id)) {
                        let genusPillar = Math.max(...Object.values(races)
                          .filter(r => r.genus === this.genus && !noPillarRace.includes(r.id))
                          .map(r => (game.global.pillars[r.id] ?? 0)));
                        let improve = starLevel - genusPillar;
                        if (improve > 0) {
                            weighting += 10000 * improve;
                            goals.push("achieve_enlightenment_name");
                        }
                    }
                }
            }

            // Check imitate unlock
            if (settings.prestigeType === "apocalypse") {
                let imitateUnlocked = game.global.stats?.synth?.[this.id] ?? false;
                if (!noImitates.includes(this.id) && !imitateUnlocked) {
                    weighting += 10000;
                    goals.push("feat_planned_obsolescence_name");
                    if (goodImitates.includes(this.id)) {
                        weighting += ((goodImitates.length - 1) - goodImitates.indexOf(this.id)) * 5000;
                    }
                }
            }

            // Check greatness\extinction achievement
            if (greatnessReset.includes(settings.prestigeType)) {
                if (!noGreatnessGenus.includes(this.genus) && !noGreatnessRace.includes(this.id)) {
                    checkAchievement(100, "genus_" + this.genus);
                }
            } else if (!noExtinctionRace.includes(this.id) && (!noMADRace.includes(this.id) || settings.prestigeType !== "mad")) {
                checkAchievement(100, "extinct_" + this.id);
            }

            // Blood War
            if (this.genus === "demonic" && settings.prestigeType !== "mad" && settings.prestigeType !== "bioseed") {
                checkAchievement(50, "blood_war");
            }

            // Sharks with Lasers
            if (this.id === "sharkin" && settings.prestigeType !== "mad") {
                checkAchievement(50, "laser_shark");
            }

            // Macro Universe and Arquillian Galaxy
            if (game.global.race.universe === "micro" && settings.prestigeType === "bioseed") {
                let smallRace = (this.genus === "small" || game.races[this.id].traits.compact);
                checkAchievement(50, smallRace ? "macro" : "marble");
            }

            // You Shall Pass
            if (this.id === "balorg" && game.global.race.universe === "magic" && settings.prestigeType === "vacuum") {
                checkAchievement(50, "pass");
            }

            // Madagascar Tree, Godwin's law, Infested Terrans - Achievement race
            for (let set of fanatAchievements) {
                if (this.id === set.race && game.global.race.gods === set.god) {
                    checkAchievement(150, set.achieve);
                }
            }

            // Increase weight for suited conditional races with achievements
            if (weighting > 0 && habitability === 1 && this.getCondition() !== '' && !challengeRace.includes(this.id)) {
                weighting += 500;
            }

            // Increases weight of stringest races of genus
            if ((midTierReset.includes(settings.prestigeType) && bestForMid.includes(this.id)) ||
                (highTierReset.includes(settings.prestigeType) && bestForHigh.includes(this.id))) {
                weighting += 1;
            }

            // Same race for Second Evolution
            if (this.id === game.global.race.gods) {
                checkAchievement(10, "second_evolution");
            }

            // Madagascar Tree, Godwin's law, Infested Terrans - God race
            // This races shouldn't benefit from suited planet, to avoid prep -> prep loops
            for (let set of fanatAchievements) {
                if (this.id === set.god) {
                    checkAchievement(5, set.achieve);
                }
            }

            // Feats, lowest weight - go for them only if there's nothing better
            if (game.global.race.universe !== "micro") {
                const checkFeat = (id) => {
                    let improve = starLevel - (game.global.stats.feat[id] ?? 0);
                    if (improve > 0) {
                        weighting += 1 * improve;
                        goals.push(`feat_${id}_name`);
                    }
                }

                // Take no advice, Ill Advised
                if (game.global.city.biome === "hellscape" && this.genus !== "demonic") {
                    switch (settings.prestigeType) {
                        case "mad":
                        case "cataclysm":
                            checkFeat("take_no_advice");
                            break;
                        case "bioseed":
                            checkFeat("ill_advised");
                            break;
                    }
                }

                // Organ Harvester, The Misery, Garbage Pie
                if (this.id === "junker") {
                    switch (settings.prestigeType) {
                        case "bioseed":
                            checkFeat("organ_harvester");
                            break;
                        case "ascension":
                        case "demonic":
                            checkFeat("garbage_pie");
                        case "terraform":
                        case "whitehole":
                        case "vacuum":
                        case "apocalypse":
                            checkFeat("the_misery");
                            break;
                    }
                }

                // Nephilim
                if (settings.prestigeType === "whitehole" && game.global.race.universe === "evil" && this.genus === "angelic") {
                    checkFeat("nephilim");
                }

                // Twisted
                if (settings.prestigeType === "demonic" && this.genus === "angelic") {
                    checkFeat("twisted");
                }

                // Digital Ascension
                if (settings.prestigeType === "ascension" && settings.challenge_emfield && this.genus === "artifical" && this.id !== "custom") {
                    checkFeat("digital_ascension");
                }

                // Slime Lord
                if (settings.prestigeType === "demonic" && this.id === "sludge") {
                    checkFeat("slime_lord");
                }
            }

            // Ignore challenge races on low star, and decrease weight on any other star
            if (challengeRace.includes(this.id)) {
                weighting *= starLevel < 5 ? 0 : 0.01;
            }

            // Scale down weight of unsuited races
            weighting *= habitability;

            return verbose ? goals : weighting;
        }

        getHabitability() {
            switch (this.id) {
                case "hellspawn":
                    return (game.global.race.universe === 'evil' && game.global.stats.achieve['godslayer']?.e) ? 1 : 0;
                case "junker":
                    return game.global.genes.challenge ? 1 : 0;
                case "sludge":
                    return ((game.global.stats.achieve['ascended'] || game.global.stats.achieve['corrupted']) && game.global.stats.achieve['extinct_junker']) ? 1 : 0;
                case "ultra_sludge":
                    return (game.global.stats.achieve['godslayer'] && game.global.stats.achieve['extinct_sludge']) ? 1 : 0;
                case "hybrid":
                    return (game.global.stats.achieve['what_is_best']?.e >= 5) ? 1 : 0;
            }

            let unboundMod = game.global.blood.unbound >= 4 ? 0.95 :
                             game.global.blood.unbound >= 2 ? 0.9 :
                             game.global.blood.unbound >= 1 ? 0.8 : 0;
            let shadowMod = game.global.blood.unbound >= 3 ? unboundMod : 0;

            switch (this.genus) {
                case "aquatic":
                    return ['swamp','oceanic'].includes(game.global.city.biome) ? 1 : unboundMod;
                case "fey":
                    return ['forest','swamp','taiga'].includes(game.global.city.biome) ? 1 : unboundMod;
                case "sand":
                    return ['ashland','desert'].includes(game.global.city.biome) ? 1 : unboundMod;
                case "heat":
                    return ['ashland','volcanic'].includes(game.global.city.biome) ? 1 : unboundMod;
                case "polar":
                    return ['tundra','taiga'].includes(game.global.city.biome) ? 1 : unboundMod;
                case "demonic":
                    return game.global.city.biome === 'hellscape' ? 1 : shadowMod;
                case "angelic":
                    return game.global.city.biome === 'eden' ? 1 : shadowMod;
                case "synthetic":
                    return game.global.stats.achieve['obsolete']?.l >= 5 ? 1 : 0;
                case "eldritch":
                    return game.global.stats.achieve['nightmare']?.mg ? 1 : 0;
                case "hybrid":
                    return game.global.stats.achieve['godslayer'] ? 1 : 0;
                case undefined: // Nonexistent custom
                    return 0;
                default:
                    return 1;
            }
        }

        getCondition() {
            switch (this.id) {
                case "hellspawn":
                    return poly.loc('wiki_challenges_reqs_reset', [`${poly.loc("wiki_universe_evil")} ${poly.loc("wiki_resets_apotheosis")}`]);
                case "junker":
                    return "Genetic Dead End unlocked.";
                case "sludge":
                    return "Failed Experiment unlocked.";
                case "ultra_sludge":
                    return "Ultra Failed Experiment unlocked.";
                case "custom":
                    return `Complete an Ascension reset and be on a suitable planet for your chosen genus (${this.genus ? game.loc('genelab_genus_' + this.genus) : 'not set'}).`;
                case "hybrid":
                    return game.loc('wiki_achieve_what_is_best');
            }

            switch (this.genus) {
                case "aquatic":
                    return "Oceanic or Swamp planet.";
                case "fey":
                    return "Forest, Swamp or Taiga planet.";
                case "sand":
                    return "Ashland or Desert planet.";
                case "heat":
                    return "Ashland or Volcanic planet.";
                case "polar":
                    return "Tundra or Taiga planet.";
                case "demonic":
                    return "Hellscape planet.";
                case "angelic":
                    return "Eden planet.";
                case "synthetic":
                    return game.loc('wiki_achieve_obsolete');
                case "eldritch":
                    return game.loc('wiki_achieve_nightmare');
                case "hybrid":
                    return game.loc('wiki_achieve_godslayer');
                case undefined:
                    return "Unknown.";
                default: // No special conditions
                    return "";
            }
        }
    }

    class Trigger {
        constructor(seq, priority, requirementType, requirementId, requirementCount, actionType, actionId, actionCount) {
            this.seq = seq;
            this.priority = priority;

            this.requirementType = requirementType;
            this.requirementId = requirementId;
            this.requirementCount = requirementCount;

            this.actionType = actionType;
            this.actionId = actionId;
            this.actionCount = actionCount;

            this.complete = false;
        }

        cost() {
            if (this.actionType === "research") {
                return techIds[this.actionId].definition.cost;
            }
            if (this.actionType === "build") {
                return buildingIds[this.actionId].definition.cost;
            }
            if (this.actionType === "arpa") {
                return arpaIds[this.actionId].definition.cost;
            }
            return {};
        }

        isActionPossible() {
            // check against MAX as we want to know if it is possible...
            let obj = null;
            if (this.actionType === "research") {
                obj = techIds[this.actionId];
            }
            if (this.actionType === "build") {
                obj = buildingIds[this.actionId];
            }
            if (this.actionType === "arpa") {
                obj = arpaIds[this.actionId];
            }
            return obj && obj.isUnlocked() && obj.isAffordable(true);
        }

        updateComplete() {
            if (this.complete) {
                return false;
            }

            if (this.actionType === "research" && techIds[this.actionId].isResearched()) {
                this.complete = true;
                return true;
            }
            if (this.actionType === "build" && buildingIds[this.actionId].count >= this.actionCount) {
                this.complete = true;
                return true;
            }
            if (this.actionType === "arpa" && arpaIds[this.actionId].count >= this.actionCount) {
                this.complete = true;
                return true;
            }
            return false;
        }

        areRequirementsMet() {
            if (this.requirementType === "chain") {
                return this.priority < 1 || TriggerManager.priorityList[this.priority - 1]?.complete;
            } else if (checkTypes[this.requirementType]) {
                try {
                    if (retBools.includes(this.requirementType)) {
                        return checkTypes[this.requirementType].fn(this.requirementId) == this.requirementCount
                    } else {
                        return checkTypes[this.requirementType].fn(this.requirementId) >= this.requirementCount;
                    }
                } catch (error) {
                    // Triggers don't have names, hopefully this is enough for the user to find it
                    let displayName = `${this.requirementType} ${this.requirementId} x${this.requirementCount} => ${this.actionType}: ${this.actionId} x${this.actionCount}`;
                    let msg = `Trigger ${this.seq} [${displayName}] requirement is invalid! Fix or remove it. (${error})`;
                    if (!WindowManager.isOpen() && !Object.values(game.global.lastMsg.all).find(log => log.m === msg)) { // Don't spam with errors
                        GameLog.logDanger("special", msg, ['events', 'major_events']);
                    }
                }
            }
            return false;
        }

        updateRequirementType(requirementType) {
            if (requirementType === this.requirementType) {
                return;
            }

            if (requirementType === "chain") {
                this.requirementType = requirementType;
                this.requirementId = "";
                this.requirementCount = 0;
                return; // Special case
            }

            if (!checkTypes[requirementType]) {
                return; // Invalid type
            }

            let oldArg = checkTypes[this.requirementType]?.arg ?? null;
            let oldOpts = checkTypes[this.requirementType]?.options ?? null;
            let newArg = checkTypes[requirementType].arg
            let newOpts = checkTypes[requirementType].options;

            this.requirementType = requirementType;
            this.requirementCount = 1;
            this.complete = false;

            if (oldArg !== newArg || oldOpts !== newOpts) {
                this.requirementId = checkTypes[this.requirementType].def;
            }
        }

        updateActionType(actionType) {
            if (actionType === this.actionType) {
                return;
            }

            this.actionType = actionType;
            this.complete = false;

            if (this.actionType === "research") {
                this.actionId = "tech-club";
                this.actionCount = 0;
                return;
            }
            if (this.actionType === "build") {
                this.actionId = "city-basic_housing";
                this.actionCount = 1;
                return;
            }
            if (this.actionType === "arpa") {
                this.actionId = "arpalhc";
                this.actionCount = 1;
                return;
            }
        }
    }

