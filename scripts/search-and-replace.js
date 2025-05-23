// Full Image Path Replacer Macro with Folder Filter, Match Modes, UI Enhancements
new (class ImagePathReplacerApp extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "image-path-replacer",
      title: "Global Image Path Replacer",
      template: null,
      popOut: true,
      resizable: true,
      width: 900,
      height: "auto",
      classes: ["image-path-replacer"]
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
    const newPath = html.find('[name="newPath"]').val()?.trim();
    const folderFilter = html.find('[name="folderFilter"]').val();
    const matchMode = html.find('[name="matchMode"]').val();
    const reportDiv = html.find("#report-area")[0];
    const log = (msg) => {
      reportDiv.innerHTML += `<div style='margin-bottom:1em;'>${msg}</div>`;
      reportDiv.scrollTop = reportDiv.scrollHeight;
    };

    if (!oldPath || !newPath) {
      ui.notifications.error("Please provide both old and new paths.");
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

    const changes = [];
    const match = (value) => {
      if (matchMode === "path") return value.split("/").slice(0, -1).join("/").startsWith(oldPath);
      if (matchMode === "filename") return value.split("/").pop().startsWith(oldPath);
      return value.startsWith(oldPath);
    };

    const collect = (collection, imgField, type) => {
      if (!options[type]) return;
      let docs = collection.contents;
      if (folderFilter) {
        const folder = game.folders.get(folderFilter);
        if (folder) {
          // Gather all folder IDs: selected folder and all subfolders
          const gatherFolderIds = (f) => [f.id, ...(f.children ? f.children.flatMap(gatherFolderIds) : [])];
          const allowedFolderIds = new Set(gatherFolderIds(folder));
          docs = docs.filter(doc => doc.folder && allowedFolderIds.has(doc.folder.id));
        } else {
          return;
        }
      }
      // Filter by document type
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
          changes.push({ type, name: doc.name, field: imgField, old: img, new: img.replace(oldPath, newPath), id: doc.id, docClass: collection.documentClass, folder: doc.folder });
        }
      }
    };

    collect(game.actors, "img", "actors");
    collect(game.items, "img", "items");
    collect(game.tables, "img", "tables");
    collect(game.playlists, "img", "playlists");

    if (options["scenes"]) {
      for (const scene of game.scenes.contents) {
        const bg = scene.background?.src;
        if (typeof bg === "string" && match(bg)) {
          changes.push({ type: "scene", name: scene.name, field: "background.src", old: bg, new: bg.replace(oldPath, newPath), id: scene.id });
        }
      }
    }

    if (options["journals"]) {
      for (const journal of game.journal.contents) {
        for (const page of journal.pages.contents) {
          if (page.type === "image" && match(page.src)) {
            changes.push({ type: "journal-image", name: `${journal.name} → ${page.name}`, field: "src", old: page.src, new: page.src.replace(oldPath, newPath), id: journal.id, pageId: page.id, folder: journal.folder });
          }
          if (page.type === "text" && page.text?.content?.includes(oldPath)) {
            const matches = [...page.text.content.matchAll(new RegExp(`${oldPath}[^"'\\s]*`, "g"))];
            for (const match of matches) {
              changes.push({ type: "journal-text", name: `${journal.name} → ${page.name}`, field: "text.content", old: match[0], new: match[0].replace(oldPath, newPath), id: journal.id, pageId: page.id, fullText: page.text.content, folder: journal.folder });
            }
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
          // For journal pages, prepend folder path to journal name and page name
          if (folderPath.length) {
            // c.name is "Journal Name → Page Name"
            title = folderPath.join(' → ') + ' → ' + c.name;
          }
        } else {
          // For other types, prepend folder path to doc name
          if (folderPath.length) {
            title = folderPath.join(' → ') + ' → ' + c.name;
          }
        }
        return `
          <div class="replace-result">
            <div class="replace-result-title">
              <div class="replace-title" data-type="${c.type}" data-id="${c.id}"${c.pageId ? ` data-page-id="${c.pageId}"` : ''}>${title}</div>
              <div class="replace-result-tag">${c.type}</div>
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
    return $(`
      <style>



    .image-replacer-flex { 
        display: flex; 
        gap: 1em; 
        min-width: 800px;
        align-items: flex-start;
        overflow: hidden;
    }
    .image-replacer-left {
        flex: 1;
        max-width: 350px;
        min-width: 350px;
    }
    .image-replacer-right { 
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
    .image-replacer-right p { 
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
    .button-report {
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
    .image-replacer-left form {
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
      <div class="image-replacer-flex">
        <div class="image-replacer-left">
          <form>
              <label for="oldPath">Old Path</label>
            <div class="form-group">
              
              <input type="text" name="oldPath" id="oldPath" placeholder="e.g. modules/assets" style="width:100%;" />
            </div>
            <label for="newPath">New Path</label>
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
                <option value="all">All</option>
                <option value="path">Path Only</option>
                <option value="filename">Filename Only</option>
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
            <div class="form-group" style="margin-top:1em;">
              <button type="button" name="runReport" class="button-report">RUN REPORT</button>
              <button type="button" name="runReplace" class="button-replace">MASS REPLACE</button>
            </div>
          </form>
        </div>
        <div id="report-area" class="image-replacer-right">
          <p>Always back up your files files before running a mass change.</p>
				<p>Run a report before doing a mass replace to verify what will be changed.</p>
        </div>
      </div>
    `);
  }
})().render(true);