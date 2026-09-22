# Mein Geldplan

Lokale Budget-, Lohn- und Prognose-App. Alle eingegebenen Daten werden im Browser auf dem jeweiligen Gerät gespeichert.

## Wichtige Regeln

- Der nächste Lohn wird am letzten Banktag des Monats berechnet. Die Kalenderlogik berücksichtigt bundesweite Feiertage sowie die in Bayern landesweit geltenden Feiertage Heilige Drei Könige, Fronleichnam und Allerheiligen.
- Beim Buchen eines Lohns beginnt ein neuer Lohnzyklus. Die verwalteten Fixkosten werden innerhalb desselben Zyklus nur einmal automatisch abgezogen.
- Die Pfändungsprognose verwendet die monatliche Tabelle der Pfändungsfreigrenzenbekanntmachung 2026 nach § 850c ZPO für null bis fünf Unterhaltspflichten. Sie ist nur eine Orientierung und ersetzt keine Lohnabrechnung oder Rechtsberatung.
- Zeitnachweise bleiben lokal; die PDF-Bibliothek wird erst beim PDF-Import vom CDN geladen.
- Bezügemitteilungen können lokal mit einer bestehenden Prognose verglichen werden. Der Vergleich verändert keine Berechnung automatisch.

## Daten

Unter **Mehr** können alle lokalen Daten als JSON-Datei gesichert und später wiederhergestellt werden. Vor dem Zurücksetzen oder einer Wiederherstellung bitte eine Sicherung erstellen.

## Version v0.18.0
Ab v0.18.0 startet ein Budgetzyklus erst mit einer tatsächlich gebuchten Lohnzahlung. Das erwartete Lohndatum allein aktiviert keinen neuen Zyklus. Die aktuelle Version steht sichtbar in der Kopfzeile hinter „Privat auf diesem Gerät“.
