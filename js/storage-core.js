const STORAGE_KEY = 'coil_storage_state_v3';

const BATCH_COLORS = [
  '#4dabf7', '#51cf66', '#fcc419', '#ff8787',
  '#b197fc', '#3bc9db', '#ffa94d', '#a9e34b',
  '#f783ac', '#63e6be', '#748ffc', '#ffd43b',
  '#ff922b', '#20c997', '#da77f2', '#94d82d'
];

function pickDistinctBatchColor(state, batchId) {
  const usedColors = new Set(state.batches.map(b => b.color));
  const lastBatchColor = state.batches.length > 0 ? state.batches[state.batches.length - 1].color : null;

  // 1. Сначала ищем цвет из палитры, которого вообще нет сейчас на складе
  const unused = BATCH_COLORS.filter(c => !usedColors.has(c));
  if (unused.length > 0) {
    return unused[(batchId - 1) % unused.length];
  }

  // 2. Если на складе одновременно > 16 партий, берём любой цвет, отличный от цвета предыдущей партии
  const notSameAsLast = BATCH_COLORS.filter(c => c !== lastBatchColor);
  return notSameAsLast[(batchId - 1) % notSameAsLast.length];
}

const ROLL_SPECS = {
  8: { weight: 8, diameter: 1.4, width: 1.25, basePairs: 14, topPairs: 13, capacity: 54 },
  15: { weight: 15, diameter: 1.8, width: 1.50, basePairs: 11, topPairs: 10, capacity: 42 }
};

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
    batches: [], // { id, zoneId, zoneName, weight, requested, placed, color, slotsList }
    zones: [
      createZoneObj(1, 'Площадка 1', 5, 3),
      createZoneObj(2, 'Площадка 2', 3, 3)
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
  const hasCargo = zone.slots.some(s => s.coils && s.coils.length > 0);
  if (hasCargo) return;
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

// Возвращает массив индексов слотов в порядке обхода «змейкой»
function getSnakeSlotIndices(zone) {
  const indices = [];
  for (let r = 0; r < zone.slotsY; r++) {
    if (r % 2 === 0) {
      // Чётный ряд (0, 2, ...): слева направо
      for (let c = 0; c < zone.slotsX; c++) {
        indices.push(r * zone.slotsX + c);
      }
    } else {
      // Нечётный ряд (1, 3, ...): справа налево
      for (let c = zone.slotsX - 1; c >= 0; c--) {
        indices.push(r * zone.slotsX + c);
      }
    }
  }
  return indices;
}


function buildSlotPositions(spec, reverse = false) {
  const positions = [];
  const D = spec.diameter;
  const slotL = 20.0;

  // 1-й ярус
  for (let p = 0; p < spec.basePairs; p++) {
    const xStart = reverse ? (slotL - (p + 1) * D) : (p * D);
    const xEnd = reverse ? (slotL - p * D) : ((p + 1) * D);
    for (let row = 0; row < 2; row++) {
      positions.push({ tier: 1, pairIdx: p, row: row, xStart: xStart, xEnd: xEnd });
    }
  }

  // 2-й ярус (в ложбины)
  for (let p = 0; p < spec.topPairs; p++) {
    const xStart = reverse ? (slotL - (p + 1.5) * D) : ((p + 0.5) * D);
    const xEnd = reverse ? (slotL - (p + 0.5) * D) : ((p + 1.5) * D);
    for (let row = 0; row < 2; row++) {
      positions.push({ tier: 2, pairIdx: p, row: row, xStart: xStart, xEnd: xEnd });
    }
  }

  return positions;
}

// Ищет первый непрерывный участок из neededSlots свободных слотов по маршруту «змейки».
// Возвращает массив индексов слотов или null, если непрерывного места нет.
function findContiguousFreeSlots(zone, neededSlots) {
  if (neededSlots <= 0) return [];
  const snakeIndices = getSnakeSlotIndices(zone);
  let run = [];

  for (let step = 0; step < snakeIndices.length; step++) {
    const idx = snakeIndices[step];
    const slot = zone.slots[idx];
    const isFree = !slot.coils || slot.coils.length === 0;

    if (isFree) {
      run.push(idx);
      if (run.length === neededSlots) {
        return run;
      }
    } else {
      // Наткнулись на занятый слот — сбрасываем счётчик непрерывного участка
      run = [];
    }
  }

  return null;
}

// Возвращает размер самого большого непрерывного свободного участка на площадке (в слотах)
function getMaxContiguousFreeSlots(zone) {
  const snakeIndices = getSnakeSlotIndices(zone);
  let maxRun = 0;
  let currentRun = 0;

  for (let step = 0; step < snakeIndices.length; step++) {
    const slot = zone.slots[snakeIndices[step]];
    if (!slot.coils || slot.coils.length === 0) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}


// Размещение партии БЕЗ РАЗРЫВА, начиная поиск с preferredZoneId
function placeBatchNoSplit(state, preferredZoneId, weight, requestedCount, customBatchId) {
  const spec = ROLL_SPECS[weight] || ROLL_SPECS;
  const neededSlots = Math.ceil(requestedCount / spec.capacity);

  const orderedZones = [];
  const primary = state.zones.find(z => z.id === preferredZoneId);
  if (primary) orderedZones.push(primary);
  state.zones.forEach(z => {
    if (z.id !== preferredZoneId) orderedZones.push(z);
  });

  // Ищем первую площадку, где есть НЕПРЕРЫВНЫЙ блок из neededSlots слотов
  let targetZone = null;
  let targetSlotIndices = null;

  for (const z of orderedZones) {
    const contiguous = findContiguousFreeSlots(z, neededSlots);
    if (contiguous) {
      targetZone = z;
      targetSlotIndices = contiguous;
      break;
    }
  }

  if (!targetZone || !targetSlotIndices) {
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

  let remaining = requestedCount;
  const touchedSlots = [];

  for (let step = 0; step < targetSlotIndices.length; step++) {
    if (remaining <= 0) break;
    const i = targetSlotIndices[step];
    const slot = targetZone.slots[i];

    const rowIdx = Math.floor(i / targetZone.slotsX);
    const isReverse = rowIdx % 2 === 1;
    const slotPositions = buildSlotPositions(spec, isReverse);

    slot.rollWeight = weight;
    slot.capacity = spec.capacity;
    slot.isReverse = isReverse;
    slot.coils = [];

    const toPlace = Math.min(remaining, spec.capacity);
    for (let k = 0; k < toPlace; k++) {
      const pos = slotPositions[k];
      slot.coils.push({
        batchId: batchId,
        color: color,
        weight: weight,
        tier: pos.tier,
        row: pos.row,
        xStart: pos.xStart,
        xEnd: pos.xEnd
      });
    }

    remaining -= toPlace;
    touchedSlots.push(`#${i + 1}`);
  }

  state.activeZoneId = targetZone.id;
  state.batches.push({
    id: batchId,
    zoneId: targetZone.id,
    zoneName: targetZone.name,
    weight: weight,
    requested: requestedCount,
    placed: requestedCount,
    color: color,
    slotsList: touchedSlots
  });

  return {
    ok: true,
    zoneId: targetZone.id,
    relocated: targetZone.id !== preferredZoneId
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
        slot.coils = [];
        slot.rollWeight = null;
        slot.capacity = 0;
      }
    });
  }

  state.batches.splice(batchIdx, 1);
  return shipped;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Отрисовка конкретной площадки (zoneObj)
function renderZoneCanvas(canvasId, zoneObj, options = {}) {
  if (options.compact) {
    renderFlatZonePreview(canvasId, zoneObj, options);
  } else {
    renderIsometricZone(canvasId, zoneObj);
  }
}

function renderFlatZonePreview(canvasId, zone, options) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sx = zone.slotsX;
  const sy = zone.slotsY;
  const slotL = 20.0;
  const slotW = 3.6;
  const gapY = 1.0;
  const totalL = sx * slotL;
  const totalW = sy * slotW + (sy - 1) * gapY;

  const pad = options.pad || 12;
  const scale = Math.min((canvas.width - pad * 2) / totalL, (canvas.height - pad * 2) / totalW);
  const drawW = totalL * scale;
  const drawH = totalW * scale;
  const offsetX = (canvas.width - drawW) / 2;
  const offsetY = (canvas.height - drawH) / 2;

  ctx.strokeStyle = '#8c959f';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(offsetX - 4, offsetY - 4, drawW + 8, drawH + 8);

  for (let r = 0; r < sy; r++) {
    for (let c = 0; c < sx; c++) {
      const idx = r * sx + c;
      const slot = zone.slots ? zone.slots[idx] : null;
      const x = offsetX + (c * slotL) * scale;
      const y = offsetY + (r * (slotW + gapY)) * scale;
      const w = slotL * scale;
      const h = slotW * scale;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);

      if (slot && slot.coils && slot.coils.length > 0) {
        const fillRatio = slot.coils.length / slot.capacity;
        const fillW = w * fillRatio;
        const isReverse = slot.isReverse !== undefined ? slot.isReverse : (r % 2 === 1);
        const fillX = isReverse ? (x + w - fillW) : x;

        ctx.fillStyle = slot.coils[0].color;
        ctx.fillRect(fillX, y, fillW, h);
      }

      ctx.strokeStyle = '#57606a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Подпись номера слота и % заполнения
      ctx.fillStyle = '#1f2328';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const filledCount = slot && slot.coils ? slot.coils.length : 0;
      const slotLabel = filledCount > 0 ? `#${idx + 1} (${Math.round((filledCount / slot.capacity) * 100)}%)` : `#${idx + 1}`;
      if (w > 34 && h > 14) {
        ctx.fillText(slotLabel, x + w / 2, y + h / 2);
      }
    }
  }
}


