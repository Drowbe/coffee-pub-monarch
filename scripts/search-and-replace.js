// Full Image Path Replacer Macro with Folder Filter, Match Modes, UI Enhancements
new (class TextReplacerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "text-replacer",
      title: "Global Text Replacer",
      template: null,
      popOut: true,
      resizable: true,
      width: 900,
      height: "auto",
      classes: ["text-replacer"]
    });
  }

  getData() { return {}; }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("button[name='clearFields']").on("click", () => {
      // Reset all input fields
      html.find('[name="oldPath"]').val("");
      html.find('[name="newPath"]').val("");
      html.find('[name="folderFilter"]').val("");
      html.find('[name="matchMode"]').val("all");
      html.find('[name="updateActors"]').prop('checked', false);
      html.find('[name="updateItems"]').prop('checked', false);
      html.find('[name="updateScenes"]').prop('checked', false);
      html.find('[name="updateJournals"]').prop('checked', false);
      html.find('[name="updateTables"]').prop('checked', false);
      html.find('[name="updatePlaylists"]').prop('checked', false);
      html.find('[name="targetImages"]').prop('checked', false);
      html.find('[name="targetText"]').prop('checked', false);
      html.find('[name="targetAudio"]').prop('checked', false);
      // Clear the results box
      html.find('#report-area').html('<p>Always back up your files files before running a mass change.</p><p>Run a search before doing a mass replace to verify what will be changed.</p>');
      html.find('input, select, textarea').prop('disabled', false).prop('readonly', false);
    });
    html.find("button[name='runReport']").on("click", () => this._handleReplace(html, false));
    html.find("button[name='runReplace']").on("click", async () => {
      if (!confirm("Are you sure you want to perform a mass replace? This cannot be undone.")) return;
      await this._handleReplace(html, true);
    });
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
    const oldPath = html.find('[name="oldPath"]').val()?.trim();
    const newPath = html.find('[name="newPath"]').val() ?? "";
    const folderFilter = html.find('[name="folderFilter"]').val();
    const matchMode = html.find('[name="matchMode"]').val();
    const reportDiv = html.find("#report-area")[0];
    const log = (msg) => {
      reportDiv.innerHTML += `<div style='margin-bottom:1em;'>${msg}</div>`;
      reportDiv.scrollTop = reportDiv.scrollHeight;
    };

    // Target field checkboxes
    const targetImages = html.find('[name="targetImages"]')[0].checked;
    const targetText = html.find('[name="targetText"]')[0].checked;
    const targetAudio = html.find('[name="targetAudio"]')[0].checked;

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

    const options = {
      actors: html.find('[name="updateActors"]')[0].checked,
      items: html.find('[name="updateItems"]')[0].checked,
      scenes: html.find('[name="updateScenes"]')[0].checked,
      journals: html.find('[name="updateJournals"]')[0].checked,
      tables: html.find('[name="updateTables"]')[0].checked,
      playlists: html.find('[name="updatePlaylists"]')[0].checked
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
            console.log('[TextReplacer] Adding journal-text change:', {
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
          console.error('[TextReplacer] Error updating document:', c, err);
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

  async _renderInner(data) {
    const folders = this._getMatchingFolders();
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
    return $(
      `<style>
.text-replacer-flex {
  display: flex;
  gap: 1em;
  min-width: 800px;
  align-items: flex-start;
  overflow: hidden;
}
.text-replacer-left {
  flex: 1;
  max-width: 400px;
  min-width: 400px;
}
.text-replacer-right {
  flex: 1;
  border: 1px solid #999;
  padding: 1.0em;
  overflow-y: auto;
  background: #f9f9f9;
  min-width: 400px;
  max-height: 1000px;
  height: 100%;
  border-radius: 4px;
}
.text-replacer-right p {
  font-size: 1.2em;
  margin-top: 0.0em;
  margin-bottom: 1.0em;
  text-transform: uppercase;
}
.two-column {
  columns: 2;
  -webkit-columns: 2;
  column-gap: 1em;
}
.form-group {
  margin-bottom: 1em;
  display: block;
}
.button-clear,
.button-replace,
.button-report,
.button-search {
  border: none;
  padding-top: 0px;
padding-bottom: 0px;
padding-left: 0px;
padding-right: 0px;
  border-radius: 5px;
}
.button-report,
.button-search {
  background-color: rgb(34, 86, 39);
  color: #ffffff;
}
.button-replace {
  background-color: rgb(87, 44, 53);
  color: #ffffff;
}
.button-clear {
  background-color: rgb(42, 51, 56);
  color: #ffffff;
}
.form-group label {
  display: block;
  margin-bottom: 0.25em;
}
.text-replacer-left form {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.5em;
}
.replace-result {
  border-bottom: 1px dotted #000000;
  margin-top: 5px;
  margin-bottom: 15px;
  padding-bottom: 15px;
}
.replace-new,
.replace-old {
  font-size: 1.0em;
  margin-top: 5px;
  margin-bottom: 5px;
  font-size: 1.1em;
}
.replace-result-title {
  border: 0px dotted #000000;
  border-radius: 3px;
  background-color: rgb(228, 222, 216);
  padding-top: 4px;
  padding-bottom: 4px;
  padding-left: 5px;
  padding-right: 5px;
  display: flex;
  align-items: center;
}
.replace-title {
  border: 0px dotted #000000;
  display: inline-block;
  font-size: 1.2em;
  font-weight: 900;
  padding-top: 0px;
  padding-bottom: 0px;
  padding-left: 0px;
  padding-right: 0px;
  cursor: pointer;
  margin-top: 0px;
  margin-bottom: 0px;
  margin-left: 0px;
  margin-right: 8px;
  text-transform: uppercase;
}
.replace-title:hover {
  color: #12409f;
}
.replace-result-tag {
  display: inline-block;
  color: rgb(255, 255, 255);
  background-color: rgb(159, 63, 18);
  padding-top: 3px;
  padding-bottom: 2px;
  padding-left: 5px;
  padding-right: 5px;
  border-radius: 3px;
  font-size: 0.8em;
  text-transform: uppercase;
  margin-right: 5px;
}
.replace-field-tag {
  display: inline-block;
  color: #fff;
  background-color: #3a6ea5;
  padding: 3px 5px 2px 5px;
  border-radius: 3px;
  font-size: 0.8em;
  text-transform: uppercase;
  margin-right: 0px;
}
.code-old-label,
.code-new-label {
  padding-top: 1px;
  padding-bottom: 1px;
  padding-left: 5px;
  padding-right: 5px;
  margin-right: 5px;
  font-weight: 900;
  display: inline-block;
  width: 40px;
  text-align: right;
  background-color: #dedbd2;
  border-radius: 3px;
}
.code-new-label {
  color: #060;
}
.code-old-label {
  color: #600;
}
.code-new {
  color: #060;
}
.code-old {
  color: #600;
}

</style>
      <div class="text-replacer-flex">
        <div class="text-replacer-left">
          <form>
            <label for="oldPath">Current Text</label>
            <div class="form-group">
              <input type="text" name="oldPath" id="oldPath" placeholder="e.g. modules/assets" style="width:100%;" />
            </div>
            <label for="newPath">New Text</label>
            <div class="form-group">
              <input type="text" name="newPath" id="newPath" placeholder="e.g. newplace/newfolder" style="width:100%;" />
            </div>
            <label for="folderFilter">Folder Filter</label>
            <div class="form-group">
              <select name="folderFilter" id="folderFilter" style="width:100%;">
                <option value="">(All Folders)</option>
                ${folders.map(f => {
                  const type = getFolderType(f);
                  return `<option value="${f.id}">${f.name} (${getFolderTypeDisplay(type)})</option>`;
                }).join("")}
              </select>
            </div>
            <label for="matchMode">Match Mode</label>
            <div class="form-group">
              <select name="matchMode" id="matchMode" style="width:100%;">
                <option value="all">All Text</option>
                <option value="path">Paths Only</option>
                <option value="filename">Filenames Only</option>
              </select>
            </div>
            <fieldset>
              <legend>Update These Document Types</legend>
              <div class="two-column">
                <label><input type="checkbox" name="updateActors"/> Actors</label><br/>
                <label><input type="checkbox" name="updateItems"/> Items</label><br/>
                <label><input type="checkbox" name="updateScenes"/> Scenes</label><br/>
                <label><input type="checkbox" name="updateJournals"/> Journals</label><br/>
                <label><input type="checkbox" name="updateTables"/> Roll Tables</label><br/>
                <label><input type="checkbox" name="updatePlaylists"/> Playlists</label>
              </div>
            </fieldset>
            <fieldset>
              <legend>Target Fields</legend>
              <div class="two-column">
                <label><input type="checkbox" name="targetImages"/> Images</label><br/>
                <label><input type="checkbox" name="targetText"/> Text</label><br/>
                <label><input type="checkbox" name="targetAudio"/> Audio</label>
              </div>
            </fieldset>
            <div class="form-group" style="margin-top:1em;">
              <button type="button" name="clearFields" class="button-clear">CLEAR</button>
              <button type="button" name="runReport" class="button-search">RUN REPORT</button>
              <button type="button" name="runReplace" class="button-replace">MASS REPLACE</button>
            </div>
          </form>
        </div>
        <div id="report-area" class="text-replacer-right">
          <p>Always back up your files files before running a mass change.</p>
          <p>Run a search before doing a mass replace to verify what will be changed.</p>
        </div>
      </div>`
    );
  }
})().render(true);

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