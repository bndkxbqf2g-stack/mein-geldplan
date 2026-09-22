# Changelog

## v0.18.4
- „Nächste Abhebung“ zeigt den kommenden Sonntag.
- Liegt der nächste Lohntag vor diesem Sonntag, wird stattdessen der Lohntag angezeigt.
- Budgetberechnung aus v0.18.3 bleibt unverändert.

## v0.18.3
- Bugfix: Im laufenden Altbestand vor dem nächsten Lohn wird das Giro-Budget nicht mehr für die bereits durch Bargeld abgedeckten Tage bis Samstag berechnet.
- Tages- und Wochenbudget beziehen sich auf den nächsten Abhebungssonntag und dessen Budgetabschnitt bis Samstag bzw. bis zum Tag vor dem Lohneingang.
- Beispiel 22.09.2026: 8 Tage bis Lohn bleiben sichtbar; Budgetbasis ist 27.09.–29.09. (3 Tage).
- Bargeld bleibt vollständig außerhalb der Tages-/Wochenbudget-Berechnung und reduziert nur die zusätzlich mögliche Abhebung.

## v0.1.0
- Modulstruktur angelegt

## Step 9 – PDF/Zeitnachweis
- `lib/pdf.js`: PDF-Text lazy laden und Zeitlohnarten streng erkennen.
- PDF.js wird erst beim Import geladen.
- Unklare Werte/unbekannte Codes werden als „Bitte prüfen“ markiert.
- `tests/pdf.test.js`: Parser, Monatszuordnung, Konflikte und Nicht-Raten abgesichert.

## Step 10 – Salary / Brutto-Netto
- `lib/salary.js` kapselt Gehaltsprognose, Sozialversicherung und Pfändung.
- Lohnsteuer/Soli: BMF-PAP 2026 über lazy geladenes, auf Version 1.0.7 fixiertes `lohnsteuerrechner`-Modul.
- BKK-firmus-/SV-Profil und Beitragsbemessungsgrenzen 2026 zentral in `config/salary-2026.js`.
- VBL-Arbeitnehmeranteil und ZV-SV-Hinzubetrag an Bezügemitteilung 07/2026 kalibriert.
- Pfändung 2026 für zwei Unterhaltspflichten aus der amtlichen Tabelle abgebildet.
- Alte Näherungsformel aus `app.js` entfernt.

## Step 11
- Salary-UI an `lib/salary.js` angebunden und Prognoseverlauf gespeichert.
- Pfändungslogik 2026 gegen amtliche Tabelle abgesichert.
- Nacht-/Sonntagszuschläge getrennt von Samstag/Schicht behandelt.
- Samstag und Schicht bleiben steuer-/pfändungspflichtig; Nacht/Sonntag werden separat geschützt ausgewiesen.
- Prognosehistorie bleibt strikt vom Budget getrennt.

## Step 12
- Bezügemitteilungen als PDF einlesen
- aktuelle Abrechnungsperiode von Rückrechnungen trennen
- Prognose mit Gesamtbrutto, gesetzlichem Netto, Pfändung und Auszahlung vergleichen
- reale Abrechnungen getrennt vom Budget speichern

## Step 13 – Salary/PDF UI ausgelagert
- Gehalts-, Zeitnachweis- und Bezügemitteilungs-UI aus `app.js` nach `lib/salary-ui.js` verschoben.
- `app.js` von 322 auf 205 Zeilen reduziert.
- Keine Fachlogik geändert.
- PWA-Version auf v51 erhöht.
- Neue UI-Helfertests ergänzt.

## Step 14 – Budget/UI Cleanup
- Budget-/Bargeld-UI nach `lib/budget-ui.js` ausgelagert.
- Spar-UI nach `lib/savings-ui.js` ausgelagert.
- Gemeinsame UI-Helfer in `lib/ui.js`.
- `app.js` auf Initialisierung/Verkabelung reduziert.
- Tote Sparziel-/Monats-Helfer aus `app.js` entfernt.
- PWA-Version auf v52 erhöht.


## Step 15 – Integritätscheck / sichtbare Funktionen wieder angebunden
- Fixkosten-Verwaltung wieder funktionsfähig und persistent; alter Gesamtwert 2.156 € wird als kompatibler Standard übernommen.
- Lohnbuchung nutzt jetzt die tatsächlich verwaltete Fixkostensumme statt eines versteckten Hardcodes.
- Kontostandkorrektur wieder angebunden.
- Übersicht, letzter Verlauf, kompletter Verlauf, Monatsvergleich und Monatsgrafik wieder angebunden.
- Backup/Restore der lokalen App-Daten wieder angebunden.
- Service Worker wird wieder registriert; Update-Button prüft auf neue Versionen.
- PWA-Cache auf v53 erhöht.
- Integritätstest prüft alle sichtbaren Aktionsbuttons.
## Step 16 – Vollständiger Budgetzyklus-Simulationstest
- kompletter Zyklus 30.09.–30.10.2026 als End-to-End-Test ergänzt
- Bargeldrest, freiwillig kleinere Abhebung, Sparrate, Kartenausgabe und neuer Lohn geprüft
- Wochenabhebung ist nun ausschließlich am Sonntag des aktiven Abschnitts möglich
- PWA-Cache auf v54 angehoben
- 62/62 Tests bestanden


## v0.18.0 – Step 18
- Neuer Budgetzyklus startet nur noch durch eine tatsächliche Lohnbuchung.
- Erreichen des erwarteten Lohndatums allein erzeugt keinen neuen Zyklus mehr.
- Ohne aktiven Lohnzyklus werden Tages-/Wochenbudget nicht künstlich berechnet.
- Sichtbare Versionsnummer in der Kopfzeile nach „Privat auf diesem Gerät“.
- Service-Worker-/Asset-Version auf v0.18.0 vereinheitlicht.
- Neue Tests für Lohnaktivierung, ausbleibenden Folgelohn und Versionskonsistenz.
