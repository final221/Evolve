    function adjustSpire(mech, port, camp) {
        buildings.SpireMechBay.tryAdjustState(mech - buildings.SpireMechBay.stateOnCount);
        buildings.SpirePort.tryAdjustState(port - buildings.SpirePort.stateOnCount);
        buildings.SpireBaseCamp.tryAdjustState(camp - buildings.SpireBaseCamp.stateOnCount);
    }

    function getBestSupplyRatio(support, maxPorts, maxCamps) {
        let bestPort = 0;
        let bestCamp = 0;

        let optPort = Math.ceil(support / 2 + 1);
        let optCamp = Math.floor(support / 2 - 1);
        if (support <= 3 || optPort > maxPorts) {
            bestPort = Math.min(maxPorts, support);
            bestCamp = Math.min(maxCamps, support - bestPort);
        } else if (optCamp > maxCamps) {
            bestCamp = Math.min(maxCamps, support);
            bestPort = Math.min(maxPorts, support - bestCamp);
        } else if (optPort <= maxPorts && optCamp <= maxCamps) {
            bestPort = optPort;
            bestCamp = optCamp;
        }
        let supplies = Math.round(bestPort * (1 + bestCamp * 0.4) * 10000 + 100);
        return [supplies, bestPort, bestCamp];
    }

    function expandStorage(storageToBuild) {
        let missingStorage = storageToBuild;
        let numberOfCratesWeCanBuild = resources.Crates.maxQuantity - resources.Crates.currentQuantity;
        let numberOfContainersWeCanBuild = resources.Containers.maxQuantity - resources.Containers.currentQuantity;

        for (let res in resources.Crates.cost) {
            numberOfCratesWeCanBuild = Math.min(numberOfCratesWeCanBuild, resources[res].currentQuantity / resources.Crates.cost[res]);
        }
        for (let res in resources.Containers.cost) {
            numberOfContainersWeCanBuild = Math.min(numberOfContainersWeCanBuild, resources[res].currentQuantity / resources.Containers.cost[res]);
        }

        if (settings.storageLimitPreMad && isEarlyGame()) {
            // Only build pre-mad containers when steel is excessing
            if (resources.Steel.storageRatio < 0.8) {
                numberOfContainersWeCanBuild = 0;
            }
            // Only build pre-mad crates when already have Plywood for next level of library
            if (isLumberRace() && buildings.Library.count < 20 && buildings.Library.cost["Plywood"] > resources.Plywood.currentQuantity && resources.Steel.maxQuantity >= resources.Steel.storageRequired) {
                numberOfCratesWeCanBuild = 0;
            }
        }

        // Build crates
        let cratesToBuild = Math.min(Math.floor(numberOfCratesWeCanBuild), Math.ceil(missingStorage / StorageManager.crateValue));
        StorageManager.constructCrate(cratesToBuild);

        resources.Crates.currentQuantity += cratesToBuild;
        for (let res in resources.Crates.cost) {
            resources[res].currentQuantity -= resources.Crates.cost[res] * cratesToBuild;
        }
        missingStorage -= cratesToBuild * StorageManager.crateValue;

        // And containers, if still needed
        if (missingStorage > 0) {
            let containersToBuild = Math.min(Math.floor(numberOfContainersWeCanBuild), Math.ceil(missingStorage / StorageManager.containerValue));
            StorageManager.constructContainer(containersToBuild);

            resources.Containers.currentQuantity += containersToBuild;
            for (let res in resources.Containers.cost) {
                resources[res].currentQuantity -= resources.Containers.cost[res] * containersToBuild;
            }
            missingStorage -= containersToBuild * StorageManager.containerValue;
        }
        return missingStorage < storageToBuild;
    }

    // TODO: Implement preserving of old layout, to reduce flickering
    function autoStorage() {
        let m = StorageManager;
        if (!m.initStorage()) {
            return;
        }

        if (m.crateValue <= 0 || m.containerValue <= 0) {
            // Shouldn't ever happen, but better check than sorry. Trying to adjust storages thinking that crates are worthless could end pretty bad.
            return;
        }

        let storageList = m.priorityList.filter(r => r.isUnlocked() && r.isManagedStorage());
        if (storageList.length === 0) {
            return;
        }

        // Init base storage and multipliers
        let totalCrates = resources.Crates.currentQuantity;
        let totalContainers = resources.Containers.currentQuantity;
        let storageAdjustments = {}, resMods = {}, resCurrent = {}, resOverflow = {}, resMin = {}, resRequired = {};
        for (let resource of storageList){
            let res = resource.id;

            if (!settings.storageAssignExtra) {
                resMods[res] = 1;
            } else {
                let sellAllowed = !game.global.race['no_trade'] && settings.autoMarket && resource.autoSellEnabled && resource.autoSellRatio > 0;
                resMods[res] = sellAllowed ? 1.03 / resource.autoSellRatio : 1.03;
            }

            if (resource.storeOverflow) {
                resOverflow[res] = resource.currentQuantity * 1.03;
            }
            resRequired[res] = resource.storageRequired;
            resCurrent[res] = resource.currentQuantity;
            resMin[res] = resource.minStorage;

            storageAdjustments[res] = {crate: 0, container: 0, amount: resource.maxQuantity - (resource.currentCrates * m.crateValue + resource.currentContainers * m.containerValue)};
            totalCrates += resource.currentCrates;
            totalContainers += resource.currentContainers;
        }

        let buildingsList = [];
        let storageEntries = storageList.map((res) => [res.id, []]);
        const addList = list => {
            let resGroups = Object.fromEntries(storageEntries);
            list.forEach(obj => storageList.find(res => obj.cost[res.id] && resGroups[res.id].push(obj)));
            Object.entries(resGroups).forEach(([res, list]) => list.sort((a, b) => b.cost[res] - a.cost[res]));
            buildingsList.push(...Object.values(resGroups).flat());
        }

        // TODO: Configurable priority?
        if (settings.storageSafeReassign) {
            addList([{cost: resCurrent, isList: true}]);
        }
        addList([{cost: resMin, isList: true}]);
        addList([{cost: resOverflow, isList: true}]);
        addList(state.queuedTargetsAll);
        addList(state.triggerTargets);
        if (settings.autoFleet && FleetManagerOuter.nextShipExpandable && settings.prioritizeOuterFleet !== "ignore") {
            addList([{cost: FleetManagerOuter.nextShipCost}]);
        }
        addList(state.unlockedTechs);
        addList(ProjectManager.priorityList.filter(b => b.isUnlocked() && b.autoBuildEnabled));
        addList(BuildingManager.priorityList.filter(p => p.isUnlocked() && p.autoBuildEnabled));
        if (settings.storageAssignPart) {
            addList([{cost: resRequired, isList: true}]);
        }

        let storageToBuild = 0;
        // Calculate required storages
        nextBuilding:
        for (let item of buildingsList) {
            let currentAssign = {};
            let remainingCrates = totalCrates;
            let remainingContainers = totalContainers;

            for (let res in item.cost) {
                let resource = resources[res];
                let quantity = item.cost[res];
                let mod = item.isList ? 1 : resMods[res];

                if (!storageAdjustments[res]) {
                    if (resource.maxQuantity >= quantity) {
                        // Non-expandable, storage met - we're good
                        continue;
                    } else {
                        // Non-expandable, storage not met - ignore building
                        continue nextBuilding;
                    }
                } else if (storageAdjustments[res].amount >= quantity * mod) {
                    // Expandable, storage met - we're good
                    continue;
                }
                if (!item.isList && resource.maxStorage >= 0 && resource.maxStorage < quantity * mod) {
                    continue nextBuilding;
                }
                // Expandable, storage not met - try to assign
                let missingStorage = Math.min((resource.maxStorage >= 0 ? resource.maxStorage : Number.MAX_SAFE_INTEGER), quantity * mod) - storageAdjustments[res].amount;
                let availableStorage = (remainingCrates * m.crateValue) + (remainingContainers * m.containerValue);
                if (item.isList || missingStorage <= availableStorage) {
                    currentAssign[res] = {crate: 0, container: 0};
                    if (missingStorage > 0 && remainingCrates > 0) {
                        let assignCrates = Math.min(Math.ceil(missingStorage / m.crateValue), remainingCrates);
                        remainingCrates -= assignCrates;
                        missingStorage -= assignCrates * m.crateValue;
                        currentAssign[res].crate = assignCrates;
                    }
                    if (missingStorage > 0 && remainingContainers > 0) {
                        let assignContainer = Math.min(Math.ceil(missingStorage / m.containerValue), remainingContainers);
                        remainingContainers -= assignContainer;
                        missingStorage -= assignContainer * m.containerValue;
                        currentAssign[res].container = assignContainer;
                    }
                    if (missingStorage > 0) {
                        storageToBuild = Math.max(storageToBuild, missingStorage);
                    }
                } else {
                    storageToBuild = Math.max(storageToBuild, missingStorage - availableStorage);
                    continue nextBuilding;
                }
            }
            // Building as affordable, record used storage
            for (let id in currentAssign) {
                storageAdjustments[id].crate += currentAssign[id].crate;
                storageAdjustments[id].container += currentAssign[id].container;
                storageAdjustments[id].amount += currentAssign[id].crate * m.crateValue + currentAssign[id].container * m.containerValue;
            }
            totalCrates = remainingCrates;
            totalContainers = remainingContainers;
        }

        // Missing storage, try to build more
        if (storageToBuild > 0 && expandStorage(storageToBuild)) {
            // Stop if we bought something, we'll continue in next tick, after re-calculation of required storage
            return;
        }

        // Go to clicking, unassign first
        for (let id in storageAdjustments) {
            let resource = resources[id];
            let crateDelta = storageAdjustments[id].crate - resource.currentCrates;
            let containerDelta = storageAdjustments[id].container - resource.currentContainers;
            if (crateDelta < 0) {
                m.unassignCrate(resource, crateDelta * -1);
                resource.maxQuantity += crateDelta * m.crateValue;
                resources.Crates.currentQuantity -= crateDelta;
            }
            if (containerDelta < 0) {
                m.unassignContainer(resource, containerDelta * -1);
                resource.maxQuantity += containerDelta * m.containerValue;
                resources.Containers.currentQuantity -= containerDelta;
            }
        }
        for (let id in storageAdjustments) {
            let resource = resources[id];
            let crateDelta = storageAdjustments[id].crate - resource.currentCrates;
            let containerDelta = storageAdjustments[id].container - resource.currentContainers;
            if (crateDelta > 0) {
                m.assignCrate(resource, crateDelta);
                resource.maxQuantity += crateDelta * m.crateValue;
                resources.Crates.currentQuantity += crateDelta;
            }
            if (containerDelta > 0) {
                m.assignContainer(resource, containerDelta);
                resource.maxQuantity += containerDelta * m.containerValue;
                resources.Containers.currentQuantity += containerDelta;
            }
        }
    }

