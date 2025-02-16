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
        // Save current module set
        html.find('.save-module-set').click(async (event) => {
            event.preventDefault();
            
            // Capture current module states before opening dialog
            const currentModules = [];
            const moduleConfig = game.settings.get('core', 'moduleConfiguration') || {};
            for (let [moduleId, isActive] of Object.entries(moduleConfig)) {
                if (isActive) currentModules.push(moduleId);
            }
            
            // Get current module sets for the dropdown
            const moduleSets = game.settings.get(this.ID, 'moduleSets');
            const existingSets = Object.keys(moduleSets);
            
            const content = `
                <form>
                    <div class="form-group">
                        <label>${game.i18n.localize(`${this.ID}.moduleSet.savePrompt`)}</label>
                        <div class="form-fields">
                            <input type="text" name="setName" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Or Update Existing:</label>
                        <div class="form-fields">
                            <select name="existingSet">
                                <option value="">Create New Set</option>
                                ${existingSets.map(set => `<option value="${set}">${set}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </form>`;

            const dialog = new Dialog({
                title: game.i18n.localize(`${this.ID}.moduleSet.title`),
                content: content,
                buttons: {
                    saveAndApply: {
                        icon: '<i class="fas fa-save"></i>',
                        label: "Save and Apply",
                        callback: async (html) => {
                            const form = html.find('form')[0];
                            const setName = form.existingSet.value || form.setName.value;
                            if (!setName) return;

                            try {
                                // First save the module set
                                const updatedModuleSets = game.settings.get(this.ID, 'moduleSets');
                                updatedModuleSets[setName] = currentModules;
                                await game.settings.set(this.ID, 'moduleSets', updatedModuleSets);
                                
                                // Then update the active modules in core settings
                                const moduleConfig = {};
                                for (let moduleId of game.modules.keys()) {
                                    moduleConfig[moduleId] = currentModules.includes(moduleId);
                                }
                                await game.settings.set('core', 'moduleConfiguration', moduleConfig);

                                // Force a reload to apply changes
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
                            const setName = form.existingSet.value || form.setName.value;
                            if (!setName) return;

                            // Use the captured module states
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
                            app.element.find('.load-set-button').show();
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

        // Load module set selection
        html.find('.load-module-set').change(async (event) => {
            const setName = event.target.value;
            const loadButton = html.find('.load-set-button');
            
            if (!setName) {
                loadButton.hide();
                return;
            }

            const moduleSets = game.settings.get(this.ID, 'moduleSets');
            const moduleSet = moduleSets[setName];

            // Get current state before changes
            const originalState = new Map();
            const form = html.closest('#module-management');
            form.find('input[type="checkbox"]').each(function() {
                originalState.set(this.name, this.checked);
            });

            // Update module checkboxes
            form.find('input[type="checkbox"]').each(function() {
                const moduleId = this.name;
                const wasChecked = originalState.get(moduleId);
                const willBeChecked = moduleSet.includes(moduleId);
                
                // Update checkbox
                this.checked = willBeChecked;
                
                // Clear existing highlights
                const packageElem = $(this).closest('.package');
                packageElem.removeClass('module-enabled-change module-disabled-change');
                
                // Add highlight if changed
                if (wasChecked !== willBeChecked) {
                    packageElem.addClass(willBeChecked ? 'module-enabled-change' : 'module-disabled-change');
                }
            });

            // Show the load button
            loadButton.show();
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