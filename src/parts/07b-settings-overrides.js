    function _(check, arg){
        return checkTypes[check].fn(arg);
    }

    function openOverrideModal(event) {
        if (event[overrideKey]) {
            event.preventDefault();
            openOptionsModal(event.data.label, function(modal) {
                modal.append(`<div style="margin-top: 10px; margin-bottom: 10px;" id="script_${event.data.name}Modal"></div>`);
                $('.script-modal-content').addClass('override-modal');
                buildOverrideSettings(event.data.name, event.data.type, event.data.options);
            });
        }
    }

    function buildOverrideSettings(settingName, type, options) {
        const rebuild = () => buildOverrideSettings(settingName, type, options);
        let overrides = settingsRaw.overrides[settingName] ?? [];

        let currentNode = $(`#script_${settingName}Modal`);
        currentNode.empty().off("*");

        currentNode.append(`
          <table style="width:100%; text-align: left">
            <tr>
              <th class="has-text-warning" colspan="2">Variable 1</th>
              <th class="has-text-warning" colspan="1">Check</th>
              <th class="has-text-warning" colspan="2">Variable 2</th>
              <th class="has-text-warning" colspan="3">Result</th>
            </tr>
            <tr>
              <th class="has-text-warning" style="width:16%">Type</th>
              <th class="has-text-warning" style="width:16%">Value</th>
              <th class="has-text-warning" style="width:10%"></th>
              <th class="has-text-warning" style="width:16%">Type</th>
              <th class="has-text-warning" style="width:16%">Value</th>
              <th class="has-text-warning" style="width:14%"></th>
              <th style="width:12%"></th>
            </tr>
            <tbody id="script_${settingName}ModalTable"></tbody>
          </table>`);

        let newTableBodyText = "";
        for (let i = 0; i < overrides.length; i++) {
            newTableBodyText += `<tr id="script_${settingName}_o${i}" value="${i}" class="script-draggable"><td style="width:16%"></td><td style="width:16%"></td><td style="width:10%"></td><td style="width:16%"></td><td style="width:16%"></td><td style="width:14%"></td><td style="width:12%"><span class="script-lastcolumn"></span></td></tr>`;
        }

        let listField = typeof settingsRaw[settingName] === "object";
        let note = listField ?
          "All values passed checks will be added or removed from list":
          "First value passed check will be used. Default value:";
        let note_2 = "The current value:";

        let current = listField ?
         `<td style="width:32%" colspan="2">${note_2}</td>
          <td style="width:56%" colspan="4"></td>`:
         `<td style="width:74%" colspan="5">${note_2}</td>
          <td style="width:14%"></td>`;

        newTableBodyText += `
          <tr id="script_${settingName}_d" class="unsortable">
            <td style="width:74%" colspan="5">${note}</td>
            <td style="width:14%"></td>
            <td style="width:12%"><a class="button is-small" style="width: 26px; height: 26px"><span>+</span></a></td>
          </tr>
          <tr id="script_override_true_value" class="unsortable" value="${settingName}" type="${type}">
            ${current}
            <td style="width:12%"></td>
          </tr>`;
        let tableBodyNode = $(`#script_${settingName}ModalTable`);
        tableBodyNode.append($(newTableBodyText));

        // Default input
        if (!listField) {
            $(`#script_${settingName}_d td:eq(1)`)
              .append(buildInputNode(type, options, settingsRaw[settingName], function(result) {
                  settingsRaw[settingName] = result;
                  updateSettingsFromState();

                  let retType = typeof result === "boolean" ? "checked" : "value";
                  $(".script_" + settingName).prop(retType, settingsRaw[settingName]);
              }));
        }
        $(`#script_override_true_value td:eq(1)`).append(buildInputNodeForDisplay(type, options, settings[settingName]));

        // Add button
        $(`#script_${settingName}_d a`).on('click', function() {
            if (!settingsRaw.overrides[settingName]) {
                settingsRaw.overrides[settingName] = [];
                $(".script_bg_" + settingName).addClass("inactive-row");
            }
            settingsRaw.overrides[settingName].push({type1: "Boolean", arg1: true, type2: "Boolean", arg2: false, cmp: "==", ret: settingsRaw[settingName]})
            updateSettingsFromState();
            rebuild();
        });

        for (let i = 0; i < overrides.length; i++) {
            let override = overrides[i];
            let tableElement = $(`#script_${settingName}_o${i}`).children().eq(0);

            tableElement.append(buildConditionType(override, 1, rebuild));
            tableElement = tableElement.next();
            tableElement.append(buildConditionArg(override, 1));
            tableElement = tableElement.next();
            tableElement.append(buildConditionComparator(override, rebuild));
            tableElement = tableElement.next();
            tableElement.append(buildConditionType(override, 2, rebuild));
            tableElement = tableElement.next();
            tableElement.append(buildConditionArg(override, 2));
            tableElement = tableElement.next();
            if (!checkCustom[override.cmp]) {
                tableElement.append(buildConditionRet(override, type, options));
            }
            tableElement = tableElement.next();
            tableElement.append(buildConditionRemove(settingName, i, rebuild));
            tableElement.append(buildConditionDuplicate(settingName, i, rebuild));
            tableElement.append(buildConditionEvalize(settingName, i, rebuild));

        }

        tableBodyNode.sortable({
            items: "tr:not(.unsortable)",
            helper: sorterHelper,
            update: function() {
                let newOrder = tableBodyNode.sortable('toArray', {attribute: 'value'});
                settingsRaw.overrides[settingName] = newOrder.map((i) => settingsRaw.overrides[settingName][i]);

                updateSettingsFromState();
                rebuild();
            },
        });
    }

    function buildInputNode(type, options, value, callback) {
        switch (type) {
            case "string":
                return $(`
                  <input type="text" class="input is-small" style="height: 22px; width:100%"/>`)
                .val(value).on('change', function() {
                    callback(this.value);
                });
            case "number":
                return $(`
                  <input type="text" class="input is-small" style="height: 22px; width:100%"/>`)
                .val(value).on('change', function() {
                    let parsedValue = getRealNumber(this.value);
                    if (isNaN(parsedValue)) {
                        parsedValue = value;
                    }
                    this.value = parsedValue;
                    callback(parsedValue);
                })
            case "boolean":
                return $(`
                  <label tabindex="0" class="switch" style="position:absolute; margin-top: 8px; margin-left: 10px;">
                    <input type="checkbox">
                    <span class="check" style="height:5px; max-width:15px"></span><span style="margin-left: 20px;"></span>
                  </label>`)
                .find('input').prop('checked', value).on('change', function() {
                    callback(this.checked);
                })
                .end();
            case "select":
                return $(`
                  <select style="width: 100%">${options}</select>`)
                .val(value).on('change', function() {
                    callback(this.value);
                });
            case "select_cb":
                return $(`
                  <select style="width: 100%">${buildSelectOptions(options())}</select>`)
                .val(value).on('change', function() {
                    callback(this.value);
                });
            case "list":
                return buildObjectListInput(options.list, options.name, options.id, value, callback);
            case "list_cb":
                return buildObjectListInput(options(), "name", "id", value, callback);
            default:
                return "";
        }
    }

    function buildInputNodeForDisplay(type, options, value) {
        switch (type) {
            case "string":
            case "number":
                return $(`
                  <input type="text" class="input is-small" style="height: 22px; width:100%" disabled="disabled"/>`)
                .val(value);
            case "boolean":
                return $(`
                  <label tabindex="0" disabled="disabled" class="switch is-disabled" style="position:absolute; margin-top: 8px; margin-left: 10px;">
                    <input type="checkbox"  disabled="disabled">
                    <span class="check" style="height:5px; max-width:15px"></span><span style="margin-left: 20px;"></span>
                  </label>`)
                .find('input').prop('checked', value).end();
            case "select":
                return $(`
                  <select style="width: 100%"  disabled="disabled" class="dropdown is-disabled">${options}</select>`)
                .val(value);
            case "list":
                return $(`
                  <span></span>`)
               .text(value.map(item => options.list[item]?.name ?? "[Invalid item]").join(", "));
            default:
                return $(`
                  <span></span>`)
                .text(JSON.stringify(value));
        }
    }

    function changeDisplayInputNode(currentNode) {
        let type = currentNode.attr("type");
        let id = currentNode.attr("value");
        let value = settings[currentNode.attr("value")];
        let node = currentNode.find(`td:eq(1)>*:first-child`);
        switch (type) {
            case "string":
            case "number":
            case "select":
                return node.val(value);
            case "boolean":
                return node.find('input').prop('checked', value);
            case "list":
                if (id === "researchIgnore") {
                    return node.text(value.map(item => techIds[item]?.name ?? "[Invalid item]").join(", "));
                } // else default
            default:
                return node.text(JSON.stringify(value));
        }
    }

    function buildConditionType(override, num, rebuild) {
        let types = Object.entries(checkTypes).map(([id, type]) => `<option value="${id}" title="${type.desc}">${id.replace(/([A-Z])/g, ' $1').trim()}</option>`).join();
        return $(`<select style="width: 100%">${types}</select>`)
        .val(override["type" + num])
        .on('change', function() {
            override["type" + num] = this.value;
            override["arg" + num] = checkTypes[this.value].def;
            updateSettingsFromState();
            rebuild();
        });
    }

    function buildConditionArg(override, num) {
        let check = checkTypes[override["type" + num]];
        return check ? buildInputNode(check.arg, check.options, override["arg" + num], function(result){
            override["arg" + num] = result;
            updateSettingsFromState();
        }) : "";
    }

    function buildConditionComparator(override, rebuild) {
        let types = Object.entries(checkCompare).map(([id, fn]) => `<option value="${id}" title="${checkCustom[id] ?? fn.toString().substr(10)}">${id}</option>`).join();
        return $(`<select style="width: 100%">${types}</select>`)
        .val(override.cmp)
        .on('change', function() {
            override.cmp = this.value;
            updateSettingsFromState();
            rebuild();
        });
    }

    function buildConditionRemove(settingName, id, rebuild) {
        return $(`<a class="button is-small" style="width: 26px; height: 26px"><span>-</span></a>`)
        .on('click', function() {
            settingsRaw.overrides[settingName].splice(id, 1);
            if (settingsRaw.overrides[settingName].length === 0) {
                delete settingsRaw.overrides[settingName];
                $(".script_bg_" + settingName).removeClass("inactive-row");
            }
            updateSettingsFromState();
            rebuild();
        });
    }

    function buildConditionDuplicate(settingName, id, rebuild) {
        return $(`<a class="button is-small" style="width: 26px; height: 26px"><span style="font-size: 1.2rem;">&#9282;</span></a>`)
        .on('click', function() {
            settingsRaw.overrides[settingName].splice(id, 0, {...settingsRaw.overrides[settingName][id]});
            updateSettingsFromState();
            rebuild();
        });
    }

    function buildConditionEvalize(settingName, id, rebuild) {
        return $(`<a class="button is-small" style="width: 26px; height: 26px"><span style="font-size: 0.9rem;">E</span></a>`)
        .on('click', function() {
            let override = settingsRaw.overrides[settingName][id];
            let check = checkCompare[override.cmp].toString().substr(10)
                .replace(/([ab])/g, (s, v) => {
                    let idx = v === "a" ? 1 : 2;
                    switch (override["type"+idx]) {
                        case "Number":
                        case "Boolean":
                            return override["arg"+idx];
                        case "Eval":
                            return `(${override["arg"+idx]})`;
                        case "String":
                            return JSON.stringify(override["arg"+idx]);
                        default:
                            return `_("${override["type"+idx]}",${JSON.stringify(override["arg"+idx])})`;
                    }
                });
            win.prompt("Eval of this condition:", check);
        });
    }

    function buildConditionRet(override, type, options) {
        return buildInputNode(type, options, override.ret, function(result) {
            override.ret = result;
            updateSettingsFromState();
        });
    }

    function buildObjectListInput(list, name, id, value, callback) {
        let listNode = $(`<input type="text" style="width:100%"></input>`);

        // Event handler
        let onChange = function(event, ui) {
            event.preventDefault();

            // If it wasn't selected from list
            if(ui.item === null){
                let foundItem = Object.values(list).find(obj => obj[name] === this.value);
                if (foundItem !== undefined){
                    ui.item = {label: this.value, value: foundItem[id]};
                }
            }

            if (ui.item !== null && Object.values(list).some(obj => obj[id] === ui.item.value)) {
                // We have an item to switch
                this.value = ui.item.label;
                callback(ui.item.value);
            } else if (list.hasOwnProperty(value)) {
                // Or try to restore old valid value
                this.value = list[value][name];
                callback(value);
            } else {
                // No luck, set it empty
                this.value = "";
                callback(null);
            }
        };

        listNode.autocomplete({
            minLength: 2,
            delay: 0,
            source: function(request, response) {
                let matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
                response(Object.values(list)
                  .filter(item => matcher.test(item[name]))
                  .map(item => ({label: item[name], value: item[id]})));
            },
            select: onChange, // Dropdown list click
            focus: onChange, // Arrow keys press
            change: onChange // Keyboard type
        });

        if (Object.values(list).some(obj => obj[id] === value)) {
            listNode.val(list[value][name]);
        }

        return listNode;
    }

