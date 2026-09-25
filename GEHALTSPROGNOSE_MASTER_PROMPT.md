# MASTER-PROMPT – MEIN GELDPLAN / GEHALTSPROGNOSE & LOHNKONTROLLE

## Projekt

Repository: `bndkxbqf2g-stack/mein-geldplan`

Die Funktion **Gehaltsprognose** ist ein eigenständiges Modul innerhalb von **Mein Geldplan**. Sie darf **nicht mit der Budgetlogik vermischt** werden.

Ziel ist, aus realen Zeitnachweisen, realen Bezügemitteilungen und bekannten tariflichen Stammdaten möglichst exakt zu ermitteln:

1. welches Gehalt zu erwarten ist,
2. welche Zuschläge/Zulagen einem Monat zustehen,
3. wann diese tatsächlich ausgezahlt werden müssten,
4. ob Positionen auf der Bezügemitteilung fehlen,
5. ob Rückrechnungen korrekt sind,
6. welchen Netto-Effekt fehlende oder nachgezahlte Positionen haben,
7. wie sich Steuer, Sozialversicherung, VBL und Pfändung dadurch ändern.

## 1. Grundprinzip: Dokumente sind die Wahrheit

Keine Dienste, Zulagen oder Zuschläge frei erfinden.

Priorität der Datenquellen:

1. tatsächliche Bezügemitteilung / Abrechnung
2. tatsächlicher Zeitnachweis
3. bekannte persönliche/tarifliche Stammdaten
4. hinterlegte Tarifregeln
5. Prognose

Ein tatsächlich eingelesener Wert hat Vorrang vor einer theoretischen Berechnung.

OCR darf niemals raten. Ist ein Wert nicht sicher lesbar:
- als unsicher markieren,
- nicht stillschweigend einen Wert einsetzen,
- keine erfundene Zeitlohnart,
- keine erfundene Schicht,
- keine erfundene Zulage.

Die App muss zwischen **BELEGT**, **BERECHNET**, **PROGNOSTIZIERT**, **FEHLEND** und **UNSICHER** unterscheiden können.

## 2. Persönliche Gehaltsstammdaten

Arbeitgeber: Universitätsklinikum Würzburg / UKW  
Tarif: TV-L Bayern / Pflege  
Persönliche Eingruppierung: KR8, persönliche Stufe 5

Festes monatliches Grundgerüst:
- Grundentgelt / LSGZ: 4.226,92 €
- Pflegezulage: 90,00 €
- Universitätszulage Pflege: 163,51 €
- Festes Brutto: 4.480,43 €

Diese drei festen Bestandteile müssen separat sichtbar bleiben.

Die persönlichen Stammdaten und die tarifliche Berechnungsbasis für Zeitzuschläge sind getrennte Dinge. Aus „persönlich KR8 Stufe 5“ darf nicht automatisch abgeleitet werden, dass jede tarifliche Zuschlagsberechnung ebenfalls auf dem Stundenwert der persönlichen Stufe 5 erfolgt.

## 3. Referenzabrechnung September 2026

Die tatsächlich eingelesene September-Abrechnung 2026 ist Referenz für die Nettoberechnung.

Bekannter Stand:
- Brutto: 4.480,43 €
- gesetzliches Netto: 2.827,98 €
- VBL: 81,10 €
- Pfändung: 88,94 €
- Auszahlung: 2.657,94 €
- keine Nachverrechnung

Fehlende September-Bestandteile werden gegen diese reale Abrechnung als Baseline gerechnet. Nettoeffekte dürfen nicht mit einer pauschalen Nettoquote geschätzt werden.

## 4. Dienstzeiten

Aktuelle typische K3-Dienstzeiten:
- Früh: 06:00–14:12
- Spät: 13:30–21:42
- Nacht: 21:15–06:30

Wichtige Korrektur: Jeder K3-Spätdienst von 13:30–21:42 enthält 21:00–21:42 = **0,70 Stunden Nachtarbeit**.

