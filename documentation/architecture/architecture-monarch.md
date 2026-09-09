# Monarch Architecture

**Audience:** anyone changing Coffee Pub Monarch.

How Monarch attaches itself to Foundry's Module Management and Configure Settings windows, and what it
knows about the settings stores underneath them.

Monarch is a leaf module. It declares no dependencies, exposes no API, and nothing in the suite calls
into it. Everything it does is done by decorating two core windows it does not own, which is the
single fact that shapes the rest of this document: Monarch's stability is a function of core's markup
and hook names, not of its own structure.

## The shape of the module

One class, `CoffeePubMonarch` in `scripts/monarch.js`, with static methods and no instances. It
registers one world setting, `moduleSets`, with `config: false` so it never appears in the settings
window. `scripts/const.js` reads `module.json` at load and exports the id, title, and version, so no
version string is ever written in code.

`scripts/replace-name.js` and `scripts/search-and-replace.js` are **not loaded**. They appear in
`scripts/` but are absent from `module.json`'s `esmodules` and are imported by nothing.
`replace-name.js` reads `this.uuid` and `event.shiftKey` at the top level and would throw immediately
if it were ever loaded as an ES module. They are macro sources kept beside the code, and they should
be excluded from any audit that counts call sites in shipped code.

## Where Monarch attaches

Four hooks, in `initialize()`:

| Hook | Purpose |
|---|---|
| `renderModuleManagement` | Inserts the module set controls and binds their listeners |
| `renderSettingsConfig` | Inserts Import, Export, and Prune, plus the jump-to-setting search |
| `renderExtendedSettingsConfig` | The same, for hosted setups that render a different class |
| `closeDependencyResolution` | Refreshes the set highlighting after core resolves dependencies |

Both windows Monarch decorates are ApplicationV2, so the second hook argument is a native
`HTMLElement` and not a jQuery object. Anything reached for on it must be `querySelector`,
`addEventListener`, and native DOM. Handler references are stored per-window in a `WeakMap`
(`_handlerStorage`) so they can be removed when the window closes, which is what `.data()` used to do.

## The selectors it depends on, and how they move

Monarch inserts into markup it does not own, so a core template change is a silent break rather than
an error. The anchors it uses are held in `SETTINGS_SELECTORS` at the top of the class, each listing
the v14 form first and the v13 form after so one codebase serves both generations.

What moved between v13 and v14:

- **`button.reset-all` became `button.reset-defaults`** (`templates/category-browser/reset.hbs`).
- **The settings sidebar lost its `sidebar` class.** It is now `<aside class="flexcol">`, identified
  by its ApplicationV2 part name, so the durable selector is
  `aside[data-application-part="sidebar"]`.

Both old names still appear in v14's `foundry2.css` as dead rules
(`.package-configuration aside.sidebar .reset-all`), so grepping a Foundry install for the old
selector returns a hit and looks like a pass. **Settle a selector against the template that renders
it, never against the stylesheet.**

Two anchors did not move and need no compatibility list: `search.flexrow` in
`templates/sidebar/apps/module-management.hbs`, and `div.categories.flexcol` in
`templates/category-browser/main.hbs`.

## The dependency prompt is not a Dialog

Core's dependency prompt is `foundry.applications.settings.DependencyResolution`, an ApplicationV2.
It therefore fires `renderDependencyResolution` and `closeDependencyResolution`, and never
`renderDialog`.

Monarch previously listened on `renderDialog` and matched `dialog.data.title` against the literal
string "Manage Module Dependencies". That registration succeeded and never fired. This is the failure
mode worth knowing about generally: **a hook whose underlying Application class was renamed still
registers without error and simply never runs.** There is no warning, and the only way to find one is
to instrument `Hooks.callAll` and exercise the window.

Monarch now refreshes on `closeDependencyResolution`. The prompt's `form.closeOnSubmit` is true, so
confirming routes through close as well; cancelling refreshes redundantly, which costs nothing. The
refresh is deferred by a timeout because `ModuleManagement#_onSelectDependencies` sets the checkbox
`checked` properties directly **without dispatching a `change` event**, so no listener on the
checkboxes can observe it.

A guarded `renderDialog` fallback remains for Foundry 13. It is confirmed dead on v14 and should be
deleted when `module.json`'s minimum reaches 14.

## The settings stores

