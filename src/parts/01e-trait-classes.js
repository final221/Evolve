    class MinorTrait {
        constructor(traitName) {
            this.traitName = traitName;
        }

        get enabled() { return settings['mTrait_' + this.traitName] }
        get priority() { return settingsRaw['mTrait_p_' + this.traitName] }
        get weighting() { return settings['mTrait_w_' + this.traitName] }

        isUnlocked() {
            return game.global.settings.mtorder.includes(this.traitName);
        }

        geneCount() {
            return game.global.race.minor[this.traitName] ?? 0;
        }

        phageCount() {
            return game.global.genes.minor[this.traitName] ?? 0;
        }

        totalCount() {
            return game.global.race[this.traitName] ?? 0;
        }

        geneCost() {
            return this.traitName === 'mastery' ? Fibonacci(this.geneCount()) * 5 : Fibonacci(this.geneCount());
        }
    }

    class MutableTrait {
        constructor(traitName) {
            this.traitName = traitName;
            this.baseCost = Math.abs(game.traits[traitName].val);
            this.isPositive = game.traits[traitName].val >= 0;
        }

        get gainEnabled() { return settings["mutableTrait_gain_" + this.traitName] }
        get purgeEnabled() { return settings["mutableTrait_purge_" + this.traitName] }
        get resetEnabled() { return settings["mutableTrait_reset_" + this.traitName] }
        get priority() { return settingsRaw["mutableTrait_p_" + this.traitName] }

        get name(){
            return game.loc("trait_" + this.traitName + "_name");
        }

        canGain() {
            if (game.global.race.species === "hellspawn" && game.global.race['warlord']) {
                return false;
            }

            return this.gainEnabled && !this.purgeEnabled && this.canMutate("gain")
              && game.global.race[this.traitName] === undefined
              && !conflictingTraits.some((set) => (set[0] === this.traitName && game.global.race[set[1]] !== undefined)
                                               || (set[1] === this.traitName && game.global.race[set[0]] !== undefined));
        }

        canPurge() {
            return this.purgeEnabled && !this.gainEnabled && this.canMutate("purge")
              && game.global.race[this.traitName] !== undefined
              && !((game.global.race.species === "sludge" || game.global.race.species === "ultra_sludge") && this.traitName === "ooze")
              && !(game.global.race.ss_traits?.includes(this.traitName))
              && !(game.global.race.iTraits?.hasOwnProperty(this.traitName));
        }

        canMutate(action) {
            let currentPlasmids = resources[game.global.race.universe === "antimatter" ? "AntiPlasmid" : "Plasmid"].currentQuantity;
            return currentPlasmids - this.mutationCost(action) >= MutableTraitManager.minimumPlasmidsToPreserve
              && !((game.global.race.species === "sludge" || game.global.race.species === "ultra_sludge") && game.global.race["modified"]);
        }

        mutationCost(action) {
            let mult = mutationCostMultipliers[game.global.race.species]?.[action] ?? 1;
            let multGenus = mutationCostMultipliersGenus[game.races[game.global.race.species].type]?.[action] ?? 1;
            return this.baseCost * 5 * mult * multGenus;
        }
    }

    class MajorTrait extends MutableTrait {
        constructor(traitName) {
            super(traitName);
            this.type = "major";
            let ownerRace = Object.entries(game.races)
              .filter(([id, race]) => id !== "custom" && id !== "hybrid" && race.traits[traitName] !== undefined)
              .map(([id, race]) => ({id: id, genus: race.type}))[0] ?? {};
            this.source = ownerRace.id ?? specialRaceTraits[traitName] ?? "";
            this.racesThatCanGain = (Object.entries(game.races)
            .filter(([id, race]) => id == ownerRace.id || (race?.type == 'hybrid' ? race?.hybrid?.includes(ownerRace.genus) : race?.type === ownerRace.genus))
            .map(([id, race]) => id))
            .flat();

            this.genus = this.source === 'reindeer' ? 'herbivore' : ownerRace.genus;
        }

        isGainable() {
            return this.traitName !== "frail" && this.traitName !== "ooze";
        }

        canGain() {
            return super.canGain()
              && game.global.genes["mutation"] >= 3
              && this.racesThatCanGain.includes(game.global.race.species);
        }

        canPurge() {
            return super.canPurge()
              && game.global.genes["mutation"] >= 1;
        }
    }

    class GenusTrait extends MutableTrait {
        constructor(traitName) {
            super(traitName);
            this.type = "genus";
            let genus = Object.entries(poly.genus_traits)
              .filter(([id, traits]) => traits[traitName] !== undefined)
              .map(([id, traits]) => id);
            this.source = genus[0] ?? specialRaceTraits[traitName] ?? "";
            this.genus = this.source;
        }

        isGainable() {
            return false;
        }

        canGain() {
            return false;
        }

        canPurge() {
            return super.canPurge()
              && game.global.genes["mutation"] >= 2;
        }
    }

    // Script constants

    // Fibonacci numbers starting from "5"
    const Fibonacci = ((m) => (n) => m[n] ?? (m[n] = Fibonacci(n-1) + Fibonacci(n-2)))([5,8]);