Beispiel: 7 Spätdienste × 0,70 h = 4,90 h Nachtarbeit.

## 5. Zeitlohnarten / Codes

Wichtige Codes:
- 5010 = Nachtarbeit
- 5211 = Wechselschichtzulage
- 5212 = Schichtzulage nach §43
- 5161 = Durchschnitt §21 TV
- 5162 = Durchschnitt §21 TV-L Folge

5211 und 5212 sind klar zu unterscheiden.

Regel:
- Zeitnachweis enthält 5211 → Wechselschichtzulage berücksichtigen.
- Zeitnachweis enthält 5212 → Schichtzulage berücksichtigen.
- Kein Code vorhanden → keine entsprechende Zulage automatisch erfinden.

Bekannte Größen:
- 5211 Wechselschichtzulage: 250,00 € / Monat
- 5212 Schichtzulage: 100,00 € / Monat

Werte müssen tariflich und versioniert hinterlegt sein.

## 6. Nachtarbeit

Nachtarbeit wird minutengenau bzw. anhand der im Zeitnachweis ausgewiesenen Stunden berechnet. Der Zeitnachweis hat Vorrang.

Bekannter Regressionstest Juli 2026:
- 7 Spätdienste × 0,70 h = 4,90 h
- 2 Nachtdienste = zusammen 16,50 h berücksichtigte Nachtarbeit
- Gesamt = **21,40 h Nachtarbeit**

Ein Ergebnis, das nur die Nachtdienste berücksichtigt und die Spätdienst-Nachtanteile ignoriert, ist falsch.

## 7. Zeitzuschläge

Mindestens unterstützen:
- Nachtarbeit
- Sonntagsarbeit
- Feiertagsarbeit
- Samstagsarbeit
- Sonderregeln 24.12./31.12.
- weitere tatsächlich ausgewiesene TV-L-Zuschläge

Berechnung aus Datum, Wochentag, Feiertagsstatus, Dienstbeginn/-ende, Zeitfenstern, Zeitlohnart und Menge/Stunden. Eine Schicht kann mehrere Zuschlagsarten erzeugen.

## 8. Steuerfrei vs. steuerpflichtig

Jede Position benötigt eine eindeutige steuerliche Klassifizierung.

Für die aktuelle Projektlogik:
- Nachtzuschläge: grundsätzlich steuerfreie SFN-Zuschläge, soweit gesetzliche Voraussetzungen/Grenzen erfüllt
- Sonntagszuschläge: grundsätzlich steuerfreie SFN-Zuschläge, soweit Voraussetzungen erfüllt
- Feiertagszuschläge: entsprechend gesetzlicher SFN-Logik prüfen
- Samstagszuschläge: nicht automatisch steuerfrei; in der bisherigen UKW-Abrechnung steuerpflichtige Position
- Schichtzulage 5212: steuerpflichtig
- Wechselschichtzulage 5211: steuerpflichtig

Mindestens zwei getrennte Summen anzeigen:
A) steuerfreie Zuschläge  
B) steuerpflichtige Zulagen/Zuschläge

## 9. Darstellung im Netto

Der Nutzer will wissen, was tatsächlich zusätzlich ausgezahlt wird.

Beispiel:
- Steuerfreie Zuschläge: 142,13 € netto
- Steuerpflichtige Nachzahlung: 100,77 € brutto
- Nettoeffekt daraus: dynamisch aus echter Abrechnung berechnen
- Voraussichtliche Netto-Nachzahlung gesamt: Summe der realen Nettoeffekte

Steuerfreie Positionen nicht nochmals mit pauschaler Nettoquote reduzieren. Steuerpflichtige Positionen nicht 1:1 als Netto ausgeben.

## 10. Netto-Differenzberechnung

Korrekt ist eine Differenzrechnung:

ALT:
- Brutto
- Steuer
- SV
- gesetzliches Netto
- VBL
- Pfändung
- Auszahlung

