// Full Image Path Replacer Macro with Folder Filter, Match Modes, UI Enhancements

// ================================================================== 
// ===== IMPORTS ====================================================
// ================================================================== 

// Grab the module data
import { MODULE  } from './const.js';

// ================================================================== 
// ===== CLASS ======================================================
// ================================================================== 


new (class TextReplacerApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "text-replacer",
    classes: ["text-replacer"],
    tag: "div",
    window: {
      title: "Global Text Replacer",
      resizable: true
    },
    position: {
      width: 900,
      height: "auto"
    }
  };

  static PARTS = {
    main: {
      template: "modules/coffee-pub-monarch/templates/text-replacer.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    // Helper to get the document type for a folder
    function getFolderType(folder) {
      // Try folder.type if it's not 'Folder'
      if (folder.type && folder.type !== 'Folder') return folder.type;
      // Fallback: look at the first document in contents
      if (folder.contents && folder.contents.length > 0) {
        const doc = folder.contents[0];
        // Try doc.documentName, then doc.constructor.documentName
        return doc.documentName || (doc.constructor && doc.constructor.documentName) || "Unknown";
      }
      return "Unknown";
    }
    // Helper to map to user-friendly, capitalized type
    function getFolderTypeDisplay(type) {
      const map = {
        Actor: "Actor",
        Item: "Item",
        JournalEntry: "Journal",
        Scene: "Scene",
        RollTable: "Roll Table",
        Playlist: "Playlist"
      };
      return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }
    context.folders = this._getMatchingFolders().map(f => ({
      id: f.id,
      label: `${f.name} (${getFolderTypeDisplay(getFolderType(f))})`
    }));
    return context;
  }

  _onRender(context, options) {
    this._activateListeners(this.element);
  }

  _activateListeners(html) {
    const clearBtn = html.querySelector("button[name='clearFields']");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        // Reset all input fields
        const oldPathInput = html.querySelector('[name="oldPath"]');
        if (oldPathInput) oldPathInput.value = "";
        const newPathInput = html.querySelector('[name="newPath"]');
        if (newPathInput) newPathInput.value = "";
        const folderFilterSelect = html.querySelector('[name="folderFilter"]');
        if (folderFilterSelect) folderFilterSelect.value = "";
        const matchModeSelect = html.querySelector('[name="matchMode"]');
        if (matchModeSelect) matchModeSelect.value = "all";
        const updateActorsCheckbox = html.querySelector('[name="updateActors"]');
        if (updateActorsCheckbox) updateActorsCheckbox.checked = false;
        const updateItemsCheckbox = html.querySelector('[name="updateItems"]');
        if (updateItemsCheckbox) updateItemsCheckbox.checked = false;
        const updateScenesCheckbox = html.querySelector('[name="updateScenes"]');
        if (updateScenesCheckbox) updateScenesCheckbox.checked = false;
        const updateJournalsCheckbox = html.querySelector('[name="updateJournals"]');
        if (updateJournalsCheckbox) updateJournalsCheckbox.checked = false;
        const updateTablesCheckbox = html.querySelector('[name="updateTables"]');
        if (updateTablesCheckbox) updateTablesCheckbox.checked = false;
        const updatePlaylistsCheckbox = html.querySelector('[name="updatePlaylists"]');
        if (updatePlaylistsCheckbox) updatePlaylistsCheckbox.checked = false;
        const targetImagesCheckbox = html.querySelector('[name="targetImages"]');
        if (targetImagesCheckbox) targetImagesCheckbox.checked = false;
        const targetTextCheckbox = html.querySelector('[name="targetText"]');
        if (targetTextCheckbox) targetTextCheckbox.checked = false;
        const targetAudioCheckbox = html.querySelector('[name="targetAudio"]');
        if (targetAudioCheckbox) targetAudioCheckbox.checked = false;
        // Clear the results box
        const reportArea = html.querySelector('#report-area');
        if (reportArea) {
          reportArea.innerHTML = '<p>Always back up your files files before running a mass change.</p><p>Run a search before doing a mass replace to verify what will be changed.</p>';
        }
        html.querySelectorAll('input, select, textarea').forEach(input => {
          input.disabled = false;
          input.readOnly = false;
        });
      });
    }
    const runReportBtn = html.querySelector("button[name='runReport']");
    if (runReportBtn) {
      runReportBtn.addEventListener("click", () => this._handleReplace(html, false));
    }
    const runReplaceBtn = html.querySelector("button[name='runReplace']");
    if (runReplaceBtn) {
      runReplaceBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to perform a mass replace? This cannot be undone.")) return;
        await this._handleReplace(html, true);
      });
    }
  }

  _groupBy(array, keyFn) {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  _getAllFolderContents(folder) {
    const contents = [...folder.contents];
    for (const child of folder.children) contents.push(...this._getAllFolderContents(child));
    return contents;
  }

  _getMatchingFolders() {
    const all = game.folders.contents;
    return all.filter(f => f.documentName && f.contents.length);
  }

  async _handleReplace(html, doReplace = false) {
    const oldPathInput = html.querySelector('[name="oldPath"]');
    const oldPath = oldPathInput ? oldPathInput.value?.trim() : '';
    const newPathInput = html.querySelector('[name="newPath"]');
    const newPath = newPathInput ? newPathInput.value ?? "" : "";
    const folderFilterSelect = html.querySelector('[name="folderFilter"]');
    const folderFilter = folderFilterSelect ? folderFilterSelect.value : '';
    const matchModeSelect = html.querySelector('[name="matchMode"]');
    const matchMode = matchModeSelect ? matchModeSelect.value : 'all';
    const reportDiv = html.querySelector("#report-area");
    if (!reportDiv) return;
    const log = (msg) => {
      reportDiv.innerHTML += `<div style='margin-bottom:1em;'>${msg}</div>`;
      reportDiv.scrollTop = reportDiv.scrollHeight;
    };

    // Target field checkboxes
    const targetImagesCheckbox = html.querySelector('[name="targetImages"]');
    const targetImages = targetImagesCheckbox ? targetImagesCheckbox.checked : false;
    const targetTextCheckbox = html.querySelector('[name="targetText"]');
    const targetText = targetTextCheckbox ? targetTextCheckbox.checked : false;
    const targetAudioCheckbox = html.querySelector('[name="targetAudio"]');
    const targetAudio = targetAudioCheckbox ? targetAudioCheckbox.checked : false;

    if (!targetImages && !targetText && !targetAudio) {
      ui.notifications.warn("Please select at least one target field (Images, Text, or Audio).", {permanent: false});
      reportDiv.innerHTML = `<p style='color:darkred;'><strong>Warning:</strong> Please select at least one target field (Images, Text, or Audio).</p>`;
      return;
    }

    if (!oldPath) {
      ui.notifications.error("Please provide the text to search for.");
      return;
    }

    reportDiv.innerHTML = doReplace
      ? `<p><strong style="color: orange;">Running replacements...</strong></p>`
      : `<p><strong>Generating report...</strong></p>`;

    const updateActorsCheckbox = html.querySelector('[name="updateActors"]');
    const updateItemsCheckbox = html.querySelector('[name="updateItems"]');
    const updateScenesCheckbox = html.querySelector('[name="updateScenes"]');
    const updateJournalsCheckbox = html.querySelector('[name="updateJournals"]');
    const updateTablesCheckbox = html.querySelector('[name="updateTables"]');
    const updatePlaylistsCheckbox = html.querySelector('[name="updatePlaylists"]');
    const options = {
      actors: updateActorsCheckbox ? updateActorsCheckbox.checked : false,
      items: updateItemsCheckbox ? updateItemsCheckbox.checked : false,
      scenes: updateScenesCheckbox ? updateScenesCheckbox.checked : false,
      journals: updateJournalsCheckbox ? updateJournalsCheckbox.checked : false,
      tables: updateTablesCheckbox ? updateTablesCheckbox.checked : false,
      playlists: updatePlaylistsCheckbox ? updatePlaylistsCheckbox.checked : false
    };

    // Warn if no document type is selected
    if (!options.actors && !options.items && !options.scenes && !options.journals && !options.tables && !options.playlists) {
      ui.notifications.warn("Please select at least one document type (Actors, Items, Scenes, Journals, Roll Tables, or Playlists).", {permanent: false});
      reportDiv.innerHTML = `<p style='color:darkred;'><strong>Warning:</strong> Please select at least one document type (Actors, Items, Scenes, Journals, Roll Tables, or Playlists).</p>`;
      return;
    }

    const changes = [];
    const match = (value) => {
      if (matchMode === "path") {
        // Only match if value looks like a path: must contain at least one '/' and end in a valid extension
        const pathRegex = /[\w\-./]+\.[a-zA-Z0-9]{1,4}/g;
        return pathRegex.test(value) && value.includes(oldPath);
      }
      if (matchMode === "filename") {
        // Only match if value contains a filename (no '/' in the match, ends in valid extension)
        const filename = value.split("/").pop();
        const lastDot = filename.lastIndexOf('.');
        if (lastDot === -1) return false;
        const base = filename.slice(0, lastDot);
        const ext = filename.slice(lastDot + 1);
        if (ext.length < 1 || ext.length > 4) return false;
        return base.includes(oldPath);
      }
      return value.includes(oldPath);
    };

    // Helper for extracting the matched portion for report display
    function getMatchedPortion(value, matchMode, oldPath) {
      if (matchMode === "path") {
        // Match only substrings that look like file paths
        const pathRegex = /[\w\-./]+\.[a-zA-Z0-9]{1,4}/g;
        const matches = value.match(pathRegex);
        if (!matches) return null;
        // Return the first match that contains oldPath
        return matches.find(m => m.includes(oldPath)) || null;
      }
      if (matchMode === "filename") {
        // Match only substrings that look like filenames (no '/' in the match, ends in valid extension)
        const filenameRegex = /\b([\w\-\.]+)\.([a-zA-Z0-9]{1,4})\b/g;
        let m;
        while ((m = filenameRegex.exec(value)) !== null) {
          const base = m[1];
          const ext = m[2];
          if (base.includes(oldPath)) return `${base}.${ext}`;
        }
        return null;
      }
      if (value.includes(oldPath)) return oldPath;
      return null;
    }

    // Collect for Images
    const collect = (collection, imgField, type, fieldTag) => {
      if (!options[type] || !targetImages) return;
      let docs = collection.contents;
      if (folderFilter) {
        const folder = game.folders.get(folderFilter);
        if (folder) {
          const gatherFolderIds = (f) => [f.id, ...(f.children ? f.children.flatMap(gatherFolderIds) : [])];
          const allowedFolderIds = new Set(gatherFolderIds(folder));
          docs = docs.filter(doc => doc.folder && allowedFolderIds.has(doc.folder.id));
        } else {
          return;
        }
      }
      const typeMap = {
        actors: "Actor",
        items: "Item",
        journals: "JournalEntry",
        tables: "RollTable",
        playlists: "Playlist",
        scenes: "Scene"
      };
      const expectedType = typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1, -1);
      docs = docs.filter(doc => doc.documentName === expectedType);
      for (const doc of docs) {
        const img = foundry.utils.getProperty(doc, imgField);
        if (typeof img === "string" && match(img)) {
          // Always set c.old to the full value for images/paths
          let newVal = (matchMode === "filename")
            ? img.replace(oldPath, newPath)
            : img.replaceAll(oldPath, newPath);
          changes.push({ type, name: doc.name, field: imgField, old: img, new: newVal, id: doc.id, docClass: collection.documentClass, folder: doc.folder, fieldTag: "IMAGES" });
        }
        // For actors, also check the token path
        if (type === 'actors') {
          const tokenPath = foundry.utils.getProperty(doc, 'prototypeToken.texture.src');
          if (typeof tokenPath === "string" && match(tokenPath)) {
            let newVal = (matchMode === "filename")
              ? tokenPath.replace(oldPath, newPath)
              : tokenPath.replaceAll(oldPath, newPath);
            changes.push({ type, name: doc.name, field: 'prototypeToken.texture.src', old: tokenPath, new: newVal, id: doc.id, docClass: collection.documentClass, folder: doc.folder, fieldTag: "IMAGES" });
          }
        }
      }
    };

    collect(game.actors, "img", "actors", "IMAGES");
    collect(game.items, "img", "items", "IMAGES");
    collect(game.tables, "img", "tables", "IMAGES");
    collect(game.playlists, "img", "playlists", "IMAGES");

    // Scenes (Images)
    if (options["scenes"] && targetImages) {
      let scenesToProcess = game.scenes.contents;
      if (folderFilter) {
        const folder = game.folders.get(folderFilter);
        if (folder && folder.type === "Scene") {
          const gatherFolderIds = (f) => [f.id, ...(f.children ? f.children.flatMap(gatherFolderIds) : [])];
          const allowedFolderIds = new Set(gatherFolderIds(folder));
          scenesToProcess = scenesToProcess.filter(scene => scene.folder && allowedFolderIds.has(scene.folder.id));
        } else {
          scenesToProcess = [];
        }
      }
      for (const scene of scenesToProcess) {
        const bg = scene.background?.src;
        if (typeof bg === "string" && match(bg)) {
          let newVal = (matchMode === "filename")
            ? bg.replace(oldPath, newPath)
            : bg.replaceAll(oldPath, newPath);
          changes.push({ type: "scene", name: scene.name, field: "background.src", old: bg, new: newVal, id: scene.id, folder: scene.folder, fieldTag: "IMAGES" });
        }
      }
    }

    // Journals (Images & Text)
    if (options["journals"]) {
      let journalsToProcess = game.journal.contents;
      if (folderFilter) {
        const folder = game.folders.get(folderFilter);
        if (folder) {
          const gatherFolderIds = (f) => [f.id, ...(f.children ? f.children.flatMap(gatherFolderIds) : [])];
          const allowedFolderIds = new Set(gatherFolderIds(folder));
          journalsToProcess = journalsToProcess.filter(journal => journal.folder && allowedFolderIds.has(journal.folder.id));
        } else {
          journalsToProcess = [];
        }
      }
      for (const journal of journalsToProcess) {
        for (const page of journal.pages.contents) {
          if (page.type === "image" && targetImages && match(page.src)) {
            let newVal = (matchMode === "filename")
              ? page.src.replace(oldPath, newPath)
              : page.src.replaceAll(oldPath, newPath);
            changes.push({ type: "journal-image", name: `${journal.name} → ${page.name}`, field: "src", old: page.src, new: newVal, id: journal.id, pageId: page.id, folder: journal.folder, fieldTag: "IMAGES" });
          }
          if (page.type === "text" && targetText && page.text?.content?.includes(oldPath)) {
            let matches = [];
            if (matchMode === "filename") {
              const filenameRegex = /\b([\w\-\.]+)\.([a-zA-Z0-9]{1,4})\b/g;
              let m;
              while ((m = filenameRegex.exec(page.text.content)) !== null) {
                const base = m[1];
                const ext = m[2];
                if (base.includes(oldPath)) matches.push(`${base}.${ext}`);
              }
            } else if (matchMode === "path") {
              const pathRegex = /[\w\-./]+\.[a-zA-Z0-9]{1,4}/g;
              let m;
              while ((m = pathRegex.exec(page.text.content)) !== null) {
                if (m[0].includes(oldPath)) matches.push(m[0]);
              }
            } else {
              const regex = new RegExp(`${oldPath}`, "g");
              let m;
              while ((m = regex.exec(page.text.content)) !== null) {
                matches.push(oldPath);
              }
            }
            // LOG: fullText and matches
            console.log('COFFEE PUB • MONARCH | [TextReplacer] Adding journal-text change:', {
              fullText: page.text.content,
              matches
            });
            for (const matchText of matches) {
              let newVal = matchText.replace(oldPath, newPath);
              changes.push({ type: "journal-text", name: `${journal.name} → ${page.name}`, field: "text.content", old: matchText, new: newVal, id: journal.id, pageId: page.id, fullText: page.text.content, folder: journal.folder, fieldTag: "TEXT" });
            }
          }
        }
      }
    }

    // Playlists (Audio)
    if (options["playlists"] && targetAudio) {
      let playlistsToProcess = game.playlists.contents;
      if (folderFilter) {
        const folder = game.folders.get(folderFilter);
        if (folder) {
          const gatherFolderIds = (f) => [f.id, ...(f.children ? f.children.flatMap(gatherFolderIds) : [])];
          const allowedFolderIds = new Set(gatherFolderIds(folder));
          playlistsToProcess = playlistsToProcess.filter(playlist => playlist.folder && allowedFolderIds.has(playlist.folder.id));
        } else {
          playlistsToProcess = [];
        }
      }
      for (const playlist of playlistsToProcess) {
        for (const sound of playlist.sounds.contents) {
          if (typeof sound.path === "string" && match(sound.path)) {
            let newVal = (matchMode === "filename")
              ? sound.path.replace(oldPath, newPath)
              : sound.path.replaceAll(oldPath, newPath);
            changes.push({ type: "playlists", name: `${playlist.name} → ${sound.name}`, field: "path", old: sound.path, new: newVal, id: playlist.id, soundId: sound.id, folder: playlist.folder, fieldTag: "AUDIO" });
          }
        }
      }
    }

    if (!changes.length) return reportDiv.innerHTML += `<p><em>No matching paths found.</em></p>`;

    if (!doReplace) {
      reportDiv.innerHTML += renderResults(changes, matchMode, oldPath, newPath, '');
      setTimeout(() => {
        reportDiv.querySelectorAll('.replace-title').forEach(el => {
          el.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const id = this.getAttribute('data-id');
            const pageId = this.getAttribute('data-page-id');
            const soundId = this.getAttribute('data-sound-id');
            if (type === 'actors') game.actors.get(id)?.sheet.render(true);
            else if (type === 'items') game.items.get(id)?.sheet.render(true);
            else if (type === 'scene') game.scenes.get(id)?.sheet.render(true);
            else if (type === 'journals' || type === 'journal-image' || type === 'journal-text') {
              const journal = game.journal.get(id);
              if (journal && pageId) {
                const page = journal.pages.get(pageId);
                if (page) journal.sheet.render(true, { pageId: page.id });
                else journal.sheet.render(true);
              } else if (journal) {
                journal.sheet.render(true);
              }
            }
            else if (type === 'tables') game.tables.get(id)?.sheet.render(true);
            else if (type === 'playlists') game.playlists.get(id)?.sheet.render(true);
          });
        });
      }, 0);
      return;
    } else {
      // Mass replace: show results like the report, but with a different lead line and count
      // Actually perform the replacements in Foundry documents
      for (const c of changes) {
        try {
          if (c.type === 'actors') {
            const doc = game.actors.get(c.id);
            if (doc) await doc.update({ [c.field]: c.new });
          } else if (c.type === 'items') {
            const doc = game.items.get(c.id);
            if (doc) await doc.update({ [c.field]: c.new });
          } else if (c.type === 'scene') {
            const doc = game.scenes.get(c.id);
            if (doc && c.field === 'background.src') {
              await doc.update({ 'background.src': c.new });
            }
          } else if (c.type === 'tables') {
            const doc = game.tables.get(c.id);
            if (doc) await doc.update({ [c.field]: c.new });
          } else if (c.type === 'playlists') {
            // If soundId is present, update the sound path
            const doc = game.playlists.get(c.id);
            if (doc && c.soundId) {
              const sound = doc.sounds.get(c.soundId);
              if (sound) await sound.update({ path: c.new });
            } else if (doc) {
              await doc.update({ [c.field]: c.new });
            }
          } else if (c.type === 'journal-image') {
            // Update the image page src
            const journal = game.journal.get(c.id);
            if (journal && c.pageId) {
              const page = journal.pages.get(c.pageId);
              if (page) await page.update({ src: c.new });
            }
          } else if (c.type === 'journal-text') {
            // Update the text page content
            const journal = game.journal.get(c.id);
            if (journal && c.pageId) {
              const page = journal.pages.get(c.pageId);
              if (page) {
                // Replace only the first occurrence of c.old in the fullText with c.new
                let content = c.fullText;
                // Use a regex to replace only the first occurrence, case-insensitive
                const esc = c.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(esc, 'i');
                content = content.replace(regex, c.new);
                await page.update({ 'text.content': content });
              }
            }
          }
        } catch (err) {
          console.error('COFFEE PUB • MONARCH | [TextReplacer] Error updating document:', c, err);
        }
      }
      reportDiv.innerHTML = renderResults(changes, matchMode, oldPath, newPath, '') + `<p><strong style='color:darkgreen;'>Success!</strong> ${changes.length} references updated.</p>`;
      setTimeout(() => {
        reportDiv.querySelectorAll('.replace-title').forEach(el => {
          el.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const id = this.getAttribute('data-id');
            const pageId = this.getAttribute('data-page-id');
            const soundId = this.getAttribute('data-sound-id');
            if (type === 'actors') game.actors.get(id)?.sheet.render(true);
            else if (type === 'items') game.items.get(id)?.sheet.render(true);
            else if (type === 'scene') game.scenes.get(id)?.sheet.render(true);
            else if (type === 'journals' || type === 'journal-image' || type === 'journal-text') {
              const journal = game.journal.get(id);
              if (journal && pageId) {
                const page = journal.pages.get(pageId);
                if (page) journal.sheet.render(true, { pageId: page.id });
                else journal.sheet.render(true);
              } else if (journal) {
                journal.sheet.render(true);
              }
            }
            else if (type === 'tables') game.tables.get(id)?.sheet.render(true);
            else if (type === 'playlists') game.playlists.get(id)?.sheet.render(true);
          });
        });
      }, 0);
      return;
    }
  }
})().render({ force: true });

