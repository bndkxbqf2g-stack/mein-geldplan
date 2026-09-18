# Mein Geldplan v36 Clean

GitHub-Pages-kompatible iPhone-PWA auf Basis des Projektauftrags v35 Final.

## Dateien
- index.html
- style.css
- app.js
- budget.js
- history.js
- fixkosten.js
- payroll.js
- storage.js
- manifest.json
- sw.js
- icon.svg

## Budgetlogik
- Ein Lohn pro Monat.
- Lohn am letzten Bankwerktag (Mo–Fr) des Monats.
- Fixkosten werden nur bei der Lohnbuchung abgezogen.
- Bargeld wird manuell geführt.
- Gesamtvermögen = Giro + Bargeld.
- Tagesbudget = Gesamtvermögen / Resttage bis zum nächsten Lohn.
- Wochensatz = Tagessatz × 7.
- Sonntags: Ziel-Bargeld 120 €; es erfolgt keine automatische Abhebung.
- Die Gehaltsprognose verändert niemals das Budget.

## Daten
Der initiale Giro-Saldo ist entsprechend der zuletzt im Projekt erfassten Vorgabe auf 147,30 € gesetzt. Alle Daten werden lokal im Browser gespeichert. Backups sind als JSON exportier- und importierbar.

## Gehaltsmodul
Der lokale PDF-Parser ist auf die im Quellenpaket dokumentierte Zeitnachweisstruktur ausgelegt und erkennt die sieben geforderten Codes: 5010, 5011, 5014, 5024, 5161, 5211, 5212. Nicht eindeutig dokumentierte Euro-Sätze werden nicht erfunden und deshalb als "Satz fehlt" ausgewiesen.

## Hinweis Pfändung
Das Quellenpaket enthält die Mitteilung über die Änderung der Pfändungsfreigrenzen 2026, aber keine vollständige Pfändungstabelle 2026. Deshalb werden dafür keine fehlenden Tabellenwerte erfunden.
