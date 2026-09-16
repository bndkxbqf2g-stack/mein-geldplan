# Mein Geldplan v27

PWA für Budgetplanung mit getrenntem Giro- und Bargeldbestand, Lohnbuchung, Fixkosten, Lohnzyklus und Gehaltsprognose.

Budgetlogik:
- Budgettage = bis zur nächsten sonntäglichen Abhebung; Mittwoch bis Samstag sind 4 Tage, Sonntag startet der neue 7-Tage-Zeitraum.
- Bis zum nächsten Lohn zählt jeder Kalendertag ab heute bis einschließlich Vortag des Lohntags.
- Tagessatz = (Giro + vorhandenes Bargeld) / verbleibende Tage bis zum nächsten Lohn.
- Wochensatz = Tagessatz × 7 (nur als Orientierung, kein Zielbetrag).
- Bargeld wird nur erfasst und zum verfügbaren Vermögen addiert.
- Tatsächliche Abhebung ist frei wählbar; sie wird vom Giro abgezogen und zum Bargeld addiert.
- Lohn wird am letzten Bank-/Werktag des Monats angesetzt; beim Lohnbuchen werden die gespeicherten Fixkosten einmal je Lohnzyklus abgezogen.


Neu in v27:
- Dienstplan-Screenshot hochladen und per OCR analysieren.
- Die OCR sucht gezielt nach „Früh“, „Spät“ und „Nacht“ und ordnet gefundene rote Dienstbegriffe den Kalendertagen zu; vor der Übernahme erscheint eine Prüfliste.
- Nach Bestätigung werden die erkannten Dienste in die Gehaltsprognose übernommen.
- Die OCR-Komponente wird beim ersten Aufruf über das Internet geladen.
