# Coffee Pub Monarch - FoundryVTT v13 Migration Plan

> **Migration Date:** TBD  
> **Target Version:** FoundryVTT v13  
> **Module Version:** 13.0.0 (already set in module.json)

---

## Executive Summary

This module requires migration from jQuery-based DOM manipulation to native DOM APIs for FoundryVTT v13 compatibility. The module.json already indicates v13 compatibility, but the codebase still uses jQuery extensively.

**Key Migration Areas:**
1. **jQuery Removal** - Replace all jQuery selectors and methods with native DOM APIs
2. **Hook Parameter Changes** - Update hooks that receive `html` parameter (now native HTMLElement)
3. **Event Handler Updates** - Convert jQuery event handlers to native addEventListener
4. **DOM Manipulation** - Replace jQuery DOM methods with native equivalents

**Files Requiring Migration:**
- `scripts/monarch.js` (primary file, ~209 jQuery usages)
- `scripts/search-and-replace.js` (Application class with jQuery)
- `scripts/replace-name.js` (macro script with jQuery)

**Files NOT Requiring Changes:**
- `scripts/const.js` (no jQuery usage)
- `templates/monarch-controls.hbs` (Handlebars template, no changes needed)
- `module.json` (already configured for v13)

---

## Pre-Migration Status

### ✅ Completed
- [x] Module version set to 13.0.0
- [x] Compatibility block set to v13 minimum/verified/maximum
- [x] Migration guide reviewed

### ✅ Completed
- [x] jQuery usage removed
- [x] Hook parameters updated for native DOM
- [x] Event handlers converted
- [x] Testing in v13 environment (ongoing)

---

## Detailed Migration Tasks

### Phase 1: Code Audit & Documentation

#### Task 1.1: Document Current jQuery Usage
**File:** `scripts/monarch.js`
- **Lines 45-47:** `html.find()`, `.length`, `.on()` in `renderDialog` hook
- **Lines 55-56:** `$()` wrapper, `.data()` storage
- **Lines 91-93:** `html.find()`, `.each()` for initial state capture
- **Lines 116-123:** `html.find()`, `.length`, `$()`, `.insertAfter()`, `.prepend()`
- **Lines 143-220:** Extensive jQuery usage in `_onRenderPackageConfiguration`:
  - `.find()`, `.length`, `$()` for button creation
  - `.find()`, `.before()`, `.prepend()`, `.append()` for DOM insertion
- **Lines 230-632:** jQuery event handlers (`.off()`, `.on()`, `.find()`, `.is()`, `.prop()`, `.click()`, `.each()`)
- **Lines 713-718:** Event cleanup with `.off()`
- **Lines 722-1208:** Extensive jQuery in `_activateListeners`:
  - `.find()`, `.each()`, `.closest()`, `.val()`, `.hide()`, `.show()`, `.toggle()`
  - `.addClass()`, `.removeClass()`, `.data()`, `.on()`, `.change()`, `.click()`
  - `.empty()`, `.append()`, `.val()` for select manipulation

**File:** `scripts/search-and-replace.js`
- **Lines 33-50:** `html.find()`, `.on()`, `.val()`, `.prop()`, `.html()`
- **Lines 80-84:** `html.find()`, `.val()`, array access
- **Lines 91-93:** `html.find()`, array access, `.checked`
- **Lines 111-116:** `html.find()`, array access, `.checked`
- **Line 470:** `$()` for HTML string creation

**File:** `scripts/replace-name.js`
- **Lines 61, 90-103:** `html.find()`, `.val()` in Dialog callbacks
- **Lines 120-129, 281-290:** `$()`, `.each()`, `.css()` for window finding

---

### Phase 2: Core Migration - `scripts/monarch.js`

#### Task 2.1: Update Hook Parameters
**Affected Hooks:**
- `renderModuleManagement` (line 84)
- `renderSettingsConfig` / `renderExtendedSettingsConfig` (line 129)
- `renderDialog` (line 42)
- `closeSettingsConfig` / `closeExtendedSettingsConfig` (line 710)

**Changes Required:**
- Remove all `html.find()` calls → use `html.querySelector()` or `html.querySelectorAll()`
- Remove all `$()` wrappers → elements are already DOM elements
- Update `.length` checks (NodeList has `.length`, but check differently)

