# Phase 1: Code Audit & Documentation

> **Date:** 2025-01-XX  
> **Status:** In Progress  
> **Purpose:** Comprehensive audit of jQuery usage and migration requirements

---

## Table of Contents

1. [File-by-File jQuery Usage](#file-by-file-jquery-usage)
2. [Hook Documentation](#hook-documentation)
3. [Event Handler Documentation](#event-handler-documentation)
4. [Test Cases](#test-cases)

---

## File-by-File jQuery Usage

### `scripts/monarch.js`

#### Hook: `renderDialog` (Lines 42-66)
**Location:** `initialize()` method  
**Purpose:** Handle module dependency dialog confirmation

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 45 | `html.find('button.yes')` | Find confirm button | ✅ `html.querySelector('button.yes')` |
| 46 | `.length` | Check if button exists | ✅ Check for `null` instead |
| 47 | `.on('click', ...)` | Bind click handler | ✅ `addEventListener('click', ...)` |
| 55 | `$(moduleManager)` | Wrap element in jQuery | ✅ Remove wrapper, use directly |
| 56 | `.data('updateCurrentStateHighlight')` | Get stored function | ✅ Use WeakMap or dataset |
| 57 | `.data('updateButtonVisibility')` | Get stored function | ✅ Use WeakMap or dataset |

**Migration Notes:**
- `html` parameter is now native HTMLElement in v13
- Need to store handler references differently (WeakMap recommended)
- Event handler needs to be stored for cleanup

---

#### Method: `_onRenderModuleManagement` (Lines 84-127)
**Hook:** `renderModuleManagement`  
**Parameters:** `(app, html, data)` - `html` is now native HTMLElement

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 91 | `html.find('input[type="checkbox"]')` | Find all checkboxes | ✅ `html.querySelectorAll('input[type="checkbox"]')` |
| 91 | `.each(function() {...})` | Iterate over checkboxes | ✅ `.forEach((checkbox) => {...})` |
| 92 | `this.name`, `this.checked` | Access properties | ✅ `checkbox.name`, `checkbox.checked` |
| 116 | `html.find('input[name="filter"]')` | Find filter input | ✅ `html.querySelector('input[name="filter"]')` |
| 117 | `.length` | Check if exists | ✅ Check for `null` |
| 118 | `$(moduleSetControls)` | Wrap template result | ✅ Use directly (already DOM element) |
| 118 | `.insertAfter(filterInput.parent())` | Insert after filter | ✅ Use `insertBefore` with `nextSibling` |
| 121 | `html.find('form')` | Find form element | ✅ `html.querySelector('form')` |
| 122 | `.prepend(moduleSetControls)` | Prepend to form | ✅ `form.insertBefore(moduleSetControls, form.firstChild)` |

**Migration Notes:**
- Template rendering returns native DOM element, no need for `$()` wrapper
- `insertAfter` needs to be converted to `insertBefore` with `nextSibling`
- All `.find()` calls need conversion
- `.each()` with `this` context needs to use explicit parameter

---

#### Method: `_onRenderPackageConfiguration` (Lines 129-225)
**Hooks:** `renderSettingsConfig`, `renderExtendedSettingsConfig`  
**Parameters:** `(app, html, data)` - `html` is now native HTMLElement

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 142 | `app.element` or `html` | Get search target | ✅ Already native, but check for null |
| 143 | `searchTarget.find('.monarch-settings-buttons')` | Check if buttons exist | ✅ `searchTarget.querySelector('.monarch-settings-buttons')` |
| 143 | `.length > 0` | Check existence | ✅ Check for `null` |
| 148 | `$(\`...\`)` | Create button elements | ✅ `document.createElement()` or `insertAdjacentHTML` |
| 161 | `html.find('button.reset-all')` | Find reset button | ✅ `html.querySelector('button.reset-all')` |
| 162 | `!resetButton.length` | Check if not found | ✅ Check for `null` |
| 163 | `app.element.find('button.reset-all')` | Find in app.element | ✅ `app.element?.querySelector('button.reset-all')` |
| 167 | `html.find('aside.sidebar, .sidebar')` | Find sidebar | ✅ `html.querySelector('aside.sidebar, .sidebar')` |
| 168 | `sidebar.length` | Check existence | ✅ Check for `null` |
| 169 | `sidebar.find('button.reset-all')` | Find button in sidebar | ✅ `sidebar.querySelector('button.reset-all')` |
| 172-175 | Similar patterns | Multiple find operations | ✅ All need conversion |
| 179 | `resetButton.length` | Check existence | ✅ Check for `null` |
| 181 | `resetButton.before(importExportButtons)` | Insert before | ✅ `resetButton.insertAdjacentElement('beforebegin', importExportButtons)` |
| 186 | `app.element.find('.window-footer, footer, .form-footer')` | Find footer | ✅ `app.element?.querySelector('.window-footer, footer, .form-footer')` |
| 188 | `!windowFooter || !windowFooter.length` | Check existence | ✅ Check for `null` |
| 189 | `html.find('.window-footer, footer, .form-footer')` | Find footer in html | ✅ `html.querySelector('.window-footer, footer, .form-footer')` |
| 192 | `windowFooter && windowFooter.length` | Check existence | ✅ Check for `null` |
| 193 | `windowFooter.prepend(importExportButtons)` | Prepend to footer | ✅ `windowFooter.insertBefore(importExportButtons, windowFooter.firstChild)` |
| 196-201 | Similar patterns | Multiple find/append operations | ✅ All need conversion |
| 204-209 | Similar patterns | Form find/append | ✅ All need conversion |
| 212-215 | Similar patterns | Final fallback append | ✅ All need conversion |

**Migration Notes:**
- Extensive use of jQuery for DOM traversal and insertion
- Multiple fallback locations for button insertion
- Need to handle null checks properly
- HTML string creation with `$()` needs conversion

---

#### Method: `_activateSettingsWindowListeners` (Lines 227-708)
**Purpose:** Bind event handlers for Import/Export settings buttons

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 230 | `html.off('click', '.monarch-import-settings')` | Remove old listener | ✅ Store handler reference, use `removeEventListener` |
| 230 | `.on('click', '.monarch-import-settings', ...)` | Bind click handler | ✅ `addEventListener` with event delegation |
| 277 | `html.find('input[type="file"]')[0]` | Get file input | ✅ `html.querySelector('input[type="file"]')` |
| 282 | `html.find('#importWorldSettings').is(':checked')` | Check checkbox | ✅ `html.querySelector('#importWorldSettings')?.checked` |
| 283 | `html.find('#importClientSettings').is(':checked')` | Check checkbox | ✅ `html.querySelector('#importClientSettings')?.checked` |
| 419 | `html.find('.select-all-modules').click(...)` | Bind click | ✅ `html.querySelector('.select-all-modules')?.addEventListener('click', ...)` |
| 420 | `html.find('.module-import-checkbox').prop('checked', true)` | Set checked | ✅ `querySelectorAll` then `.checked = true` |
| 422-423 | Similar patterns | Select none button | ✅ Same conversions |
| 434 | `html.find('.module-import-checkbox:checked').each(...)` | Iterate checked | ✅ `querySelectorAll` with filter, then `forEach` |
| 635 | `html.off('click', '.monarch-export-settings')` | Remove listener | ✅ Store reference, use `removeEventListener` |
| 635 | `.on('click', '.monarch-export-settings', ...)` | Bind click | ✅ `addEventListener` |

**Migration Notes:**
- Event delegation pattern needs conversion
- `.is(':checked')` needs conversion to `.checked` property
- `.prop()` needs conversion to direct property access
- `.click()` shorthand needs conversion to `addEventListener`
- Need to store handler references for cleanup

---

#### Method: `_onCloseSettingsConfig` (Lines 710-720)
**Hooks:** `closeSettingsConfig`, `closeExtendedSettingsConfig`  
**Purpose:** Clean up event listeners

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 713 | `app.element.off('click', '.monarch-import-settings')` | Remove listener | ✅ Use stored handler reference with `removeEventListener` |
| 714 | `app.element.off('click', '.monarch-export-settings')` | Remove listener | ✅ Use stored handler reference |
| 717-718 | Similar for `html` | Remove listeners | ✅ Same conversion |

**Migration Notes:**
- Need to store handler references when binding
- Can't use `.off()` without stored references
- Consider using AbortController for easier cleanup

---

#### Method: `_activateListeners` (Lines 722-1208)
**Purpose:** Bind all event handlers for module set controls

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 725 | `html.find('input[type="checkbox"]').each(...)` | Iterate checkboxes | ✅ `querySelectorAll` then `forEach` |
| 731 | `html.find('input[type="checkbox"]').each(...)` | Iterate checkboxes | ✅ Same conversion |
| 735 | `$(this).closest('.package')` | Find parent package | ✅ `checkbox.closest('.package')` |
| 738 | `packageElem.removeClass(...)` | Remove class | ✅ `packageElem.classList.remove(...)` |
| 742 | `packageElem.addClass(...)` | Add class | ✅ `packageElem.classList.add(...)` |
| 749 | `html.find('.load-module-set').val()` | Get select value | ✅ `html.querySelector('.load-module-set')?.value` |
| 751 | `html.find('.update-module-set').hide()` | Hide button | ✅ `html.querySelector('.update-module-set').style.display = 'none'` |
| 757 | `html.find('input[type="checkbox"]').each(...)` | Iterate checkboxes | ✅ Same conversion |
| 769 | `html.find('.update-module-set').toggle(!isCurrentState)` | Toggle visibility | ✅ Conditional `style.display` |
| 773 | `html.closest('#module-management').data(...)` | Store data | ✅ Use WeakMap |
| 774 | `html.closest('#module-management').data(...)` | Store data | ✅ Use WeakMap |
| 777 | `html.closest('#module-management')` | Find parent | ✅ `html.closest('#module-management')` (same API) |
| 778 | `form.on('change', 'input[type="checkbox"]', ...)` | Event delegation | ✅ `form.addEventListener('change', (e) => { if (e.target.matches('input[type="checkbox"]')) ... })` |
| 784 | `form.on('click', '.package-header', ...)` | Event delegation | ✅ Same pattern |
| 792 | `html.find('.save-new-module-set').click(...)` | Bind click | ✅ `querySelector` then `addEventListener` |
| 797 | `html.find('input[type="checkbox"]').each(...)` | Iterate checkboxes | ✅ Same conversion |
| 819 | `html.find('form')[0]` | Get form | ✅ `html.querySelector('form')` |
| 846 | Similar | Get form | ✅ Same conversion |
| 856 | `app.element.find('.load-module-set')` | Find select | ✅ `app.element?.querySelector('.load-module-set')` |
| 858 | `moduleSetSelect.empty().append(...)` | Clear and add options | ✅ `innerHTML = ''` then create/append options |
| 860 | `moduleSetSelect.append(...)` | Add option | ✅ `createElement('option')` then `appendChild` |
| 862 | `moduleSetSelect.val(setName)` | Set value | ✅ `moduleSetSelect.value = setName` |
| 877 | `html.find('.update-module-set').click(...)` | Bind click | ✅ `querySelector` then `addEventListener` |
| 880 | `html.find('.load-module-set').val()` | Get value | ✅ `querySelector` then `.value` |
| 885 | `html.find('input[type="checkbox"]').each(...)` | Iterate | ✅ Same conversion |
| 938 | `html.find('.load-module-set').change(...)` | Bind change | ✅ `querySelector` then `addEventListener('change', ...)` |
| 940 | `html.find('.load-set-button')` | Find button | ✅ `querySelector` |
| 943 | `loadButton.hide()` | Hide | ✅ `style.display = 'none'` |
| 944 | `html.find('.update-module-set').hide()` | Hide | ✅ Same conversion |
| 959 | `loadButton.toggle(!isCurrentState)` | Toggle | ✅ Conditional display |
| 961 | `html.find('.update-module-set').hide()` | Hide | ✅ Same conversion |
| 965 | `html.closest('#module-management')` | Find parent | ✅ `closest` (same API) |
| 966 | `form.find('input[type="checkbox"]').each(...)` | Iterate | ✅ Same conversion |
| 971 | `form.find('input[type="checkbox"]').each(...)` | Iterate | ✅ Same conversion |
| 980 | `$(this).closest('.package')` | Find parent | ✅ `checkbox.closest('.package')` |
| 981 | `packageElem.removeClass(...)` | Remove classes | ✅ `classList.remove(...)` |
| 985 | `packageElem.addClass(...)` | Add class | ✅ `classList.add(...)` |
| 991 | `form.find('input[type="checkbox"]').each(...)` | Iterate | ✅ Same conversion |
| 997 | `html.find('.load-set-button').click(...)` | Bind click | ✅ `querySelector` then `addEventListener` |
| 1000 | `html.find('.load-module-set').val()` | Get value | ✅ `querySelector` then `.value` |
| 1021 | `html.find('.delete-module-set').click(...)` | Bind click | ✅ Same conversion |
| 1023 | `html.find('.load-module-set')` | Find select | ✅ `querySelector` |
| 1024 | `select.val()` | Get value | ✅ `.value` |
| 1040 | `select.empty().append(...)` | Clear and add | ✅ `innerHTML = ''` then create options |
| 1042 | `select.append(...)` | Add option | ✅ Create element then append |
| 1044 | `select.val('')` | Clear value | ✅ `.value = ''` |
| 1045 | `html.find('.load-set-button').hide()` | Hide | ✅ `style.display = 'none'` |
| 1049 | `html.find('.export-module-sets').click(...)` | Bind click | ✅ Same conversion |
| 1071 | `html.find('.import-module-sets').click(...)` | Bind click | ✅ Same conversion |
| 1094 | `html.find('input[type="file"]')[0]` | Get file input | ✅ `querySelector` |
| 1165 | `html.closest('#module-management').find('.load-module-set')` | Find select | ✅ `closest` then `querySelector` |
| 1167 | `moduleSetSelect.empty().append(...)` | Clear and add | ✅ Same conversion |
| 1169 | `moduleSetSelect.append(...)` | Add option | ✅ Same conversion |

**Migration Notes:**
- Most extensive jQuery usage in this method
- Multiple event delegation patterns
- Data storage with `.data()` needs WeakMap
- Select element manipulation needs complete rewrite
- Many repeated patterns that can be abstracted

---

### `scripts/search-and-replace.js`

#### Method: `activateListeners` (Lines 31-57)
**Purpose:** Bind event handlers for TextReplacer Application

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 33 | `html.find("button[name='clearFields']").on("click", ...)` | Bind clear button | ✅ `querySelector` then `addEventListener` |
| 35-50 | `html.find('[name="..."]').val("")` | Clear input values | ✅ `querySelector` then `.value = ""` |
| 35-50 | `html.find('[name="..."]').prop('checked', false)` | Uncheck checkboxes | ✅ `querySelector` then `.checked = false` |
| 49 | `html.find('#report-area').html(...)` | Set HTML content | ✅ `querySelector` then `.innerHTML = ...` |
| 50 | `html.find('input, select, textarea').prop('disabled', false)` | Enable inputs | ✅ `querySelectorAll` then `.disabled = false` |
| 52 | `html.find("button[name='runReport']").on("click", ...)` | Bind report button | ✅ Same conversion |
| 53 | `html.find("button[name='runReplace']").on("click", ...)` | Bind replace button | ✅ Same conversion |

**Migration Notes:**
- All `.find()` calls need conversion
- `.val()` needs conversion to `.value`
- `.prop()` needs conversion to direct property access
- `.html()` needs conversion to `.innerHTML`
- `.on()` needs conversion to `addEventListener`

---

#### Method: `_handleReplace` (Lines 79-442)
**Purpose:** Handle search/replace operations

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 80 | `html.find('[name="oldPath"]').val()?.trim()` | Get old path | ✅ `querySelector` then `.value?.trim()` |
| 81 | `html.find('[name="newPath"]').val() ?? ""` | Get new path | ✅ Same conversion |
| 82 | `html.find('[name="folderFilter"]').val()` | Get folder filter | ✅ Same conversion |
| 83 | `html.find('[name="matchMode"]').val()` | Get match mode | ✅ Same conversion |
| 84 | `html.find("#report-area")[0]` | Get report area | ✅ `querySelector` |
| 91-93 | `html.find('[name="targetImages"]')[0].checked` | Get checkbox state | ✅ `querySelector` then `.checked` |
| 111-116 | `html.find('[name="updateActors"]')[0].checked` | Get checkbox states | ✅ Same conversion |

**Migration Notes:**
- All form value access needs conversion
- Array access `[0]` can be replaced with direct `querySelector`
- `.checked` property access is the same, but need null check

---

#### Method: `_renderInner` (Lines 444-698)
**Purpose:** Render the application HTML

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 470 | `$(\`<style>...</style><div>...</div>\`)` | Create HTML from string | ✅ `insertAdjacentHTML` or `createElement` |

**Migration Notes:**
- `$()` for HTML string creation needs conversion
- Can use `insertAdjacentHTML` or create elements manually
- Template string can be inserted directly

---

### `scripts/replace-name.js`

#### Dialog Callback (Lines 88-268)
**Purpose:** Handle dialog form submission

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 90 | `html.find('select#characters').val()` | Get character selection | ✅ `querySelector` then `.value` |
| 91-103 | `html.find('input#oldName').val()` | Get form values | ✅ `querySelector` then `.value` |
| 91-103 | `html.find('input#newName').val()` | Get form values | ✅ Same conversion |
| 91-103 | `html.find('input#oldDC').val()` | Get form values | ✅ Same conversion |
| 91-103 | `html.find('input#newDC').val()` | Get form values | ✅ Same conversion |
| 91-103 | `html.find('input#oldStat').val()` | Get form values | ✅ Same conversion |
| 91-103 | `html.find('input#newStat').val()` | Get form values | ✅ Same conversion |
| 91-103 | `html.find('input#oldAttack').val()` | Get form values | ✅ Same conversion |
| 91-103 | `html.find('input#newAttack').val()` | Get form values | ✅ Same conversion |
| 100 | `html.find('select#wasNamed').val()` | Get select value | ✅ Same conversion |
| 101 | `html.find('select#nowNamed').val()` | Get select value | ✅ Same conversion |
| 102 | `html.find('input#oldPronouns').val()` | Get input value | ✅ Same conversion |
| 103 | `html.find('input#newPronouns').val()` | Get input value | ✅ Same conversion |

**Migration Notes:**
- All form value access needs conversion
- Pattern is consistent - can create helper function

---

#### Window Finding Logic (Lines 120-149, 280-310)
**Purpose:** Find focused actor window

| Line | jQuery Usage | Context | Migration Required |
|------|--------------|---------|-------------------|
| 120 | `$('.app.window-app.sheet.actor.npc')` | Find actor windows | ✅ `document.querySelectorAll('.app.window-app.sheet.actor.npc')` |
| 123 | `openWindows.each(function() {...})` | Iterate windows | ✅ `forEach` |
| 124 | `$(this).css('z-index')` | Get z-index | ✅ `getComputedStyle(window).zIndex` |
| 281-290 | Similar pattern | Same logic in second callback | ✅ Same conversions |

**Migration Notes:**
- `$()` selector needs conversion
- `.each()` needs conversion to `.forEach()`
- `.css()` needs conversion to `getComputedStyle()`
- `this` context needs explicit parameter

---

## Hook Documentation

### Hooks Receiving `html` Parameter

All hooks that receive `html` as a parameter now receive native `HTMLElement` instead of jQuery object in v13.

#### 1. `renderModuleManagement`
- **Location:** Line 30
- **Handler:** `_onRenderModuleManagement`
- **Parameters:** `(app, html, data)`
- **jQuery Usage:** Extensive - see method documentation above
- **Migration Priority:** High

#### 2. `renderSettingsConfig` / `renderExtendedSettingsConfig`
- **Location:** Lines 34-35
- **Handler:** `_onRenderPackageConfiguration`
- **Parameters:** `(app, html, data)`
- **jQuery Usage:** Extensive - see method documentation above
- **Migration Priority:** High

#### 3. `renderDialog`
- **Location:** Line 42
- **Handler:** Inline function
- **Parameters:** `(dialog, html)`
- **jQuery Usage:** Moderate - see documentation above
- **Migration Priority:** High

#### 4. `closeSettingsConfig` / `closeExtendedSettingsConfig`
- **Location:** Lines 38-39
- **Handler:** `_onCloseSettingsConfig`
- **Parameters:** `(app, html)`
- **jQuery Usage:** Minimal - event cleanup
- **Migration Priority:** Medium

---

## Event Handler Documentation

### Event Handlers Requiring Migration

#### 1. Module Management Event Handlers
**Location:** `_activateListeners` method

| Event Type | Selector | Current Binding | Migration Required |
|------------|----------|-----------------|-------------------|
| `change` | `input[type="checkbox"]` | `form.on('change', 'input[type="checkbox"]', ...)` | ✅ Event delegation with `matches()` |
| `click` | `.package-header` | `form.on('click', '.package-header', ...)` | ✅ Event delegation |
| `click` | `.save-new-module-set` | `html.find(...).click(...)` | ✅ `querySelector` then `addEventListener` |
| `click` | `.update-module-set` | `html.find(...).click(...)` | ✅ Same conversion |
| `click` | `.load-module-set` | `html.find(...).change(...)` | ✅ `addEventListener('change', ...)` |
| `click` | `.load-set-button` | `html.find(...).click(...)` | ✅ Same conversion |
| `click` | `.delete-module-set` | `html.find(...).click(...)` | ✅ Same conversion |
| `click` | `.export-module-sets` | `html.find(...).click(...)` | ✅ Same conversion |
| `click` | `.import-module-sets` | `html.find(...).click(...)` | ✅ Same conversion |

**Migration Notes:**
- Event delegation pattern: `form.addEventListener('change', (e) => { if (e.target.matches('input[type="checkbox"]')) ... })`
- Direct binding: `element.addEventListener('click', handler)`
- Need to store handler references for cleanup

#### 2. Settings Window Event Handlers
**Location:** `_activateSettingsWindowListeners` method

| Event Type | Selector | Current Binding | Migration Required |
|------------|----------|-----------------|-------------------|
| `click` | `.monarch-import-settings` | `html.off(...).on('click', '.monarch-import-settings', ...)` | ✅ Event delegation with stored reference |
| `click` | `.monarch-export-settings` | `html.off(...).on('click', '.monarch-export-settings', ...)` | ✅ Same conversion |
| `click` | `.select-all-modules` | `html.find(...).click(...)` | ✅ `querySelector` then `addEventListener` |
| `click` | `.select-none-modules` | `html.find(...).click(...)` | ✅ Same conversion |

**Migration Notes:**
- Event delegation with `.off()` before `.on()` needs handler reference storage
- Consider using AbortController for easier cleanup
- Or use WeakMap to store handler references

#### 3. Dialog Event Handlers
**Location:** `renderDialog` hook

| Event Type | Selector | Current Binding | Migration Required |
|------------|----------|-----------------|-------------------|
| `click` | `button.yes` | `confirmBtn.on('click', ...)` | ✅ `addEventListener('click', ...)` |

**Migration Notes:**
- Simple direct binding
- Need to check for element existence first

#### 4. TextReplacer Application Event Handlers
**Location:** `activateListeners` method in `search-and-replace.js`

| Event Type | Selector | Current Binding | Migration Required |
|------------|----------|-----------------|-------------------|
| `click` | `button[name='clearFields']` | `html.find(...).on("click", ...)` | ✅ `querySelector` then `addEventListener` |
| `click` | `button[name='runReport']` | `html.find(...).on("click", ...)` | ✅ Same conversion |
| `click` | `button[name='runReplace']` | `html.find(...).on("click", ...)` | ✅ Same conversion |

**Migration Notes:**
- All direct bindings
- Need null checks before binding

---

## Test Cases

### Test Case 1: Module Management Rendering
**Purpose:** Verify module set controls render correctly

**Steps:**
1. Open Module Management window
2. Verify module set controls appear
3. Verify dropdown shows saved module sets
4. Verify all buttons are visible and functional

**Expected Results:**
- Controls appear after filter input
- Dropdown populated with module sets
- Buttons render correctly
- No console errors

**jQuery Dependencies:**
- `html.find('input[name="filter"]')` - Find insertion point
- `html.find('form')` - Fallback insertion
- `$(moduleSetControls).insertAfter(...)` - Insert controls
- `form.prepend(...)` - Fallback prepend

---

### Test Case 2: Load Module Set
**Purpose:** Verify loading a module set updates checkboxes correctly

**Steps:**
1. Select a module set from dropdown
2. Verify checkboxes update to match set
3. Verify highlighting appears for changed modules
4. Verify "Load Set" button appears if different from current

**Expected Results:**
- Checkboxes update correctly
- Visual highlighting works
- Load button appears/disappears appropriately
- No console errors

**jQuery Dependencies:**
- `html.find('.load-module-set').val()` - Get selected set
- `html.find('input[type="checkbox"]').each(...)` - Iterate checkboxes
- `$(this).closest('.package')` - Find parent
- `.addClass()`, `.removeClass()` - Update highlighting
- `.toggle()` - Show/hide button

---

### Test Case 3: Save New Module Set
**Purpose:** Verify saving current state as new module set

**Steps:**
1. Configure modules as desired
2. Click "Save as New" button
3. Enter set name in dialog
4. Verify set is saved
5. Verify dropdown updates

**Expected Results:**
- Dialog opens correctly
- Set saves successfully
- Dropdown updates with new set
- No console errors

**jQuery Dependencies:**
- `html.find('.save-new-module-set').click(...)` - Bind handler
- `html.find('input[type="checkbox"]').each(...)` - Get current state
- `html.find('form')[0]` - Get form from dialog
- `app.element.find('.load-module-set')` - Update dropdown
- `.empty().append(...)` - Update options
- `.val(setName)` - Set selected value

---

### Test Case 4: Import/Export Settings
**Purpose:** Verify settings import/export functionality

**Steps:**
1. Click "Export Settings" button
2. Verify file downloads
3. Click "Import Settings" button
4. Select exported file
5. Configure import options
6. Verify import preview
7. Complete import

**Expected Results:**
- Export creates valid JSON file
- Import dialog opens correctly
- Preview shows correct modules
- Import completes successfully
- No console errors

**jQuery Dependencies:**
- `html.off(...).on('click', '.monarch-export-settings', ...)` - Bind export
- `html.off(...).on('click', '.monarch-import-settings', ...)` - Bind import
- `html.find('input[type="file"]')[0]` - Get file input
- `html.find('#importWorldSettings').is(':checked')` - Get checkbox state
- `html.find('.select-all-modules').click(...)` - Bind select all
- `html.find('.module-import-checkbox:checked').each(...)` - Get selected modules

---

### Test Case 5: Module Dependency Dialog
**Purpose:** Verify integration with module dependency changes

**Steps:**
1. Change module dependencies
2. Confirm dependency dialog
3. Verify module management UI updates

**Expected Results:**
- Dialog handler fires correctly
- Stored functions retrieved
- UI updates appropriately
- No console errors

**jQuery Dependencies:**
- `html.find('button.yes')` - Find confirm button
- `$(moduleManager)` - Wrap element
- `.data('updateCurrentStateHighlight')` - Get stored function
- `.data('updateButtonVisibility')` - Get stored function

---

### Test Case 6: TextReplacer Application
**Purpose:** Verify TextReplacer application works correctly

**Steps:**
1. Open TextReplacer application
2. Fill in form fields
3. Click "Run Report"
4. Verify results display
5. Click "Mass Replace"
6. Verify replacements complete

**Expected Results:**
- Application renders correctly
- Form inputs work
- Report generates correctly
- Replacements complete successfully
- No console errors

**jQuery Dependencies:**
- `html.find("button[name='clearFields']").on("click", ...)` - Clear button
- `html.find('[name="oldPath"]').val()` - Get form values
- `html.find('#report-area').html(...)` - Update results
- `$(\`<style>...</style>\`)` - Create HTML

---

### Test Case 7: Replace Name Macro
**Purpose:** Verify replace name macro dialog works

**Steps:**
1. Execute replace name macro
2. Fill in dialog form
3. Submit form
4. Verify replacements complete

**Expected Results:**
- Dialog opens correctly
- Form inputs work
- Replacements complete successfully
- No console errors

**jQuery Dependencies:**
- `html.find('select#characters').val()` - Get form values
- `$('.app.window-app.sheet.actor.npc')` - Find windows
- `.each(function() {...})` - Iterate windows
- `$(this).css('z-index')` - Get z-index

---

## Summary Statistics

### jQuery Usage Count by File

| File | Total jQuery Usages | High Priority | Medium Priority | Low Priority |
|------|---------------------|---------------|-----------------|--------------|
| `scripts/monarch.js` | ~180 | 120 | 50 | 10 |
| `scripts/search-and-replace.js` | ~25 | 15 | 8 | 2 |
| `scripts/replace-name.js` | ~15 | 10 | 4 | 1 |
| **Total** | **~220** | **145** | **62** | **13** |

### Migration Complexity by Method

| Method | Complexity | Estimated Time |
|--------|------------|----------------|
| `_activateListeners` | Very High | 4-6 hours |
| `_onRenderPackageConfiguration` | High | 2-3 hours |
| `_activateSettingsWindowListeners` | High | 2-3 hours |
| `_onRenderModuleManagement` | Medium | 1-2 hours |
| `activateListeners` (TextReplacer) | Medium | 1 hour |
| `_handleReplace` | Low | 30 minutes |
| `_renderInner` | Low | 30 minutes |
| Dialog callbacks | Low | 30 minutes |
| Window finding logic | Low | 30 minutes |

**Total Estimated Time:** 12-18 hours

---

## Next Steps

1. ✅ Complete detailed audit (this document)
2. ⏭️ Review audit with team
3. ⏭️ Begin Phase 2: Core Migration
4. ⏭️ Create helper functions for common patterns
5. ⏭️ Implement migration file by file

---

**Last Updated:** 2025-01-XX  
**Status:** Phase 1 Complete  
**Next Phase:** Phase 2 - Core Migration

