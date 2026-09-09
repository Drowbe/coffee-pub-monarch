# Monarch's Settings

**Audience:** anyone looking for Monarch in the Configure Settings window.

What Monarch stores, and why it has nothing for you to configure.

## Monarch has no configurable settings

There is no "Coffee Pub Monarch" section in Configure Settings, and that is deliberate rather than an
oversight. Monarch's features are all things you invoke from a button when you want them, so there is
nothing to switch on or tune in advance.

If you are looking for Monarch's controls, they are in the windows it decorates rather than in a
settings page of its own:

- The module set controls are in **Manage Modules**, below the search box. See
  [module sets](userguide-module-sets.md).
- Import, Export, and Prune are in **Configure Settings**, near Reset Defaults. See
  [backing up settings](userguide-settings-backup.md) and
  [pruning](userguide-prune-settings.md).
- The jump-to-setting box is at the top of the settings list. See
  [jump to setting](userguide-jump-to-setting.md).

## What Monarch stores

One thing: your saved module sets, under a hidden world setting called `moduleSets`. It is hidden
because there is no sensible way to edit a list of module configurations through a settings form, and
the module set controls already do it properly.

Because it is a world setting, your module sets are shared by the world rather than by your browser.
Every GM in the world sees the same sets, and they survive a change of machine or browser.

They are included in a settings export, so a settings backup carries your module sets too. You can
also [export the sets on their own](userguide-module-sets.md) from Manage Modules, which is the better
option if sharing sets is all you want.

## A note on pruning Monarch

If you ever uninstall Monarch, its `moduleSets` entry becomes an orphaned setting like any other, and
a later prune will offer to delete it. That is your saved module sets. Export them first if you might
come back.
</content>
</invoke>
