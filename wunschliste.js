"use strict";

/*
 * Japan Wunschliste — visuelle Merkliste für Produkte, die noch gekauft
 * werden sollen. Läuft wie der Preis-Finder ohne Server:
 *
 *  - Produkt eintragen -> Bild wird automatisch gesucht
 *    (Rakuten-API, falls Zugangsdaten hinterlegt; sonst Open Food Facts /
 *    Open Beauty Facts, beide ohne Schlüssel). Passt es nicht: eigenes Foto
 *    hochladen oder Bild-Adresse einfügen.
 *  - Abhaken -> die Karte wird blass, wandert in den zugeklappten Bereich
 *    "Erledigt" und lässt sich dort jederzeit wieder öffnen/reaktivieren.
 *  - Alles liegt im localStorage des Browsers; Export/Import als JSON-Datei
 *    für den Wechsel auf ein anderes Gerät.
 */

const $ = (id) => document.getElementById(id);

const LS_KEY = "jpf_wishlist_v1";
const LS_RAKUTEN = "jpf_rakuten_app_id";       // gleiche Schlüssel wie im Preis-Finder
const LS_RAKUTEN_KEY = "jpf_rakuten_access_key";

/*
 * Vorbelegte Produkte. Einträge hier erscheinen automatisch auf jedem Gerät,
 * das die Seite öffnet — einmal gelöschte Vorschläge kommen nicht zurück.
 * Format: { id: "seed-…", name: "…", note: "…", img: "https://…" }
 */
const SEED = [];

const els = {
  addForm: $("addForm"),
  addName: $("addName"),
  addBtn: $("addBtn"),
  counts: $("counts"),
  openGrid: $("openGrid"),
  emptyHint: $("emptyHint"),
  boughtSection: $("boughtSection"),
  boughtToggle: $("boughtToggle"),
  boughtLabel: $("boughtLabel"),
  boughtChevron: $("boughtChevron"),
  boughtGrid: $("boughtGrid"),
  exportBtn: $("exportBtn"),
  importBtn: $("importBtn"),
  importFile: $("importFile"),
  sheet: $("sheet"),
  sheetImg: $("sheetImg"),
  sheetTitle: $("sheetTitle"),
  sheetState: $("sheetState"),
  sheetName: $("sheetName"),
  sheetNote: $("sheetNote"),
  sheetImgUrl: $("sheetImgUrl"),
  autoImgBtn: $("autoImgBtn"),
  uploadImgBtn: $("uploadImgBtn"),
  uploadImgFile: $("uploadImgFile"),
  sheetImgStatus: $("sheetImgStatus"),
  sheetFind: $("sheetFind"),
  sheetToggleBought: $("sheetToggleBought"),
  sheetSave: $("sheetSave"),
  sheetDelete: $("sheetDelete"),
  sheetClose: $("sheetClose"),
};

// ---------- Datenhaltung ----------

let state = { items: [], removedSeeds: [], boughtOpen: false };
let openId = null; // gerade in der Detailansicht geöffnetes Produkt

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.items = Array.isArray(data.items) ? data.items : [];
      state.removedSeeds = Array.isArray(data.removedSeeds) ? data.removedSeeds : [];
      state.boughtOpen = !!data.boughtOpen;
    }
  } catch (_) {
    // Beschädigter Speicher -> mit leerer Liste weiterarbeiten statt abstürzen.
  }
  mergeSeed();
}

// Neue Vorschläge aus SEED ergänzen, ohne bereits abgehakte/gelöschte
// Einträge zu überschreiben.
function mergeSeed() {
  const known = new Set(state.items.map((i) => i.id));
  for (const s of SEED) {
    if (known.has(s.id) || state.removedSeeds.includes(s.id)) continue;
    state.items.push({
      id: s.id,
      name: s.name,
      note: s.note || "",
      img: s.img || "",
      bought: false,
      createdAt: Date.now(),
    });
  }
}

function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    alert("Der Browser-Speicher ist voll — meist wegen hochgeladener Fotos. " +
      "Lösche ein paar eigene Fotos (Bild-Adressen brauchen keinen Platz) " +
      "oder speichere eine Sicherung und räume die Liste auf.");
    return false;
  }
}

const byId = (id) => state.items.find((i) => i.id === id);
const newId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- Bildsuche ----------