#### Task 2.2: Replace jQuery Selectors
**Pattern:** `html.find(selector)` → `html.querySelectorAll(selector)` or `html.querySelector(selector)`

**Specific Replacements:**
```javascript
// BEFORE (v12)
html.find('input[type="checkbox"]')
html.find('.load-module-set')
html.find('button.reset-all')

// AFTER (v13)
html.querySelectorAll('input[type="checkbox"]')
html.querySelector('.load-module-set')
html.querySelector('button.reset-all')
```

#### Task 2.3: Replace jQuery Iteration
**Pattern:** `.each((i, el) => {...})` → `.forEach((el, i) => {...})`

**Specific Replacements:**
```javascript
// BEFORE (v12)
html.find('input[type="checkbox"]').each(function() {
    initialModuleStates.set(this.name, this.checked);
});

// AFTER (v13)
html.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    initialModuleStates.set(checkbox.name, checkbox.checked);
});
```

#### Task 2.4: Replace DOM Manipulation
**Patterns:**
- `.append()` → `.appendChild()` or `.insertAdjacentHTML('beforeend', ...)`
- `.prepend()` → `.insertAdjacentHTML('afterbegin', ...)` or `.insertBefore()`
- `.before()` → `.insertAdjacentHTML('beforebegin', ...)` or `.insertAdjacentElement()`
- `.after()` → `.insertAdjacentHTML('afterend', ...)` or `.insertAdjacentElement()`
- `.insertAfter()` → Use `parent.insertBefore(newElement, target.nextSibling)`

**Specific Replacements:**
```javascript
// BEFORE (v12)
$(moduleSetControls).insertAfter(filterInput.parent());
form.prepend(moduleSetControls);
resetButton.before(importExportButtons);
html.append(importExportButtons);

// AFTER (v13)
const parent = filterInput.parentElement;
parent.insertBefore(moduleSetControls, filterInput.nextSibling);
form.insertBefore(moduleSetControls, form.firstChild);
resetButton.insertAdjacentElement('beforebegin', importExportButtons);
html.appendChild(importExportButtons);
```

#### Task 2.5: Replace Event Handlers
**Pattern:** `.on(event, handler)` → `.addEventListener(event, handler)`

**Specific Replacements:**
```javascript
// BEFORE (v12)
html.off('click', '.monarch-import-settings').on('click', '.monarch-import-settings', async (event) => {
    // handler
});

// AFTER (v13)
// Remove old listeners first (store references)
const importButtons = html.querySelectorAll('.monarch-import-settings');
importButtons.forEach(button => {
    button.removeEventListener('click', existingHandler);
    button.addEventListener('click', async (event) => {
        // handler
    });
});
```

**Note:** For event delegation, use native event delegation:
```javascript
// BEFORE (v12)
form.on('change', 'input[type="checkbox"]', function() {
    // handler
});

// AFTER (v13)
form.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"]')) {
        // handler
    }
});
```

#### Task 2.6: Replace Attribute/Property Access
**Patterns:**
- `.val()` → `.value`
- `.prop('checked')` → `.checked`
- `.is(':checked')` → `.checked`
- `.attr(name, value)` → `.setAttribute(name, value)`
- `.attr(name)` → `.getAttribute(name)`
- `.addClass(name)` → `.classList.add(name)`
- `.removeClass(name)` → `.classList.remove(name)`
- `.toggleClass(name)` → `.classList.toggle(name)`
- `.hide()` → `.style.display = 'none'` or `.classList.add('hidden')`
- `.show()` → `.style.display = ''` or `.classList.remove('hidden')`
- `.toggle(condition)` → Conditional display manipulation

**Specific Replacements:**
```javascript
// BEFORE (v12)
const setName = html.find('.load-module-set').val();
const isChecked = html.find('#importWorldSettings').is(':checked');
html.find('.update-module-set').hide();
packageElem.addClass('module-current-change');

// AFTER (v13)
const setName = html.querySelector('.load-module-set')?.value || '';
const isChecked = html.querySelector('#importWorldSettings')?.checked || false;
const updateBtn = html.querySelector('.update-module-set');
if (updateBtn) updateBtn.style.display = 'none';
packageElem.classList.add('module-current-change');
```

