// ================================================================== 
// ===== IMPORTS ====================================================
// ================================================================== 

// Grab the module data
import { MODULE  } from './const.js';

// ================================================================== 
// ===== CLASS ======================================================
// ================================================================== 

class CoffeePubMonarch {
    static ID = 'coffee-pub-monarch';
    
    static TEMPLATES = {
        moduleSetControls: `modules/${this.ID}/templates/monarch-controls.hbs`
    };

    // WeakMap for storing handler functions on DOM elements (replaces jQuery .data())
    static _handlerStorage = new WeakMap();

    static initialize() {
        // Register module settings
        game.settings.register(this.ID, 'moduleSets', {
            name: 'Saved Module Sets',
            scope: 'world',
            config: false,
            type: Object,
            default: {}
        });

        // Hook into the Module Management Application
        Hooks.on('renderModuleManagement', this._onRenderModuleManagement.bind(this));
        
        // Hook into the main settings window to add Import/Export buttons
        // Use both hooks for compatibility (SettingsConfig for local, ExtendedSettingsConfig for hosted)
        Hooks.on('renderSettingsConfig', this._onRenderPackageConfiguration.bind(this));
        Hooks.on('renderExtendedSettingsConfig', this._onRenderPackageConfiguration.bind(this));
        
        // Clean up event listeners when settings window closes
        Hooks.on('closeSettingsConfig', this._onCloseSettingsConfig.bind(this));
        Hooks.on('closeExtendedSettingsConfig', this._onCloseSettingsConfig.bind(this));
        
        // Hook into module dependency changes
        Hooks.on('renderDialog', (dialog, html) => {
            if (dialog.data.title === "Manage Module Dependencies") {
                // Find the confirm button and add our listener
                const confirmBtn = html.querySelector('button.yes');
                if (confirmBtn) {
                    confirmBtn.addEventListener('click', () => {
                        // Use setTimeout to ensure the module states have been updated
                        setTimeout(() => {
                            // Find the module management window
                            const moduleManager = document.querySelector('#module-management');
                            if (!moduleManager) return;
                            
                            // Get our stored event handlers from WeakMap
                            const handlers = this._handlerStorage.get(moduleManager);
                            const updateCurrentStateHighlight = handlers?.updateCurrentStateHighlight;
                            const updateButtonVisibility = handlers?.updateButtonVisibility;
                            
                            // Update our UI if we have the handlers
                            if (updateCurrentStateHighlight) updateCurrentStateHighlight();
                            if (updateButtonVisibility) updateButtonVisibility();
                        }, 100); // Give a bit more time for the changes to apply
                    });
                }
            }
        });
    }

    static async _initializeDefaultSet() {
        console.log("COFFEE PUB • MONARCH | Current moduleSets: ", game.settings.get(this.ID, 'moduleSets'));
        
        const moduleSets = game.settings.get(this.ID, 'moduleSets');
        if (Object.keys(moduleSets).length === 0) {
            // Create a default set with currently active modules
            const activeModules = game.modules.filter(m => m.active).map(m => m.id);
            console.log("COFFEE PUB • MONARCH | Active modules for default set: ", activeModules);
            
            moduleSets['Default Configuration'] = activeModules;
            await game.settings.set(this.ID, 'moduleSets', moduleSets);
            console.log("COFFEE PUB • MONARCH | Initialized moduleSets: ", moduleSets);
        }
    }