NEU:
- Brutto einschließlich fehlender steuerpflichtiger Position
- Steuer neu
- SV neu
- VBL ggf. neu
- Pfändung neu
- Auszahlung neu

Nettoeffekt = Auszahlung_neu - Auszahlung_alt.

Die UI muss klar unterscheiden zwischen gesetzlichem Netto und tatsächlicher Auszahlung.

## 11. Steuerfreie Nachzahlungen

Steuerfreie SFN-Nachzahlungen separat behandeln.

Beispiel:
- 98,01 € Nachtzuschläge
- 44,12 € Sonntagszuschläge
- zusammen 142,13 € steuerfreie Zuschläge

Diese Positionen sind grundsätzlich zusätzliches Netto, sofern die steuerrechtlichen Voraussetzungen erfüllt sind und die reale Abrechnung nichts anderes zeigt.

## 12. Juli-Regression / September-Auszahlung

Bekannter Prüffall Juli 2026:
- Nachtstunden: 21,40 h
- Nachtzuschlag: ca. 98,01 €
- Sonntagszuschlag: ca. 44,12 €
- Samstagszuschlag: ca. 0,77 €
- 5212 Schichtzulage: 100,00 €

Daraus:
- steuerfrei: 142,13 €
- steuerpflichtig: 100,77 € brutto

Diese Werte sind Regressionstests, keine Hardcodes.

## 13. +2-Monate-Logik

Variable Zuschläge/Zulagen aus dem Zeitnachweis werden bei UKW typischerweise mit Verzögerung abgerechnet.

Für die aktuelle Logik:
- Leistungsmonat M → Auszahlung typischerweise M + 2 Monate
- Juli → September
- August → Oktober

Die App muss Leistungsmonat und Auszahlungsmonat getrennt führen.

## 14. Rückrechnungen

Rückrechnung gehört fachlich zum ursprünglichen Leistungsmonat.

Mindestens speichern:
- originMonth / Leistungsmonat
- paymentMonth / Auszahlungsmonat
- sourcePayslip / Bezügemitteilung
- isRetroactive / Rückrechnung ja/nein

Rückrechnungen dürfen nicht einfach dem Auszahlungsmonat zugeschlagen werden.

## 15. Lohnkontrolle

Für jeden Auszahlungsmonat:
**ERWARTET** gegen **TATSÄCHLICH ABGERECHNET** vergleichen.

Wenn aus dem Juli-Zeitnachweis Nacht, Sonntag, Samstag und 5212 erwartet werden und im September fehlen, müssen sie einzeln als **FEHLEND** ausgewiesen werden.

Zusätzlich getrennt berechnen:
- steuerfreie fehlende Zuschläge netto
- steuerpflichtige fehlende Bestandteile brutto
- Nettoeffekt steuerpflichtiger Bestandteile
- gesamte voraussichtliche Netto-Nachzahlung

## 16. Keine Doppelzählung

Eine Position darf nicht zugleich als regulärer Bestandteil, Rückrechnung und erwartete Nachzahlung gerechnet werden.

Mindestens:
- originMonth
- payMonth
- wageType
- amount
- sourceDocument
- sourceRow
- status

Status z. B.: expected, paid, missing, retroPaid, corrected, uncertain.

## 17. Abrechnungskontrolle auf Positionsebene

Nicht nur Gesamtsummen vergleichen.

Beispiel:
- Grundentgelt erwartet 4.226,92 €, Abrechnung 4.226,92 € → OK
- Pflegezulage 90,00 € → OK
- Universitätszulage 163,51 € → OK
- 5212 erwartet 100,00 €, Abrechnung 0,00 € → FEHLT
- Nacht erwartet 98,01 €, Abrechnung 0,00 € → FEHLT

## 18. Pfändung

Persönlicher Stand: 2 Unterhaltspflichten.

Pfändung anhand der jeweils geltenden Pfändungstabelle berechnen, nicht mit festem historischen Betrag.

