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
      if (matchMode === "path") return value.split("/").slice(0, -1).join("/").startsWith(oldPath);
      if (matchMode === "filename") return value.split("/").pop().startsWith(oldPath);
      return value.includes(oldPath);
    };

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
          changes.push({ type, name: doc.name, field: imgField, old: img, new: img.replaceAll(oldPath, newPath), id: doc.id, docClass: collection.documentClass, folder: doc.folder, fieldTag: "IMAGES" });
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
          changes.push({ type: "scene", name: scene.name, field: "background.src", old: bg, new: bg.replaceAll(oldPath, newPath), id: scene.id, folder: scene.folder, fieldTag: "IMAGES" });
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
            changes.push({ type: "journal-image", name: `${journal.name} → ${page.name}`, field: "src", old: page.src, new: page.src.replaceAll(oldPath, newPath), id: journal.id, pageId: page.id, folder: journal.folder, fieldTag: "IMAGES" });
          }
          if (page.type === "text" && targetText && page.text?.content?.includes(oldPath)) {
            const matches = [...page.text.content.matchAll(new RegExp(`${oldPath}[^"'\\s]*`, "g"))];
            for (const match of matches) {
              changes.push({ type: "journal-text", name: `${journal.name} → ${page.name}`, field: "text.content", old: match[0], new: match[0].replaceAll(oldPath, newPath), id: journal.id, pageId: page.id, fullText: page.text.content, folder: journal.folder, fieldTag: "TEXT" });
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
            changes.push({ type: "playlists", name: `${playlist.name} → ${sound.name}`, field: "path", old: sound.path, new: sound.path.replaceAll(oldPath, newPath), id: playlist.id, soundId: sound.id, folder: playlist.folder, fieldTag: "AUDIO" });
          }
        }
      }
    }

    if (!changes.length) return reportDiv.innerHTML += `<p><em>No matching paths found.</em></p>`;

    if (!doReplace) {
      reportDiv.innerHTML += changes.map(c => {
        let title = c.name;
        // Build folder path for all document types
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
        // Add tags: document type and field type
        return `
          <div class="replace-result">
            <div class="replace-result-title">
              <div class="replace-title" data-type="${c.type}" data-id="${c.id}"${c.pageId ? ` data-page-id="${c.pageId}"` : ''}${c.soundId ? ` data-sound-id="${c.soundId}"` : ''}>${title}</div>
              <div class="replace-result-tag">${c.type}</div><div class="replace-field-tag">${c.fieldTag}</div>
            </div>
            <div class="replace-old">
              <span class="code-old-label">OLD</span>
              <span class="code-old">${c.old}</span>
            </div>
            <div class="replace-new">
              <span class="code-new-label">NEW</span>
              <span class="code-new">${c.new}</span>
            </div>
          </div>`;
      }).join(" ");
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

    const grouped = this._groupBy(changes, c => c.type);
    for (const [type, group] of Object.entries(grouped)) {
      if (type.startsWith("journal")) {
        const byJournal = this._groupBy(group, c => c.id);
        for (const [jid, entries] of Object.entries(byJournal)) {
          const journal = game.journal.get(jid);
          const pageMap = {};
          for (const entry of entries) {
            if (!pageMap[entry.pageId]) pageMap[entry.pageId] = { _id: entry.pageId };
            if (entry.type === "journal-image") pageMap[entry.pageId].src = entry.new;
            if (entry.type === "journal-text") pageMap[entry.pageId].text = { content: entry.fullText.replaceAll(entry.old, entry.new) };
            log(`📝 ${entry.name}<br/><code style="color: #600;">OLD</code><code style="color: #600;">${entry.old}</code><br/><code style="color: #060;">NEW</code><code style="color: #060;">${entry.new}</code>`);
          }
          await journal.update({ pages: Object.values(pageMap) });
        }
      } else if (type === "scene") {
        await Scene.updateDocuments(group.map(c => (log(`🗺️ ${c.name}<br/><code class="code-old">OLD: ${c.old}</code><br/><code class="code-new">NEW: ${c.new}</code>`), { _id: c.id, background: { src: c.new } })));
      } else {
        const docClass = group[0].docClass;
        await docClass.updateDocuments(group.map(c => (log(`📦 ${c.name}<br/><code class="code-old">OLD: ${c.old}</code><br/><code class="code-new">NEW: ${c.new}</code>`), { _id: c.id, [c.field]: c.new })));
      }
    }

    ui.notifications.info(`✅ Replaced ${changes.length} image paths.`);
    log(`<p><strong style='color:darkgreen;'>Success!</strong> ${changes.length} paths updated.</p>`);
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
  max-width: 350px;
  min-width: 350px;
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
.button-report,
.button-search {
  background-color: rgb(34, 86, 39);
  color: #ffffff;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
}
.button-replace {
  background-color: rgb(87, 44, 53);
  color: #ffffff;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
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