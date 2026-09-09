# Coffee Pub Monarch

![Latest Release](https://img.shields.io/github/v/release/Drowbe/coffee-pub-monarch)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/Drowbe/coffee-pub-monarch/release.yml?event=push)
![GitHub all releases](https://img.shields.io/github/downloads/Drowbe/coffee-pub-monarch/total)
![Foundry v13](https://img.shields.io/badge/foundry-v13-yellow)
![Foundry v14](https://img.shields.io/badge/foundry-v14-green)
![MIT License](https://img.shields.io/badge/license-MIT-blue)

## What it is

Monarch lets you save the set of modules you have enabled, give it a name, and switch to a different
one with a click. It also backs up every setting in your world to a file, puts them back, and clears
out the settings left behind by modules you uninstalled months ago.

If you run more than one game, or you keep a stripped back set of modules for testing, this is the
module that stops you ticking forty checkboxes by hand.

![Module set controls, showing which modules will be enabled and disabled](documentation/assets/monarch-modules-sets-change.webp)

Monarch is built for a real weekly game and released for yours. It is offered as-is, with no guarantee
of stability, compatibility, or support. **Use at your own risk.** Bugs and requests go in
[Issues](https://github.com/Drowbe/coffee-pub-monarch/issues), and they get read.

## What it does

- **Save your enabled modules as a named set** and load it back with one click, with colour coding
  that shows exactly what will turn on and off before you commit.
- **Export and import module sets** as files, to move a working configuration to another world or
  another machine.
- **Back up every setting in your world** to a JSON file, and restore it with a preview that lets you
  pick which modules to bring back.
- **Separate world settings from personal ones** on import, so you can copy a world's configuration
  without dragging someone else's interface preferences along with it.
- **Jump to any setting by name** with a search that scrolls to it instead of hiding everything else.
- **Clear out orphaned settings** from modules you have uninstalled, which Foundry otherwise keeps
  forever.

## Requirements

- **Foundry VTT version 13 or 14.**
- **No other modules.** Monarch has no dependencies, including on other Coffee Pub modules.
- **No system requirement.** Monarch does not touch game rules, so it works with any system.

You need to be a GM to use the module set features. Players see the settings buttons but can only
change their own preferences.

## Install

In Foundry, go to **Add-on Modules**, **Install Module**, and paste this manifest URL:

```
https://github.com/Drowbe/coffee-pub-monarch/releases/latest/download/module.json
```

## Where to read more

Everything is on [the wiki](https://github.com/Drowbe/coffee-pub-monarch/wiki).

- [Getting Started](https://github.com/Drowbe/coffee-pub-monarch/wiki/userguide-getting-started) --
  installing, and what to do in the first five minutes.
- [Module Sets](https://github.com/Drowbe/coffee-pub-monarch/wiki/userguide-module-sets) -- saving and
  switching configurations.
- [Backing Up and Restoring Settings](https://github.com/Drowbe/coffee-pub-monarch/wiki/userguide-settings-backup)
- [Pruning Orphaned Settings](https://github.com/Drowbe/coffee-pub-monarch/wiki/userguide-prune-settings)
  -- read this before using that button.
- [Architecture](https://github.com/Drowbe/coffee-pub-monarch/wiki/architecture-monarch) -- for anyone
  changing the module.

<!-- global:ai-assistance -->
## AI Assistance and the Illusion of Good Code

I started writing Foundry modules for use at my own table back in 2020. There were already a ton of amazing modules out there, but they either didn't quite do what I wanted or didn't deliver the kind of user experience I was looking for.

I've been a design leader for more than 20 years, but I spent the first half of my career as a developer, so building my own modules seemed like a fun way to kill some time. I'm a pretty good designer. I'm a decent developer. But, over time, my hand-written code and hacks got a little messy (and memory-leaky, and a little buggy. Feels good to say it out loud.).

Today, the Coffee Pub suite of modules is developed with AI assistance, primarily Claude and Cursor, for documentation, refactoring, debugging, and other development work. Every change is reviewed and committed by me, and nothing reaches a release that I haven't crawled and run at my own table. I can't seem to give up my IDE. The UX design, architecture, and ideas still come from my own fever dreams and chronic lack of sleep.

Testing and verifying a change means running it in Foundry so I can watch the console, break things, fix them, and hone the experience. The repositories carry a set of tools for testing the things that are difficult to catch through review and manual testing alone. They help ensure styles don't conflict, shared coding and documentation standards stay consistent, and the suite of modules continues to work well as a system without silently breaking.

Those checks are there because AI-assisted development can move very quickly, and without oversight, engagement, and planning, it can also go confidently off the rails and deliver the illusion of good code. The AI helps me build faster. It doesn't decide what gets built, its architecture, or how it should work. You can blame this human for that.

If the idea of AI-assisted development keeps you up at night or just isn't your jam, no worries at all. I get it. You do you.
<!-- /global:ai-assistance -->

## The suite

Monarch is one of the Coffee Pub modules. The others are documented from
[the Blacksmith wiki](https://github.com/Drowbe/coffee-pub-blacksmith/wiki). Monarch is the one that
stands alone: it needs none of them, and none of them need it.

## Licence

[MIT](LICENSE). Issues and enhancement requests are welcome.
</content>
</invoke>
