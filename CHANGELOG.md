# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [13.0.4]
- **CSS**: Wuick update to be able to jighlt the "jump=to" settings found when searching.


## [13.0.3]

### Changed
- **README**: Restructured with intro paragraph, badges (Foundry v13, release, license, workflow, downloads), Features above Screenshots, and consistent sections (Installation, Usage, License, Contributing). Installation manifest URL updated to use latest release. Product screenshots updated to new WebP assets (module sets, jump-to, import select/preview/result, prune).
- **BUTTONS**: Simplified buttons for better readability and consistency.

## [13.0.2]

### Added
- **Jump to setting (Settings window)**: A second search at the top of the Settings window categories list that scrolls to matching settings without hiding any items. Type to jump to the first match; use the prev/next buttons to cycle through multiple matches. Shows status text (e.g. "Showing 1 of 3") and highlights the focused item. All categories and settings remain visible—only the scroll position changes.

### Improved
- **Settings window UX**: Jump search uses the active category tab and matches against setting labels/names. Event listeners and highlights are cleaned up when the Settings window closes.

## [13.0.1] - FoundryVTT v13 Stable

### Fixed
- **Dialog Callback Errors**: Fixed `html.querySelector is not a function` errors in Dialog callbacks by adding proper type checking and element unwrapping for the `html` parameter
- **Dialog Render Hook Errors**: Fixed `html.querySelector is not a function` errors in Dialog `render` hooks by adding safety checks for different `html` parameter types
- **Save New Module Set**: Fixed issue where saving a new module set would not work - changed form data access from `form.setName.value` to `querySelector('input[name="setName"]').value` for v13 compatibility
- **Import File Type Detection**: Improved error messages when importing wrong file types (module sets vs settings) with clearer guidance to use the correct import button

### Improved
- **Error Handling**: Enhanced error handling in Dialog callbacks and render hooks to gracefully handle different parameter types
- **User Feedback**: Better error messages that guide users to the correct import functionality when wrong file types are detected

## [13.0.0] - FoundryVTT v13 Migration

### Breaking Changes
- **jQuery Removal**: All jQuery usage has been removed and replaced with native DOM APIs for FoundryVTT v13 compatibility
- **DOM Structure Changes**: Updated to work with v13's new module management window structure (search element, no form element)

### Changed
- **Module Management Window**: Updated to work with v13 DOM structure (uses `search.flexrow` instead of filter input)
- **Dialog Callbacks**: Fixed Dialog callback `html` parameter handling for v13 compatibility
- **Dialog Render Hooks**: Fixed Dialog `render` hook `html` parameter handling
- **Form Data Access**: Changed from `form.property.value` to `querySelector` for proper v13 compatibility
- **Event Handlers**: All jQuery event handlers converted to native `addEventListener`
- **Data Storage**: Replaced jQuery `.data()` with `WeakMap` for event handler storage
- **DOM Manipulation**: All jQuery DOM methods replaced with native equivalents

### Fixed
- Module set controls now appear correctly in v13 module management window
- Save new module set functionality now works correctly
- Import/Export module sets functionality works correctly
- Import/Export settings functionality works correctly
- Dialog callbacks no longer throw `querySelector is not a function` errors
- Better error messages for wrong file type imports (module sets vs settings)

### Technical Details
- Removed ~220+ jQuery usages across all files
- Updated all hooks (`renderModuleManagement`, `renderSettingsConfig`, `renderDialog`, etc.)
- Converted all event delegation to native DOM APIs
- Fixed v13-specific DOM structure changes

## [12.1.3] - FINAL VERSION 12 RELEASE
- This is the final release for Foundry v12

## [12.1.2] - Enhanced Settings Import/Export

### Added
- **Module-Level Import Selection**: Added checkboxes for each module in the import preview, allowing users to selectively import settings from specific modules (all pre-checked by default)
- **Select All/None Buttons**: Added "Select All" and "Select None" buttons for quick module selection in the import preview
- **Client-Scoped Settings Import Option**: Added checkbox option to import client-scoped settings (per-user preferences) with clear warnings about personal settings
- **World-Scoped Settings Import Option**: Added checkbox option to import world-scoped settings (shared world configuration) with GM-only restrictions
- **Settings Registry Detection**: Added detection of namespaces via settings registry to properly identify systems and modules that may not be in standard collections
- **Empty JSON String Handling**: Added automatic conversion of empty strings to `"{}"` for settings that expect JSON (prevents validation errors in modules like Torch)

### Improved
- **Import Dialog Workflow**: Moved import scope checkboxes to the file selection dialog for better user flow
- **Import Preview Display**: Preview dialog now shows selected import options (world/client scope) and allows module-level selection
- **Error vs Skip Distinction**: Separated "Skipped (by choice)" from "Errors" in import results for clearer feedback
- **Module List Organization**: Module list in import preview is now sorted alphabetically by display title for easier navigation
- **System Detection**: Enhanced detection of game systems (Core, D&D5E, etc.) by checking `game.systems`, `game.system.id`, and settings registry
- **Event Listener Management**: Switched to event delegation and added proper cleanup hooks to prevent memory leaks
- **Dialog Titles**: Removed "All" from import dialog title and added preview notice about reviewing changes before final import