// 1. Rakuten (echtes japanisches Produktfoto, braucht App-ID + Access Key)
async function rakutenImage(keyword) {
  const appId = (localStorage.getItem(LS_RAKUTEN) || "").trim();
  const accessKey = (localStorage.getItem(LS_RAKUTEN_KEY) || "").trim();
  if (!appId || !accessKey) return "";

  const url =
    "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401?" +
    new URLSearchParams({
      applicationId: appId, keyword, hits: 3, format: "json", availability: 1,
    }).toString();

  const res = await fetchWithTimeout(url, 10000, { headers: { accessKey } });
  if (!res.ok) return "";
  const data = await res.json();
  const items = (data && data.Items) || [];
  for (const { Item: it } of items) {
    const img = it.mediumImageUrls && it.mediumImageUrls[0] && it.mediumImageUrls[0].imageUrl;
    // Rakuten liefert das Bild klein (_ex=128x128) -> größere Variante anfordern.
    if (img) return img.replace(/\?_ex=\d+x\d+$/, "?_ex=300x300");
  }
  return "";
}

// 2.-4. Open Food Facts / Open Beauty Facts (ohne Schlüssel, CORS offen).
// Die Produktivsuche von Open Food Facts ist zeitweise überlastet ("Page
// temporarily unavailable" statt JSON) -> der Spiegel world.openfoodfacts.net
// dient als Ausweichquelle.
async function offImage(host, keyword) {
  const url = `https://${host}/cgi/search.pl?` + new URLSearchParams({
    search_terms: keyword,
    search_simple: 1,
    action: "process",
    json: 1,
    page_size: 5,
    fields: "product_name,brands,image_front_url,image_front_small_url",
  }).toString();

  const res = await fetchWithTimeout(url, 9000);
  if (!res.ok) return "";
  const type = res.headers.get("content-type") || "";
  if (!type.includes("json")) return ""; // Wartungsseite statt Daten
  const data = await res.json();
  for (const p of (data && data.products) || []) {
    const img = p.image_front_url || p.image_front_small_url;
    if (img) return img;
  }
  return "";
}

function fetchWithTimeout(url, ms, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, Object.assign({ signal: controller.signal }, opts || {}))
    .finally(() => clearTimeout(timer));
}

// Reihenfolge: Rakuten (echtes Japan-Foto) -> Lebensmittel -> Spiegel ->
// Kosmetik. Findet der volle Name nichts, wird zusätzlich mit den ersten
// beiden Wörtern (Marke + Produkt) gesucht. Jede Quelle darf fehlschlagen,
// ohne die nächste zu blockieren.
async function findImage(keyword) {
  const short = keyword.split(/\s+/).slice(0, 2).join(" ");
  const attempts = [
    () => rakutenImage(keyword),
    () => offImage("world.openfoodfacts.org", keyword),
    () => offImage("world.openfoodfacts.net", keyword),
    () => offImage("world.openbeautyfacts.org", keyword),
  ];
  if (short && short !== keyword) {
    attempts.push(
      () => rakutenImage(short),
      () => offImage("world.openfoodfacts.org", short),
      () => offImage("world.openfoodfacts.net", short),
      () => offImage("world.openbeautyfacts.org", short),
    );
  }
  for (const attempt of attempts) {
    try {
      const img = await attempt();
      if (img) return img;
    } catch (_) {
      // Quelle nicht erreichbar oder liefert kein JSON -> nächste probieren.
    }
  }
  return "";
}

