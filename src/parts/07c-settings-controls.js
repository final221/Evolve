    function addSettingsToggle(node, settingName, labelText, hintText, enabledCallBack, disabledCallBack) {
        return $(`
          <div class="script_bg_${settingName}" style="margin-top: 5px; width: 90%; display: inline-block; text-align: left;">
            <label title="${hintText}" tabindex="0" class="switch">
              <input class="script_${settingName}" type="checkbox" ${settingsRaw[settingName] ? " checked" : ""}><span class="check"></span>
              <span style="margin-left: 10px;">${labelText}</span>
            </label>
          </div>`)
        .toggleClass('inactive-row', Boolean(settingsRaw.overrides[settingName]))
        .on('change', 'input', function() {
            settingsRaw[settingName] = this.checked;
            updateSettingsFromState();

            $(".script_" + settingName).prop('checked', settingsRaw[settingName]);

            if (settingsRaw[settingName] && enabledCallBack) {
                enabledCallBack();
            }
            if (!settingsRaw[settingName] && disabledCallBack) {
                disabledCallBack();
            }
        })
        .on('click', {label: `${labelText} (${settingName})`, name: settingName, type: "boolean"}, openOverrideModal)
        .appendTo(node);

        if (settingsRaw[settingName] && enabledCallBack) {
            enabledCallBack();
        }
    }

    function addSettingsNumber(node, settingName, labelText, hintText) {
        return $(`
          <div class="script_bg_${settingName}" style="margin-top: 5px; display: inline-block; width: 90%; text-align: left;">
            <label title="${hintText}" tabindex="0">
              <span>${labelText}</span>
              <input class="script_${settingName}" type="text" style="text-align: right; height: 18px; width: 150px; float: right;" value="${settingsRaw[settingName]}"></input>
            </label>
          </div>`)
        .toggleClass('inactive-row', Boolean(settingsRaw.overrides[settingName]))
        .on('change', 'input', function() {
            let parsedValue = getRealNumber(this.value);
            if (!isNaN(parsedValue)) {
                settingsRaw[settingName] = parsedValue;
                updateSettingsFromState();
            }
            $(".script_" + settingName).val(settingsRaw[settingName]);
        })
        .on('click', {label: `${labelText} (${settingName})`, name: settingName, type: "number"}, openOverrideModal)
        .appendTo(node);
    }

    function addSettingsString(node, settingName, labelText, hintText) {
        return $(`
          <div class="script_bg_${settingName}" style="margin-top: 5px; display: inline-block; width: 90%; text-align: left;">
            <label title="${hintText}" tabindex="0">
              <span>${labelText}</span>
              <input class="script_${settingName}" type="text" style="text-align: right; height: 18px; width: 70%; float: right;" value="${settingsRaw[settingName]}"></input>
            </label>
          </div>`)
        .toggleClass('inactive-row', Boolean(settingsRaw.overrides[settingName]))
        .on('change', 'input', function() {
            settingsRaw[settingName] = this.value;
            updateSettingsFromState();
            $(".script_" + settingName).val(settingsRaw[settingName]);
        })
        .on('click', {label: `${labelText} (${settingName})`, name: settingName, type: "string"}, openOverrideModal)
        .appendTo(node);
    }

    function buildSelectOptions(optionsList) {
        return optionsList.map(item => `<option value="${item.val}" title="${item.hint ?? ""}">${item.label}</option>`).join();
    }

    function addSettingsSelect(node, settingName, labelText, hintText, optionsList) {
        let options = buildSelectOptions(optionsList);
        return $(`
          <div class="script_bg_${settingName}" style="margin-top: 5px; display: inline-block; width: 90%; text-align: left;">
            <label title="${hintText}" tabindex="0">
              <span>${labelText}</span>
              <select class="script_${settingName}" style="width: 150px; float: right;">
                ${options}
              </select>
            </label>
          </div>`)
        .toggleClass('inactive-row', Boolean(settingsRaw.overrides[settingName]))
        .find('select')
          .val(settingsRaw[settingName])
          .on('change', function() {
            settingsRaw[settingName] = this.value;
            updateSettingsFromState();

            $(".script_" + settingName).val(settingsRaw[settingName]);
          })
        .end()
        .on('click', {label: `${labelText} (${settingName})`, name: settingName, type: "select", options: options}, openOverrideModal)
        .appendTo(node);
    }

    function addSettingsList(node, settingName, labelText, hintText, list) {
        let listBlock = $(`
          <div class="script_bg_${settingName}" style="display: inline-block; width: 90%; margin-top: 6px;">
            <label title="${hintText}" tabindex="0">
              <span>${labelText}</span>
              <input type="text" style="height: 25px; width: 150px; float: right;" placeholder="Research...">
              <button class="button" style="height: 25px; float: right; margin-right: 4px; margin-left: 4px;">Remove</button>
              <button class="button" style="height: 25px; float: right;">Add</button>
            </label>
            <br>
            <textarea class="script_${settingName} textarea" style="margin-top: 12px" readonly></textarea>
          </div>`)
        .toggleClass('inactive-row', Boolean(settingsRaw.overrides[settingName]))
        .on('click', {label: `Add or Remove (${settingName})`, name: settingName, type: "list", options: {list: list, name: "name", id: "_vueBinding"}}, openOverrideModal)
        .appendTo(node);

        let selectedItem = "";

        let updateList = function() {
            let techsString = settingsRaw[settingName].map(id => Object.values(list).find(obj => obj._vueBinding === id).name).join(', ');
            $(".script_" + settingName).val(techsString);
        }

        let onChange = function(event, ui) {
            event.preventDefault();

            // If it wasn't selected from list
            if(ui.item === null){
                let typedName = Object.values(list).find(obj => obj.name === this.value);
                if (typedName !== undefined){
                    ui.item = {label: this.value, value: typedName._vueBinding};
                }
            }

            // We have an item to switch
            if (ui.item !== null && list.hasOwnProperty(ui.item.value)) {
                this.value = ui.item.label;
                selectedItem = ui.item.value;
            } else {
                this.value = "";
                selectedItem = null;
            }
        };

        listBlock.find('input').autocomplete({
            minLength: 2,
            delay: 0,
            source: function(request, response) {
                let matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
                response(Object.values(list)
                  .filter(item => matcher.test(item.name))
                  .map(item => ({label: item.name, value: item._vueBinding})));
            },
            select: onChange, // Dropdown list click
            focus: onChange, // Arrow keys press
            change: onChange // Keyboard type
        });

        listBlock.on('click', 'button:eq(1)', function() {
            if (selectedItem && !settingsRaw[settingName].includes(selectedItem)) {
                settingsRaw[settingName].push(selectedItem);
                settingsRaw[settingName].sort();
                updateSettingsFromState();
                updateList();
            }
        });

        listBlock.on('click', 'button:eq(0)', function() {
            if (selectedItem && settingsRaw[settingName].includes(selectedItem)) {
                settingsRaw[settingName].splice(settingsRaw[settingName].indexOf(selectedItem), 1);
                settingsRaw[settingName].sort();
                updateSettingsFromState();
                updateList();
            }
        });

        updateList();
    }

    function addInputCallbacks(node, settingKey) {
        return node
        .on('change', function() {
            let parsedValue = getRealNumber(this.value);
            if (!isNaN(parsedValue)) {
                settingsRaw[settingKey] = parsedValue;
                updateSettingsFromState();
            }
            $(".script_" + settingKey).val(settingsRaw[settingKey]);
        })
        .on('click', {label: `Number (${settingKey})`, name: settingKey, type: "number"}, openOverrideModal);
    }

    function addTableInput(node, settingKey) {
        node.addClass("script_bg_" + settingKey + (settingsRaw.overrides[settingKey] ? " inactive-row" : ""))
            .append(addInputCallbacks($(`<input class="script_${settingKey}" type="text" class="input is-small" style="height: 25px; width:100%" value="${settingsRaw[settingKey]}"/>`), settingKey));
    }

    function addToggleCallbacks(node, settingKey) {
        return node
        .on('change', 'input', function() {
            settingsRaw[settingKey] = this.checked;
            updateSettingsFromState();

            $(".script_" + settingKey).prop('checked', settingsRaw[settingKey]);
        })
        .on('click', {label: `Toggle (${settingKey})`, name: settingKey, type: "boolean"}, openOverrideModal);
    }

    function addTableToggle(node, settingKey) {
        node.addClass("script_bg_" + settingKey + (settingsRaw.overrides[settingKey] ? " inactive-row" : ""))
            .append(addToggleCallbacks($(`
          <label tabindex="0" class="switch" style="position:absolute; margin-top: 8px; margin-left: 10px;">
            <input class="script_${settingKey}" type="checkbox"${settingsRaw[settingKey] ? " checked" : ""}>
            <span class="check" style="height:5px; max-width:15px"></span>
            <span style="margin-left: 20px;"></span>
          </label>`), settingKey));
    }

    function buildTableLabel(note, title = "", color = "has-text-info") {
        return $(`<span class="${color}" title="${title}" >${note}</span>`);
    }

    function resetCheckbox() {
        Array.from(arguments).forEach(item => $(".script_" + item).prop('checked', settingsRaw[item]));
    }

