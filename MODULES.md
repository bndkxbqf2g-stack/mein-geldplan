# Module 01–30
Budget, Cycle, Salary, UI, Insolvenz.

- `lib/payslip.js`: Parser und Prognose-vs.-Ist-Vergleich für Bezügemitteilungen.

### `lib/salary-ui.js`
Verantwortlich für UI-Rendering und Benutzeraktionen rund um Gehaltsprognose, Zeitnachweis und Bezügemitteilungsvergleich. Berechnungen bleiben in `salary.js`, PDF-Parsing in `pdf.js`/`payslip.js`.

### `lib/budget-ui.js`
Budget-, Bargeld- und Buchungs-UI; Fachlogik bleibt in Budget/Cycle/Storage.

### `lib/savings-ui.js`
UI für Sparpositionen und Sparraten.

### `lib/ui.js`
Kleine gemeinsame DOM-/Format-/Navigation-Helfer.


### `lib/fixed-costs.js` / `lib/fixed-costs-ui.js`
Kleine, getrennte Fixkostenlogik und Verwaltung. Die Lohnbuchung liest ausschließlich die gespeicherte Summe.

### `lib/history-ui.js`
Übersicht, Kontoverlauf, Monatsvergleich und Abhebungsanzeige. Keine eigene Fachberechnung.

### `lib/maintenance-ui.js`
Backup/Restore, Service-Worker-Registrierung und Updateprüfung.
## Step 16
- `tests/simulation.test.js`: kompletter Monatszyklus als Integrations-/Simulationstest
- `lib/cycle.js`: `isWithdrawalDay()` für Sonntagsregel


### Versionierung
`config/version.js` enthält die sichtbare App-Version. Die Version wird in der Kopfzeile angezeigt. Ein Test stellt sicher, dass HTML- und Service-Worker-Version dazu passen.

### Zyklusaktivierung
Der aktive Budgetzyklus wird in `budget-ui.js` aus der letzten tatsächlichen `salary`-Transaktion abgeleitet. `cycle.js` liefert weiterhin reine Datums-/Abschnittsberechnungen und startet selbst keinen produktiven Zyklus.
