    function autoEvolution() {
        if (game.global.race.species !== "protoplasm") {
            return;
        }

        autoUniverseSelection();
        autoPlanetSelection();

        // Wait for universe and planet, we don't want to run auto achievement until we'll land somewhere
        if (game.global.race.universe === 'bigbang' || (game.global.race.seeded && !game.global.race['chose'])) {
            return;
        }

        if (state.evolutionTarget === null) {
            loadQueuedSettings();

            // Try to pick race for achievement first
            if (settings.userEvolutionTarget === "auto") {
                let raceByWeighting = Object.values(races).sort((a, b) => b.getWeighting() - a.getWeighting());

                if (game.global.stats.achieve['mass_extinction']) {
                    // With Mass Extinction we can pick any race, go for best one
                    state.evolutionTarget = raceByWeighting[0];
                } else {
                    // Otherwise go for genus having most weight
                    let genusList = Object.values(races).map(r => r.genus).filter((v, i, a) => a.indexOf(v) === i);
                    let genusWeights = genusList.map(g => [g, Object.values(races).filter(r => r.genus === g).map(r => r.getWeighting()).reduce((sum, next) => sum + next)]);
                    let bestGenus = genusWeights.sort((a, b) => b[1] - a[1])[0][0];
                    state.evolutionTarget = raceByWeighting.find(r => r.genus === bestGenus);
                }
            }

            // Auto Achievements disabled, checking user specified race
            if (settings.userEvolutionTarget !== "auto") {
                let userRace = races[settings.userEvolutionTarget];
                if (userRace && userRace.getHabitability() > 0){
                    // Race specified, and condition is met
                    state.evolutionTarget = userRace
                }
            }

            // Try to pull next race from queue
            if (state.evolutionTarget === null && settings.evolutionQueueEnabled && settingsRaw.evolutionQueue.length > 0 && (!settings.evolutionQueueRepeat || state.evolutionAttempts < settingsRaw.evolutionQueue.length)) {
                return;
            }

            // Still no target. Fallback to custom, or ent.
            if (state.evolutionTarget === null) {
                state.evolutionTarget = races.custom.getHabitability() > 0 ? races.custom : races.entish;
            }
            GameLog.logSuccess("special", `Attempting evolution of ${state.evolutionTarget.name}.`, ['progress']);
        }

        // Apply challenges
        for (let i = 0; i < challenges.length; i++) {
            if (settings["challenge_" + challenges[i][0].id]) {
                for (let j = 0; j < challenges[i].length; j++) {
                    let {id, trait} = challenges[i][j];
                    if (game.global.race[trait] !== 1 && evolutions[id].click() && (id === "junker" || id === "sludge" || id === "ultra_sludge" || id === "warlord")) {
                        return; // Give game time to update state after activating junker
                    }
                }
            }
        }

        // Calculate the maximum RNA and DNA required to evolve and don't build more than that
        let maxRNA = 0;
        let maxDNA = 0;

        let evolutionTree = state.evolutionTarget.evolutionTree[settings.userEvolutionGenus] ??
                            state.evolutionTarget.evolutionTree[Object.keys(state.evolutionTarget.evolutionTree)[0]];

        for (let i = 0; i < evolutionTree.length; i++) {
            let evolution = evolutionTree[i];
            let costs = poly.adjustCosts(evolution.definition);

            maxRNA = Math.max(maxRNA, Number(costs["RNA"]?.() ?? 0));
            maxDNA = Math.max(maxDNA, Number(costs["DNA"]?.() ?? 0));
        }

        // Gather some resources and evolve
        let DNAForEvolution = Math.min(maxDNA - resources.DNA.currentQuantity, resources.DNA.maxQuantity - resources.DNA.currentQuantity, resources.RNA.maxQuantity / 2);
        let RNAForDNA = Math.min(DNAForEvolution * 2 - resources.RNA.currentQuantity, resources.RNA.maxQuantity - resources.RNA.currentQuantity);
        let RNARemaining = resources.RNA.currentQuantity + RNAForDNA - DNAForEvolution * 2;
        let RNAForEvolution = Math.min(maxRNA - RNARemaining, resources.RNA.maxQuantity - RNARemaining);

        let rna = game.actions.evolution.rna;
        let dna = game.actions.evolution.dna;
        for (let i = 0; i < RNAForDNA; i++) { rna.action(); }
        for (let i = 0; i < DNAForEvolution; i++) { dna.action(); }
        for (let i = 0; i < RNAForEvolution; i++) { rna.action(); }

        resources.RNA.currentQuantity = RNARemaining + RNAForEvolution;
        resources.DNA.currentQuantity = resources.DNA.currentQuantity + DNAForEvolution;

        // Lets go for our targeted evolution
        for (let i = 0; i < evolutionTree.length; i++) {
            let action = evolutionTree[i];
            if (action.isUnlocked()) {
                // Don't click challenges which already active
                let challenge = challenges.flat().find(c => c.id === action.id);
                if (challenge && game.global.race[challenge.trait]) {
                    continue;
                }
                if (action.click()) {
                    // If we successfully click the action then return to give the ui some time to refresh
                    return;
                } else {
                    // Our path is unlocked but we can't click it yet
                    break;
                }
            }
        }

        if (evolutions.mitochondria.count < 1 || resources.RNA.maxQuantity < maxRNA || resources.DNA.maxQuantity < maxDNA) {
            evolutions.mitochondria.click();
        }
        if (evolutions.eukaryotic_cell.count < 1 || resources.DNA.maxQuantity < maxDNA) {
            evolutions.eukaryotic_cell.click();
        }
        if (resources.RNA.maxQuantity < maxRNA) {
            evolutions.membrane.click();
        }
        if (evolutions.nucleus.count < 10) {
            evolutions.nucleus.click();
        }
        if (evolutions.organelles.count < 10) {
            evolutions.organelles.click();
        }

        const userImitateRace = Object.values(imitations).find(race => {
            return race.id === `s-${settings.imitateRace}`
        });

        if (game.global.race.evoFinalMenu) {
            if (userImitateRace) {
                const selectImitateRace = userImitateRace.click();

                if (!selectImitateRace) {
                    GameLog.logDanger("special", `${settings.imitateRace} not avaialble for imitation. Please select an available race.`, ['progress', 'achievements']);
                }
            } else {
                GameLog.logDanger("special", `No race selected for imitation. Please select an available race to continue.`, ['progress', 'achievements']);
            }
        }
    }

    function autoUniverseSelection() {
        if (!game.global.race['bigbang']) { return; }
        if (game.global.race.universe !== 'bigbang') { return; }
        if (settings.userUniverseTargetName === 'none') { return; }

        let action = document.getElementById(`uni-${settings.userUniverseTargetName}`);

        if (action !== null) {
            action.children[0].click();
        }
    }

    // function setPlanet from actions.js
    // Produces same set of planets, accurate for v1.0.29
    function generatePlanets() {
        let seed = game.global.race.seed;
        let seededRandom = function(min = 0, max = 1) {
            seed = (seed * 9301 + 49297) % 233280;
            let rnd = seed / 233280;
            return min + rnd * (max - min);
        }

        let avail = [];
        if (game.global.stats.achieve.lamentis?.l >= 4){
            for (let u of universes) {
                let uafx = poly.universeAffix(u);
                if (game.global.custom.planet[uafx]?.s){
                    avail.push(`${uafx}:s`);
                }
            }
        }


        let biomes = ['grassland', 'oceanic', 'forest', 'desert', 'volcanic', 'tundra', game.global.race.universe === 'evil' ? 'eden' : 'hellscape'];
        let subbiomes = ['savanna', 'swamp', ['taiga', 'swamp'], 'ashland', 'ashland', 'taiga'];
        let traits = ['toxic', 'mellow', 'rage', 'stormy', 'ozone', 'magnetic', 'trashed', 'elliptical', 'flare', 'dense', 'unstable', 'permafrost', 'retrograde', 'kamikaze'];
        let geologys = ['Copper', 'Iron', 'Aluminium', 'Coal', 'Oil', 'Titanium', 'Uranium'];
        if (game.global.stats.achieve['whitehole']) {
            geologys.push('Iridium');
        }

        let planets = [];
        let hell = false;
        let maxPlanets = Math.max(1, game.global.race.probes);
        for (let i = 0; i < maxPlanets; i++){
            let planet = {biome: 'grassland', traits: [], orbit: 365, geology: {}};

            if (avail.length > 0 && Math.floor(seededRandom(0,10)) === 0){
                let custom = avail[Math.floor(seededRandom(0,avail.length))];
                avail.splice(avail.indexOf(custom), 1);
                let target = custom.split(':');
                let p = game.global.custom.planet[target[0]][target[1]];

                planet.biome = p.biome;
                planet.traits = p.traitlist;
                planet.orbit = p.orbit;
                planet.geology = p.geology;
            } else {
                let max_bound = !hell && game.global.stats.portals >= 1 ? 7 : 6;

                let subbiome = Math.floor(seededRandom(0,3)) === 0 ? true : false;
                let idx = Math.floor(seededRandom(0, max_bound));

                if (subbiome && isAchievementUnlocked("biome_" + biomes[idx], 1) && idx < subbiomes.length) {
                    let sub = subbiomes[idx];
                    if (sub instanceof Array) {
                        planet.biome = sub[Math.floor(seededRandom(0, sub.length))];
                    } else {
                        planet.biome = sub;
                    }
                } else {
                    planet.biome = biomes[idx];
                }

                planet.traits = [];
                for (let i = 0; i < 2; i++){
                    let idx = Math.floor(seededRandom(0, 18 + (9 * i)));
                    if (traits[idx] === 'permafrost' && ['volcanic','ashland','hellscape'].includes(planet.biome)) {
                        continue;
                    }
                    if (idx < traits.length && !planet.traits.includes(traits[idx])) {
                        planet.traits.push(traits[idx]);
                    }
                }
                planet.traits.sort();
                if (planet.traits.length === 0) {
                    planet.traits.push('none');
                }

                let max = Math.floor(seededRandom(0,3));
                let top = planet.biome === 'eden' ? 35 : 30;
                if (game.global.stats.achieve['whitehole']){
                    max += game.global.stats.achieve['whitehole'].l;
                    top += game.global.stats.achieve['whitehole'].l * 5;
                }

                for (let i = 0; i < max; i++){
                    let index = Math.floor(seededRandom(0, 10));
                    if (geologys[index]) {
                        planet.geology[geologys[index]] = ((Math.floor(seededRandom(0, top)) - 10) / 100);
                    }
                }

                if (planet.biome === 'hellscape') {
                    planet.orbit = 666;
                    hell = true;
                } else if (planet.biome === 'eden') {
                    planet.orbit = 777;
                    hell = true;
                } else {
                    let maxOrbit = 600;
                    if (planet.traits.includes('elliptical')){
                        maxOrbit += 200;
                    }
                    if (planet.traits.includes('kamikaze')){
                        maxOrbit += 100;
                    }
                    planet.orbit = Math.floor(seededRandom(200, maxOrbit));
                }
            }

            let id = planet.biome + Math.floor(seededRandom(0,10000));
            planet.id = id.charAt(0).toUpperCase() + id.slice(1);

            planets.push(planet);
        }
        return planets;
    }

    function autoPlanetSelection() {
        if (game.global.race.universe === 'bigbang') { return; }
        if (!game.global.race.seeded || game.global.race['chose']) { return; }
        if (settings.userPlanetTargetName === 'none') { return; }

        let planets = generatePlanets();

        // Let's try to calculate how many achievements we can get here
        let alevel = getStarLevel(settings);
        for (let i = 0; i < planets.length; i++){
            let planet = planets[i];
            planet.achieve = 0;

            if (!isAchievementUnlocked("biome_" + planet.biome, alevel)) {
                planet.achieve++;
            }
            for (let trait of planet.traits) {
                if (trait !== "none" && !isAchievementUnlocked("atmo_" + trait, alevel)) {
                    planet.achieve++;
                }
            }
            if (planetBiomeGenus[planet.biome]) {
                for (let id in races) {
                    if (races[id].genus === planetBiomeGenus[planet.biome] && !isAchievementUnlocked("extinct_" + id, alevel)) {
                        planet.achieve++;
                    }
                }
                // All races have same genus, no need to check both
                if (!isAchievementUnlocked("genus_" + planetBiomeGenus[planet.biome], alevel)) {
                    planet.achieve++;
                }
            }
            // Target oceanic for Madagascar Tree, unless current god is already sharkin
            if (!isAchievementUnlocked("madagascar_tree", alevel) && planet.biome === "oceanic" && game.global.race.gods !== "sharkin") {
                planet.achieve++;
            }
        }

        // Now calculate weightings
        for (let i = 0; i < planets.length; i++){
            let planet = planets[i];
            planet.weighting = 0;

            planet.weighting += settings["biome_w_" + planet.biome];
            for (let trait of planet.traits) {
                planet.weighting += settings["trait_w_" + trait];
            }

            planet.weighting += planet.achieve * settings["extra_w_Achievement"];
            planet.weighting += planet.orbit * settings["extra_w_Orbit"];

            let numShow = game.global.stats.achieve['miners_dream'] ? game.global.stats.achieve['miners_dream'].l >= 4 ? game.global.stats.achieve['miners_dream'].l * 2 - 3 : game.global.stats.achieve['miners_dream'].l : 0;
            if (game.global.stats.achieve.lamentis?.l >= 0){ numShow++; }
            for (let id in planet.geology) {
                if (planet.geology[id] === 0) {
                    continue;
                }
                if (numShow-- > 0) {
                    planet.weighting += (planet.geology[id] / 0.01) * settings["extra_w_" + id];
                } else {
                    planet.weighting += (planet.geology[id] > 0 ? 1 : -1) * settings["extra_w_" + id];
                }
            }
        }

        if (settings.userPlanetTargetName === "weighting") {
            planets.sort((a, b) => b.weighting - a.weighting);
        }

        if (settings.userPlanetTargetName === "habitable") {
            planets.sort((a, b) => (planetBiomes.indexOf(a.biome) + planetTraits.indexOf(a.trait)) -
                                   (planetBiomes.indexOf(b.biome) + planetTraits.indexOf(b.trait)));
        }

        if (settings.userPlanetTargetName === "achieve") {
            planets.sort((a, b) => a.achieve !== b.achieve ? b.achieve - a.achieve :
                                   (planetBiomes.indexOf(a.biome) + planetTraits.indexOf(a.trait)) -
                                   (planetBiomes.indexOf(b.biome) + planetTraits.indexOf(b.trait)));
        }

        let selectedPlanet = document.getElementById(planets[0].id);
        if (selectedPlanet) {
            // We need a popper to avoid exception when gecking planet
            selectedPlanet.dispatchEvent(new MouseEvent("mouseover", {}));
            selectedPlanet.children[0].click();
        }
    }

