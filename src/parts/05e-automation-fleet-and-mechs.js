    function autoFleetOuter() {
        let m = FleetManagerOuter;
        if (!m.initFleet()) {
            m.nextShipMsg = `No ships needed yet`;
            m.updateNextShip();
            return;
        }

        if (settings.fleetOuterShips === "none") {
            m.updateNextShip();
            m.nextShipMsg = `Ship construction is disabled`;
            return;
        }

        let yard = game.global.space.shipyard;

        if (settings.fleetOuterShips === "manual") {
            m.updateNextShip(m.avail(yard.blueprint) ? yard.blueprint : null);
            m.nextShipMsg = `Ships managed manually`;
            return;
        }

        let targetRegion = null;
        let newShip = null;
        let minCrew = settings.fleetOuterCrew; // Ignored by Tau Explorer and Eris Scout

        if (settings.fleetExploreTau && game.global.tech['tauceti'] === 1 && m.avail(m._explorerBlueprint) && m.shipCount('tauceti', m._explorerBlueprint) < 1) {
            targetRegion = "tauceti";
            newShip = m._explorerBlueprint;
            minCrew = 0;
        } else {
            let scanEris = game.global.tech['eris'] === 1 && m.getWeighting("spc_eris") > 0 && m.syndicate("spc_eris", true, true).s < 50;
            if (scanEris) {
                targetRegion = "spc_eris";
                minCrew = 0;
            } else {
                let regionsToProtect = m.Regions.filter(reg => m.isUnlocked(reg) && m.getWeighting(reg) > 0 && m.syndicate(reg, false, true) < m.getMaxDefense(reg))
                    .sort((a, b) => ((1 - m.syndicate(b, false, true)) * m.getWeighting(b))
                                  - ((1 - m.syndicate(a, false, true)) * m.getWeighting(a)));

                if (regionsToProtect.length < 1) {
                    m.updateNextShip();
                    m.nextShipMsg = `No more ships currently needed`;
                    return;
                }
                targetRegion = regionsToProtect[0];
            }

            if (settings.fleetOuterShips === "user") {
                newShip = m.avail(yard.blueprint) ? yard.blueprint : null;
            }
            else {
                let scout = m.getScoutBlueprint();
                if (m.avail(scout) && m.shipCount(targetRegion, scout) < m.getMaxScouts(targetRegion)) {
                    newShip = scout;
                }
                if (!newShip) {
                    let fighter =  m.getFighterBlueprint();
                    newShip = m.avail(fighter) ? fighter : null;
                }
            }
        }

        if (!newShip) {
            m.updateNextShip();
            m.nextShipMsg = `No suitable blueprint for ship to ${m.getLocName(targetRegion)}`;
            return;
        }

        m.updateNextShip(newShip);
        m.nextShipName = `${m.getShipName(newShip)} to ${m.getLocName(targetRegion)}`;

        let missing = m.getMissingResource(newShip);
        if (missing) {
            m.nextShipMsg = `Next ship(${m.nextShipName}) is missing ${resources[missing].name}`;
            return;
        }

        if (WarManager.currentCityGarrison - m.ClassCrew[newShip.class] < minCrew) {
            m.nextShipMsg = `Next ship(${m.nextShipName}) is missing crew`;
            return;
        }

        if (m.build(newShip, targetRegion)) {
            GameLog.logSuccess("outer_fleet", `${m.getShipName(newShip)} has been assembled, and dispatched to ${m.getLocName(targetRegion)}.`, ['combat']);
        } else {
            m.nextShipMsg = `Invalid design! Next ship(${m.nextShipName}) is missing power`;
            return;
        }
    }

    function getPiracyMultiplier() {
        return 1 *
            (game.global.race.chicken ? traitVal('chicken', 1, '+') : 1) *
            (game.global.race['ocular_power'] && game.global.race?.ocularPowerConfig?.f ? 1 - (traitVal('ocular_power', 1) / 500) : 1)
    }

    function autoFleet() {
        if (!FleetManager.initFleet()) {
            return;
        }
        let def = game.global.galaxy.defense;

        // Init our current state
        let allRegions = [
            {name: "gxy_stargate", piracy: (game.global.race['instinct'] ? 0.09 : 0.1) * game.global.tech.piracy, armada: buildings.StargateDefensePlatform.stateOnCount * 20, useful: true},
            {name: "gxy_gateway", piracy: (game.global.race['instinct'] ? 0.09 : 0.1) * game.global.tech.piracy, armada: buildings.GatewayStarbase.stateOnCount * 25, useful: buildings.BologniumShip.stateOnCount > 0},
            {name: "gxy_gorddon", piracy: (game.global.race['instinct'] ? 720 : 800), armada: 0, useful: buildings.GorddonFreighter.stateOnCount > 0 || buildings.Alien1SuperFreighter.stateOnCount > 0 || buildings.GorddonSymposium.stateOnCount > 0},
            {name: "gxy_alien1", piracy: (game.global.race['instinct'] ? 900 : 1000), armada: 0, useful: buildings.Alien1VitreloyPlant.stateOnCount > 0},
            {name: "gxy_alien2", piracy: (game.global.race['instinct'] ? 2250 : 2500), armada: buildings.Alien2Foothold.stateOnCount * 50 + buildings.Alien2ArmedMiner.stateOnCount * game.actions.galaxy.gxy_alien2.armed_miner.ship.rating(), useful: buildings.Alien2Scavenger.stateOnCount > 0 || buildings.Alien2ArmedMiner.stateOnCount > 0},
            {name: "gxy_chthonian", piracy: (game.global.race['instinct'] ? 7000 : 7500), armada: buildings.ChthonianMineLayer.stateOnCount * game.actions.galaxy.gxy_chthonian.minelayer.ship.rating() + buildings.ChthonianRaider.stateOnCount * game.actions.galaxy.gxy_chthonian.raider.ship.rating(), useful: buildings.ChthonianExcavator.stateOnCount > 0 || buildings.ChthonianRaider.stateOnCount > 0},
        ];
        let allFleets = [
            {name: "scout_ship", count: 0, power: game.actions.galaxy.gxy_gateway.scout_ship.ship.rating()},
            {name: "corvette_ship", count: 0, power: game.actions.galaxy.gxy_gateway.corvette_ship.ship.rating()},
            {name: "frigate_ship", count: 0, power: game.actions.galaxy.gxy_gateway.frigate_ship.ship.rating()},
            {name: "cruiser_ship", count: 0, power: game.actions.galaxy.gxy_gateway.cruiser_ship.ship.rating()},
            {name: "dreadnought", count: 0, power: game.actions.galaxy.gxy_gateway.dreadnought.ship.rating()},
        ];
        let minPower = allFleets[0].power;

        const piracyMultiplier = getPiracyMultiplier();
        if (piracyMultiplier !== 1) {
            allRegions.forEach(region => {
                region.piracy *= piracyMultiplier;
            });
        }

        // We can't rely on stateOnCount - it won't give us correct number of ships of some of them missing crew
        let fleetIndex = Object.fromEntries(allFleets.map((ship, index) => [ship.name, index]));
        Object.values(def).forEach(assigned => Object.entries(assigned).forEach(([ship, count]) => allFleets[fleetIndex[ship]].count += Math.floor(count)));

        // Check if we can perform assault mission
        let assault = null;
        if (buildings.ChthonianMission.isUnlocked() && settings.fleetChthonianLoses !== "ignore") {
            let fleetReq, fleetWreck;
            if (settings.fleetChthonianLoses === "low") {
                fleetReq = 4500;
                fleetWreck = 80;
            } else if (settings.fleetChthonianLoses === "avg") {
                fleetReq = 2500;
                fleetWreck = 160;
            } else if (settings.fleetChthonianLoses === "high") {
                fleetReq = 1250;
                fleetWreck = 500;
            } else if (settings.fleetChthonianLoses === "dread") {
                if (allFleets[4].count > 0) {
                    assault = {ships: [0,0,0,0,1], region: "gxy_chthonian", mission: buildings.ChthonianMission};
                }
            } else if (settings.fleetChthonianLoses === "frigate") {
                let totalPower = allFleets.reduce((sum, ship) => sum + (ship.power >= allFleets[2].power ? ship.power * ship.count : 0), 0);
                if (totalPower >= 4500) {
                    assault = {ships: allFleets.map((ship, idx) => idx >= 2 ? ship.count : 0), region: "gxy_chthonian", mission: buildings.ChthonianMission};
                }
            }
            if (game.global.race['instinct']) {
                fleetWreck /= 2;
            }

            let availableShips = allFleets.map(ship => ship.count);
            let powerToReserve = fleetReq - fleetWreck;
            for (let i = availableShips.length - 1; i >= 0 && powerToReserve > 0; i--) {
                let reservedShips = Math.min(availableShips[i], Math.ceil(powerToReserve / allFleets[i].power));
                availableShips[i] -= reservedShips;
                powerToReserve -= reservedShips * allFleets[i].power;
            }
            if (powerToReserve <= 0) {
                let sets = availableShips.map((amount, idx) => [...Array(Math.min(amount, Math.floor((fleetWreck + (minPower - 0.1)) / allFleets[idx].power)) + 1).keys()]);
                for (let set of cartesian(...sets)) {
                    let powerMissing = fleetWreck - set.reduce((sum, amt, idx) => sum + amt * allFleets[idx].power, 0);
                    if (powerMissing <= 0 && powerMissing > minPower * -1) {
                        let lastShip = set.reduce((prev, val, cur) => val > 0 ? cur : prev, 0);
                        let team = allFleets.map((ship, idx) => idx >= lastShip ? ship.count : set[idx]);
                        assault = {ships: team, region: "gxy_chthonian", mission: buildings.ChthonianMission};
                        break;
                    }
                }
            }
        } else if (buildings.Alien2Mission.isUnlocked() && resources.Knowledge.maxQuantity >= settings.fleetAlien2Knowledge) {
            let totalPower = allFleets.reduce((sum, ship) => sum + (ship.power * ship.count), 0);

            let doAlien2Assault = false;
            if (settings.fleetAlien2Loses === "suicide") {
                doAlien2Assault = totalPower >= 400;
            } else {
                doAlien2Assault = totalPower >= 650;
            }

            if (doAlien2Assault) {
                assault = {ships: allFleets.map(ship => ship.count), region: "gxy_alien2", mission: buildings.Alien2Mission};
            }
        }
        if (assault) {
            // Unassign all ships from where there're assigned currently
            Object.entries(def).forEach(([region, assigned]) => Object.entries(assigned).forEach(([ship, count]) => FleetManager.subShip(region, ship, count)));
            // Assign to target region
            allFleets.forEach((ship, idx) => FleetManager.addShip(assault.region, ship.name, assault.ships[idx]));
            assault.mission.click();
            return; // We're done for now; lot of data was invalidated during attack, we'll manage remaining ships in next tick
        }

        let regionsToProtect = allRegions.filter(region => region.useful && region.piracy - region.armada > 0);

        for (let i = 0; i < allRegions.length; i++) {
            let region = allRegions[i];
            region.priority = settings["fleet_pr_" + region.name];
            region.assigned = {};
            for (let j = 0; j < allFleets.length; j++) {
                region.assigned[allFleets[j].name] = 0;
            }
        }

        // Calculate min allowed coverage, if we have more ships than we can allocate without overflowing.
        let missingDef = regionsToProtect.map(region => region.piracy - region.armada);
        for (let i = allFleets.length - 1; i >= 0; i--) {
            let ship = allFleets[i];
            let maxAllocate = missingDef.reduce((sum, def) => sum + Math.floor(def / ship.power), 0);
            if (ship.count > maxAllocate) {
                if (ship.count >= maxAllocate + missingDef.length) {
                    ship.cover = 0;
                } else {
                    let overflows = missingDef.map(def => def % ship.power).sort((a, b) => b - a);
                    ship.cover = overflows[ship.count - maxAllocate - 1];
                }
            } else {
                ship.cover = ship.power - (minPower - 0.1);
            }
            if (ship.count >= maxAllocate) {
                missingDef.forEach((def, idx, arr) => arr[idx] = def % ship.power);
                if (ship.count > maxAllocate) {
                    missingDef.sort((a, b) => b - a);
                    for (let j = 0; j < ship.count - maxAllocate; j++) {
                        missingDef[j] = 0;
                    }
                }
            }
        }
        for (let i = 0; i < allFleets.length; i++){
            if (allFleets[i].count > 0) {
                allFleets[i].cover = 0.1;
                break;
            }
        }

        // Calculate actual amount of ships per zone
        let priorityList = regionsToProtect.sort((a, b) => a.priority - b.priority);
        for (let i = 0; i < priorityList.length; i++) {
            let region = priorityList[i];
            let missingDef = region.piracy - region.armada;

            // First pass, try to assign ships without overuse (unless we have enough ships to overuse everything)
            for (let k = allFleets.length - 1; k >= 0 && missingDef > 0; k--) {
                let ship = allFleets[k];
                if (ship.cover <= missingDef) {
                    let shipsToAssign = Math.min(ship.count, Math.floor(missingDef / ship.power));
                    if (shipsToAssign < ship.count && shipsToAssign * ship.power + ship.cover <= missingDef) {
                        shipsToAssign++;
                    }
                    region.assigned[ship.name] += shipsToAssign;
                    ship.count -= shipsToAssign;
                    missingDef -= shipsToAssign * ship.power;
                }
            }

            if (settings.fleetMaxCover && missingDef > 0) {
                // Second pass, try to fill remaining gaps, if wasteful overuse is allowed
                let index = -1;
                while (missingDef > 0 && ++index < allFleets.length) {
                    let ship = allFleets[index];
                    if (ship.count > 0) {
                        let shipsToAssign = Math.min(ship.count, Math.ceil(missingDef / ship.power));
                        region.assigned[ship.name] += shipsToAssign;
                        ship.count -= shipsToAssign;
                        missingDef -= shipsToAssign * ship.power;
                    }
                }

                // If we're still missing defense it means we have no more ships to assign
                if (missingDef > 0) {
                    break;
                }

                // Third pass, retrive ships which not needed after second pass
                while (--index >= 0) {
                    let ship = allFleets[index];
                    if (region.assigned[ship.name] > 0 && missingDef + ship.power <= 0) {
                        let uselesShips = Math.min(region.assigned[ship.name], Math.floor(missingDef / ship.power * -1));
                        if (uselesShips > 0) {
                            region.assigned[ship.name] -= uselesShips;
                            ship.count += uselesShips;
                            missingDef += uselesShips * ship.power;
                        }
                    }
                }
            }
        }

        // Assign remaining ships to gorddon, to utilize Symposium
        if (buildings.GorddonSymposium.stateOnCount > 0) {
            allFleets.forEach(ship => allRegions[2].assigned[ship.name] += ship.count);
        }

        let shipDeltas = allRegions.map(region => Object.entries(region.assigned).map(([ship, count]) => [ship, count - def[region.name][ship]]));

        shipDeltas.forEach((ships, region) => ships.forEach(([ship, delta]) => delta < 0 && FleetManager.subShip(allRegions[region].name, ship, delta * -1)));
        shipDeltas.forEach((ships, region) => ships.forEach(([ship, delta]) => delta > 0 && FleetManager.addShip(allRegions[region].name, ship, delta)));
    }

    function autoMech() {
        let m = MechManager;
        if (game.global.race['warlord'] || !m.initLab() || $(`#mechList .mechRow[draggable=true]`).length > 0) {
            return;
        }
        let mechBay = game.global.portal.mechbay;
        let prolongActive = m.isActive;
        m.isActive = false;
        let savingSupply = m.saveSupply && settings.mechBaysFirst && buildings.SpirePurifier.stateOffCount === 0;
        m.saveSupply = false;

        // Rearrange mechs for best efficiency if some of the bays are disabled
        if (m.inactiveMechs.length > 0) {
            // Each drag redraw mechs list, do it just once per tick to reduce stress
            if (m.activeMechs.length > 0) {
                m.activeMechs.sort((a, b) => a.efficiency - b.efficiency);
                m.inactiveMechs.sort((a, b) => b.efficiency - a.efficiency);
                if (m.activeMechs[0].efficiency < m.inactiveMechs[0].efficiency) {
                    if (m.activeMechs.length > m.inactiveMechs.length) {
                        m.dragMech(m.activeMechs[0].id, mechBay.mechs.length - 1);
                    } else {
                        m.dragMech(m.inactiveMechs[0].id, 0);
                    }
                }
            }
            return; // Can't do much while having disabled mechs, without scrapping them all. And that's really bad idea. Just wait until bays will be enabled back.
        }

        if (haveTask("mech")) {
            return; // Do nothing except dragging if governor enabled
        }

        let newMech = {};
        let newSize, forceBuild;
        if (settings.mechBuild === "random") {
            [newSize, forceBuild] = m.getPreferredSize();
            newMech = m.getRandomMech(newSize);
        } else if (settings.mechBuild === "user") {
            newMech = {...mechBay.blueprint, ...m.getMechStats(mechBay.blueprint)};
        } else { // mechBuild === "none"
            return; // Mech build disabled, stop here
        }
        let [newGems, newSupply, newSpace] = m.getMechCost(newMech);

        if (!settings.mechFillBay && resources.Supply.spareMaxQuantity < newSupply) {
            return; // Not enough supply capacity, and smaller mechs are disabled, can't do anything
        }

        let baySpace = mechBay.max - mechBay.bay;
        let lastFloor = settings.autoPrestige && settings.prestigeType === "demonic" && buildings.SpireTower.count >= settings.prestigeDemonicFloor && haveTech("waygate", 3);
        if (lastFloor) {
            savingSupply = false;
        }

        // Save up supply for next floor
        if (settings.mechSaveSupplyRatio > 0 && !lastFloor && !forceBuild) {
            let missingSupplies = (resources.Supply.maxQuantity * settings.mechSaveSupplyRatio) - resources.Supply.currentQuantity;
            if (baySpace < newSpace) {
                missingSupplies -= m.getMechRefund({size: "titan"})[1];
            }
            let timeToFullSupplies = missingSupplies / resources.Supply.rateOfChange;
            if (m.getTimeToClear() <= timeToFullSupplies) {
                return; // Floor will be cleared before capping supplies, save them
            }
        }

        let canExpandBay = settings.autoBuild && settings.mechBaysFirst && buildings.SpireMechBay.isAutoBuildable() && (buildings.SpireMechBay.isAffordable(true) || (buildings.SpirePurifier.isAutoBuildable() && buildings.SpirePurifier.isAffordable(true) && buildings.SpirePurifier.stateOffCount === 0));
        let mechScrap = settings.mechScrap;
        if (canExpandBay && resources.Supply.currentQuantity < resources.Supply.maxQuantity && !prolongActive && resources.Supply.rateOfChange >= settings.mechMinSupply) {
            // We can build purifier or bay once we'll have enough resources, do not rebuild old mechs
            // Unless floor just changed, and scrap income fall to low, so we need to rebuild them to fix it
            mechScrap = "none";
        } else if (settings.mechScrap === "mixed") {
            if (buildings.SpireWaygate.stateOnCount === 1) {
                // No mass scrapping during Demon Lord fight, all mechs equially good here - stay with full bay
                mechScrap = "single";
            } else {
                let mechToBuild = Math.floor(baySpace / newSpace);
                // If we're going to save up supplies we need to reserve time for it
                let supplyCost = (mechToBuild * newSupply) + (resources.Supply.maxQuantity * settings.mechSaveSupplyRatio);
                let timeToFullBay = Math.max((supplyCost - resources.Supply.currentQuantity) / resources.Supply.rateOfChange,
                              (mechToBuild * newGems - resources.Soul_Gem.currentQuantity) / resources.Soul_Gem.rateOfChange);
                // timeToClear changes drastically with new mechs, let's try to normalize it, scaling it with available power
                let estimatedTotalPower = m.mechsPower + mechToBuild * newMech.power;
                let estimatedTimeToClear = m.getTimeToClear() * (m.mechsPower / estimatedTotalPower);
                mechScrap = timeToFullBay > estimatedTimeToClear && !lastFloor ? "single" : "all";
            }
        }

        // Check if we need to scrap anything
        if (newSupply < resources.Supply.spareMaxQuantity && ((mechScrap === "single" && baySpace < newSpace) || (mechScrap === "all" && (baySpace < newSpace || resources.Supply.spareQuantity < newSupply || resources.Soul_Gem.spareQuantity < newGems)))) {
            let spaceGained = 0;
            let supplyGained = 0;
            let gemsGained = 0;
            let powerLost = 0;

            // Get list of inefficient mech
            let scrapEfficiency =
              (settings.mechFillBay ? baySpace === 0 : baySpace < newSpace) && resources.Supply.storageRatio > 0.9 && !savingSupply ? 0 :
              lastFloor ? Math.min(settings.mechScrapEfficiency, 1) :
              settings.mechScrapEfficiency;

            let badMechList = m.activeMechs.filter(mech => {
                if ((mech.infernal && mech.size !== 'collector') || mech.power >= m.bestMech[mech.size].power) {
                    return false;
                }
                if (forceBuild) { // Get everything that isn't infernal or 100% optimal for force rebuild
                    return true;
                }
                let [gemRefund, supplyRefund] = m.getMechRefund(mech);
                // Collector and scout does not refund gems. Let's pretend they're returning half of gem during filtering
                let costRatio = Math.min((gemRefund || 0.5) / newGems, supplyRefund / newSupply);
                let powerRatio = mech.power / newMech.power;
                return costRatio / powerRatio > scrapEfficiency;
            }).sort((a, b) => a.efficiency - b.efficiency);

            let extraScouts = settings.mechScoutsRebuild ? Number.MAX_SAFE_INTEGER : mechBay.scouts - (mechBay.max * settings.mechScouts / 2);

            // Remove worst mechs untill we have enough room for new mech
            let trashMechs = [];
            for (let i = 0; i < badMechList.length && (baySpace + spaceGained < newSpace || (mechScrap === "all" && (resources.Supply.spareQuantity + supplyGained < newSupply || resources.Soul_Gem.spareQuantity + gemsGained < newGems))); i++) {
                if (badMechList[i].size === 'small') {
                    if (extraScouts < 1) {
                        continue;
                    } else {
                        extraScouts--;
                    }
                }
                spaceGained += m.getMechSpace(badMechList[i]);
                supplyGained += m.getMechRefund(badMechList[i])[1];
                gemsGained += m.getMechRefund(badMechList[i])[0];
                powerLost += badMechList[i].power;
                trashMechs.push(badMechList[i]);
            }

            // Now go scrapping, if possible and benefical
            if (trashMechs.length > 0 && (forceBuild || powerLost / spaceGained < newMech.efficiency) && baySpace + spaceGained >= newSpace && resources.Supply.spareQuantity + supplyGained >= newSupply && resources.Soul_Gem.spareQuantity + gemsGained >= newGems) {
                trashMechs.sort((a, b) => b.id - a.id); // Goes from bottom to top of the list, so it won't shift IDs
                if (trashMechs.length > 1) {
                    let rating = average(trashMechs.map(mech => mech.power / m.bestMech[mech.size].power));
                    GameLog.logSuccess("mech_scrap", `${trashMechs.length} mechs (~${Math.round(rating * 100)}%) has been scrapped.`, ['hell']);
                } else {
                    GameLog.logSuccess("mech_scrap", `${m.mechDesc(trashMechs[0])} mech has been scrapped.`, ['hell']);
                }
                trashMechs.forEach(mech => m.scrapMech(mech));
                resources.Supply.currentQuantity = Math.min(resources.Supply.currentQuantity + supplyGained, resources.Supply.maxQuantity);
                resources.Soul_Gem.currentQuantity += gemsGained;
                baySpace += spaceGained;
            } else if (baySpace + spaceGained >= newSpace) {
                return; // We have scrapable mechs, but don't want to scrap them right now. Waiting for more supplies for instant replace.
            }
        }

        // Try to squeeze smaller mech, if we can't fit preferred one
        if (settings.mechFillBay && !savingSupply && ((!canExpandBay && baySpace < newSpace) || resources.Supply.maxQuantity < newSupply)) {
            for (let i = m.Size.indexOf(newMech.size) - 1; i >= 0; i--) {
                [newGems, newSupply, newSpace] = m.getMechCost({size: m.Size[i]});
                if (newSpace <= baySpace && newSupply <= resources.Supply.maxQuantity) {
                    newMech = m.getRandomMech(m.Size[i]);
                    break;
                }
            }
        }

        // We have everything to get new mech
        if (resources.Soul_Gem.spareQuantity >= newGems && resources.Supply.spareQuantity >= newSupply && baySpace >= newSpace) {
            m.buildMech(newMech);
            resources.Supply.currentQuantity -= newSupply;
            resources.Soul_Gem.currentQuantity -= newGems;
            m.isActive = prolongActive;
            return;
        }
    }

