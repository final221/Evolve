    function formatLogString(logString, replacements) {
        logString = logString.replace(/\{eval:([^}]+)\}/g, (match, evalString) => {
            try {
              return fastEval(evalString);
            } catch(e) {
              return match;
            }
          });

        return logString.replace(/{(\w+)}/g, (placeholderWithDelimiters, placeholderWithoutDelimiters) =>
            replacements.hasOwnProperty(placeholderWithoutDelimiters) ? replacements[placeholderWithoutDelimiters] : placeholderWithDelimiters
        );
    }

    function logPrestige() {
        var placeholders = {};
        placeholders.resetType = prestigeTypes.find(prest => prest.val === settings.prestigeType).label;
        placeholders.timeStamp = game.global.stats.days;
        placeholders.species = game.global.race.species.charAt(0).toUpperCase() + game.global.race.species.slice(1);

        GameLog.logInfo("prestige", formatLogString(settings.log_prestige_format, placeholders), ['achievements']);
    }

    function autoPrestige() {
        const tryReset = (check, act) => {
            if (check) {
                if (state.goal !== 'Reset') {
                    state.goal = 'Reset';
                    return; // Delay reset for one tick, to let script buy mercs and such
                }
                act();
            }
        };

        switch (settings.prestigeType) {
            case 'none':
                return;
            case 'mad':
                let madVue = getVueById("mad");
                return tryReset(madVue?.display && haveTech("mad"), () => {
                    if (madVue.armed) {
                        madVue.arm();
                    }

                    if (!settings.prestigeMADWait || (WarManager.currentSoldiers >= WarManager.maxSoldiers && resources.Population.currentQuantity >= resources.Population.maxQuantity && WarManager.currentSoldiers + resources.Population.currentQuantity >= settings.prestigeMADPopulation)) {
                        state.goal = "GameOverMan";
                        logPrestige();
                        madVue.launch();
                    }
                });
            case 'bioseed':
                return tryReset(isBioseederPrestigeAvailable(), () => {
                    // Ship completed and probe requirements met
                    if (buildings.GasSpaceDockLaunch.isUnlocked()) {
                        buildings.GasSpaceDockLaunch.click();
                    } else if (buildings.GasSpaceDockPrepForLaunch.isUnlocked()) {
                        buildings.GasSpaceDockPrepForLaunch.click();
                    } else {
                        // Open the modal to update the options
                        buildings.GasSpaceDock.cacheOptions();
                    }
                });
            case 'cataclysm':
                return tryReset(isCataclysmPrestigeAvailable(), () => {
                    if (settings.autoEvolution) {
                        loadQueuedSettings(); // Cataclysm doesnt't have evolution stage, so we need to load settings here, before reset
                    }
                    if (techIds["tech-dial_it_to_11"].isClickable()) {
                        logPrestige();
                        techIds["tech-dial_it_to_11"].click();
                    }
                });
            case 'whitehole':
                return tryReset(isWhiteholePrestigeAvailable(), () => {
                    // Solar mass requirements met and research available
                    if (techIds["tech-exotic_infusion"].isUnlocked() && techIds["tech-exotic_infusion"].isAffordable()) {
                        logPrestige();
                    }
                    ["tech-infusion_confirm", "tech-infusion_check", "tech-exotic_infusion"].forEach(id => techIds[id].click());
                });
            case 'apocalypse':
                return tryReset(isApocalypsePrestigeAvailable(), () => {
                    logPrestige();
                    ["tech-protocol66", "tech-protocol66a"].forEach(id => techIds[id].click());
                });
            case 'ascension':
                if (game.global.race['witch_hunter']) {
                    return tryReset(isWitchAscensionPrestigeAvailable(), () => {
                        KeyManager.set(false, false, false);
                        logPrestige();
                        buildings.PitAbsorptionChamber.vue.action(); // Hack to bypass "count < max" check
                        state.goal = "GameOverMan";
                    });
                } else {
                    return tryReset(isAscensionPrestigeAvailable(), () => {
                        KeyManager.set(false, false, false);
                        buildings.SiriusAscend.click();
                    });
                }
            case 'demonic':
                if (game.global.race['witch_hunter']) {
                    return tryReset(isWitchAscensionPrestigeAvailable(true), () => {
                        KeyManager.set(false, false, false);
                        logPrestige();
                        buildings.PitAbsorptionChamber.vue.action(); // Hack to bypass "count < max" check
                        state.goal = "GameOverMan";
                    });
                } else {
                    return tryReset(isDemonicPrestigeAvailable(), () => {
                        logPrestige();
                        if (game.global.race['fasting']) {
                            techIds["tech-final_ingredient"].click();
                        } else {
                            techIds["tech-demonic_infusion"].click();
                        }
                    });
                }
            case 'terraform':
                return tryReset(buildings.RedTerraform.isUnlocked(), () => {
                    KeyManager.set(false, false, false);
                    buildings.RedTerraform.click();
                });
            case 'matrix':
                return tryReset(buildings.TauStarBluePill.isUnlocked(), () => {
                    KeyManager.set(false, false, false);
                    buildings.TauStarBluePill.click();
                });
            case 'apotheosis':
                return tryReset(buildings.PalaceApotheosis.isUnlocked(), () => {
                    KeyManager.set(false, false, false);
                    buildings.PalaceApotheosis.click();
                });
            case 'vacuum':
            case 'retire':
            case 'eden':
                // Nothing required, handled externaly
                return;
        }
    }

    function isPrestigeAllowed(type) {
        return settings.autoPrestige && !(settings.prestigeWaitAT && game.global.settings.at > 0) && (!type || settings.prestigeType === type);
    }

    function isCataclysmPrestigeAvailable() {
        return techIds["tech-dial_it_to_11"].isUnlocked();
    }

    function isBioseederPrestigeAvailable() {
        return !isGECKNeeded() && buildings.GasSpaceDock.count >= 1 && buildings.GasSpaceDockShipSegment.count >= 100 && buildings.GasSpaceDockProbe.count >= settings.prestigeBioseedProbes;
    }

    function isWhiteholePrestigeAvailable() {
        return getBlackholeMass() >= settings.prestigeWhiteholeMinMass && (techIds["tech-exotic_infusion"].isUnlocked() || techIds["tech-infusion_check"].isUnlocked() || techIds["tech-infusion_confirm"].isUnlocked());
    }

    function isApocalypsePrestigeAvailable() {
        return techIds["tech-protocol66"].isUnlocked() || techIds["tech-protocol66a"].isUnlocked();
    }

    function isAscensionPrestigeAvailable() {
        return buildings.SiriusAscend.isUnlocked() && isPillarFinished();
    }

    function isWitchAscensionPrestigeAvailable(demonic) {
        if (demonic && (!haveTech("forbidden", 5) || (game.global.race['fasting'] && !haveTech("dish", 2)))) {
            return false;
        }
        return buildings.PitAbsorptionChamber.count >= 100 && buildings.PitSoulCapacitor.instance.energy >= 100000000 && isPillarFinished();
    }

    function isDemonicPrestigeAvailable() {
        if (settings.autoMech && ((MechManager.isActive && settings.prestigeDemonicPotential < 1) || MechManager.mechsPotential > settings.prestigeDemonicPotential)) {
            return false;
        }
        let resetTech = techIds[game.global.race['fasting'] ? "tech-final_ingredient" : "tech-demonic_infusion"];
        return buildings.SpireTower.count > settings.prestigeDemonicFloor && resetTech.isUnlocked() && resetTech.isAffordable();
    }

    function isPillarFinished() {
        let speciesPillarLevel = game.global.pillars[game.global.race.species];
        let canPillar = !speciesPillarLevel && resources.Harmony.currentQuantity >= 1 && game.global.race.universe !== 'micro';
        let canUpgrade = speciesPillarLevel && speciesPillarLevel < game.alevel() && game.global.race.universe !== 'micro';
        // Always consider pillared if user doesn't want to wait for pillar, OR can't pillar + can't upgrade existing pillar
        return !settings.prestigeAscensionPillar || (!canPillar && !canUpgrade);
    }

    function isGECKNeeded() {
        return isAchievementUnlocked("lamentis", 5, "standard") && buildings.GasSpaceDockGECK.count < settings.prestigeGECK;
    }

    function getBlackholeMass() {
        let engine = game.global.interstellar.stellar_engine;
        return engine ? engine.mass + engine.exotic : 0;
    }

    function autoShapeshift() {
        if (!game.global.race['shapeshifter'] || settings.shifterGenus === "ignore" || game.global.race.ss_genus === settings.shifterGenus) {
            return false;
        }

        // TODO: Do not imitate own genus.
        getVueById('sshifter')?.setShape(settings.shifterGenus);
    }

    var psychicPowerCost = {
        murder: [10, 8],
        boost: [75, 60],
        assault: [45, 36],
        profit: [65, 52],
        mind_break: [80, 64],
        stun: [100, 80]
    };

    function autoPsychic() {
        if (settings.psychicPower === "none" || !game.global.race['psychic'] || !game.global.tech['psychic'] || resources.Energy.storageRatio < 1) {
            return false;
        }
        let vue = null;
        const canAfford = (p) => resources.Energy.currentQuantity >= psychicPowerCost[p][game.global.tech.psychic >= 5 ? 1 : 0];

        if (settings.psychicPower === "murder" || (settings.psychicPower !== "boost" && game.global.stats.psykill < 10)) {
            if (resources.Population.currentQuantity > 0 && canAfford("murder") && (vue = getVueById('psychicKill'))) {
                vue.murder();
                return; // Always perform 10 murders asap to unlock advanced powers
            }
        }

        if (game.global.tech['psychicthrall'] && game.global.tech['unfathomable'] && game.global.race['unfathomable']) {
            let jailed = resources.Thrall.rateOfChange;
            let cells = resources.Thrall.storageRatio;

            if (settings.psychicPower === "auto" || settings.psychicPower === "mind_break") {
                if ((jailed > 1 || (jailed === 1 && cells === 1)) && canAfford("mind_break") && (vue = getVueById('psychicMindBreak'))) {
                    vue.breakMind();
                    return; // If we have more than one jailed it means that tormenter can't keep up with capture speed for some reason, and need some assistment
                }
            }

            if (settings.psychicPower === "auto" || settings.psychicPower === "stun") {
                if ((game.global.tech.psychicthrall >= 2 && cells < 1) && canAfford("stun") && (vue = getVueById('psychicCapture'))) {
                    vue.stun();
                    return; // That's what we really want, new thrall
                }
            }
        }

        const haveRoom = r => r.currentQuantity + (r.income * 1.5 * 300) < r.maxQuantity;
        let powers = game.global.race.psychicPowers;
        if (settings.psychicPower === "auto" || settings.psychicPower === "profit") {
            if (game.global.tech.psychic >= 3 && haveRoom(resources.Money) && !powers.cash && canAfford("profit") && (vue = getVueById('psychicFinance'))) {
                vue.boostVal();
                return; // More money is always welcomed
            }
        }

        if (settings.psychicPower === "auto" || settings.psychicPower === "boost") {
            if (!powers.boostTime && canAfford("boost")) {
                let boosted = null;
                if (settings.psychicBoostRes === "auto") {
                    let boostable = Object.values(resources).filter(r => r.isUnlocked() && r.atomicMass > 0 && haveRoom(r))
                        .sort((a, b) => b.income - a.income);
                    if (boostable.length > 0) {
                        boosted = boostable[0].id;
                    }
                } else {
                    boosted = settings.psychicBoostRes;
                }

                if (boosted && (vue = getVueById('psychicBoost'))) {
                    $(`#psychicBoost #psyhscrolltarget input[value="${boosted}"]`).click();
                    vue.boostVal();
                    return; // Try to find something that have some good income, and still have a room for more resources
                }
            }
        }

        if (settings.psychicPower === "auto" || settings.psychicPower === "assault") {
            if (game.global.tech.psychic >= 2 && !powers.assaultTime && canAfford("assault") && (vue = getVueById('psychicAssault'))) {
                vue.boostVal();
                return; // Very last option, attack boost
            }
        }
    }

    const ocularPowerData = [
        { key: "d", id: "disintegration", locParam: ["X"] },
        { key: "p", id: "petrification", locParam: [resources.Stone.name] },
        { key: "w", id: "wound", locParam: ["X"] },
        { key: "t", id: "telekinesis", locParam: ["X"] },
        { key: "f", id: "fear", locParam: undefined },
        { key: "c", id: "charm", locParam: ["X"] },
    ];

    function autoOcularPowers() {
        if (!game.global.race['ocular_power'] || !game.global.race['ocularPowerConfig']) {
            return false;
        }

        const vue = getVueById("ocularPower");
        if (!vue) return false;

        let powerCap = traitVal('ocular_power', 0);
        if (powerCap < 1) return false;

        let allPowers = ocularPowerData.map((p) => {
            return {
                key: p.key,
                id: p.id,
                enabled: Boolean(settings[`ocularPower_${p.id}`]),
                priority: Number(settings[`ocularPower_p_${p.id}`]),
            }
        }).sort((a, b) => b.priority - a.priority);
        let enabledPowers = 0;
        allPowers.forEach(p => {
            let enable = p.enabled && (enabledPowers < powerCap);
            if (enable) enabledPowers++;

            if (vue[p.key] !== enable) {
                document.getElementById(`ocular${p.id}`).querySelector("input").click();
            }
        });
    }

    const wishData = {
        minor: [
            { id: "Know", loc: "resource_Knowledge_name" },
            { id: "Money", loc: "resource_Money_name" },
            { id: "Res", loc: "wish_resources" },
            { id: "Love", loc: "wish_love" },
            { id: "Excite", loc: "wish_event" },
            { id: "Fame", loc: "wish_fame" },
            { id: "Strength", loc: "wish_strength" },
            { id: "Influence", loc: "wish_influence" },
        ],
        major: [
            { id: "BigMoney", loc: "wish_big_money" },
            { id: "BigRes", loc: "wish_big_resources" },
            { id: "Plasmid", loc: "wish_plasmid" },
            { id: "Power", loc: "wish_power" },
            { id: "Adoration", loc: "wish_adoration" },
            { id: "Thrill", loc: "wish_thrill" },
            { id: "Peace", loc: "wish_peace" },
            { id: "Greatness", loc: "wish_greatness" },
        ],
    };
    function autoWish() {
        if (!game.global.race['wish'] || !game.global.tech['wish']) {
            return false;
        }

        if (game.global.race.wishStats.minor === 0 && settings.wishMinor !== "none") {
            const vueMinor = getVueById("minorWish");
            if (!vueMinor) return false;

            $(`#wish${settings.wishMinor}`).click();
        }

        if (game.global.tech['wish'] >= 2 && game.global.race.wishStats.major === 0 && settings.wishMajor !== "none") {
            const vueMajor = getVueById("majorWish");
            if (!vueMajor) return false;

            $(`#wish${settings.wishMajor}`).click();
        }
    }

    function autoGenetics() {
        let genetics = game.global.tech.genetics;
        let mutations = game.global.race.mutation;
        if (!genetics) {
            return; // Genetics not researched yet
        }

        let geneticsVue = getVueById("arpaSequence");
        let seq = game.global.arpa.sequence;
        if (!geneticsVue || !seq) {
            return; // Just in case
        }

        if ((settings.geneticsSequence === "enabled" && !seq.on) ||
            (settings.geneticsSequence === "disabled" && seq.on) ||
            (settings.geneticsSequence === "decode" &&
                ((seq.on && mutations >= 1) ||
                (!seq.on && mutations < 1))
            )) {
            geneticsVue.toggle();
        }

        if (genetics < 5) {
            return; // Boost not researched yet
        }

        if ((settings.geneticsBoost === "enabled" && !seq.boost) ||
            (settings.geneticsBoost === "disabled" && seq.boost)) {
            geneticsVue.booster();
        }

        if (genetics < 6) {
            return; // Assembling not researched yet
        }

        if ((settings.geneticsAssemble === "enabled" && !seq.auto) ||
            (settings.geneticsAssemble === "disabled" && seq.auto)) {
            geneticsVue.auto_seq();
        }

        if (settings.geneticsAssemble !== "auto" || resources.Knowledge.currentQuantity < 200000 || resources.Knowledge.isDemanded()) {
            return; // Auto assembling disabled, knowledge is too low, or demanded
        }

        let nextTickKnowledge = resources.Knowledge.currentQuantity + resources.Knowledge.rateOfChange / ticksPerSecond();
        let overflowKnowledge = nextTickKnowledge - resources.Knowledge.maxQuantity;
        if (overflowKnowledge <= 0) {
            return; // No overflow yet, we can wait untill next script tick
        }

        let genesToAssemble = Math.ceil(overflowKnowledge / 200000);
        resources.Knowledge.currentQuantity -= 200000 * genesToAssemble;
        resources.Genes.currentQuantity += 1 * genesToAssemble;

        for (let m of KeyManager.click(genesToAssemble)) {
            geneticsVue.novo();
        }
    }

