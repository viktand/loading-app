const STORAGE_KEY = 'coil_storage_state_v5';

const BATCH_COLORS = [
  '#4dabf7', '#51cf66', '#fcc419', '#ff8787',
  '#b197fc', '#3bc9db', '#ffa94d', '#a9e34b',
  '#f783ac', '#63e6be', '#748ffc', '#ffd43b',
  '#ff922b', '#20c997', '#da77f2', '#94d82d'
];

const ROLL_SPECS = {
  8:   { shape: 'coil',   label: 'Рулон 8 т',     weight: 8,   diameter: 1.4, width: 1.25, basePairs: 14, topPairs: 13, capacity: 54 },
  15:  { shape: 'coil',   label: 'Рулон 15 т',    weight: 15,  diameter: 1.8, width: 1.50, basePairs: 11, topPairs: 10, capacity: 42 },
  1:   { shape: 'bag',    label: 'Биг-бэг 1 т',   weight: 1,   diameter: 1.0, width: 1.00, height: 1.2, cols: 20, rows: 3, tiers: 2, capacity: 120 },
  0.8: { shape: 'pallet', label: 'Паллета 0.8 т', weight: 0.8, diameter: 0.8, width: 1.20, height: 1.3, cols: 25, rows: 3, tiers: 2, capacity: 150 }
};

function getEffectiveSpec(weight, maxTiers = 2) {
  const base = ROLL_SPECS[weight] || ROLL_SPECS;
  if (maxTiers === 1) {
    if (base.shape === 'bag' || base.shape === 'pallet') {
      return { ...base, tiers: 1, capacity: base.cols * base.rows };
    }
    return { ...base, topPairs: 0, capacity: base.basePairs * 2 };
  }
  return base;
}

function createZoneObj(id, name, slotsX, slotsY) {
  return {
    id: id,
    name: name,
    slotsX: slotsX,
    slotsY: slotsY,
    slots: Array.from({ length: slotsX * slotsY }, (_, i) => ({
      index: i,
      rollWeight: null,
      capacity: 0,
      coils: []
    }))
  };
}

function getDefaultState() {
  return {
    activeZoneId: 1,
    lastBatchId: 0,
    batches: [],
    zones: [
      createZoneObj(1, 'Площадка 1', 5, 5),
      createZoneObj(2, 'Площадка 2', 3, 5)
    ]
  };
}

function getStorageState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw && Array.isArray(raw.zones) && raw.zones.length > 0) return raw;
  } catch (e) {}
  return getDefaultState();
}

function saveStorageState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearStorageState() {
  localStorage.removeItem(STORAGE_KEY);
}

function resizeZone(zone, newX, newY) {
  if (zone.slots.some(s => s.coils && s.coils.length > 0)) return;
  zone.slotsX = newX;
  zone.slotsY = newY;
  zone.slots = Array.from({ length: newX * newY }, (_, i) => ({
    index: i,
    rollWeight: null,
    capacity: 0,
    coils: []
  }));
}

function getZoneFreeSlotsCount(zone) {
  return zone.slots.filter(s => !s.coils || s.coils.length === 0).length;
}

// Маршрут слотов вертикальной «змейкой» (сверху вниз по колонкам):
// Чётные колонки (c = 0, 2, 4...): сверху вниз (r = 0 -> slotsY - 1), вход слева
// Нечётные колонки (c = 1, 3...): снизу вверх (r = slotsY - 1 -> 0), вход справа
function getSnakeRoute(zone) {
  const route = [];
  for (let c = 0; c < zone.slotsX; c++) {
    const isEvenCol = (c % 2 === 0);
    if (isEvenCol) {
      for (let r = 0; r < zone.slotsY; r++) {
        route.push({ slotIdx: r * zone.slotsX + c, entrySide: 'left', exitSide: 'right' });
      }
    } else {
      for (let r = zone.slotsY - 1; r >= 0; r--) {
        route.push({ slotIdx: r * zone.slotsX + c, entrySide: 'right', exitSide: 'left' });
      }
    }
  }
  return route;
}