Prüfen, welche Lohnbestandteile pfändbar, teilweise pfändbar oder unpfändbar sind. Steuerfreie SFN-Zuschläge nicht automatisch wie normales Grundentgelt behandeln.

## 19. VBL

VBL nicht ignorieren. Bei steuerpflichtigen Nachzahlungen prüfen, ob sich VBL-pflichtiges Entgelt und Arbeitnehmeranteil ändern oder eine Nachverrechnung entsteht.

## 20. Sozialversicherung

Steuerpflichtige Bestandteile korrekt auf KV, PV, RV, AV prüfen und die für das jeweilige Abrechnungsjahr geltenden Beitragssätze, Zusatzbeiträge und Beitragsbemessungsgrenzen verwenden.

## 21. Lohnsteuer

Keine pauschale Prozentrechnung. Für Kontrollen mit echter Abrechnung: reale Abrechnung gegen Abrechnung + fehlende Position rechnen.

## 22. Monatliche Prognose

Für zukünftige Auszahlungsmonate mindestens anzeigen:
- Grundentgelt
- Pflegezulage
- Universitätszulage
- Schicht-/Wechselschichtzulage
- Samstag und sonstige steuerpflichtige Positionen
- Nacht/Sonntag/Feiertag steuerfrei
- Gesamtbrutto
- Steuer/SV
- gesetzliches Netto
- VBL
- Pfändung
- sonstige reale Abzüge
- voraussichtliche Auszahlung

## 23. Herkunft jeder Position

Jeder variable Betrag muss nachvollziehbar sein: Stunden/Menge, Herkunftsdienste, Tarifbasis, Satz, Steuerstatus, Leistungsmonat und erwarteter Auszahlungsmonat.

## 24. Zeitnachweis-Parser

Mindestens erkennen:
- Monat
- Datum
- Wochentag
- Soll-Dienst
- Ist-Dienst
- von/bis
- Pause
- IST-Soll
- Feiertag
- Zeitlohnart
- Code
- Beschreibung
- Anzahl/Stunden
- Abwesenheit
- Urlaub
- §21-Durchschnitt
- Schicht-/Wechselschichtzulage

Codes nicht anhand freier Textähnlichkeit miteinander vermischen.

## 25. §21 TV-L / Durchschnittsentgelt

§21-Positionen gesondert behandeln. Urlaub/Krankheit/Fortzahlung kann einen Durchschnitt variabler Entgeltbestandteile erzeugen.

Diese Beträge dürfen nicht:
- als neue echte Schicht interpretiert,
- als Nachtstunden doppelt gerechnet,
- oder als neue 5211/5212-Zulage erzeugt werden.

## 26. Urlaub und Abwesenheit

Ein theoretischer Dienst im Dienstplan während Urlaub erzeugt nicht automatisch tatsächliche SFN-Zuschläge. Abwesenheit erkennen, ggf. §21-Durchschnitt anwenden, keine Doppelberechnung.

## 27. Monatliche Zeitleiste

Für jeden Monat nachvollziehbar:
Leistungsmonat → variable Bestandteile → typischer Auszahlungsmonat. Rückrechnungen zusätzlich auf der Zeitachse zeigen.

## 28. Kontrollkachel

Beispiel:
- Gehaltskontrolle September 2026
- Festgehalt vollständig
- erwartete Zuschläge aus Juli
- davon abgerechnet
- fehlend
- steuerfreie Nachzahlung netto
- steuerpflichtige Nachzahlung brutto
- Nettoeffekt steuerpflichtig
- voraussichtliche gesamte Netto-Nachzahlung

Details: Nacht, Sonntag, Samstag, Schichtzulage, Wechselschichtzulage, Rückrechnungen.

## 29. Keine falsche Gesamtsumme

100 € steuerpflichtige Schichtzulage + 142 € steuerfreie SFN dürfen weder als 242 € netto noch pauschal als 242 € brutto ausgewiesen werden.

## 30. Reale Abrechnung als Baseline

