import { payrollMonthKey } from './payroll-month.js';

const DEFAULT_DELAY_MONTHS = 2;

export const DEFAULT_PAYROLL_PAYMENT_OVERRIDES = Object.freeze([
  Object.freeze({
    id: '2026-07-transmission-delay',
    originMonth: '2026-07',
    plannedPaymentMonth: '2026-09',
    actualPaymentMonth: '2026-10',
    oneTime: true,
    reason: 'Einmalige Übermittlungsverzögerung beim Wechsel vom Flexpool zur Stammstation'
  })
]);

function validMonth(value) {
  return payrollMonthKey(value);
}

function addMonths(month, count = DEFAULT_DELAY_MONTHS) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + Number(count || 0), 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function normalizePayrollPaymentOverrides(value = DEFAULT_PAYROLL_PAYMENT_OVERRIDES) {
  const source = Array.isArray(value) ? value : [];
  return source.map((item, index) => {
    const originMonth = validMonth(item?.originMonth);
    const plannedPaymentMonth = validMonth(item?.plannedPaymentMonth) || (originMonth ? addMonths(originMonth) : null);
    const actualPaymentMonth = validMonth(item?.actualPaymentMonth);
    if (!originMonth || !plannedPaymentMonth || !actualPaymentMonth) return null;
    return {
      id: String(item?.id || `payment-override-${index}`),
      originMonth,
      plannedPaymentMonth,
      actualPaymentMonth,
      oneTime: item?.oneTime !== false,
      reason: String(item?.reason || 'Einmalige Zahlungsmonatskorrektur').trim()
    };
  }).filter(Boolean);
}

export function findPayrollPaymentOverride(originMonth, overrides = DEFAULT_PAYROLL_PAYMENT_OVERRIDES) {
  const key = validMonth(originMonth);
  if (!key) return null;
  return normalizePayrollPaymentOverrides(overrides).find(item =>
    item.originMonth === key && item.plannedPaymentMonth !== item.actualPaymentMonth
  ) || null;
}

export function applyPaymentMonthOverride(report = {}, overrides = DEFAULT_PAYROLL_PAYMENT_OVERRIDES) {
  const originMonth = report?.month
    ? `${report.month.year}-${String(report.month.month).padStart(2, '0')}`
    : validMonth(report?.reportMonth);
  if (!originMonth) return report;
  const plannedPaymentMonth = validMonth(report?.standardPayoutMonth) || validMonth(report?.payoutMonth) || addMonths(originMonth);
  const override = findPayrollPaymentOverride(originMonth, overrides);
  if (!override) return {...report, standardPayoutMonth: plannedPaymentMonth};
  return {
    ...report,
    payoutMonth: override.actualPaymentMonth,
    standardPayoutMonth: plannedPaymentMonth,
    paymentMonthOverride: {...override}
  };
}
