    function createMechInfo() {
        if ($(`#mechList .mechRow[draggable=true]`).length > 0) {
            return;
        }
        if (MechManager.isActive || MechManager.initLab()) {
            MechManager.mechObserver.disconnect();
            let list = getVueById("mechList");
            for (let i = 0; i < list._vnode.children.length; i++) {
                let mech = game.global.portal.mechbay.mechs[i];
                let stats = MechManager.getMechStats(mech);
                let rating = stats.power / MechManager.bestMech[mech.size].power;
                let info = (mech.size === 'collector' ?
                  `${Math.round(rating*100)}%, ${getNiceNumber(stats.power*MechManager.collectorValue)} /s`:
                  `${Math.round(rating*100)}%, ${getNiceNumber(stats.power*100)}, ${getNiceNumber(stats.efficiency*100)}`)
                  + " | ";

                let mechNode = list._vnode.children[i].elm;
                let firstNode = $(mechNode.childNodes[0]);
                if (firstNode.hasClass("ea-mech-info")) {
                    firstNode.text(info);
                } else {
                    let note = document.createElement("span");
                    note.className = "ea-mech-info";
                    note.innerHTML = info;
                    mechNode.insertBefore(note, mechNode.firstChild);
                }
            }
            MechManager.mechObserver.observe(document.getElementById("mechList"), {childList: true});
        }
    }

    function removeMechInfo() {
        MechManager.mechObserver.disconnect();
        $('#mechList .ea-mech-info').remove();
    }

    function createArpaToggles() {
        removeArpaToggles();

        for (let i = 0; i < ProjectManager.priorityList.length; i++) {
            let project = ProjectManager.priorityList[i];
            let projectElement = $('#arpa' + project.id + ' .head');
            if (projectElement.length) {
                let settingKey = "arpa_" + project.id;
                projectElement.append(addToggleCallbacks($(`
                  <label tabindex="0" class="switch ea-arpa-toggle" style="position:relative; max-width:75px; margin-top:-36px; left:59%; float:left;">
                    <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}>
                    <span class="check" style="height:5px;"></span>
                  </label>`), settingKey));
            }
        }
    }

    function removeArpaToggles() {
        $('#arpaPhysics .ea-arpa-toggle').remove();
    }

    function createCraftToggles() {
        removeCraftToggles();

        for (let i = 0; i < craftablesList.length; i++) {
            let craftable = craftablesList[i];
            let craftableElement = $('#res' + craftable.id + ' h3');
            if (craftableElement.length) {
                let settingKey = "craft" + craftable.id;
                craftableElement.parent().css('position', 'relative');
                addToggleCallbacks($(`
                  <label tabindex="0" class="switch ea-craft-toggle">
                    <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}/>
                    <span class="check" style="height:5px;"></span>
                  </label>`), settingKey).insertAfter(craftableElement);
            }
        }
    }

    function removeCraftToggles() {
        $('#resources .ea-craft-toggle').remove();
    }

    function createBuildingToggles() {
        removeBuildingToggles();

        // Building toggles redraw much more often than other toggles.
        // With settings off, disable them.
        if (!settings.showSettings) return;

        for (let i = 0; i < BuildingManager.priorityList.length; i++) {
            let building = BuildingManager.priorityList[i];
            let buildingElement = $('#' + building._vueBinding);
            if (buildingElement.length) {
                let settingKey = "bat" + building._vueBinding;
                buildingElement.append(addToggleCallbacks($(`
                  <label tabindex="0" class="switch ea-building-toggle" style="position:absolute; margin-top: 24px; left:10%;">
                    <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}/>
                    <span class="check" style="height:5px; max-width:15px"></span>
                  </label>`), settingKey));
                state.buildingToggles++;
            }
        }
    }

    function removeBuildingToggles() {
        $('#mTabCivil .ea-building-toggle').remove();
        state.buildingToggles = 0;
    }

    function createEjectToggles() {
        removeEjectToggles();

        $('#eject').append('<span id="script_eject_top_row" style="margin-left: auto; margin-right: 0.2rem; float: right;" class="has-text-danger">Auto Eject</span>');
        for (let resource of EjectManager.priorityList) {
            let ejectElement = $('#eject' + resource.id);
            if (ejectElement.length) {
                let settingKey = 'res_eject' + resource.id;
                ejectElement.append(addToggleCallbacks($(`
                  <label tabindex="0" title="Enable ejecting of this resource. When to eject is set in the Prestige Settings tab." class="switch ea-eject-toggle" style="margin-left:auto; margin-right:0.2rem;">
                    <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}>
                    <span class="check" style="height:5px;"></span>
                    <span class="state"></span>
                  </label>`), settingKey));
            }
        }
    }

    function removeEjectToggles() {
        $('#resEjector .ea-eject-toggle').remove();
        $("#script_eject_top_row").remove();
    }

    function createSupplyToggles() {
        removeSupplyToggles();

        $('#spireSupply').append('<span id="script_supply_top_row" style="margin-left: auto; margin-right: 0.2rem; float: right;" class="has-text-danger">Auto Supply</span>');
        for (let resource of SupplyManager.priorityList) {
            let supplyElement = $('#supply' + resource.id);
            if (supplyElement.length) {
                let settingKey = 'res_supply' + resource.id;
                supplyElement.append(addToggleCallbacks($(`
                  <label tabindex="0" title="Enable supply of this resource."  class="switch ea-supply-toggle" style="margin-left:auto; margin-right:0.2rem;">
                    <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}>
                    <span class="check" style="height:5px;"></span>
                    <span class="state"></span>
                  </label>`), settingKey));
            }
        }
    }

    function removeSupplyToggles() {
        $('#resCargo .ea-supply-toggle').remove();
        $("#script_supply_top_row").remove();
    }

    function createMarketToggles() {
        removeMarketToggles();

        if (!game.global.race['no_trade']) {
            $("#market .market-item[id] .res").width("5rem");
            $("#market .market-item[id] .buy span").text("B");
            $("#market .market-item[id] .sell span").text("S");
            $("#market .market-item[id] .trade > :first-child").text("R");
            $("#market .market-item[id] .trade .zero").text("×");
        }

        $("#market-qty").after(`
          <div class="market-item vb" id="script_market_top_row" style="overflow:hidden">
            <span style="margin-left: auto; margin-right: 0.2rem; float:right;">
              ${!game.global.race['no_trade']?`
              <span class="has-text-success" style="width: 2.75rem; margin-right: 0.3em; display: inline-block; text-align: center;">Buy</span>
              <span class="has-text-danger" style="width: 2.75rem; margin-right: 0.3em; display: inline-block; text-align: center;">Sell</span>`:''}
              <span class="has-text-warning" style="width: 2.75rem; margin-right: 0.3em; display: inline-block; text-align: center;">In</span>
              <span class="has-text-warning" style="width: 2.75rem; display: inline-block; text-align: center;">Away</span>
            </span>
          </div>`);

        for (let resource of MarketManager.priorityList) {
            if (resource === resources.Food && (game.global.race['artifical'] || game.global.race['fasting'])) {
                continue;
            }
            let marketElement = $('#market-' + resource.id);
            if (marketElement.length > 0) {
                let marketRow = $('<span class="ea-market-toggle" style="margin-left: auto; margin-right: 0.2rem; float:right;"></span>');

                if (!game.global.race['no_trade']) {
                    let buyKey = 'buy' + resource.id;
                    let sellKey = 'sell' + resource.id;
                    marketRow.append(
                      addToggleCallbacks($(`<label tabindex="0" title="Enable buying of this resource." class="switch"><input class="script_${buyKey}" type="checkbox"${settingsRaw[buyKey] ? " checked" : ""}><span class="check" style="height:5px;"></span><span class="state"></span></label>`), buyKey),
                      addToggleCallbacks($(`<label tabindex="0" title="Enable selling of this resource." class="switch"><input class="script_${sellKey}" type="checkbox"${settingsRaw[sellKey] ? " checked" : ""}><span class="check" style="height:5px;"></span><span class="state"></span></label>`), sellKey));
                }

                let tradeBuyKey = 'res_trade_buy_' + resource.id;
                let tradeSellKey = 'res_trade_sell_' + resource.id;
                marketRow.append(
                  addToggleCallbacks($(`<label tabindex="0" title="Enable trading for this resource." class="switch"><input class="script_${tradeBuyKey}" type="checkbox"${settingsRaw[tradeBuyKey] ? " checked" : ""}><span class="check" style="height:5px;"></span><span class="state"></span></label>`), tradeBuyKey),
                  addToggleCallbacks($(`<label tabindex="0" title="Enable trading this resource away." class="switch"><input class="script_${tradeSellKey}" type="checkbox"${settingsRaw[tradeSellKey] ? " checked" : ""}><span class="check" style="height:5px;"></span><span class="state"></span></label>`), tradeSellKey));

                marketRow.appendTo(marketElement);
            }
        }
    }

    function removeMarketToggles() {
        $('#market .ea-market-toggle').remove();
        $("#script_market_top_row").remove();

        if (!game.global.race['no_trade']) {
            $("#market .market-item[id] .res").width("7.5rem");
            $("#market .market-item[id] .buy span").text(game.loc('resource_market_buy'));
            $("#market .market-item[id] .sell span").text(game.loc('resource_market_sell'));
            $("#market .market-item[id] .trade > :first-child").text(game.loc('resource_market_routes'));
            $("#market .market-item[id] .trade .zero").text(game.loc('cancel_routes'));
        }
    }

    function createStorageToggles() {
        removeStorageToggles();

        $("#createHead").after(`
          <div class="market-item vb" id="script_storage_top_row" style="overflow:hidden">
            <span style="margin-left: auto; margin-right: 0.2rem; float:right;">
              <span class="has-text-warning" style="width: 2.75rem; margin-right: 0.3em; display: inline-block; text-align: center;">Auto</span>
              <span class="has-text-warning" style="width: 2.75rem; display: inline-block; text-align: center;">Over</span>
            </span>
          </div>`);

        for (let resource of StorageManager.priorityList) {
            let storageElement = $('#stack-' + resource.id);
            if (storageElement.length > 0) {
                let storeKey = "res_storage" + resource.id;
                let overKey = "res_storage_o_" + resource.id;
                $(`<span class="ea-storage-toggle" style="margin-left: auto; margin-right: 0.2rem; float:right;"></span>`)
                  .append(
                    addToggleCallbacks($(`<label tabindex="0" title="Enable storing of this resource." class="switch"><input class="script_${storeKey}" type="checkbox"${settingsRaw[storeKey] ? " checked" : ""}><span class="check" style="height:5px;"></span><span class="state"></span></label>`), storeKey),
                    addToggleCallbacks($(`<label tabindex="0" title="Enable storing overflow of this resource." class="switch"><input class="script_${overKey}" type="checkbox"${settingsRaw[overKey] ? " checked" : ""}><span class="check" style="height:5px;"></span><span class="state"></span></label>`), overKey))
                  .appendTo(storageElement);
            }
        }
    }

    function removeStorageToggles() {
        $('#resStorage .ea-storage-toggle').remove();
        $("#script_storage_top_row").remove();
    }