    static async _onRenderModuleManagement(app, html, data) {
        // Add our controls to the module management window
        const moduleSets = game.settings.get(this.ID, 'moduleSets');
        console.log("COFFEE PUB • MONARCH | Rendering with moduleSets: ", moduleSets);
        
        // Store initial module states
        const initialModuleStates = new Map();
        html.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
            initialModuleStates.set(checkbox.name, checkbox.checked);
        });
        
        // Get current active modules
        const currentActiveModules = Array.from(game.modules.keys()).filter(id => game.modules.get(id)?.active);
        
        // Find matching set
        let matchingSet = '';
        for (const [setName, moduleList] of Object.entries(moduleSets)) {
            if (moduleList.length === currentActiveModules.length && 
                moduleList.every(id => currentActiveModules.includes(id)) && 
                currentActiveModules.every(id => moduleList.includes(id))) {
                matchingSet = setName;
                break;
            }
        }
        
        const moduleSetControlsHTML = await renderTemplate(this.TEMPLATES.moduleSetControls, {
            moduleSets,
            currentSet: matchingSet,
            localize: (key) => game.i18n.localize(`${this.ID}.moduleSet.${key}`)
        });
        
        // Convert HTML string to DOM element
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = moduleSetControlsHTML;
        const moduleSetControls = tempDiv.firstElementChild;
        
        if (!moduleSetControls) {
            console.error("COFFEE PUB • MONARCH | Failed to create module set controls element");
            return;
        }
        
        // Insert our controls after the search/filter element
        // In v13, the filter is in a <search> element, not a form input with name="filter"
        const searchElement = html.querySelector('search.flexrow');
        if (searchElement) {
            // Insert after the search element
            searchElement.insertAdjacentElement('afterend', moduleSetControls);
        } else {
            // Fallback: try to find the search input directly
            const searchInput = html.querySelector('input[type="search"]');
            if (searchInput) {
                const searchParent = searchInput.closest('search') || searchInput.parentElement;
                if (searchParent) {
                    searchParent.insertAdjacentElement('afterend', moduleSetControls);
                } else {
                    // Insert after the search input's parent
                    searchInput.parentElement?.insertAdjacentElement('afterend', moduleSetControls);
                }
            } else {
                // Final fallback: insert at the top of the window content (html is already the window-content)
                html.insertBefore(moduleSetControls, html.firstChild);
            }
        }

        // Bind our event listeners
        this._activateListeners(html, app);
    }

    static async _onRenderPackageConfiguration(app, html, data) {
        // Only add buttons to the main settings window, not module management
        if (app.id === 'module-management') return;
        
        // Check if this is a settings configuration window
        const appClassName = app.constructor?.name || '';
        const isSettingsWindow = appClassName.includes('SettingsConfig') || 
                                 appClassName.includes('PackageConfiguration') ||
                                 app.id === 'settings-config';
        
        if (!isSettingsWindow) return;
        
        // Check if buttons already exist to prevent duplicates
        const searchTarget = app.element || html;
        if (searchTarget.querySelector('.monarch-settings-buttons')) {
            return; // Buttons already exist, skip
        }
        
        // Create our Import/Export buttons
        const importExportButtons = document.createElement('div');
        importExportButtons.className = 'monarch-settings-buttons';
        
        const importBtn = document.createElement('button');
        importBtn.className = 'monarch-import-settings';
        importBtn.type = 'button';
        importBtn.innerHTML = '<i class="fas fa-file-import"></i> Import Settings';
        
        const exportBtn = document.createElement('button');
        exportBtn.className = 'monarch-export-settings';
        exportBtn.type = 'button';
        exportBtn.innerHTML = '<i class="fas fa-file-export"></i> Export Settings';
        
        const pruneBtn = document.createElement('button');
        pruneBtn.className = 'monarch-prune-settings';
        pruneBtn.type = 'button';
        pruneBtn.innerHTML = '<i class="fas fa-broom"></i> Prune Settings';
        
        importExportButtons.appendChild(importBtn);
        importExportButtons.appendChild(exportBtn);
        importExportButtons.appendChild(pruneBtn);
        
        // Find the Reset Defaults button - search in sidebar, html, and app.element
        // The button might be in the sidebar, window footer, or main content
        let resetButton = html.querySelector('button.reset-all');
        if (!resetButton && app.element) {
            resetButton = app.element.querySelector('button.reset-all');
        }
        // Also check sidebar specifically
        if (!resetButton) {
            const sidebar = html.querySelector('aside.sidebar, .sidebar');
            if (sidebar) {
                resetButton = sidebar.querySelector('button.reset-all');
            }
        }
        if (!resetButton && app.element) {
            const sidebar = app.element.querySelector('aside.sidebar, .sidebar');
            if (sidebar) {
                resetButton = sidebar.querySelector('button.reset-all');
            }
        }
        
        if (resetButton) {
            // Insert before the Reset Defaults button
            resetButton.insertAdjacentElement('beforebegin', importExportButtons);
        } else {
            // Try to find window footer first (preferred location)
            let windowFooter = null;
            if (app.element) {
                windowFooter = app.element.querySelector('.window-footer, footer, .form-footer');
            }
            if (!windowFooter) {
                windowFooter = html.querySelector('.window-footer, footer, .form-footer');
            }
            
            if (windowFooter) {
                windowFooter.insertBefore(importExportButtons, windowFooter.firstChild);
            } else {
                // Try sidebar as fallback
                let sidebar = html.querySelector('aside.sidebar, .sidebar');
                if (!sidebar && app.element) {
                    sidebar = app.element.querySelector('aside.sidebar, .sidebar');
                }
                if (sidebar) {
                    sidebar.appendChild(importExportButtons);
                } else {
                    // Last resort: append to the form element
                    let form = html.querySelector('form');
                    if (!form && app.element) {
                        form = app.element.querySelector('form');
                    }
                    if (form) {
                        form.appendChild(importExportButtons);
                    } else {
                        // Final fallback: append to the window content
                        if (app.element) {
                            app.element.appendChild(importExportButtons);
                        } else {
                            html.appendChild(importExportButtons);
                        }
                    }
                }
            }
        }
        
        // Bind event listeners - use app.element if available for better coverage
        const listenerTarget = app.element || html;
        this._activateSettingsWindowListeners(listenerTarget);
    }

    static _activateSettingsWindowListeners(html) {
        // Use event delegation for better cleanup - bind to the html element itself
        // This ensures listeners are cleaned up when the window closes
        // Store handler references for cleanup
        const importHandler = async (event) => {
            if (!event.target.matches('.monarch-import-settings') && !event.target.closest('.monarch-import-settings')) return;
            event.preventDefault();
            event.preventDefault();
            
            // Check user permissions
            const isGM = game.user.isGM;
            
            const content = `
                <form>
                    <h2 style="margin-bottom: 0.5em;">Import Module Settings</h2>
                    <div class="form-group">
                        <label>Import JSON File</label>
                        <div class="form-fields">
                            <input type="file" accept=".json" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="checkbox">
                            <input type="checkbox" name="importWorldSettings" id="importWorldSettings" ${isGM ? 'checked' : ''} ${!isGM ? 'disabled' : ''}>
                            Import world-scoped settings (shared world configuration)
                        </label>
                        <p class="notes" style="margin-top: 0.5em; font-size: 0.9em;">
                            ${!isGM ? '<strong>Note:</strong> World-scoped settings require GM permissions. ' : ''}
                            World-scoped settings are shared across all users in the world (module configurations, world rules, etc.).
                        </p>
                    </div>
                    <div class="form-group">
                        <label class="checkbox">
                            <input type="checkbox" name="importClientSettings" id="importClientSettings" ${!isGM ? 'checked' : ''}>
                            Import client-scoped settings (per-user preferences)
                        </label>
                        <p class="notes" style="margin-top: 0.5em; font-size: 0.9em;">
                            <strong>Warning:</strong> Client-scoped settings are personal preferences (UI themes, display settings, etc.). 
                            Only enable this if you want to copy personal preferences from the export. 
                            In multi-user environments, this will only affect your own client settings.
                        </p>
                    </div>
                    <p class="notes">You will be able to preview the changes before the final import. Make sure to backup your settings first!</p>
                </form>`;

            const dialog = new Dialog({
                title: "Import Module Settings",
                content: content,
                buttons: {
                    import: {
                        icon: '<i class="fas fa-file-import"></i>',
                        label: "Import",
                        callback: async (html) => {
                            // In v13, Dialog callbacks receive the form element
                            // Ensure html is a DOM element (it should be, but add safety check)
                            let form = html;
                            if (!(html instanceof HTMLElement)) {
                                // Try to unwrap if it's a jQuery object or array-like
                                form = html?.[0] || html;
                            }
                            // If still not an HTMLElement, try to find the form
                            if (!(form instanceof HTMLElement)) {
                                form = document.querySelector('form') || html;
                            }
                            
                            const fileInput = form.querySelector('input[type="file"]');
                            if (!fileInput) return;
                            const file = fileInput.files[0];
                            if (!file) return;

                            // Get checkbox values from the file selection dialog
                            const importWorldSettings = form.querySelector('#importWorldSettings')?.checked || false;
                            const importClientSettings = form.querySelector('#importClientSettings')?.checked || false;

                            try {
                                const reader = new FileReader();
                                reader.onload = async (e) => {
                                    let importData;
                                    try {
                                        importData = JSON.parse(e.target.result);
                                    } catch (parseError) {
                                        ui.notifications.error("Invalid JSON file. Please check the file format.");
                                        console.error("COFFEE PUB • MONARCH | JSON parse error:", parseError);
                                        return;
                                    }
                                    
                                    // Check for the expected structure
                                    let importedSettings = importData.allModuleSettings;

                                    // If this is a module sets file, provide helpful guidance
                                    if (!importedSettings && importData.moduleSets) {
                                        const fileKeys = Object.keys(importData || {});
                                        console.error("COFFEE PUB • MONARCH | Import file structure:", fileKeys);
                                        ui.notifications.error(
                                            `This appears to be a Module Sets file, not a Settings file. ` +
                                            `To import module sets, please use the "Import Sets" button in the Module Management window ` +
                                            `(not the Settings window). ` +
                                            `Settings files contain 'allModuleSettings', while module sets files contain 'moduleSets'.`
                                        );
                                        return;
                                    }

                                    if (!importedSettings) {
                                        // Provide more helpful error message
                                        const fileKeys = Object.keys(importData || {});
                                        console.error("COFFEE PUB • MONARCH | Import file structure:", fileKeys);
                                        ui.notifications.error(
                                            `Invalid import file format. Expected 'allModuleSettings' property. ` +
                                            `Found keys: ${fileKeys.length ? fileKeys.join(', ') : 'none'}. ` +
                                            `Please ensure you're importing a settings export file (created with "Export Settings" in the Settings window).`
                                        );
                                        return;
                                    }

                                    // Analyze what will be imported
                                    // Check modules, systems, and core (which is always available)
                                    const allModules = new Set(game.modules.keys());
                                    const allSystems = new Set();
                                    
                                    // Get all system IDs - game.systems is a Map of all installed systems
                                    if (game.systems) {
                                        for (const [systemId, system] of game.systems) {
                                            allSystems.add(systemId);
                                        }
                                    }
                                    
                                    // Also check the active system (game.system.id)
                                    if (game.system?.id) {
                                        allSystems.add(game.system.id);
                                    }
                                    
                                    // Also check settings registry - if a namespace has settings, it exists
                                    // This catches systems/modules that might not be in game.systems or game.modules
                                    const namespacesWithSettings = new Set();
                                    if (game.settings?.settings) {
                                        for (const fullKey of game.settings.settings.keys()) {
                                            const [namespace] = fullKey.split(".", 2);
                                            if (namespace && namespace !== 'core') {
                                                namespacesWithSettings.add(namespace);
                                            }
                                        }
                                    }
                                    
                                    const allAvailable = new Set([...allModules, ...allSystems, ...namespacesWithSettings, 'core']);
                                    
                                    const importedModules = new Set(Object.keys(importedSettings));
                                    const missingModules = [...importedModules].filter(id => !allAvailable.has(id));
                                    const availableModules = [...importedModules].filter(id => allAvailable.has(id));

                                    // Check user permissions
                                    const isGM = game.user.isGM;
                                    
                                    // Sort modules alphabetically by title
                                    const sortedModules = [...availableModules].sort((a, b) => {
                                        // Get title from module, system, or use ID
                                        let titleA, titleB;
                                        if (a === 'core') {
                                            titleA = 'Core';
                                        } else if (game.modules.has(a)) {
                                            titleA = game.modules.get(a)?.title || a;
                                        } else if (game.systems?.has(a)) {
                                            titleA = game.systems.get(a)?.title || a;
                                        } else {
                                            titleA = a;
                                        }
                                        
                                        if (b === 'core') {
                                            titleB = 'Core';
                                        } else if (game.modules.has(b)) {
                                            titleB = game.modules.get(b)?.title || b;
                                        } else if (game.systems?.has(b)) {
                                            titleB = game.systems.get(b)?.title || b;
                                        } else {
                                            titleB = b;
                                        }
                                        
                                        return titleA.localeCompare(titleB);
                                    });
                                    
                                    // Show preview dialog with module checkboxes
                                    const moduleCheckboxes = sortedModules.map(moduleId => {
                                        // Get title from module, system, or use ID
                                        let moduleTitle;
                                        if (moduleId === 'core') {
                                            moduleTitle = 'Core';
                                        } else if (game.modules.has(moduleId)) {
                                            moduleTitle = game.modules.get(moduleId)?.title || moduleId;
                                        } else if (game.systems?.has(moduleId)) {
                                            moduleTitle = game.systems.get(moduleId)?.title || moduleId;
                                        } else {
                                            moduleTitle = moduleId;
                                        }
                                        return `<label class="checkbox" style="display: block; margin: 0.25em 0;">
                                            <input type="checkbox" name="importModule" value="${moduleId}" class="module-import-checkbox" checked>
                                            ${moduleTitle}
                                        </label>`;
                                    }).join('');
                                    
                                    const previewContent = `
                                        <h3>Import Preview</h3>
                                        ${!isGM ? '<p class="notes" style="color: #ff6b6b; margin-bottom: 1em;"><strong>Note:</strong> As a player, you can only import client-scoped settings. World-scoped settings require GM permissions.</p>' : ''}
                                        <div class="form-group">
                                            <p><strong>Import Options:</strong></p>
                                            <ul style="margin: 0.5em 0; padding-left: 1.5em;">
                                                ${importWorldSettings ? '<li>World-scoped settings: <strong>Enabled</strong></li>' : '<li>World-scoped settings: <strong>Disabled</strong></li>'}
                                                ${importClientSettings ? '<li>Client-scoped settings: <strong>Enabled</strong></li>' : '<li>Client-scoped settings: <strong>Disabled</strong></li>'}
                                            </ul>
                                        </div>
                                        <div class="form-group">
                                            <label>Select Modules to Import (all selected by default):</label>
                                            <div class="form-fields" style="margin-bottom: 0.5em;">
                                                <button type="button" class="select-all-modules" style="margin-right: 0.5em;">
                                                    <i class="fas fa-check-square"></i> Select All
                                                </button>
                                                <button type="button" class="select-none-modules">
                                                    <i class="fas fa-square"></i> Select None
                                                </button>
                                            </div>
                                            <div class="available-modules" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                                                ${availableModules.length ? moduleCheckboxes : '<p>No modules available to import</p>'}
                                            </div>
                                        </div>
                                        ${missingModules.length > 0 ? `
                                        <div class="form-group">
                                            <label>Missing Modules (not installed, will be skipped):</label>
                                            <div class="missing-modules" style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                                                ${missingModules.join('<br>')}
                                            </div>
                                        </div>
                                        ` : ''}
                                        <p class="notes">Uncheck any modules you don't want to import settings from.</p>`;

                                    const previewDialog = new Dialog({
                                        title: "Import Preview",
                                        content: previewContent,
                                        render: (html) => {
                                            // In v13, Dialog render hooks receive the dialog element
                                            // Ensure html is a DOM element
                                            let dialogElement = html;
                                            if (!(html instanceof HTMLElement)) {
                                                dialogElement = html?.[0] || html;
                                            }
                                            if (!(dialogElement instanceof HTMLElement)) {
                                                dialogElement = document.querySelector('.window-app.dialog') || html;
                                            }
                                            
                                            // Add event handlers for Select All/None buttons
                                            const selectAllBtn = dialogElement.querySelector('.select-all-modules');
                                            if (selectAllBtn) {
                                                selectAllBtn.addEventListener('click', () => {
                                                    dialogElement.querySelectorAll('.module-import-checkbox').forEach(checkbox => {
                                                        checkbox.checked = true;
                                                    });
                                                });
                                            }
                                            const selectNoneBtn = dialogElement.querySelector('.select-none-modules');
                                            if (selectNoneBtn) {
                                                selectNoneBtn.addEventListener('click', () => {
                                                    dialogElement.querySelectorAll('.module-import-checkbox').forEach(checkbox => {
                                                        checkbox.checked = false;
                                                    });
                                                });
                                            }
                                        },
                                        buttons: {
                                            proceed: {
                                                icon: '<i class="fas fa-file-import"></i>',
                                                label: "Proceed with Import",
                                                callback: async (html) => {
                                                    try {
                                                        // In v13, Dialog callbacks receive the form element
                                                        let form = html;
                                                        if (!(html instanceof HTMLElement)) {
                                                            form = html?.[0] || html;
                                                        }
                                                        if (!(form instanceof HTMLElement)) {
                                                            form = document.querySelector('form') || html;
                                                        }
                                                        // Get selected modules from checkboxes
                                                        const selectedModules = new Set();
                                                        form.querySelectorAll('.module-import-checkbox:checked').forEach(checkbox => {
                                                            selectedModules.add(checkbox.value);
                                                        });
                                                        
                                                        // Use the checkbox values from the file selection dialog
                                                        // (importWorldSettings and importClientSettings are already captured above)
                                                        const isGM = game.user.isGM;
                                                        
                                                        let importedCount = 0;
                                                        let skippedByChoiceCount = 0;  // Intentionally skipped (not an error)
                                                        let errorCount = 0;  // Actual errors during import
                                                        let worldScopedCount = 0;
                                                        let clientScopedCount = 0;
                                                        let permissionDeniedCount = 0;

                                                        // Import settings for selected modules only
                                                        for (const [moduleId, moduleSettings] of Object.entries(importedSettings)) {
                                                            // Skip if module not selected
                                                            if (!selectedModules.has(moduleId)) {
                                                                skippedByChoiceCount += Object.keys(moduleSettings).length;
                                                                continue;
                                                            }
                                                            
                                                            // Check if module, system, or core exists
                                                            const moduleExists = game.modules.has(moduleId) || 
                                                                                game.systems?.has(moduleId) || 
                                                                                moduleId === 'core';
                                                            
                                                            if (moduleExists) {
                                                                for (const [settingKey, settingData] of Object.entries(moduleSettings)) {
                                                                    try {
                                                                        // Check if setting exists - settings registry uses "namespace.key" format
                                                                        const fullKey = `${moduleId}.${settingKey}`;
                                                                        const existingSetting = game.settings.settings.get(fullKey);
                                                                        
                                                                        if (!existingSetting) {
                                                                            // Setting doesn't exist in current instance - skip by choice
                                                                            skippedByChoiceCount++;
                                                                            continue;
                                                                        }
                                                                        
                                                                        const isWorldScoped = existingSetting.scope === 'world';
                                                                        const isClientScoped = existingSetting.scope === 'client';
                                                                        
                                                                        // Only GMs can import world-scoped settings
                                                                        if (isWorldScoped && !isGM) {
                                                                            permissionDeniedCount++;
                                                                            continue;
                                                                        }
                                                                        
                                                                        // Check if we should import this setting based on checkboxes
                                                                        if (isWorldScoped && !importWorldSettings) {
                                                                            // World-scoped but checkbox not checked - skip by choice
                                                                            skippedByChoiceCount++;
                                                                            continue;
                                                                        }
                                                                        
                                                                        if (isClientScoped && !importClientSettings) {
                                                                            // Client-scoped but checkbox not checked - skip by choice
                                                                            skippedByChoiceCount++;
                                                                            continue;
                                                                        }
                                                                        
                                                                        // If we get here, we should import (either world or client, and checkbox is checked)
                                                                        if (!isWorldScoped && !isClientScoped) {
                                                                            // Unknown scope - skip
                                                                            skippedByChoiceCount++;
                                                                            continue;
                                                                        }
                                                                        
                                                                        // Prepare the value to import
                                                                        let valueToImport = settingData.value;
                                                                        
                                                                        // Handle empty strings for settings that might expect JSON
                                                                        // Some modules (like Torch) expect JSON strings but validation fails on empty strings
                                                                        // Check if setting name suggests it might be JSON-related
                                                                        const jsonLikeKeys = ['gameLightSources', 'sources', 'config', 'json', 'data', 'settings'];
                                                                        const mightBeJson = jsonLikeKeys.some(key => settingKey.toLowerCase().includes(key.toLowerCase()));
                                                                        
                                                                        if (typeof valueToImport === 'string' && valueToImport === '' && mightBeJson) {
                                                                            // Use empty JSON object instead of empty string for JSON-expected settings
                                                                            valueToImport = '{}';
                                                                        }
                                                                        
                                                                        // Import the setting - only use the value, let the module handle validation
                                                                        // Foundry and the module will validate the value when we set it
                                                                        await game.settings.set(moduleId, settingKey, valueToImport);
                                                                        importedCount++;
                                                                        if (isWorldScoped) worldScopedCount++;
                                                                        if (isClientScoped) clientScopedCount++;
                                                                        
                                                                    } catch (error) {
                                                                        // Check if it's a permission error
                                                                        if (error.message && error.message.includes('permission')) {
                                                                            permissionDeniedCount++;
                                                                        } else {
                                                                            console.warn(`COFFEE PUB • MONARCH | Error importing setting ${moduleId}.${settingKey}:`, error);
                                                                            errorCount++;
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        // Show success dialog
                                                        let scopeDetails = '';
                                                        if (isGM && worldScopedCount > 0) {
                                                            scopeDetails += `<p><strong>World-scoped:</strong> ${worldScopedCount} settings</p>`;
                                                        }
                                                        if (importClientSettings && clientScopedCount > 0) {
                                                            scopeDetails += `<p><strong>Client-scoped:</strong> ${clientScopedCount} settings</p>`;
                                                        }
                                                        if (permissionDeniedCount > 0) {
                                                            scopeDetails += `<p class="notes" style="color: #ff6b6b;"><strong>Permission denied:</strong> ${permissionDeniedCount} world-scoped settings (GM only)</p>`;
                                                        }
                                                        
                                                        let skippedDetails = '';
                                                        if (skippedByChoiceCount > 0) {
                                                            let reasons = [];
                                                            if (!importWorldSettings && isGM) {
                                                                reasons.push('world-scoped settings (checkbox not checked)');
                                                            }
                                                            if (!importClientSettings) {
                                                                reasons.push('client-scoped settings (checkbox not checked)');
                                                            }
                                                            reasons.push('settings not found in current instance');
                                                            skippedDetails = `<p><strong>Skipped (by choice):</strong> ${skippedByChoiceCount} settings</p>
                                                                <p class="notes" style="font-size: 0.9em;">Skipped settings: ${reasons.join(', ')}</p>`;
                                                        }
                                                        
                                                        let errorDetails = '';
                                                        if (errorCount > 0) {
                                                            errorDetails = `<p class="notes" style="color: #ff6b6b;"><strong>Errors:</strong> ${errorCount} settings failed to import (check console for details)</p>`;
                                                        }
                                                        
                                                        let title = "Import Complete";
                                                        if (!isGM && permissionDeniedCount > 0) {
                                                            title = "Import Complete (Limited)";
                                                        }
                                                        
                                                        const successContent = `
                                                            <h3>${title}</h3>
                                                            <p><strong>Successfully imported:</strong> ${importedCount} settings</p>
                                                            ${scopeDetails}
                                                            ${skippedDetails}
                                                            ${errorDetails}
                                                            <p><strong>Modules processed:</strong> ${availableModules.length}</p>
                                                            ${!isGM ? '<p class="notes">Note: As a player, you can only import client-scoped settings. World-scoped settings require GM permissions.</p>' : ''}
                                                            <p class="notes">Note: Some settings may require a page reload to take effect.</p>`;

                                                        const successDialog = new Dialog({
                                                            title: title,
                                                            content: successContent,
                                                            buttons: {
                                                                reload: {
                                                                    icon: '<i class="fas fa-sync"></i>',
                                                                    label: "Reload Now",
                                                                    callback: () => window.location.reload()
                                                                },
                                                                close: {
                                                                    icon: '<i class="fas fa-times"></i>',
                                                                    label: "Close"
                                                                }
                                                            },
                                                            default: "close"
                                                        });
                                                        successDialog.render(true);

                                                    } catch (error) {
                                                        console.error("COFFEE PUB • MONARCH | Error importing settings:", error);
                                                        ui.notifications.error("COFFEE PUB • MONARCH | Failed to import settings. Check the console for details.");
                                                    }
                                                }
                                            },
                                            cancel: {
                                                icon: '<i class="fas fa-times"></i>',
                                                label: "Cancel"
                                            }
                                        },
                                        default: "proceed"
                                    });
                                    previewDialog.render(true);
                                };
                                reader.readAsText(file);
                            } catch (error) {
                                console.error("COFFEE PUB • MONARCH | Error importing settings:", error);
                                ui.notifications.error("COFFEE PUB • MONARCH | Failed to import settings. Check the console for details.");
                            }
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: "import"
            });
            dialog.render(true);
        };
        
        // Remove old listeners if they exist (stored in WeakMap)
        const oldHandlers = this._handlerStorage.get(html);
        if (oldHandlers?.importHandler) {
            html.removeEventListener('click', oldHandlers.importHandler);
        }
        
        // Add new listener
        html.addEventListener('click', importHandler);
        
        // Store handler for cleanup
        const exportHandler = async (event) => {
            if (!event.target.matches('.monarch-export-settings') && !event.target.closest('.monarch-export-settings')) return;
            event.preventDefault();
            event.preventDefault();
            
            // Use the proven Foundry V12 approach to export ALL settings
            const defs = game.settings.settings;  // Map<"namespace.key", SettingConfig>
            const out = {};
            
            console.log("COFFEE PUB • MONARCH | Starting export of all settings...");
            console.log("COFFEE PUB • MONARCH | Settings registry size:", defs.size);
            
            for (const [fullKey, cfg] of defs) {
                const [namespace, key] = fullKey.split(".", 2);
                out[namespace] ??= {};
                
                try {
                    // Check if the setting is actually registered and accessible
                    if (!game.settings.settings.has(fullKey)) {
                        console.warn(`COFFEE PUB • MONARCH | Skipping unregistered setting: ${fullKey}`);
                        out[namespace][key] = { 
                            __exportError: "Setting not registered",
                            scope: cfg.scope,
                            type: cfg.type?.name || 'Unknown'
                        };
                        continue;
                    }
                    
                    // Pull the current value from the appropriate storage (world or client)
                    const value = game.settings.get(namespace, key);
                    
                    // Deep clone to keep it JSON-safe
                    const safeValue = foundry.utils.deepClone?.(value) ?? value;
                    
                    // Store with metadata
                    out[namespace][key] = {
                        value: safeValue,
                        scope: cfg.scope,
                        type: cfg.type?.name || 'Unknown',
                        config: cfg.config,
                        default: cfg.default
                    };
                    
                } catch (err) {
                    // If something can't be read/serialized, keep a note so you know what failed
                    console.warn(`COFFEE PUB • MONARCH | Failed to export ${fullKey}:`, err);
                    out[namespace][key] = { 
                        __exportError: String(err),
                        scope: cfg.scope,
                        type: cfg.type?.name || 'Unknown'
                    };
                }
            }
            
            console.log("COFFEE PUB • MONARCH | Export complete. Namespaces found:", Object.keys(out));
            
            const exportData = {
                allModuleSettings: out,
                exportedAt: new Date().toISOString(),
                foundryVersion: game.version,
                exportedBy: this.ID,
                totalSettings: Object.values(out).reduce((sum, ns) => sum + Object.keys(ns).length, 0)
            };
            
            const now = new Date();
            const timestamp = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
            const filename = `CoffeePub-MONARCH-Settings-Export-${timestamp}.json`;
            const data = JSON.stringify(exportData, null, 2);
            
            // Use Foundry's built-in saveDataToFile
            saveDataToFile(data, "text/json", filename);
            
            // Show success notification
            ui.notifications.info(`All settings exported successfully! (${exportData.totalSettings} settings across ${Object.keys(out).length} namespaces)`);
        };
        
        // Remove old export listener if it exists
        if (oldHandlers?.exportHandler) {
            html.removeEventListener('click', oldHandlers.exportHandler);
        }
        
        // Add new export listener
        html.addEventListener('click', exportHandler);
        
        // Prune Settings button handler
        const pruneHandler = async (event) => {
            if (!event.target.matches('.monarch-prune-settings') && !event.target.closest('.monarch-prune-settings')) return;
            event.preventDefault();
            
            // Get all installed modules and systems (these are what should have settings)
            const allInstalledModules = new Set(game.modules.keys());
            const allInstalledSystems = new Set();
            if (game.systems) {
                for (const [systemId, system] of game.systems) {
                    allInstalledSystems.add(systemId);
                }
            }
            if (game.system?.id) {
                allInstalledSystems.add(game.system.id);
            }
            
            // Get all stored settings from the database (not just registered ones)
            // Settings are stored in world.flags and user.flags
            const allStoredSettings = new Map(); // Map<"namespace.key", {namespace, key, scope}>
            const allSettingsByNamespace = {};
            
            // Check world-scoped settings (stored in world.flags)
            if (game.world?.flags) {
                for (const [namespace, namespaceFlags] of Object.entries(game.world.flags)) {
                    if (namespace === 'core') continue; // Skip core, it's always valid
                    
                    // Check if this namespace is installed
                    const isInstalled = allInstalledModules.has(namespace) || 
                                      allInstalledSystems.has(namespace) || 
                                      namespace === 'core';
                    
                    if (namespaceFlags && typeof namespaceFlags === 'object') {
                        for (const [key, value] of Object.entries(namespaceFlags)) {
                            // Skip internal Foundry flags
                            if (key.startsWith('_')) continue;
                            
                            const fullKey = `${namespace}.${key}`;
                            allStoredSettings.set(fullKey, { namespace, key, scope: 'world' });
                            
                            // Collect for report
                            if (!allSettingsByNamespace[namespace]) {
                                allSettingsByNamespace[namespace] = [];
                            }
                            allSettingsByNamespace[namespace].push(key);
                        }
                    }
                }
            }
            
            // Check client-scoped settings (stored in user.flags)
            if (game.user?.flags) {
                for (const [namespace, namespaceFlags] of Object.entries(game.user.flags)) {
                    if (namespace === 'core') continue; // Skip core, it's always valid
                    
                    // Check if this namespace is installed
                    const isInstalled = allInstalledModules.has(namespace) || 
                                      allInstalledSystems.has(namespace) || 
                                      namespace === 'core';
                    
                    if (namespaceFlags && typeof namespaceFlags === 'object') {
                        for (const [key, value] of Object.entries(namespaceFlags)) {
                            // Skip internal Foundry flags
                            if (key.startsWith('_')) continue;
                            
                            const fullKey = `${namespace}.${key}`;
                            // Only add if not already found as world-scoped
                            if (!allStoredSettings.has(fullKey)) {
                                allStoredSettings.set(fullKey, { namespace, key, scope: 'client' });
                            }
                            
                            // Collect for report
                            if (!allSettingsByNamespace[namespace]) {
                                allSettingsByNamespace[namespace] = [];
                            }
                            if (!allSettingsByNamespace[namespace].includes(key)) {
                                allSettingsByNamespace[namespace].push(key);
                            }
                        }
                    }
                }
            }
            
            // Also include registered settings for the report (they might not be in flags yet)
            if (game.settings?.settings) {
                for (const fullKey of game.settings.settings.keys()) {
                    const [namespace, key] = fullKey.split(".", 2);
                    if (namespace && namespace !== 'core') {
                        // Collect for report
                        if (!allSettingsByNamespace[namespace]) {
                            allSettingsByNamespace[namespace] = [];
                        }
                        if (!allSettingsByNamespace[namespace].includes(key)) {
                            allSettingsByNamespace[namespace].push(key);
                        }
                    }
                }
            }
            
            // Now identify orphaned settings (stored but namespace not installed)
            const settingsToPrune = [];
            for (const [fullKey, { namespace, key, scope }] of allStoredSettings) {
                if (namespace === 'core') continue; // Never prune core
                
                const isInstalled = allInstalledModules.has(namespace) || 
                                  allInstalledSystems.has(namespace);
                
                if (!isInstalled) {
                    settingsToPrune.push({ namespace, key, fullKey, scope });
                }
            }
            
            // Sort namespaces alphabetically
            const sortedNamespaces = Object.keys(allSettingsByNamespace).sort();
            
            // Create a map of orphaned settings for quick lookup
            const orphanedSettingsMap = new Set();
            settingsToPrune.forEach(({ namespace, key }) => {
                orphanedSettingsMap.add(`${namespace}.${key}`);
            });
            
            // Build the namespace list with checkboxes
            const namespaceList = sortedNamespaces.map(ns => {
                const settings = allSettingsByNamespace[ns];
                const isInstalled = allInstalledModules.has(ns) || allInstalledSystems.has(ns) || ns === 'core';
                const status = isInstalled ? '<span style="color: #51cf66;">✓ Installed</span>' : '<span style="color: #ff6b6b;">✗ Not Installed</span>';
                // Pre-check orphaned settings, uncheck installed ones
                const isChecked = !isInstalled && ns !== 'core';
                const checkboxId = `monarch-prune-${ns}`;
                
                // List individual settings under each namespace
                const settingsList = settings.map(key => {
                    const settingKey = `${ns}.${key}`;
                    const isOrphaned = orphanedSettingsMap.has(settingKey);
                    const settingCheckboxId = `monarch-prune-setting-${ns}-${key}`;
                    const settingChecked = isOrphaned;
                    return `<div style="margin-left: 20px; font-size: 0.9em; color: #666;">
                        <input type="checkbox" id="${settingCheckboxId}" class="monarch-setting-checkbox" data-namespace="${ns}" data-key="${key}" ${settingChecked ? 'checked' : ''}>
                        <label for="${settingCheckboxId}">${key}</label>
                    </div>`;
                }).join('');
                
                return `<div style="margin-bottom: 10px; padding: 5px; border-left: 3px solid ${isInstalled ? '#51cf66' : '#ff6b6b'}; padding-left: 10px;">
                    <input type="checkbox" id="${checkboxId}" class="monarch-namespace-checkbox" data-namespace="${ns}" ${isChecked ? 'checked' : ''}>
                    <label for="${checkboxId}" style="font-weight: bold;">${ns}</label> ${status} <span style="color: #666;">(${settings.length} settings)</span>
                    ${settingsList}
                </div>`;
            }).join('');
            
            const totalSettings = Object.values(allSettingsByNamespace).reduce((sum, settings) => sum + settings.length, 0);
            const orphanedCount = settingsToPrune.length;
            
            const combinedContent = `
                <h3>Settings Report & Prune</h3>
                <p>Select which settings to prune/reset. Orphaned settings (from uninstalled modules) are pre-checked.</p>
                <div style="margin-bottom: 10px;">
                    <button type="button" id="monarch-select-all" style="margin-right: 5px;">Select All</button>
                    <button type="button" id="monarch-select-none">Select None</button>
                </div>
                <div class="form-group">
                    <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                        ${namespaceList}
                    </div>
                </div>
                <p><strong>Total:</strong> ${totalSettings} settings across ${sortedNamespaces.length} namespaces</p>
                ${orphanedCount > 0 ? `<p class="notes" style="color: #ff6b6b;"><strong>Orphaned:</strong> ${orphanedCount} settings from uninstalled modules (pre-checked)</p>` : '<p class="notes" style="color: #51cf66;">✓ All settings belong to installed modules or systems.</p>'}
                <p class="notes" style="color: #ff6b6b;"><strong>Warning:</strong> This action cannot be undone. Make sure you have a backup if you want to restore these settings later.</p>`;
            
            const combinedDialog = new Dialog({
                title: "Settings Report & Prune",
                content: combinedContent,
                buttons: {
                    proceed: {
                        icon: '<i class="fas fa-broom"></i>',
                        label: "Prune Selected",
                        callback: async (html) => {
                            try {
                                // Handle both jQuery (v12) and DOM element (v13) formats
                                // In v13, Dialog callbacks receive the form element
                                let element = html;
                                if (!(html instanceof HTMLElement)) {
                                    // Try to unwrap if it's a jQuery object or array-like
                                    element = html?.[0] || html;
                                }
                                // If still not an HTMLElement, try to find the dialog content
                                if (!(element instanceof HTMLElement)) {
                                    element = document.querySelector('.window-content') || html;
                                }
                                
                                // Get all checked settings from the dialog
                                const checkedSettings = [];
                                const settingCheckboxes = element.querySelectorAll('.monarch-setting-checkbox:checked');
                                
                                settingCheckboxes.forEach(checkbox => {
                                    const namespace = checkbox.dataset.namespace;
                                    const key = checkbox.dataset.key;
                                    const fullKey = `${namespace}.${key}`;
                                    
                                    // Find the scope from our stored settings
                                    const storedSetting = allStoredSettings.get(fullKey);
                                    if (storedSetting) {
                                        checkedSettings.push({ namespace, key, scope: storedSetting.scope });
                                    } else {
                                        // Fallback: try to determine scope from registered settings
                                        const registeredSetting = game.settings.settings.get(fullKey);
                                        if (registeredSetting) {
                                            checkedSettings.push({ namespace, key, scope: registeredSetting.scope });
                                        } else {
                                            // Default to world scope if we can't determine
                                            checkedSettings.push({ namespace, key, scope: 'world' });
                                        }
                                    }
                                });
                                
                                if (checkedSettings.length === 0) {
                                    ui.notifications.info("No settings selected for pruning.");
                                    return;
                                }
                                
                                let prunedCount = 0;
                                let errorCount = 0;
                                const prunedNamespaces = new Set();
                                const stillInstalledModules = new Set();
                                
                                // Prune selected settings by removing them from the database storage
                                for (const { namespace, key, scope } of checkedSettings) {
                                    try {
                                        // Check permissions (world-scoped requires GM)
                                        if (scope === 'world' && !game.user.isGM) {
                                            continue; // Skip world-scoped settings if not GM
                                        }
                                        
                                        const fullKey = `${namespace}.${key}`;
                                        console.log(`COFFEE PUB • MONARCH | Attempting to prune ${fullKey} (scope: ${scope})`);
                                        
                                        let removed = false;
                                        
                                        // Remove from settings storage (the actual database)
                                        if (scope === 'world' || !scope) {
                                            try {
                                                const worldStorage = game.settings.storage?.get("world");
                                                if (worldStorage && typeof worldStorage.removeItem === 'function') {
                                                    await worldStorage.removeItem(fullKey);
                                                    // Verify it was actually removed
                                                    const stillExists = await worldStorage.getItem(fullKey);
                                                    if (stillExists !== null) {
                                                        console.warn(`COFFEE PUB • MONARCH | Warning: ${fullKey} still exists in world storage after removal`);
                                                    } else {
                                                        console.log(`COFFEE PUB • MONARCH | Removed ${fullKey} from world storage (verified)`);
                                                        removed = true;
                                                    }
                                                } else {
                                                    console.warn(`COFFEE PUB • MONARCH | World storage not available or removeItem not a function for ${fullKey}`);
                                                }
                                            } catch (error) {
                                                console.warn(`COFFEE PUB • MONARCH | Could not remove world setting ${fullKey}:`, error);
                                            }
                                        }
                                        
                                        if (scope === 'client' || (!removed && !scope)) {
                                            try {
                                                const clientStorage = game.settings.storage?.get("client");
                                                if (clientStorage && typeof clientStorage.removeItem === 'function') {
                                                    await clientStorage.removeItem(fullKey);
                                                    // Verify it was actually removed
                                                    const stillExists = await clientStorage.getItem(fullKey);
                                                    if (stillExists !== null) {
                                                        console.warn(`COFFEE PUB • MONARCH | Warning: ${fullKey} still exists in client storage after removal`);
                                                    } else {
                                                        console.log(`COFFEE PUB • MONARCH | Removed ${fullKey} from client storage (verified)`);
                                                        removed = true;
                                                    }
                                                } else {
                                                    console.warn(`COFFEE PUB • MONARCH | Client storage not available or removeItem not a function for ${fullKey}`);
                                                }
                                            } catch (error) {
                                                console.warn(`COFFEE PUB • MONARCH | Could not remove client setting ${fullKey}:`, error);
                                            }
                                        }
                                        
                                        // Check if module is still installed (which would cause setting to reappear)
                                        const moduleStillInstalled = game.modules.has(namespace);
                                        if (moduleStillInstalled) {
                                            stillInstalledModules.add(namespace);
                                            console.warn(`COFFEE PUB • MONARCH | Warning: Module "${namespace}" is still installed. Setting will reappear after refresh because the module re-registers it on load.`);
                                        }
                                        
                                        // Also remove from flags if they exist (some settings might be stored as flags)
                                        if (scope === 'world' && game.world?.flags?.[namespace]?.[key] !== undefined) {
                                            try {
                                                // Try unsetFlag if namespace is active
                                                try {
                                                    await game.world.unsetFlag(namespace, key);
                                                    console.log(`COFFEE PUB • MONARCH | Removed ${fullKey} from world flags via unsetFlag`);
                                                } catch (flagError) {
                                                    // If unsetFlag fails, directly manipulate flags
                                                    const sourceFlags = foundry.utils.deepClone(game.world._source?.flags || game.world.flags || {});
                                                    if (sourceFlags[namespace] && sourceFlags[namespace][key] !== undefined) {
                                                        delete sourceFlags[namespace][key];
                                                        if (Object.keys(sourceFlags[namespace]).length === 0) {
                                                            delete sourceFlags[namespace];
                                                        }
                                                        await game.world.updateSource({ flags: sourceFlags });
                                                        console.log(`COFFEE PUB • MONARCH | Removed ${fullKey} from world flags via updateSource`);
                                                    }
                                                }
                                            } catch (error) {
                                                console.warn(`COFFEE PUB • MONARCH | Could not remove world flag ${fullKey}:`, error);
                                            }
                                        }
                                        
                                        if (scope === 'client' && game.user?.flags?.[namespace]?.[key] !== undefined) {
                                            try {
                                                // Try unsetFlag if namespace is active
                                                try {
                                                    await game.user.unsetFlag(namespace, key);
                                                    console.log(`COFFEE PUB • MONARCH | Removed ${fullKey} from user flags via unsetFlag`);
                                                } catch (flagError) {
                                                    // If unsetFlag fails, directly manipulate flags
                                                    const sourceFlags = foundry.utils.deepClone(game.user._source?.flags || game.user.flags || {});
                                                    if (sourceFlags[namespace] && sourceFlags[namespace][key] !== undefined) {
                                                        delete sourceFlags[namespace][key];
                                                        if (Object.keys(sourceFlags[namespace]).length === 0) {
                                                            delete sourceFlags[namespace];
                                                        }
                                                        await game.user.updateSource({ flags: sourceFlags });
                                                        console.log(`COFFEE PUB • MONARCH | Removed ${fullKey} from user flags via updateSource`);
                                                    }
                                                }
                                            } catch (error) {
                                                console.warn(`COFFEE PUB • MONARCH | Could not remove user flag ${fullKey}:`, error);
                                            }
                                        }
                                        
                                        // Only count as successfully pruned if:
                                        // 1. The setting was removed from storage, AND
                                        // 2. The module is NOT still installed (otherwise it will reappear)
                                        if (removed && !moduleStillInstalled) {
                                            prunedCount++;
                                            prunedNamespaces.add(namespace);
                                        } else if (removed && moduleStillInstalled) {
                                            // Setting was removed but module is still installed - it will come back
                                            console.warn(`COFFEE PUB • MONARCH | Setting ${fullKey} removed but module "${namespace}" is still installed - it will reappear on refresh`);
                                        } else {
                                            console.warn(`COFFEE PUB • MONARCH | Failed to remove ${fullKey} from storage`);
                                            errorCount++;
                                        }
                                    } catch (error) {
                                        console.error(`COFFEE PUB • MONARCH | Error pruning setting ${namespace}.${key}:`, error);
                                        errorCount++;
                                    }
                                }
                                
                                // Show success dialog
                                const stillInstalledWarning = stillInstalledModules.size > 0 
                                    ? `<div style="background: #fff3cd; border: 2px solid #ffc107; padding: 10px; margin: 10px 0; border-radius: 4px;">
                                        <p style="margin: 0; font-weight: bold; color: #856404;"><strong>⚠️ Cannot Permanently Remove Settings</strong></p>
                                        <p style="margin: 5px 0 0 0; color: #856404;">
                                            ${stillInstalledModules.size} module(s) are still <strong>installed</strong> (${Array.from(stillInstalledModules).join(', ')}). 
                                            Settings were removed from storage, but they <strong>will reappear after refresh</strong> because installed modules re-register their settings when Foundry loads.
                                        </p>
                                        <p style="margin: 5px 0 0 0; color: #856404;">
                                            <strong>To permanently remove settings:</strong> Uninstall the modules first (not just disable), then prune the orphaned settings.
                                        </p>
                                    </div>`
                                    : '';
                                
                                const successContent = `
                                    <h3>Prune Complete</h3>
                                    <p><strong>Settings pruned:</strong> ${prunedCount}</p>
                                    ${errorCount > 0 ? `<p class="notes" style="color: #ff6b6b;"><strong>Errors:</strong> ${errorCount} settings could not be pruned</p>` : ''}
                                    <p><strong>Namespaces cleaned:</strong> ${prunedNamespaces.size}</p>
                                    ${stillInstalledWarning}
                                    ${stillInstalledModules.size === 0 ? '<p class="notes">Settings have been permanently removed from the database.</p>' : ''}`;
                                
                                const successDialog = new Dialog({
                                    title: "Prune Complete",
                                    content: successContent,
                                    buttons: {
                                        reload: {
                                            icon: '<i class="fas fa-sync"></i>',
                                            label: "Reload Now",
                                            callback: () => window.location.reload()
                                        },
                                        close: {
                                            icon: '<i class="fas fa-times"></i>',
                                            label: "Close"
                                        }
                                    },
                                    default: "close"
                                });
                                successDialog.render(true);
                                
                            } catch (error) {
                                console.error("COFFEE PUB • MONARCH | Error pruning settings:", error);
                                ui.notifications.error("COFFEE PUB • MONARCH | Failed to prune settings. Check the console for details.");
                            }
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: "proceed",
                render: (html) => {
                    // Handle both jQuery (v12) and DOM element (v13) formats
                    const element = html.jquery ? html[0] : html;
                    
                    // Add event handlers for namespace checkboxes (toggle all settings in namespace)
                    element.querySelectorAll('.monarch-namespace-checkbox').forEach(checkbox => {
                        checkbox.addEventListener('change', function() {
                            const namespace = this.dataset.namespace;
                            const isChecked = this.checked;
                            element.querySelectorAll(`.monarch-setting-checkbox[data-namespace="${namespace}"]`).forEach(settingCheckbox => {
                                settingCheckbox.checked = isChecked;
                            });
                        });
                    });
                    
                    // Add event handlers for setting checkboxes (update namespace checkbox state)
                    element.querySelectorAll('.monarch-setting-checkbox').forEach(checkbox => {
                        checkbox.addEventListener('change', function() {
                            const namespace = this.dataset.namespace;
                            const namespaceCheckbox = element.querySelector(`.monarch-namespace-checkbox[data-namespace="${namespace}"]`);
                            const allSettings = element.querySelectorAll(`.monarch-setting-checkbox[data-namespace="${namespace}"]`);
                            const checkedSettings = element.querySelectorAll(`.monarch-setting-checkbox[data-namespace="${namespace}"]:checked`);
                            if (namespaceCheckbox) {
                                namespaceCheckbox.checked = allSettings.length === checkedSettings.length;
                            }
                        });
                    });
                    
                    // Select All button
                    const selectAllBtn = element.querySelector('#monarch-select-all');
                    if (selectAllBtn) {
                        selectAllBtn.addEventListener('click', () => {
                            element.querySelectorAll('.monarch-setting-checkbox, .monarch-namespace-checkbox').forEach(checkbox => {
                                checkbox.checked = true;
                            });
                        });
                    }
                    
                    // Select None button
                    const selectNoneBtn = element.querySelector('#monarch-select-none');
                    if (selectNoneBtn) {
                        selectNoneBtn.addEventListener('click', () => {
                            element.querySelectorAll('.monarch-setting-checkbox, .monarch-namespace-checkbox').forEach(checkbox => {
                                checkbox.checked = false;
                            });
                        });
                    }
                }
            });
            combinedDialog.render(true);
        };
        
        // Remove old prune listener if it exists
        if (oldHandlers?.pruneHandler) {
            html.removeEventListener('click', oldHandlers.pruneHandler);
        }
        
        // Add new prune listener
        html.addEventListener('click', pruneHandler);
        
        // Store all handlers for cleanup
        this._handlerStorage.set(html, { importHandler, exportHandler, pruneHandler });
    }

    static _onCloseSettingsConfig(app, html) {
        // Clean up event listeners when settings window closes
        const targets = [];
        if (app.element) targets.push(app.element);
        if (html) targets.push(html);
        
        targets.forEach(target => {
            const handlers = this._handlerStorage.get(target);
            if (handlers) {
                if (handlers.importHandler) {
                    target.removeEventListener('click', handlers.importHandler);
                }
                if (handlers.exportHandler) {
                    target.removeEventListener('click', handlers.exportHandler);
                }
                if (handlers.pruneHandler) {
                    target.removeEventListener('click', handlers.pruneHandler);
                }
                // Clear from storage
                this._handlerStorage.delete(target);
            }
        });
    }

    static _activateListeners(html, app) {
        // Store initial module states
        const initialModuleStates = new Map();
        html.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
            initialModuleStates.set(checkbox.name, checkbox.checked);
        });

        // Function to update current state highlighting
        const updateCurrentStateHighlight = () => {
            html.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                const moduleId = checkbox.name;
                const initialState = initialModuleStates.get(moduleId);
                const currentState = checkbox.checked;
                const packageElem = checkbox.closest('.package');
                
                if (!packageElem) return;
                
                // Remove current change highlight if it exists
                packageElem.classList.remove('module-current-change');
                
                // Add highlight if changed from initial state
                if (initialState !== currentState) {
                    packageElem.classList.add('module-current-change');
                }
            });
        };

        // Function to check for changes and update button visibility
        const updateButtonVisibility = () => {
            const setNameSelect = html.querySelector('.load-module-set');
            const setName = setNameSelect ? setNameSelect.value : '';
            if (!setName) {
                const updateBtn = html.querySelector('.update-module-set');
                if (updateBtn) updateBtn.style.display = 'none';
                return;
            }

            // Get current checked modules from the form
            const currentModules = [];
            html.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                if (checkbox.checked) currentModules.push(checkbox.name);
            });

            // Compare with selected set
            const moduleSets = game.settings.get(this.ID, 'moduleSets');
            const moduleSet = moduleSets[setName];
            const isCurrentState = moduleSet.length === currentModules.length && 
                moduleSet.every(id => currentModules.includes(id)) &&
                currentModules.every(id => moduleSet.includes(id));

            // Show update button if there are changes
            const updateBtn = html.querySelector('.update-module-set');
            if (updateBtn) {
                updateBtn.style.display = isCurrentState ? 'none' : '';
            }
        };

        // Store the highlight update function so we can access it from hooks
        // In v13, html is the window-content section, use app.element for the window
        const moduleManager = app.element || document.querySelector('#module-management') || html;
        if (moduleManager) {
            this._handlerStorage.set(moduleManager, {
                updateCurrentStateHighlight,
                updateButtonVisibility
            });
        }

        // Add change handler to all checkboxes for both update button and highlighting
        // Use the window content section as the container for event delegation
        const container = html.querySelector('.package-list') || html;
        if (container) {
            container.addEventListener('change', (event) => {
                if (event.target.matches('input[type="checkbox"]')) {
                    updateButtonVisibility();
                    updateCurrentStateHighlight();
                }
            });

            // Also trigger when clicking package headers
            container.addEventListener('click', (event) => {
                if (event.target.matches('.package-header') || event.target.closest('.package-header')) {
                    setTimeout(() => {
                        updateButtonVisibility();
                        updateCurrentStateHighlight();
                    }, 0);
                }
            });
        }

        // Save as New button click
        const saveNewBtn = html.querySelector('.save-new-module-set');
        if (saveNewBtn) {
            saveNewBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                
                // Capture current module states from the form checkboxes
                const currentModules = [];
                html.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                    if (checkbox.checked) currentModules.push(checkbox.name);
                });
                
                const content = `
                    <form>
                        <div class="form-group">
                            <label>${game.i18n.localize(`${this.ID}.moduleSet.savePrompt`)}</label>
                            <div class="form-fields">
                                <input type="text" name="setName" required>
                            </div>
                        </div>
                    </form>`;

                const dialog = new Dialog({
                    title: game.i18n.localize(`${this.ID}.moduleSet.title`),
                    content: content,
                    buttons: {
                        saveAndApply: {
                            icon: '<i class="fas fa-save"></i>',
                            label: "Save and Reload",
                            callback: async (html) => {
                                // In v13, Dialog callbacks receive the form element directly
                                let form = html;
                                if (!(html instanceof HTMLElement)) {
                                    form = html?.[0] || html;
                                }
                                if (!(form instanceof HTMLElement)) {
                                    form = document.querySelector('form') || html;
                                }
                                // Use querySelector to find the input field
                                const setNameInput = form.querySelector?.('input[name="setName"]');
                                if (!setNameInput) return;
                                const setName = setNameInput.value?.trim();
                                if (!setName) return;

                                try {
                                    // Save the new module set
                                    const updatedModuleSets = game.settings.get(this.ID, 'moduleSets');
                                    updatedModuleSets[setName] = currentModules;
                                    await game.settings.set(this.ID, 'moduleSets', updatedModuleSets);
                                    
                                    // Update core settings and reload
                                    const moduleConfig = {};
                                    for (let moduleId of game.modules.keys()) {
                                        moduleConfig[moduleId] = currentModules.includes(moduleId);
                                    }
                                    await game.settings.set('core', 'moduleConfiguration', moduleConfig);
                                    window.location.reload();
                                } catch (error) {
                                    console.error("COFFEE PUB • MONARCH | Error saving module set:", error);
                                    ui.notifications.error("COFFEE PUB • MONARCH | Failed to save module set. Check the console for details.");
                                }
                            }
                        },
                        saveOnly: {
                            icon: '<i class="fas fa-save"></i>',
                            label: "Save Only",
                            callback: async (html) => {
                                // In v13, Dialog callbacks receive the form element directly
                                let form = html;
                                if (!(html instanceof HTMLElement)) {
                                    form = html?.[0] || html;
                                }
                                if (!(form instanceof HTMLElement)) {
                                    form = document.querySelector('form') || html;
                                }
                                // Use querySelector to find the input field
                                const setNameInput = form.querySelector?.('input[name="setName"]');
                                if (!setNameInput) return;
                                const setName = setNameInput.value?.trim();
                                if (!setName) return;

                                // Save the new module set
                                const updatedModuleSets = game.settings.get(this.ID, 'moduleSets');
                                updatedModuleSets[setName] = currentModules;
                                await game.settings.set(this.ID, 'moduleSets', updatedModuleSets);
                                
                                // Update just our dropdown
                                const moduleSetSelect = app.element?.querySelector('.load-module-set');
                                if (moduleSetSelect) {
                                    const existingSets = Object.keys(updatedModuleSets);
                                    moduleSetSelect.innerHTML = '<option value="">-- Select a Module Set --</option>';
                                    existingSets.forEach(set => {
                                        const option = document.createElement('option');
                                        option.value = set;
                                        option.textContent = set;
                                        moduleSetSelect.appendChild(option);
                                    });
                                    moduleSetSelect.value = setName;
                                }
                            }
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: "Cancel"
                        }
                    },
                    default: 'saveAndApply'
                });

                dialog.render(true);
            });
        }

        // Update button click
        const updateBtn = html.querySelector('.update-module-set');
        if (updateBtn) {
            updateBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                
                const setNameSelect = html.querySelector('.load-module-set');
                const setName = setNameSelect ? setNameSelect.value : '';
                if (!setName) return;

                // Capture current module states from the form checkboxes
                const currentModules = [];
                html.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                    if (checkbox.checked) currentModules.push(checkbox.name);
                });

            const dialog = new Dialog({
                title: game.i18n.localize(`${this.ID}.moduleSet.title`),
                content: `<p>Update "${setName}" with current module selection?</p>`,
                buttons: {
                    updateAndApply: {
                        icon: '<i class="fas fa-save"></i>',
                        label: "Update and Reload",
                        callback: async () => {
                            try {
                                // Update the module set
                                const updatedModuleSets = game.settings.get(this.ID, 'moduleSets');
                                updatedModuleSets[setName] = currentModules;
                                await game.settings.set(this.ID, 'moduleSets', updatedModuleSets);
                                
                                // Update core settings and reload
                                const moduleConfig = {};
                                for (let moduleId of game.modules.keys()) {
                                    moduleConfig[moduleId] = currentModules.includes(moduleId);
                                }
                                await game.settings.set('core', 'moduleConfiguration', moduleConfig);
                                window.location.reload();
                            } catch (error) {
                                console.error("COFFEE PUB • MONARCH | Error updating module set:", error);
                                ui.notifications.error("COFFEE PUB • MONARCH | Failed to update module set. Check the console for details.");
                            }
                        }
                    },
                    updateOnly: {
                        icon: '<i class="fas fa-save"></i>',
                        label: "Update Only",
                        callback: async () => {
                            // Update the module set
                            const updatedModuleSets = game.settings.get(this.ID, 'moduleSets');
                            updatedModuleSets[setName] = currentModules;
                            await game.settings.set(this.ID, 'moduleSets', updatedModuleSets);
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: 'updateAndApply'
            });

                dialog.render(true);
            });
        }

        // Load module set selection
        const loadModuleSetSelect = html.querySelector('.load-module-set');
        if (loadModuleSetSelect) {
            loadModuleSetSelect.addEventListener('change', async (event) => {
                const setName = event.target.value;
                const loadButton = html.querySelector('.load-set-button');
                const updateModuleBtn = html.querySelector('.update-module-set');
                
                if (!setName) {
                    if (loadButton) loadButton.style.display = 'none';
                    if (updateModuleBtn) updateModuleBtn.style.display = 'none';
                    return;
                }

                // Get current active modules to compare
                const currentActiveModules = Array.from(game.modules.keys()).filter(id => game.modules.get(id)?.active);
                const moduleSets = game.settings.get(this.ID, 'moduleSets');
                const moduleSet = moduleSets[setName];

                // Check if the selected set matches current state
                const isCurrentState = moduleSet.length === currentActiveModules.length && 
                    moduleSet.every(id => currentActiveModules.includes(id)) &&
                    currentActiveModules.every(id => moduleSet.includes(id));

                // Only show load button if the selected set is different from current state
                if (loadButton) {
                    loadButton.style.display = isCurrentState ? 'none' : '';
                }
                // Hide update button initially since no changes yet
                if (updateModuleBtn) updateModuleBtn.style.display = 'none';

                // Get current state before changes
                const originalState = new Map();
                // In v13, html is the window-content section, checkboxes are in .package-list
                const packageList = html.querySelector('.package-list') || html;
                if (packageList) {
                    packageList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                        originalState.set(checkbox.name, checkbox.checked);
                    });

                    // Update module checkboxes and clear all highlights
                    packageList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                        const moduleId = checkbox.name;
                        const wasChecked = originalState.get(moduleId);
                        const willBeChecked = moduleSet.includes(moduleId);
                        
                        // Update checkbox
                        checkbox.checked = willBeChecked;
                        
                        // Clear existing highlights
                        const packageElem = checkbox.closest('.package');
                        if (packageElem) {
                            packageElem.classList.remove('module-enabled-change', 'module-disabled-change', 'module-current-change');
                            
                            // Add highlight if changed from the selected set's state
                            if (wasChecked !== willBeChecked) {
                                packageElem.classList.add(willBeChecked ? 'module-enabled-change' : 'module-disabled-change');
                            }
                        }
                    });

                    // Reset the initial state map to match the newly selected set
                    initialModuleStates.clear();
                    packageList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
                        initialModuleStates.set(checkbox.name, checkbox.checked);
                    });
                }
            });
        }

        // Load Set button click
        const loadSetBtn = html.querySelector('.load-set-button');
        if (loadSetBtn) {
            loadSetBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                
                const setNameSelect = html.querySelector('.load-module-set');
                const setName = setNameSelect ? setNameSelect.value : '';
                if (!setName) return;

                const moduleSets = game.settings.get(this.ID, 'moduleSets');
                const moduleSet = moduleSets[setName];

                // Get the current module configuration first
                const currentConfig = game.settings.get('core', 'moduleConfiguration') || {};
                
                // Update only the modules we know about
                const moduleConfig = {...currentConfig};
                for (let moduleId of game.modules.keys()) {
                    moduleConfig[moduleId] = moduleSet.includes(moduleId);
                }
                await game.settings.set('core', 'moduleConfiguration', moduleConfig);

                // Force a reload to apply changes
                window.location.reload();
            });
        }

        // Delete module set
        const deleteBtn = html.querySelector('.delete-module-set');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                const select = html.querySelector('.load-module-set');
                if (!select) return;
                const setName = select.value;
                if (!setName) return;

                const confirm = await Dialog.confirm({
                    title: game.i18n.localize(`${this.ID}.moduleSet.title`),
                    content: game.i18n.format(`${this.ID}.moduleSet.deleteConfirm`, {name: setName}),
                });

                if (!confirm) return;

                const moduleSets = game.settings.get(this.ID, 'moduleSets');
                delete moduleSets[setName];
                await game.settings.set(this.ID, 'moduleSets', moduleSets);
                
                // Just update our dropdown instead of re-rendering the whole window
                const existingSets = Object.keys(moduleSets);
                select.innerHTML = '<option value="">-- Select a Module Set --</option>';
                existingSets.forEach(set => {
                    const option = document.createElement('option');
                    option.value = set;
                    option.textContent = set;
                    select.appendChild(option);
                });
                select.value = '';
                const loadSetButton = html.querySelector('.load-set-button');
                if (loadSetButton) loadSetButton.style.display = 'none';
            });
        }

        // Export module sets
        const exportBtn = html.querySelector('.export-module-sets');
        if (exportBtn) {
            exportBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                
                const moduleSets = game.settings.get(this.ID, 'moduleSets');
                const exportData = {
                    moduleSets,
                    exportedAt: new Date().toISOString(),
                    foundryVersion: game.version,
                    moduleVersion: game.modules.get(this.ID).version
                };
                
                const now = new Date();
                const date = now.toISOString().split('T')[0];
                const time = `${now.getHours()}-${now.getMinutes()}`;
                const filename = `monarch-${date}-${time}.json`;
                const data = JSON.stringify(exportData, null, 2);
                
                // Use Foundry's built-in saveDataToFile
                saveDataToFile(data, "text/json", filename);
            });
        }

        // Import module sets
        const importBtn = html.querySelector('.import-module-sets');
        if (importBtn) {
            importBtn.addEventListener('click', async (event) => {
                event.preventDefault();

            const content = `
                <form>
                    <h2 style="margin-bottom: 0.5em;">Import Module Sets</h2>
                    <div class="form-group">
                        <label>Import JSON</label>
                        <div class="form-fields">
                            <input type="file" accept=".json" required>
                        </div>
                    </div>
                    <p class="notes">Warning: This will replace your current module sets.</p>
                </form>`;

            const dialog = new Dialog({
                title: "Import Module Sets",
                content: content,
                buttons: {
                    import: {
                        icon: '<i class="fas fa-file-import"></i>',
                        label: "Import",
                        callback: async (html) => {
                            // In v13, Dialog callbacks receive the form element
                            let form = html;
                            if (!(html instanceof HTMLElement)) {
                                form = html?.[0] || html;
                            }
                            if (!(form instanceof HTMLElement)) {
                                form = document.querySelector('form') || html;
                            }
                            const fileInput = form.querySelector('input[type="file"]');
                            if (!fileInput) return;
                            const file = fileInput.files[0];
                            if (!file) return;

                            try {
                                const reader = new FileReader();
                                reader.onload = async (e) => {
                                    const importData = JSON.parse(e.target.result);
                                    const importedSets = importData.moduleSets;

                                    // Analyze differences
                                    const allModules = new Set(game.modules.keys());
                                    const importedModules = new Set();
                                    Object.values(importedSets).forEach(moduleList => {
                                        moduleList.forEach(moduleId => importedModules.add(moduleId));
                                    });

                                    const missingModules = [...importedModules].filter(id => !allModules.has(id));
                                    const extraModules = [...allModules].filter(id => !importedModules.has(id));

                                    // Save the imported sets
                                    await game.settings.set(this.ID, 'moduleSets', importedSets);

                                    // Show analysis dialog
                                    const analysisContent = `
                                        <h3>Import Analysis</h3>
                                        <div class="form-group">
                                            <label>Missing Modules (in sets but not installed):</label>
                                            <div class="missing-modules">
                                                ${missingModules.length ? missingModules.join('<br>') : 'None'}
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label>Extra Modules (installed but not in sets):</label>
                                            <div class="extra-modules">
                                                ${extraModules.length ? extraModules.join('<br>') : 'None'}
                                            </div>
                                        </div>`;

                                    const analysisDialog = new Dialog({
                                        title: "Import Analysis",
                                        content: analysisContent,
                                        buttons: {
                                            save: {
                                                icon: '<i class="fas fa-save"></i>',
                                                label: "Save Analysis",
                                                callback: () => {
                                                    const analysisText = `
Module Sets Import Analysis
Date: ${new Date().toLocaleString()}

Missing Modules (in sets but not installed):
${missingModules.length ? missingModules.join('\n') : 'None'}

Extra Modules (installed but not in sets):
${extraModules.length ? extraModules.join('\n') : 'None'}`;

                                                    const filename = `module-sets-analysis-${new Date().toISOString().split('T')[0]}.txt`;
                                                    saveDataToFile(analysisText, "text/plain", filename);
                                                }
                                            },
                                            close: {
                                                icon: '<i class="fas fa-times"></i>',
                                                label: "Close"
                                            }
                                        },
                                        default: "close"
                                    });
                                    analysisDialog.render(true);

                                    // Update the dropdown
                                    // In v13, find the module management window and look for our controls
                                    const moduleManagerWindow = document.querySelector('#module-management');
                                    const moduleSetSelect = moduleManagerWindow ? moduleManagerWindow.querySelector('.load-module-set') : html.querySelector('.load-module-set');
                                    if (moduleSetSelect) {
                                        const existingSets = Object.keys(importedSets);
                                        moduleSetSelect.innerHTML = '<option value="">-- Select a Module Set --</option>';
                                        existingSets.forEach(set => {
                                            const option = document.createElement('option');
                                            option.value = set;
                                            option.textContent = set;
                                            moduleSetSelect.appendChild(option);
                                        });
                                    }

                                    // Show reload prompt
                                    const reloadDialog = new Dialog({
                                        title: "Reload Required",
                                        content: `<p>Module sets have been imported successfully. The page needs to be reloaded for the changes to take full effect.</p>`,
                                        buttons: {
                                            reload: {
                                                icon: '<i class="fas fa-sync"></i>',
                                                label: "Reload Now",
                                                callback: () => window.location.reload()
                                            },
                                            later: {
                                                icon: '<i class="fas fa-clock"></i>',
                                                label: "Reload Later",
                                                callback: () => ui.notifications.info("Remember to reload when convenient to see imported module sets.")
                                            }
                                        },
                                        default: "reload"
                                    });
                                    reloadDialog.render(true);
                                };
                                reader.readAsText(file);
                            } catch (error) {
                                console.error("COFFEE PUB • MONARCH | Error importing module sets:", error);
                                ui.notifications.error("COFFEE PUB • MONARCH | Failed to import module sets. Check the console for details.");
                            }
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: "import"
            });
            dialog.render(true);
            });
        }
    }
}

Hooks.once('init', () => {
    CoffeePubMonarch.initialize();
});

Hooks.once('ready', async () => {
    await CoffeePubMonarch._initializeDefaultSet();
}); 