#### Task 2.7: Replace Data Storage
**Pattern:** `.data(key, value)` → Use `element.dataset` or Map storage

**Specific Replacements:**
```javascript
// BEFORE (v12)
const $html = $(moduleManager);
$html.data('updateCurrentStateHighlight', updateCurrentStateHighlight);
const updateCurrentStateHighlight = $html.data('updateCurrentStateHighlight');

// AFTER (v13)
// Option 1: Use dataset (for simple values)
moduleManager.dataset.updateCurrentStateHighlight = 'stored'; // Not ideal for functions

// Option 2: Use WeakMap (recommended for functions)
const handlerStorage = new WeakMap();
handlerStorage.set(moduleManager, { updateCurrentStateHighlight, updateButtonVisibility });
const handlers = handlerStorage.get(moduleManager);
if (handlers?.updateCurrentStateHighlight) handlers.updateCurrentStateHighlight();
```

#### Task 2.8: Replace Select Element Manipulation
**Pattern:** `.empty()`, `.append()`, `.val()` → Native select manipulation

**Specific Replacements:**
```javascript
// BEFORE (v12)
moduleSetSelect.empty().append(`<option value="">-- Select a Module Set --</option>`);
existingSets.forEach(set => {
    moduleSetSelect.append(`<option value="${set}">${set}</option>`);
});
moduleSetSelect.val(setName);

// AFTER (v13)
moduleSetSelect.innerHTML = '<option value="">-- Select a Module Set --</option>';
existingSets.forEach(set => {
    const option = document.createElement('option');
    option.value = set;
    option.textContent = set;
    moduleSetSelect.appendChild(option);
});
moduleSetSelect.value = setName;
```

#### Task 2.9: Fix HTML String Creation
**Pattern:** `$()` for HTML strings → `document.createElement()` or template strings

**Specific Replacements:**
```javascript
// BEFORE (v12)
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

// AFTER (v13)
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
importExportButtons.appendChild(importBtn);
importExportButtons.appendChild(exportBtn);

// OR use insertAdjacentHTML if you prefer:
const container = document.createElement('div');
container.insertAdjacentHTML('beforeend', `
    <div class="monarch-settings-buttons">
        <button class="monarch-import-settings" type="button">
            <i class="fas fa-file-import"></i> Import Settings
        </button>
        <button class="monarch-export-settings" type="button">
            <i class="fas fa-file-export"></i> Export Settings
        </button>
    </div>
`);
const importExportButtons = container.firstElementChild;
```

---

### Phase 3: Application Class Migration - `scripts/search-and-replace.js`

#### Task 3.1: Update `activateListeners` Method
**Changes Required:**
- Replace all `html.find()` with `html.querySelector()` or `html.querySelectorAll()`
- Replace `.on()` with `.addEventListener()`
- Replace `.val()`, `.prop()`, `.html()` with native equivalents

**Specific Replacements:**
```javascript
// BEFORE (v12)
html.find("button[name='clearFields']").on("click", () => {
    html.find('[name="oldPath"]').val("");
    html.find('#report-area').html('<p>...</p>');
});

// AFTER (v13)
const clearBtn = html.querySelector("button[name='clearFields']");
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        const oldPathInput = html.querySelector('[name="oldPath"]');
        if (oldPathInput) oldPathInput.value = "";
        const reportArea = html.querySelector('#report-area');
        if (reportArea) reportArea.innerHTML = '<p>...</p>';
    });
}
```

#### Task 3.2: Update `_renderInner` Method
**Changes Required:**
- Replace `$()` HTML string creation with native DOM creation or `insertAdjacentHTML`

**Specific Replacements:**
```javascript
// BEFORE (v12)
return $(
    `<style>...</style>
     <div class="text-replacer-flex">...</div>`
);

// AFTER (v13)
const container = document.createElement('div');
container.insertAdjacentHTML('beforeend', `
    <style>...</style>
    <div class="text-replacer-flex">...</div>
`);
return container;
```

---

### Phase 4: Macro Script Migration - `scripts/replace-name.js`

#### Task 4.1: Update Dialog Callbacks
**Changes Required:**
- Replace `html.find()` with `html.querySelector()`
- Replace `.val()` with `.value`

