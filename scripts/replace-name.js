
// ================================================================== 
// ===== IMPORTS ====================================================
// ================================================================== 

// Grab the module data
import { MODULE  } from './const.js';

// ================================================================== 
// ===== CLASS ======================================================
// ================================================================== 


const macroUuid = this.uuid;
const macroName = this.name;
const labelStyle = `display: inline-block; width: 28%; margin:4px 1%; font-weight: bold;`;
const selectStyle = `display: inline-block; width: 68%; margin:4px 1%;`;
let nameDefault = ``;
let dcDefault = ``;
let statDefault = ``;
let attackDefault = ``;
let pronounDefault = ``;
let additionalStyle = `display: none;`;
if (event.shiftKey) {
    nameDefault = `@default`;
    dcDefault = `@spelldc`;
    statDefault = `@spellcasting`;
    attackDefault = `@spelldc`;
    pronounDefault = `it/its/its/it/itself`;
    additionalStyle = `display: block;`;
}
const characters = game.actors.contents.sort(function(obj1, obj2) {
    return obj2._stats.createdTime - obj1._stats.createdTime;
});
let listOptions = '';
const targets = Array.from(game.canvas.tokens.controlled);
characters.forEach((character) => {
    let selected = '';
    if (targets.length > 0) {
        if (targets[0] !== null && targets[0] !== undefined && targets[0] !== '' && targets[0].actor.id == character.id) {
            selected = 'selected';
        }
    }
    listOptions += `<option value='${character.uuid}' ${selected}>${character.name}</option>`;
});

