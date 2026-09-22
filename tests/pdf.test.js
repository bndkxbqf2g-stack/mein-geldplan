import test from "node:test";
import assert from "node:assert/strict";
import { detectReportMonth, parseTimeReportText, parseWageLine, payoutMonth, splitLines } from "../lib/pdf.js";

test("Text wird in saubere Zeilen geteilt", () => {
  assert.deepEqual(splitLines("A\n\n B\r\nC "), ["A", "B", "C"]);
});

test("Abrechnungsmonat wird erkannt und +2 Monate zugeordnet", () => {
  assert.deepEqual(detectReportMonth("Abrechnungsmonat: 07/2026"), { year: 2026, month: 7 });
  assert.equal(payoutMonth(2026, 7), "2026-09");
});

test("bekannte Lohnart mit eindeutig einer Zahl wird übernommen", () => {
  const item = parseWageLine("5010 Nacht 12,50");
  assert.equal(item.code, "5010");
  assert.equal(item.type, "night");
  assert.equal(item.hours, 12.5);
  assert.equal(item.status, "ok");
});

test("mehrdeutige Zahlen werden nicht geraten", () => {
  const item = parseWageLine("5010 Nacht 12,50 4,58 57,25");
  assert.equal(item.hours, null);
  assert.equal(item.status, "review");
});

test("unbekannte 5xxx-Lohnart wird zur Prüfung markiert", () => {
  const report = parseTimeReportText("Abrechnungsmonat: 08/2026\n5999 Unbekannt 2,00");
  assert.equal(report.unknownCodes.length, 1);
  assert.equal(report.unknownCodes[0].code, "5999");
  assert.equal(report.needsReview, true);
});

test("5211 und 5212 gleichzeitig werden als Konflikt markiert", () => {
  const report = parseTimeReportText("Abrechnungsmonat: 08/2026\n5211 Wechselschicht 1\n5212 Schicht 1");
  assert.equal(report.wechsel, true);
  assert.equal(report.schicht, true);
  assert.equal(report.needsReview, true);
  assert.match(report.conflict, /5211/);
});
