# v0.99.27

- Der Legacy-September-Fallback wurde aus dem synchronen Renderpfad entkoppelt und benötigt keine zusätzliche salary-net-effects-Modulverkettung mehr.
- Die Rückrechnung wird direkt aus Soll-Brutto, Soll-Netto, pfändbarem Soll-Netto und der echten Bezügemitteilung aufgebaut.
- Die Gehaltskontrolle bleibt sichtbar, selbst wenn eine einzelne Netto-Rückrechnung mit alten Daten scheitert; statt einer leeren Karte erscheint ein konkreter Hinweis.
- Der bestehende September-Regressionsfall für 142,13 € steuerfrei, 31,06 € steuerpflichtig netto und 30,64 € Nettoeffekt der 100-Euro-Schichtzulage bleibt grün.

# v0.99.26

- Alte September-Prognosen können die Netto-Rückrechnung jetzt vollständig lokal aus gespeicherten Soll-Werten und der echten Bezügemitteilung berechnen.
- Der Legacy-Fallback benötigt für diese Kontrolle keinen erneuten externen Steuerrechner-Import.
- Für September 2026 werden 142,13 € steuerfreie Zuschläge und 100,77 € steuerpflichtige Rückstände rekonstruiert.
- Der steuerpflichtige Nettoeffekt beträgt 31,06 €, davon entfallen 30,64 € auf die 100,00 € Schichtzulage und 0,42 € auf 0,77 € Samstagszuschlag.
- Die erwartete Netto-Korrektur beträgt damit 173,19 €; ausgehend von 2.657,94 € tatsächlicher Auszahlung ergibt sich 2.831,13 €.

# v0.99.25

- Netto-Rückrechnungen werden als Differenzmodell auf die tatsächliche Auszahlung der eingelesenen Bezügemitteilung aufgesetzt.
- Ein Cent-genauer Gleichlauf zwischen Modell-Netto/VBL/Pfändung und echter Abrechnung ist nicht mehr Voraussetzung für die Berechnung.
- Für die Aktivierung reichen nun reine Festbezüge ohne Nachverrechnung bzw. bereits ausgewiesene variable Bezüge sowie ein zum Festbrutto passendes Ist-Brutto.
- Alte September-Datensätze werden erneut migriert, damit 100,00 € Schichtzulage und 0,77 € Samstag aus den 100,77 € steuerpflichtigem Rückstand auch tatsächlich netto berechnet werden.

# v0.99.24

- Alte September-Prognosen ohne Einzelkomponenten werden aus den gespeicherten Summen in steuerfreie Zuschläge und steuerpflichtige Bestandteile migriert.
- Bei 100,77 € steuerpflichtigem Rückstand wird unter der damaligen Modelllogik 5212 Schichtzulage 100,00 € plus 0,77 € Samstag rekonstruiert; eine 250-Euro-Wechselschichtzulage ist dabei ausgeschlossen.
- Der Nettoeffekt der Schichtzulage wird separat gegen die tatsächlich eingelesene aktuelle Bezügemitteilung berechnet.
- Bereits gespeicherte v0.99.23-Ist-Effekte werden neu aufgebaut; die veraltete Aufforderung zum erneuten Einlesen entfällt, wenn die Legacy-Daten eindeutig rekonstruierbar sind.

# v0.99.23

- Rückrechnungen verwenden die tatsächlich eingelesene Bezügemitteilung als verifizierte Netto-Basis, sofern diese der Kernabrechnung entspricht.
- Die 100-Euro-Schichtzulage wird separat als Szenario „aktuelle Abrechnung + nur Schichtzulage“ berechnet, statt als marginaler Effekt nach anderen Zuschlägen.
- Schicht-/Wechselschicht-Nettoeffekte werden nicht mehr als „nicht berechenbar“ ausgegeben, wenn die aktuelle Abrechnung und der Zeitnachweis eine eindeutige Berechnung erlauben.
- Gesamtnachzahlung und Einzelkomponenten bleiben getrennt: Gesamtkorrektur = alle fehlenden Bezüge; Schichtzulage netto = isolierter Differenzbetrag zur aktuellen Abrechnung.

# v0.99.22

