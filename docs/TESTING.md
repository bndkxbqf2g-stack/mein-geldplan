# Tests und Qualitätssicherung

## Aktueller CI-Vertrag

`.github/workflows/ci.yml` verwendet Node.js 22, prüft mit `node --check` jede versionierte JavaScript-Datei und führt `npm test` (`node --test`) aus. Es gibt kein Framework für Browser-Automation oder Screenshot-Vergleiche in der aktuellen CI.

Lokal:

```sh
npm test
find . -type f -name '*.js' -not -path './.git/*' -print0 | xargs -0 -n1 node --check
```

## Regressionsmatrix

- Budget: Kontostand, Buchungsimmutabilität, echte Lohnbuchung als Zyklusstart, Fixkosten einmal pro Zyklus, Bargeldtransfer und Sparstatistik.
- Berechnungen: Datums-/Feiertagsgrenzen, Netto-/Brutto-Referenzfälle, Rundung auf Cent, ungültige Eingaben und jahresabhängige Konfiguration.
- Zeitnachweis und Beleg: PDF-/Textparser, Zeitraum, unbekannte Komponenten, Forecast vs. echte Abrechnung, Teilzahlungen und spätere Rückrechnung.
- Status/Integrität: fehlend, wartend, offen, ausgeglichen, Backup-/Restore-Validierung, Schema-Migration und keine Mutation der Eingabe.
- Domänengrenze: Payroll-Prognosen und Abrechnungen dürfen keine Budgetbuchung oder Zyklusaktivierung auslösen.

Die vorhandenen Tests enthalten Budget-, Payroll-Control-, Lernkalibrierungs-, echte Belegparser-, Simulation- und E2E-Referenzfälle. Fehlerbehebungen ergänzen einen engen Test für den gemeldeten Fehler und mindestens einen relevanten Gegen-/Randfall.

## Referenzdaten

- Fixture-Werte synthetisch oder eindeutig aus bereits dokumentierten, überprüfbaren Referenzfällen abgeleitet.
- Rechts-/Tarif-/Jahreswerte: Quelle, Gültigkeitszeitraum, unabhängige Gegenprüfung und Grenzfälle dokumentieren.
- Keine persönlichen Zeitnachweise oder Bezügemitteilungen in GitHub, CI-Artefakten, Screenshots oder Logs.
- Rundungsdifferenzen, Zeit-/Datumswechsel und fehlende Parserfelder explizit abdecken; unbekannt bedeutet nicht 0,00 €.

## UI-Prüfung

Die bestehende Testsuite ist Node-basiert. Für UI- oder PDF-Importänderungen müssen reale Zustandsübergänge und Fehlermeldungen mit verfügbaren Tests geprüft und betroffene Screens auf mobilen und Desktop-Breiten sichtbar kontrolliert werden. Einen Browser-/Screenshot-/Golden-Runner erst ergänzen, wenn eine konkrete UI-Änderung, stabile synthetische Daten und eine reproduzierbare Browserumgebung dies rechtfertigen; die aktuelle Node-CI belegt keine Darstellung im iPhone-Browser.

## Abschlussgate

1. Relevante Regressionstests.
2. Vollständiges `npm test`.
3. JavaScript-Syntaxprüfung.
4. CI für den PR grün.
5. Für UI-/Importänderungen: geprüfte Zustände/Ansichten und Grenzen im PR-Bericht nennen.
