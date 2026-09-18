# Mein Geldplan v35 Final

GitHub-kompatible iPhone-PWA gemäß Projektauftrag.

## Module

- Übersicht
- Verlauf
- Fixkosten
- Gehalt
- Backup

Keine Sparfunktion.

## Budgetlogik

- Ein Lohn pro Monat
- Lohn am letzten Bankwerktag
- Netto manuell
- Fixkosten ausschließlich bei der Lohnbuchung
- Bargeld ausschließlich manuell
- Gesamtvermögen = Giro + Bargeld
- Tagesbudget = Gesamtvermögen ÷ Resttage bis zum nächsten Lohn
- Wochensatz = Tagesbudget × 7
- Sonntags-Ziel-Bargeld = 120 €
- Abhebung wird niemals automatisch gebucht
- Gehaltsprognose ist niemals budgetwirksam

## Gehaltsprognose

Zeitnachweise werden lokal aus textbasierten Projekt-PDFs gelesen. Der Monat wird aus dem PDF-Inhalt bestimmt. Unterstützte Zeitlohnarten: 5010, 5011, 5014, 5024, 5161, 5211, 5212.

Die vollständige offizielle Pfändungstabelle 2026 war nicht Bestandteil des bereitgestellten Projektmaterials; deshalb enthält die App keinen erfundenen Tabellenwert.
