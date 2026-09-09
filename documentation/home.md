# Coffee Pub Monarch

**Audience:** everyone -- GMs using the module, and anyone changing it.

Save and switch between sets of enabled modules, back up and restore your world's settings, and clear
out the settings left behind by modules you have uninstalled.

![Module set controls and change highlighting](assets/monarch-modules-sets-change.webp)

This page routes. Each section points at the document that answers the question rather than answering
it here.

## Using Monarch

Start with [Getting Started](userguides/userguide-getting-started.md). It covers installing, what
appears on screen, and the one thing worth doing in the first five minutes.

Then, by what you want to do:

- [Module sets](userguides/userguide-module-sets.md) -- saving your enabled modules under a name,
  switching between sets, and reading the colour coding.
- [Backing up and restoring settings](userguides/userguide-settings-backup.md) -- export, import, and
  the difference between world and personal settings.
- [Jump to setting](userguides/userguide-jump-to-setting.md) -- finding a setting without filtering
  the list.
- [Pruning orphaned settings](userguides/userguide-prune-settings.md) -- deleting settings whose
  module is gone. Read this before using that button.
- [Monarch's settings](userguides/userguide-settings.md) -- short, because it has none you can
  configure.
- [What players see](userguides/userguide-player.md) -- which parts of Monarch a player can reach.

## Changing Monarch

[The architecture document](architecture/architecture-monarch.md) covers how Monarch attaches to
Foundry's Module Management and Configure Settings windows, which selectors and hooks it depends on
and how they moved between Foundry v13 and v14, and what it knows about the settings stores
underneath. It also records why pruning cannot safely touch browser-stored settings, which is the
constraint most likely to be mistaken for a gap.

Monarch has no API. Nothing in the Coffee Pub suite calls into it, and it declares no dependencies.

## Elsewhere

[Known issues](known-issues.md) lists current defects.

The rest of the suite is documented from
[the Blacksmith wiki](https://github.com/Drowbe/coffee-pub-blacksmith/wiki).
</content>
</invoke>
