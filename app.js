"use strict";

/*
 * Japan Preis-Finder — statische Web-App, kein Server.
 *
 * Ablauf:
 *  1. Nutzer gibt einen Produktnamen in beliebiger Sprache ein.
 *  2. Der Name wird (bei Bedarf) ins Japanische UND ins Russische übersetzt
 *     -> Rakuten sucht mit Original + japanischer Fassung, Melonpanda/
 *     Nunibar (russischsprachige Re-Seller) mit der russischen Fassung.
 *  3. Rakuten: offizielle Ichiba-API liefert echte Preise. Wir holen über
 *     beide Suchbegriffe Treffer, entfernen Duplikate und zeigen die
 *     günstigsten als Liste (Name inkl. Größe/Menge, Preis in ¥, Kauflink).
 *  4. Amazon.co.jp, Kakaku.com, Melonpanda & Nunibar lassen sich aus dem
 *     Browser nicht auslesen -> ein Tipp öffnet dort die passende, bereits
 *     nach Preis sortierte Suche (bzw. eine Google-Seitensuche mit dem
 *     jeweils passenden Suchbegriff).
 */

const $ = (id) => document.getElementById(id);

const els = {
  form: $("searchForm"),
  query: $("query"),
  searchBtn: $("searchBtn"),
  terms: $("terms"),
  status: $("status"),
  resultsBox: $("resultsBox"),
  resultsList: $("resultsList"),
  shopLinks: $("shopLinks"),
  linkRakuten: $("linkRakuten"),
  linkAmazon: $("linkAmazon"),
  linkKakaku: $("linkKakaku"),
  linkMelonpanda: $("linkMelonpanda"),
  linkNunibar: $("linkNunibar"),
  settingsBtn: $("settingsBtn"),
  settingsPanel: $("settingsPanel"),
  rakutenId: $("rakutenId"),
  rakutenKey: $("rakutenKey"),
  saveSettings: $("saveSettings"),
  closeSettings: $("closeSettings"),
};

const LS_RAKUTEN = "jpf_rakuten_app_id";
const LS_RAKUTEN_KEY = "jpf_rakuten_access_key";

// ---------- Hilfsfunktionen ----------

const yen = (n) => "¥" + Number(n).toLocaleString("ja-JP");

function setStatus(msg, isError) {
  if (!msg) {
    els.status.classList.add("hidden");
    return;
  }
  els.status.textContent = msg;
  els.status.classList.toggle("error", !!isError);
  els.status.classList.remove("hidden");
}

// Prüft grob, ob ein Text bereits japanische Zeichen enthält.
function hasJapanese(s) {
  return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s);
}

// Prüft grob, ob ein Text bereits kyrillische Zeichen enthält.
function hasCyrillic(s) {
  return /[Ѐ-ӿ]/.test(s);
}

// JSONP-Aufruf (umgeht CORS). Gibt ein Promise mit den JSON-Daten zurück.
function jsonp(baseUrl, params, callbackParam = "callback", timeout = 12000) {
  return new Promise((resolve, reject) => {
    const cbName = "__jpf_cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let done = false;

    const cleanup = () => {
      delete window[cbName];
      script.remove();
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      if (!done) { done = true; cleanup(); reject(new Error("Zeitüberschreitung")); }
    }, timeout);

    window[cbName] = (data) => {
      if (done) return;
      done = true; cleanup(); resolve(data);
    };
    script.onerror = () => {
      if (done) return;
      done = true; cleanup(); reject(new Error("Netzwerkfehler"));
    };

    const usp = new URLSearchParams(params);
    usp.set(callbackParam, cbName);
    script.src = baseUrl + "?" + usp.toString();
    document.body.appendChild(script);
  });
}

// Übersetzt einen Begriff über die MyMemory-API (keyless, CORS-offen).
// hasTargetScript prüft, ob der Text schon in der Zielschrift vorliegt.
// Fällt bei Fehler/Timeout auf null zurück (Aufrufer nutzt dann den Originalbegriff).
async function translateViaMyMemory(text, langpair, hasTargetScript) {
  if (hasTargetScript(text)) return text;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const url = "https://api.mymemory.translated.net/get?" +
      new URLSearchParams({ q: text, langpair }).toString();
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    const t = data && data.responseData && data.responseData.translatedText;
    if (t && hasTargetScript(t) && t.toLowerCase() !== text.toLowerCase()) {
      return t.trim();
    }
  } catch (_) {
    // Timeout, Netzwerkfehler oder blockierte Anfrage -> auf Originalbegriff zurückfallen.
  } finally {
    clearTimeout(timer);
  }
  return null; // keine brauchbare Übersetzung
}

const translateToJapanese = (text) => translateViaMyMemory(text, "en|ja", hasJapanese);
const translateToRussian = (text) => translateViaMyMemory(text, "en|ru", hasCyrillic);

