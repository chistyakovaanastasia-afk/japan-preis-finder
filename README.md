# 🛒 Japan Preis-Finder + 🎌 Wunschliste

## ➡️ Tools öffnen

- **Preis-Finder:** https://chistyakovaanastasia-afk.github.io/japan-preis-finder/
- **Wunschliste:** https://chistyakovaanastasia-afk.github.io/japan-preis-finder/wunschliste.html

Beide Seiten sind über die Symbole oben rechts (🎌 / 🛒) direkt verbunden.

---

Ein einfaches Online-Tool, um den günstigsten Preis für ein Produkt in
Japan zu finden. Du gibst einen Namen ein (in beliebiger Sprache), das Tool
übersetzt ihn automatisch ins Japanische (für Rakuten, Amazon.co.jp,
Kakaku.com) sowie ins Russische (für Melonpanda, Nunibar) und sucht auf
allen fünf Shops — und führt dich zum günstigsten Angebot.

Es ist eine **statische Web-App ohne Server**: einmal veröffentlicht,
öffnest du sie per Link auf iPad, iPhone oder jedem Browser.

## Was das Tool automatisch kann — und was nicht

| Shop | Was passiert |
|------|--------------|
| **Rakuten** | Über die offizielle Rakuten-Schnittstelle werden die **günstigsten Treffer automatisch** geholt und als Liste angezeigt (Name inkl. Größe/Menge, Preis in ¥, Shop, Direkt-Kauflink). Benötigt eine kostenlose Rakuten App-ID + Access Key. |
| **Amazon.co.jp** | Ein Tipp öffnet die Amazon-Suche **nach Preis sortiert (günstigstes zuerst)**. |
| **Kakaku.com** | Ein Tipp öffnet die Kakaku-Suche (zeigt je Produkt den günstigsten Händlerpreis). |
| **Melonpanda** | Ein Tipp öffnet eine Google-Seitensuche (`site:melonpanda.com`) mit dem ins Russische übersetzten Produktnamen (russischsprachiger Shop). |
| **Nunibar** | Ein Tipp öffnet eine Google-Seitensuche (`site:nunibar.com`) mit dem ins Russische übersetzten Produktnamen (russischsprachiger Shop). |

**Warum nicht alles automatisch?** Nur Rakuten bietet eine offizielle,
aus dem Browser nutzbare Preis-API. Die anderen Shops blockieren das
direkte Auslesen (kein Server) oder haben keine eigene Preissuche —
deshalb bekommst du dort mit einem Tipp die bereits sortierte Suche bzw.
eine Google-Seitensuche, das ist der schnellste zuverlässige Weg.

## Rakuten App-ID einrichten (einmalig, kostenlos, ~1 Minute)

Damit oben automatisch der günstigste Rakuten-Preis erscheint:

1. Öffne <https://webservice.rakuten.co.jp/app/create>
2. Melde dich kostenlos an (Rakuten-Konto).
3. Lege eine App an (beliebiger Name, als App-URL genügt z. B. die Adresse
   dieses Tools oder `http://localhost`).
4. Kopiere die **„アプリID / applicationId“** (eine lange Zahl).
5. Im Tool auf **⚙ (oben rechts)** → App-ID einfügen → **Speichern**.

Die ID wird nur lokal in deinem Browser gespeichert (localStorage), nicht
an Dritte gesendet. Ohne ID funktionieren die Shop-Links trotzdem.

## Bedienung

1. Produktnamen eingeben (z. B. `Sony WH-1000XM5` oder `kabellose Kopfhörer`).
2. Auf **„Günstigsten Preis finden“** tippen.
3. Oben erscheint (mit App-ID + Access Key) eine Liste der günstigsten
   Rakuten-Treffer mit **„Jetzt kaufen“**-Link. Darunter die Buttons für
   Amazon.co.jp, Kakaku.com, Melonpanda und Nunibar, jeweils bereits nach
   Preis sortiert bzw. als Google-Seitensuche.

## Online stellen (GitHub Pages)

