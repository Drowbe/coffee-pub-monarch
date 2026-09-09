# Module Sets

**Audience:** GMs who want to switch between different sets of enabled modules.

Saving your current module configuration under a name, loading it back, and reading the colour coding
that tells you what is about to change.

A module set is a saved list of which modules were enabled. Loading a set ticks and unticks
checkboxes to match it. Nothing is installed or uninstalled, and nothing is applied until you save.

## Where the controls are

Open **Manage Modules**. The controls sit in a row just below the search box: a dropdown of your saved
sets, then Load, Update, Save New, Delete, Export, and Import.

Load and Update stay hidden until they apply to something, so the row looks shorter than this until
you pick a set from the dropdown.

## Saving your current setup as a set

1. Tick and untick modules until the list is how you want it. Do not save yet.
2. Click **Save New**.
3. Type a name and confirm.

The set records exactly what is ticked at that moment.

Monarch creates a set called "Default Configuration" from your enabled modules the first time it runs,
so there is always one to fall back to.

## Loading a set

1. Pick the set from the dropdown. The module list immediately colours to show what will change.
2. Check the colours, then click **Load**.
3. Click **Save Module Settings** at the bottom of the window. Foundry reloads the world.

**Nothing takes effect until you click Save Module Settings.** Loading a set only moves the
checkboxes. If you change your mind, close the window without saving and nothing has happened.

## Reading the colours

![Module set controls and change highlighting](../assets/monarch-modules-sets-change.webp)

- **Green** means the module is off now and the set will turn it on.
- **Red** means the module is on now and the set will turn it off.
- **Yellow** means you have manually changed a checkbox away from what the selected set says.

Yellow is the one worth pausing on. It means the module list no longer matches the set in the
dropdown, so if you click **Update** you will overwrite the set with what is on screen.

## Updating a set

Pick the set, change whatever checkboxes you want, then click **Update**. The set is overwritten with
the current state of the list. There is no undo, so export your sets first if you are unsure.

## Deleting a set

Pick the set and click the bin button. You are asked to confirm. Deleting a set does not change which
modules are enabled.

## Sharing and backing up sets

**Export** saves all your sets to a JSON file. **Import** reads one back.

This is how you copy a working configuration to another world or another machine, and it is worth
doing before any big change. The file only lists module ids, so importing a set on a machine that does
not have those modules installed gives you a set that cannot be fully loaded.

Module set files and settings files are not interchangeable. If you pick the wrong one, Monarch tells
you which button you wanted.

## What a set does not do

- It does not install or download modules. A set naming a module you do not have cannot enable it.
- It does not save module settings. That is
  [a separate feature](userguide-settings-backup.md).
- It does not track module versions.
</content>
</invoke>