let replaceDialog = new Dialog({
    title: macroName,
    content: `<label style="${labelStyle}" for="characters">Actor:</label><select style="${selectStyle}" id="characters" name="characters"><option value='focused'>Use In-Focus Actor based on Sheet</option><option disabled>----------</option>${listOptions}</select>
 
 <hr>
 
 <label style="${labelStyle}" for="oldName">Old Name:</label><input type="text" style="${selectStyle}" id="oldName" name="oldName" value="{creature}" list="oldNameList"><datalist id="oldNameList" name="oldName"><option value="@default"></datalist></input>
 
 <label style="${labelStyle}" for="newName">New Name:</label><input type="text" style="${selectStyle}" id="newName" name="newName" value="${nameDefault}" list="newNameList"><datalist id="newNameList" name="newName"><option value="@default"></datalist></input>
 
 <label style="${labelStyle}" for="wasNamed" title="Did the actor's item descriptions previously use a proper name? i.e. 'Bob' instead of 'guard'">Was Named?</label><select style="${selectStyle}" id="wasNamed" name="wasNamed"><option value="no">No</option><option value="yes">Yes</option></select>
 
 <label style="${labelStyle}" for="nowNamed" title="Will the actor's item descriptions now use a proper name? i.e. 'Juliet' instead of 'soldier'">Now Named?</label><select style="${selectStyle}" id="nowNamed" name="nowNamed"><option value="no">No</option><option value="yes">Yes</option></select>
 
<h3 style="margin:4px 1%;" onclick="$('#replaceAdditional').slideToggle('slow');">Toggle Additional Options <span style="float: right">⇅</span></h3><div id="replaceAdditional" style="${additionalStyle}">
 
 <label style="${labelStyle}" for="oldDC">Old DC:</label><input type="text" style="${selectStyle}" id="oldDC" name="oldDC" value="{dc}" list="oldDCList"><datalist id="oldDCList" name="oldDC"><option value="@spelldc"></datalist></input>
 
 <label style="${labelStyle}" for="newDC">New DC:</label><input type="text" list="newDCList" style="${selectStyle}" id="newDC" name="newDC" value="${dcDefault}"><datalist id="newDCList" name="newDC"><option value="@spelldc"></datalist></input>
 
 <hr>
 
 <label style="${labelStyle}" for="oldStat">Old Stat:</label><input type="text" style="${selectStyle}" id="oldStat" name="oldStat" value="{casting}" list="oldStatList"><datalist id="oldStatList" name="oldStat"><option value="@spellcasting"></datalist></input>
 
 <label style="${labelStyle}" for="newStat">New Stat:</label><input type="text" list="newStatList" style="${selectStyle}" id="newStat" name="newStat" value="${statDefault}"><datalist id="newStatList" name="newStat"><option value="@spellcasting"></datalist></input>
 
 <hr>
 
 <label style="${labelStyle}" for="oldAttack">Old Attack:</label><input type="text" style="${selectStyle}" id="oldAttack" name="oldAttack" value="{attack}" list="oldAttackList"><datalist id="oldAttackList" name="oldAttack"><option value="@spelldc"></datalist></input>
 
 <label style="${labelStyle}" for="newAttack">New Attack:</label><input type="text" list="newAttackList" style="${selectStyle}" id="newAttack" name="newAttack" value="${attackDefault}"><datalist id="newAttackList" name="newAttack"><option value="@spelldc"></datalist></input>
 
 <hr>
 
 <label style="${labelStyle}" for="oldPronouns">Old Pronouns:</label><input type="text" id="oldPronouns" list="oldPronounsList" style="${selectStyle}" value="{she}/{her}/{hers}/{her_}/{herself}"><datalist id="oldPronounsList" name="oldPronouns"><option value="{she}/{her}/{hers}/{her_}/{herself}"><option value="he/him/his/him/himself"><option value="it/its/its/it/itself"><option value="she/her/hers/her/herself"><option value="they/them/their/them/themself"></datalist>
 
 <label style="${labelStyle}" for="newPronouns">New Pronouns:</label><input type="text" list="newPronounsList" style="${selectStyle}" value="${pronounDefault}" id="newPronouns"><datalist id="newPronounsList" name="newPronouns"><option value="{she}/{her}/{hers}/{her_}/{herself}"><option value="he/him/his/him/himself"><option value="it/its/its/it/itself"><option value="she/her/hers/her/herself"><option value="they/them/their/them/themself"></datalist></input></div>`,
    buttons: {
        one: {
            icon: '<i class="fas fa-feather"></i>',
            label: "Edit Desc.",
            callback: async (html) => {

                let charUuid = html.find('select#characters').val();
                let oldName1 = html.find('input#oldName').val();
                let oldName2 = html.find('input#oldName').val();
                let newName = html.find('input#newName').val();
                let oldDC = html.find('input#oldDC').val();
                let newDC = html.find('input#newDC').val();
                let oldStat = html.find('input#oldStat').val();
                let newStat = html.find('input#newStat').val();
                let oldAttack = html.find('input#oldAttack').val();
                let newAttack = html.find('input#newAttack').val();
                const oldNamed = html.find('select#wasNamed').val();
                const newNamed = html.find('select#nowNamed').val();
                const oldPronouns = html.find('input#oldPronouns').val();
                const newPronouns = html.find('input#newPronouns').val();
                let selected;

                if (!oldName1 && !oldDC && !oldStat && !oldAttack && !oldPronouns) {
                    ui.notifications.warn(`Please input at least one old variable and try again.`);
                    const macro = await fromUuid(macroUuid);
                    await new Promise(r => setTimeout(r, 400));
                    await macro.execute();
                } else if (!newName && !newDC && !newStat && !newAttack && !newPronouns) {
                    ui.notifications.warn(`Please input at least one new variable and try again.`);
                    const macro = await fromUuid(macroUuid);
                    await new Promise(r => setTimeout(r, 400));
                    await macro.execute();
                } else {

                    if (charUuid === "focused") {

                        const openWindows = $('.app.window-app.sheet.actor.npc');
                        let best;
                        let maxz;
                        openWindows.each(function() {
                            let z = parseInt($(this).css('z-index'), 10);
                            if (!best || maxz < z) {
                                best = this;
                                maxz = z;
                            }
                        });
                        if (best) {
                            let idParts = best.id.split("-");
                            idParts.shift();
                            if (idParts.length > 4) {
                                let joinedName = "";
                                let indexArray = [];
                                for (let i = 2; i < (idParts.length - 1); i++) {
                                    if (i > 2) {
                                        joinedName += "-";
                                        indexArray[i - 3] = i;
                                    }
                                    joinedName += idParts[i];
                                }
                                idParts[2] = joinedName;
                                indexArray.forEach((ia) => {
                                    idParts.splice(ia, 1);
                                });
                            }
                            charUuid = idParts.join(".");
                        }
                    }

                    selected = await fromUuid(charUuid);

                    if (selected) {

                        if (!newName) {
                            oldName1 = ``;
                            oldName2 = ``;
                            newName = ``;
                        } else {
                            if (newName === "@default") {
                                if (newNamed === "yes") {
                                    newName = selected.name.split(" ")[0];
                                } else {
                                    newName = selected.name.split(" of ")[0].split(" the ")[0].split(" ").slice(-1)[0].toLowerCase();
                                }
                            } else if (oldName === "@default") {
                                if (oldNamed === "yes") {
                                    oldName = selected.name.split(" ")[0];
                                } else {
                                    oldName = selected.name.split(" of ")[0].split(" the ")[0].split(" ").slice(-1)[0] .toLowerCase();
                                }
                            }
                            if (oldNamed !== newNamed) {
                                if (oldNamed === "yes") {
                                    newName = "the " + newName;
                                } else {
                                    oldName1 = "The " + oldName1;
                                    oldName2 = "the " + oldName2;
                                }
                            }
                        }
                        if (!newDC) {
                            oldDC = ``;
                            newDC = ``;
                        } else if (newDC === "@spelldc") {
                            newDC = selected.system.attributes.spelldc;
                        } else if (oldDC === "@spelldc") {
                            oldDC = selected.system.attributes.spelldc;
                        }
                        if (!newStat) {
                            oldStat = ``;
                            newStat = ``;
                        } else if (newStat === "@spellcasting") {
                            newStat = selected.system.attributes.spellcasting;
                        } else if (oldStat === "@spellcasting") {
                            oldStat = selected.system.attributes.spellcasting;
                        }
                        if (newStat && newStat.length === 3) {
                            newStat = CONFIG.DND5E.abilities[newStat].label;
                        }
                        if (oldStat && oldStat.length === 3) {
                            oldStat = CONFIG.DND5E.abilities[oldStat].label;
                        }
                        if (!newAttack) {
                            oldAttack = ``;
                            newAttack = ``;
                        } else if (newAttack === "@spelldc") {
                            newAttack = parseInt(selected.system.attributes.spelldc) - 8;
                        } else if (oldAttack === "@spelldc") {
                            oldAttack = parseInt(selected.system.attributes.spelldc) - 8;
                        }
                        let pair1A = ``;
                        let pair1B = ``;
                        let pair2A = ``;
                        let pair2B = ``;
                        let pair3A = ``;
                        let pair3B = ``;
                        let pair4A = ``;
                        let pair4B = ``;
                        let pair5A = ``;
                        let pair5B = ``;
                        let pronounCheck = false;
                        if (oldPronouns && newPronouns) {
                            const oldPronounArray = oldPronouns.split("/");
                            const newPronounArray = newPronouns.split("/");
                            if (oldPronounArray.length > 1 && newPronounArray.length > 1) {
                                pronounCheck = true;
                                if (oldPronounArray[4] && newPronounArray[4]) {
                                    pair1A = oldPronounArray[4];
                                    pair1B = newPronounArray[4]
                                }
                                if (oldPronounArray[2] && newPronounArray[2]) {
                                    pair2A = oldPronounArray[2];
                                    pair2B = newPronounArray[2]
                                }
                                if (oldPronounArray[0] && newPronounArray[0]) {
                                    pair3A = oldPronounArray[0];
                                    pair3B = newPronounArray[0]
                                }
                                if (oldPronounArray[1] && newPronounArray[1]) {
                                    pair4A = oldPronounArray[1];
                                    pair4B = newPronounArray[1]
                                }
                                if (oldPronounArray[3] && newPronounArray[3]) {
                                    pair5A = oldPronounArray[3];
                                    pair5B = newPronounArray[3]
                                }
                            }
                        }
                        const updates = selected.items.map(i => ({
                            _id: i.id,
                            "name": i.name.replace(/\{.*\}/g, ""),
                            "system.description.value": i.system.description.value.replaceAll(oldName1, newName).replaceAll(oldName2, newName).replaceAll(oldDC, newDC).replaceAll(oldStat, newStat).replaceAll(oldAttack, newAttack).replaceAll(pair1A, pair1B).replaceAll(pair2A, pair2B).replaceAll(pair3A, pair3B).replaceAll(pair4A, pair4B).replaceAll(pair5A, pair5B).replace(/\.\ [a-z]/g, match => match.toUpperCase()).replace(/\!\ [a-z]/g, match => match.toUpperCase()).replace(/\?\ [a-z]/g, match => match.toUpperCase()).replace(/\p\>[a-z]/g, match => match.toUpperCase())
                        }));
                        await selected.updateEmbeddedDocuments("Item", updates);
                        if (pronounCheck) {
                            ui.notifications.info(`Replacing pronouns often results in some grammar errors. Please double-check the item descriptions on ${selected.name}.`);
                        } else {
                            ui.notifications.info(`Item descriptions on ${selected.name} have been updated.`);
                        }

                    }

                }


            }

        },
        name: {
            icon: '<i class="fas fa-signature"></i>',
            label: 'Clean Names',
            callback: async (html) => {

                let charUuid = html.find('select#characters').val();
                let selected;

                if (charUuid === "focused") {

                    const openWindows = $('.app.window-app.sheet.actor.npc');
                    let best;
                    let maxz;
                    openWindows.each(function() {
                        let z = parseInt($(this).css('z-index'), 10);
                        if (!best || maxz < z) {
                            best = this;
                            maxz = z;
                        }
                    });
                    if (best) {
                        let idParts = best.id.split("-");
                        idParts.shift();
                        if (idParts.length > 4) {
                            let joinedName = "";
                            let indexArray = [];
                            for (let i = 2; i < (idParts.length - 1); i++) {
                                if (i > 2) {
                                    joinedName += "-";
                                    indexArray[i - 3] = i;
                                }
                                joinedName += idParts[i];
                            }
                            idParts[2] = joinedName;
                            indexArray.forEach((ia) => {
                                idParts.splice(ia, 1);
                            });
                        }
                        charUuid = idParts.join(".");
                    }
                }

                selected = await fromUuid(charUuid);
                if (selected) {
                    const updates = selected.items.map(i => ({
                        _id: i.id,
                        "name": i.name.replace(/\{.*\}/g, "")
                    }));
                    await selected.updateEmbeddedDocuments("Item", updates);
                    ui.notifications.info(`Item names cleaned on ${selected.name}.`);
                }


            }
        },
        close: {
            icon: '<i class="fas fa-times"></i>',
            label: "Close"
        }
    },
    default: "close"
}, {
    id: "replaceDialog",
    resizable: true
});
replaceDialog.render(true);