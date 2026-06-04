    function autoCraft() {
        if (!resources.Population.isUnlocked()) { return; }
        if (game.global.race['no_craft']) { return; }

        craftLoop:
        for (let i = 0; i < foundryList.length; i++) {
            let craftable = foundryList[i];
            if (!craftable.isUnlocked() || !craftable.autoCraftEnabled) {
                continue;
            }

            let affordableAmount = Number.MAX_SAFE_INTEGER;
            for (let res in craftable.cost) {
                let resource = resources[res];
                let quantity = craftable.cost[res];

                affordableAmount = Math.min(affordableAmount, Math.ceil((resource.currentQuantity - (resource.maxQuantity * craftable.craftPreserve)) / quantity));

                if (craftable.isDemanded()) { // Craftable demanded, get as much as we can
                    let maxUse = (resource.currentQuantity < resource.maxQuantity * (craftable.craftPreserve + 0.05))
                      ? resource.currentQuantity : resource.spareQuantity;
                    affordableAmount = Math.min(affordableAmount, maxUse / quantity);
                } else if (resource.isDemanded() || (!resource.isCapped() && resource.usefulRatio < craftable.usefulRatio)) { // Don't use demanded resources
                    continue craftLoop;
                } else if (craftable.currentQuantity < craftable.storageRequired) { // Craftable is required, use all spare resources
                    affordableAmount = Math.min(affordableAmount, resource.spareQuantity / quantity);
                } else if (resource.currentQuantity >= resource.storageRequired || resource.isCapped()) { // Resource not required - consume income
                    affordableAmount = Math.min(affordableAmount, Math.ceil(resource.rateOfChange / ticksPerSecond() / quantity));
                } else { // Resource is required, and craftable not required. Don't craft anything.
                    continue craftLoop;
                }
            }
            affordableAmount = Math.floor(affordableAmount);
            if (affordableAmount >= 1) {
                craftable.tryCraftX(affordableAmount);
                for (let res in craftable.cost) {
                    resources[res].currentQuantity -= craftable.cost[res] * affordableAmount;
                }
            }
        }
    }

    function autoGovernment() {
        // Change government
        if (GovernmentManager.isEnabled()) {
            if (settings.govSpace !== "none" && haveTech("q_factory") && GovernmentManager.Types[settings.govSpace].isUnlocked()) {
                GovernmentManager.setGovernment(settings.govSpace);
            } else if (settings.govFinal !== "none" && GovernmentManager.Types[settings.govFinal].isUnlocked()) {
                GovernmentManager.setGovernment(settings.govFinal);
            } else if (settings.govInterim !== "none" && GovernmentManager.Types[settings.govInterim].isUnlocked()) {
                GovernmentManager.setGovernment(settings.govInterim);
            }
        }

        // Appoint governor
        if (haveTech("governor") && settings.govGovernor !== "none" && getGovernor() === "none") {
            let candidates = game.global.race.governor?.candidates ?? [];
            for (let i = 0; i < candidates.length; i++) {
                if (candidates[i].bg === settings.govGovernor) {
                    getVueById("candidates")?.appoint(i);
                    break;
                }
            }
        }
    }

    function autoMerc() {
        let m = WarManager;
        if (!m._garrisonVue || !m.isMercenaryUnlocked() || m.maxCityGarrison <= 0) {
            return;
        }

        let mercenaryCost = m.mercenaryCost;
        let mercenariesHired = 0;
        let mercenaryMax = m.maxSoldiers - settings.foreignHireMercDeadSoldiers;
        let maxCost = state.moneyMedian * settings.foreignHireMercCostLowerThanIncome;
        let minMoney = Math.max(resources.Money.maxQuantity * settings.foreignHireMercMoneyStoragePercent / 100, Math.min(resources.Money.maxQuantity - maxCost, (settings.storageAssignExtra ? resources.Money.storageRequired / 1.03 : resources.Money.storageRequired)));
        if (state.goal === "Reset") { // Get as much as possible before reset
            mercenaryMax = m.maxSoldiers;
            minMoney = 0;
            maxCost = Number.MAX_SAFE_INTEGER;
        }
        while (m.currentSoldiers < mercenaryMax && resources.Money.currentQuantity >= mercenaryCost &&
              (resources.Money.spareQuantity - mercenaryCost > minMoney || mercenaryCost < maxCost) &&
            m.hireMercenary()) {
            mercenariesHired++;
            mercenaryCost = m.mercenaryCost;
        }

        // Log the interaction
        if (mercenariesHired === 1) {
            GameLog.logSuccess("mercenary", `Hired a mercenary to join the garrison.`, ['combat']);
        } else if (mercenariesHired > 1) {
            GameLog.logSuccess("mercenary", `Hired ${mercenariesHired} mercenaries to join the garrison.`, ['combat']);
        }
    }

    function autoSpy() {
        let m = SpyManager;
        if (!m._foreignVue || haveTask("combo_spy") || haveTask("spyop") || !haveTech("spy")) {
            return;
        }

        // Have no excess money, nor ability to use spies
        if (!haveTech("spy", 2) && resources.Money.storageRatio < 0.9) {
            return;
        }

        // Train spies
        if (settings.foreignTrainSpy) {
            for (let foreign of m.foreignActive) {
                // Spy already in training, or can't be afforded, or foreign is under control
                if (m._foreignVue.spy_disabled(foreign.id) || foreign.gov.occ || foreign.gov.anx || foreign.gov.buy) {
                    continue;
                }

                let spiesRequired = settings.foreignSpyMax >= 0 ? settings.foreignSpyMax : Number.MAX_SAFE_INTEGER;
                if (spiesRequired < 1 && foreign.policy !== "Occupy" && foreign.policy !== "Ignore") {
                    spiesRequired = 1;
                }
                // We need 3 spies to purchase, but only if we have enough money cap to purchase
                if (spiesRequired < 3 && foreign.policy === "Purchase" && resources.Money.maxQuantity >= poly.govPrice(foreign.id)) {
                    spiesRequired = 3;
                }

                // We reached the max number of spies allowed
                if (foreign.gov.spy >= spiesRequired || (m.purchaseMoney > 0 && foreign.policy !== "Purchase" && foreign.gov.spy > 0)){
                    continue;
                }

                GameLog.logSuccess("spying", `Training a spy to send against ${getGovName(foreign.id)}.`, ['spy']);
                m._foreignVue.spy(foreign.id);
            }
        }

        // We can't use our spies yet
        if (!haveTech("spy", 2)) {
            return;
        }

        // Perform espionage
        for (let foreign of m.foreignActive) {
            // Spy is missing, busy, or have nosthing to do
            if (foreign.gov.spy < 1 || foreign.gov.sab !== 0 || foreign.policy === "None") {
                continue;
            }

            let espionageMission = null;
            if (foreign.policy === "Betrayal") {
                if (foreign.gov.mil <= 75 || foreign.gov.hstl <= 0) {
                    espionageMission = m.Types.Sabotage;
                } else {
                    espionageMission = m.Types.Influence;
                }
            } else if (foreign.policy === "Occupy") {
                espionageMission = m.Types.Sabotage;
            } else {
                espionageMission = m.Types[foreign.policy];
            }
            if (!espionageMission) {
                continue;
            }

            // Don't kill spies doing other things if we already can purchase
            if (m.purchaseMoney > 0 && m.purchaseForeigngs.includes(foreign.id) && espionageMission === m.Types.Purchase && foreign.gov.spy < 3 && !game.global.race['elusive']) {
                continue;
            }

            // Unoccupy power if it's controlled, but we want something different
            if ((foreign.gov.anx && foreign.policy !== "Annex") ||
                (foreign.gov.buy && foreign.policy !== "Purchase") ||
                (foreign.gov.occ && foreign.policy !== "Occupy")){
                WarManager.release(foreign.id);
                foreign.released = true;
            } else if (!foreign.gov.anx && !foreign.gov.buy && !foreign.gov.occ) {
                m.performEspionage(foreign.id, espionageMission.id, foreign !== m.foreignTarget);
            }
        }
    }