**Specific Replacements:**
```javascript
// BEFORE (v12)
callback: async (html) => {
    let charUuid = html.find('select#characters').val();
    let oldName1 = html.find('input#oldName').val();
}

// AFTER (v13)
callback: async (html) => {
    const charSelect = html.querySelector('select#characters');
    let charUuid = charSelect ? charSelect.value : '';
    const oldNameInput = html.querySelector('input#oldName');
    let oldName1 = oldNameInput ? oldNameInput.value : '';
}
```

#### Task 4.2: Replace Window Finding Logic
**Changes Required:**
- Replace `$()` selectors with `document.querySelectorAll()`
- Replace `.each()` with `.forEach()`
- Replace `.css('z-index')` with `.style.zIndex` or `getComputedStyle()`

**Specific Replacements:**
```javascript
// BEFORE (v12)
const openWindows = $('.app.window-app.sheet.actor.npc');
let best;
let maxz;
openWindows.each(function() {
    let z = parseInt($(this).css('z-index'), 10);
    if (!best || maxz < z) {
        best = this;
        maxz = z;
    }
});

// AFTER (v13)
const openWindows = document.querySelectorAll('.app.window-app.sheet.actor.npc');
let best;
let maxz;
openWindows.forEach((window) => {
    const z = parseInt(getComputedStyle(window).zIndex, 10) || 0;
    if (!best || maxz < z) {
        best = window;
        maxz = z;
    }
});
```

---

### Phase 5: Testing & Validation

#### Task 5.1: Critical Path Testing
- [ ] Module loads without console errors
- [ ] Module management window renders correctly
- [ ] Settings window renders correctly
- [ ] All hooks that receive `html` parameter work correctly
- [ ] No deprecation warnings in console

#### Task 5.2: Functionality Testing
- [ ] Module set controls appear and function
- [ ] Load module set button works
- [ ] Save as new module set works
- [ ] Update module set works
- [ ] Delete module set works
- [ ] Export/Import module sets works
- [ ] Import/Export settings buttons work
- [ ] All event handlers fire correctly
- [ ] DOM manipulation works as expected
- [ ] Forms submit correctly
- [ ] Dialogs open and close correctly

#### Task 5.3: Edge Case Testing
- [ ] Test with empty module sets
- [ ] Test with large numbers of modules
- [ ] Test error handling
- [ ] Test with different user permissions (GM vs Player)
- [ ] Test module dependency dialog integration

#### Task 5.4: Integration Testing
- [ ] Test with other v13-compatible modules
- [ ] Test with popular module combinations
- [ ] Verify no conflicts with other modules
- [ ] Test performance (no regressions)

---

## Migration Checklist

### Pre-Migration
- [x] Review migration guide
- [x] Document current jQuery usage
- [ ] Set up FoundryVTT v13 testing environment
- [ ] Create feature branch: `v13-migration`

### Phase 1: Code Audit
- [x] Complete jQuery usage audit
- [x] Document all affected hooks
- [x] Document all event handlers
- [x] Create test cases for each feature

### Phase 2: Core Migration (monarch.js)
- [x] Update `renderModuleManagement` hook
- [x] Update `renderSettingsConfig` / `renderExtendedSettingsConfig` hooks
- [x] Update `renderDialog` hook
- [x] Update `closeSettingsConfig` hooks
- [x] Replace all jQuery selectors
- [x] Replace all jQuery iteration
- [x] Replace all DOM manipulation
- [x] Replace all event handlers
- [x] Replace all attribute/property access
- [x] Replace data storage (using WeakMap)
- [x] Replace select element manipulation
- [x] Fix HTML string creation
- [x] Fix Dialog callback `html` parameter handling
- [x] Fix Dialog `render` hook `html` parameter handling
- [x] Fix v13 DOM structure changes (search element, no form element)
- [x] Fix form data access in Dialog callbacks

### Phase 3: Application Migration (search-and-replace.js)
- [x] Update `activateListeners` method
- [x] Update `_renderInner` method
- [x] Replace all jQuery usage in helper methods

### Phase 4: Macro Migration (replace-name.js)
- [x] Update Dialog callbacks
- [x] Replace window finding logic
- [x] Replace all jQuery usage

