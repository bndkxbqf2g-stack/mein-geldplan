# Mein Geldplan v31

PWA für Budgetplanung mit getrenntem Giro- und Bargeldbestand, Lohnbuchung, Fixkosten, Lohnzyklus und zeitversetzter Gehaltsprognose.

## Budgetlogik
- Budgettage = bis zur nächsten sonntäglichen Abhebung; Mittwoch bis Samstag sind 4 Tage, Sonntag startet der neue 7-Tage-Zeitraum.
- Bis zum nächsten Lohn zählt jeder Kalendertag ab heute bis einschließlich Vortag des Lohntags.
- Tagessatz und Wochensatz = (Giro + vorhandenes Bargeld) / verbleibende Tage bis zum nächsten Lohn; der Wochensatz ist nur eine Orientierung und kein Zielbetrag.
- Bargeld wird erfasst und zum verfügbaren Vermögen addiert.
- Tatsächliche Abhebung ist frei wählbar.
- Lohn wird am letzten Bank-/Werktag des Monats angesetzt; beim Lohnbuchen werden die gespeicherten Fixkosten einmal je Lohnzyklus abgezogen.

## Gehaltsprognose v31
- Keine manuelle Diensteingabe mehr nötig.
- Mehrere Zeitnachweise können als PDF hochgeladen werden.
- Die App liest den Abschnitt „Zeitlohnarten (täglich)“ direkt aus dem PDF.
- Bekannte Zeitlohnarten werden automatisch erklärt: 5010/5011 Nachtarbeit, 5014 Samstag 13–20 Uhr, 5024 Sonntagsarbeit 25 %, 5161 Durchschnitt §21 TV-L, 5211 Wechselschichtzulage §43, 5212 Schichtzulage §43. Unbekannte Codes werden markiert und nicht stillschweigend bewertet.
- Auszahlung wird automatisch zwei Monate nach dem Abrechnungsmonat zugeordnet.
- Wechselschicht wird bevorzugt anhand der im Zeitnachweis ausgewiesenen Zeitlohnart 5211 erkannt; 5212 wird als Schichtzulage getrennt erkannt. Die tarifliche Definition der Wechselschichtarbeit bleibt eine Voraussetzung und wird nicht allein aus der Anzahl von Nachtdiensten erfunden.
- Nacht- und Sonntagszuschläge werden auf der hinterlegten Stufe-3-Basis berechnet; geschützte Zuschläge werden getrennt vom pfändungsrelevanten Netto geführt.
- Pfändung: 2 Unterhaltspflichten als Standard; die amtlichen Werte ab 01.07.2026 sind hinterlegt.
- Die Prognose verändert das laufende Budget nicht. Nur „Lohn buchen“ verändert das Girokonto und startet den Budgetzyklus.

## Technische Hinweise
- Die Zeitnachweis-PDFs dieser Serie sind textbasierte PDFs; die App nutzt PDF.js für die lokale Textextraktion im Browser.
- Die PDF-Bibliothek wird aus einem CDN geladen. Die übrige App funktioniert weiterhin lokal; für den PDF-Import ist eine Internetverbindung erforderlich.
