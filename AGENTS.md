# Arbeitsregeln für Codex

## Verbindlicher Einstieg
1. Lies dieses Dokument, `README.md`, `PROJECT_MASTER_SPEC.md`, `MODULES.md`, die relevanten Abschnitte in `CHANGELOG.md` und `.github/workflows/ci.yml`.
2. Prüfe den aktuellen Stand von `main`, Branch-/Arbeitsbaumzustand, den aktuellen CI-Lauf und betroffene Tests. GitHub ist technische Wahrheit.
3. Trenne echte Ist-Werte, Prognosen, Konfiguration und lokal gespeicherte Nutzerdaten, bevor du einen Berechnungspfad änderst.

## Fachliche Schutzregeln
- **Budget und Gehaltsprognose sind getrennte Domänen.** Budgetbuchungen, Lohnzyklus, Fixkosten, Bargeld, Sparen und Statistik dürfen nicht durch Forecast-/Payroll-Schätzungen still verändert werden. Ein erwartetes Lohndatum startet keinen Zyklus; erst eine tatsächlich gebuchte Lohnzahlung tut das.
- Gehaltsprognose wird aus dem Zeitnachweis hergeleitet; echte Bezügemitteilungen sind Ist-Werte. Rückrechnungen bleiben dem Ursprungsmonat zugeordnet. Unbekannte oder nicht gelesene Komponenten sind `null/unbekannt`, nie automatisch `0,00 €`.
- Keine Steuer-, Sozialversicherungs-, Tarif-, Pfändungs-, Feiertags- oder Gehaltswerte im Code hardcodieren, wenn sie veränderliche Rechts-/Jahresdaten sind. Solche Werte müssen aus versionierter, datierter Konfiguration oder klarer Eingabe stammen. Jede Aktualisierung benötigt Quelle, Gültigkeitszeitraum, Referenzwerte und Regressionstests.
- Rechenschritte müssen nachvollziehbar und cent-genau gerundet sein. Verwende gespeicherte Referenzfälle und Grenzwerte. Keine stillen Korrekturen an eingegebenen Belegen oder Nutzerwerten.
- Belegstatus und Herkunft erhalten: Prognose, echte Abrechnung, Teilzahlung, Rückrechnung, fehlende Komponente und manuelle Anpassung dürfen nicht zusammenfallen.
- Finanzdaten bleiben lokal, außer ein ausdrücklich vorhandener Backup-/Cloudpfad ist betroffen. Keine echten Nutzerdaten ändern, exportieren oder in Tests/Logs ausgeben. Tests verwenden ausschließlich synthetische Referenzdaten.
- Datenmigrationen/Restore müssen defensiv validieren und soweit möglich rückrollbar bleiben. Keine lokale Browser-/PWA-Datenlöschung oder Tests gegen produktive Konten.

## Änderungen und Arbeitsmodi
- Arbeite auf einem Branch, in kleinen überprüfbaren Änderungen. Ändere `main` nicht direkt. Schlage die Änderung als PR vor; merge oder release nicht ohne ausdrücklichen Auftrag.
- Kurzbefehle gelten für dieses Repository. Wenn mehrere Repositories genannt sind, bearbeite sie getrennt.
- **A — Autopilot:** Erledige den vereinbarten Umfang selbstständig mit Ursachenanalyse, Implementierung, Regressionstests und CI. Behebe klare Folgefehler bis alles grün ist oder eine externe Grenze erreicht wird. Kein unbeauftragtes Aufräumen oder Scope-Wachstum.
- **N — Normal:** Begrenzter Entwicklungsblock, typischerweise bis zu fünf zusammenhängende Schritte; danach relevante Tests/CI und Ergebnis berichten.
- **Q — Qualitätssicherung:** Prüfe einen benannten Bereich oder bestehenden Diff, führe passende Prüfungen aus und behebe nur klar belegte Fehler mit Regressionstest. Keine neuen Features.
- **U — Update:** Nur Branch-, Projekt- und CI-Status feststellen und mit Ampel berichten; keine Änderungen und keine Fehlerbehebung.
- Ein Kürzel allein autorisiert keine Änderung echter Finanzdaten, Rechts-/Tarifparameter ohne Referenz oder Merge/Release.

## Tests und Abschluss
- Aktuelle Standardchecks: `npm test` sowie JavaScript-Syntaxprüfung mit `node --check` über alle `.js`-Dateien. Details: [docs/TESTING.md](docs/TESTING.md).
- Berechnungen mit unabhängigen Referenzwerten, Rundungsgrenzen, Datums-/Feiertagswechseln, fehlenden Komponenten, ungültigen Eingaben und Altformaten testen.
- Belegstatus über den gesamten Pfad testen: Zeitnachweis → Prognose → Abrechnung → Teilzahlung/Rückrechnung → offener/ausgeglichener Status.
- Budgetänderungen mit Szenarien prüfen, die beweisen, dass Payroll-Prognose/Abrechnung Budgetzyklen und Buchungen nicht unbeabsichtigt beeinflusst.
- Speicher-, Schema-, Import-, Export- und Restore-Tests ausschließlich mit synthetischen Daten; Backups vor Restore validieren.
- UI-Änderungen auf tatsächliche mobile/desktop Ansichten prüfen. Die bestehende CI ist Node-basiert und hat keinen Browser-, Screenshot- oder Golden-Test-Runner. Keine Screenshot-Abhängigkeiten allein für Dokumentationsänderungen hinzufügen; bei UI-Arbeit Interaktionen testen und den sichtbaren Prüfweg benennen.
- Nach Änderungen relevante Tests und vollständige CI ausführen; Fehler beheben und keine grüne CI behaupten, wenn nur Teiltests gelaufen sind.
- Abschlussbericht: geänderte Berechnungs-/Datenpfade, Referenzwerte, Tests/CI-Ergebnis, PR und bekannte Grenzen.
