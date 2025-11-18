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
                const confirmBtn = html.find('button.yes');
                if (confirmBtn.length) {
                    confirmBtn.on('click', () => {
                        // Use setTimeout to ensure the module states have been updated
                        setTimeout(() => {
                            // Find the module management window
                            const moduleManager = document.querySelector('#module-management');
                            if (!moduleManager) return;
                            
                            // Get our stored event handlers
                            const $html = $(moduleManager);
                            const updateCurrentStateHighlight = $html.data('updateCurrentStateHighlight');
                            const updateButtonVisibility = $html.data('updateButtonVisibility');
                            
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
        html.find('input[type="checkbox"]').each(function() {
            initialModuleStates.set(this.name, this.checked);
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
        
        const moduleSetControls = await renderTemplate(this.TEMPLATES.moduleSetControls, {
            moduleSets,
            currentSet: matchingSet,
            localize: (key) => game.i18n.localize(`${this.ID}.moduleSet.${key}`)
        });
        
        // Insert our controls after the filter input
        const filterInput = html.find('input[name="filter"]');
        if (filterInput.length) {
            $(moduleSetControls).insertAfter(filterInput.parent());
        } else {
            // Fallback: insert at the top of the form
            const form = html.find('form');
            form.prepend(moduleSetControls);
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
        if (searchTarget.find('.monarch-settings-buttons').length > 0) {
            return; // Buttons already exist, skip
        }
        
        // Create our Import/Export buttons
        const importExportButtons = $(`
            <div class="monarch-settings-buttons">
                <button class="monarch-import-settings" type="button">
                    <i class="fas fa-file-import"></i> Import Settings
                </button>
                <button class="monarch-export-settings" type="button">
                    <i class="fas fa-file-export"></i> Export Settings
                </button>
            </div>
        `);
        
        // Find the Reset Defaults button - search in sidebar, html, and app.element
        // The button might be in the sidebar, window footer, or main content
        let resetButton = html.find('button.reset-all');
        if (!resetButton.length && app.element) {
            resetButton = app.element.find('button.reset-all');
        }
        // Also check sidebar specifically
        if (!resetButton.length) {
            const sidebar = html.find('aside.sidebar, .sidebar');
            if (sidebar.length) {
                resetButton = sidebar.find('button.reset-all');
            }
        }
        if (!resetButton.length && app.element) {
            const sidebar = app.element.find('aside.sidebar, .sidebar');
            if (sidebar.length) {
                resetButton = sidebar.find('button.reset-all');
            }
        }
        
        if (resetButton.length) {
            // Insert before the Reset Defaults button
            resetButton.before(importExportButtons);
        } else {
            // Try to find window footer first (preferred location)
            let windowFooter = null;
            if (app.element) {
                windowFooter = app.element.find('.window-footer, footer, .form-footer');
            }
            if (!windowFooter || !windowFooter.length) {
                windowFooter = html.find('.window-footer, footer, .form-footer');
            }
            
            if (windowFooter && windowFooter.length) {
                windowFooter.prepend(importExportButtons);
            } else {
                // Try sidebar as fallback
                let sidebar = html.find('aside.sidebar, .sidebar');
                if (!sidebar.length && app.element) {
                    sidebar = app.element.find('aside.sidebar, .sidebar');
                }
                if (sidebar.length) {
                    sidebar.append(importExportButtons);
                } else {
                    // Last resort: append to the form element
                    let form = html.find('form');
                    if (!form.length && app.element) {
                        form = app.element.find('form');
                    }
                    if (form.length) {
                        form.append(importExportButtons);
                    } else {
                        // Final fallback: append to the window content
                        if (app.element) {
                            app.element.append(importExportButtons);
                        } else {
                            html.append(importExportButtons);
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
        html.off('click', '.monarch-import-settings').on('click', '.monarch-import-settings', async (event) => {
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
                            const fileInput = html.find('input[type="file"]')[0];
                            const file = fileInput.files[0];
                            if (!file) return;

                            // Get checkbox values from the file selection dialog
                            const importWorldSettings = html.find('#importWorldSettings').is(':checked');
                            const importClientSettings = html.find('#importClientSettings').is(':checked');

                            try {
                                const reader = new FileReader();
                                reader.onload = async (e) => {
                                    const importData = JSON.parse(e.target.result);
                                    const importedSettings = importData.allModuleSettings;

                                    if (!importedSettings) {
                                        ui.notifications.error("Invalid import file format. Expected 'allModuleSettings'.");
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
                                            // Add event handlers for Select All/None buttons
                                            html.find('.select-all-modules').click(() => {
                                                html.find('.module-import-checkbox').prop('checked', true);
                                            });
                                            html.find('.select-none-modules').click(() => {
                                                html.find('.module-import-checkbox').prop('checked', false);
                                            });
                                        },
                                        buttons: {
                                            proceed: {
                                                icon: '<i class="fas fa-file-import"></i>',
                                                label: "Proceed with Import",
                                                callback: async (html) => {
                                                    try {
                                                        // Get selected modules from checkboxes
                                                        const selectedModules = new Set();
                                                        html.find('.module-import-checkbox:checked').each(function() {
                                                            selectedModules.add(this.value);
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
        });

        // Export Settings button - use event delegation
        html.off('click', '.monarch-export-settings').on('click', '.monarch-export-settings', async (event) => {
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
        });
    }

    static _onCloseSettingsConfig(app, html) {
        // Clean up event listeners when settings window closes
        if (app.element) {
            app.element.off('click', '.monarch-import-settings');
            app.element.off('click', '.monarch-export-settings');
        }
        if (html) {
            html.off('click', '.monarch-import-settings');
            html.off('click', '.monarch-export-settings');
        }
    }

    static _activateListeners(html, app) {
        // Store initial module states
        const initialModuleStates = new Map();
        html.find('input[type="checkbox"]').each(function() {
            initialModuleStates.set(this.name, this.checked);
        });

        // Function to update current state highlighting
        const updateCurrentStateHighlight = () => {
            html.find('input[type="checkbox"]').each(function() {
                const moduleId = this.name;
                const initialState = initialModuleStates.get(moduleId);
                const currentState = this.checked;
                const packageElem = $(this).closest('.package');
                
                // Remove current change highlight if it exists
                packageElem.removeClass('module-current-change');
                
                // Add highlight if changed from initial state
                if (initialState !== currentState) {
                    packageElem.addClass('module-current-change');
                }
            });
        };

        // Function to check for changes and update button visibility
        const updateButtonVisibility = () => {
            const setName = html.find('.load-module-set').val();
            if (!setName) {
                html.find('.update-module-set').hide();
                return;
            }

            // Get current checked modules from the form
            const currentModules = [];
            html.find('input[type="checkbox"]').each(function() {
                if (this.checked) currentModules.push(this.name);
            });

            // Compare with selected set
            const moduleSets = game.settings.get(this.ID, 'moduleSets');
            const moduleSet = moduleSets[setName];
            const isCurrentState = moduleSet.length === currentModules.length && 
                moduleSet.every(id => currentModules.includes(id)) &&
                currentModules.every(id => moduleSet.includes(id));

            // Show update button if there are changes
            html.find('.update-module-set').toggle(!isCurrentState);
        };

        // Store the highlight update function so we can access it from hooks
        html.closest('#module-management').data('updateCurrentStateHighlight', updateCurrentStateHighlight);
        html.closest('#module-management').data('updateButtonVisibility', updateButtonVisibility);

        // Add change handler to all checkboxes for both update button and highlighting
        const form = html.closest('#module-management');
        form.on('change', 'input[type="checkbox"]', function() {
            updateButtonVisibility();
            updateCurrentStateHighlight();
        });

        // Also trigger when clicking package headers
        form.on('click', '.package-header', function() {
            setTimeout(() => {
                updateButtonVisibility();
                updateCurrentStateHighlight();
            }, 0);
        });

        // Save as New button click
        html.find('.save-new-module-set').click(async (event) => {
            event.preventDefault();
            
            // Capture current module states from the form checkboxes
            const currentModules = [];
            html.find('input[type="checkbox"]').each(function() {
                if (this.checked) currentModules.push(this.name);
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
                            const form = html.find('form')[0];
                            const setName = form.setName.value;
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
                            const form = html.find('form')[0];
                            const setName = form.setName.value;
                            if (!setName) return;

                            // Save the new module set
                            const updatedModuleSets = game.settings.get(this.ID, 'moduleSets');
                            updatedModuleSets[setName] = currentModules;
                            await game.settings.set(this.ID, 'moduleSets', updatedModuleSets);
                            
                            // Update just our dropdown
                            const moduleSetSelect = app.element.find('.load-module-set');
                            const existingSets = Object.keys(updatedModuleSets);
                            moduleSetSelect.empty().append(`<option value="">-- Select a Module Set --</option>`);
                            existingSets.forEach(set => {
                                moduleSetSelect.append(`<option value="${set}">${set}</option>`);
                            });
                            moduleSetSelect.val(setName);
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

        // Update button click
        html.find('.update-module-set').click(async (event) => {
            event.preventDefault();
            
            const setName = html.find('.load-module-set').val();
            if (!setName) return;

            // Capture current module states from the form checkboxes
            const currentModules = [];
            html.find('input[type="checkbox"]').each(function() {
                if (this.checked) currentModules.push(this.name);
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

        // Load module set selection
        html.find('.load-module-set').change(async (event) => {
            const setName = event.target.value;
            const loadButton = html.find('.load-set-button');
            
            if (!setName) {
                loadButton.hide();
                html.find('.update-module-set').hide();
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
            loadButton.toggle(!isCurrentState);
            // Hide update button initially since no changes yet
            html.find('.update-module-set').hide();

            // Get current state before changes
            const originalState = new Map();
            const form = html.closest('#module-management');
            form.find('input[type="checkbox"]').each(function() {
                originalState.set(this.name, this.checked);
            });

            // Update module checkboxes and clear all highlights
            form.find('input[type="checkbox"]').each(function() {
                const moduleId = this.name;
                const wasChecked = originalState.get(moduleId);
                const willBeChecked = moduleSet.includes(moduleId);
                
                // Update checkbox
                this.checked = willBeChecked;
                
                // Clear existing highlights
                const packageElem = $(this).closest('.package');
                packageElem.removeClass('module-enabled-change module-disabled-change module-current-change');
                
                // Add highlight if changed from the selected set's state
                if (wasChecked !== willBeChecked) {
                    packageElem.addClass(willBeChecked ? 'module-enabled-change' : 'module-disabled-change');
                }
            });

            // Reset the initial state map to match the newly selected set
            initialModuleStates.clear();
            form.find('input[type="checkbox"]').each(function() {
                initialModuleStates.set(this.name, this.checked);
            });
        });

        // Load Set button click
        html.find('.load-set-button').click(async (event) => {
            event.preventDefault();
            
            const setName = html.find('.load-module-set').val();
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

        // Delete module set
        html.find('.delete-module-set').click(async (event) => {
            event.preventDefault();
            const select = html.find('.load-module-set');
            const setName = select.val();
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
            select.empty().append(`<option value="">-- Select a Module Set --</option>`);
            existingSets.forEach(set => {
                select.append(`<option value="${set}">${set}</option>`);
            });
            select.val('');
            html.find('.load-set-button').hide();
        });

        // Export module sets
        html.find('.export-module-sets').click(async (event) => {
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

        // Import module sets
        html.find('.import-module-sets').click(async (event) => {
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
                            const fileInput = html.find('input[type="file"]')[0];
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
                                    const moduleSetSelect = html.closest('#module-management').find('.load-module-set');
                                    const existingSets = Object.keys(importedSets);
                                    moduleSetSelect.empty().append(`<option value="">-- Select a Module Set --</option>`);
                                    existingSets.forEach(set => {
                                        moduleSetSelect.append(`<option value="${set}">${set}</option>`);
                                    });

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

Hooks.once('init', () => {
    CoffeePubMonarch.initialize();
});

Hooks.once('ready', async () => {
    await CoffeePubMonarch._initializeDefaultSet();
}); 