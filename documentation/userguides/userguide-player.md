# What Players See

**Audience:** players in a world where the GM has enabled Monarch, and GMs wondering what their table
can reach.

What Monarch adds to a player's Foundry, and which of it does anything.

Monarch is a GM tool. Almost nothing it does is meant for players, but two of its additions are
visible to everyone, which raises reasonable questions.

## What you can see

**In Configure Settings**, you see the same three buttons a GM sees: Import Settings, Export Settings,
and Prune Settings. You also get the "Type to jump to setting..." box at the top of the settings list.

**In Manage Modules**, you see nothing from Monarch, because Foundry does not let players open that
window at all. Module sets are entirely a GM feature.

## What actually works for you

**Jump to setting works normally.** It only scrolls the page, so there is nothing restricted about it.
This is the one Monarch feature genuinely useful to a player. See
[jump to setting](userguide-jump-to-setting.md).

**Export Settings works.** You get a file containing the world's settings as you can see them. This is
harmless and occasionally useful if your GM asks you to send your configuration.

**Import Settings works, but only for your own preferences.** The world settings checkbox is disabled
for you, and any world setting in the file is refused rather than applied. You can restore your own
interface preferences, themes, and display options. You cannot change anything another player or the
GM will see. See [backing up settings](userguide-settings-backup.md).

**Prune Settings will not delete anything.** You can run the report and see what has accumulated in
the world, but orphaned settings live in the shared world configuration, and removing those needs GM
permission. Pruning as a player reports nothing removed.

## Why you can see buttons you cannot use

The buttons are added to the settings window for everyone rather than hidden from players, and the
permission checks happen when you use them. The practical effect is that a player can look but not
change, which is the same rule Foundry applies to the settings themselves.

If you would rather your players did not see these at all, there is currently no setting to hide them.

## Nothing here changes your game

Monarch does not touch actors, tokens, scenes, dice, or chat. It manages which modules are on and what
their settings are. Nothing it does will change what happens at the table during play.
</content>
</invoke>
