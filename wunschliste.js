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
const SEED = [
  {
    id: "seed-decorte-aq-neck-cream",
    name: "DECORTÉ AQ Concentrate Neck Cream",
    what: "Creme · Hals & Dekolleté",
    who: "Mami & Ich",
    note: "100 ml (3,4 oz) · Kosé Decorté · JQNK",
    img: "https://decortecosmetics.com/cdn/shop/files/" +
         "Untitleddesign-2026-06-24T161336.867.png?v=1782332025&width=600",
  },
  {
    id: "seed-wmt-placenta-serum",
    name: "ARTISTIC&CO. WMT Placenta Serum",
    what: "Serum · Gesicht · Pigmentflecken",
    who: "Mami",
    note: "30 ml · wasserfreie Formel mit Pferdeplazenta (Hokkaido), " +
          "Vitamin C (Ascorbylglucosid) und Ceramiden",
    img: "https://cdn11.bigcommerce.com/s-opcezazwov/images/stencil/640w/" +
         "products/1412/2839/WMTPLACENTASERUM30ml__80789.1718714318.jpg",
  },
  {
    id: "seed-mission-facial-gommage",
    name: "MISSION Facial Gommage",
    what: "Peeling · Gesicht (mild, auch täglich)",
    who: "Mami & Ich",
    note: "70 g · schwach saures Gommage mit Glucomannan und gemahlenen " +
          "Aprikosenkernen, Duft Rosmarin/Zedernholz · FMG & MISSION",
    img: "https://baseec-img-mng.akamaized.net/images/item/origin/" +
         "55c8c549e7958db1b9fe45001c171972.jpg?imformat=generic&q=90" +
         "&im=Resize,width=600,type=normal",
  },
  {
    id: "seed-enzym-aem150",
    name: "ENZYM AEM150 Eierschalenmembran-Kapseln",
    what: "Nahrungsergänzung · Gelenke & Haut",
    who: "Mami & Ich",
    note: "90 Kapseln · Eierschalenmembran-Pulver, Lachs-Nasenknorpel, " +
          "Fischkollagen, Elastin, Hyaluron, Niacin, Vitamine B1/B2/B6/B12/C · " +
          "Enchiem (ENZYM), Osaka",
    img: "https://enzym.jp/wp/wp-content/uploads/2026/09/AEM150.jpg",
  },
  {
    id: "seed-perserum-rt",
    name: "Perserum RT #02 (パーセラムRT美容液)",
    what: "Serum · Gesicht · Anti-Aging (Retinol)",
    who: "Ich",
    note: "14 Sachets (7 × 2 Blatt) · Retinylpalmitat, Niacinamid, Elastin- " +
          "und Kollagenpeptid · ein Sachet = eine Anwendung · Takamitsu, 3.300 ¥",
    img: "https://kk-takamitsu.co.jp/wp-content/uploads/2024/11/" +
         "perserum_rt-1024x845.png",
  },
  {
    id: "seed-recore-inner-balance",
    name: "RECORE SERUM 乳酸菌インナーバランスケア",
    what: "Nahrungsergänzung · Darm & Mikrobiom",
    who: "Ich",
    note: "30 Kapseln (12 g), 1–2 täglich · Enzamin, Milchsäurebakterien EC-12, " +
          "Bifidobakterien BR-108, Lactulose, Ballaststoffe · ca. 650 Mrd. " +
          "Milchsäurebakterien pro Tagesdosis · 5.200 ¥",
    img: "https://shop.recoreserum.jp/cdn/shop/files/" +
         "e31f28420630cc821e45f41f6143ee10.png?v=1779069634&width=600",
  },
  {
    id: "seed-mamu-slim-plus",
    name: "mamu MEDICAL SLIM+",
    what: "Nahrungsergänzung · Abnehmen & Gewichtskontrolle",
    who: "Ich",
    note: "90 Tabletten / 30 Tage (25,2 g), 3 täglich · weiße Bohnen, " +
          "Kartoffelextrakt (Slendesta WD), Salacia, resistentes Dextrin, " +
          "Milchsäurebakterien H61 · 5.940 ¥",
    img: "https://d2w53g1q050m78.cloudfront.net/mamuonlinejp/ec_assets/" +
         "c73eca249feb2fefd5dc3f6c67df1dc4fb5444c9-original.png",
  },
  {
    id: "seed-pola-wrinkle-shot",
    name: "POLA Wrinkle Shot Medical Serum N",
    what: "Serum · Falten (auch Augenpartie)",
    who: "Mami",
    note: "20 g · リンクルショット メディカル セラム N · Wirkstoff NEI-L1 " +
          "(ニールワン), Quasi-Arzneimittel gegen Falten · POLA, 14.850 ¥",
    img: "https://www.pola.co.jp/online-store/images/products/g-0850/0850.jpg",
  },
  {
    id: "seed-decorte-liposome-eye-serum",
    name: "DECORTÉ Liposome Advanced Repair Eye Serum",
    what: "Serum · Augenpartie · Falten",
    who: "Mami",
    note: "20 ml · mehrschichtige Bio-Liposomen für die Augenpartie · " +
          "offiziell 8.800 ¥, bei japonabeauty 12.500 ¥",
    img: "https://japonabeauty.com/wp-content/uploads/2026/01/" +
         "u259zsf41rropmt0qdhf8pb4mb56mhyp.png",
  },
  {
    id: "seed-dr-slim-scientist",
    name: "ALEN Dr.SLIM Scientist",
    what: "Nahrungsergänzung · Abnehmen & Stoffwechsel",
    who: "Ich",
    note: "180 Kapseln, 6 täglich = 30 Tage · Granatapfel-, Salacia-, " +
          "Black-Ginger- und weiße-Bohnen-Extrakt · Alen International · " +
          "9.600 ¥ bei japonabeauty",
    img: "https://japonabeauty.com/wp-content/uploads/2026/06/img_9148.webp",
  },
  {
    id: "seed-enzym-omega3-shark",
    name: "ENZYM SUPER MIX Omega III + Shark Liver Oil",
    what: "Nahrungsergänzung · Herz & Immunsystem",
    who: "Familie",
    note: "90 Kapseln · pro 4 Kapseln DHA 366 mg und EPA 126 mg, dazu " +
          "Haifischleberöl und Astaxanthin · Enzym Corporation · " +
          "9.500 ¥ bei japonabeauty",
    img: "https://japonabeauty.com/wp-content/uploads/2026/08/img_1159.jpeg",
  },
  {
    id: "seed-predia-fango-sebum-clear",
    name: "KOSÉ Predia Spa et Mer Fango Sebum Clear Pack",
    what: "Maske · Gesicht · Poren & Talg",
    who: "Ich",
    note: "60 g · natürliche Mineralschlamm-Maske zur Porenreinigung · " +
          "5.100 ¥ bei japonabeauty",
    img: "https://japonabeauty.com/wp-content/uploads/2026/02/" +
         "23c8c54ab3e1b19b9227e4fc8e6ce53a.png",
  },
  {
    id: "seed-aid-004-shilajit",
    name: "+AID 004 Shilajit",
    what: "Nahrungsergänzung · Schwellungen im Gesicht",
    who: "Mami & Ich",
    note: "Komplex auf Basis von Mumijo (Shilajit) · laut Shop gegen " +
          "Gesichtsschwellungen, unterstützt außerdem den Blutzucker · " +
          "9.600 ¥ bei japonabeauty",
    img: "https://japonabeauty.com/wp-content/uploads/2026/05/img_1153.jpeg",
  },
  {
    id: "seed-dr-nemuri-scientist",
    name: "ALEN Dr.NEMURI Scientist",
    what: "Nahrungsergänzung · Schlaf & Regeneration",
    who: "Ich",
    note: "Funktionelles Supplement für Schlafqualität, kognitive Funktion " +
          "und Stressadaption · Alen International · 9.800 ¥ bei japonabeauty",
    img: "https://japonabeauty.com/wp-content/uploads/2026/05/img_7645.jpeg",
  },
  {
    id: "seed-reality-hien-birdnest-white",
    name: "reality [s]collection 飛燕 – Schwalbennest weiß",
    what: "Nahrungsergänzung · Gelenke",
    who: "Ich",
    note: "180 Kapseln, 1 täglich = 2 Monate · weiße Dose = Gelenke " +
          "(schwarze Dose = Haut) · Made in Japan · 18.660 ¥ bei japonabeauty",
    img: "https://japonabeauty.com/wp-content/uploads/2026/05/" +
         "c66e5110-e0a4-4a5e-8eff-3930e263de36.jpeg",
  },
  {
    id: "seed-kao-pureora-carbonated",
    name: "KAO PureOra Carbonated Toothpaste",
    what: "Zahnpasta · Zahnfleisch & Parodontitis",
    who: "Ich",
    note: "95 g · ピュオーラ 炭酸洗浄ハミガキ, medizinische Zahnpasta mit " +
          "Kohlensäure-Rezeptur und Fluorid, Geschmack Crystal Soda · " +
          "KAO · bei Nunibar",
    img: "https://nunibar.com/media/catalog/product/cache/" +
         "dd4850ad4231b6306bceadf38a0bbeed/8/1/81ztc-6zb3l._ac_sl1500_.jpg",
  },
  {
    id: "seed-lureaqu-intensive-repair-gel",
    name: "LUREAQU Intensive Repair Gel",
    what: "Gel-Serum · Augen, Lippen, Nasolabialfalten",
    who: "Mami",
    note: "20 g · fermentierter „Retiniamid“-Komplex mit Niacinamid, " +
          "Retinylpalmitat und Reiskleie · auch für Elektroporations-Geräte · " +
          "6.820 ¥ bei Melonpanda",
    img: "https://imgproxy.melonpanda.com/" +
         "Xp97caTPfCTPmR9K40SNVPjc2zRVEjnsiBk9UeNmnEY/rs:auto:1080:1080/" +
         "ar:0/sm:1/scp:1/cb:1/aHR0cHM6Ly9tZWxvbnBhbmRhLmNvbS91cGxvYWRzL2lt" +
         "YWdlcy9jYTJhZjAyZTc2YzhmZmFjZGQ2YTU5YzllZjk2ZTI0Mi53ZWJw",
  },
  {
    id: "seed-asahi-beauty-in-protein",
    name: "Asahi Slim Up Slim Shape BEAUTY in PROTEIN",
    what: "Protein-Shake · Kollagen & Figur",
    who: "Mami & Ich",
    note: "300 g = 10–20 Portionen (30 g) · pro Portion 15 g Protein, " +
          "10.000 mg Kollagen, 11 Vitamine, Eisen, Calcium, 300 Mio. " +
          "Milchsäurebakterien, 94–99 kcal · Sorten: Mango-Orange " +
          "(mit L-Carnitin) und Acai-Beere (mit Granatapfel-Ferment) · " +
          "3.204 ¥ bei Melonpanda",
    img: "https://imgproxy.melonpanda.com/" +
         "DkOwFWw5Z01p1IfdjNuKHW7VcjrXBOB75o897HeBfkk/rs:auto:1080:1080/" +
         "ar:0/sm:1/scp:1/cb:1/aHR0cHM6Ly9tZWxvbnBhbmRhLmNvbS91cGxvYWRzL2lt" +
         "YWdlcy8zOGViMDAxMDdhYTc2NjhhNWZiNGFjMmYwYmMyNTcwNC5qcGc",
  },
  {
    id: "seed-apadent-total-care",
    name: "APADENT Total Care Toothpaste",
    what: "Zahnpasta · Karies, Zahnfleisch, Zahnschmelz",
    who: "Mami & Ich",
    note: "120 g · medizinisches Hydroxylapatit (mHAP) zur Remineralisierung, " +
          "medizinische Zahnpasta (薬用), milder Minzgeschmack · Sangi · " +
          "bei Melonpanda",
    img: "https://imgproxy.melonpanda.com/" +
         "qLjHVof_h2Ux6mkbQwTEOjw-8LBAXnGGX0N_V2iqcMo/rs:auto:1080:1080/" +
         "ar:0/sm:1/scp:1/cb:1/aHR0cHM6Ly9tZWxvbnBhbmRhLmNvbS91cGxvYWRzL2lt" +
         "YWdlcy82ZTk3OWFkNzJkMDRmYTUxZGJkOWZiZTAzYjVhZDliMy5qcGc",
  },
  {
    id: "seed-grown-care-nail-oil",
    name: "Grown Care Cuticle Care Oil",
    what: "Öl · Nägel & Nagelhaut",
    who: "Ich",
    note: "10 ml · Pflanzenöle mit Pferdeöl und Bergamotte · " +
          "3.200 ¥ bei japonabeauty, auf Rakuten ab 1.729 ¥ inkl. Steuer " +
          "(Shop „Hiro land“, Versand innerhalb Japans frei)",
    img: "https://japonabeauty.com/wp-content/uploads/2026/03/img_4929-1.jpeg",
  },
  {
    id: "seed-chondroitin-e-plus",
    name: "コンドロイチンE プラス (Chondroitin E Plus)",
    what: "Nahrungsergänzung · Gelenke & Knorpel",
    who: "Familie",
    note: "2 Dosen à 90 Tabletten, 3 täglich = je 30 Tage · Chondroitin aus " +
          "Tintenfischknorpel, N-Acetylglucosamin, Anserin, Teufelskralle, " +
          "Hyaluronsäure · Nihon Chokuhan (Rakuten-Shop), 6.110 ¥",
    img: "https://image.rakuten.co.jp/nihonchokuhan/cabinet/250/250417-01.jpg",
  },
  {
    id: "seed-lamer-md-metabolaid",
    name: "Lamer MD (früher Metabolaid Cysteine)",
    what: "Nahrungsergänzung · Abnehmen & Stoffwechsel",
    who: "Ich",
    note: "60 Kapseln (21 g), 2–4 täglich · pro 4 Kapseln 500 mg Metabolaid " +
          "(Hibiskus + Zitronenverbene, spanisches Patent) und 168 mg " +
          "Cystein-Hefeextrakt · Lamer, UVP 6.800 ¥ zzgl. Steuer",
    img: "https://lamer-avs.co.jp/wps/wp-content/uploads/2026/04/MD-2026.jpg",
  },
  {
    id: "seed-lamer-haritamago",
    name: "Lamer HARITAMAGO",
    what: "Nahrungsergänzung · Haut & Gelenke",
    who: "Familie",
    note: "120 Kapseln (30 g), 4 täglich = 1.000 mg · davon 450 mg " +
          "wasserlösliches Eierschalenmembran-Pulver (US-Patentverfahren) " +
          "mit Kollagen, Elastin und 20 Aminosäuren · enthält Ei · " +
          "Lamer, UVP 6.800 ¥",
    img: "https://www.beautygarage.jp/medias/sys_master/images/h4d/he8/" +
         "12603324203038.jpg",
  },
  {
    id: "seed-ferialab-deazaflavin-5ala",
    name: "FeriaLab Deazaflavin plus 5-ALA",
    what: "Nahrungsergänzung · Anti-Aging & Mitochondrien",
    who: "Familie",
    note: "30 Kapseln (9,45 g), 1 täglich = 1 Monat · 30 mg 5-Deazaflavin " +
          "(TND1128) pro Kapsel, dazu 5-ALA, Coenzym Q10, Zink-Hefe und " +
          "Rotwein-Extrakt · benri.ru 14.790 ₽ (≈ 26.600 ¥); auf Rakuten " +
          "20-Kapsel-Beutel 8.415 ¥, 30 Kapseln ab 19.800 ¥",
    img: "https://benri.ru/thumb/2/Em56NKK9WnYSaj_6-YVdBA/350r350/d/" +
         "51fgun4enal_ac_sx679.jpg",
  },
  {
    id: "seed-alaplus-5ala-20",
    name: "ALAPLUS 5-ALA 20 (アラプラス 5-ALA)",
    what: "Nahrungsergänzung · Energie & Schlafrhythmus",
    who: "Familie",
    note: "60 Tabletten = 30 Tage, 2 täglich · Tagesdosis 20 mg 5-ALA " +
          "(5-Aminolävulinsäure-Phosphat) plus Eisencitrat · " +
          "SBI ALApromo · 3.600 ¥ bei Melonpanda",
    img: "https://imgproxy.melonpanda.com/" +
         "OJAE6IGPHb9kVIuAeY8hRM41h36lli4VMsrY0IC5-9I/rs:auto:1080:1080/" +
         "ar:0/sm:1/scp:1/cb:1/aHR0cHM6Ly9tZWxvbnBhbmRhLmNvbS91cGxvYWRzL2lt" +
         "YWdlcy9mMTdjNTAxMGRkZjkxOThlN2Q4NTBjZmIzZDVlMjQ5OS5qcGc",
  },
];