- Legacy-Forecasts ohne Einzelkomponenten verwenden wieder die damalige Pfändungssemantik; die VBL wird nicht fälschlich ein zweites Mal aus dem steuerfreien Anteil herausgerechnet.
- Alte Nettoeffekte werden mit der aktuellen BMF-/SV-/VBL-/Pfändungslogik neu berechnet, statt die veraltete Soll-Auszahlung weiterzuverwenden.
- Der echte Juli-Zeitnachweis ist als Regression abgesichert: 21,40 Nachtstunden inklusive sieben Spätdienstanteilen à 0,70 h sowie der beiden Nachtdienste.
- Juli 2026 ergibt 142,13 € steuerfreie Zuschläge und 100,77 € steuerpflichtige variable Bezüge; der Referenz-Nettoeffekt beträgt 189,88 €.

# v0.99.21

- Alte Gehaltsprognosen können die steuerfreie und steuerpflichtige Nachzahlung jetzt aus gespeicherten Brutto-, Netto- und Pfändungswerten rekonstruieren.
- Bei vollständig fehlenden variablen Bezügen wird ein steuerfreier Anteil nicht mehr fälschlich als 0,00 € angezeigt.
- Die Netto-Nachzahlung bleibt auf die tatsächlich eingelesene Auszahlung bezogen; einzelne Lohnarten benötigen nur dann einen erneuten Zeitnachweis, wenn deren Detailaufteilung angezeigt werden soll.

# v0.99.20

- Neu eingelesene Zeitnachweise speichern die erkannten Lohnarten-Codes dauerhaft im Forecast.
- 5211/5212 bestimmen damit auch nach Reload eindeutig Wechsel-/Schichtzulage.
- Die komponentengenaue Nettoaufteilung bleibt nach Reload erhalten.

# v0.99.19

- Gehaltskontrolle rekonstruiert bei älteren Kontrollkarten die gespeicherten Zeitnachweis-Komponenten, statt nur Soll minus Ist als Gesamtfallback zu zeigen.
- Steuerfreie Rückstände werden netto separat gezeigt; steuerpflichtige Rückstände brutto mit Nettoeffekt.
- Zeitzuschläge werden brutto und netto zusammengefasst; 5211/5212 bestimmt weiterhin ausschließlich die im Zeitnachweis gespeicherte Wechsel-/Schichtzulage.
- September-Beispiel mit 142,13 € steuerfrei, 100,77 € steuerpflichtig, 142,90 € Zeitzuschlägen und 100 € Schichtzulage ist als Regressionstest abgesichert.

# v0.99.18

- Erwartete Nachzahlung wird bei alten Datensätzen notfalls direkt aus Soll-Auszahlung minus tatsächlicher Ist-Auszahlung abgeleitet.
- Dadurch bleibt der Netto-Nachzahlungsblock sichtbar, auch wenn der alte Forecast weder Einzelkomponenten noch baselinePayout gespeichert hat.

# v0.99.17

- Behebt den Renderfehler, durch den die berechnete Netto-Nachzahlung nicht in der Gehaltskontrollkarte erschien.
- Der Netto-Breakdown wird jetzt direkt beim Erzeugen jeder Karte berechnet und angehängt.

# v0.99.16

- Alte Gehaltsprognosen zeigen die erwartete Netto-Nachzahlung jetzt sichtbar, auch wenn gespeicherte Einzelbestandteile fehlen.
- Die korrigierte Auszahlung wird aus tatsächlicher Auszahlung plus gespeichertem Nettoeffekt angezeigt.
- Eine fehlende Detailaufteilung wird ausdrücklich als Alt-Daten-Grenze gekennzeichnet statt den gesamten Nachzahlungsblock auszublenden.

# v0.99.15

- Gehaltskontrolle nutzt die tatsächlich eingelesene Monatsabrechnung als sichtbare Basis der erwarteten Nachzahlung.
- Steuerpflichtige Rückstände werden ausdrücklich brutto → Nettoeffekt dargestellt; steuerfreie Zuschläge separat netto.
- Schicht-/Wechselschicht bleibt aus dem im Zeitnachweis erkannten 5212-/5211-Code.

# v0.99.14

- Gehaltskontrolle benennt die offene Netto-Korrektur sichtbar als erwartete Nachzahlung.
- Die erwartete Auszahlung nach Korrektur zeigt klar, dass sie aus aktueller Auszahlung plus Netto-Nachzahlung entsteht.

# v0.99.13

