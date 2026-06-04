    function sorterHelper(event, ui) {
        let clone = $(ui).clone();
        clone.css('position','absolute');
        if (!(ui instanceof HTMLElement)) {
            ui = ui[0];
        }
        let cloneNode = clone[0];
        ui.childNodes.forEach((el, i) => {
            if (el.offsetWidth && el.offsetHeight) {
                cloneNode.childNodes[i].style.width = `${el.offsetWidth}px`;
                cloneNode.childNodes[i].style.height = `${el.offsetHeight}px`;
            }
        });
        return cloneNode;
    }

    // Util functions
    // https://gist.github.com/axelpale/3118596
    function k_combinations(set, k) {
        if (k > set.length || k <= 0) {
            return [[]];
        }
        if (k == set.length) {
            return [set];
        }
        if (k == 1) {
            return set.map(i => [i]);
        }
        let combs = [];
        let tailcombs = [];
        for (let i = 0; i < set.length - k + 1; i++) {
            tailcombs = k_combinations(set.slice(i + 1), k - 1);
            for (let j = 0; j < tailcombs.length; j++) {
                combs.push([set[i], ...tailcombs[j]])
            }
        }
        return combs;
    }

    // https://stackoverflow.com/a/44012184
    function* cartesian(head, ...tail) {
        let remainder = tail.length > 0 ? cartesian(...tail) : [[]];
        for (let r of remainder) for (let h of head) yield [h, ...r];
    }

    function average(arr) {
        return arr.reduce((sum, val) => sum + val) / arr.length;
    }

    // Script hooked to fastTick fired 4 times per second
    function ticksPerSecond() {
        return 4 / settings.tickRate / (game.global.settings.at ? 2 : 1);
    }

    // main.js -> Soldier Healing
    function getHealingRate() {
        let hc =
          (game.global.race['orbit_decayed'] && game.global.race['truepath']) ? buildings.EnceladusBase.stateOnCount :
          game.global.race['artifical'] ? buildings.BootCamp.count :
          buildings.Hospital.count;
        if (game.global.race['rejuvenated'] && game.global.stats.achieve['lamentis']){
            hc += Math.min(game.global.stats.achieve.lamentis.l, 5);
        }
        hc *= (state.astroSign === 'cancer' ? 1.05 : 1);
        hc *= game.global.tech['medic'] || 1;
        hc += (game.global.race['fibroblast'] * 2) || 0;
        if (game.global.city.s_alter?.regen > 0){
            if (hc >= 20) {
                hc *= traitVal("cannibalize", 0, '+');
            } else {
                hc += Math.floor(traitVal("cannibalize", 0) / 5);
            }
        }
        hc *= traitVal("high_pop", 2, 1);
        if (getGovernor() === 'sports') {
            hc *= 1.5;
        }
        if (buildings.Banquet.stateOnCount > 0 && buildings.Banquet.count >= 2){
            hc *= 1 + (game.global.city.banquet.strength ** 0.65) / 100;
        }
        //TODO: troll fathom
        let max_bound = 20 * traitVal('slow_regen', 0, '+');
        hc = Math.round(hc);

        // Guaranteed healing
        let healed = traitVal('regenerative', 0, 1) + Math.floor(hc / max_bound);

        // Probability to heal extra soldier
        let leftover = hc % max_bound;
        if (leftover > 0) {
            let chances = leftover * max_bound;
            let success = 0;
            for (let i = 0; i < leftover; i++) {
                for (let j = 0; j < max_bound; j++) {
                    success += i > j;
                }
            }
            healed += success / chances;
        }

        return healed;
    }

    // main.js -> food_consume_mod
    function getFoodConsume() {
        let fcm = 1;
        fcm *= traitVal('gluttony', 0, "+");
        fcm *= traitVal('high_metabolism', 0, "+");
        fcm *= traitVal('sticky', 0, "-");
        // TODO: pinguicula fathom
        if (game.global.race['photosynth']){
            switch(game.global.city.calendar.weather){
                case 0:
                    fcm *= game.global.city.calendar.temp === 0 ? 1 : traitVal('photosynth', 2, "-");
                    break;
                case 1:
                    fcm *= traitVal('photosynth', 1, "-");
                    break;
                case 2:
                    fcm *= traitVal('photosynth', 0, "-");
                    break;
            }
        }
        fcm *= traitVal('ravenous', 0, "+");
        // Prematurely increase amount of meditators if hibernation bonus is about to end
        let hibernationEnds = game.global.city.calendar.day + Math.ceil(settings.tickRate / 4) >= game.global.city.calendar.orbit;
        fcm *= game.global.city.calendar.season === 3 && !hibernationEnds ? traitVal('hibernator', 0, "-") : 1;
        fcm /= traitVal('high_pop', 0, 1);
        return fcm;
    }

    // main.js -> Citizen Growth
    function getGrowthRate() {
        if (game.global.race['artifical'] || (game.global.race['spongy'] && game.global.city.calendar.weather === 0) ||
           (game.global.race['parasite'] && game.global.city.calendar.wind === 0 && !game.global.race['cataclysm'])) {
            return 0;
        }
        let date = new Date();
        let lb = game.global.tech['reproduction'] ?? 0;
        if (haveTech('reproduction') && date.getMonth() === 1 && date.getDate() === 14) {
            lb += 5;
        }
        lb *= traitVal('fast_growth', 0, 1);
        lb += traitVal('fast_growth', 1, 0);
        if (game.global.race['spores'] && game.global.city.calendar.wind === 1){
            if (game.global.race['parasite']) {
                lb += traitVal('spores', 2);
            } else {
                lb += traitVal('spores', 0);
                lb *= traitVal('spores', 1);
            }
        }
        lb += buildings.Hospital.count * (haveTech('reproduction', 2) ? 1 : 0);
        lb += game.global.genes['birth'] ?? 0;
        lb += game.global.race['promiscuous'] ?? 0;
        lb += game.global.race['fasting'] ? (jobs.Meditator.count * traitVal('high_pop', 1, '=') * 0.15) : 0;
        lb *= (buildings.Banquet.stateOnCount > 0 && buildings.Banquet.count >= 1) ? (1 + (game.global.city.banquet.strength ** 0.75) / 100) : 1;
        lb *= (state.astroSign === 'libra' ? 1.25 : 1);
        lb *= traitVal("high_pop", 2, 1);
        lb *= (game.global.city.biome === 'taiga' ? 1.5 : 1);
        let base = resources.Population.currentQuantity * (game.global.city.ptrait.includes('toxic') ? 1.25 : 1);
        if (game.global.race['parasite'] && game.global.race['cataclysm']){
            lb = Math.round(lb / 5);
            base *= 3;
        }
        return lb / (base * 1.810792884997279 / 2);
    }

    function getResourcesPerClick() {
        return traitVal('strong', 0, 1) * (game.global.genes['enhance'] ? 2 : 1);
    }

    function getCostConflict(action) {
        let conflict = {};

        for (let priorityTarget of state.conflictTargets) {
            let blockKnowledge = true;
            for (let res in priorityTarget.cost) {
                if (res !== "Knowledge" && resources[res].currentQuantity < priorityTarget.cost[res]) {
                    blockKnowledge = false;
                    break;
                }
            }
            for (let res in priorityTarget.cost) {
                if ((res !== "Knowledge" || blockKnowledge) && priorityTarget.cost[res] > resources[res].currentQuantity - action.cost[res]) {
                    const resList = conflict.resList || [];
                    const actionList = conflict.actionList || [];
                    conflict = {res: resources[res], obj: priorityTarget, resList: [...new Set([...resList, resources[res].name])], actionList: [...new Set([...actionList, priorityTarget.name])]};
                }
            }
        }
        return $.isEmptyObject(conflict) ? null : conflict;
    }

    function getRealNumber(amountText) {
        if (amountText === "") { return 0; }

        let numericPortion = parseFloat(amountText);
        let lastChar = amountText[amountText.length - 1];

        if (numberSuffix[lastChar] !== undefined) {
            numericPortion *= numberSuffix[lastChar];
        }

        return numericPortion;
    }

    function getNumberString(amountValue) {
        let suffixes = Object.keys(numberSuffix);
        for (let i = suffixes.length - 1; i >= 0; i--) {
            if (amountValue > numberSuffix[suffixes[i]]) {
                return (amountValue / numberSuffix[suffixes[i]]).toFixed(1) + suffixes[i];
            }
        }
        return Math.ceil(amountValue);
    }

    function getNiceNumber(amountValue) {
        return parseFloat(amountValue < 1 ? amountValue.toPrecision(2) : amountValue.toFixed(2));
    }

    function getGovernor() {
        return game.global.race.governor?.g?.bg ?? "none";
    }

    function haveTask(task) {
        return Object.values(game.global.race.governor?.tasks ?? {}).includes(task);
    }

    function haveTech(research, level = 1) {
        return game.global.tech[research] && game.global.tech[research] >= level;
    }

    function isEarlyGame() {
        if (game.global.race['cataclysm'] || game.global.race['orbit_decayed'] || game.global.race['lone_survivor'] || game.global.race['warlord']) {
            return false;
        } else if (game.global.race['truepath'] || game.global.race['sludge'] || game.global.race['ultra_sludge']) {
            return !haveTech("high_tech", 7);
        } else {
            return !haveTech("mad");
        }
    }

    function isHungryRace() {
        return (game.global.race['carnivore'] && !game.global.race['herbivore'] && !game.global.race['artifical']) || game.global.race['ravenous'];
    }

    function isDemonRace() {
        return game.global.race['soul_eater'] && game.global.race['evil'] && game.global.race.species !== 'wendigo';
    }

    function isLumberRace() {
        return !game.global.race['kindling_kindred'] && !game.global.race['smoldering'];
    }

    function getOccCosts() {
        return traitVal('high_pop', 0, 1) * (game.global.civic.govern.type === "federation" ? 15 : 20);
    }

    function getGovName(govIndex) {
        let foreign = game.global.civic.foreign["gov" + govIndex];
        if (!foreign.name) {
            return "foreign power " + (govIndex + 1);
        }

        return poly.loc("civics_gov" + foreign.name.s0, [foreign.name.s1]) + ` (${govIndex + 1})`;
    }

    function getGovPower(govIndex) {
        // This function is full of hacks. But all that can be accomplished by wise player without peeking inside game variables
        // We really need to know power as accurate as possible, otherwise script becomes wonky when spies dies on mission
        let gov = game.global.civic.foreign["gov" + govIndex];
        if (gov.spy > 0) {
            // With 2+ spies we know exact number, for 1 we're assuming trick with advantage
            // We can see ambush advantage with a single spy, and knowing advantage we can calculate power
            // Proof of concept: military_power = army_offence / (5 / (1-advantage))
            // I'm not going to waste time parsing tooltips, and take that from internal variable instead
            return gov.mil;
        } else {
            // We're going to use another trick here. We know minimum and maximum power for gov
            // If current power is below minimum, that means we sabotaged it already, but spy died since that
            // We know we seen it for sure, so let's just peek inside, imitating memory
            // We could cache those values, but making it persistent in between of page reloads would be a pain
            // Especially considering that player can not only reset, but also import different save at any moment
            let minPower = [75, 125, 200, 650, 300];
            let maxPower = [125, 175, 300, 750, 300];
            if (game.global.race['truepath']) {
                [1.5, 1.4, 1.25].forEach((mod, idx) => {
                    minPower[idx] *= mod;
                    maxPower[idx] *= mod;
                });
            }

            if (gov.mil < minPower[govIndex]) {
                return gov.mil;
            } else {
                // Above minimum. Even if we ever sabotaged it, unfortunately we can't prove it. Not peeking inside, and assuming worst.
                return maxPower[govIndex];
            }
        }
    }

    var evalCache = {};
    function fastEval(s) {
        if (!evalCache[s]) {
            evalCache[s] = eval(`(function() { return ${s} })`);
        }
        return evalCache[s]();
    }

    function getVueById(elementId) {
        let element = win.document.getElementById(elementId);
        if (element === null || !element.__vue__) {
            return undefined;
        }

        return element.__vue__;
    }

    // Recursively traverse through object, wrapping all functions in getters
    function normalizeProperties(object, proto = []) {
        for (let key in object) {
            if (typeof object[key] === "object" && (object[key].constructor === Object || object[key].constructor === Array || proto.indexOf(object[key].constructor) !== -1)) {
                object[key] = normalizeProperties(object[key], proto);
            }
            if (typeof object[key] === "function") {
                let fn = object[key].bind(object);
                Object.defineProperty(object, key, {configurable: true, enumerable: true, get: () => fn()});
            }
        }
        return object;
    }

    // Add getters for setting properties
    function addProps(list, id, props) {
        for (let item of Object.values(list)) {
            for (let i = 0; i < props.length; i++) {
                let settingKey = props[i].s + id(item);
                let propertyKey = props[i].p;
                Object.defineProperty(item, propertyKey, {configurable: true, enumerable: true, get: () => settings[settingKey]});
            }
        }
        return list;
    }

    function triggerFileDownload(contents, filename) {
        let url = URL.createObjectURL(new Blob([contents]));
        let a = document.createElement('a');
        a.download = filename;
        a.href = url;
        a.click();
        // Doesn't seem like there is any good way to do this, a minute should be fine.
        setTimeout(() => { URL.revokeObjectURL(url); }, 60 * 1000);
    }

    function traitVal(trait, idx, opt) {
        if (game.global.race[trait]) {
            let val = game.traits[trait].vars()[idx];
            if (opt === "-") {
                return 1 - val / 100;
            } else if (opt === "+") {
                return 1 + val / 100;
            } else if (opt === "=") {
                return val / 100;
            } else {
                return val;
            }
        } else if (opt === '+' || opt === '-' || opt === '=') {
            return 1;
        } else {
            return opt ?? 0;
        }
    }

