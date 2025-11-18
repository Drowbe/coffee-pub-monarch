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
            
            const content = `
                <form>
                    <h2 style="margin-bottom: 0.5em;">Import All Module Settings</h2>
                    <div class="form-group">
                        <label>Import JSON File</label>
                        <div class="form-fields">
                            <input type="file" accept=".json" required>
                        </div>
                    </div>
                    <p class="notes">Warning: This will replace your current module settings. Make sure to backup first!</p>
                </form>`;

            const dialog = new Dialog({
                title: "Import All Module Settings",
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
                                    const importedSettings = importData.allModuleSettings;

                                    if (!importedSettings) {
                                        ui.notifications.error("Invalid import file format. Expected 'allModuleSettings'.");
                                        return;
                                    }

                                    // Analyze what will be imported
                                    const allModules = new Set(game.modules.keys());
                                    const importedModules = new Set(Object.keys(importedSettings));
                                    const missingModules = [...importedModules].filter(id => !allModules.has(id));
                                    const availableModules = [...importedModules].filter(id => allModules.has(id));

                                    // Show preview dialog
                                    const previewContent = `
                                        <h3>Import Preview</h3>
                                        <div class="form-group">
                                            <label>Available Modules (will import settings):</label>
                                            <div class="available-modules" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                                                ${availableModules.length ? availableModules.join('<br>') : 'None'}
                                            </div>
                                        </div>
                                        <div class="form-group">
                                            <label>Missing Modules (settings will be skipped):</label>
                                            <div class="missing-modules" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                                                ${missingModules.length ? missingModules.join('<br>') : 'None'}
                                            </div>
                                        </div>
                                        <p><strong>Total settings to import:</strong> ${availableModules.length} modules</p>`;

                                    const previewDialog = new Dialog({
                                        title: "Import Preview",
                                        content: previewContent,
                                        buttons: {
                                            proceed: {
                                                icon: '<i class="fas fa-file-import"></i>',
                                                label: "Proceed with Import",
                                                callback: async () => {
                                                    try {
                                                        let importedCount = 0;
                                                        let skippedCount = 0;

                                                        // Import settings for available modules
                                                        for (const [moduleId, moduleSettings] of Object.entries(importedSettings)) {
                                                            if (game.modules.has(moduleId)) {
                                                                for (const [settingKey, settingData] of Object.entries(moduleSettings)) {
                                                                    try {
                                                                        // Only import if the setting exists and is world-scoped
                                                                        const existingSetting = game.settings.settings.get(moduleId)?.get(settingKey);
                                                                        if (existingSetting && existingSetting.scope === 'world') {
                                                                            await game.settings.set(moduleId, settingKey, settingData.value);
                                                                            importedCount++;
                                                                        }
                                                                    } catch (error) {
                                                                        console.warn(`COFFEE PUB • MONARCH | Could not import setting ${moduleId}.${settingKey}:`, error);
                                                                        skippedCount++;
                                                                    }
                                                                }
                                                            }
                                                        }

                                                        // Show success dialog
                                                        const successContent = `
                                                            <h3>Import Complete</h3>
                                                            <p><strong>Successfully imported:</strong> ${importedCount} settings</p>
                                                            <p><strong>Skipped:</strong> ${skippedCount} settings</p>
                                                            <p><strong>Modules processed:</strong> ${availableModules.length}</p>
                                                            <p class="notes">Note: Some settings may require a page reload to take effect.</p>`;

                                                        const successDialog = new Dialog({
                                                            title: "Import Complete",
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