Wenn eine reale Abrechnung vorhanden ist, diese als Baseline nutzen und nur die fehlenden Positionen hinzurechnen. Nicht unnötig komplett von Null neu prognostizieren.

## 31. Prognose vs. Kontrolle

Zwei Modi:
- **Prognose**: zukünftiger Monat ohne Abrechnung
- **Kontrolle**: Monat mit Bezügemitteilung und Soll/Ist-Abgleich

Gemeinsame Berechnungsservices, aber getrennte fachliche Bedeutung.

## 32. Tarifwerte nicht blind hardcoden

Tarifwerte gültigkeits-, tarif-, datums- und testbezogen speichern. Historische Monate müssen mit historischen Werten reproduzierbar bleiben.

## 33. Nicht aus Dienstnamen raten

F1, F2, S1, FD0, MPS, MPZ, MPF usw. sind nicht pauschal monetäre Zuschlagsarten. Tatsächliche Zeit + Zeitlohnart + Datum entscheiden.

## 34. Fehlererkennung

Warnungen u. a.:
- Zeitnachweis enthält 5212, Abrechnung nicht
- Nachtstunden erkannt, aber kein Nachtzuschlag
- Rückrechnung falschem Monat zugeordnet
- 5211 und 5212 unzulässig doppelt
- Spätdienst-Nachtanteile fehlen
- pauschale Nettoquote trotz realer Baseline

## 35. Vertrauensstufe

Optionaler Status:
- BELEGT
- SEHR HOCH
- PROGNOSE
- UNSICHER

## 36. Architektur

Modular aufbauen, z. B.:

```
salary/
  models/
  parsers/
  tariff/
  calculations/
  reconciliation/
  garnishment/
  tax/
  socialInsurance/
  vbl/
  ui/
```

Mögliche Services:
- TimeRecordParser
- PayslipParser
- ShiftPremiumCalculator
- AllowanceResolver
- TariffRateResolver
- PaymentMonthResolver
- RetroactivePaymentResolver
- PayrollCalculator
- TaxCalculator
- SocialInsuranceCalculator
- VblCalculator
- GarnishmentCalculator
- PayslipReconciliationService
- SalaryForecastService

Keine duplizierten Regeln.

## 37. Zentrales Datenmodell

```
SalaryComponent {
  id
  originMonth
  paymentMonth
  wageType
  description
  quantity
  unit
  rate
  grossAmount
  taxableAmount
  socialInsuranceAmount
  taxFreeAmount
  garnishmentTreatment
  sourceType
  sourceDocument
  sourceRow
  confidence
  status
}
```

## 38. Pflichttests

Mindestens:
1. 7 Spätdienste × 0,70 h Nacht = 4,90 h
2. Juli insgesamt = 21,40 h Nacht
3. 5212 → Schichtzulage, nicht Wechselschichtzulage
4. 5211 → Wechselschichtzulage, nicht Schichtzulage
5. fehlender Code → keine künstliche Zulage
6. Juli → September
7. August → Oktober
8. Rückrechnung Mai → originMonth Mai
9. steuerfreie Zuschläge nicht mit Nettoquote reduzieren
10. steuerpflichtige Zulage über Payroll-Differenz in Netto umrechnen
11. reale Abrechnung als Baseline
12. keine Doppelzählung Rückrechnung
13. Urlaub/§21 ohne fiktive SFN-Doppelung
14. Pfändungsänderung bei verändertem pfändbaren Netto
15. historische Tarifwerte reproduzierbar

## 39. UI-Ziel

Primär beantworten: **Was bekomme ich voraussichtlich ausgezahlt und fehlt etwas?**

Zuerst:
- voraussichtliche Auszahlung
- Festgehalt
- variable Zuschläge
- steuerfrei
- steuerpflichtig
- Pfändung
- fehlende Nachzahlungen

Details nachgelagert.

## 40. Erklärbarkeit