### Fixed
- **Import/Export Buttons Not Appearing**: Fixed buttons not showing on hosted Foundry instances by searching in both `html` and `app.element`, and checking sidebar locations
- **Duplicate Buttons**: Fixed duplicate import/export buttons appearing by adding existence check before adding buttons
- **Settings Lookup**: Fixed settings import to use correct `"namespace.key"` format when checking if settings exist in the registry
- **Core and System Detection**: Fixed Core and D&D5E showing as "missing" by properly detecting systems via multiple methods (game.systems, game.system.id, settings registry)
- **JSON Validation Errors**: Removed overly strict JSON validation that was incorrectly flagging valid string values (like template strings) as invalid JSON
- **Empty String Import Errors**: Fixed errors when importing empty strings for settings that expect JSON by converting to valid empty JSON object `"{}"`

## [12.1.1] - Settings Import/Export

### Added
- **Import Preview Dialog**: Added preview dialog before importing settings that shows which modules will have settings imported and which modules are missing
- **Import Statistics**: Added detailed import statistics showing successfully imported settings count, skipped settings count, and modules processed
- **World-Scope Filtering**: Import now only processes world-scoped settings, automatically skipping client-scoped settings for security
- **Export Metadata**: Export now includes comprehensive metadata (scope, type, config flag, default value) for each setting
- **Export Error Tracking**: Export marks settings that can't be exported with `__exportError` instead of failing, allowing partial exports
- **Reload Option**: Added convenient reload option in import success dialog to apply settings changes immediately

### Improved
- **Import User Experience**: Enhanced import workflow with multi-step dialogs (file selection → preview → import → success) for better user control
- **Error Handling**: Improved error handling throughout import/export process with detailed console logging and user-friendly notifications
- **Export Filename**: Export filename now includes full timestamp for better organization (`CoffeePub-MONARCH-Settings-Export-YYYY-MM-DD-HH-MM-SS.json`)
- **Settings Validation**: Import validates that settings exist and are registered before attempting to import them
- **Module Availability Check**: Import checks module availability before processing, skipping settings for modules that aren't installed

### Fixed
- **Import Scope Validation**: Fixed import to properly check setting scope before importing, preventing attempts to import client-scoped settings
- **Setting Registration Check**: Fixed import to verify settings are registered in the current Foundry instance before attempting to set values
- **Error Recovery**: Fixed export to continue processing even when individual settings fail, ensuring maximum data export
- **File Format Validation**: Improved validation of import file format with clear error messages for invalid files


## [12.1.0] - MAJOR UPDATE - Blacksmith API Migration

### Added
- **Blacksmith API Integration**: Complete migration to the new Coffee Pub Blacksmith API system
- **Enhanced Module Relationships**: Added comprehensive module recommendations including Coffee Pub Monarch, Squire, and other ecosystem modules
- **Improved Author Information**: Enhanced author profiles with Discord, GitHub, Patreon, and Reddit links for better community engagement
- **Bug Reporting Integration**: Added direct GitHub Issues link for streamlined bug reporting and feature requests
- **Settings Import/Export**: Added Import Settings and Export Settings buttons to the main settings window for easy migration of all module settings between Foundry instances

### Changed
- **Version Numbering**: Migrated from semantic versioning (1.12.2) to Foundry VTT version-based numbering (12.1.0)
- **Foundry Compatibility**: Updated compatibility to focus on Foundry VTT v12, removing v13 maximum compatibility
- **Module Dependencies**: Restructured module relationships with Coffee Pub Blacksmith as a required dependency
- **Author Structure**: Enhanced author information with comprehensive social media and contribution details
- **Library Configuration**: Updated library field to use array format for future extensibility

### Breaking Changes
- **Required Dependency**: Coffee Pub Blacksmith is now a required dependency for this module to function
- **Version Compatibility**: Module now requires Foundry VTT v12 specifically
- **API Changes**: Internal API changes to support the new Blacksmith system

### Fixed
- **Export Functionality**: Fixed settings export to properly handle unregistered game settings and prevent crashes
- **Module Settings Access**: Resolved issues with accessing Foundry V12 settings registry for comprehensive exports
- **Error Handling**: Improved error handling for settings that can't be exported, marking them with `__exportError` instead of failing
- **Workflow Integration**: Fixed GitHub Actions release workflow to use module-specific naming (`coffee-pub-monarch.zip`)

### Technical Details
- **Module Manifest**: Updated to use latest release manifest URLs
- **Download Links**: Streamlined release and download URLs for better distribution
- **Relationship Structure**: Reorganized module relationships for improved dependency management

## [1.0.1] - 2024-02-25

### Changed
- Updated export filename format to "monarch-YYYY-MM-DD-HH-MM.json" for better organization
- Changed import dialog label to "Import JSON" for clarity

### Fixed
- Removed invalid "templates" and "includes" keys from module.json to resolve manifest warnings
- Fixed "Save as New" functionality to correctly capture currently selected modules
- Fixed "Update" functionality to properly save changes to existing module sets

## [1.0.0] - 2024-02-14

### Added
- Core Module Set Management
  - Save current module configuration as a named set
  - Load saved module sets with a single click
  - Update existing module sets with current selection
  - Delete unwanted module sets
  - Automatic "Default Configuration" creation on first use

- Visual Feedback System
  - Green highlighting for modules to be enabled
  - Red highlighting for modules to be disabled
  - Yellow highlighting for changes to current configuration
  - Clear visual indication of pending changes

- Import/Export Functionality
  - Export all module sets to JSON file
  - Import module sets from JSON file
  - Detailed import analysis showing missing and extra modules
  - Option to save import analysis to text file

- User Interface
  - Integrated controls in Module Management window
  - Dropdown menu for set selection
  - Clear button labeling and iconography
  - Responsive visual feedback
  - Confirmation dialogs for important actions

- Quality of Life Features
  - Support for module dependencies
  - Automatic state tracking
  - Save without reload option
  - Reload prompts when needed
  - Proper error handling and notifications 