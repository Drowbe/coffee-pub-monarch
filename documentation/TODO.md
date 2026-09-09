# TODO

**Audience:** us.

Work we intend to do on Coffee Pub Monarch. Defects we have not fixed live in
[known-issues.md](known-issues.md) instead.

## Unwalked user guides

The guide set was written from the code and from the settings and module windows, not by walking every
path in a live session. Recorded per guide rather than as one blanket line, so the unverified surface
is visible.

**[userguide-player.md](userguides/userguide-player.md) is the one most likely to be wrong**, and it
is the one a player actually reads. Its claims come from reading permission checks rather than from
watching a player's client: that Import refuses world settings for a non-GM, that Prune reports
nothing removed, and that Export works at all. Walk it from a real player login.

[userguide-prune-settings.md](userguides/userguide-prune-settings.md) describes the report layout and
the still-installed warning from the code. The delete path itself has been exercised on a live world.

[userguide-module-sets.md](userguides/userguide-module-sets.md) and
[userguide-settings-backup.md](userguides/userguide-settings-backup.md) describe flows that are in
regular use, but the exact wording of result and error screens has not been checked against what the
screens currently say.

## Retire the Foundry 13 dependency-prompt fallback

`initialize()` keeps a guarded `renderDialog` registration for Foundry 13, alongside the
`closeDependencyResolution` hook that works on 14. The fallback is confirmed dead on v14. Delete it
when `module.json`'s minimum reaches 14.

## Decide what to do with the unloaded macro sources

`scripts/replace-name.js` and `scripts/search-and-replace.js` are in `scripts/` but are not in
`module.json`'s `esmodules` and are imported by nothing. They are macro sources, and `replace-name.js`
would throw if it were ever loaded as a module. Either move them somewhere that says what they are, or
delete them. Leaving them in `scripts/` makes every audit of the codebase count them.