// ---------- Rakuten API ----------

async function rakutenSearch(appId, accessKey, keyword) {
  // Rakuten-API 2026-04-01 (neue openapi-Adresse). Diese Version verlangt
  // den Access Key als Request-Header, deshalb fetch() statt JSONP. Der Key
  // liegt nur im localStorage des Browsers, nie im Code. Die registrierte
  // Domain (Origin/Referer) wird von Rakuten zusätzlich geprüft.
  const url =
    "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401?" +
    new URLSearchParams({
      applicationId: appId,
      keyword: keyword,
      sort: "+itemPrice", // aufsteigend nach Preis (günstigstes zuerst)
      hits: 10,
      format: "json",
      availability: 1,
    }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let res;
  try {
    res = await fetch(url, { headers: { accessKey: accessKey }, signal: controller.signal });
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "Zeitüberschreitung" : "Netzwerkfehler");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    // 401/403 = Anmeldung; alles andere = Server/Netz.
    throw new Error(res.status === 401 || res.status === 403
      ? "invalid" : "HTTP " + res.status);
  }
  const data = await res.json();
  if (data && data.error) throw new Error(data.error_description || data.error);
  const items = (data && data.Items) || [];
  return items.map(({ Item: it }) => ({
    code: it.itemCode,
    // itemName enthält bei japanischen Angeboten meist Größe/Menge
    // (z. B. "…500ml" oder "…3個セット") -> unverkürzt anzeigen.
    name: it.itemName,
    price: it.itemPrice,
    shop: it.shopName,
    url: it.itemUrl,
    img: (it.mediumImageUrls && it.mediumImageUrls[0] &&
          it.mediumImageUrls[0].imageUrl) || "",
  }));
}

// ---------- Shop-Suchlinks (immer verfügbar) ----------

// Google-Seitensuche für Melonpanda/Nunibar: Markennamen (z. B. "Meiji")
// bleiben auf diesen Shops meist lateinisch, nur der allgemeine Produktname
// wird russisch. Eine reine Übersetzung des ganzen Suchbegriffs verfehlt
// solche Treffer (Google verlangt implizit alle Wörter). Deshalb Original-
// UND übersetzte Fassung als Phrasen per OR verknüpfen -> trifft, welche
// Schreibweise auch immer auf der Seite steht.
function googleSiteSearch(domain, original, translated) {
  const query = (translated && translated !== original)
    ? `"${original}" OR "${translated}"`
    : `"${original}"`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}+site:${domain}`;
}

// jpTerm: für die japanischen Marktplätze Rakuten/Amazon.co.jp/Kakaku, wo
// japanische Suchbegriffe die besseren Treffer liefern.
// originalTerm/ruTerm: für Melonpanda & Nunibar (russischsprachige Re-Seller).
function shopSearchUrls(jpTerm, originalTerm, ruTerm) {
  const q = encodeURIComponent(jpTerm);
  return {
    // Rakuten-Suche, s=11 = Preis aufsteigend (günstigstes zuerst)
    rakuten: `https://search.rakuten.co.jp/search/mall/${q}/?s=11`,
    // Amazon.co.jp, nach Preis aufsteigend sortiert
    amazon: `https://www.amazon.co.jp/s?k=${q}&s=price-asc-rank`,
    // Kakaku.com: search.kakaku.com ist die eigentliche Such-Domain
    kakaku: `https://search.kakaku.com/${q}/`,
    melonpanda: googleSiteSearch("melonpanda.com", originalTerm, ruTerm),
    nunibar: googleSiteSearch("nunibar.com", originalTerm, ruTerm),
  };
}

// ---------- Hauptsuche ----------

