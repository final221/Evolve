    function isHellSupressUseful() {
        return jobs.Archaeologist.count > 0 || crafter.Scarletite.count > 0 || buildings.RuinsArcology.stateOnCount > 0 || buildings.GateInferniteMine.stateOnCount > 0;
    }

    function autoPower() {
        // Only start doing this once power becomes available. Isn't useful before then
        if (!resources.Power.isUnlocked()) {
            return;
        }

        let buildingList = BuildingManager.managedStatePriorityList();

        // No buildings unlocked yet
        if (buildingList.length === 0) {
            return;
        }

        // Calculate the available power / resource rates of change that we have to work with
        // This handles "mystery power" by starting with the leftover power of the previous tick, then
        // counting backwards through powered buildings. Ideally availablePower should be 0 after this
        // first loop, but doing the calculation like this automatically handles a lot of mechanics
        // and complicated situations for us, so it often won't be beyond very simple early prestige MAD.
        let availablePower = resources.Power.currentQuantity;
        let missingProducer = {};

        for (let i = 0; i < buildingList.length; i++) {
            let building = buildingList[i];

            availablePower += (building.powered * building.stateOnCount);

            for (let j = 0; j < building.consumption.length; j++) {
                let resourceType = building.consumption[j];

                // Just like for power, get our total resources available
                if (building === buildings.BeltSpaceStation && resourceType.resource === resources.Belt_Support) {
                    resources.Belt_Support.rateOfChange -= resources.Belt_Support.maxQuantity;
                } else {
                    resourceType.resource.rateOfChange += building.getFuelRate(j) * building.stateOnCount;
                }

                if (resourceType.resource instanceof Support && resourceType.rate < 0) {
                    missingProducer[resourceType.resource.id] = (missingProducer[resourceType.resource.id] ?? 0) + 1;
                }
            }
        }

        let manageTransport = buildings.LakeTransport.isSmartManaged() && buildings.LakeBireme.isSmartManaged();
        let manageSpire = buildings.SpirePort.isSmartManaged() && buildings.SpireBaseCamp.isSmartManaged();

        // Start assigning buildings from the top of our priority list to the bottom
        for (let i = 0; i < buildingList.length; i++) {
            let building = buildingList[i];
            let maxStateOn = building.count;
            let currentStateOn = building.stateOnCount;

            if (!game.global.settings.showGalactic && building._tab === "galaxy") {
                maxStateOn = 0;
            }
            if (settings.buildingsLimitPowered) {
                maxStateOn = Math.min(maxStateOn, building.autoMax);
            }

            // Banquet just has a single on/off switch even above level 1
            if (building === buildings.Banquet) {
                maxStateOn = Math.min(maxStateOn, 1);
            }

            // Max powered amount
            if (building === buildings.NeutronCitadel) {
                while (maxStateOn > 0) {
                    if (availablePower >= getCitadelConsumption(maxStateOn)) {
                        break;
                    } else {
                        maxStateOn--;
                    }
                }
            } else if (building.powered > 0 && building !== buildings.RuinsHellForge) {
                maxStateOn = Math.min(maxStateOn, availablePower / building.powered);
            }

            // Ascension Machine and Terraformer missing energy
            if ((building === buildings.SiriusAscensionTrigger || building === buildings.RedAtmoTerraformer) && availablePower < building.powered) {
                building.extraDescription = `Missing ${Math.ceil(building.powered - availablePower)} MW to power on<br>${building.extraDescription}`;
            }

            // Spire managed separately
            if (manageSpire && (building === buildings.SpirePort || building === buildings.SpireBaseCamp || building === buildings.SpireMechBay)) {
                continue;
            }
            // Lake transport managed separately
            if (manageTransport && (building === buildings.LakeTransport || building === buildings.LakeBireme)) {
                continue;
            }
            if (building.is.smart && building.autoStateSmart) {
                if (resources.Power.currentQuantity <= resources.Power.maxQuantity || haveTech('replicator')) { // Saving power, unless we can afford everything
                    // Disable Belt Space Stations with no workers
                    if (building === buildings.BeltSpaceStation) {
                        let stationStorage = parseFloat(game.breakdown.c.Elerium?.[game.loc("space_belt_station_title")] ?? 0);
                        let extraStations = stationStorage > 0 ? Math.floor((resources.Elerium.maxQuantity - resources.Elerium.maxCost) / stationStorage) : 0;
                        let minersNeeded = buildings.BeltEleriumShip.stateOnCount * 2 + buildings.BeltIridiumShip.stateOnCount + buildings.BeltIronShip.stateOnCount;
                        maxStateOn = Math.min(maxStateOn, Math.max(currentStateOn - extraStations, Math.ceil(minersNeeded / 3)));
                    }
                    if (building === buildings.CementPlant && jobs.CementWorker.count === 0) {
                        maxStateOn = 0;
                    }
                    if (building === buildings.Mine && jobs.Miner.count === 0) {
                        maxStateOn = 0;
                    }
                    if (building === buildings.CoalMine && jobs.CoalMiner.count === 0) {
                        maxStateOn = 0;
                    }
                    // Enable cooling towers only if we can power at least two harbors
                    if (building === buildings.LakeCoolingTower && availablePower < (building.powered * maxStateOn + ((500 * 0.92 ** maxStateOn) * (game.global.race['emfield'] ? 1.5 : 1)).toFixed(2) * Math.min(2, buildings.LakeHarbor.count))) {
                        maxStateOn = 0;
                    }
                    // Don't bother powering harbor if we have power for only one
                    if (building === buildings.LakeHarbor && maxStateOn === 1 && building.count > 1) {
                        maxStateOn = 0;
                    }
                    if (building === buildings.GasMining && !resources.Helium_3.isUseful()) {
                        maxStateOn = Math.min(maxStateOn, resources.Helium_3.getBusyWorkers("space_gas_mining_title", currentStateOn));
                        if (maxStateOn !== currentStateOn) {
                            resources.Helium_3.incomeAdusted = true;
                        }
                    }
                    if (building === buildings.GasMoonOilExtractor  && !resources.Oil.isUseful()) {
                        maxStateOn = Math.min(maxStateOn, resources.Oil.getBusyWorkers("space_gas_moon_oil_extractor_title", currentStateOn));
                        if (maxStateOn !== currentStateOn) {
                            resources.Oil.incomeAdusted = true;
                        }
                    }
                    // Kuiper Mines
                    // TODO: Disable with 100% syndicate
                    if (building === buildings.KuiperOrichalcum && !resources.Orichalcum.isUseful()) {
                        maxStateOn = Math.min(maxStateOn, resources.Orichalcum.getBusyWorkers("space_kuiper_mine", currentStateOn, [resources.Orichalcum.title]));
                        if (maxStateOn !== currentStateOn) {
                            resources.Orichalcum.incomeAdusted = true;
                        }
                    }
                    if (building === buildings.KuiperUranium && !resources.Uranium.isUseful()) {
                        maxStateOn = Math.min(maxStateOn, resources.Uranium.getBusyWorkers("space_kuiper_mine", currentStateOn, [resources.Uranium.title]));
                        if (maxStateOn !== currentStateOn) {
                            resources.Uranium.incomeAdusted = true;
                        }
                    }
                    if (building === buildings.KuiperNeutronium && !resources.Neutronium.isUseful()) {
                        maxStateOn = Math.min(maxStateOn, resources.Neutronium.getBusyWorkers("space_kuiper_mine", currentStateOn, [resources.Neutronium.title]));
                        if (maxStateOn !== currentStateOn) {
                            resources.Neutronium.incomeAdusted = true;
                        }
                    }
                    if (building === buildings.KuiperElerium && !resources.Elerium.isUseful()) {
                        maxStateOn = Math.min(maxStateOn, resources.Elerium.getBusyWorkers("space_kuiper_mine", currentStateOn, [resources.Elerium.title]));
                        if (maxStateOn !== currentStateOn) {
                            resources.Elerium.incomeAdusted = true;
                        }
                    }
                }
                // Limit lander to sustainable amount
                if (building === buildings.TritonLander) {
                    if (buildings.TritonFOB.stateOnCount < 1) { // Does not work with no FOB
                        maxStateOn = 0;
                    } else {
                        //let protectedSoldiers = (game.global.race['armored'] ? 1 : 0) + (game.global.race['scales'] ? 1 : 0) + (game.global.tech['armor'] ?? 0);
                        //let woundCap = Math.ceil((game.global.space.fob.enemy + (game.global.tech.outer >= 4 ? 75 : 62.5)) / 5) - protectedSoldiers;
                        //let maxLanders = getHealingRate() < woundCap ? Math.floor((getHealingRate() + protectedSoldiers) / 1.5) : Number.MAX_SAFE_INTEGER;
                        let dispatchSoldiers = WarManager.currentSoldiers - Math.max(0, WarManager.wounded - Math.floor(getHealingRate()));
                        let healthySquads = Math.floor(dispatchSoldiers / (3 * traitVal('high_pop', 0, 1)));
                        maxStateOn = Math.min(maxStateOn, healthySquads /*, maxLanders*/ );
                    }
                }
                // Do not enable Ascension Machine while we're waiting for pillar
                if (building === buildings.SiriusAscensionTrigger && building.powered > 0 && (!isPillarFinished() || settings.prestigeType !== 'ascension')) {
                    maxStateOn = 0;
                }
                if (building === buildings.RedAtmoTerraformer && settings.prestigeType !== 'terraform') {
                    maxStateOn = 0;
                }
                // Determine the number of powered attractors
                // The goal is to keep threat in the desired range
                // If threat is larger than the configured top value, turn all attractors off
                // If threat is lower than the bottom value, turn all attractors on
                // Linear in between
                if (building === buildings.BadlandsAttractor) {
                    let attractorsBest = 0;
                    if (game.global.portal.fortress.threat < settings.hellAttractorTopThreat && WarManager.hellAssigned > 0) {
                        if (game.global.portal.fortress.threat > settings.hellAttractorBottomThreat && settings.hellAttractorTopThreat > settings.hellAttractorBottomThreat) {
                            attractorsBest = Math.floor(maxStateOn * (settings.hellAttractorTopThreat - game.global.portal.fortress.threat) / (settings.hellAttractorTopThreat - settings.hellAttractorBottomThreat));
                        } else {
                            attractorsBest = maxStateOn;
                        }
                    }

                    maxStateOn = Math.min(maxStateOn, currentStateOn + 1, Math.max(currentStateOn - 1, attractorsBest));
                }
                // Disable tourist center with full money
                if (building === buildings.TouristCenter && !isHungryRace() && resources.Food.storageRatio < 0.7 && !resources.Money.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Money.getBusyWorkers("tech_tourism", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Money.incomeAdusted = true;
                    }
                }
                // Disable mills with surplus energy
                if (building === buildings.Mill && building.powered && resources.Food.storageRatio < 0.7 && (jobs.Farmer.count > 0 || jobs.Hunter.count > 0)) {
                    maxStateOn = Math.min(maxStateOn, currentStateOn - ((resources.Power.currentQuantity - 5) / (-building.powered)));
                }
                // Disable useless Mine Layers
                if (building === buildings.ChthonianMineLayer) {
                    if ((buildings.ChthonianRaider.stateOnCount === 0 && buildings.ChthonianExcavator.stateOnCount === 0) || buildings.GatewayStarbase.stateOnCount === 0) {
                        maxStateOn = 0;
                    } else {
                        let mineAdjust = (((game.global.race['instinct'] ? 7000 : 7500) * getPiracyMultiplier()) - poly.piracy("gxy_chthonian")) / game.actions.galaxy.gxy_chthonian.minelayer.ship.rating();
                        maxStateOn = Math.min(maxStateOn, currentStateOn + Math.ceil(mineAdjust));
                    }
                }
                // Disable useless Guard Post
                if (building === buildings.RuinsGuardPost) {
                    if (isHellSupressUseful()) {
                        let postRating = game.armyRating(traitVal('high_pop', 0, 1), "hellArmy", 0) * traitVal('holy', 1, '+');
                        let postAdjust = (5001 - poly.hellSupression("ruins").rating) / postRating;
                        if (haveTech('hell_gate')) {
                            postAdjust = Math.max(postAdjust, (7501 - poly.hellSupression("gate").rating) / postRating);
                        }
                        // We're reserving just one soldier for Guard Posts, so let's increase them by 1
                        maxStateOn = Math.min(maxStateOn, currentStateOn + 1, currentStateOn + Math.ceil(postAdjust));
                    } else {
                        maxStateOn = 0;
                    }
                }
                // Disable Waygate once it cleared, or if we're going to use bomb, or current potential is too hight
                if (building === buildings.SpireWaygate && (haveTech("waygate", 3)
                     || (settings.prestigeDemonicBomb && settings.prestigeType === "demonic" && game.global.stats.spire[poly.universeAffix()]?.dlstr > 0)
                     || (settings.autoMech && MechManager.mechsPotential > settings.mechWaygatePotential && !(settings.autoPrestige && settings.prestigeType === "demonic" && buildings.SpireTower.count >= settings.prestigeDemonicFloor)))) {
                      maxStateOn = 0;
                }
                // Once we unlocked Embassy - we don't need scouts and corvettes until we'll have piracy. Let's freeup support for more Bolognium ships
                if ((building === buildings.ScoutShip || building === buildings.CorvetteShip) && !game.global.tech.piracy && buildings.GorddonEmbassy.isUnlocked()) {
                    maxStateOn = 0;
                }
                // Production buildings with capped resources
                if (building === buildings.BeltEleriumShip && !resources.Elerium.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Elerium.getBusyWorkers("job_space_miner", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Elerium.incomeAdusted = true;
                    }
                }
                if (building === buildings.BeltIridiumShip && !resources.Iridium.isUseful() && resources.Elerium.isUnlocked()) {
                    maxStateOn = Math.min(maxStateOn, resources.Iridium.getBusyWorkers("job_space_miner", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Iridium.incomeAdusted = true;
                    }
                }
                if (building === buildings.BeltIronShip && !resources.Iron.isUseful() && resources.Elerium.isUnlocked()) {
                    maxStateOn = Math.min(maxStateOn, resources.Iron.getBusyWorkers("job_space_miner", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Iron.incomeAdusted = true;
                    }
                }
                if (building === buildings.MoonIridiumMine && !resources.Iridium.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Iridium.getBusyWorkers("space_moon_iridium_mine_title", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Iridium.incomeAdusted = true;
                    }
                }
                if (building === buildings.MoonHeliumMine && !resources.Helium_3.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Helium_3.getBusyWorkers("space_moon_helium_mine_title", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Helium_3.incomeAdusted = true;
                    }
                }
                if (building === buildings.Alien2ArmedMiner && !resources.Bolognium.isUseful() && !resources.Adamantite.isUseful() && !resources.Iridium.isUseful()) {
                    let minShips = Math.max(resources.Bolognium.getBusyWorkers("galaxy_armed_miner_bd", currentStateOn),
                                            resources.Adamantite.getBusyWorkers("galaxy_armed_miner_bd", currentStateOn),
                                            resources.Iridium.getBusyWorkers("galaxy_armed_miner_bd", currentStateOn));
                    maxStateOn = Math.min(maxStateOn, minShips);
                    if (maxStateOn !== currentStateOn) {
                        resources.Bolognium.incomeAdusted = true;
                        resources.Adamantite.incomeAdusted = true;
                        resources.Iridium.incomeAdusted = true;
                    }
                }
                if (building === buildings.BologniumShip) {
                    if (buildings.GorddonMission.isAutoBuildable() && buildings.ScoutShip.count >= 2 && buildings.CorvetteShip.count >= 1) {
                        maxStateOn = Math.min(maxStateOn, resources.Gateway_Support.maxQuantity - (buildings.ScoutShip.count + buildings.CorvetteShip.count));
                    }
                    if (!resources.Bolognium.isUseful()) {
                        maxStateOn = Math.min(maxStateOn, resources.Bolognium.getBusyWorkers("galaxy_bolognium_ship", currentStateOn));
                    }
                    if (maxStateOn !== currentStateOn) {
                        resources.Bolognium.incomeAdusted = true;
                    }
                }
                if (building === buildings.ChthonianRaider) {
                    if (buildings.GatewayStarbase.stateOnCount === 0) {
                        maxStateOn = 0;
                    } else if(!resources.Vitreloy.isUseful() && !resources.Polymer.isUseful() && !resources.Neutronium.isUseful() && !resources.Deuterium.isUseful() ) {
                        let minShips = Math.max(resources.Vitreloy.getBusyWorkers("galaxy_raider", currentStateOn),
                                                resources.Polymer.getBusyWorkers("galaxy_raider", currentStateOn),
                                                resources.Neutronium.getBusyWorkers("galaxy_raider", currentStateOn),
                                                resources.Deuterium.getBusyWorkers("galaxy_raider", currentStateOn));
                        maxStateOn = Math.min(maxStateOn, minShips);
                    }
                    if (maxStateOn !== currentStateOn) {
                        resources.Vitreloy.incomeAdusted = true;
                        resources.Polymer.incomeAdusted = true;
                        resources.Neutronium.incomeAdusted = true;
                        resources.Deuterium.incomeAdusted = true;
                    }
                }
                if (building === buildings.Alien1VitreloyPlant && !resources.Vitreloy.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Vitreloy.getBusyWorkers("galaxy_vitreloy_plant_bd", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Vitreloy.incomeAdusted = true;
                    }
                }
                if (building === buildings.ChthonianExcavator && !resources.Orichalcum.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Orichalcum.getBusyWorkers("galaxy_excavator", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Orichalcum.incomeAdusted = true;
                    }
                }
                if (building === buildings.EnceladusWaterFreighter && !resources.Water.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Water.getBusyWorkers("space_water_freighter_title", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Water.incomeAdusted = true;
                    }
                }
                if (building === buildings.NebulaHarvester && !resources.Deuterium.isUseful() && !resources.Helium_3.isUseful()) {
                    let minShips = Math.max(resources.Deuterium.getBusyWorkers("interstellar_harvester_title", currentStateOn),
                                            resources.Helium_3.getBusyWorkers("interstellar_harvester_title", currentStateOn));
                    maxStateOn = Math.min(maxStateOn, minShips);
                    if (maxStateOn !== currentStateOn) {
                        resources.Deuterium.incomeAdusted = true;
                        resources.Helium_3.incomeAdusted = true;
                    }
                }
                // Womling stuff
                if (building === buildings.TauRedWomlingFarm) {
                    let crop_per_farm = haveTech("womling_pop") ? 16 : 12;
                    if (haveTech("womling_gene")) {
                        crop_per_farm += 4;
                    }
                    maxStateOn = Math.min(maxStateOn, Math.ceil(resources.Womlings_Support.maxQuantity / crop_per_farm));
                }
                if (building === buildings.TauRedOverseer) {
                    let loyal_base = game.global.race['womling_friend'] ? 25 :
                                     game.global.race['womling_god'] ? 75 :
                                     game.global.race['womling_lord'] ? 0 : 0;
                    let loyal_per = building.definition.val();
                    let loyal_malus = game.global.tauceti.womling_mine.miners;
                    let overseerNeeded = Math.ceil((100 - (loyal_base - loyal_malus)) / loyal_per);
                    maxStateOn = Math.min(maxStateOn, overseerNeeded);
                }
                if (building === buildings.TauRedWomlingFun) {
                    let morale_base = game.global.race['womling_friend'] ? 75 :
                                      game.global.race['womling_god'] ? 40 :
                                      game.global.race['womling_lord'] ? 30 : 0;
                    let morale_per = building.definition.val();
                    let morale_malus = game.global.tauceti.womling_mine.miners + game.global.tauceti.womling_farm.farmers + game.global.tauceti.overseer.injured;
                    let funNeeded = Math.ceil((100 - (morale_base - morale_malus)) / morale_per);
                    maxStateOn = Math.min(maxStateOn, funNeeded);
                }
                if (building === buildings.TauGasWhalingStation) {
                    let tbs = resources.Tau_Belt_Support;
                    let shipEff = 1-((1-(tbs.maxQuantity/tbs.currentQuantity))**1.4);
                    let blubInc = 8 * shipEff * buildings.TauBeltWhalingShip.stateOnCount;
                    maxStateOn = Math.min(maxStateOn, Math.ceil(blubInc / 12));
                }
                if (building === buildings.TauMiningPit) {
                    maxStateOn = Math.min(maxStateOn, Math.ceil(resources.Population.maxQuantity / 6));
                }
                if (building === buildings.AsphodelHarvester && !resources.Asphodel_Powder.isUseful()) {
                    maxStateOn = Math.min(maxStateOn, resources.Asphodel_Powder.getBusyWorkers("eden_asphodel_harvester_title", currentStateOn));
                    if (maxStateOn !== currentStateOn) {
                        resources.Asphodel_Powder.incomeAdusted = true;
                    }
                }
            }

            for (let j = 0; j < building.consumption.length; j++) {
                let resourceType = building.consumption[j];
                // If resource rate is negative then we are gaining resources. So, only check if we are consuming resources
                if (resourceType.rate > 0) {
                    if (!resourceType.resource.isUnlocked()) {
                        maxStateOn = 0;
                        break;
                    }

                    if (resourceType.resource === resources.Food) {
                        // Food buildings can't be powered in fasting
                        if (game.global.race['fasting']) {
                            maxStateOn = 0;
                            break;
                        }
                        // Banquet hall, if unlocked+enabled, will handle low food case automatically by resetting
                        // This can lead to disabling spaceports and then biodomes if not checked
                        if (buildings.Banquet.stateOnCount) {
                            continue;
                        }
                        // Wendigo doesn't store food. Let's assume it's always available.
                        if (resourceType.resource.storageRatio > 0.05 || isHungryRace()) {
                            continue;
                        }
                    } else if (!(resourceType.resource instanceof Support) && resourceType.resource.currentQuantity >= (maxStateOn * CONSUMPTION_BALANCE_MIN * resourceType.rate)) {
                        // If we have more than 60 seconds of max consumption worth then its ok to lose some resources.
                        // This check is mainly so that power producing buildings don't turn off when rate of change goes negative.
                        // That can cause massive loss of life if turning off space habitats :-)
                        continue;
                    } else if (resourceType.resource === resources.Tau_Belt_Support) {
                        // Tau Belt support can be overused
                        continue;
                    }

                    let supportedAmount = resourceType.resource.rateOfChange / resourceType.rate;
                    if (resourceType.resource === resources.Womlings_Support) {
                        // Womlings facilities can run understaffed
                        supportedAmount = Math.ceil(supportedAmount);
                    }

                    maxStateOn = Math.min(maxStateOn, supportedAmount);

                    if (missingProducer[resourceType.resource.id]) {
                        building.extraDescription = `Make sure all ${resourceType.resource.title} producers are above consumers in buildings list!<br>${building.extraDescription}`;
                    }
                } else {
                    if (missingProducer[resourceType.resource.id] && resourceType.rate < 0) {
                        missingProducer[resourceType.resource.id] -= 1;
                    }
                }
            }

            // If this is a power producing structure then only turn off one at a time!
            if (building.powered < 0) {
                maxStateOn = Math.max(maxStateOn, currentStateOn - 1);
            }

            maxStateOn = Math.max(0, Math.floor(maxStateOn));

            // Now when we know how many buildings we need - let's take resources
            for (let k = 0; k < building.consumption.length; k++) {
                let resourceType = building.consumption[k];

                if (building === buildings.BeltSpaceStation && resourceType.resource === resources.Belt_Support) {
                    resources.Belt_Support.rateOfChange += resources.Belt_Support.maxQuantity;
                } else {
                    resourceType.resource.rateOfChange -= building.getFuelRate(k) * maxStateOn;
                }
            }

            building.tryAdjustState(maxStateOn - currentStateOn);

            if (building === buildings.NeutronCitadel) {
                availablePower -= getCitadelConsumption(maxStateOn);
            } else {
                availablePower -= building.powered * maxStateOn;
            }
        }

        if (manageTransport && resources.Lake_Support.rateOfChange > 0) {
            let lakeSupport = resources.Lake_Support.rateOfChange;
            let rating = game.global.blood['spire'] && game.global.blood.spire >= 2 ? 0.8 : 0.85;
            let bireme = buildings.LakeBireme;
            let transport = buildings.LakeTransport;
            let biremeCount = bireme.count;
            let transportCount = transport.count;
            while (biremeCount + transportCount > lakeSupport) {
                let nextBireme = (1 - (rating ** (biremeCount - 1))) * (transportCount * 5);
                let nextTransport = (1 - (rating ** biremeCount)) * ((transportCount - 1) * 5);
                if (nextBireme > nextTransport) {
                    biremeCount--;
                } else {
                    transportCount--;
                }
            }
            bireme.tryAdjustState(biremeCount - bireme.stateOnCount);
            transport.tryAdjustState(transportCount - transport.stateOnCount);
        }

        if (manageSpire && resources.Spire_Support.rateOfChange > 0) {
            // Try to prevent building bays when they won't have enough time to work out used supplies. It assumes that time to build new bay ~= time to clear floor.
            // Make sure we have some transports, so we won't stuck with 0 supply income after disabling collectors, and also let mech manager finish rebuilding after switching floor
            // And also let autoMech do minimum preparation, so we won't stuck with near zero potential
            let buildAllowed = settings.autoBuild && !(settings.autoMech && MechManager.isActive) && !(settings.autoPrestige && settings.prestigeType === "demonic" && settings.prestigeDemonicFloor - buildings.SpireTower.count <= buildings.SpireMechBay.count);

            // Check is we allowed to build specific building, and have money for it
            const canBuild = (building, checkSmart) => buildAllowed && building.isAutoBuildable() && resources.Money.maxQuantity >= (building.cost["Money"] ?? 0) && (!checkSmart || building.isSmartManaged());

            let spireSupport = Math.floor(resources.Spire_Support.rateOfChange);
            let maxBay = Math.min(buildings.SpireMechBay.count, spireSupport);
            let currentPort = buildings.SpirePort.count;
            let currentCamp = buildings.SpireBaseCamp.count;
            let maxPorts = canBuild(buildings.SpirePort) ? buildings.SpirePort.autoMax : currentPort;
            let maxCamps = canBuild(buildings.SpireBaseCamp) ? buildings.SpireBaseCamp.autoMax : currentCamp;
            let nextMechCost = canBuild(buildings.SpireMechBay, true) ? buildings.SpireMechBay.cost["Supply"] : Number.MAX_SAFE_INTEGER;
            let nextPuriCost = canBuild(buildings.SpirePurifier, true) ? buildings.SpirePurifier.cost["Supply"] : Number.MAX_SAFE_INTEGER;
            let mechQueued = state.queuedTargetsAll.includes(buildings.SpireMechBay);
            let puriQueued = state.queuedTargetsAll.includes(buildings.SpirePurifier);

            let [bestSupplies, bestPort, bestBase] = getBestSupplyRatio(spireSupport, maxPorts, maxCamps);
            buildings.SpirePurifier.extraDescription = `Supported Supplies: ${Math.floor(bestSupplies)}<br>${buildings.SpirePurifier.extraDescription}`;

            let nextCost =
              mechQueued && nextMechCost <= bestSupplies ? nextMechCost :
              puriQueued && nextPuriCost <= bestSupplies ? nextPuriCost :
              Math.min(nextMechCost, nextPuriCost);
            MechManager.saveSupply = nextCost <= bestSupplies;

            let assignStorage = mechQueued || puriQueued;
            for (let targetMech = maxBay; targetMech >= 0; targetMech--) {
                let [targetSupplies, targetPort, targetCamp] = getBestSupplyRatio(spireSupport - targetMech, maxPorts, maxCamps);

                let missingStorage =
                    targetPort > currentPort ? buildings.SpirePort :
                    targetCamp > currentCamp ? buildings.SpireBaseCamp :
                    null;
                if (missingStorage) {
                    for (let i = maxBay; i >= 0; i--) {
                        let [storageSupplies, storagePort, storageCamp] = getBestSupplyRatio(spireSupport - i, currentPort, currentCamp);
                        if (storageSupplies >= missingStorage.cost["Supply"]) {
                            adjustSpire(i, storagePort, storageCamp);
                            break;
                        }
                    }
                    break;
                }

                if (resources.Supply.currentQuantity >= targetSupplies) {
                    assignStorage = true;
                }
                if (!assignStorage || bestSupplies < nextCost || targetSupplies >= nextCost) {
                    // TODO: Assign storage gradually while it fills, instead of dropping directly to target. That'll need better intregration with autoBuild, to make sure it won't spent supplies on wrong building seeing that target still unaffrodable, and not knowing that it's temporaly
                    adjustSpire(targetMech, targetPort, targetCamp);
                    break;
                }
            }
        }

        resources.Power.currentQuantity = availablePower;
        resources.Power.rateOfChange = availablePower;

        // Disable underpowered buildings, one at time. Unless it's ship - which may stay with warning until they'll get crew
        let warnBuildings = $("span.on.warn");
        for (let i = 0; i < warnBuildings.length; i++) {
            let building = buildingIds[warnBuildings[i].parentNode.id];
            if (building && building.autoStateEnabled && !building.is.ship) {
                if (building === buildings.BeltEleriumShip || building === buildings.BeltIridiumShip || building === buildings.BeltIronShip) {
                    let beltSupportNeeded = (buildings.BeltEleriumShip.stateOnCount * 2 + buildings.BeltIridiumShip.stateOnCount + buildings.BeltIronShip.stateOnCount) * traitVal('high_pop', 0, 1);
                    if (beltSupportNeeded <= resources.Belt_Support.maxQuantity) {
                        continue;
                    }
                }
                if (building === buildings.LakeBireme || building === buildings.LakeTransport) {
                    let lakeSupportNeeded = buildings.LakeBireme.stateOnCount + buildings.LakeTransport.stateOnCount;
                    if (lakeSupportNeeded <= resources.Lake_Support.maxQuantity) {
                        continue;
                    }
                }
                if (building === buildings.TauBeltWhalingShip || building === buildings.TauBeltMiningShip) {
                    continue;
                }
                building.tryAdjustState(-1);
                break;
            }
        }
    }

