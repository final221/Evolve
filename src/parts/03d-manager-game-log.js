    var GameLog = {
        Types: {
            special: "Specials",
            construction: "Construction",
            multi_construction: "Multi-part Construction",
            arpa: "A.R.P.A Progress",
            research: "Research",
            spying: "Spying",
            attack: "Attack",
            mercenary: "Mercenaries",
            mech_build: "Mech Build",
            mech_scrap: "Mech Scrap",
            outer_fleet: "True Path Fleet",
            mutation: "Mutations",
            prestige: "Prestige"
        },

        logInfo(loggingType, text, tags) {
            if (!settings.logEnabled || !settings["log_" + loggingType]) {
                return;
            }

            poly.messageQueue(text, "info", false, tags);
        },

        logSuccess(loggingType, text, tags) {
            if (!settings.logEnabled || !settings["log_" + loggingType]) {
                return;
            }

            poly.messageQueue(text, "success", false, tags);
        },

        logWarning(loggingType, text, tags) {
            if (!settings.logEnabled || !settings["log_" + loggingType]) {
                return;
            }

            poly.messageQueue(text, "warning", false, tags);
        },

        logDanger(loggingType, text, tags) {
            if (!settings.logEnabled || !settings["log_" + loggingType]) {
                return;
            }

            poly.messageQueue(text, "danger", false, tags);
        },
    }

    // Gui & Init functions