- Bereits gespeicherte Gehaltsprognosen ohne `netEffects` werden beim Start aus ihren vorhandenen Einzelbestandteilen nachberechnet.
- Für den September-Fall ist damit kein erneuter Import des Juli-Zeitnachweises mehr nötig, sofern die Einzelbestandteile bereits gespeichert sind.
- Die Nachberechnung verwendet dieselbe BMF-/SV-/VBL-/Pfändungslogik wie ein neuer Zeitnachweis und erfindet bei unvollständigen oder ungeklärten Bestandteilen keine Werte.

# v0.99.12

- Gehaltskontrolle trennt offene Rückstände zusätzlich in steuerfrei netto und steuerpflichtig netto.
- Zeitzuschläge sowie Schicht-/Wechselschichtzulage erhalten nach erneutem Zeitnachweis-Import eigene Nettoeffekte.
- Voraussichtliche Netto-Nachzahlung und korrigierte Auszahlung werden auf Basis der aktuellen Bezügemitteilung angezeigt.
- VBL-Arbeitnehmeranteil wird vor Anwendung der Pfändungstabelle aus dem pfändbaren Netto herausgerechnet.
- Festbezugs-Referenz 2026: 2.657,94 € Auszahlung, 88,94 € Pfändung, sofern keine Nachverrechnung vorliegt.
- Alte Prognosen bleiben lesbar; für die exakte Detailaufteilung genügt ein erneutes Einlesen des betreffenden Zeitnachweises.

# v0.99.11

- VBL-SV-Hinzurechnungsbetrag 2026 nach der VBL-Systematik statt linearem Näherungsfaktor.
- Eigene VBL-Bemessungsgrundlage: bekannte VBL-pflichtige Bestandteile werden getrennt vom steuer-/SV-pflichtigen Brutto geführt.
- Einspringprämie bleibt steuer- und SV-pflichtig, wird bis zu einer echten Referenzabrechnung aber nicht ungeprüft in die VBL-Basis aufgenommen und als prüfpflichtig markiert.
- §21-Durchschnittspositionen 5161/5162 werden nicht mehr nur still ignoriert, sondern als nicht automatisch berechenbare Bestandteile im Kontrolltool ausgewiesen.
- Feiertagsbezüge werden auf Bezügemitteilungen separat erkannt; ohne eindeutig berechenbaren Zeitnachweis-Betrag wird nicht geraten.
- Nacht/Sonntag bleiben steuer-/SV-frei, Samstag und Schicht-/Wechselschichtzulage steuer-/SV-pflichtig.

# v0.99.10

- Regressionen aus dem neuen Gehaltskontrolltool behoben.
- Prognosemonate ohne vorhandene Bezügemitteilung führen nicht mehr zum Absturz.
- Aggregierte Rückrechnungen gleichen auch kleine Einzelpositionen korrekt aus.
- CI ist jetzt dauerhaft aktiv und prüft JavaScript-Syntax sowie die vollständige Node-Test-Suite nach jedem Push und Pull Request.

# v0.99.9

- Hotfix: Gehalts-/Kontrollmodule können den Start der Budget-App nicht mehr blockieren.
- Budget, Übersicht, Fixkosten, Sparen und Verlauf werden vollständig initialisiert und gerendert, bevor der Gehaltsbereich separat geladen wird.
- Fehler im Gehaltsbereich werden abgefangen; die Kern-App bleibt dabei weiter benutzbar und zeigt ihre gespeicherten Beträge.
- Regressionstest stellt sicher, dass salary-ui nicht mehr als statische Startabhängigkeit eingebunden ist.

# v0.99.8

- Neues Gehaltskontrolltool: Zeitnachweis-Soll gegen tatsächliche Bezügemitteilung.
- Feste Bezüge, Zeit-/Wochenendzuschläge und Schicht-/Wechselschichtzulage werden komponentenweise geprüft.
- Fehlende variable Bezüge werden bei stimmigen festen Bezügen rechnerisch als offener Anspruch ausgewiesen.
- Rückrechnungs-Perioden aus späteren Bezügemitteilungen werden dem ursprünglichen Abrechnungsmonat zugeordnet.
- Offene Bruttodifferenzen werden durch spätere Rückrechnungen reduziert bzw. als erledigt markiert.
- Bei eindeutig zuordenbarer einzelner Rückrechnung wird auch deren tatsächlicher Nettoeffekt angezeigt; davor zeigt die App den prognostizierten Nettoeffekt.
- Budgetlogik bleibt vollständig getrennt und unverändert.
- Steuerlogik bleibt: Nacht/Sonntag steuerfrei, Samstag sowie Schicht-/Wechselschichtzulage steuerpflichtig.