This is the part of Foundry that Monarch's Export, Import, and Prune features rest on, and the part
most easily got wrong.

**There are two different things that both sound like "the settings".**
`game.settings.settings` is the **registry**: a `Map` of setting configurations, populated by modules
calling `register()`. `game.settings.storage` is the **store**: where values actually live. A feature
can look healthy while reading the registry and be entirely broken in the store, which is what
happened to Prune.

`game.settings.storage` is a `Map` of three scopes as of v14:

| Scope | Where the values live | How to delete one |
|---|---|---|
| `client` | `window.localStorage`, keyed `"namespace.key"` | `localStorage.removeItem(key)` |
| `world` | `Setting` documents in a `WorldSettings` collection, `user` is null | `doc.delete()` |
| `user` | The same collection, `user` is a user id | `doc.delete()` |

**`user` is new in v14** and is a per-user preference stored server-side rather than in the browser.
Anything treating scope as a world/client binary drops it. Monarch's settings import groups it with
`client` for the purposes of the "personal settings" checkbox, since it is a personal preference, and
applies no GM gate to it because a user owns their own user-scoped settings.

**`WorldSettings` is not a localStorage-shaped interface**, despite `ClientSettings#storage` being
documented as "Each storage interface shares the same API as window.localStorage". That is true of the
client entry, which literally is `window.localStorage`, and false of the world entry, which
implements only `getSetting` and `getItem`. **There is no `removeItem` and no `setItem`.** Deleting a
world- or user-scoped setting goes through the `Setting` document.

An orphaned `Setting` -- one whose namespace is no longer installed -- deletes normally. Its `config`
getter resolves to `undefined` because nothing registered it, but `_castType` only runs during data
preparation and on create and update, never on delete. The document is an ordinary document; the
registry is a lookup table for interpreting its value, not a precondition for its existence.

## Why Prune cannot touch client-scoped settings

Prune removes orphaned settings, and it deliberately operates only on `Setting` documents. This is a
constraint rather than an omission, and it will look like an easy gap to close, so the reasoning is
recorded here.

**The world store is self-identifying and localStorage is not.** Every row in `WorldSettings` is a
`Setting` document, so membership in that collection is proof that a row is a setting. localStorage is
shared with everything else on the origin, and there is nothing in it that distinguishes an orphaned
setting from arbitrary data a module chose to store.

The orphan test is "the namespace is not an installed package", which is an exclusion test. Run over a
shared store it does not identify settings; it identifies everything that is not accounted for, which
is a different and much larger set. Measured on a live world of 664 localStorage keys, a filter
requiring a package-id-shaped prefix and a JSON-parseable value still put 181 keys in the delete list,
including `forge-vtt.apiKey` -- a live credential whose namespace is not an installed module -- and
`recycle-bin.<world>.bin`, which holds recoverable deleted documents. The JSON gate rejected zero of
the 664.

The reason the shape test fails is that **the text before the first dot is not a namespace.** Modules
write whatever keys they like: multi-part names, embedded document UUIDs, caches. A real example from
the suite is
`blacksmith-gm-notes-field-collapse-JournalEntry.oAL7dpX6XFm8IPzh.JournalEntryPage.3f3ygHfnq5HQCMjA`,
whose prefix is package-id-shaped and is not a package id.

Inverting the test, so that a key must positively match a registered client-scoped setting, is sound
and yields nothing: an orphan is by definition a setting no longer in the registry. So client-scope
pruning is not merely unimplemented, it is not possible on this store, and the delete loop refuses
`scope === 'client'` as a backstop rather than relying on discovery never producing one.

**The general rule: an exclusion test over a shared store is not a filter, and no amount of
shape-matching makes it one.**

## Settling a question about Foundry's internals

A Foundry install ships uncompiled sources. `resources/app/client/**/*.mjs` and
`resources/app/templates/**/*.hbs` answer class names, hook names, schemas, and selectors directly,
and are far easier to read than the bundled `foundry.mjs`. Two cautions learned here: the published
API documentation on foundryvtt.com has been wrong about schema field names, and a stylesheet can
retain rules for markup that no template emits. The template and the schema are the authorities.

`game.systems` does not exist in a world context. There is only `game.system`, the active one.
Monarch's references to `game.systems` are all guarded and are effectively dead branches; the
installed-system set is populated from `game.system?.id`.
</content>
</invoke>