async function runSearch(rawTerm) {
  const term = rawTerm.trim();
  if (!term) return;

  els.searchBtn.disabled = true;
  els.resultsBox.classList.add("hidden");
  els.resultsList.innerHTML = "";
  els.shopLinks.classList.add("hidden");
  els.terms.classList.add("hidden");
  setStatus("Suche läuft …");

  // Suchbegriffe zusammenstellen: Original + japanische Fassung (Rakuten-Suche)
  // sowie parallel die russische Fassung (Melonpanda/Nunibar-Suche).
  const [jp, ru] = await Promise.all([
    translateToJapanese(term),
    translateToRussian(term),
  ]);
  const searchTerms = [term];
  if (jp && jp !== term) searchTerms.push(jp);

  // Für die japanischen Marktplätze den japanischen Begriff bevorzugen.
  // Melonpanda/Nunibar bekommen Original UND russische Fassung (per OR).
  const linkTerm = jp || term;
  const urls = shopSearchUrls(linkTerm, term, ru);
  els.linkRakuten.href = urls.rakuten;
  els.linkAmazon.href = urls.amazon;
  els.linkKakaku.href = urls.kakaku;
  els.linkMelonpanda.href = urls.melonpanda;
  els.linkNunibar.href = urls.nunibar;
  els.shopLinks.classList.remove("hidden");

  els.terms.textContent = "Gesucht als: " + searchTerms.join("  ·  ");
  els.terms.classList.remove("hidden");

  // Automatische Rakuten-Trefferliste (braucht App-ID UND Access Key).
  const appId = (localStorage.getItem(LS_RAKUTEN) || "").trim();
  const accessKey = (localStorage.getItem(LS_RAKUTEN_KEY) || "").trim();
  if (!appId || !accessKey) {
    setStatus("Tipp: Trage in den Einstellungen (⚙) deine kostenlose Rakuten " +
      "App-ID UND den Access Key ein, dann zeige ich dir hier automatisch " +
      "die günstigsten Rakuten-Treffer. Die Shop-Links unten funktionieren " +
      "schon jetzt.");
    els.searchBtn.disabled = false;
    return;
  }

  try {
    const found = [];
    let lastError = null;
    for (const kw of searchTerms) {
      try {
        const items = await rakutenSearch(appId, accessKey, kw);
        found.push(...items);
      } catch (e) {
        lastError = e;
        // Ungültige Zugangsdaten -> sofort abbrechen, sonst weiter versuchen.
        if (/invalid|parameter|application/i.test(e.message)) throw e;
      }
    }

    if (!found.length) {
      if (lastError) throw lastError;
      setStatus("Kein Rakuten-Treffer für diesen Namen. " +
        "Sieh über die Shop-Links unten nach.");
      els.searchBtn.disabled = false;
      return;
    }

    // Doppelte Treffer (gleicher Artikel über beide Suchbegriffe) zusammenführen.
    const byCode = new Map();
    for (const item of found) {
      if (!byCode.has(item.code)) byCode.set(item.code, item);
    }
    const results = [...byCode.values()]
      .sort((a, b) => a.price - b.price)
      .slice(0, 8);

    showResults(results);
    setStatus("");
  } catch (e) {
    const msg = /invalid|parameter|application/i.test(e.message)
      ? "Rakuten-Zugangsdaten (App-ID oder Access Key) scheinen ungültig " +
        "oder die Domain ist nicht freigegeben. Bitte in den Einstellungen (⚙) prüfen."
      : "Rakuten gerade nicht erreichbar (" + e.message + "). " +
        "Nutze die Shop-Links unten.";
    setStatus(msg, true);
  } finally {
    els.searchBtn.disabled = false;
  }
}

function showResults(items) {
  els.resultsList.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "resultCard";
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener";

    const img = document.createElement("img");
    img.className = "resultImg";
    img.alt = "";
    if (item.img) img.src = item.img;

    const info = document.createElement("div");
    info.className = "resultInfo";
    info.innerHTML =
      `<div class="resultName"></div>` +
      `<div class="resultShop"></div>` +
      `<div class="resultPrice"></div>` +
      `<span class="resultBuy">Jetzt kaufen ›</span>`;
    info.querySelector(".resultName").textContent = item.name;
    info.querySelector(".resultShop").textContent = item.shop;
    info.querySelector(".resultPrice").textContent = yen(item.price);

    a.append(img, info);
    li.appendChild(a);
    els.resultsList.appendChild(li);
  }
  els.resultsBox.classList.remove("hidden");
}

// ---------- Einstellungen ----------

function openSettings() {
  els.rakutenId.value = localStorage.getItem(LS_RAKUTEN) || "";
  els.rakutenKey.value = localStorage.getItem(LS_RAKUTEN_KEY) || "";
  els.settingsPanel.classList.remove("hidden");
}
function closeSettings() { els.settingsPanel.classList.add("hidden"); }
function saveSettings() {
  const id = els.rakutenId.value.trim();
  const key = els.rakutenKey.value.trim();
  if (id) localStorage.setItem(LS_RAKUTEN, id);
  else localStorage.removeItem(LS_RAKUTEN);
  if (key) localStorage.setItem(LS_RAKUTEN_KEY, key);
  else localStorage.removeItem(LS_RAKUTEN_KEY);
  closeSettings();
  setStatus(id && key
    ? "Rakuten-Zugangsdaten gespeichert."
    : "Rakuten-Zugangsdaten (App-ID + Access Key) noch unvollständig.");
}

// ---------- Events ----------

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  els.query.blur();
  runSearch(els.query.value);
});
els.settingsBtn.addEventListener("click", openSettings);
els.saveSettings.addEventListener("click", saveSettings);
els.closeSettings.addEventListener("click", closeSettings);
els.settingsPanel.addEventListener("click", (e) => {
  if (e.target === els.settingsPanel) closeSettings();
});
