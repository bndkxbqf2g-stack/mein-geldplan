export const SALARY_2026 = Object.freeze({
  tariff: Object.freeze({ group: "KR8", personalLevel: 5, surchargeLevel: 3 }),
  fixed: Object.freeze({
    basePay: 4226.92,
    careAllowance: 90,
    universityAllowance: 163.51,
    gross: 4480.43
  }),
  surcharges: Object.freeze({
    hourlyBase: 22.92,
    night: 4.58,
    saturday: 0.64,
    sunday: 5.73
  }),
  shift: Object.freeze({
    wechsel: 250,
    schicht: 100
  }),
  payroll: Object.freeze({ dependents: 2, payoutDelayMonths: 2 }),
  work: Object.freeze({ weeklyHours: 38.5, monthFactor: 4.348 }),
  springIn: Object.freeze({ basePremium: 150, taxMode: 'taxable-unverified' }),
  profile: Object.freeze({ taxClass: 1, childAllowance: 1.0, churchTaxRate: 0.08, kvAdditionalRate: 2.18, childless: false, careChildDeductions: 1, saxony: false }),
  social: Object.freeze({
    healthEmployee: 0.0839, careEmployee: 0.0155, pensionEmployee: 0.093, unemploymentEmployee: 0.013,
    healthCareCap: 5812.50, pensionUnemploymentCap: 8450,
    vblEmployeeRate: 0.0181, zvSvAddonRate: 178.22 / 4480.43
  }),
  wageTypes: Object.freeze({
    5010: "night",
    5011: "nightBeforeMidnight",
    5014: "saturday",
    5024: "sunday",
    5161: "average21",
    5162: "average21Followup",
    5211: "wechsel",
    5212: "schicht"
  })
});

export function fixedGross(config = SALARY_2026) {
  return Number((config.fixed.basePay + config.fixed.careAllowance + config.fixed.universityAllowance).toFixed(2));
}
