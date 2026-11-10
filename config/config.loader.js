/**
 * Global scope `CONFIG` object. Assigned on config load.
 */
let CONFIG = {};

/** Recursively merges two objects, the latter overriding the former on value conflicts.
 *  Also merges nested properties.
 *  @param {o} defaultObj Object containing default values
 *  @param {*} overrideObj Object with values to override default values
 */
function deepMerge(defaultObj, overrideObj) {
    const result = { ...defaultObj };

    for (const key in overrideObj) {
        const defaultValue = defaultObj[key];
        const overrideValue = overrideObj[key];

        // If both are objects (and not null/arrays), recurse
        if (
            defaultValue &&
            typeof defaultValue === "object" &&
            !Array.isArray(defaultValue) &&
            overrideValue &&
            typeof overrideValue === "object" &&
            !Array.isArray(overrideValue)
        ) {
            result[key] = deepMerge(defaultValue, overrideValue);
        } else {
            // Otherwise, simple overwrite
            result[key] = overrideValue;
        }
    }

    return result;
}

/**
 *  Saves config overrides in chrome storage
 *  Only saves the overridden part, not the whole config (for easier config updates in future)
 */
async function saveDeepSetting(path, value) {
    const storage = await chrome.storage.sync.get("DAT2Config");
    let DAT2Config = storage.DAT2Config || {};

    const parts = path.split(".");
    let current = DAT2Config;

    // Traverse the object until we reach the last key
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) current[part] = {};
        current = current[part];
    }

    current[parts[parts.length - 1]] = value;

    await chrome.storage.sync.set({ DAT2Config });
}

async function deleteDeepSetting(path) {
    const storage = await chrome.storage.sync.get("DAT2Config");
    const DAT2Config = storage.DAT2Config || {};

    const parts = path.split(".");
    let current = DAT2Config;
    
    for (let i = 0; i < parts.length - 1; i++) {
        if (!(parts[i] in current)) return;
        current = current[parts[i]];
    }
    delete current[parts[parts.length - 1]];

    await chrome.storage.sync.set({ DAT2Config });
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.DAT2Config) {
        const newOverrides = changes.DAT2Config.newValue || {};
        window.CONFIG = deepMerge(DEFAULT_CONFIG, newOverrides);

        // send signal that config has been updated
        // scripts can listen to this
        window.dispatchEvent(
            new CustomEvent("configUpdated", { detail: window.CONFIG })
        );
    }
});

/**
 * Gets and merges `DEFAULT_CONFIG` and user-specific config from chrome storage.
 *
 * User-specific values override default config.
 */
async function initializeGlobalConfig() {
    try {
        const storage = await chrome.storage.sync.get("DAT2Config");
        const userOverrides = storage.DAT2Config || {};

        let mergedConfig = deepMerge(DEFAULT_CONFIG, userOverrides);

        window.CONFIG = mergedConfig;
        CONFIG = mergedConfig;

        //Notify scripts that config is ready.
        window.dispatchEvent(
            new CustomEvent("configReady", { detail: mergedConfig })
        );
    } catch (error) {
        console.error("Failed to load DAT2 config: ", error);
    }
}

initializeGlobalConfig();
