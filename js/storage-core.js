// ============================================================================
// storage-core.js
// Модель площадки, размещение партий, динамический скоринг, симулятор.
// Детерминирован: при одинаковом входе и seed — одинаковый результат.
// ============================================================================

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

// ============================================================================
// СКОРИНГ
// ============================================================================

// Веса динамического скоринга. Это главный объект исследования:
// меняйте и сравнивайте через runBatch(). Меньше score = лучше.
const SCORE_WEIGHTS = {
  fragmentation:  800,   // штраф за каждый остров свободного места
  largestBlock:  -600,   // поощрение за большой максимальный свободный блок
  perimeter:      200,   // штраф за периметр кучи (снижен с 1000)
  boundaryContact: -1,   // поощрение за прилегание к границе площадки
  edgeDistance:   1.5,   // штраф за удалённость от края/угла
};

// Старая формула — для baseline-сравнения.
const LEGACY_SCORE_WEIGHTS = {
  perimeter: 1000,
  islands:    500,
  contact:     -1,
};

// Переключатели. Управляются извне (batch, консоль, UI).
let USE_LEGACY_SCORING = false;
let PLACEMENT_ALGORITHM = 'compact'; // 'compact' | 'snake'

// Прилегание ТОЛЬКО к границе площадки (стабильный сигнал).
// Занятые слоты не считаем: они могут освободиться.
function calcBoundaryContactOnly(zone, slotIndices) {
  let contact = 0;
  slotIndices.forEach(idx => {
    const r = Math.floor(idx / zone.slotsX);
    const c = idx % zone.slotsX;
    if (r === 0 || r === zone.slotsY - 1) contact++;
    if (c === 0 || c === zone.slotsX - 1) contact++;
  });
  return contact;
}

// Старая версия contact: граница + прилегание к занятым слотам.
// Оставлена для baseline. В новом скоринге НЕ используется.
function calcBoundaryContactScoreLegacy(zone, slotIndices) {
  const set = new Set(slotIndices);
  let contact = 0;
  slotIndices.forEach(idx => {
    const r = Math.floor(idx / zone.slotsX);
    const c = idx % zone.slotsX;
    if (r === 0 || r === zone.slotsY - 1) contact++;
    if (c === 0 || c === zone.slotsX - 1) contact++;
    getNeighborSlotIndices(zone, idx).forEach(nb => {
      if (!set.has(nb) && !getSlotOccupiedBounds(zone.slots[nb]).isEmpty) contact++;
    });
  });
  return contact;
}

// Размер самого большого непрерывного свободного блока ПОСЛЕ размещения кластера.
// Ключевая метрика динамики: если он меньше типичной партии — площадка «мертва».
function calcLargestFreeBlockAfter(zone, usedSlotIndices) {
  const usedSet = new Set(usedSlotIndices);
  const visited = new Set();
  let largest = 0;

  for (let i = 0; i < zone.slots.length; i++) {
    if (usedSet.has(i) || visited.has(i)) continue;
    if (!getSlotOccupiedBounds(zone.slots[i]).isEmpty) continue;

    let size = 0;
    const queue = [i];
    visited.add(i);
    while (queue.length > 0) {
      const curr = queue.shift();
      size++;
      getNeighborSlotIndices(zone, curr).forEach(nb => {
        if (!usedSet.has(nb) && !visited.has(nb) &&
            getSlotOccupiedBounds(zone.slots[nb]).isEmpty) {
          visited.add(nb);
          queue.push(nb);
        }
      });
    }
    if (size > largest) largest = size;
  }
  return largest;
}

// Расстояние от центра кучи до ближайшего края площадки (в слотах).
// Поощряем прижатие к краю: оставляем большой непрерывный блок в центре.
function calcClusterEdgeDistance(zone, slotIndices) {
  if (slotIndices.length === 0) return 0;
  let sumR = 0, sumC = 0;
  slotIndices.forEach(idx => {
    sumR += Math.floor(idx / zone.slotsX);
    sumC += idx % zone.slotsX;
  });
  const avgR = sumR / slotIndices.length;
  const avgC = sumC / slotIndices.length;
  const dR = Math.min(avgR, zone.slotsY - 1 - avgR);
  const dC = Math.min(avgC, zone.slotsX - 1 - avgC);
  return Math.min(dR, dC);
}