// Hochgeladenes Foto auf max. 700 px verkleinern und als JPEG-DataURL
// zurückgeben, damit der localStorage nicht überläuft.
function fileToCompressedDataUrl(file, maxSide = 700, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei nicht lesbar"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Kein gültiges Bild"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Darstellung ----------

function render() {
  const open = state.items.filter((i) => !i.bought);
  const bought = state.items.filter((i) => i.bought);

  // Neueste zuerst; erledigte nach Kaufdatum.
  open.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  bought.sort((a, b) => (b.boughtAt || 0) - (a.boughtAt || 0));

  els.openGrid.replaceChildren(...open.map(card));
  els.boughtGrid.replaceChildren(...bought.map(card));

  els.emptyHint.classList.toggle("hidden", open.length > 0 || bought.length > 0);
  els.counts.textContent = state.items.length
    ? `${open.length} geplant · ${bought.length} erledigt`
    : "";

  els.boughtSection.classList.toggle("hidden", bought.length === 0);
  els.boughtLabel.textContent = `✓ Erledigt (${bought.length})`;
  els.boughtGrid.classList.toggle("hidden", !state.boughtOpen);
  els.boughtToggle.setAttribute("aria-expanded", String(state.boughtOpen));
  els.boughtChevron.classList.toggle("open", state.boughtOpen);
}

function card(item) {
  const li = document.createElement("li");
  li.className = "card" + (item.bought ? " isBought" : "");

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "cardMain";
  openBtn.addEventListener("click", () => openSheet(item.id));

  const figure = document.createElement("div");
  figure.className = "cardImgWrap";
  if (item.img) {
    const img = document.createElement("img");
    img.className = "cardImg";
    img.loading = "lazy";
    img.alt = "";
    img.src = item.img;
    // Kaputte/abgelaufene Bild-Adresse -> Platzhalter statt leerem Rahmen.
    img.addEventListener("error", () => {
      img.remove();
      figure.appendChild(placeholder(item.name));
    });
    figure.appendChild(img);
  } else {
    figure.appendChild(placeholder(item.name));
  }

  const text = document.createElement("div");
  text.className = "cardText";
  const name = document.createElement("div");
  name.className = "cardName";
  name.textContent = item.name;
  text.appendChild(name);
  if (item.note) {
    const note = document.createElement("div");
    note.className = "cardNote";
    note.textContent = item.note;
    text.appendChild(note);
  }

  openBtn.append(figure, text);

  const check = document.createElement("button");
  check.type = "button";
  check.className = "checkBtn";
  check.textContent = "✓";
  check.title = item.bought ? "Wieder aktivieren" : "Als gekauft abhaken";
  check.setAttribute("aria-label", check.title);
  check.setAttribute("aria-pressed", String(!!item.bought));
  check.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleBought(item.id);
  });

  li.append(openBtn, check);
  return li;
}

function placeholder(name) {
  const div = document.createElement("div");
  div.className = "cardPlaceholder";
  div.textContent = (name || "?").trim().charAt(0).toUpperCase();
  return div;
}

// ---------- Aktionen ----------

async function addItem(rawName) {
  const name = rawName.trim();
  if (!name) return;

  const item = { id: newId(), name, note: "", img: "", bought: false, createdAt: Date.now() };
  state.items.push(item);
  save();
  render();
  els.addName.value = "";

  // Bildsuche läuft im Hintergrund, die Karte ist sofort da.
  els.addBtn.textContent = "🔎 Bild wird gesucht …";
  const img = await findImage(name);
  els.addBtn.textContent = "+ Auf die Liste";
  const fresh = byId(item.id);
  if (!fresh || fresh.img) return;
  if (img) {
    fresh.img = img;
    save();
    render();
  }
}

function toggleBought(id) {
  const item = byId(id);
  if (!item) return;
  item.bought = !item.bought;
  item.boughtAt = item.bought ? Date.now() : undefined;
  // Beim ersten Abhaken den Erledigt-Bereich aufklappen, damit sichtbar ist,
  // wohin die Karte gewandert ist.
  if (item.bought && state.items.filter((i) => i.bought).length === 1) {
    state.boughtOpen = true;
  }
  save();
  render();
  if (openId === id) fillSheet(item);
}

function deleteItem(id) {
  const item = byId(id);
  if (!item) return;
  if (!confirm(`„${item.name}“ wirklich von der Liste löschen?`)) return;
  state.items = state.items.filter((i) => i.id !== id);
  if (id.startsWith("seed-") && !state.removedSeeds.includes(id)) {
    state.removedSeeds.push(id);
  }
  save();
  render();
  closeSheet();
}

// ---------- Detailansicht ----------

function openSheet(id) {
  const item = byId(id);
  if (!item) return;
  openId = id;
  fillSheet(item);
  els.sheetImgStatus.textContent = "";
  els.sheet.classList.remove("hidden");
}

function fillSheet(item) {
  els.sheetTitle.textContent = item.name;
  els.sheetState.textContent = item.bought ? "erledigt" : "geplant";
  els.sheetState.classList.toggle("done", !!item.bought);
  els.sheetName.value = item.name;
  els.sheetNote.value = item.note || "";
  els.sheetImgUrl.value = item.img && !item.img.startsWith("data:") ? item.img : "";
  if (item.img) {
    els.sheetImg.src = item.img;
    els.sheetImg.classList.remove("hidden");
  } else {
    els.sheetImg.removeAttribute("src");
    els.sheetImg.classList.add("hidden");
  }
  els.sheetFind.href = "index.html?q=" + encodeURIComponent(item.name);
  els.sheetToggleBought.textContent = item.bought
    ? "Zurück auf „geplant“"
    : "Als gekauft markieren";
}

