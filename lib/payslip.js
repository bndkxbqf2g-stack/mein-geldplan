const money = v => Math.round((Number(v) || 0) * 100) / 100;

function deMoney(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? money(n) : null;
}

function currentPeriod(text = '') {
  return String(text).split(/Rückrechnungs-Periode/i)[0];
}

function firstAmount(text, label) {
  const re = new RegExp(label + '\\s+(-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|-?\\d+,\\d{2})(-)?', 'i');
  const m = String(text).match(re);
  if (!m) return null;
  const value = deMoney(m[1]);
  return m[2] ? -Math.abs(value) : value;
}

export function parsePayslipText(text = '') {
  const source = currentPeriod(text);
  const monthMatch = source.match(/Abrechnungsmonat\s*:\s*(0?[1-9]|1[0-2])\/(20\d{2})/i);
  const month = monthMatch ? `${monthMatch[2]}-${String(monthMatch[1]).padStart(2, '0')}` : null;
  const garnishmentRaw = firstAmount(source, 'Summe\\s+Pfändung\\/Abtretung');
  const result = {
    month,
    totalGross: firstAmount(source, 'Gesamtbrutto'),
    legalNet: firstAmount(source, 'Gesetzliches\\s+Netto'),
    garnishment: garnishmentRaw == null ? null : Math.abs(garnishmentRaw),
    payout: firstAmount(source, 'Überweisung'),
    wageTax: firstAmount(source, 'Lohnsteuer,?\\s+lfd\\.'),
    churchTax: firstAmount(source, 'Kirchensteuer,?\\s+lfd\\.'),
    health: firstAmount(source, 'Krankenversicherung,?\\s+lfd\\.'),
    pension: firstAmount(source, 'Rentenversicherung,?\\s+lfd\\.'),
    unemployment: firstAmount(source, 'Arbeitslosenvers\\.,?\\s+lfd\\.'),
    care: firstAmount(source, 'Pflegeversicherung,?\\s+lfd\\.'),
    vbl: Math.abs(firstAmount(source, 'ZV-Uml\\.\\s+Regelentg\\.\\s+AN') || 0)
  };
  const required = ['month', 'totalGross', 'legalNet', 'payout'];
  return { ...result, needsReview: required.some(k => result[k] == null) };
}

export function comparePayslip(forecast, actual, tolerance = 1) {
  if (!forecast || !actual) return { status: 'review', rows: [], maxAbsDiff: null };
  const fields = [
    ['totalGross', 'Gesamtbrutto'],
    ['legalNet', 'Gesetzliches Netto'],
    ['garnishment', 'Pfändung'],
    ['payout', 'Auszahlung']
  ];
  const rows = fields.map(([key, label]) => {
    const predicted = forecast[key];
    const real = actual[key];
    const difference = predicted == null || real == null ? null : money(real - predicted);
    return { key, label, predicted, actual: real, difference };
  });
  const diffs = rows.map(r => r.difference).filter(v => v != null).map(Math.abs);
  const maxAbsDiff = diffs.length ? money(Math.max(...diffs)) : null;
  const status = actual.needsReview || maxAbsDiff == null ? 'review' : maxAbsDiff <= tolerance ? 'ok' : 'different';
  return { status, rows, maxAbsDiff };
}