function buildSlotPositions(spec, side = 'left') {
  const positions = [];
  const D = spec.diameter;
  const slotL = 20.0;
  const rev = (side === 'right');

  if (spec.shape === 'bag' || spec.shape === 'pallet') {
    for (let c = 0; c < spec.cols; c++) {
      const xStart = rev ? (slotL - (c + 1) * D) : (c * D);
      const xEnd   = rev ? (slotL - c * D)       : ((c + 1) * D);
      for (let tier = 1; tier <= spec.tiers; tier++) {
        for (let row = 0; row < spec.rows; row++) {
          positions.push({ tier, row, side, xStart, xEnd });
        }
      }
    }
    return positions;
  }

  const addBottomPair = (p) => {
    const xStart = rev ? (slotL - (p + 1) * D) : (p * D);
    const xEnd   = rev ? (slotL - p * D)       : ((p + 1) * D);
    positions.push({ tier: 1, row: 0, side, xStart, xEnd });
    positions.push({ tier: 1, row: 1, side, xStart, xEnd });
  };

  const addTopPair = (p) => {
    const xStart = rev ? (slotL - (p + 1.5) * D) : ((p + 0.5) * D);
    const xEnd   = rev ? (slotL - (p + 0.5) * D) : ((p + 1.5) * D);
    positions.push({ tier: 2, row: 0, side, xStart, xEnd });
    positions.push({ tier: 2, row: 1, side, xStart, xEnd });
  };

  if (spec.basePairs >= 1) addBottomPair(0);
  if (spec.basePairs >= 2) addBottomPair(1);
  if (spec.topPairs >= 1)  addTopPair(0);

  for (let p = 2; p < spec.basePairs; p++) {
    addBottomPair(p);
    if (p - 1 < spec.topPairs) {
      addTopPair(p - 1);
    }
  }

  return positions;
}

function getSlotOccupiedBounds(slot) {
  let leftLen = 0;
  let rightLen = 0;
  let hasLeft = false;
  let hasRight = false;

  (slot.coils || []).forEach(c => {
    if (c.side === 'right') {
      hasRight = true;
      rightLen = Math.max(rightLen, 20.0 - c.xStart);
    } else {
      hasLeft = true;
      leftLen = Math.max(leftLen, c.xEnd);
    }
  });

  return { hasLeft, hasRight, leftLen, rightLen, isEmpty: !hasLeft && !hasRight };
}

function getTailLengthMeters(spec, count) {
  if (count <= 0) return 0;
  const pos = buildSlotPositions(spec, 'left').slice(0, count);
  return pos.reduce((max, p) => Math.max(max, p.xEnd), 0);
}

function findZonePlacementPlan(zone, weight, requestedCount, maxTiers = 2) {
  const spec = getEffectiveSpec(weight, maxTiers);
  const fullSlotsNeeded = Math.floor(requestedCount / spec.capacity);
  const tailCount = requestedCount % spec.capacity;
  const totalSlotsNeeded = fullSlotsNeeded + (tailCount > 0 ? 1 : 0);
  const tailLen = getTailLengthMeters(spec, tailCount);
  const minGap = 2 * spec.diameter;

  const route = getSnakeRoute(zone);
  const N = route.length;

  const sharedCandidates = [];
  const pureEmptyCandidates = [];

  // 1. Прямой ход по вертикальной змейке
  for (let s = 0; s <= N - totalSlotsNeeded; s++) {
    let ok = true;
    const steps = [];

    for (let k = 0; k < fullSlotsNeeded; k++) {
      const node = route[s + k];
      const b = getSlotOccupiedBounds(zone.slots[node.slotIdx]);
      if (!b.isEmpty) { ok = false; break; }
      steps.push({ slotIdx: node.slotIdx, side: node.entrySide, count: spec.capacity });
    }
    if (!ok) continue;

    if (tailCount > 0) {
      const tailNode = route[s + fullSlotsNeeded];
      const b = getSlotOccupiedBounds(zone.slots[tailNode.slotIdx]);
      const side = tailNode.entrySide;

      if (b.isEmpty) {
        steps.push({ slotIdx: tailNode.slotIdx, side, count: tailCount });
        pureEmptyCandidates.push({ steps, shared: false });
      } else if (side === 'left' && !b.hasLeft && b.hasRight && (tailLen + minGap + b.rightLen <= 20.001)) {
        steps.push({ slotIdx: tailNode.slotIdx, side: 'left', count: tailCount });
        sharedCandidates.push({ steps, shared: true });
      } else if (side === 'right' && !b.hasRight && b.hasLeft && (b.leftLen + minGap + tailLen <= 20.001)) {
        steps.push({ slotIdx: tailNode.slotIdx, side: 'right', count: tailCount });
        sharedCandidates.push({ steps, shared: true });
      }
    } else {
      pureEmptyCandidates.push({ steps, shared: false });
    }
  }

  // 2. Встречный ход по вертикальной змейке (для стыковки хвостов в общем слоте)
  if (tailCount > 0) {
    for (let s = totalSlotsNeeded - 1; s < N; s++) {
      let ok = true;
      const steps = [];

      for (let k = 0; k < fullSlotsNeeded; k++) {
        const node = route[s - k];
        const b = getSlotOccupiedBounds(zone.slots[node.slotIdx]);
        if (!b.isEmpty) { ok = false; break; }
        steps.push({ slotIdx: node.slotIdx, side: node.exitSide, count: spec.capacity });
      }
      if (!ok) continue;

      const tailNode = route[s - fullSlotsNeeded];
      const b = getSlotOccupiedBounds(zone.slots[tailNode.slotIdx]);
      const side = tailNode.exitSide;

      if (side === 'left' && !b.hasLeft && b.hasRight && (tailLen + minGap + b.rightLen <= 20.001)) {
        steps.push({ slotIdx: tailNode.slotIdx, side: 'left', count: tailCount });
        sharedCandidates.push({ steps, shared: true });
      } else if (side === 'right' && !b.hasRight && b.hasLeft && (b.leftLen + minGap + tailLen <= 20.001)) {
        steps.push({ slotIdx: tailNode.slotIdx, side: 'right', count: tailCount });
        sharedCandidates.push({ steps, shared: true });
      }
    }
  }

  if (sharedCandidates.length > 0) return sharedCandidates.at(0);
  if (pureEmptyCandidates.length > 0) return pureEmptyCandidates.at(0);
  return null;
}