// Helper to bold the search string in a value
function boldSearch(str, search) {
  if (!search) return str;
  const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(esc, 'gi'), match => `<span style=\"font-weight:bold;color:#12409f\">${match}</span>`);
}
// Helper to add context for all text mode (multiple matches, full sentence/line, and correct new context)
function allContextsWithBold(str, search, replace) {
  if (!search) return [{old: str, new: str}];
  // Strip HTML tags for context extraction
  const plain = str.replace(/<[^>]+>/g, '');
  const esc = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(esc, 'gi');
  let result = [];
  let m;
  while ((m = regex.exec(plain)) !== null) {
    // Find sentence boundaries
    let start = plain.lastIndexOf('.', m.index);
    let excl = plain.lastIndexOf('!', m.index);
    let quest = plain.lastIndexOf('?', m.index);
    let br = plain.lastIndexOf('\n', m.index);
    start = Math.max(start, excl, quest, br);
    start = start === -1 ? 0 : start + 1;
    let endDot = plain.indexOf('.', m.index + search.length);
    let endExcl = plain.indexOf('!', m.index + search.length);
    let endQuest = plain.indexOf('?', m.index + search.length);
    let endBr = plain.indexOf('\n', m.index + search.length);
    let ends = [endDot, endExcl, endQuest, endBr].filter(e => e !== -1);
    let end = ends.length ? Math.min(...ends) : plain.length;
    if (end === plain.length && plain.indexOf('\n', m.index + search.length) !== -1) {
      end = plain.indexOf('\n', m.index + search.length);
    }
    let context = plain.slice(start, end).trim();
    // For old: bold the matched search term
    let oldContext = context.replace(new RegExp(esc, 'gi'), mm => `<span style=\"font-weight:bold;color:#12409f\">${mm}</span>`);
    // For new: replace only the matched occurrence in this context, bold the replacement
    let relIndex = m.index - start;
    let before = context.slice(0, relIndex);
    let after = context.slice(relIndex + search.length);
    let newContext = before + `<span style=\"font-weight:bold;color:#12409f\">${replace}</span>` + after;
    result.push({old: oldContext, new: newContext});
  }
  return result.length ? result : [{old: plain, new: plain}];
}
function renderResults(changes, matchMode, oldPath, newPath, leadLine) {
  let html = leadLine;
  html += changes.map(c => {
    let title = c.name;
    let folderPath = [];
    let folder = c.folder;
    while (folder) {
      folderPath.unshift(folder.name);
      folder = folder.parent;
    }
    if (c.type === "journal-image" || c.type === "journal-text") {
      if (folderPath.length) {
        title = folderPath.join(' → ') + ' → ' + c.name;
      }
    } else {
      if (folderPath.length) {
        title = folderPath.join(' → ') + ' → ' + c.name;
      }
    }
    let isTextField = c.type === 'journal-text';
    if (matchMode === 'all' && isTextField) {
      // Show all matches with context for text fields, with correct new context
      const contexts = allContextsWithBold(c.fullText || c.old, oldPath, newPath);
      return contexts.map(ctx => `
        <div class=\"replace-result\">
          <div class=\"replace-result-title\">
            <div class=\"replace-title\" data-type=\"${c.type}\" data-id=\"${c.id}\"${c.pageId ? ` data-page-id=\"${c.pageId}\"` : ''}${c.soundId ? ` data-sound-id=\"${c.soundId}\"` : ''}>${title}</div>
            <div class=\"replace-result-tag\">${c.type}</div><div class=\"replace-field-tag\">${c.fieldTag}</div>
          </div>
          <div class=\"replace-old\">
            <span class=\"code-old-label\">OLD</span>
            <span class=\"code-old\">${ctx.old}</span>
          </div>
          <div class=\"replace-new\">
            <span class=\"code-new-label\">NEW</span>
            <span class=\"code-new\">${ctx.new}</span>
          </div>
        </div>`).join('');
    } else {
      let oldDisplay = boldSearch(c.old, oldPath);
      let newDisplay = boldSearch(c.new, newPath);
      return `
        <div class=\"replace-result\">
          <div class=\"replace-result-title\">
            <div class=\"replace-title\" data-type=\"${c.type}\" data-id=\"${c.id}\"${c.pageId ? ` data-page-id=\"${c.pageId}\"` : ''}${c.soundId ? ` data-sound-id=\"${c.soundId}\"` : ''}>${title}</div>
            <div class=\"replace-result-tag\">${c.type}</div><div class=\"replace-field-tag\">${c.fieldTag}</div>
          </div>
          <div class=\"replace-old\">
            <span class=\"code-old-label\">OLD</span>
            <span class=\"code-old\">${oldDisplay}</span>
          </div>
          <div class=\"replace-new\">
            <span class=\"code-new-label\">NEW</span>
            <span class=\"code-new\">${newDisplay}</span>
          </div>
        </div>`;
    }
  }).join("");
  return html;
}