function saveSheet() {
  const item = byId(openId);
  if (!item) return closeSheet();
  const name = els.sheetName.value.trim();
  if (name) item.name = name;
  item.note = els.sheetNote.value.trim();
  const url = els.sheetImgUrl.value.trim();
  // Leeres URL-Feld löscht ein hochgeladenes Foto nicht (das steht als
  // data:-URL im Bild, nicht im Feld).
  if (url) item.img = url;
  else if (item.img && !item.img.startsWith("data:")) item.img = "";
  save();
  render();
  closeSheet();
}

function closeSheet() {
  openId = null;
  els.sheet.classList.add("hidden");
}

async function autoImage() {
  const item = byId(openId);
  if (!item) return;
  const keyword = els.sheetName.value.trim() || item.name;
  els.autoImgBtn.disabled = true;
  els.sheetImgStatus.textContent = "Suche Bild …";
  const img = await findImage(keyword);
  els.autoImgBtn.disabled = false;
  if (!img) {
    els.sheetImgStatus.textContent =
      "Kein Bild gefunden. Tipp: Markenname + Produkt (z. B. „Meiji Amino Collagen“), " +
      "oder eigenes Foto hochladen / Bild-Adresse einfügen.";
    return;
  }
  item.img = img;
  els.sheetImgUrl.value = img;
  els.sheetImg.src = img;
  els.sheetImg.classList.remove("hidden");
  els.sheetImgStatus.textContent = "Bild gefunden.";
  save();
  render();
}

async function uploadImage(file) {
  const item = byId(openId);
  if (!item || !file) return;
  els.sheetImgStatus.textContent = "Foto wird verkleinert …";
  try {
    const dataUrl = await fileToCompressedDataUrl(file);
    item.img = dataUrl;
    els.sheetImgUrl.value = "";
    els.sheetImg.src = dataUrl;
    els.sheetImg.classList.remove("hidden");
    els.sheetImgStatus.textContent = "Eigenes Foto gespeichert.";
    save();
    render();
  } catch (e) {
    els.sheetImgStatus.textContent = "Foto konnte nicht gelesen werden.";
  }
}

// ---------- Sicherung ----------

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "japan-wunschliste.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.items)) throw new Error("Format");
      // Zusammenführen statt ersetzen: gleiche id -> vorhandener Eintrag bleibt.
      const known = new Set(state.items.map((i) => i.id));
      let added = 0;
      for (const it of data.items) {
        if (!it || !it.id || known.has(it.id)) continue;
        state.items.push(it);
        added++;
      }
      if (Array.isArray(data.removedSeeds)) {
        for (const id of data.removedSeeds) {
          if (!state.removedSeeds.includes(id)) state.removedSeeds.push(id);
        }
      }
      save();
      render();
      alert(added ? `${added} Produkt(e) hinzugefügt.` : "Nichts Neues in der Sicherung.");
    } catch (_) {
      alert("Diese Datei ist keine gültige Wunschlisten-Sicherung.");
    }
  };
  reader.readAsText(file);
}

// ---------- Events ----------

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  els.addName.blur();
  addItem(els.addName.value);
});

els.boughtToggle.addEventListener("click", () => {
  state.boughtOpen = !state.boughtOpen;
  save();
  render();
});

els.sheetSave.addEventListener("click", saveSheet);
els.sheetClose.addEventListener("click", closeSheet);
els.sheetDelete.addEventListener("click", () => deleteItem(openId));
els.sheetToggleBought.addEventListener("click", () => toggleBought(openId));
els.autoImgBtn.addEventListener("click", autoImage);
els.uploadImgBtn.addEventListener("click", () => els.uploadImgFile.click());
els.uploadImgFile.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  uploadImage(file);
});
els.sheet.addEventListener("click", (e) => {
  if (e.target === els.sheet) closeSheet();
});

els.exportBtn.addEventListener("click", exportBackup);
els.importBtn.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (file) importBackup(file);
});

load();
render();