const els = {
  addForm: $("addForm"),
  addName: $("addName"),
  addWhat: $("addWhat"),
  addWho: $("addWho"),
  addBtn: $("addBtn"),
  counts: $("counts"),
  viewToggle: $("viewToggle"),
  filterRow: $("filterRow"),
  rowHead: $("rowHead"),
  searchInput: $("searchInput"),
  searchClear: $("searchClear"),
  noMatch: $("noMatch"),
  whoList: $("whoList"),
  whatList: $("whatList"),
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
  sheetWhat: $("sheetWhat"),
  sheetWho: $("sheetWho"),
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

// Interner Wert für den Filter "Ohne Zuordnung" (kann kein echter Name sein).
const NO_PERSON = "\u0000ohne";

let state = {
  items: [],
  removedSeeds: [],
  boughtOpen: false,
  view: "grid",   // "grid" = Kacheln, "list" = Tabelle
  filter: "",     // "" = alle, sonst Person bzw. NO_PERSON
};
let openId = null;   // gerade in der Detailansicht geöffnetes Produkt
let search = "";     // aktueller Suchtext, absichtlich nicht gespeichert

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.items = Array.isArray(data.items) ? data.items : [];
      state.removedSeeds = Array.isArray(data.removedSeeds) ? data.removedSeeds : [];
      state.boughtOpen = !!data.boughtOpen;
      state.view = data.view === "list" ? "list" : "grid";
      state.filter = typeof data.filter === "string" ? data.filter : "";
      // Ältere Einträge kennen "what"/"who" noch nicht.
      for (const it of state.items) {
        if (typeof it.what !== "string") it.what = "";
        if (typeof it.who !== "string") it.who = "";
      }
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
      what: s.what || "",
      who: s.who || "",
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

// Farbe je Person, damit man beim Überfliegen sofort sieht, für wen etwas ist.
function personHue(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

function applyPersonColor(el, who) {
  if (!who) return;
  const hue = personHue(who.toLowerCase());
  el.style.background = `hsl(${hue} 45% 22%)`;
  el.style.color = `hsl(${hue} 70% 82%)`;
}

// Suche unempfindlich gegen Groß-/Kleinschreibung, Akzente und Umlaut-
// Schreibweisen machen: "Süßigkeit", "suessigkeit" und "sussigkeit" sollen
// alle treffen. Dafür werden beide Umschriften gebildet und verglichen.
const stripMarks = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ä -> a, ß -> ss
const foldPlain = (t) => stripMarks((t || "").toLowerCase().replace(/ß/g, "ss"));

// ä -> ae, ö -> oe, ü -> ue, ß -> ss
const foldGerman = (t) => stripMarks((t || "").toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss"));

// "Mami & Ich", "Mami, Papi" oder "Mami und Ich" -> ["Mami", "Ich"] bzw.
// ["Mami", "Papi"]. So zählt ein Produkt für jede genannte Person.
function whoNames(item) {
  return (item.who || "")
    .split(/\s*(?:[,&+/]|\bund\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function matchesFilter(item) {
  const names = whoNames(item);
  if (state.filter === NO_PERSON) {
    if (names.length) return false;
  } else if (state.filter && !names.includes(state.filter)) {
    return false;
  }
  if (!search) return true;
  // Jedes Suchwort muss irgendwo vorkommen (Name, Kategorie, Person, Notiz).
  const text = [item.name, item.what, item.who, item.note].join(" ");
  const haystack = foldPlain(text) + " \u0000 " + foldGerman(text);
  return search.split(/\s+/).filter(Boolean)
    .every((word) => haystack.includes(foldPlain(word)) ||
                     haystack.includes(foldGerman(word)));
}

function render() {
  const shown = state.items.filter(matchesFilter);
  const open = shown.filter((i) => !i.bought);
  const bought = shown.filter((i) => i.bought);

  // Neueste zuerst; erledigte nach Kaufdatum.
  open.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  bought.sort((a, b) => (b.boughtAt || 0) - (a.boughtAt || 0));

  const listView = state.view === "list";
  for (const ul of [els.openGrid, els.boughtGrid]) {
    ul.classList.toggle("grid", !listView);
    ul.classList.toggle("rows", listView);
  }
  els.viewToggle.textContent = listView ? "▦ Kacheln" : "☰ Tabelle";
  els.rowHead.classList.toggle("hidden", !listView || open.length === 0);

  els.openGrid.replaceChildren(...open.map(listView ? row : card));
  els.boughtGrid.replaceChildren(...bought.map(listView ? row : card));

  const nothingShown = open.length === 0 && bought.length === 0;
  els.emptyHint.classList.toggle("hidden", state.items.length > 0);
  els.noMatch.classList.toggle("hidden", !(state.items.length > 0 && nothingShown));
  const filterLabel = state.filter === NO_PERSON ? "ohne Zuordnung" : state.filter;
  els.counts.textContent = state.items.length
    ? `${open.length} geplant · ${bought.length} erledigt` +
      (filterLabel ? ` · ${filterLabel}` : "") +
      (search ? ` · Suche „${search}“` : "")
    : "";

  els.boughtSection.classList.toggle("hidden", bought.length === 0);
  els.boughtLabel.textContent = `✓ Erledigt (${bought.length})`;
  els.boughtGrid.classList.toggle("hidden", !state.boughtOpen);
  els.boughtToggle.setAttribute("aria-expanded", String(state.boughtOpen));
  els.boughtChevron.classList.toggle("open", state.boughtOpen);

  renderFilters();
  refreshSuggestions();
}

// Vorschlagslisten erweitern: alles, was schon einmal vergeben wurde, steht
// beim nächsten Eintrag als Vorschlag bereit — so lassen sich jederzeit neue
// Personen (oder Kategorien) ergänzen, ohne den Code anzufassen.
function refreshSuggestions() {
  addOptions(els.whoList, state.items.flatMap(whoNames));
  addOptions(els.whatList, state.items.map((i) => i.what));
}

function addOptions(list, values) {
  const known = new Set([...list.options].map((o) => o.value.toLowerCase()));
  for (const value of values) {
    const v = (value || "").trim();
    if (!v || known.has(v.toLowerCase())) continue;
    known.add(v.toLowerCase());
    const option = document.createElement("option");
    option.value = v;
    list.appendChild(option);
  }
}

// Filterleiste: „Alle“ + jede vergebene Person (+ „Ohne Zuordnung“).
function renderFilters() {
  const people = [...new Set(state.items.flatMap(whoNames))]
    .sort((a, b) => a.localeCompare(b, "de"));
  const hasUnassigned = state.items.some((i) => whoNames(i).length === 0);
  els.filterRow.classList.toggle("hidden", people.length < 2 && !state.filter);
  if (els.filterRow.classList.contains("hidden")) {
    els.filterRow.replaceChildren();
    return;
  }

  const chips = [{ label: "Alle", value: "" }];
  for (const p of people) chips.push({ label: p, value: p });
  if (hasUnassigned) chips.push({ label: "Ohne Zuordnung", value: NO_PERSON });

  els.filterRow.replaceChildren(...chips.map(({ label, value }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "filterChip" + (state.filter === value ? " active" : "");
    b.textContent = label;
    if (value && value !== NO_PERSON && state.filter !== value) applyPersonColor(b, value);
    b.addEventListener("click", () => {
      state.filter = state.filter === value ? "" : value;
      save();
      render();
    });
    return b;
  }));
}

// Die beiden Spalten „Was / wofür“ und „Für wen“.
function metaCells(item) {
  const wrap = document.createElement("div");
  wrap.className = "meta";

  const what = document.createElement("span");
  what.className = "metaWhat";
  what.textContent = item.what || "—";
  if (!item.what) what.classList.add("metaEmpty");

  wrap.append(what, whoChips(item));
  return wrap;
}

// Ein Chip je Person; ohne Zuordnung ein blasses "—".
function whoChips(item) {
  const box = document.createElement("span");
  box.className = "whoBox";
  const names = whoNames(item);
  if (!names.length) {
    const empty = document.createElement("span");
    empty.className = "metaWho metaEmpty";
    empty.textContent = "—";
    box.appendChild(empty);
    return box;
  }
  for (const name of names) {
    const chip = document.createElement("span");
    chip.className = "metaWho";
    chip.textContent = name;
    applyPersonColor(chip, name);
    box.appendChild(chip);
  }
  return box;
}

function checkButton(item) {
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
  return check;
}

function imageFor(item, className) {
  const figure = document.createElement("div");
  figure.className = className;
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
  return figure;
}

function nameBlock(item) {
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
  text.appendChild(metaCells(item));
  return text;
}

// Kachelansicht
function card(item) {
  const li = document.createElement("li");
  li.className = "card" + (item.bought ? " isBought" : "");

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "cardMain";
  openBtn.addEventListener("click", () => openSheet(item.id));
  openBtn.append(imageFor(item, "cardImgWrap"), nameBlock(item));

  li.append(openBtn, checkButton(item));
  return li;
}

// Tabellenansicht: Bild · Name · Was/wofür · Für wen
function row(item) {
  const li = document.createElement("li");
  li.className = "card rowCard" + (item.bought ? " isBought" : "");

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.className = "rowMain";
  openBtn.addEventListener("click", () => openSheet(item.id));

  const text = document.createElement("div");
  text.className = "rowText";
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

  const what = document.createElement("div");
  what.className = "rowWhat" + (item.what ? "" : " metaEmpty");
  what.textContent = item.what || "—";

  const who = whoChips(item);
  who.classList.add("rowWho");

  openBtn.append(imageFor(item, "rowImgWrap"), text, what, who);
  li.append(openBtn, checkButton(item));
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

  const item = {
    id: newId(),
    name,
    what: els.addWhat.value.trim(),
    who: els.addWho.value.trim(),
    note: "",
    img: "",
    bought: false,
    createdAt: Date.now(),
  };
  state.items.push(item);
  save();
  render();
  els.addName.value = "";
  // "Was/wofür" und "Für wen" stehen lassen: beim Erfassen mehrerer Produkte
  // für dieselbe Person spart das jedes Mal zwei Eingaben.

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
  const parts = [item.bought ? "erledigt" : "geplant"];
  if (item.what) parts.push(item.what);
  if (item.who) parts.push("für " + item.who);
  els.sheetState.textContent = parts.join(" · ");
  els.sheetState.classList.toggle("done", !!item.bought);
  els.sheetName.value = item.name;
  els.sheetWhat.value = item.what || "";
  els.sheetWho.value = item.who || "";
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
  item.what = els.sheetWhat.value.trim();
  item.who = els.sheetWho.value.trim();
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

els.searchInput.addEventListener("input", () => {
  search = els.searchInput.value.trim();
  els.searchClear.classList.toggle("hidden", !search);
  render();
});

els.searchClear.addEventListener("click", () => {
  els.searchInput.value = "";
  search = "";
  els.searchClear.classList.add("hidden");
  els.searchInput.focus();
  render();
});

els.viewToggle.addEventListener("click", () => {
  state.view = state.view === "list" ? "grid" : "list";
  save();
  render();
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