### Phase 5: Testing
- [x] Critical path testing (module management window, settings window)
- [x] Functionality testing (save/load module sets, import/export)
- [ ] Edge case testing (ongoing)
- [ ] Integration testing (ongoing)
- [ ] Performance testing

### Post-Migration
- [ ] Update CHANGELOG.md
- [ ] Update README.md if needed
- [ ] Create release notes
- [ ] Tag and release v13.0.0

---

## Migration Progress Summary

**Status:** ✅ **Core Migration Complete** - Module is functional in FoundryVTT v13

### Completed Work

1. **Phase 1: Code Audit** ✅
   - Documented all jQuery usage across all files
   - Created comprehensive migration plan

2. **Phase 2: Core Migration (monarch.js)** ✅
   - Removed all jQuery usage (~220+ instances)
   - Updated all hooks to use native DOM APIs
   - Fixed v13 DOM structure changes:
     - Module management window structure (search element, no form)
     - Dialog callback parameter handling
     - Dialog render hook parameter handling
   - Replaced jQuery event handlers with native addEventListener
   - Replaced jQuery data storage with WeakMap
   - Fixed form data access in Dialog callbacks

3. **Phase 3: Application Migration (search-and-replace.js)** ✅
   - Removed all jQuery usage
   - Converted to native DOM APIs

4. **Phase 4: Macro Migration (replace-name.js)** ✅
   - Removed all jQuery usage
   - Converted to native DOM APIs

5. **Phase 5: Testing** 🔄 (In Progress)
   - ✅ Module loads without errors
   - ✅ Module management window renders correctly
   - ✅ Settings window renders correctly
   - ✅ Save new module set works
   - ✅ Load module set works
   - ✅ Import/Export module sets works
   - ✅ Import/Export settings works
   - ⏳ Edge case testing (ongoing)
   - ⏳ Integration testing (ongoing)

### Issues Found and Fixed During Testing

1. **Module Management Window Not Showing Controls**
   - **Issue:** v13 changed DOM structure (search element instead of filter input, no form element)
   - **Fix:** Updated selectors to use `search.flexrow` and proper insertion points

2. **Dialog Callback Errors**
   - **Issue:** `html.querySelector is not a function` in Dialog callbacks
   - **Fix:** Added safety checks to handle different `html` parameter types

3. **Dialog Render Hook Errors**
   - **Issue:** `html.querySelector is not a function` in Dialog render hooks
   - **Fix:** Added safety checks and proper element unwrapping

4. **Import File Format Confusion**
   - **Issue:** Users trying to import module sets into settings import
   - **Fix:** Added better error messages detecting wrong file types

5. **Save New Module Set Not Working**
   - **Issue:** Form data access using `form.setName.value` doesn't work in v13
   - **Fix:** Changed to use `querySelector('input[name="setName"]').value`

### Remaining Work

1. **Testing** (Ongoing)
   - Edge case testing (empty sets, large numbers of modules, error handling)
   - Integration testing with other v13 modules
   - Performance testing

2. **Documentation**
   - Update CHANGELOG.md with v13 migration notes
   - Update README.md if needed
   - Create release notes for v13.0.0

3. **Release**
   - Tag and release v13.0.0

---

## Common Patterns Reference

### Selector Replacement
| jQuery (v12) | Native DOM (v13) |
|--------------|------------------|
| `html.find(selector)` | `html.querySelectorAll(selector)` or `html.querySelector(selector)` |
| `html.find(selector).first()` | `html.querySelector(selector)` |
| `html.find(selector)[0]` | `html.querySelector(selector)` |

### Iteration Replacement
| jQuery (v12) | Native DOM (v13) |
|--------------|------------------|
| `.each((i, el) => {...})` | `.forEach((el, i) => {...})` |
| `.each(function() { this... })` | `.forEach((el) => { el... })` |

