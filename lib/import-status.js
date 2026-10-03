export const IMPORT_STAGES = Object.freeze({
  fileRead: 'Datei konnte nicht gelesen werden',
  pdfProcess: 'PDF konnte nicht verarbeitet werden',
  textExtract: 'Text konnte nicht extrahiert werden',
  timeReportParser: 'Zeitnachweis konnte nicht ausgewertet werden',
  payslipParser: 'Bezügemitteilung konnte nicht ausgewertet werden',
  month: 'Monat konnte nicht erkannt werden',
  wageType: 'Keine verwertbare Lohnart gefunden',
  calculation: 'Lohnart erkannt, aber fachlich nicht berechenbar',
  review: 'Lohnart ist UNSICHER und muss geprüft werden',
  save: 'Import konnte nicht gespeichert werden',
  display: 'Import wurde gespeichert, Anzeige konnte nicht aktualisiert werden'
});

export function importStageError(stage, detail = '', cause = null) {
  const label = IMPORT_STAGES[stage] || String(stage || 'Importfehler');
  const message = detail ? `${label}: ${detail}` : label;
  const error = new Error(message);
  error.importStage = stage;
  if (cause) error.cause = cause;
  return error;
}

export function normalizeImportError(error, stage, fallback = 'unbekannter Fehler') {
  if (error?.importStage) return error;
  const detail = error?.message || fallback;
  const label = IMPORT_STAGES[stage] || String(stage || 'Importfehler');
  if (detail === label || detail.startsWith(`${label}:`)) {
    const normalized = new Error(detail);
    normalized.importStage = stage;
    if (error) normalized.cause = error;
    return normalized;
  }
  return importStageError(stage, detail, error || null);
}

export function importErrorText(error, stage, fallback = 'unbekannter Fehler') {
  return normalizeImportError(error, stage, fallback).message;
}