Jeder Betrag muss bis zu Stunden, Codes, Sätzen, Steuerstatus, Leistungsmonat und Auszahlungsmonat nachvollziehbar sein.

## 41. Wichtige fachliche Trennungen

Immer getrennt halten:
- Leistungsmonat ≠ Auszahlungsmonat
- steuerfrei ≠ steuerpflichtig
- Brutto-Nachzahlung ≠ Netto-Nachzahlung
- gesetzliches Netto ≠ tatsächliche Auszahlung
- Schichtzulage ≠ Wechselschichtzulage
- Prognose ≠ tatsächliche Abrechnung
- regelmäßige Auszahlung ≠ Rückrechnung
- tatsächliche Arbeit ≠ §21-Durchschnitt

## 42. Entwicklungsarbeitsweise

GitHub ist technische Wahrheit.

Vor jeder Änderung:
1. aktuellen main-Stand laden
2. Dokumentation/Roadmap prüfen
3. aktuelle Implementierung der Gehaltsprognose prüfen
4. CI des aktuellen HEAD prüfen
5. erst dann Code ändern

Bei Fehlern:
Ursache finden → Regressionstest → gezielt beheben → vollständige Tests → Commit → Push → CI erneut prüfen.

## 43. Kein Hardcoding von Testfällen

Bekannte Juli-/Septemberwerte sind Referenzfälle, keine Monats-Hardcodes. Werte müssen aus Daten und Regeln entstehen.

## 44. Zielzustand

Für jeden Monat beantworten:
1. Was steht laut Zeitnachweis zu?
2. Wann müsste es ausgezahlt werden?
3. Was wurde tatsächlich abgerechnet?
4. Was fehlt?
5. Welche fehlenden Beträge sind steuerfrei?
6. Welche sind steuerpflichtig?
7. Welchen Nettoeffekt haben steuerpflichtige Positionen auf Grundlage der realen Abrechnung?
8. Wie verändert sich Pfändung?
9. Welche Rückrechnungen gehören zu welchen Ursprungsmonaten?
10. Wie hoch ist die voraussichtliche tatsächliche Nachzahlung?

## 45. Spezieller September-Referenzfall

Juli-Zeitnachweis → Auszahlung September 2026.

Bekannte Sollwerte:
- 21,40 h Nachtarbeit
- Nachtzuschlag ca. 98,01 € steuerfrei
- Sonntag ca. 44,12 € steuerfrei
- Samstag ca. 0,77 € steuerpflichtig
- 5212 Schichtzulage 100,00 € steuerpflichtig
- steuerfrei zusammen 142,13 €
- steuerpflichtig 100,77 € brutto

Für die 100,77 € muss der echte Nettoeffekt durch Neuberechnung gegen die reale September-Abrechnung ermittelt werden.

Gesamtnetto-Nachzahlung =
steuerfreie 142,13 €
+ Nettoeffekt der 100,77 € steuerpflichtigen Nachzahlung
+ ggf. weitere belegte fehlende Positionen
- ggf. zusätzliche Abzüge/Pfändungseffekt.

Niemals einfach 242,90 € als Netto anzeigen.

## 46. Auftrag an den Entwickler / ChatGPT

Bei jeder Änderung den vollständigen Datenfluss prüfen:

Zeitnachweis/PDF
→ Parser
→ Zeitlohnarten
→ SalaryComponents
→ Leistungsmonat
→ Auszahlungsmonat
→ Tarifberechnung
→ steuerliche Klassifizierung
→ Prognose
→ Bezügemitteilungsparser
→ Soll/Ist-Abgleich
→ Rückrechnung
→ Steuer/SV
→ VBL
→ Pfändung
→ Nettoeffekt
→ UI.

Wenn eine Zahl falsch ist, nicht kosmetisch korrigieren, sondern die Ursache im Datenfluss beheben.

Ziel ist keine Anzeige, die bei einem einzelnen Testfall richtig aussieht, sondern ein fachlich konsistentes Gehalts- und Abrechnungssystem.
