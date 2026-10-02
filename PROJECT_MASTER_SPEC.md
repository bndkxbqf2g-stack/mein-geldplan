# Mein Geldplan — Master-Spezifikation

## Zweck und aktuelle Produktwahrheit

Mein Geldplan ist eine lokale Browser-/PWA-App für Budgetverwaltung, Lohnzyklen, Finanzübersicht sowie Zeitnachweis-basierte Gehaltsprognose und Abrechnungsvergleich. Eingegebene Finanzdaten liegen standardmäßig im Browser dieses Geräts. GitHub `main`, der aktuelle Code und vorhandene Tests bestimmen den implementierten Stand; diese Datei bündelt die fachlichen Invarianten und verweist für technische Details auf [README.md](README.md), [MODULES.md](MODULES.md) und [CHANGELOG.md](CHANGELOG.md).

## Getrennte Rechenbereiche

### Budget
- Budgetzyklus beginnt nur mit tatsächlich gebuchter Lohnzahlung.
- Fixkosten werden innerhalb desselben Zyklus nur einmal abgezogen.
- Bargeldabhebungen sind Transfers, keine Ausgaben; Sparreservierungen und Rückbuchungen werden gemäß Budget-/Statistikregeln getrennt ausgewiesen. Sie sind jederzeit möglich und werden vom Giro zum Bargeld umgebucht; da die Budgetberechnung das Giro verwendet, sinken Tages- und Wochenbudget unmittelbar mit dem verbleibenden Girostand.
- Prognose, Soll-Abrechnung oder erwartetes Lohndatum dürfen Budgettransaktionen nicht still erzeugen oder verändern.

### Gehaltsprognose und Abrechnung
- Prognose entsteht aus importiertem Zeitnachweis und versionierter Konfiguration.
- Feste Bezüge, Schicht-/Wechselschichtzulagen und Zeit-/Zeitzuschläge bleiben getrennt nachvollziehbar.
- Prognosemonat, Leistungsmonat und Auszahlungsmonat müssen unterscheidbar sein. Das implementierte README beschreibt derzeit den Auszahlungstermin als Leistungsmonat + 2 Monate; Änderungen müssen vorhandene gespeicherte Prognosen und Migrationen berücksichtigen.
- Echte Bezügemitteilungen sind Ist-Belege. Soll-/Ist-Differenzen, offene Netto-Nachzahlungen und spätere Rückrechnungen werden nachvollziehbar geführt und dem Ursprungszeitraum zugeordnet.
- Fehlende oder nicht extrahierbare Bezügebestandteile bleiben unbekannt (`null`), statt als null Euro in die Summe eingerechnet zu werden.
- Payroll-Lernhistorie darf zukünftige Auszahlungsprognosen konservativ kalibrieren, aber keine Tarif-, Steuer-, Sozialversicherungs- oder Pfändungsregeln automatisch umschreiben.

## Genauigkeit, Referenzen und Regeln

- Geldbeträge folgen den vorhandenen Rundungsregeln; Referenzfälle und geltende Konfiguration müssen die Berechnung belegen.
- Variable Jahreswerte (z. B. Steuer-/SV-Parameter, Pfändungstabellen, Feiertage, Tarifdaten) gehören in datierte und belegte Konfiguration, nicht in unkommentierte Logik-Konstanten.
- Bei Rechts-/Tarifänderungen Quelle und Gültigkeitsdatum dokumentieren, Referenzwerte unabhängig gegenprüfen und Rand-/Übergangsfälle testen. Vorhandene gesetzliche Referenzen im README sind projektspezifische Vorgaben und dürfen nicht still geändert werden.
- Keine Beträge, Ansprüche oder Beleginhalte erfinden, um Lücken in einem Import zu schließen. Berechnete Näherungen klar als Prognose/Schätzung kennzeichnen.

## Daten und Datenschutz

- Standard bleibt lokale Speicherung. Backup/Restore sind explizite Nutzeraktionen; vor Restore muss das Backup validiert sein.
- Keine echten Finanzdaten in Repository-Fixtures, Screenshots, Testausgaben, CI-Artefakte oder Debug-Logs aufnehmen.
- Schemaänderungen müssen Altformate, Rundlauf, ungültige Eingaben und Wiederherstellung abdecken; Tests arbeiten mit synthetischen Daten.

## Quellen und Änderungspflege

- Fachliche Invarianten: diese Spezifikation und README.
- Modulverantwortung: MODULES.md; historische Änderungen: CHANGELOG.md.
- Implementierungswahrheit: Code und automatisierte Tests auf dem aktuellen Branch.
- Änderungen an einer Produktregel müssen Code, Referenztests und passende Dokumentation gemeinsam aktualisieren. Der Changelog wird nur bei einer tatsächlichen Produkt-/Releaseänderung ergänzt, nicht für reine Prozessdokumentation.