### DOM Manipulation Replacement
| jQuery (v12) | Native DOM (v13) |
|--------------|------------------|
| `.append(content)` | `.appendChild(element)` or `.insertAdjacentHTML('beforeend', content)` |
| `.prepend(content)` | `.insertBefore(element, parent.firstChild)` or `.insertAdjacentHTML('afterbegin', content)` |
| `.before(content)` | `.insertAdjacentElement('beforebegin', element)` or `.insertAdjacentHTML('beforebegin', content)` |
| `.after(content)` | `.insertAdjacentElement('afterend', element)` or `.insertAdjacentHTML('afterend', content)` |
| `.insertAfter(target)` | `target.parentElement.insertBefore(newElement, target.nextSibling)` |
| `.remove()` | `.remove()` (same) |

### Property Access Replacement
| jQuery (v12) | Native DOM (v13) |
|--------------|------------------|
| `.val()` | `.value` |
| `.val(newValue)` | `.value = newValue` |
| `.prop('checked')` | `.checked` |
| `.prop('checked', true)` | `.checked = true` |
| `.is(':checked')` | `.checked` |
| `.attr(name, value)` | `.setAttribute(name, value)` |
| `.attr(name)` | `.getAttribute(name)` |
| `.addClass(name)` | `.classList.add(name)` |
| `.removeClass(name)` | `.classList.remove(name)` |
| `.toggleClass(name)` | `.classList.toggle(name)` |
| `.hide()` | `.style.display = 'none'` or `.classList.add('hidden')` |
| `.show()` | `.style.display = ''` or `.classList.remove('hidden')` |
| `.toggle(condition)` | Conditional display manipulation |
| `.text()` | `.textContent` |
| `.html()` | `.innerHTML` |
| `.html(newHtml)` | `.innerHTML = newHtml` |
| `.empty()` | `.innerHTML = ''` |

### Event Handler Replacement
| jQuery (v12) | Native DOM (v13) |
|--------------|------------------|
| `.on(event, handler)` | `.addEventListener(event, handler)` |
| `.on(event, selector, handler)` | Event delegation: `.addEventListener(event, (e) => { if (e.target.matches(selector)) handler(e); })` |
| `.off(event, handler)` | `.removeEventListener(event, handler)` |
| `.click(handler)` | `.addEventListener('click', handler)` |
| `.change(handler)` | `.addEventListener('change', handler)` |

### Traversal Replacement
| jQuery (v12) | Native DOM (v13) |
|--------------|------------------|
| `.closest(selector)` | `.closest(selector)` (same) |
| `.parent()` | `.parentElement` |
| `.find(selector)` | `.querySelectorAll(selector)` or `.querySelector(selector)` |

---

## Risk Assessment

### High Risk Areas
1. **Event Handler Cleanup** - Need to store references for `removeEventListener`
2. **Event Delegation** - More complex with native APIs
3. **Data Storage** - `.data()` replacement requires careful design
4. **Select Element Manipulation** - Multiple operations need coordination

### Medium Risk Areas
1. **DOM Insertion** - Different methods for different insertion points
2. **HTML String Creation** - More verbose with native APIs
3. **Window Finding Logic** - CSS property access changes

### Low Risk Areas
1. **Simple Selectors** - Direct replacements
2. **Property Access** - Straightforward conversions
3. **Class Manipulation** - Direct classList usage

---

## Estimated Timeline

- **Phase 1 (Audit):** 2-4 hours
- **Phase 2 (monarch.js):** 8-12 hours
- **Phase 3 (search-and-replace.js):** 2-3 hours
- **Phase 4 (replace-name.js):** 1-2 hours
- **Phase 5 (Testing):** 4-6 hours

**Total Estimated Time:** 17-27 hours

---

## Notes & Considerations

1. **Event Handler Storage:** Consider using WeakMap for storing handler references to avoid memory leaks
2. **Null Safety:** Add null checks when using `querySelector` (returns null if not found)
3. **NodeList vs Array:** `querySelectorAll` returns NodeList, not Array (but has `.length` and `.forEach`)
4. **Template Strings:** Consider using template literals with `insertAdjacentHTML` for complex HTML
5. **Performance:** Native DOM APIs are generally faster than jQuery
6. **Readability:** Some operations may be more verbose but more explicit

---

## Resources

- [Migration Guide](../Documentation/migration-global.md)
- [FoundryVTT v13 API Documentation](https://foundryvtt.com/api/)
- [MDN DOM API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)

---

**Last Updated:** 2025-01-XX  
**Status:** Planning Phase  
**Next Steps:** Begin Phase 1 - Code Audit