// Единая функция скоринга. Меньше = лучше.
function scoreClusterDynamic(zone, slotIndices, weights = SCORE_WEIGHTS) {
  const perim = calcClusterPerimeter(zone, slotIndices);
  const islands = countRemainingFreeIslands(zone, slotIndices);
  const contact = calcBoundaryContactOnly(zone, slotIndices);
  const largest = calcLargestFreeBlockAfter(zone, slotIndices);
  const edgeDist = calcClusterEdgeDistance(zone, slotIndices);

  return (
    weights.fragmentation * islands +
    weights.largestBlock * largest +
    weights.perimeter * perim +
    weights.boundaryContact * contact +
    weights.edgeDistance * edgeDist
  );
}

function scoreClusterLegacy(zone, slotIndices) {
  const perim = calcClusterPerimeter(zone, slotIndices);
  const contact = calcBoundaryContactScoreLegacy(zone, slotIndices);
  const islands = countRemainingFreeIslands(zone, slotIndices);
  return (
    LEGACY_SCORE_WEIGHTS.perimeter * perim +
    LEGACY_SCORE_WEIGHTS.islands * islands +
    LEGACY_SCORE_WEIGHTS.contact * contact
  );
}

// Диспетчер: выбирает старый или новый скоринг.
function scoreCluster(zone, slotIndices) {
  return USE_LEGACY_SCORING
    ? scoreClusterLegacy(zone, slotIndices)
    : scoreClusterDynamic(zone, slotIndices);
}

// ============================================================================
// МОДЕЛЬ ДАННЫХ
// ============================================================================

