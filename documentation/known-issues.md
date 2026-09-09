# Known Issues

**Audience:** anyone using Coffee Pub Monarch who has hit something odd.

Defects and limitations that are real and currently unfixed.

## Orphaned browser-stored settings are never cleaned up

Pruning removes world- and user-scoped settings and deliberately leaves client-scoped ones alone, so
settings a module stored in your browser stay there after it is uninstalled.

This is a constraint rather than an oversight, and it is unlikely to change. Browser storage holds
data that is not settings at all, including hosting credentials and recoverable deleted documents, and
there is no reliable way to tell an abandoned setting apart from data something still needs. See
[the architecture document](architecture/architecture-monarch.md) for the measurements behind that.

## Import and Export appear for players who cannot fully use them

The Import, Export, and Prune buttons are added to Configure Settings for every user. Permission is
checked when the button is used rather than when it is drawn, so a player sees three buttons of which
one does nothing for them. There is no setting to hide them. See
[what players see](userguides/userguide-player.md).

## Pruning a setting whose module is still installed does not stick

The module registers the setting again with its default value the next time Foundry loads. Monarch
warns when this is about to happen rather than reporting a success that will not hold, but the
underlying behaviour is Foundry's and cannot be worked around: uninstall the module rather than
disabling it if you want its settings gone.

## Importing a setting whose format has changed can fail

If a module changed how it stores a value between versions, an older exported value may be rejected by
that module's own validation. These are reported as failures in the import result with the reason
given. There is no automatic migration.

## Module sets do not record versions

A set stores module ids only. Loading a set on a machine with different versions installed enables
those versions, and a set naming a module that is not installed cannot enable it.
</content>
</invoke>