function renderIsometricZone(canvasId, zone) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (canvas.height < 480) canvas.height = 480;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sx = zone.slotsX, sy = zone.slotsY;
  const slotL = 20.0, slotW = 3.6, gapY = 1.0;
  const totalL = sx * slotL;
  const totalW = sy * slotW + (sy - 1) * gapY;

  const ux = { x: 0.90, y: -0.26 };
  const uy = { x: 0.42, y: 0.56 };
  const uz = { x: 0.0,  y: -1.0 };

  const corners = [
    { x: 0, y: 0, z: 0 }, { x: totalL, y: 0, z: 0 },
    { x: 0, y: totalW, z: 0 }, { x: totalL, y: totalW, z: 0 },
    { x: 0, y: 0, z: 4.5 }, { x: totalL, y: 0, z: 4.5 }
  ];

  let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
  corners.forEach(p => {
    const px = p.x * ux.x + p.y * uy.x + p.z * uz.x;
    const py = p.x * ux.y + p.y * uy.y + p.z * uz.y;
    if (px < minPx) minPx = px;
    if (px > maxPx) maxPx = px;
    if (py < minPy) minPy = py;
    if (py > maxPy) maxPy = py;
  });

  const pad = 32;
  const scale = Math.min((canvas.width - pad * 2) / (maxPx - minPx), (canvas.height - pad * 2) / (maxPy - minPy));
  const originX = pad - minPx * scale + (canvas.width - pad * 2 - (maxPx - minPx) * scale) / 2;
  const originY = pad - minPy * scale + (canvas.height - pad * 2 - (maxPy - minPy) * scale) / 2;

  const toScreen = (x, y, z = 0) => ({
    x: originX + (x * ux.x + y * uy.x + z * uz.x) * scale,
    y: originY + (x * ux.y + y * uy.y + z * uz.y) * scale
  });

  const p00 = toScreen(-1.5, -1.2, 0), p10 = toScreen(totalL + 1.5, -1.2, 0);
  const p11 = toScreen(totalL + 1.5, totalW + 1.2, 0), p01 = toScreen(-1.5, totalW + 1.2, 0);

  ctx.beginPath();
  ctx.moveTo(p00.x, p00.y); ctx.lineTo(p10.x, p10.y);
  ctx.lineTo(p11.x, p11.y); ctx.lineTo(p01.x, p01.y);
  ctx.closePath();
  ctx.fillStyle = '#eef1f4'; ctx.fill();
  ctx.strokeStyle = '#afb8c1'; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p01.x, p01.y); ctx.lineTo(p11.x, p11.y);
  ctx.lineTo(p11.x, p11.y + 8); ctx.lineTo(p01.x, p01.y + 8);
  ctx.closePath();
  ctx.fillStyle = '#d0d7de'; ctx.fill(); ctx.stroke();

  for (let r = 0; r < sy; r++) {
    for (let c = 0; c < sx; c++) {
      const idx = r * sx + c;
      const slot = zone.slots[idx];
      const x0 = c * slotL, y0 = r * (slotW + gapY);

      const s00 = toScreen(x0, y0, 0), s10 = toScreen(x0 + slotL, y0, 0);
      const s11 = toScreen(x0 + slotL, y0 + slotW, 0), s01 = toScreen(x0, y0 + slotW, 0);
	  ctx.beginPath();
ctx.moveTo(s00.x, s00.y); ctx.lineTo(s10.x, s10.y);
ctx.lineTo(s11.x, s11.y); ctx.lineTo(s01.x, s01.y);
ctx.closePath();
ctx.fillStyle = '#ffffff'; ctx.fill();
ctx.strokeStyle = '#8c959f'; ctx.lineWidth = 1.2; ctx.stroke();
const lblPos = toScreen(x0 + 1.2, y0 + slotW - 0.35, 0);
ctx.fillStyle = '#57606a'; ctx.font = 'bold 10px sans-serif';
ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
const filled = slot && slot.coils ? slot.coils.length : 0;
const cap = slot && slot.capacity ? slot.capacity : 0;
ctx.fillText(filled > 0 ? `#${idx + 1} (${filled}/${cap})` : `#${idx + 1}`, lblPos.x, lblPos.y);
if (slot && slot.coils && slot.coils.length > 0) {
const spec = ROLL_SPECS[slot.rollWeight] || ROLL_SPECS;
const R = spec.diameter / 2;
const rowGap = (slotW - spec.width * 2) / 3;
for (let row = 0; row < 2; row++) {
const yStart = y0 + rowGap + row * (spec.width + rowGap);
const yEnd = yStart + spec.width;
for (let tier = 1; tier <= 2; tier++) {
const zCenter = tier === 1 ? R : R * (1 + Math.sqrt(3));
const coilsInLayer = slot.coils
.filter(item => item.row === row && item.tier === tier)
.sort((a, b) => a.xStart - b.xStart);
coilsInLayer.forEach(coil => {
const xCenter = x0 + (coil.xStart + coil.xEnd) / 2;
drawIsoCoil(ctx, toScreen, xCenter, yStart, yEnd, zCenter, R, coil.color);
});
}
}
}
}
}
}
function drawIsoCoil(ctx, toScreen, xCenter, yBack, yFront, zCenter, R, baseColor) {
const steps = 22;
const backPts = [], frontPts = [];
for (let i = 0; i <= steps; i++) {
const theta = (i / steps) * Math.PI * 2;
const dx = Math.cos(theta) * R, dz = Math.sin(theta) * R;
backPts.push(toScreen(xCenter + dx, yBack, zCenter + dz));
frontPts.push(toScreen(xCenter + dx, yFront, zCenter + dz));
}
const startIdx = Math.floor(steps * 0.90), endIdx = Math.floor(steps * 0.45);
ctx.beginPath();
for (let i = 0; i <= endIdx; i++) i === 0 ? ctx.moveTo(frontPts[i].x, frontPts[i].y) : ctx.lineTo(frontPts[i].x, frontPts[i].y);
for (let i = endIdx; i >= 0; i--) ctx.lineTo(backPts[i].x, backPts[i].y);
for (let i = steps; i >= startIdx; i--) ctx.lineTo(backPts[i].x, backPts[i].y);
for (let i = startIdx; i <= steps; i++) ctx.lineTo(frontPts[i].x, frontPts[i].y);
ctx.closePath();
ctx.fillStyle = shadeColor(baseColor, -18); ctx.fill();
ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.8; ctx.stroke();
ctx.beginPath();
frontPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
ctx.closePath();
ctx.fillStyle = shadeColor(baseColor, 8); ctx.fill();
ctx.strokeStyle = '#1f2328'; ctx.lineWidth = 0.9; ctx.stroke();
const holeR = R * 0.34;
ctx.beginPath();
for (let i = 0; i <= 16; i++) {
const theta = (i / 16) * Math.PI * 2;
const p = toScreen(xCenter + Math.cos(theta) * holeR, yFront, zCenter + Math.sin(theta) * holeR);
i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
}
ctx.closePath();
ctx.fillStyle = '#32383f'; ctx.fill();
}