# v0.99.7

- Einzelne Fixkosten können für genau den nächsten Lohnzyklus einmalig pausiert oder reduziert werden.
- Normale Fixkostenbeträge bleiben unverändert; die Ausnahme wird separat mit dem nächsten Auszahlungstag gespeichert.
- Beim automatischen Lohneingang wird die einmalig angepasste Fixkostensumme verwendet und die Ausnahme anschließend verbraucht.
- Im darauffolgenden Lohnzyklus gelten automatisch wieder die normalen Fixkosten.
- Fixkosten-Seite zeigt normalen Monatsbetrag, nächsten Auszahlungstag und die einmalig wirksame Gesamtsumme.
- Vorgemerkte-Lohn-Vorschau berücksichtigt die einmaligen Fixkostenänderungen sofort.
- Einmalige Fixkosten-Ausnahmen sind Bestandteil von Backup/Restore.

# v0.99.6

- Sparziel-Schnellzugriff scrollt nur noch zur Sparsektion und fokussiert kein Eingabefeld mehr; die iPhone-Tastatur öffnet sich dadurch nicht automatisch.
- Refresh-/Update-Button frei oben rechts in die Seite integriert.
- Separate weiße Kopfzeile vollständig entfernt.
- Update-Status erscheint bei Bedarf als kleine schwebende Statusfläche neben dem Refresh-Button.
- Navigation und Seiteninhalt an die fehlende Kopfzeile angepasst.

# v0.99.5

- Übersicht vereinfacht: „Dein aktueller Plan“, „Diese Lohnperiode“ und „Letzte Bewegungen“ entfernt.
- Schnellzugriff direkt unter die erste Übersichtskachel verschoben.
- Neue Kachel „Erwartete Löhne“ für die nächsten zwei anstehenden Auszahlungsmonate.
- Fehlt der zugehörige Zeitnachweis, zeigt die Übersicht statt eines Betrags „Ausstehend“.
- Nach dem Einlesen eines Zeitnachweises aktualisiert sich die Übersicht sofort mit dem berechneten Auszahlungsbetrag.
- Bereits gebuchter aktueller Lohntag wird aus der Zwei-Monats-Vorschau herausgeschoben; angezeigt werden dann die beiden folgenden Auszahlungsmonate.
- „Lohn sofort buchen“ vollständig entfernt; Lohn läuft nur noch über die Vormerkung und automatische Buchung am Auszahlungstag.

# v0.99.4

- Kopfzeile auf den Refresh-Button reduziert.
- Versionsanzeige und Darstellungsumschalter nach „Mehr“ verschoben.
- Neuer persistenter Schalter „Erklärungen anzeigen“ unter „Mehr“.
- Erklärende Hinweise unter den Kacheln lassen sich global ausblenden; Status- und Fehlermeldungen bleiben sichtbar.
- Darstellungspräferenz wird in Datensicherungen aufgenommen.

# v0.99.3

- Bekannten Auszahlungsbetrag aus der Lohnabrechnung vor dem Lohntag vormerken.
- Vormerkung beeinflusst Giro, Tagesbudget und Wochenbudget vor dem Auszahlungstag nicht.
- Automatische Buchung ab 00:00 Uhr am letzten Arbeitstag des Monats; bei geschlossener App rückwirkend beim nächsten Öffnen mit korrektem Buchungsdatum.
- Fixkosten werden beim automatischen Lohnstart genau einmal abgezogen.
- Vormerkung kann bis zum Auszahlungstag geändert oder gelöscht werden.
- Übersicht zeigt den vorgemerkten Betrag und eine klar gekennzeichnete Vorschau für den Auszahlungstag.
- Doppelbuchungsschutz über eindeutige Vormerkungs-ID.

# v0.99.2

- Persönliche Fixkosten aktualisiert.
- Neue Fixkostensumme: 2.160,31 €.
- Einmalige Migration ersetzt den bisherigen Fixkostenstand beim Update; spätere manuelle Änderungen bleiben erhalten.