function getEffectiveSpec(weight, maxTiers = 2) {
  const base = ROLL_SPECS[weight] || ROLL_SPECS[8];
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
    id, name, slotsX, slotsY,
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

// ============================================================================
// ГЕОМЕТРИЯ
// ============================================================================

// Маршрут слотов вертикальной «змейкой» (сверху вниз по колонкам)
function getSnakeRoute(zone) {
  const route = [];
  for (let c = 0; c < zone.slotsX; c++) {
    if (c % 2 === 0) {
      for (let r = 0; r < zone.slotsY; r++) route.push(r * zone.slotsX + c);
    } else {
      for (let r = zone.slotsY - 1; r >= 0; r--) route.push(r * zone.slotsX + c);
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
    if (p - 1 < spec.topPairs) addTopPair(p - 1);
  }

  return positions;
}

function getSlotOccupiedBounds(slot) {
  let leftLen = 0, rightLen = 0;
  let hasLeft = false, hasRight = false;

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

function getNeighborSlotIndices(zone, idx) {
  const r = Math.floor(idx / zone.slotsX);
  const c = idx % zone.slotsX;
  const neighbors = [];
  if (r + 1 < zone.slotsY) neighbors.push((r + 1) * zone.slotsX + c);
  if (r - 1 >= 0)          neighbors.push((r - 1) * zone.slotsX + c);
  if (c + 1 < zone.slotsX) neighbors.push(r * zone.slotsX + (c + 1));
  if (c - 1 >= 0)          neighbors.push(r * zone.slotsX + (c - 1));
  return neighbors;
}

function calcClusterPerimeter(zone, slotIndices) {
  const set = new Set(slotIndices);
  let sharedEdges = 0;
  slotIndices.forEach(idx => {
    getNeighborSlotIndices(zone, idx).forEach(nb => {
      if (set.has(nb)) sharedEdges++;
    });
  });
  return 4 * slotIndices.length - sharedEdges;
}

function countRemainingFreeIslands(zone, usedSlotIndices) {
  const usedSet = new Set(usedSlotIndices);
  const visited = new Set();
  let islands = 0;

  for (let i = 0; i < zone.slots.length; i++) {
    if (usedSet.has(i) || visited.has(i)) continue;
    if (!getSlotOccupiedBounds(zone.slots[i]).isEmpty) continue;

    islands++;
    const queue = [i];
    visited.add(i);
    while (queue.length > 0) {
      const curr = queue.shift();
      getNeighborSlotIndices(zone, curr).forEach(nb => {
        if (!usedSet.has(nb) && !visited.has(nb) &&
            getSlotOccupiedBounds(zone.slots[nb]).isEmpty) {
          visited.add(nb);
          queue.push(nb);
        }
      });
    }
  }
  return islands;
}

// ============================================================================
// КЛАСТЕРЫ
// ============================================================================

// Жадное расширение ядра: на каждом шаге присоединяем соседний свободный слот
// с минимальным приростом периметра, при равенстве — с максимальным contact.
// Детерминирован: порядок frontier — порядок вставки (List, не HashSet).
function findCompactClusterFrom(zone, startIdx, neededCount, forbiddenIdx = -1) {
  if (neededCount <= 0) return [];
  if (startIdx === forbiddenIdx || !getSlotOccupiedBounds(zone.slots[startIdx]).isEmpty) return null;

  const chosen = [startIdx];
  const chosenSet = new Set([startIdx]);

  while (chosen.length < neededCount) {
    const frontier = new Set();
    chosen.forEach(idx => {
      getNeighborSlotIndices(zone, idx).forEach(nb => {
        if (nb !== forbiddenIdx && !chosenSet.has(nb) &&
            getSlotOccupiedBounds(zone.slots[nb]).isEmpty) {
          frontier.add(nb);
        }
      });
    });

    if (frontier.size === 0) return null;

    let bestCandidate = -1;
    let bestPerim = Infinity;
    let bestContact = -1;

    frontier.forEach(cand => {
      const testGroup = [...chosen, cand];
      const perim = calcClusterPerimeter(zone, testGroup);
      const contact = calcBoundaryContactOnly(zone, testGroup);
      if (perim < bestPerim || (perim === bestPerim && contact > bestContact)) {
        bestPerim = perim;
        bestContact = contact;
        bestCandidate = cand;
      }
    });

    chosen.push(bestCandidate);
    chosenSet.add(bestCandidate);
  }

  return chosen;
}

// Упорядочивает слоты кластера так, чтобы последний слот (под хвост)
// находился на краю кучи. Приоритет: примыкание к уже занятым (чтобы хвост
// лег в существующий слот вроде 24-го), затем края площадки, затем углы.
function orderClusterForTail(zone, cluster, tailSlotMustBeNextTo = -1) {
  if (cluster.length <= 1) return cluster;
  const set = new Set(cluster);

  // Если хвост должен примыкать к конкретному слоту (при встречной стыковке),
  // ставим этот слот в конец.
  if (tailSlotMustBeNextTo !== -1) {
    const adj = cluster.find(idx =>
      getNeighborSlotIndices(zone, idx).includes(tailSlotMustBeNextTo));
    if (adj !== undefined) {
      return [...cluster.filter(x => x !== adj), adj];
    }
  }

  // Оцениваем каждый слот кластера как кандидата на "хвост".
  let bestTailIdx = cluster[cluster.length - 1];
  let bestScore = -Infinity;

  cluster.forEach(idx => {
    let score = 0;

    // 1. Примыкание к уже занятым слотам (самый важный фактор)
    const neighbors = getNeighborSlotIndices(zone, idx);
    let occupiedNeighbors = 0;
    neighbors.forEach(nb => {
      const b = getSlotOccupiedBounds(zone.slots[nb]);
      if (!b.isEmpty) occupiedNeighbors++;
    });
    score += occupiedNeighbors * 100;

    // 2. Примыкание к краю площадки
    const r = Math.floor(idx / zone.slotsX);
    const c = idx % zone.slotsX;
    if (r === 0 || r === zone.slotsY - 1) score += 10;
    if (c === 0 || c === zone.slotsX - 1) score += 10;

    // 3. Внутренняя степень (количество соседей внутри кластера) —
    // чем меньше, тем лучше для хвоста (он не должен разрывать кучу)
    const internalDeg = neighbors.filter(nb => set.has(nb)).length;
    score -= internalDeg * 5;

    if (score > bestScore) {
      bestScore = score;
      bestTailIdx = idx;
    }
  });

  return [...cluster.filter(x => x !== bestTailIdx), bestTailIdx];
}


// ============================================================================
// ПЛАНИРОВЩИК: компактная куча (актуальный алгоритм)
// ============================================================================

function findZonePlacementPlanCompact(zone, weight, requestedCount, maxTiers = 2) {
  const spec = getEffectiveSpec(weight, maxTiers);
  const fullSlotsNeeded = Math.floor(requestedCount / spec.capacity);
  const tailCount = requestedCount % spec.capacity;
  const totalSlotsNeeded = fullSlotsNeeded + (tailCount > 0 ? 1 : 0);
  const tailLen = getTailLengthMeters(spec, tailCount);
  const minGap = 2 * spec.diameter;

  const allIndices = Array.from({ length: zone.slots.length }, (_, i) => i);

  // Вспомогательная функция: определяет, с какой стороны (left/right) класть хвост.
    function determineTailSide(tailIdx, clusterSet) {
    const tR = Math.floor(tailIdx / zone.slotsX);
    const tC = tailIdx % zone.slotsX;

    // Смотрим только на торцевых соседей (слева и справа)
    const leftIdx = (tC > 0) ? (tR * zone.slotsX + (tC - 1)) : -1;
    const rightIdx = (tC < zone.slotsX - 1) ? (tR * zone.slotsX + (tC + 1)) : -1;

    let hasClusterLeft = false;
    let hasClusterRight = false;

    // Проверяем, входит ли левый сосед в нашу кучу (в текущую планируемую партию)
    if (leftIdx !== -1 && clusterSet.has(leftIdx)) {
      hasClusterLeft = true;
    }

    // Проверяем, входит ли правый сосед в нашу кучу
    if (rightIdx !== -1 && clusterSet.has(rightIdx)) {
      hasClusterRight = true;
    }

    // Если слот частично занят, свободная сторона имеет приоритет
    const bTail = getSlotOccupiedBounds(zone.slots[tailIdx]);
    if (bTail.hasLeft && !bTail.hasRight) {
      return 'right'; // занято слева -> кладём справа
    }
    if (bTail.hasRight && !bTail.hasLeft) {
      return 'left';  // занято справа -> кладём слева
    }

    // Слот полностью пуст. Ищем контакт только с НАШЕЙ кучей.
    if (hasClusterLeft && !hasClusterRight) return 'left';
    if (hasClusterRight && !hasClusterLeft) return 'right';
    
    // Если куча сверху/снизу или контактов нет — по умолчанию слева.
    return 'left';
  }

  // 1. Встречная стыковка хвостом в неполный слот + компактная куча
  if (tailCount > 0) {
    let bestShared = null;
    let bestScore = Infinity;

    for (const tailSlotIdx of allIndices) {
      const b = getSlotOccupiedBounds(zone.slots[tailSlotIdx]);
      if (!b.hasLeft || b.hasRight) continue;
      if (b.leftLen + minGap + tailLen > 20.001) continue;

      if (fullSlotsNeeded === 0) {
        return {
          steps: [{ slotIdx: tailSlotIdx, side: 'right', count: tailCount }],
          shared: true
        };
      }

      const adjNeighbors = getNeighborSlotIndices(zone, tailSlotIdx);
      for (const adj of adjNeighbors) {
        const cluster = findCompactClusterFrom(zone, adj, fullSlotsNeeded, tailSlotIdx);
        if (cluster) {
          const fullWithTail = [...cluster, tailSlotIdx];
          const score = scoreCluster(zone, fullWithTail);
          if (score < bestScore) {
            bestScore = score;
            const orderedFull = orderClusterForTail(zone, cluster, tailSlotIdx);
            const steps = orderedFull.map(idx => ({
              slotIdx: idx, side: 'left', count: spec.capacity
            }));
            steps.push({ slotIdx: tailSlotIdx, side: 'right', count: tailCount });
            bestShared = { steps, shared: true };
          }
        }
      }
    }

    if (bestShared) return bestShared;
  }

  // 2. Самый компактный кластер из totalSlotsNeeded пустых слотов
  let bestPure = null;
  let bestPureScore = Infinity;

  for (const startIdx of allIndices) {
    const cluster = findCompactClusterFrom(zone, startIdx, totalSlotsNeeded);
    if (!cluster) continue;

    const score = scoreCluster(zone, cluster);
    if (score < bestPureScore) {
      bestPureScore = score;
      const ordered = orderClusterForTail(zone, cluster);
      const steps = [];
      
      // Полные слоты
      for (let k = 0; k < fullSlotsNeeded; k++) {
        steps.push({ slotIdx: ordered[k], side: 'left', count: spec.capacity });
      }
      
      // Хвостовой слот (если есть)
      if (tailCount > 0) {
        const tailIdx = ordered[fullSlotsNeeded];
        const clusterSet = new Set(ordered.slice(0, fullSlotsNeeded));
        const tailSide = determineTailSide(tailIdx, clusterSet);
        
        // ОТЛАДКА (можно убрать позже):
        console.log("=== ВЫБОР ХВОСТА ===");
        console.log("ordered:", ordered);
        console.log("fullSlotsNeeded:", fullSlotsNeeded);
        console.log("tailIdx (номер слота):", tailIdx + 1);
        console.log("clusterSet (номера):", Array.from(clusterSet).map(i => i + 1));
        console.log("Сосед слева:", (tailIdx % zone.slotsX > 0) ? tailIdx - 1 + 1 : "нет");
        console.log("Сосед справа:", (tailIdx % zone.slotsX < zone.slotsX - 1) ? tailIdx + 1 + 1 : "нет");
        console.log("Сторона хвоста:", tailSide);
        console.log("====================");

        steps.push({ slotIdx: tailIdx, side: tailSide, count: tailCount });
      }
      
      bestPure = { steps, shared: false };
    }
  }

  return bestPure;
}

// ============================================================================
// ПЛАНИРОВЩИК: змейка (baseline для сравнения)
// ============================================================================

function findZonePlacementPlanSnake(zone, weight, requestedCount, maxTiers = 2) {
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

  // 1. Полностью пустые слоты подряд по змейке
  for (let s = 0; s <= N - totalSlotsNeeded; s++) {
    let ok = true;
    const steps = [];

    for (let k = 0; k < fullSlotsNeeded; k++) {
      const slotIdx = route[s + k];
      if (!getSlotOccupiedBounds(zone.slots[slotIdx]).isEmpty) { ok = false; break; }
      steps.push({ slotIdx, side: 'left', count: spec.capacity });
    }
    if (!ok) continue;

    if (tailCount > 0) {
      const tailSlotIdx = route[s + fullSlotsNeeded];
      if (getSlotOccupiedBounds(zone.slots[tailSlotIdx]).isEmpty) {
        steps.push({ slotIdx: tailSlotIdx, side: 'left', count: tailCount });
        pureEmptyCandidates.push({ steps, shared: false });
      }
    } else {
      pureEmptyCandidates.push({ steps, shared: false });
    }
  }

  // 2. Встречная стыковка справа налево
  if (tailCount > 0) {
    for (let s = 0; s < N; s++) {
      const tailSlotIdx = route[s];
      const b = getSlotOccupiedBounds(zone.slots[tailSlotIdx]);
      if (!b.hasLeft || b.hasRight) continue;
      if (b.leftLen + minGap + tailLen > 20.001) continue;

      if (s - fullSlotsNeeded >= 0) {
        let okBefore = true;
        const stepsBefore = [];
        for (let k = fullSlotsNeeded; k >= 1; k--) {
          const slotIdx = route[s - k];
          if (!getSlotOccupiedBounds(zone.slots[slotIdx]).isEmpty) { okBefore = false; break; }
          stepsBefore.push({ slotIdx, side: 'left', count: spec.capacity });
        }
        if (okBefore) {
          stepsBefore.push({ slotIdx: tailSlotIdx, side: 'right', count: tailCount });
          sharedCandidates.push({ steps: stepsBefore, shared: true });
        }
      }

      if (s + fullSlotsNeeded < N) {
        let okAfter = true;
        const stepsAfter = [{ slotIdx: tailSlotIdx, side: 'right', count: tailCount }];
        for (let k = 1; k <= fullSlotsNeeded; k++) {
          const slotIdx = route[s + k];
          if (!getSlotOccupiedBounds(zone.slots[slotIdx]).isEmpty) { okAfter = false; break; }
          stepsAfter.push({ slotIdx, side: 'left', count: spec.capacity });
        }
        if (okAfter) sharedCandidates.push({ steps: stepsAfter, shared: true });
      }
    }
  }

  if (sharedCandidates.length > 0) return sharedCandidates[0];
  if (pureEmptyCandidates.length > 0) return pureEmptyCandidates[0];

  // 3. Резерв: непрерывный блок в одном горизонтальном ряду
  if (totalSlotsNeeded <= zone.slotsX) {
    for (let r = 0; r < zone.slotsY; r++) {
      for (let startC = 0; startC <= zone.slotsX - totalSlotsNeeded; startC++) {
        let ok = true;
        const steps = [];
        for (let k = 0; k < fullSlotsNeeded; k++) {
          const slotIdx = r * zone.slotsX + (startC + k);
          if (!getSlotOccupiedBounds(zone.slots[slotIdx]).isEmpty) { ok = false; break; }
          steps.push({ slotIdx, side: 'left', count: spec.capacity });
        }
        if (!ok) continue;
        if (tailCount > 0) {
          const tailSlotIdx = r * zone.slotsX + (startC + fullSlotsNeeded);
          if (!getSlotOccupiedBounds(zone.slots[tailSlotIdx]).isEmpty) continue;
          steps.push({ slotIdx: tailSlotIdx, side: 'left', count: tailCount });
        }
        return { steps, shared: false, endToEnd: true };
      }
    }
  }

  return null;
}

// Диспетчер планировщика. Управляется PLACEMENT_ALGORITHM.
function findZonePlacementPlan(zone, weight, requestedCount, maxTiers = 2) {
  return PLACEMENT_ALGORITHM === 'snake'
    ? findZonePlacementPlanSnake(zone, weight, requestedCount, maxTiers)
    : findZonePlacementPlanCompact(zone, weight, requestedCount, maxTiers);
}

// ============================================================================
// ПРИМЕНЕНИЕ ПЛАНА
// ============================================================================

function pickDistinctBatchColor(state, batchId) {
  const usedColors = new Set(state.batches.map(b => b.color));
  const lastColor = state.batches.length > 0 ? state.batches[state.batches.length - 1].color : null;
  const unused = BATCH_COLORS.filter(c => !usedColors.has(c));
  if (unused.length > 0) return unused[(batchId - 1) % unused.length];
  const diff = BATCH_COLORS.filter(c => c !== lastColor);
  return diff[(batchId - 1) % diff.length];
}

// Применяет готовый план к state. Чистая мутация, без поиска.
function applyPlanToState(state, targetZone, chosenPlan, weight, requestedCount, batchId, maxTiers) {
  const spec = getEffectiveSpec(weight, maxTiers);
  const color = pickDistinctBatchColor(state, batchId);
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
        batchId, color, weight,
        tier: pos.tier, row: pos.row, side: step.side,
        xStart: pos.xStart, xEnd: pos.xEnd
      });
    }
    touchedSlots.push(`#${step.slotIdx + 1}`);
  });

  state.activeZoneId = targetZone.id;
  state.batches.push({
    id: batchId,
    zoneId: targetZone.id,
    zoneName: targetZone.name,
    weight,
    tiers: maxTiers,
    requested: requestedCount,
    placed: requestedCount,
    color,
    slotsList: touchedSlots
  });
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
    if (plan) { targetZone = z; chosenPlan = plan; break; }
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

  applyPlanToState(state, targetZone, chosenPlan, weight, requestedCount, batchId, maxTiers);

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
          const remWeight = slot.coils[0].weight;
          slot.rollWeight = remWeight;
          slot.capacity = (ROLL_SPECS[remWeight] || ROLL_SPECS[8]).capacity;
        }
      }
    });
  }

  state.batches.splice(batchIdx, 1);
  return shipped;
}