function pickDistinctBatchColor(state, batchId) {
  const usedColors = new Set(state.batches.map(b => b.color));
  const lastColor = state.batches.length > 0 ? state.batches.at(-1).color : null;
  const unused = BATCH_COLORS.filter(c => !usedColors.has(c));
  if (unused.length > 0) return unused[(batchId - 1) % unused.length];
  const diff = BATCH_COLORS.filter(c => c !== lastColor);
  return diff[(batchId - 1) % diff.length];
}

function placeBatchNoSplit(state, preferredZoneId, weight, requestedCount, customBatchId, maxTiers = 2) {
  const orderedZones = [];
  const primary = state.zones.find(z => z.id === preferredZoneId);
  if (primary) orderedZones.push(primary);
  state.zones.forEach(z => { if (z.id !== preferredZoneId) orderedZones.push(z); });

  let targetZone = null;
  let chosenPlan = null;

  for (const z of orderedZones) {
    const plan = findZonePlacementPlan(z, weight, requestedCount, maxTiers);
    if (plan) {
      targetZone = z;
      chosenPlan = plan;
      break;
    }
  }

  if (!targetZone || !chosenPlan) {
    return { ok: false, reason: 'NO_CONTIGUOUS_SPACE' };
  }

  const maxActiveId = state.batches.reduce((max, b) => Math.max(max, b.id), 0);
  const currentMaxId = Math.max(state.lastBatchId || 0, maxActiveId);
  const batchId = customBatchId && customBatchId > 0 ? customBatchId : currentMaxId + 1;
  if (state.batches.some(b => b.id === batchId)) {
return { ok: true, zoneId: targetZone.id };
}
state.lastBatchId = Math.max(currentMaxId, batchId);
const color = pickDistinctBatchColor(state, batchId);
const spec = getEffectiveSpec(weight, maxTiers);
const touchedSlots = [];
chosenPlan.steps.forEach(step => {
const slot = targetZone.slots[step.slotIdx];
if (!slot.coils) slot.coils = [];
if (!slot.rollWeight) slot.rollWeight = weight;
slot.capacity = spec.capacity;
const positions = buildSlotPositions(spec, step.side);
for (let k = 0; k < step.count; k++) {
const pos = positions[k];
slot.coils.push({
batchId: batchId,
color: color,
weight: weight,
tier: pos.tier,
row: pos.row,
side: step.side,
xStart: pos.xStart,
xEnd: pos.xEnd
});
}
touchedSlots.push(`#${step.slotIdx + 1}`);
});
state.activeZoneId = targetZone.id;
state.batches.push({
id: batchId,
zoneId: targetZone.id,
zoneName: targetZone.name,
weight: weight,
tiers: maxTiers,
requested: requestedCount,
placed: requestedCount,
color: color,
slotsList: touchedSlots
});
return {
ok: true,
zoneId: targetZone.id,
relocated: targetZone.id !== preferredZoneId,
shared: chosenPlan.shared
};
}
function shipBatchFromStorage(state, batchId) {
const batchIdx = state.batches.findIndex(b => b.id === batchId);
if (batchIdx === -1) return null;
const shipped = state.batches[batchIdx];
const zone = state.zones.find(z => z.id === shipped.zoneId);
if (zone) {
zone.slots.forEach(slot => {
if (slot.coils && slot.coils.some(c => c.batchId === batchId)) {
slot.coils = slot.coils.filter(c => c.batchId !== batchId);
if (slot.coils.length === 0) {
slot.rollWeight = null;
slot.capacity = 0;
} else {
const remWeight = slot.coils.at(0).weight;
slot.rollWeight = remWeight;
slot.capacity = (ROLL_SPECS[remWeight] || ROLL_SPECS).capacity;
}
}
});
}
state.batches.splice(batchIdx, 1);
return shipped;
}
