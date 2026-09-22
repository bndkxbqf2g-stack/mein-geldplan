import { SALARY_2026 } from "../config/salary-2026.js";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

export function splitLines(text = "") {
  return String(text).replace(/\r/g, "\n").split(/\n+/).map(v => v.trim()).filter(Boolean);
}

export function payoutMonth(year, month, delay = SALARY_2026.payroll.payoutDelayMonths) {
  const d = new Date(year, month - 1 + delay, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function detectReportMonth(text = "") {
  const patterns = [
    /(?:Abrechnungsmonat|Monat|Zeitraum)\s*[:\-]?\s*(0?[1-9]|1[0-2])[./-](20\d{2})/i,
    /(?:Abrechnungsmonat|Monat|Zeitraum)\s*[:\-]?\s*(20\d{2})[-/](0?[1-9]|1[0-2])/i
  ];
  for (const pattern of patterns) {
    const m = String(text).match(pattern);
    if (!m) continue;
    if (m[1].length === 4) return { year: Number(m[1]), month: Number(m[2]) };
    return { year: Number(m[2]), month: Number(m[1]) };
  }
  return null;
}

function decimal(s) {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseWageLine(line, config = SALARY_2026) {
  const match = String(line).match(/(?:^|\s)(5010|5011|5014|5024|5161|5211|5212)(?:\s|$)/);
  if (!match) return null;
  const code = match[1];
  const tail = String(line).slice(match.index + match[0].length).trim();
  const values = [...tail.matchAll(/-?\d+(?:[.,]\d+)?/g)].map(m => decimal(m[0])).filter(v => v !== null);
  const type = config.wageTypes[code];

  // Nie raten: Stunden nur übernehmen, wenn genau ein Zahlenwert eindeutig vorhanden ist.
  const hours = values.length === 1 ? values[0] : null;
  return {
    code,
    type,
    line: String(line).trim(),
    hours,
    status: hours === null ? "review" : "ok"
  };
}

export function parseTimeReportText(text, config = SALARY_2026) {
  const lines = splitLines(text);
  const items = lines.map(line => parseWageLine(line, config)).filter(Boolean);
  const unknownCodes = [];
  for (const line of lines) {
    const m = line.match(/(?:^|\s)(5\d{3})(?:\s|$)/);
    if (m && !config.wageTypes[m[1]]) unknownCodes.push({ code: m[1], line, status: "review" });
  }
  const month = detectReportMonth(text);
  const hasConflict = items.some(i => i.code === "5211") && items.some(i => i.code === "5212");
  return {
    month,
    payoutMonth: month ? payoutMonth(month.year, month.month, config.payroll.payoutDelayMonths) : null,
    items,
    unknownCodes,
    wechsel: items.some(i => i.code === "5211"),
    schicht: items.some(i => i.code === "5212"),
    needsReview: items.some(i => i.status === "review") || unknownCodes.length > 0 || hasConflict || !month,
    conflict: hasConflict ? "5211 und 5212 gleichzeitig erkannt" : null
  };
}

export async function ensurePdfJs() {
  if (globalThis.pdfjsLib) return globalThis.pdfjsLib;
  if (typeof document === "undefined") throw new Error("PDF.js ist nur im Browser verfügbar.");
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mein-geldplan-pdfjs="1"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = PDFJS_URL;
    script.async = true;
    script.dataset.meinGeldplanPdfjs = "1";
    script.onload = resolve;
    script.onerror = () => reject(new Error("PDF.js konnte nicht geladen werden."));
    document.head.appendChild(script);
  });
  globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return globalThis.pdfjsLib;
}

export async function readPdfText(file) {
  if (!file) throw new Error("Keine PDF-Datei übergeben.");
  const pdfjs = await ensurePdfJs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str).join(" ").trim());
  }
  const text = pages.join("\n").trim();
  return { text, pages: pdf.numPages, needsOcr: text.length < 20 };
}
