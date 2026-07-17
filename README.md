# 🛒 Japan Preis-Finder

## ➡️ Tool öffnen

**https://chistyakovaanastasia-afk.github.io/japan-preis-finder/**

---

Ein einfaches Online-Tool, um den günstigsten Preis für ein Produkt in
Japan zu finden. Du gibst einen Namen ein (in beliebiger Sprache), das Tool
übersetzt ihn automatisch ins Japanische und sucht auf **Rakuten**,
**Amazon.co.jp**, **Kakaku.com**, **Melonpanda** und **Nunibar** — und führt
dich zum günstigsten Angebot.

Es ist eine **statische Web-App ohne Server**: einmal veröffentlicht,
öffnest du sie per Link auf iPad, iPhone oder jedem Browser.

## Was das Tool automatisch kann — und was nicht

| Shop | Was passiert |
|------|--------------|
| **Rakuten** | Über die offizielle Rakuten-Schnittstelle werden die **günstigsten Treffer automatisch** geholt und als Liste angezeigt (Name inkl. Größe/Menge, Preis in ¥, Shop, Direkt-Kauflink). Benötigt eine kostenlose Rakuten App-ID + Access Key. |
| **Amazon.co.jp** | Ein Tipp öffnet die Amazon-Suche **nach Preis sortiert (günstigstes zuerst)**. |
| **Kakaku.com** | Ein Tipp öffnet die Kakaku-Suche (zeigt je Produkt den günstigsten Händlerpreis). |
| **Melonpanda** | Ein Tipp öffnet eine Google-Seitensuche (`site:melonpanda.com`) für den Produktnamen. |
| **Nunibar** | Ein Tipp öffnet eine Google-Seitensuche (`site:nunibar.com`) für den Produktnamen. |

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
- Übersetzung über die kostenlose MyMemory-API (ohne Schlüssel); schlägt sie
  fehl, wird einfach mit dem Originalbegriff gesucht.