Die App besteht nur aus `index.html`, `style.css`, `app.js`. Einmalig
einrichten:

1. Im Repository auf **Settings → Pages**.
2. Unter **„Build and deployment“ → Source**: **„Deploy from a branch“**.
3. Branch: **`main`**, Ordner: **`/ (root)`** → **Save**.
4. Nach ~1 Minute erscheint oben die URL (Form:
   `https://<dein-name>.github.io/japan-preis-finder/`). Diese Adresse auf
   iPad/iPhone als Lesezeichen speichern.

Bei jedem weiteren Push auf `main` aktualisiert GitHub die Seite automatisch.

## Technik

- Reines HTML/CSS/JavaScript, keine Abhängigkeiten, kein Build-Schritt.
- Rakuten Ichiba Item Search API (JSONP, umgeht CORS).
- Übersetzung (Japanisch + Russisch) über die kostenlose MyMemory-API (ohne
  Schlüssel); schlägt eine Übersetzung fehl oder dauert zu lange (Timeout),
  wird einfach mit dem Originalbegriff gesucht.

## 🎌 Wunschliste (`wunschliste.html`)

Visuelle Merkliste für Produkte, die du aus Japan bestellen willst — Bild +
Name als Kachelraster.

| Funktion | Verhalten |
|----------|-----------|
| **Hinzufügen** | Produktnamen eintippen → Kachel erscheint sofort, das Bild wird im Hintergrund gesucht. |
| **Bild automatisch** | Reihenfolge: Rakuten-API (echtes Japan-Produktfoto, braucht App-ID + Access Key aus dem Preis-Finder) → Open Food Facts → dessen Spiegel `world.openfoodfacts.net` → Open Beauty Facts. Findet der volle Name nichts, wird zusätzlich nur mit Marke + Produkt (erste zwei Wörter) gesucht. |
| **Bild manuell** | In der Detailansicht: eigenes Foto hochladen (wird auf 700 px verkleinert) oder Bild-Adresse einfügen. Ohne Bild zeigt die Kachel den Anfangsbuchstaben. |
| **Zwei Spalten** | Jedes Produkt hat **„Was / wofür“** (z. B. „Creme · Gesicht“, „Nahrungsergänzung · Abnehmen“) und **„Für wen“** (Ich, Mami, Papi, Großmutter …). Beide Felder gibt es direkt im Erfassungsformular (mit Vorschlagsliste) und in der Detailansicht. |
| **Ansicht** | Umschalter oben rechts: **Kacheln** (Bild groß, darunter die zwei Spalten) oder **Tabelle** (Bild · Produkt · Was/wofür · Für wen als Zeilen mit Spaltenüberschriften). |
| **Filter** | Farbige Chips je Person (Farbe wird aus dem Namen abgeleitet): antippen = nur deren Produkte, nochmal antippen = alle. |
| **Abhaken** | ✓ auf der Kachel → sie wird blass/graustufig, durchgestrichen und wandert in den zugeklappten Bereich **„Erledigt (n)“**. |
| **Wieder aktivieren** | Bereich „Erledigt“ aufklappen → ✓ erneut tippen (oder in der Detailansicht „Zurück auf ‚geplant‘“). Nichts geht verloren. |
| **Detailansicht** | Kachel antippen: Name, Notiz (Größe/Menge/Variante), Bild ändern, „Preise suchen“ (öffnet den Preis-Finder mit diesem Namen), löschen. |
| **Sicherung** | Export/Import als JSON-Datei, um die Liste auf ein anderes Gerät zu bringen. |

Die Liste liegt im **localStorage** des Browsers — kein Server, kein Konto.
Sie bleibt geräte- und browsergebunden, deshalb die Sicherungs-Funktion.

**Feste Vorschläge:** In `wunschliste.js` gibt es oben die Konstante `SEED`.
Produkte, die dort eingetragen sind (`{ id: "seed-…", name, what, who, note, img }`),
erscheinen automatisch auf jedem Gerät, das die Seite öffnet. Einmal gelöschte
Vorschläge kommen nicht zurück, abgehakte behalten ihren Status.