// ============================================================================
// СИМУЛЯТОР ДИНАМИКИ
// ============================================================================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Один прогон: N шагов, на каждом — попытка разместить партию,
// затем с вероятностью releaseProb освобождаем случайную размещённую партию.
function simulateDynamic({
  zoneConfig,
  steps = 50,
  releaseProb = 0.3,
  weightPool = [8, 15, 1, 0.8],
  countRange = [5, 40],
  tiers = 2,
  seed = 42,
} = {}) {
  const rnd = mulberry32(seed);

  const zone = createZoneObj(1, 'Sim', zoneConfig.slotsX, zoneConfig.slotsY);
  const state = { activeZoneId: 1, lastBatchId: 0, batches: [], zones: [zone] };

  const metrics = {
    placed: 0, rejected: 0, totalPlacedCargo: 0,
    fragmentationSum: 0, largestBlockSum: 0, samples: 0,
    rejectReasons: [],
  };

  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  for (let step = 0; step < steps; step++) {
    const weight = pick(weightPool);
    const count = Math.floor(countRange[0] + rnd() * (countRange[1] - countRange[0] + 1));

    const res = placeBatchNoSplit(state, zone.id, weight, count, 0, tiers);

    if (res.ok) {
      metrics.placed++;
      metrics.totalPlacedCargo += count;
    } else {
      metrics.rejected++;
      metrics.rejectReasons.push(`step ${step}: w=${weight} n=${count}`);
    }

    const islands = countRemainingFreeIslands(zone, []);
    const largest = calcLargestFreeBlockAfter(zone, []);
    metrics.fragmentationSum += islands;
    metrics.largestBlockSum += largest;
    metrics.samples++;

    if (state.batches.length > 0 && rnd() < releaseProb) {
      const victim = state.batches[Math.floor(rnd() * state.batches.length)];
      shipBatchFromStorage(state, victim.id);
    }
  }

  return {
    seed,
    algorithm: PLACEMENT_ALGORITHM,
    scoring: USE_LEGACY_SCORING ? 'legacy' : 'dynamic',
    zoneConfig,
    ...metrics,
    avgIslands: metrics.samples ? +(metrics.fragmentationSum / metrics.samples).toFixed(2) : 0,
    avgLargestBlock: metrics.samples ? +(metrics.largestBlockSum / metrics.samples).toFixed(2) : 0,
    rejectRate: steps ? +(metrics.rejected / steps).toFixed(3) : 0,
  };
}

