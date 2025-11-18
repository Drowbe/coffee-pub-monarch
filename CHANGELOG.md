# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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