function safeList(value) {
  return Array.isArray(value) ? value : [];
}

export function createSavingsPosition(name, id) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("Sparposition braucht einen Namen.");
  return {
    id: id || `${Date.now()}-${Math.random()}`,
    name: clean
  };
}

export function addSavingsPosition(data, position) {
  const current = normalizeSavings(data);
  if (current.positions.some((item) => item.id === position.id)) return current;
  return { ...current, positions: [...current.positions, position] };
}

export function createSavingsAllocation({ positionId, amount, date, sourceSegmentStart, effectiveFrom, id } = {}) {
  const value = Number(amount);
  if (!positionId) throw new Error("Keine Sparposition gewählt.");
  if (!Number.isFinite(value) || value <= 0) throw new Error("Sparrate muss größer als 0 sein.");
  return {
    id: id || `${Date.now()}-${Math.random()}`,
    positionId,
    amount: value,
    date: date || "",
    sourceSegmentStart: sourceSegmentStart || "",
    effectiveFrom: effectiveFrom || ""
  };
}

export function addSavingsAllocation(data, allocation) {
  const current = normalizeSavings(data);
  return { ...current, allocations: [...current.allocations, allocation] };
}

export function normalizeSavings(data) {
  const value = data && typeof data === "object" ? data : {};
  return {
    positions: safeList(value.positions).filter((item) => item && item.id && item.name),
    allocations: safeList(value.allocations).filter((item) => item && item.positionId && Number(item.amount) > 0)
  };
}

export function totalSaved(data) {
  return normalizeSavings(data).allocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function savedForPosition(data, positionId) {
  return normalizeSavings(data).allocations
    .filter((item) => item.positionId === positionId)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function savingsForSegment(data, segmentStartKey) {
  return normalizeSavings(data).allocations
    .filter((item) => item.sourceSegmentStart === segmentStartKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function effectiveReservedSavings(data, segmentStartKey) {
  if (!segmentStartKey) return 0;
  return normalizeSavings(data).allocations
    .filter((item) => item.effectiveFrom && item.effectiveFrom <= segmentStartKey)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function maxSavingsForSegment(weeklyBudget, cash, alreadySavedThisSegment = 0) {
  return Math.max(
    0,
    Number(weeklyBudget || 0) - Math.max(0, Number(cash || 0)) - Math.max(0, Number(alreadySavedThisSegment || 0))
  );
}