// Пакетный прогон: несколько seed'ов × конфигураций × комбинаций алгоритм/скоринг.
function runBatch({
  seeds = [1, 2, 3, 4, 5],
  zoneConfigs = [{ slotsX: 5, slotsY: 5 }, { slotsX: 3, slotsY: 5 }],
  steps = 50,
  releaseProb = 0.3,
} = {}) {
  const combos = [
    { algorithm: 'snake',   scoring: 'legacy'  },
    { algorithm: 'compact', scoring: 'legacy'  },
    { algorithm: 'compact', scoring: 'dynamic' },
  ];

  const results = [];
  const savedAlgo = PLACEMENT_ALGORITHM;
  const savedScoring = USE_LEGACY_SCORING;

  for (const combo of combos) {
    PLACEMENT_ALGORITHM = combo.algorithm;
    USE_LEGACY_SCORING = combo.scoring === 'legacy';

    for (const zoneConfig of zoneConfigs) {
      for (const seed of seeds) {
        results.push(simulateDynamic({ zoneConfig, seed, steps, releaseProb }));
      }
    }
  }

  PLACEMENT_ALGORITHM = savedAlgo;
  USE_LEGACY_SCORING = savedScoring;

  // Агрегация по (algorithm, scoring, zoneConfig)
  const byCombo = {};
  results.forEach(r => {
    const key = `${r.algorithm}/${r.scoring}/${r.zoneConfig.slotsX}x${r.zoneConfig.slotsY}`;
    if (!byCombo[key]) {
      byCombo[key] = {
        n: 0, rejectRate: 0, avgIslands: 0, avgLargestBlock: 0, totalPlacedCargo: 0
      };
    }
    const b = byCombo[key];
    b.n++;
    b.rejectRate += r.rejectRate;
    b.avgIslands += r.avgIslands;
    b.avgLargestBlock += r.avgLargestBlock;
    b.totalPlacedCargo += r.totalPlacedCargo;
  });
  Object.values(byCombo).forEach(b => {
    b.rejectRate = +(b.rejectRate / b.n).toFixed(3);
    b.avgIslands = +(b.avgIslands / b.n).toFixed(2);
    b.avgLargestBlock = +(b.avgLargestBlock / b.n).toFixed(2);
    b.totalPlacedCargo = +(b.totalPlacedCargo / b.n).toFixed(0);
  });

  return { results, byCombo };
}