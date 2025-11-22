# Coffee Pub Monarch - v13 Migration Status

**Last Updated:** Current Session  
**Status:** ✅ **Core Migration Complete** - Module is functional in FoundryVTT v13

---

## Summary

The Coffee Pub Monarch module has been successfully migrated from FoundryVTT v12 to v13. All jQuery usage has been removed and replaced with native DOM APIs. The module is now fully functional in FoundryVTT v13.

---

## Completed Work

### ✅ Phase 1: Code Audit
- [x] Complete jQuery usage audit (~220+ instances identified)
- [x] Document all affected hooks
- [x] Document all event handlers
- [x] Create comprehensive migration plan

### ✅ Phase 2: Core Migration (monarch.js)
- [x] Update `renderModuleManagement` hook
- [x] Update `renderSettingsConfig` / `renderExtendedSettingsConfig` hooks
- [x] Update `renderDialog` hook
- [x] Update `closeSettingsConfig` hooks
- [x] Replace all jQuery selectors with `querySelector`/`querySelectorAll`
- [x] Replace all jQuery iteration with native `forEach`
- [x] Replace all DOM manipulation (insertAfter, prepend, append, etc.)
- [x] Replace all event handlers with `addEventListener`
- [x] Replace all attribute/property access
- [x] Replace data storage (jQuery `.data()` → `WeakMap`)
- [x] Replace select element manipulation
- [x] Fix HTML string creation (template rendering)
- [x] Fix Dialog callback `html` parameter handling
- [x] Fix Dialog `render` hook `html` parameter handling
- [x] Fix v13 DOM structure changes:
  - Module management window (search element, no form element)
  - Template HTML to DOM element conversion
- [x] Fix form data access in Dialog callbacks

### ✅ Phase 3: Application Migration (search-and-replace.js)
- [x] Update `activateListeners` method
- [x] Update `_renderInner` method
- [x] Replace all jQuery usage in helper methods

### ✅ Phase 4: Macro Migration (replace-name.js)
- [x] Update Dialog callbacks
- [x] Replace window finding logic
- [x] Replace all jQuery usage

### 🔄 Phase 5: Testing (In Progress)
- [x] Module loads without console errors
- [x] Module management window renders correctly
- [x] Settings window renders correctly
- [x] All hooks that receive `html` parameter work correctly
- [x] Module set controls appear and function
- [x] Load module set button works
- [x] Save as new module set works
- [x] Update module set works
- [x] Delete module set works
- [x] Export/Import module sets works
- [x] Import/Export settings buttons work
- [x] All event handlers fire correctly
- [x] DOM manipulation works as expected
- [x] Forms submit correctly
- [x] Dialogs open and close correctly
- [ ] Edge case testing (empty sets, large numbers of modules)
- [ ] Integration testing with other v13 modules
- [ ] Performance testing

---

## Issues Found and Fixed During Testing

### 1. Module Management Window Not Showing Controls
**Issue:** v13 changed the DOM structure - no longer has `input[name="filter"]` or `form` element  
**Fix:** Updated selectors to use `search.flexrow` element and proper insertion points  
**Status:** ✅ Fixed

### 2. Dialog Callback Errors
**Issue:** `html.querySelector is not a function` - Dialog callbacks receive different `html` parameter types  
**Fix:** Added safety checks to handle different `html` parameter types (HTMLElement, jQuery object, etc.)  
**Status:** ✅ Fixed

### 3. Dialog Render Hook Errors
**Issue:** `html.querySelector is not a function` in Dialog `render` hooks  
**Fix:** Added safety checks and proper element unwrapping for Dialog render hooks  
**Status:** ✅ Fixed

### 4. Import File Format Confusion
**Issue:** Users trying to import module sets file into settings import dialog  
**Fix:** Added better error messages that detect wrong file types and guide users to correct import button  
**Status:** ✅ Fixed

### 5. Save New Module Set Not Working
**Issue:** Form data access using `form.setName.value` doesn't work in v13  
**Fix:** Changed to use `querySelector('input[name="setName"]').value`  
**Status:** ✅ Fixed

---

## Remaining Work

### Testing
- [ ] Edge case testing:
  - Empty module sets
  - Large numbers of modules (100+)
  - Error handling scenarios
  - Different user permissions (GM vs Player)
  - Module dependency dialog integration
- [ ] Integration testing:
  - Test with other v13-compatible modules
  - Test with popular module combinations
  - Verify no conflicts with other modules
- [ ] Performance testing:
  - Ensure no performance regressions
  - Test with large module lists

### Documentation
- [x] Update migration-plan.md with progress
- [x] Update CHANGELOG.md with v13 migration notes
- [ ] Update README.md if needed (check for any v12-specific instructions)
- [ ] Create release notes for v13.0.0

### Release
- [ ] Final testing pass
- [ ] Tag and release v13.0.0
- [ ] Update module manifest URL if needed

---

## Key Changes Made

### jQuery → Native DOM Conversions

| jQuery (v12) | Native DOM (v13) |
|--------------|------------------|
| `html.find(selector)` | `html.querySelector(selector)` or `html.querySelectorAll(selector)` |
| `html.find(selector).each(...)` | `html.querySelectorAll(selector).forEach(...)` |
| `element.on('click', ...)` | `element.addEventListener('click', ...)` |
| `element.off('click', ...)` | `element.removeEventListener('click', ...)` |
| `element.val()` | `element.value` |
| `element.prop('checked', true)` | `element.checked = true` |
| `element.html(...)` | `element.innerHTML = ...` |
| `element.append(...)` | `element.appendChild(...)` or `element.insertAdjacentElement('afterend', ...)` |
| `element.prepend(...)` | `element.insertBefore(..., element.firstChild)` |
| `element.insertAfter(...)` | `target.insertAdjacentElement('afterend', element)` |
| `element.data(key, value)` | `WeakMap.set(element, {key: value})` |
| `element.closest(selector)` | `element.closest(selector)` (same, but returns native element) |
| `$(htmlString)` | `document.createElement('div')` + `innerHTML` or `insertAdjacentHTML` |

### v13-Specific Changes

1. **Module Management Window Structure:**
   - v12: Had `input[name="filter"]` and `form` element
   - v13: Uses `search.flexrow` element, no form element

2. **Dialog Callbacks:**
   - v12: Received jQuery object or DOM element
   - v13: May receive different types, need safety checks

3. **Hook Parameters:**
   - v12: `html` parameter was jQuery object
   - v13: `html` parameter is native HTMLElement

4. **Form Data Access:**
   - v12: Could use `form.property.value`
   - v13: Must use `querySelector` to find form elements

---

## Files Modified

1. **scripts/monarch.js** - Main module file (~220+ jQuery usages removed)
2. **scripts/search-and-replace.js** - Application class (jQuery removed)
3. **scripts/replace-name.js** - Macro script (jQuery removed)
4. **Documentation/migration-plan.md** - Updated with progress
5. **CHANGELOG.md** - Updated with v13 migration notes

---

## Next Steps

1. Continue testing edge cases
2. Test integration with other v13 modules
3. Final documentation review
4. Prepare for v13.0.0 release

---

**Migration Status:** ✅ **READY FOR FINAL TESTING AND RELEASE**

