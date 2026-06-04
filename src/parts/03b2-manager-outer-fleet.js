    var FleetManagerOuter = {
        _fleetVueBinding: "shipPlans",
        _fleetVue: undefined,
        _explorerBlueprint: {class: "explorer", armor: "neutronium", weapon: "railgun", engine: "emdrive", power: "elerium", sensor: "quantum"},

        nextShipName: null,
        nextShipCost: null,
        nextShipAffordable: null,
        nextShipExpandable: null,
        nextShipMsg: null,

        WeaponPower: {railgun: 36, laser: 64, p_laser: 54, plasma: 90, phaser: 114, disruptor: 156},
        SensorRange: {visual: 1, radar: 20, lidar: 35, quantum: 60},
        ClassPower: {corvette: 1, frigate: 1.5, destroyer: 2.75, cruiser: 5.5, battlecruiser: 10, dreadnought: 22, explorer: 1.2},
        ClassCrew: {corvette: 2, frigate: 3, destroyer: 4, cruiser: 6, battlecruiser: 8, dreadnought: 10, explorer: 10},

        // spc_dwarf is ignored, never having any syndicate
        Regions: ["spc_moon", "spc_red", "spc_gas", "spc_gas_moon", "spc_belt", "spc_titan", "spc_enceladus", "spc_triton", "spc_kuiper", "spc_eris"],

        ShipConfig: {
            class: ['corvette','frigate','destroyer','cruiser','battlecruiser','dreadnought','explorer'],
            power: ['solar','diesel','fission','fusion','elerium'],
            weapon: ['railgun','laser','p_laser','plasma','phaser','disruptor'],
            armor : ['steel','alloy','neutronium'],
            engine: ['ion','tie','pulse','photon','vacuum','emdrive'],
            sensor: ['visual','radar','lidar','quantum'],
        },

        getWeighting(id) {
            return settings["fleet_outer_pr_" + id];
        },

        getMaxDefense(id) {
            return settings["fleet_outer_def_" + id];
        },

        getMaxScouts(id) {
            return settings["fleet_outer_sc_" + id];
        },

        getShipName(ship) {
            return game.loc(`outer_shipyard_class_${ship.class}`);
        },

        getLocName(loc) {
            let locRef = loc === "tauceti" ? game.loc('tech_era_tauceti') : game.actions.space[loc].info.name;
            return typeof locRef === 'function' ? locRef() : locRef;
        },

        isUnlocked(id) {
            return id === "spc_moon" && game.global.race['orbit_decayed'] ? false
                : game.actions.space[id].info.syndicate?.() ?? false;
        },

        updateNextShip(ship) {
            if (ship) {
                let cost = poly.shipCosts(ship);
                this.nextShipCost = cost;
                this.nextShipAffordable = true;
                this.nextShipExpandable = true;
                this.nextShipMsg = null;
                this.nextShipName = null;
                for (let res in cost) {
                    if (resources[res].maxQuantity < cost[res]) {
                        this.nextShipAffordable = false;
                        if (!resources[res].hasStorage()) {
                            this.nextShipExpandable = false;
                        }
                    }
                }
            } else {
                this.nextShipCost = null;
                this.nextShipAffordable = null;
                this.nextShipExpandable = null;
                this.nextShipMsg = null;
                this.nextShipName = null;
            }
        },

        initFleet() {
            if (!game.global.tech.syndicate || !game.global.space.shipyard?.hasOwnProperty('blueprint')) {
                return false;
            }

            this._fleetVue = getVueById(this._fleetVueBinding);
            if (this._fleetVue === undefined) {
                return false;
            }

            return true;
        },

        getFighterBlueprint() {
            return Object.fromEntries(Object.keys(this.ShipConfig).map(type => ([type, settings["fleet_outer_" + type]])));
        },

        getScoutBlueprint() {
            return Object.fromEntries(Object.keys(this.ShipConfig).map(type => ([type, settings["fleet_scout_" + type]])));
        },

        getMissingResource(ship) {
            let cost = poly.shipCosts(ship);
            for (let res in cost) {
                if (resources[res].currentQuantity < cost[res]) {
                    return res;
                }
            }
            return null;
        },

        avail(ship) {
            let yard = game.global.space.shipyard;
            if (ship.class === "explorer" && (ship.weapon !== "railgun" || ship.sensor !== "quantum")) {
                return false;
            }
            for (let [type, part] of Object.entries(ship)) {
                if (type !== "name" && yard.blueprint[type] !== part && !(ship.class === "explorer" && (part === "weapon" || part === "sensor"))) {
                    if (!this._fleetVue.avail(type, this.ShipConfig[type].indexOf(part), part)) {
                        return false;
                    }
                }
            }
            return true;
        },

        build(ship, region) {
            let yard = game.global.space.shipyard;
            for (let [type, part] of Object.entries(ship)) {
                if (type !== 'name' && (yard.blueprint[type] !== part || ship.class === "explorer" || yard.blueprint.class === "explorer")) {
                    this._fleetVue.setVal(type, part);
                }
            }
            if (this._fleetVue.powerText().includes("danger")) {
                return false;
            }

            let cost = poly.shipCosts(ship);
            for (let res in cost) {
                resources[res].currentQuantity -= cost[res];
            }

            if (yard.sort) {
                $("#shipPlans .b-checkbox").eq(1).click()
                this._fleetVue.build();
                getVueById('shipReg0')?.setLoc(region, yard.ships.length);
                $("#shipPlans .b-checkbox").eq(1).click()
            } else {
                this._fleetVue.build();
                getVueById('shipReg0')?.setLoc(region, yard.ships.length);
            }
            return true;
        },

        getShipAttackPower(ship) {
            return Math.round(this.WeaponPower[ship.weapon] * this.ClassPower[ship.class]);
        },

        shipCount(loc, template) {
            let count = 0;
            for (let ship of game.global.space.shipyard.ships) {
                if (ship.location === loc
                    && ship.class === template.class
                    && ship.power === template.power
                    && ship.weapon === template.weapon
                    && ship.armor === template.armor
                    && ship.engine === template.engine
                    && ship.sensor === template.sensor) {
                    count++;
                }
            }
            return count;
        },

        // export function syndicate(region,extra) from truepath.js with added "all" argument
        syndicate(region, extra, all) {
            if (!game.global.tech['syndicate'] || !game.global.race['truepath'] || !game.global.space.syndicate?.hasOwnProperty(region)){
                return extra ? {p: 1, r: 0, s: 0} : 1;
            }
            let rivalRel = game.global.civic.foreign.gov3.hstl;
            let rival = rivalRel < 10 ? (250 - (25 * rivalRel)) :
                        rivalRel > 60 ? (-13 * (rivalRel - 60)) : 0;

            let divisor = 1000;
            switch (region){
                case 'spc_home':
                case 'spc_moon':
                case 'spc_red':
                case 'spc_hell':
                    divisor = 1250 + rival;
                    break;
                case 'spc_gas':
                case 'spc_gas_moon':
                case 'spc_belt':
                    divisor = 1020 + rival;
                    break;
                case 'spc_titan':
                case 'spc_enceladus':
                    divisor = !haveTech('triton') ? 600 :
                      game.actions.space[region].info.syndicate_cap();
                    break;
                case 'spc_triton':
                case 'spc_kuiper':
                case 'spc_eris':
                    divisor = game.actions.space[region].info.syndicate_cap();
                    break;
            }

            let piracy = game.global.space.syndicate[region];
            let patrol = 0;
            let sensor = 0;
            if (game.global.space.shipyard?.hasOwnProperty('ships')){
                for (let ship of game.global.space.shipyard.ships) {
                    if (ship.location === region && ((ship.transit === 0 && ship.fueled) || all)){
                        let rating = this.getShipAttackPower(ship);
                        patrol += ship.damage > 0 ? Math.round(rating * (100 - ship.damage) / 100) : rating;
                        sensor += this.SensorRange[ship.sensor];
                    }
                }

                if (region === 'spc_enceladus'){
                    patrol += buildings.EnceladusBase.stateOnCount * 50;
                } else if (region === 'spc_titan'){
                    patrol += buildings.TitanSAM.stateOnCount * 25;
                } else if (region === 'spc_triton' && buildings.TritonFOB.stateOnCount > 0){
                    patrol += 500;
                    sensor += 10;
                }

                if (sensor > 100){
                    sensor = Math.round((sensor - 100) / ((sensor - 100) + 200) * 100) + 100;
                }

                patrol = Math.round(patrol * ((sensor + 25) / 125));
                piracy = piracy - patrol > 0 ? piracy - patrol : 0;
            }
            if (extra) {
                return {
                    p: 1 - +(piracy / divisor).toFixed(4),
                    r: piracy,
                    s: sensor
                };
            } else {
                return 1 - +(piracy / divisor).toFixed(4);
            }
        }
    }

