    function autoBattle() {
        let sm = SpyManager;
        let m = WarManager;
        if (!m._garrisonVue || !sm._foreignVue || m.maxCityGarrison <= 0 || state.goal === "Reset" || settings.foreignPacifist) {
            return;
        }


        // If we are not fully ready then return
        let healthyMin = settings.foreignAttackHealthySoldiersPercent / 100;
        let livingMin = (settings.foreignProtect === "auto" && m.wounded <= 0) ? 0
          : settings.foreignAttackLivingSoldiersPercent / 100;
        if ((m.wounded > (1 - healthyMin) * m.maxCityGarrison) ||
            (m.currentCityGarrison < livingMin * m.maxCityGarrison)) {
            return;
        }

        let minAdv = settings.foreignMinAdvantage;
        let maxAdv = settings.foreignMaxAdvantage;

        // Calculating safe size of battalions, if needed
        let protectSoldiers = settings.foreignProtect === "always" ? true : false;
        if (settings.foreignProtect === "auto") {
            let garrison = game.global.civic.garrison;
            let timeToRecruit = (m.deadSoldiers * 100 - garrison.progress) / (garrison.rate * 4) // Recruitmen ticks in short loop - 4 times per second
            let timeToHeal = m.wounded / getHealingRate() * 5; // Heal tick in long loop - once per 5 seconds
            protectSoldiers = timeToRecruit > timeToHeal;
        }
        if (protectSoldiers) {
            minAdv = Math.max(minAdv, 80);
            maxAdv = Math.max(maxAdv, minAdv)
        }

        // TODO: Configurable max
        let maxBattalion = new Array(5).fill(m.availableGarrison);
        let requiredBattalion = m.maxCityGarrison;
        if (protectSoldiers) {
            let armor = (traitVal('scales', 0) + (game.global.tech.armor ?? 0)) / traitVal('armored', 0, '-') - traitVal('frail', 0);
            let protectedBattalion = [5, 10, 25, 50, 999].map((cap, tactic) => (armor >= (cap * traitVal('high_pop', 0, 1)) ? Number.MAX_SAFE_INTEGER : ((5 - tactic) * (armor + (game.global.city.ptrait.includes('rage') ? 1 : 2)) - 1)));
            maxBattalion = protectedBattalion.map(soldiers => Math.min(soldiers, m.availableGarrison));
            requiredBattalion = 0;
        }
        maxBattalion[4] = Math.min(maxBattalion[4], settings.foreignMaxSiegeBattalion);

        let requiredTactic = 0;

        // Check if there's something that we want and can occupy, and switch to that target if found
        let currentTarget = sm.foreignTarget;
        for (let foreign of sm.foreignActive) {
            if (foreign.policy === "Occupy" && !foreign.gov.occ) {
                let soldiersMin = m.getSoldiersForAdvantage(settings.foreignMinAdvantage, 4, foreign.id);
                if (soldiersMin <= (settings.autoHell && m._hellVue ? m.maxSoldiers - m.hellReservedSoldiers : m.maxCityGarrison)) {
                    currentTarget = foreign;
                    requiredBattalion = Math.max(soldiersMin, Math.min(m.availableGarrison, m.getSoldiersForAdvantage(settings.foreignMaxAdvantage, 4, foreign.id) - 1));
                    requiredTactic = 4;
                    if (m.availableGarrison < (requiredBattalion / 2 + getOccCosts()) && m.availableGarrison < m.maxCityGarrison) {
                        return; // Wait for more soldiers
                    } else {
                        break;
                    }
                }
            }
        }
        // Nothing to attack
        if (!currentTarget) {
            return;
        }

        if (requiredTactic !== 4) {
            // If we don't need to occupy our target, then let's find best tactic for plundering
            // Never try siege if it can mess with unification
            for (let i = !settings.foreignUnification || settings.foreignOccupyLast ? 4 : 3; i >= 0; i--) {
                let soldiersMin = m.getSoldiersForAdvantage(minAdv, i, currentTarget.id);
                if (soldiersMin <= maxBattalion[i]) {
                    requiredBattalion = Math.max(soldiersMin, Math.min(maxBattalion[i], m.availableGarrison, m.getSoldiersForAdvantage(maxAdv, i, currentTarget.id) - 1));
                    requiredTactic = i;
                    break;
                }
            }
            // Not enough healthy soldiers, keep resting
            if (!requiredBattalion || requiredBattalion > m.availableGarrison) {
                return;
            }
        }

        // Occupy can pull soldiers from ships, let's make sure it won't happen
        if (!currentTarget.released && (currentTarget.gov.anx || currentTarget.gov.buy || currentTarget.gov.occ)) {
            // If it occupied currently - we'll get enough soldiers just by unoccupying it
            m.release(currentTarget.id);
        }
        else if (requiredTactic === 4 && game.global.settings.showPortal) {
            let missingSoldiers = getOccCosts() - (m.currentCityGarrison - requiredBattalion);
            if (missingSoldiers > 0) {
                // Not enough soldiers in city, let's try to pull them from hell
                if (!settings.autoHell || !m._hellVue || m.hellSoldiers - m.hellReservedSoldiers < missingSoldiers) {
                    return;
                }
                let patrolsToRemove = Math.ceil((missingSoldiers - m.hellGarrison) / m.hellPatrolSize);
                if (patrolsToRemove > 0) {
                    m.removeHellPatrol(patrolsToRemove);
                }
                m.removeHellGarrison(missingSoldiers);
            }
        }

        // Set attack type
        m.setTactic(requiredTactic);

        // Now adjust our battalion size to fit between our campaign attack rating ranges
        let deltaBattalion = requiredBattalion - m.raid;
        if (deltaBattalion > 0) {
            m.addBattalion(deltaBattalion);
        }
        if (deltaBattalion < 0) {
            m.removeBattalion(deltaBattalion * -1);
        }

        // Log the interaction
        let campaignTitle = m.getCampaignTitle(requiredTactic);
        let battalionRating = game.armyRating(m.raid, "army");
        let advantagePercent = m.getAdvantage(battalionRating, requiredTactic, currentTarget.id).toFixed(1);
        GameLog.logSuccess("attack", `Launching ${campaignTitle} campaign against ${getGovName(currentTarget.id)} with ${currentTarget.gov.spy < 1 ? "~" : ""}${advantagePercent}% advantage.`, ['combat']);

        m.launchCampaign(currentTarget.id);
    }

    function autoHell() {
        let m = WarManager;
        if (!m._garrisonVue || !m._hellVue) {
            return;
        }

        if (game.global.race['warlord']) {

            let enemies = m.enemies;

            if (enemies > 0 && settings.warlordHandleFortress) {

                let targetMinions = settings.warlordMinimumMinions;
                let minionCount = m.minions;

                if (minionCount > targetMinions) {
                    m.attackEnemyFortress(0); // first enemy fortress
                }
            }

            return;  // the rest of autoHell is broken for Warlord
        }

        // Determine Patrol size and count
        let targetHellSoldiers = 0;
        let targetHellPatrols = 0;
        let targetHellPatrolSize = 0;
        let homeSoldiers = settings.hellHomeGarrison;
        if ((buildings.ElysiumFortress.isUnlocked() || buildings.ElysiumScout.isUnlocked()) && homeSoldiers < 100) {
            homeSoldiers = 100;
        }
        // First handle not having enough soldiers, then handle patrols
        // Only go into hell at all if soldiers are close to full, or we are already there
        if (m.maxSoldiers > homeSoldiers + settings.hellMinSoldiers &&
           (m.hellSoldiers > settings.hellMinSoldiers || (m.currentSoldiers >= m.maxSoldiers * settings.hellMinSoldiersPercent / 100))) {
            targetHellSoldiers = Math.min(m.currentSoldiers, m.maxSoldiers) - homeSoldiers; // Leftovers from an incomplete patrol go to hell garrison
            let availableHellSoldiers = targetHellSoldiers - m.hellReservedSoldiers;

            // Determine target hell garrison size
            // Estimated average damage is roughly 35 * threat / defense, so required defense = 35 * threat / targetDamage
            // But the threat hitting the fortress is only an intermediate result in the bloodwar calculation, it happens after predators and patrols but before repopulation,
            // So siege threat is actually lower than what we can see. Patrol and drone damage is wildly swingy and hard to estimate, so don't try to estimate the post-fight threat.
            // Instead base the defense on the displayed threat, and provide an option to bolster defenses when the walls get low. The threat used in the calculation
            // ranges from 1 * threat for 100% walls to the multiplier entered in the settings at 0% walls.
            let hellWallsMulti = settings.hellLowWallsMulti * (1 - game.global.portal.fortress.walls / 100); // threat modifier from damaged walls = 1 to lowWallsMulti
            let hellTargetFortressDamage = game.global.portal.fortress.threat * 35 / settings.hellTargetFortressDamage; // required defense to meet target average damage based on current threat
            let hellTurretPower = buildings.PortalTurret.stateOnCount * (game.global.tech['turret'] ? (game.global.tech['turret'] >= 2 ? 70 : 50) : 35); // turrets count and power
            let hellGarrison = m.getSoldiersForAttackRating(Math.max(0, hellWallsMulti * hellTargetFortressDamage - hellTurretPower)); // don't go below 0

            // Always have at least half our hell contingent available for patrols, and if we cant defend properly just send everyone
            if (availableHellSoldiers < hellGarrison) {
                hellGarrison = 0; // If we cant defend adequately, send everyone out on patrol
            } else if (availableHellSoldiers < hellGarrison * 2) {
                hellGarrison = Math.floor(availableHellSoldiers / 2); // Always try to send out at least half our people
            }

            // Determine the patrol attack rating
            if (settings.hellHandlePatrolSize) {
                let patrolRating = game.global.portal.fortress.threat * settings.hellPatrolThreatPercent / 100;

                // Now reduce rating based on drones, droids and bootcamps
                if (game.global.portal.war_drone) {
                    patrolRating -= settings.hellPatrolDroneMod * game.global.portal.war_drone.on * (game.global.tech['portal'] >= 7 ? 1.5 : 1);
                }
                if (game.global.portal.war_droid) {
                    patrolRating -= settings.hellPatrolDroidMod * game.global.portal.war_droid.on * (game.global.tech['hdroid'] ? 2 : 1);
                }
                if (game.global.city.boot_camp) {
                    patrolRating -= settings.hellPatrolBootcampMod * game.global.city.boot_camp.count;
                }

                // In the end, don't go lower than the minimum...
                patrolRating = Math.max(patrolRating, settings.hellPatrolMinRating);

                // Increase patrol attack rating if alive soldier count is low to reduce patrol losses
                if (settings.hellBolsterPatrolRating > 0 && settings.hellBolsterPatrolPercentTop > 0) { // Check if settings are on
                    const homeGarrisonFillRatio = m.currentCityGarrison / m.maxCityGarrison;
                    if (homeGarrisonFillRatio <= settings.hellBolsterPatrolPercentTop / 100) { // If less than top
                        if (homeGarrisonFillRatio <= settings.hellBolsterPatrolPercentBottom / 100) { // and less than bottom
                            patrolRating += settings.hellBolsterPatrolRating; // add full rating
                        } else if (settings.hellBolsterPatrolPercentBottom < settings.hellBolsterPatrolPercentTop) { // If between bottom and top
                            patrolRating += settings.hellBolsterPatrolRating * (settings.hellBolsterPatrolPercentTop / 100 - homeGarrisonFillRatio) // add rating proportional to where in the range we are
                                              / (settings.hellBolsterPatrolPercentTop - settings.hellBolsterPatrolPercentBottom) * 100;
                        }
                    }
                }

                // Patrol size
                targetHellPatrolSize = m.getSoldiersForAttackRating(patrolRating);

                // If patrol size is larger than available soldiers, send everyone available instead of 0
                targetHellPatrolSize = Math.min(targetHellPatrolSize, availableHellSoldiers - hellGarrison);
            } else {
                targetHellPatrolSize = m.hellPatrolSize;
            }

            // Determine patrol count
            targetHellPatrols = Math.max(1, Math.floor((availableHellSoldiers - hellGarrison) / targetHellPatrolSize));

            // Special logic for small number of patrols
            if (settings.hellHandlePatrolSize && targetHellPatrols === 1) {
                // If we could send 1.5 patrols, send 3 half-size ones instead
                if ((availableHellSoldiers - hellGarrison) >= 1.5 * targetHellPatrolSize) {
                    targetHellPatrolSize = Math.floor((availableHellSoldiers - hellGarrison) / 3);
                    targetHellPatrols = Math.floor((availableHellSoldiers - hellGarrison) / targetHellPatrolSize);
                }
            }
        } else {
            // Try to leave hell if any soldiers are still assigned so the game doesn't put miniscule amounts of soldiers back
            if (m.hellAssigned > 0) {
                m.removeHellPatrolSize(m.hellPatrolSize);
                m.removeHellPatrol(m.hellPatrols);
                m.removeHellGarrison(m.hellSoldiers);
                return;
            }
        }

        // Adjust values ingame
        // First decrease patrols, then put hell soldiers to the right amount, then increase patrols, to make sure all actions go through
        if (settings.hellHandlePatrolSize && m.hellPatrolSize > targetHellPatrolSize) m.removeHellPatrolSize(m.hellPatrolSize - targetHellPatrolSize);
        if (m.hellPatrols > targetHellPatrols) m.removeHellPatrol(m.hellPatrols - targetHellPatrols);
        if (m.hellSoldiers > targetHellSoldiers) m.removeHellGarrison(m.hellSoldiers - targetHellSoldiers);
        if (m.hellSoldiers < targetHellSoldiers) m.addHellGarrison(targetHellSoldiers - m.hellSoldiers);
        if (settings.hellHandlePatrolSize && m.hellPatrolSize < targetHellPatrolSize) m.addHellPatrolSize(targetHellPatrolSize - m.hellPatrolSize);
        if (m.hellPatrols < targetHellPatrols) m.addHellPatrol(targetHellPatrols - m.hellPatrols);
    }

    // TODO: Some way to use servant crafters only
