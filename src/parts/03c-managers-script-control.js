    var JobManager = {
        priorityList: [],
        craftingJobs: [],

        sortByPriority() {
            this.priorityList.sort((a, b) => a.priority - b.priority);
        },

        managedPriorityList() {
            let ret = [];
            if (settings.autoJobs) {
                ret = this.priorityList.filter(job => job.isManaged());
            }
            if (settings.autoCraftsmen) {
                ret = ret.concat(this.craftingJobs.filter(job => job.isManaged()));
            }
            return ret;
        },

        servantsMax() {
            if (!game.global.race.servants) {
                return 0;
            }

            let max = game.global.race.servants.max;
            for (let job of this.priorityList) {
                if (job.is.serve && !job.isManaged()) {
                    max -= job.servants;
                }
            }
            return max;
        },

        skilledServantsMax() {
            if (!game.global.race.servants) {
                return 0;
            }

            let max = game.global.race.servants.smax;
            for (let job of this.craftingJobs) {
                if (!job.isManaged()) {
                    max -= job.servants;
                }
            }
            return max;
        },

        craftingMax() {
            if (!game.global.city.foundry) {
                return 0;
            }

            let max = game.global.civic.craftsman.max;
            for (let job of this.craftingJobs) {
                if (!job.isManaged()) {
                    max -= job.count;
                }
            }
            // Thermite is ignored by script, let's pretend it's not exists
            max -= game.global.city.foundry.Thermite ?? 0;
            return max;
        }
    }

    var BuildingManager = {
        priorityList: [],
        statePriorityList: [],

        updateBuildings() {
            for (let building of Object.values(buildings)){
                building.updateResourceRequirements();
                building.extraDescription = "";
            }
        },

        updateWeighting() {
             // Check generic conditions, and multiplier - x1 have no effect, so skip them too.
            let activeRules = weightingRules.filter(rule => rule[wrGlobalCondition]() && rule[wrMultiplier]() !== 1);

            // Iterate over buildings
            for (let building of this.priorityList){
                building.weighting = building._weighting;

                // Apply weighting rules
                for (let j = 0; j < activeRules.length; j++) {
                    let result = activeRules[j][wrIndividualCondition](building);
                    // Rule passed
                    if (result) {
                        let note = activeRules[j][wrDescription](result, building);
                        if (note !== "") {
                            building.extraDescription += note + "<br>";
                        }
                        building.weighting *= activeRules[j][wrMultiplier](result);


                        // Last rule disabled building, no need to check the rest
                        if (building.weighting <= 0) {
                            break;
                        }
                    }
                }
                if (building.weighting > 0) {
                    building.weighting = Math.max(Number.MIN_VALUE, building.weighting - 1e-7 * building.count);
                    building.extraDescription = "AutoBuild weighting: " + getNiceNumber(building.weighting) + "<br>" + building.extraDescription;
                }
            }
        },

        sortByPriority() {
            this.priorityList.sort((a, b) => a.priority - b.priority);
            this.statePriorityList.sort((a, b) => a.priority - b.priority);
        },

        managedPriorityList() {
            return this.priorityList.filter(building => building.weighting > 0);
        },

        managedStatePriorityList() {
            return this.statePriorityList.filter(building => (building.hasState() && building.autoStateEnabled && building.count > 0));
        }
    }

    var ProjectManager = {
        priorityList: [],

        updateProjects() {
            for (let project of this.priorityList){
                project.updateResourceRequirements();
                project.extraDescription = "";
            }
        },

        updateWeighting() {
            // Iterate over projects
            for (let project of this.priorityList){
                project.weighting = project._weighting * project.currentStep;

                if (!project.isUnlocked()) {
                    project.weighting = 0;
                    project.extraDescription = "Locked<br>";
                }
                if (!project.autoBuildEnabled || !settings.autoARPA) {
                    project.weighting = 0;
                    project.extraDescription = "AutoBuild disabled<br>";
                }
                if (project.count >= project.autoMax && (project !== projects.ManaSyphon || !isPrestigeAllowed("vacuum"))) {
                    project.weighting = 0;
                    project.extraDescription = "Maximum amount reached<br>";
                }
                if (settings.prestigeMADIgnoreArpa && isEarlyGame()) {
                    project.weighting = 0;
                    project.extraDescription = "Projects ignored Pre-MAD<br>";
                }
                if (state.queuedTargets.includes(project)) {
                    project.weighting = 0;
                    project.extraDescription = "Queued project, processing...<br>";
                }
                if (state.triggerTargets.includes(project)) {
                    project.weighting = 0;
                    project.extraDescription = "Active trigger, processing...<br>";
                }
                if (!project.isAffordable(true)) {
                    project.weighting = 0;
                    project.extraDescription = "Not enough storage<br>";
                }
                if (project === projects.ManaSyphon && settings.prestigeBioseedConstruct && settings.prestigeType !== "vacuum" && game.global.race['witch_hunter']) {
                    project.weighting = 0;
                    project.extraDescription = "Not needed for current prestige<br>";
                }

                if (settings.arpaScaleWeighting) {
                    project.weighting /= 1 - (0.01 * project.progress);
                }
                if (project.weighting > 0) {
                    project.extraDescription = `AutoARPA weighting: ${getNiceNumber(project.weighting)} (${project.currentStep}%)<br>${project.extraDescription}`;
                }
            }
        },

        sortByPriority() {
            this.priorityList.sort((a, b) => a.priority - b.priority);
        },

        managedPriorityList() {
            return this.priorityList.filter(project => project.weighting > 0);
        }
    }

    var TriggerManager = {
        priorityList: [],
        targetTriggers: [],

        resetTargetTriggers() {
            this.targetTriggers = [];
            for (let trigger of this.priorityList) {
                trigger.updateComplete();
                if (!trigger.complete && trigger.areRequirementsMet() && trigger.isActionPossible() && !this.actionConflicts(trigger)) {
                    this.targetTriggers.push(trigger);
                }
            }
        },

        getTrigger(seq) {
            return this.priorityList.find(trigger => trigger.seq === seq);
        },

        sortByPriority() {
            this.priorityList.sort((a, b) => a.priority - b.priority);
        },

        AddTrigger(requirementType, requirementId, requirementCount, actionType, actionId, actionCount) {
            let trigger = new Trigger(this.priorityList.length, this.priorityList.length, requirementType, requirementId, requirementCount, actionType, actionId, actionCount);
            this.priorityList.push(trigger);
            return trigger;
        },

        AddTriggerFromSetting(raw) {
            let existingSequence = this.priorityList.some(trigger => trigger.seq === raw.seq);
            if (!existingSequence) {
                let trigger = new Trigger(raw.seq, raw.priority, raw.requirementType, raw.requirementId, raw.requirementCount, raw.actionType, raw.actionId, raw.actionCount);
                this.priorityList.push(trigger);
            }
        },

        RemoveTrigger(seq) {
            let indexToRemove = this.priorityList.findIndex(trigger => trigger.seq === seq);

            if (indexToRemove === -1) {
                return;
            }

            this.priorityList.splice(indexToRemove, 1);

            for (let i = 0; i < this.priorityList.length; i++) {
                let trigger = this.priorityList[i];
                trigger.seq = i;
                trigger.priority = i;
            }
        },

        DuplicateTrigger(seq) {
            let indexToDuplicate = this.priorityList.findIndex(trigger => trigger.seq === seq);

            if (indexToDuplicate === -1) {
                return;
            }

            let triggerToDuplicate = this.priorityList[indexToDuplicate];
            let trigger = new Trigger(
                0,
                0,
                triggerToDuplicate.requirementType,
                triggerToDuplicate.requirementId,
                triggerToDuplicate.requirementCount,
                triggerToDuplicate.actionType,
                triggerToDuplicate.actionId,
                triggerToDuplicate.actionCount,
            )
            this.priorityList.splice(indexToDuplicate, 0, trigger);

            for (let i = 0; i < this.priorityList.length; i++) {
                let trigger = this.priorityList[i];
                trigger.seq = i;
                trigger.priority = i;
            }
        },

        EvalizeTrigger(seq) {
            let indexToEval = this.priorityList.findIndex(trigger => trigger.seq === seq);

            if (indexToEval === -1) {
                return;
            }

            let trigger = this.priorityList[indexToEval];

            let check = "";
            switch (trigger.requirementType) {
                case "Eval":
                    check = trigger.requirementId;
                    break;
                default:
                    check = `_("${trigger.requirementType}",${JSON.stringify(trigger.requirementId)})`;
            }

            win.prompt("Eval of this condition:", check);
        },

        // This function only checks if two triggers use the same resource, it does not check storage
        actionConflicts(trigger) {
            for (let targetTrigger of this.targetTriggers) {
                if (Object.keys(targetTrigger.cost()).some(cost => Object.keys(trigger.cost()).includes(cost))) {
                    return true;
                }
            }

            return false;
        },
    }

    var WindowManager = {
        openedByScript: false,
        _callbackWindowTitle: "",
        _callbackFunction: null,

        currentModalWindowTitle() {
            let modalTitleNode = document.getElementById("modalBoxTitle");
            if (modalTitleNode === null) {
                return "";
            }

            // Modal title will either be a single name or a combination of resource and storage
            // eg. single name "Smelter" or "Factory"
            // eg. combination "Iridium - 26.4K/279.9K"
            let indexOfDash = modalTitleNode.textContent.indexOf(" - ");
            if (indexOfDash === -1) {
                return modalTitleNode.textContent;
            } else {
                return modalTitleNode.textContent.substring(0, indexOfDash);
            }
        },

        openModalWindowWithCallback(elementToClick, callbackWindowTitle, callbackFunction) {
            if (this.isOpen()) {
                return;
            }

            this.openedByScript = true;
            this._callbackWindowTitle = callbackWindowTitle;
            this._callbackFunction = callbackFunction;
            elementToClick.click()
        },

        isOpen() {
            // Checks both the game modal window and our script modal window
            // game = modalBox
            // script = scriptModal
            return this.openedByScript || document.getElementById("modalBox") !== null || document.getElementById("scriptModal")?.style.display === "block";
        },

        checkCallbacks() {
            // We only care if the script itself opened the modal. If the user did it then ignore it.
            // There must be a call back function otherwise there is nothing to do.
            if (WindowManager.currentModalWindowTitle() === WindowManager._callbackWindowTitle &&
                    WindowManager.openedByScript && WindowManager._callbackFunction) {

                WindowManager._callbackFunction();

                let modalCloseBtn = document.querySelector('.modal .modal-close');
                if (modalCloseBtn !== null) {
                    modalCloseBtn.click();
                }
            } else {
                // If we hid users's modal - show it back
                let modal = document.querySelector('.modal');
                if (modal !== null) {
                    modal.style.display = "";
                }
            }

            WindowManager.openedByScript = false;
            WindowManager._callbackWindowTitle = "";
            WindowManager._callbackFunction = null;
        }
    }

    var KeyManager = {
        _setFn: null,
        _unsetFn: null,
        _allFn: null,
        _eventProp: {Shift: "shiftKey", Control: "ctrlKey", Alt: "altKey", Meta: "metaKey"},
        _state: {x100: undefined, x25: undefined, x10: undefined},
        _mode: "none",

        init() {
            let events = win.$._data(win.document).events;
            let set = events?.keydown?.[0]?.handler ?? null;
            let unset = events?.keyup?.[0]?.handler ?? null;
            let all = events?.mousemove?.[0]?.handler ?? null;

            if (!all && (!set || !unset)) { // Fallback, if there's no handlers in JQuery data
                this._setFn = (e) => document.dispatchEvent(new KeyboardEvent("keydown", e));
                this._unsetFn = (e) => document.dispatchEvent(new KeyboardEvent("keyup", e));
                this._allFn = null;
            } else if (needSandboxBypass) { // FF fix
                this._setFn = (e) => set(cloneInto(e, unsafeWindow));
                this._unsetFn = (e) => unset(cloneInto(e, unsafeWindow));
                this._allFn = (e) => all(cloneInto(e, unsafeWindow));
            } else {
                this._setFn = set;
                this._unsetFn = unset;
                this._allFn = all;
            }
        },

        reset() {
            this._state.x100 = undefined;
            this._state.x25 = undefined;
            this._state.x10 = undefined;

            let map = game.global.settings.keyMap;
            let keys = Object.values(map);
            let uniq = ['x100', 'x25', 'x10'].every(key => keys.indexOf(map[key]) === keys.lastIndexOf(map[key]));

            if (!game.global.settings.mKeys) {
                this._mode = "none";
            } else if (!uniq) {
                this._mode = "unset";
            } else if (this._allFn && ['x100', 'x25', 'x10'].every(key => ['Shift', 'Control', 'Alt', 'Meta'].includes(game.global.settings.keyMap[key]))) {
                this._mode = "all";
            } else {
                this._mode = "each";
            }
        },

        finish() {
            if (this._state.x100 || this._state.x25 || this._state.x10) {
                this.set(false, false, false);
            }
        },

        setKey(key, pressed) {
            if (this._state[key] === pressed) {
                return;
            }
            let fakeEvent = {key: game.global.settings.keyMap[key]};
            if (pressed) {
                this._setFn(fakeEvent);
            } else {
                this._unsetFn(fakeEvent);
            }
            this._state[key] = pressed;
        },

        set(x100, x25, x10) {
            if (this._mode === "all") {
                let map = game.global.settings.keyMap;
                let fakeEvent = {
                  [this._eventProp[map.x100]]: this._state.x100 = x100,
                  [this._eventProp[map.x25]]: this._state.x25 = x25,
                  [this._eventProp[map.x10]]: this._state.x10 = x10
                };
                this._allFn(fakeEvent);
            } else if (this._mode === "each" || this._mode === "unset") {
                this.setKey("x100", x100);
                this.setKey("x25", x25);
                this.setKey("x10", x10);
            }
        },

        *click(amount) {
            if (this._mode === "none") {
                while (amount > 0) {
                    yield amount -= 1;
                }
            } else if (this._mode === "unset") {
                this.set(false, false, false);
                while (amount > 0) {
                    yield amount -= 1;
                }
            } else {
                while (amount > 0) {
                    if (amount >= 25000) {
                        this.set(true, true, true);
                        yield amount -= 25000;
                    } else if (amount >= 2500) {
                        this.set(true, true, false);
                        yield amount -= 2500;
                    } else if (amount >= 1000) {
                        this.set(true, false, true);
                        yield amount -= 1000;
                    } else if (amount >= 250) {
                        this.set(false, true, true);
                        yield amount -= 250;
                    } else if (amount >= 100) {
                        this.set(true, false, false);
                        yield amount -= 100;
                    } else if (amount >= 25) {
                        this.set(false, true, false);
                        yield amount -= 25;
                    } else if (amount >= 10) {
                        this.set(false, false, true);
                        yield amount -= 10;
                    } else {
                        this.set(false, false, false);
                        yield amount -= 1;
                    }
                }
            }
        }
    }

