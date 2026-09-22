import test from "node:test";
import assert from "node:assert/strict";
import { SALARY_2026, fixedGross } from "../config/salary-2026.js";

test("feste Bestandteile entsprechen der Bezügemitteilung 07/2026", () => {
  assert.equal(SALARY_2026.fixed.basePay, 4226.92);
  assert.equal(SALARY_2026.fixed.careAllowance, 90);
  assert.equal(SALARY_2026.fixed.universityAllowance, 163.51);
  assert.equal(fixedGross(), 4480.43);
  assert.equal(SALARY_2026.fixed.gross, 4480.43);
});

test("KR8-Zeitzuschläge basieren 2026 auf Stufe 3", () => {
  assert.equal(SALARY_2026.surcharges.hourlyBase, 22.92);
  assert.equal(SALARY_2026.surcharges.night, 4.58);
  assert.equal(SALARY_2026.surcharges.saturday, 0.64);
  assert.equal(SALARY_2026.surcharges.sunday, 5.73);
});

test("persönliche Stufe und Pfändungsparameter sind getrennt konfiguriert", () => {
  assert.equal(SALARY_2026.tariff.group, "KR8");
  assert.equal(SALARY_2026.tariff.personalLevel, 5);
  assert.equal(SALARY_2026.tariff.surchargeLevel, 3);
  assert.equal(SALARY_2026.payroll.dependents, 2);
  assert.equal(SALARY_2026.payroll.payoutDelayMonths, 2);
});

test("relevante Zeitlohnarten sind zentral bekannt", () => {
  assert.deepEqual(Object.keys(SALARY_2026.wageTypes).map(Number), [5010,5011,5014,5024,5161,5211,5212]);
  assert.equal(SALARY_2026.wageTypes[5211], "wechsel");
  assert.equal(SALARY_2026.wageTypes[5212], "schicht");
});
