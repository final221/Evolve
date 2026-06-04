    function importSettings(str) {
        //let saveState = JSON.parse(LZString.decompressFromBase64(str));
        let saveState = JSON.parse(str);
        if (!saveState && typeof saveState === "object" && (saveState.scriptName === "TMVictor" || $.isEmptyObject(saveState))) {
            return false;
        }
        let evals = [];
        Object.values(saveState.overrides ?? []).forEach(list => list.forEach(override => {
            if (override.type1 === "Eval") {
                evals.push(override.arg1);
            }
            if (override.type2 === "Eval") {
                evals.push(override.arg2);
            }
        }));
        saveState.triggers?.forEach(trigger => {
            if (trigger.requirementType === "Eval") {
                evals.push(trigger.requirementId);
            }
        });
        Object.values(saveState.overrides?.log_prestige_format ?? []).forEach(prestige_log_format_override => {
            if (prestige_log_format_override.ret.includes("{eval:")) {
                evals.push(prestige_log_format_override.ret);
            }
        });

        if (saveState.log_prestige_format?.includes("{eval:")) {
            evals.push(saveState.log_prestige_format);
        }

        if (evals.length > 0 && !confirm("Warning! Imported settings includes evaluated code, which will have full access to browser page, and can be potentially dangerous.\nOnly continue if you trust the source. Injected code:\n" + evals.join("\n"))) {
            return false;
        }
        console.log("Importing script settings");
        settingsRaw = saveState;
        updateStandAloneSettings();
        updateStateFromSettings();
        updateSettingsFromState();
        removeScriptSettings();
        removeMechInfo();
        removeStorageToggles();
        removeMarketToggles();
        removeArpaToggles();
        removeCraftToggles();
        removeBuildingToggles();
        removeEjectToggles();
        removeSupplyToggles();
        $('#autoScriptContainer').remove();
        updateUI();
        buildFilterRegExp();

        GameLog.logInfo("special", "Settings successfully imported");

        return true;
    }

    function exportSettings() {
        console.log("Exporting script settings");
        // return LZString.compressToBase64(JSON.stringify(global));
        return JSON.stringify(settingsRaw);
    }

