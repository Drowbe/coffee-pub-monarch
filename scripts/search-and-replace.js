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
          docs = this._getAllFolderContents(folder);
        }
        for (const doc of docs) {
          const img = getProperty(doc, imgField);
          if (typeof img === "string" && match(img)) {
            changes.push({ type, name: doc.name, field: imgField, old: img, new: img.replace(oldPath, newPath), id: doc.id, docClass: collection.documentClass });
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
              changes.push({ type: "journal-image", name: `${journal.name} → ${page.name}`, field: "src", old: page.src, new: page.src.replace(oldPath, newPath), id: journal.id, pageId: page.id });
            }
            if (page.type === "text" && page.text?.content?.includes(oldPath)) {
              const matches = [...page.text.content.matchAll(new RegExp(`${oldPath}[^"'\\s]*`, "g"))];
              for (const match of matches) {
                changes.push({ type: "journal-text", name: `${journal.name} → ${page.name}`, field: "text.content", old: match[0], new: match[0].replace(oldPath, newPath), id: journal.id, pageId: page.id, fullText: page.text.content });
              }
            }
          }
        }
      }
  
      if (!changes.length) return reportDiv.innerHTML += `<p><em>No matching paths found.</em></p>`;
  
      if (!doReplace) {
        reportDiv.innerHTML += changes.map(c => `<div><strong>${c.name}</strong> [${c.type}]<br/><code style="color:#600">OLD: ${c.old}</code><br/><code style="color:#060">NEW: ${c.new}</code></div>`).join("<br/>");
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
              log(`📝 ${entry.name}<br/><code style='color:#600'>OLD: ${entry.old}</code><br/><code style='color:#060'>NEW: ${entry.new}</code>`);
            }
            await journal.update({ pages: Object.values(pageMap) });
          }
        } else if (type === "scene") {
          await Scene.updateDocuments(group.map(c => (log(`🗺️ ${c.name}<br/><code style='color:#600'>OLD: ${c.old}</code><br/><code style='color:#060'>NEW: ${c.new}</code>`), { _id: c.id, background: { src: c.new } })));
        } else {
          const docClass = group[0].docClass;
          await docClass.updateDocuments(group.map(c => (log(`📦 ${c.name}<br/><code style='color:#600'>OLD: ${c.old}</code><br/><code style='color:#060'>NEW: ${c.new}</code>`), { _id: c.id, [c.field]: c.new })));
        }
      }
  
      ui.notifications.info(`✅ Replaced ${changes.length} image paths.`);
      log(`<p><strong style='color:darkgreen;'>Success!</strong> ${changes.length} paths updated.</p>`);
    }
  
    async _renderInner(data) {
      const folders = this._getMatchingFolders();
      return $(`
        <style>
          .image-replacer-flex { display: flex; gap: 1em; max-height: 600px; }
          .image-replacer-left { flex: 1; }
          .image-replacer-right { flex: 1; border-left: 1px solid #999; padding-left: 1em; overflow-y: auto; background: #f9f9f9; font-size: 0.85em; }
          .two-column { columns: 2; -webkit-columns: 2; column-gap: 1em; }
          .form-group { margin-bottom: 1em; display: block; }
          .form-group label {
            display: block;
            margin-bottom: 0.25em;
          }
          .image-replacer-left form {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5em;
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
                  ${folders.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
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
                <legend>Update These Document Types:</legend>
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
                <button type="button" name="runReport">Run Report</button>
                <button type="button" name="runReplace" style="color: red;"><strong>Mass Replace</strong></button>
              </div>
            </form>
          </div>
          <div id="report-area" class="image-replacer-right">
            <p><em>Run a report to preview changes here...</em></p>
          </div>
        </div>
      `);
    }
  })().render(true);