# v0.99.1
- Sparbereich vereinfacht: nur noch Zweck, Betrag und Sparverlauf; keine separate Sparziel-Verwaltung mehr.
- Bestehende Zwecke werden intern automatisch wiederverwendet; neue Zwecke automatisch angelegt.
- Aktive Sparbuchungen können im Verlauf weiterhin freigegeben werden.
- Gehaltsprognose auf kleinen iPhone-Breiten responsiver gemacht; lange Werte brechen sauber um.
- Abrechnungsvergleich in mobile, mehrzeilige Prognose/Abrechnung/Abweichung-Darstellung umgebaut.
- Zeitlohnarten im UI deutsch beschriftet; 5211/5212 werden als monatliche Zulage statt 0,00 h angezeigt.
- Prognosegrafik kompakter und klarer dargestellt.

# Changelog

## v0.99.1 – Release Candidate
- Keine neuen Fachfunktionen.
- Gesamtcheck für Repo-Root, PWA-Versionierung, Service Worker und Test-Suite.
- Release-Candidate-Stand für den Praxistest auf GitHub Pages/iPhone.

## v0.99.1 – UX & Fehlerzustände
- Nicht-blockierende Statusmeldungen statt vieler Browser-Alerts.
- Update-Button zeigt einen echten Busy-Zustand und verhindert Doppelklicks während der Prüfung.
- Leere Listen und mobile Touch-Ziele klarer dargestellt.
- Safe-Area-Abstand für iPhone/PWA verbessert.
- Keine Änderung an Budget-, Spar- oder Gehaltsformeln.


## v0.28.0 – End-to-End-Absicherung
- kompletter Budgetzyklus als Integrationsfluss abgesichert: Lohn, Fixkosten, Sonntag-Abhebung, Sparrate, Giro-Ausgabe, verkürzter Schlussabschnitt und neuer Lohn
- Statistik prüft dabei, dass Bargeldabhebungen keine Ausgaben sind
- Zeitnachweis -> Prognose -> Bezügemitteilung als zusammenhängender Integrationspfad getestet
- Nachverrechnungen beeinflussen Pfändung/Auszahlung weiterhin nicht als Prognosefehler
- keine fachliche Änderung an Budget- oder Gehaltsformeln

## v0.27.0 – Datenintegrität & Migration
- automatische, idempotente Migration lokaler Alt-Daten auf Schema 3
- ungültige Datumswerte können keinen 1970-/NaN-Zustand mehr erzeugen
- Transaktionen, Bargeld, Sparziele, Fixkosten und Historien werden beim Lesen defensiv normalisiert
- Backup-Format v3 mit App-/Schema-Version und Theme
- Restore prüft Backups vor dem Schreiben und behält vorhandene Daten bei, wenn die Wiederherstellung fehlschlägt
- alte Backup-Versionen 1/2 bleiben kompatibel; unbekannte zukünftige Versionen werden abgewiesen


## v0.26.0 – Premium-UI & Dark Mode
- Drei Darstellungsmodi: System, Hell und Dunkel; Umschaltung direkt im Header.
- Theme-Präferenz wird lokal gespeichert und folgt im Systemmodus automatisch iOS/macOS.
- Karten, Navigation, Buttons, Eingaben und Charts auf einen ruhigeren Apple/N26-inspirierten Glass-Look vereinheitlicht.
- Safe-Area, mobile Header-Abstände und Touch-Ziele verbessert.
- Budget-, Spar-, Statistik- und Gehaltsberechnungen unverändert.

## v0.22.0
- Gehaltsprognose gegen echte 2026-Bezügemitteilungen validiert.
- Nachverrechnungen werden getrennt erkannt und verfälschen den Prognosevergleich nicht mehr.
- Tarifgruppe, Stufe und feste Entgeltbestandteile werden aus Bezügemitteilungen erkannt.
- Reine Kernabrechnung KR8/5 (ab 04/2026) als Regressionstest hinterlegt.

## v0.21.1
- Step 21 Praxisvalidierung mit echten UKW-Zeitnachweisen März, April, Mai, Juli und August 2026.
- UKW-Kopfzeilen mit Monatskürzeln (Mrz/Apr/Mai/Jul/Aug) werden sicher erkannt.
- Lohnart-Codes mit Doppelpunkt (z. B. 5010:, 5211:) werden korrekt gelesen.
- Bei echten Zeitnachweiszeilen wird die Spalte Anzahl am Zeilenende verwendet; Zahlen in Bezeichnungen wie „Sa 13-20 Uhr 0,64 E“ oder „25%“ werden nicht mit Stunden verwechselt.
- 5162 „Durchsch.§21TVL-Folg“ als bekannte §21-Folgeposition ergänzt.
- Reale Validierung: März→Mai, April→Juni, Mai→Juli, Juli→September, August→Oktober.
- Budget- und Sparlogik unverändert.

