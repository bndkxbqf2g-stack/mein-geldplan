# Mein Geldplan

Lokale Budget-, Lohn- und Prognose-App. Alle eingegebenen Daten werden im Browser auf dem jeweiligen Gerät gespeichert.

## Wichtige Regeln

- Der nächste Lohn wird am letzten Banktag des Monats berechnet. Die Kalenderlogik berücksichtigt bundesweite Feiertage sowie die in Bayern landesweit geltenden Feiertage Heilige Drei Könige, Fronleichnam und Allerheiligen.
- Beim Buchen eines Lohns beginnt ein neuer Lohnzyklus. Die verwalteten Fixkosten werden innerhalb desselben Zyklus nur einmal automatisch abgezogen.
- Die Pfändungsprognose verwendet die monatliche Tabelle der Pfändungsfreigrenzenbekanntmachung 2026 nach § 850c ZPO für null bis fünf Unterhaltspflichten. Sie ist nur eine Orientierung und ersetzt keine Lohnabrechnung oder Rechtsberatung.
- Zeitnachweise bleiben lokal; die PDF-Bibliothek wird erst beim PDF-Import vom CDN geladen.
- Bezügemitteilungen können lokal mit einer bestehenden Prognose verglichen werden. Bestätigte Soll-/Ist-Zusammenhänge werden als lokale Payroll-Lernhistorie gespeichert; gesetzliche, tarifliche und pfändungsrechtliche Rechenregeln werden dadurch nicht automatisch verändert.

## Daten

Unter **Mehr** können alle lokalen Daten als JSON-Datei gesichert und später wiederhergestellt werden. Vor dem Zurücksetzen, Löschen der Home-Bildschirm-App/PWA oder einer Neuinstallation unbedingt eine Sicherung erstellen. Die Finanzdaten liegen sonst nur im lokalen Browser-/PWA-Speicher und können beim Entfernen der Installation verloren gehen.

## Version v0.18.0
Ab v0.18.0 startet ein Budgetzyklus erst mit einer tatsächlich gebuchten Lohnzahlung. Das erwartete Lohndatum allein aktiviert keinen neuen Zyklus. Die aktuelle Version steht sichtbar in der Kopfzeile hinter „Privat auf diesem Gerät“.


### v0.20.0
Die Lohntermin-Kalenderlogik berücksichtigt die landesweiten gesetzlichen Feiertage in Bayern.

### v0.21.1
Zeitnachweis-Import: positionsbasierte PDF-Zeilenrekonstruktion, sichere Stundenextraktion, Datumsbereich-Erkennung und robuste Lohncode-Prüfung. Eine echte UKW-Zeitnachweis-PDF bleibt für die abschließende Praxisvalidierung erforderlich.

### Statistik
Der Verlauf trennt echte Ausgaben, Bargeldabhebungen und Sparreservierungen. Abhebungen sind Transfers und werden nicht als Verbrauch gezählt; rückgängig gemachte Sparraten werden aus der Sparstatistik entfernt.


## Datenintegrität (v0.28.0)
Beim Start werden lokale Alt-Daten defensiv auf Schema 3 migriert. Ungültige Datumswerte werden nicht als Datum interpretiert. Backups tragen App- und Schema-Version und werden vor dem Restore validiert.


## Datenintegrität aktuell
Aktueller lokaler Datenschema-Stand: 7. Backups verwenden Sicherungsversion 7 und enthalten auch die Payroll-Lernhistorie.
