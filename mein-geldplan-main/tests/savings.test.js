import test from "node:test";
import assert from "node:assert/strict";
import {
  createSavingsPosition,
  addSavingsPosition,
  createSavingsAllocation,
  addSavingsAllocation,
  savedForPosition,
  savingsForSegment,
  effectiveReservedSavings,
  maxSavingsForSegment,
  totalSaved
} from "../lib/savings.js";

test("Sparpositionen und Sparraten werden getrennt verwaltet", () => {
  const position = createSavingsPosition("Urlaub", "urlaub");
  let data = addSavingsPosition(null, position);
  data = addSavingsAllocation(data, createSavingsAllocation({
    id: "a1",
    positionId: "urlaub",
    amount: 100,
    date: "2026-10-04",
    sourceSegmentStart: "2026-10-04",
    effectiveFrom: "2026-10-11"
  }));
  assert.equal(savedForPosition(data, "urlaub"), 100);
  assert.equal(totalSaved(data), 100);
});

test("Sparrate zählt im laufenden Abschnitt gegen das Wochenmaximum", () => {
  const data = {
    positions: [{ id: "urlaub", name: "Urlaub" }],
    allocations: [{ positionId: "urlaub", amount: 100, sourceSegmentStart: "2026-10-04", effectiveFrom: "2026-10-11" }]
  };
  assert.equal(savingsForSegment(data, "2026-10-04"), 100);
  assert.equal(maxSavingsForSegment(490, 390, 0), 100);
  assert.equal(maxSavingsForSegment(490, 390, 100), 0);
});

test("Sparrate reduziert erst ab dem folgenden Budgetabschnitt die Budgetbasis", () => {
  const data = {
    positions: [{ id: "urlaub", name: "Urlaub" }],
    allocations: [{ positionId: "urlaub", amount: 100, sourceSegmentStart: "2026-10-04", effectiveFrom: "2026-10-11" }]
  };
  assert.equal(effectiveReservedSavings(data, "2026-10-04"), 0);
  assert.equal(effectiveReservedSavings(data, "2026-10-11"), 100);
  assert.equal(effectiveReservedSavings(data, "2026-10-18"), 100);
});