## v0.21.0
- Step 21: Zeitnachweis-PDF-Import für reale PDF-Strukturen gehärtet.
- PDF.js-Textbausteine werden anhand ihrer Koordinaten wieder zu Zeilen zusammengesetzt; Lohnarten gehen dadurch nicht mehr in einem Seiten-Fließtext verloren.
- Monat kann zusätzlich aus einem eindeutigen Datumsbereich erkannt werden; Auszahlung bleibt +2 Monate.
- Stunden werden nur aus eindeutigen Angaben, expliziten Std./h-Werten oder rechnerisch verifizierbaren UKW-Lohnzeilen übernommen; bei Mehrdeutigkeit weiterhin „Bitte prüfen“.
- 5211/5212 werden allein durch den Code als Wechsel-/Schichtzulage erkannt, ohne erfundene Stunden.
- Unbekannte 5xxx-Codes werden vollständig zur Prüfung markiert.
- OCR bleibt weiterhin nur Fallback/Prüffall; es wird nichts geraten.
- Hinweis: Die technische Importlogik ist vorbereitet und getestet. Eine abschließende Validierung gegen einen echten UKW-Zeitnachweis benötigt noch ein solches Original-PDF.

## v0.20.0
- Kalenderlogik für Bayern vervollständigt: Heilige Drei Könige, Fronleichnam und Allerheiligen ergänzt.
- Landesweite bayerische Feiertage zentral testbar gemacht.
- Zusätzliche Tests für Feiertage und normale Werktage ergänzt.

# Changelog

## v0.99.1 – Release Candidate
- Keine neuen Fachfunktionen.
- Gesamtcheck für Repo-Root, PWA-Versionierung, Service Worker und Test-Suite.
- Release-Candidate-Stand für den Praxistest auf GitHub Pages/iPhone.

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

## v0.19.0
- Sparpositionen können umbenannt werden.
- Sparpositionen können gelöscht werden; aktive Reservierungen werden dabei wieder freigegeben.
- Einzelne Sparraten können rückgängig gemacht und wieder für das Budget freigegeben werden.
- Rückgängig gemachte Sparraten bleiben intern als Historie erhalten, zählen aber nicht mehr als reserviertes Geld.

## v0.23.0
- Einspringprämie ergänzt: 150 € je Einspringdienst plus Einspringstunden × persönliches Stundenentgelt.
- Persönliches Stundenentgelt wird aus hinterlegtem Tabellenentgelt, Wochenarbeitszeit und Monatsfaktor abgeleitet.
- Normale Nacht-/Wochenend-/Schichtzuschläge bleiben ausschließlich im Zeitnachweis, damit nichts doppelt gezählt wird.
- Steuer-/SV-/Pfändungsbehandlung der Einspringprämie bleibt bis zur ersten echten Referenzabrechnung als prüfpflichtige Annahme markiert.

## v0.24.0 – Step 24
- Leichtgewichtige Statistik ohne Chart-Framework ergänzt.
- Einnahmen, echte Giro-Ausgaben, Bargeldabhebungen und aktuell reservierte Sparbeträge werden getrennt ausgewiesen.
- Monatsvergleich zeigt Einnahmen, Ausgaben und Sparreservierungen der letzten Monate.
- Sparentwicklung wird je Sparposition dargestellt; rückgängig gemachte Sparraten werden nicht gezählt.
- Abhebungen bleiben Transfers Giro → Bargeld und werden ausdrücklich nicht als Verbrauch gewertet.

## v0.26.0
- PWA-Updateprüfung lädt `version.js` explizit ohne Cache und zeigt den tatsächlichen Prüfstatus.
- Service-Worker-Registrierung nutzt `updateViaCache: none`, aktiviert neue Worker sofort und lädt bei neuer Version neu.
- Lokale Kernmodule werden als App-Shell vorgehalten, damit Budget, Verlauf und gespeicherte Daten nach einem erfolgreichen Online-Start auch offline öffnen können.
- App-Assets bleiben network-first mit Cache-Fallback, damit GitHub-Pages-Updates nicht an alten JS-Dateien hängen bleiben.
