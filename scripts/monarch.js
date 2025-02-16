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
        console.warn("COFFEE-PUB-MONARCH | Current moduleSets:", game.settings.get(this.ID, 'moduleSets'));
        
        const moduleSets = game.settings.get(this.ID, 'moduleSets');
        if (Object.keys(moduleSets).length === 0) {
            // Create a default set with currently active modules
            const activeModules = game.modules.filter(m => m.active).map(m => m.id);
            console.warn("COFFEE-PUB-MONARCH | Active modules for default set:", activeModules);
            
            moduleSets['Default Configuration'] = activeModules;
            await game.settings.set(this.ID, 'moduleSets', moduleSets);
            console.warn("COFFEE-PUB-MONARCH | Initialized moduleSets:", moduleSets);
        }
    }

    static async _onRenderModuleManagement(app, html, data) {
        // Add our controls to the module management window
        const moduleSets = game.settings.get(this.ID, 'moduleSets');
        console.warn("COFFEE-PUB-MONARCH | Rendering with moduleSets:", moduleSets);
        
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
            
            // Capture current module states
            const currentModules = [];
            const moduleConfig = game.settings.get('core', 'moduleConfiguration') || {};
            for (let [moduleId, isActive] of Object.entries(moduleConfig)) {
                if (isActive) currentModules.push(moduleId);
            }
            
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
                                console.error("COFFEE-PUB-MONARCH | Error saving module set:", error);
                                ui.notifications.error("Failed to save module set. Check the console for details.");
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

            // Capture current module states
            const currentModules = [];
            const moduleConfig = game.settings.get('core', 'moduleConfiguration') || {};
            for (let [moduleId, isActive] of Object.entries(moduleConfig)) {
                if (isActive) currentModules.push(moduleId);
            }

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
                                console.error("COFFEE-PUB-MONARCH | Error updating module set:", error);
                                ui.notifications.error("Failed to update module set. Check the console for details.");
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
    }
}

Hooks.once('init', () => {
    CoffeePubMonarch.initialize();
});

Hooks.once('ready', async () => {
    await CoffeePubMonarch._initializeDefaultSet();
}); 