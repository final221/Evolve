    var FleetManager = {
        _fleetVueBinding: "fleet",
        _fleetVue: undefined,

        initFleet() {
            if (!game.global.tech.piracy) {
                return false;
            }

            this._fleetVue = getVueById(this._fleetVueBinding);
            if (this._fleetVue === undefined) {
                return false;
            }

            return true;
        },

        addShip(region, ship, count) {
            for (let m of KeyManager.click(count)) {
                this._fleetVue.add(region, ship);
            }
        },

        subShip(region, ship, count) {
            for (let m of KeyManager.click(count)) {
                this._fleetVue.sub(region, ship);
            }
        }
    }

