// options.js

async function generateUI() {
    const storage = await chrome.storage.sync.get("DAT2Config");
    const userOverrides = storage.DAT2Config || {};

    // We merge once for the UI to show current active values
    const currentConfig = deepMerge(DEFAULT_CONFIG, userOverrides);

    const container = document.getElementById("settings-container");
    container.innerHTML = "";

    // Kick off recursion
    buildForm(DEFAULT_CONFIG, currentConfig, container);
    buildOwnAbbreviations(
        "mitstudie.forkortelser",
        currentConfig.mitstudie?.forkortelser?.ownAbbreviations || {}
    );

}

function buildForm(defaults, current, parent, path = "") {
    for (const [key, value] of Object.entries(defaults)) {
        const fullPath = path ? `${path}.${key}` : key;
        const wrapper = document.createElement("div");
        wrapper.className = "setting-item";

        // CASE 1: Nested Object (excluding arrays or specific types)
        if (
            typeof value === "object" &&
            !Array.isArray(value) &&
            value !== null
        ) {
            const fieldset = document.createElement("fieldset");
            fieldset.classList.add(key);
            const legend = document.createElement("legend");
            // legend.textContent = key.replace(/_/g, " ");
            legend.textContent = key;
            fieldset.appendChild(legend);

            // Recurse into the object
            buildForm(value, current[key], fieldset, fullPath);
            parent.appendChild(fieldset);
            continue;
        }

        // CASE 2: Primitive Values (The actual inputs)
        const label = document.createElement("label");
        // label.textContent = key.replace(/_/g, " ");
        label.textContent = key;
        wrapper.appendChild(label);

        let input;
        if (typeof value === "boolean") {
            input = document.createElement("input");
            input.type = "checkbox";
            input.checked = current[key];
            input.onchange = (e) => saveDeepSetting(fullPath, e.target.checked);
        } else if (typeof value === "string" && value.startsWith("#")) {
            input = document.createElement("input");
            input.type = "color";
            input.value = current[key];
            input.onchange = (e) => saveDeepSetting(fullPath, e.target.value);
        } else {
            input = document.createElement("input");
            input.type = "text";
            input.value = current[key];
            input.onchange = (e) => saveDeepSetting(fullPath, e.target.value);
        }

        wrapper.appendChild(input);
        parent.appendChild(wrapper);
    }
}

function buildOwnAbbreviations(path = "", saved = {}) { 
    //Find element to attach to
    const fieldsetPar = document.querySelector(".own_abbreviations");
    const basePath = path ? `${path}.ownAbbreviations` : "ownAbbreviations";

    function addRow(name = "", abbr = "") { 
        // On click: create pair of [name, abbreviation] and add to config
        // form is: (label, input)
        const label = document.createElement("input");
        label.value = name;
        const input = document.createElement("input");
        input.value = abbr;
        
        // newly added options should be able to be removed
        const removeButton = document.createElement("button");
        removeButton.textContent = "Fjern";

        const settingsItem = document.createElement("div");
        settingsItem.className = "setting-item";
        settingsItem.append(label, input, removeButton);
        fieldsetPar.appendChild(settingsItem);

        // name which is currently saved.
        let currentKey = name;

        async function saveChanges() {
            const newKey = label.value.trim();
            if (currentKey && currentKey !== newKey) {
                await deleteDeepSetting(`${basePath}.${currentKey}`);
            }
            if (newKey) {
                await saveDeepSetting(`${basePath}.${newKey}`, input.value);
                currentKey = newKey;
            }
        }

        label.addEventListener("change", saveChanges);
        input.addEventListener("change", saveChanges);

        removeButton.addEventListener("click", async () => {
            if (currentKey) await deleteDeepSetting(`${basePath}.${currentKey}`);
            fieldsetPar.removeChild(settingsItem);
        });
    }
    // Render already-saved pairs
    for (const [k, v] of Object.entries(saved)) addRow(k, v);

    const button = document.createElement("button");
    button.textContent = "Tilføj Par";
    button.addEventListener("click", () => addRow());
    fieldsetPar.appendChild(button);
}

async function resetToDefaults() {
    if (confirm("Nulstil indstillinger til default?")) {
        await chrome.storage.sync.set({ DAT2Config: {} });
        window.location.reload();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reset-btn").onclick = resetToDefaults;
});

window.addEventListener("configReady", generateUI);

if (window.CONFIG) {
    generateUI();
}
