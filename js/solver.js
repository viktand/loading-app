"use strict";
window.KTK = window.KTK || {};

window.KTK.Solver = {
  /**
   * Точный поиск максимального паросочетания в общем графе (алгоритм Эдмондса).
   */
   matchPairs(candidates, canPairFn, buildPlatformFn) {
    const items = [...candidates].sort((a, b) => b.massT - a.massT);
    const n = items.length;
    if (n < 2) {
      return { platforms: [], leftover: items };
    }

    // Строим матрицу и списки совместимости
    const adj = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (canPairFn(items[i], items[j])) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
      // Сортируем соседей по минимальной разнице масс
      adj[i].sort((u, v) =>
        Math.abs(items[i].massT - items[u].massT) -
        Math.abs(items[i].massT - items[v].massT)
      );
    }

    const match = new Int32Array(n).fill(-1);

    // Шаг 1: Жадный подбор по принципу "сначала самые трудные" (минимум доступных соседей)
    const order = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => adj[a].length - adj[b].length || items[b].massT - items[a].massT);

    for (const u of order) {
      if (match[u] !== -1) continue;
      // Ищем свободного соседа, у которого самого меньше всего свободных вариантов
      let bestV = -1;
      let bestScore = Infinity;

      for (const v of adj[u]) {
        if (match[v] !== -1) continue;
        const freeNeighbors = adj[v].filter(w => match[w] === -1).length;
        const diff = Math.abs(items[u].massT - items[v].massT);
        const score = freeNeighbors * 100 + diff;
        if (score < bestScore) {
          bestScore = score;
          bestV = v;
        }
      }

      if (bestV !== -1) {
        match[u] = bestV;
        match[bestV] = u;
      }
    }

    // Шаг 2: Поиск увеличивающих цепей (BFS) для устранения любых пропущенных пар
    let improved = true;
    while (improved) {
      improved = false;
      for (let start = 0; start < n; start++) {
        if (match[start] !== -1) continue;

        const parent = new Int32Array(n).fill(-1);
        const visited = new Uint8Array(n);
        const queue = [start];
        visited[start] = 1;
        let foundEnd = -1;

        while (queue.length > 0 && foundEnd === -1) {
          const u = queue.shift();
          for (const v of adj[u]) {
            if (visited[v]) continue;
            visited[v] = 1;
            parent[v] = u;

            if (match[v] === -1) {
              foundEnd = v;
              break;
            } else {
              const nextU = match[v];
              if (!visited[nextU]) {
                visited[nextU] = 1;
                parent[nextU] = v;
                queue.push(nextU);
              }
            }
          }
        }

        if (foundEnd !== -1) {
          // Инвертируем ребра вдоль найденного пути
          let cur = foundEnd;
          while (cur !== -1) {
            const prev = parent[cur];
            const prevMatch = parent[prev];
            match[cur] = prev;
            match[prev] = cur;
            cur = prevMatch;
          }
          improved = true;
        }
      }
    }

    const platforms = [];
    const leftover = [];

    for (let i = 0; i < n; i++) {
      if (match[i] === -1) {
        leftover.push(items[i]);
      } else if (i < match[i]) {
        platforms.push(buildPlatformFn(items[i], items[match[i]]));
      }
    }

    return { platforms, leftover };
  },

  // --- ПРАВИЛО 1: Пара 40' без смещения ЦТ ---
  applyRule1_Pair40NoCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "40" && !item.isEmpty && item.cgMm === 0) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => rules.canPair40NoCg(a, b),
      (a, b) => {
        const sumMass = Math.round((a.massT + b.massT) * 100) / 100;
        const diffMass = Math.round(Math.abs(a.massT - b.massT) * 100) / 100;
        const maxDiff = rules.getMaxDiffFor40NoCg(sumMass);
        return {
          ruleId: "R1",
          ruleApplied: "Пара 40' без смещения ЦТ",
          containers: [a, b],
          totalMassT: sumMass,
          totalLenM: Math.round((a.lengthM + b.lengthM) * 1000) / 1000,
          meta: `Разница масс: ${diffMass.toFixed(2)} т (допуск ≤ ${maxDiff} т)`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },

  // --- ПРАВИЛО 3: Пара 40' со смещением ЦТ ---
  applyRule3_Pair40WithCg(pool, rules) {
    const eligible = [];
    const rest = [];

    // Берём все оставшиеся гружёные 40' (включая одиночные без ЦТ из Правила 1,
    // т.к. они могут встать в пару с КТК со смещением ЦТ по таблице Правила 3)
    for (const item of pool) {
      if (item.type === "40" && !item.isEmpty) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => rules.canPair40WithCg(a, b),
      (a, b) => {
        const sumMass = Math.round((a.massT + b.massT) * 100) / 100;
        const diffMass = Math.round(Math.abs(a.massT - b.massT) * 100) / 100;
        const maxCg = Math.max(Math.abs(a.cgMm), Math.abs(b.cgMm));
        const limits = rules.getLimitsFor40WithCg(sumMass);
        return {
          ruleId: "R3",
          ruleApplied: "Пара 40' со смещением ЦТ",
          containers: [a, b],
          totalMassT: sumMass,
          totalLenM: Math.round((a.lengthM + b.lengthM) * 1000) / 1000,
          meta: `Δm: ${diffMass.toFixed(2)} т (≤ ${limits.maxDiffT} т) | max|ЦТ|: ${maxCg} мм (≤ ${limits.maxCgMm} мм)`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },
  
    // --- ПРАВИЛО 4: Пара 30' по краям платформы без смещения ЦТ ---
  applyRule4_Pair30NoCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "30" && !item.isEmpty && item.cgMm === 0) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => rules.canPair30NoCg(a, b),
      (a, b) => {
        const sumMass = Math.round((a.massT + b.massT) * 100) / 100;
        const diffMass = Math.round(Math.abs(a.massT - b.massT) * 100) / 100;
        const maxDiff = rules.getMaxDiffFor30NoCg(sumMass);
        return {
          ruleId: "R4",
          ruleApplied: "Пара 30' по краям без смещения ЦТ",
          edgeAligned: true,
          containers: [a, b],
          totalMassT: sumMass,
          totalLenM: Math.round((a.lengthM + b.lengthM) * 1000) / 1000,
          meta: `Разница масс: ${diffMass.toFixed(2)} т (допуск ≤ ${maxDiff} т)`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },

// --- ПРАВИЛО 5: Пара 30' по краям платформы со смещением ЦТ ---
  applyRule5_Pair30WithCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "30" && !item.isEmpty) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => rules.canPair30WithCg(a, b),
      (a, b) => {
        const sumMass = Math.round((a.massT + b.massT) * 100) / 100;
        const diffMass = Math.round(Math.abs(a.massT - b.massT) * 100) / 100;
        const maxCg = Math.max(Math.abs(a.cgMm), Math.abs(b.cgMm));
        const limits = rules.getLimitsFor30WithCg(sumMass);
        return {
          ruleId: "R5",
          ruleApplied: "Пара 30' по краям со смещением ЦТ",
          edgeAligned: true,
          containers: [a, b],
          totalMassT: sumMass,
          totalLenM: Math.round((a.lengthM + b.lengthM) * 1000) / 1000,
          meta: `Δm: ${diffMass.toFixed(2)} т (≤ ${limits.maxDiffT} т) | max|ЦТ|: ${maxCg} мм (≤ ${limits.maxCgMm} мм)`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },
  
  /**
   * Универсальный упаковщик четвёрок 4×20' [Край1, Внутр1, Внутр2, Край2].
   */
  packQuads20(candidates, getLimitsFn, maxOuterCap, maxInnerCap, ruleId, ruleName) {
    const eligible = [...candidates].sort((a, b) => b.massT - a.massT);
    const used = new Uint8Array(eligible.length);
    const platforms = [];

    while (true) {
      const avail = [];
      for (let i = 0; i < eligible.length; i++) {
        if (!used[i]) avail.push(i);
      }
      if (avail.length < 4) break;

      const pairs = [];
      for (let a = 0; a < avail.length; a++) {
        for (let b = a + 1; b < avail.length; b++) {
          const i = avail[a];
          const j = avail[b];
          pairs.push({
            i,
            j,
            sum: eligible[i].massT + eligible[j].massT,
            diff: Math.abs(eligible[i].massT - eligible[j].massT),
            maxCg: Math.max(Math.abs(eligible[i].cgMm), Math.abs(eligible[j].cgMm)),
          });
        }
      }

      pairs.sort((p1, p2) => p1.diff - p2.diff || p2.sum - p1.sum);

      let bestQuad = null;
      let bestScore = Infinity;
      const heaviestIdx = avail[0];

      for (let pOut = 0; pOut < pairs.length; pOut++) {
        const outer = pairs[pOut];
        if (outer.diff > maxOuterCap + 1e-6) break;

        for (let pIn = 0; pIn < pairs.length; pIn++) {
          const inner = pairs[pIn];
          if (inner.diff > maxInnerCap + 1e-6) break;

          if (
            outer.i === inner.i || outer.i === inner.j ||
            outer.j === inner.i || outer.j === inner.j
          ) {
            continue;
          }

          const totalSum = outer.sum + inner.sum;
          const limits = getLimitsFn(totalSum);
          if (!limits) continue;

          const quadMaxCg = Math.max(outer.maxCg, inner.maxCg);
          const cgAllowed = limits.maxCgMm !== undefined ? limits.maxCgMm : 0;

          if (
            outer.diff <= limits.maxOuterDiffT + 1e-6 &&
            inner.diff <= limits.maxInnerDiffT + 1e-6 &&
            quadMaxCg <= cgAllowed
          ) {
            const hasHeaviest =
              outer.i === heaviestIdx || outer.j === heaviestIdx ||
              inner.i === heaviestIdx || inner.j === heaviestIdx;

            const score = (hasHeaviest ? 0 : 1000) + inner.diff * 2 + outer.diff;
            if (score < bestScore) {
              bestScore = score;
              bestQuad = { outer, inner, totalSum, limits, quadMaxCg };
            }
          }
        }
      }

      if (!bestQuad) break;

      const { outer, inner, totalSum, limits, quadMaxCg } = bestQuad;
      used[outer.i] = 1;
      used[outer.j] = 1;
      used[inner.i] = 1;
      used[inner.j] = 1;

      const cOuter1 = eligible[outer.i];
      const cInner1 = eligible[inner.i];
      const cInner2 = eligible[inner.j];
      const cOuter2 = eligible[outer.j];

      const cgNote = limits.maxCgMm !== undefined
        ? ` | max|ЦТ|: ${quadMaxCg} мм (≤ ${limits.maxCgMm} мм)`
        : "";

      platforms.push({
        ruleId,
        ruleApplied: ruleName,
        containers: [cOuter1, cInner1, cInner2, cOuter2],
        totalMassT: Math.round(totalSum * 100) / 100,
        totalLenM: Math.round(
          (cOuter1.lengthM + cInner1.lengthM + cInner2.lengthM + cOuter2.lengthM) * 1000
        ) / 1000,
        meta: `Δ край: ${outer.diff.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т) | Δ центр: ${inner.diff.toFixed(2)} т (≤ ${limits.maxInnerDiffT} т)${cgNote}`
      });
    }

    const leftover = eligible.filter((_, idx) => !used[idx]);
    return { platforms, leftover };
  },

  // --- ПРАВИЛО 6: 4×20' без смещения ЦТ ---
  applyRule6_Quad20NoCg(pool, rules) {
    const eligible = [];
    const rest = [];
    for (const item of pool) {
      if (item.type === "20" && !item.isEmpty && item.cgMm === 0) eligible.push(item);
      else rest.push(item);
    }

    const res = this.packQuads20(
      eligible,
      sum => rules.getLimitsFor20QuadNoCg(sum),
      4.5, // макс. Δ крайних по таблице R6
      4.5, // макс. Δ внутренних по таблице R6
      "R6",
      "Четвёрка 4×20' без смещения ЦТ"
    );

    return { platforms: res.platforms, pool: [...res.leftover, ...rest] };
  },

  // --- ПРАВИЛО 7: 4×20' со смещением ЦТ ---
  applyRule7_Quad20WithCg(pool, rules) {
    const eligible = [];
    const rest = [];
    // Берём все оставшиеся гружёные 20' (включая одиночные без ЦТ из R6, чтобы доукомплектовать четвёрки)
    for (const item of pool) {
      if (item.type === "20" && !item.isEmpty) eligible.push(item);
      else rest.push(item);
    }

    const res = this.packQuads20(
      eligible,
      sum => rules.getLimitsFor20QuadWithCg(sum),
      4.0, // макс. Δ крайних по таблице R7
      8.0, // макс. Δ внутренних по таблице R7
      "R7",
      "Четвёрка 4×20' со смещением ЦТ"
    );

    return { platforms: res.platforms, pool: [...res.leftover, ...rest] };
  },
  
  /**
   * Универсальный упаковщик троек 3×20' [Край 1, Центр, Край 2].
   * Условие: самый тяжёлый КТК не стоит в центре; разница масс проверяется для крайних.
   */
  packTriples20(candidates, getLimitsFn, withCg, ruleId, ruleName) {
    const eligible = [...candidates].sort((a, b) => b.massT - a.massT);
    const used = new Uint8Array(eligible.length);
    const platforms = [];

    while (true) {
      const avail = [];
      for (let i = 0; i < eligible.length; i++) {
        if (!used[i]) avail.push(i);
      }
      if (avail.length < 3) break;

      let bestTriple = null;
      let bestScore = Infinity;
      const heaviestIdx = avail;

      for (let a = 0; a < avail.length - 2; a++) {
        const i = avail[a]; // Самый тяжёлый в тройке -> Край 1
        for (let b = a + 1; b < avail.length - 1; b++) {
          const j = avail[b];
          for (let c = b + 1; c < avail.length; c++) {
            const k = avail[c];

            const sumMass = eligible[i].massT + eligible[j].massT + eligible[k].massT;
            const limits = getLimitsFn(sumMass);
            if (!limits) continue;

            const tripleMaxCg = Math.max(
              Math.abs(eligible[i].cgMm),
              Math.abs(eligible[j].cgMm),
              Math.abs(eligible[k].cgMm)
            );
            const cgAllowed = limits.maxCgMm !== undefined ? limits.maxCgMm : 0;
            if (tripleMaxCg > cgAllowed) continue;

            // Вариант 1: Край 1 = i, Центр = j, Край 2 = k
            const diffIK = Math.abs(eligible[i].massT - eligible[k].massT);
            if (diffIK <= limits.maxOuterDiffT + 1e-6) {
              const score = (i === heaviestIdx ? 0 : 1000) + diffIK;
              if (score < bestScore) {
                bestScore = score;
                bestTriple = { outer1: i, center: j, outer2: k, sumMass, diff: diffIK, limits, tripleMaxCg };
              }
            }

            // Вариант 2: Край 1 = i, Центр = k, Край 2 = j
            const diffIJ = Math.abs(eligible[i].massT - eligible[j].massT);
            if (diffIJ <= limits.maxOuterDiffT + 1e-6) {
              const score = (i === heaviestIdx ? 0 : 1000) + diffIJ;
              if (score < bestScore) {
                bestScore = score;
                bestTriple = { outer1: i, center: k, outer2: j, sumMass, diff: diffIJ, limits, tripleMaxCg };
              }
            }
          }
        }
      }

      if (!bestTriple) break;

      const { outer1, center, outer2, sumMass, diff, limits, tripleMaxCg } = bestTriple;
      used[outer1] = 1;
      used[center] = 1;
      used[outer2] = 1;

      const cOuter1 = eligible[outer1];
      const cCenter = eligible[center];
      const cOuter2 = eligible[outer2];

      const cgNote = withCg
        ? ` | max|ЦТ|: ${tripleMaxCg} мм (≤ ${limits.maxCgMm} мм)`
        : "";

      platforms.push({
        ruleId,
        ruleApplied: ruleName,
        edgeAligned: true,
        containers: [cOuter1, cCenter, cOuter2],
        totalMassT: Math.round(sumMass * 100) / 100,
        totalLenM: Math.round((cOuter1.lengthM + cCenter.lengthM + cOuter2.lengthM) * 1000) / 1000,
        meta: `Δ крайних: ${diff.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т) | центр: ${cCenter.massT.toFixed(2)} т${cgNote}`
      });
    }

    const leftover = eligible.filter((_, idx) => !used[idx]);
    return { platforms, leftover };
  },

  // --- ПРАВИЛО 8: Тройка 3×20' без смещения ЦТ ---
  applyRule8_Triple20NoCg(pool, rules) {
    const eligible = [];
    const rest = [];
    for (const item of pool) {
      if (item.type === "20" && !item.isEmpty && item.cgMm === 0) eligible.push(item);
      else rest.push(item);
    }

    const res = this.packTriples20(
      eligible,
      sum => {
        const d = rules.getMaxDiffFor20TripleNoCg(sum);
        return d < 0 ? null : { maxOuterDiffT: d, maxCgMm: 0 };
      },
      false,
      "R8",
      "Тройка 3×20' без смещения ЦТ"
    );

    return { platforms: res.platforms, pool: [...res.leftover, ...rest] };
  },

  // --- ПРАВИЛО 9: Тройка 3×20' со смещением ЦТ ---
  applyRule9_Triple20WithCg(pool, rules) {
    const eligible = [];
    const rest = [];
    for (const item of pool) {
      if (item.type === "20" && !item.isEmpty) eligible.push(item);
      else rest.push(item);
    }

    const res = this.packTriples20(
      eligible,
      sum => rules.getLimitsFor20TripleWithCg(sum),
      true,
      "R9",
      "Тройка 3×20' со смещением ЦТ"
    );

    return { platforms: res.platforms, pool: [...res.leftover, ...rest] };
  },
  
    // --- ПРАВИЛО 10: Пара 2×20' по краям платформы без смещения ЦТ ---
  applyRule10_Pair20NoCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "20" && !item.isEmpty && item.cgMm === 0) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => rules.canPair20NoCg(a, b),
      (a, b) => {
        const sumMass = Math.round((a.massT + b.massT) * 100) / 100;
        const diffMass = Math.round(Math.abs(a.massT - b.massT) * 100) / 100;
        const maxDiff = rules.getMaxDiffFor20PairNoCg(sumMass);
        return {
          ruleId: "R10",
          ruleApplied: "Пара 2×20' по краям без смещения ЦТ",
          edgeAligned: true,
          containers: [a, b],
          totalMassT: sumMass,
          totalLenM: Math.round((a.lengthM + b.lengthM) * 1000) / 1000,
          meta: `Разница масс: ${diffMass.toFixed(2)} т (допуск ≤ ${maxDiff} т)`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },

  // --- ПРАВИЛО 11: Пара 2×20' по краям платформы со смещением ЦТ ---
  applyRule11_Pair20WithCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "20" && !item.isEmpty) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => rules.canPair20WithCg(a, b),
      (a, b) => {
        const sumMass = Math.round((a.massT + b.massT) * 100) / 100;
        const diffMass = Math.round(Math.abs(a.massT - b.massT) * 100) / 100;
        const maxCg = Math.max(Math.abs(a.cgMm), Math.abs(b.cgMm));
        const limits = rules.getLimitsFor20PairWithCg(sumMass);
        return {
          ruleId: "R11",
          ruleApplied: "Пара 2×20' по краям со смещением ЦТ",
          edgeAligned: true,
          containers: [a, b],
          totalMassT: sumMass,
          totalLenM: Math.round((a.lengthM + b.lengthM) * 1000) / 1000,
          meta: `Δm: ${diffMass.toFixed(2)} т (≤ ${limits.maxDiffT} т) | max|ЦТ|: ${maxCg} мм (≤ ${limits.maxCgMm} мм)`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },

    /**
   * Универсальный упаковщик комбинаций [20' (край), 40' (центр), 20' (край)].
   */
  packCombo20_40_20(list40, list20, getLimitsFn, withCg, ruleId, ruleName) {
    const c40 = [...list40].sort((a, b) => b.massT - a.massT);
    const c20 = [...list20].sort((a, b) => b.massT - a.massT);

    const used40 = new Uint8Array(c40.length);
    const used20 = new Uint8Array(c20.length);
    const platforms = [];

    // Перебираем 40' (начиная с самых тяжёлых) и подбираем к каждому лучшую пару 20'
    for (let idx40 = 0; idx40 < c40.length; idx40++) {
      const k40 = c40[idx40];
      const cg40 = Math.abs(k40.cgMm);

      let bestMatch = null;
      let bestScore = Infinity;

      for (let i = 0; i < c20.length - 1; i++) {
        if (used20[i]) continue;
        for (let j = i + 1; j < c20.length; j++) {
          if (used20[j]) continue;

          const sumMass = k40.massT + c20[i].massT + c20[j].massT;
          const limits = getLimitsFn(sumMass);
          if (!limits) continue;

          const diff20 = Math.abs(c20[i].massT - c20[j].massT);
          if (diff20 > limits.maxOuterDiffT + 1e-6) continue;

          const maxCg20 = Math.max(Math.abs(c20[i].cgMm), Math.abs(c20[j].cgMm));
          if (cg40 > limits.maxCg40Mm || maxCg20 > limits.maxCg20Mm) continue;

          // Приоритет: минимальная разница масс крайних 20' и максимальная загрузка платформы
          const score = diff20 * 10 - sumMass * 0.01;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = { i, j, sumMass, diff20, limits, cg40, maxCg20 };
          }
        }
      }

      if (bestMatch) {
        const { i, j, sumMass, diff20, limits, cg40, maxCg20 } = bestMatch;
        used40[idx40] = 1;
        used20[i] = 1;
        used20[j] = 1;

        const left20 = c20[i];
        const right20 = c20[j];

        const cgNote = withCg
          ? ` | ЦТ 40': ${cg40} (≤ ${limits.maxCg40Mm}), ЦТ 20': ${maxCg20} (≤ ${limits.maxCg20Mm})`
          : "";

        platforms.push({
          ruleId,
          ruleApplied: ruleName,
          edgeAligned: true,
          containers: [left20, k40, right20], // строго: [20' край, 40' центр, 20' край]
          totalMassT: Math.round(sumMass * 100) / 100,
          totalLenM: Math.round((left20.lengthM + k40.lengthM + right20.lengthM) * 1000) / 1000,
          meta: `Δ крайних 20': ${diff20.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т)${cgNote}`
        });
      }
    }

    return {
      platforms,
      leftover40: c40.filter((_, idx) => !used40[idx]),
      leftover20: c20.filter((_, idx) => !used20[idx]),
    };
  },

  // --- ПРАВИЛО 12: Комбинация 20' + 40' + 20' без смещения ЦТ ---
  applyRule12_Combo20_40_20NoCg(pool, rules) {
    const list40 = [];
    const list20 = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && item.cgMm === 0 && item.type === "40") list40.push(item);
      else if (!item.isEmpty && item.cgMm === 0 && item.type === "20") list20.push(item);
      else rest.push(item);
    }

    const res = this.packCombo20_40_20(
      list40,
      list20,
      sum => {
        const d = rules.getMaxDiffForCombo20_40_20NoCg(sum);
        return d < 0 ? null : { maxOuterDiffT: d, maxCg40Mm: 0, maxCg20Mm: 0 };
      },
      false,
      "R12",
      "Комбинация 20' + 40' + 20' без смещения ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover40, ...res.leftover20, ...rest]
    };
  },

  // --- ПРАВИЛО 13: Комбинация 20' + 40' + 20' со смещением ЦТ ---
  applyRule13_Combo20_40_20WithCg(pool, rules) {
    const list40 = [];
    const list20 = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && item.type === "40") list40.push(item);
      else if (!item.isEmpty && item.type === "20") list20.push(item);
      else rest.push(item);
    }

    const res = this.packCombo20_40_20(
      list40,
      list20,
      sum => rules.getLimitsForCombo20_40_20WithCg(sum),
      true,
      "R13",
      "Комбинация 20' + 40' + 20' со смещением ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover40, ...res.leftover20, ...rest]
    };
  },
  
    /**
   * Универсальный упаковщик комбинаций [30' (край), 20' (центр), 30' (край)].
   */
  packCombo30_20_30(list30, list20, getLimitsFn, withCg, ruleId, ruleName) {
    const c30 = [...list30].sort((a, b) => b.massT - a.massT);
    const c20 = [...list20].sort((a, b) => b.massT - a.massT);

    const used30 = new Uint8Array(c30.length);
    const used20 = new Uint8Array(c20.length);
    const platforms = [];

    // Перебираем доступные 20' и подбираем к каждому лучшую пару крайних 30'
    for (let idx20 = 0; idx20 < c20.length; idx20++) {
      const k20 = c20[idx20];
      const cg20 = Math.abs(k20.cgMm);

      let bestMatch = null;
      let bestScore = Infinity;

      for (let i = 0; i < c30.length - 1; i++) {
        if (used30[i]) continue;
        for (let j = i + 1; j < c30.length; j++) {
          if (used30[j]) continue;

          const sumMass = c30[i].massT + k20.massT + c30[j].massT;
          const limits = getLimitsFn(sumMass);
          if (!limits) continue;

          const diff30 = Math.abs(c30[i].massT - c30[j].massT);
          if (diff30 > limits.maxOuterDiffT + 1e-6) continue;

          const maxCg30 = Math.max(Math.abs(c30[i].cgMm), Math.abs(c30[j].cgMm));
          if (maxCg30 > limits.maxCg30Mm || cg20 > limits.maxCg20Mm) continue;

          const score = diff30 * 10 - sumMass * 0.01;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = { i, j, sumMass, diff30, limits, maxCg30, cg20 };
          }
        }
      }

      if (bestMatch) {
        const { i, j, sumMass, diff30, limits, maxCg30, cg20 } = bestMatch;
        used20[idx20] = 1;
        used30[i] = 1;
        used30[j] = 1;

        const left30 = c30[i];
        const right30 = c30[j];

        const cgNote = withCg
          ? ` | ЦТ 30': ${maxCg30} (≤ ${limits.maxCg30Mm}), ЦТ 20': ${cg20} (≤ ${limits.maxCg20Mm})`
          : "";

        platforms.push({
          ruleId,
          ruleApplied: ruleName,
          edgeAligned: true,
          containers: [left30, k20, right30], // строго: [30' край, 20' центр, 30' край]
          totalMassT: Math.round(sumMass * 100) / 100,
          totalLenM: Math.round((left30.lengthM + k20.lengthM + right30.lengthM) * 1000) / 1000,
          meta: `Δ крайних 30': ${diff30.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т)${cgNote}`
        });
      }
    }

    return {
      platforms,
      leftover30: c30.filter((_, idx) => !used30[idx]),
      leftover20: c20.filter((_, idx) => !used20[idx]),
    };
  },

  // --- ПРАВИЛО 14: Комбинация 30' + 20' + 30' без смещения ЦТ ---
  applyRule14_Combo30_20_30NoCg(pool, rules) {
    const list30 = [];
    const list20 = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && item.cgMm === 0 && item.type === "30") list30.push(item);
      else if (!item.isEmpty && item.cgMm === 0 && item.type === "20") list20.push(item);
      else rest.push(item);
    }

    const res = this.packCombo30_20_30(
      list30,
      list20,
      sum => {
        const d = rules.getMaxDiffForCombo30_20_30NoCg(sum);
        return d < 0 ? null : { maxOuterDiffT: d, maxCg30Mm: 0, maxCg20Mm: 0 };
      },
      false,
      "R14",
      "Комбинация 30' + 20' + 30' без смещения ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover30, ...res.leftover20, ...rest]
    };
  },

  // --- ПРАВИЛО 15: Комбинация 30' + 20' + 30' со смещением ЦТ ---
  applyRule15_Combo30_20_30WithCg(pool, rules) {
    const list30 = [];
    const list20 = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && item.type === "30") list30.push(item);
      else if (!item.isEmpty && item.type === "20") list20.push(item);
      else rest.push(item);
    }

    const res = this.packCombo30_20_30(
      list30,
      list20,
      sum => rules.getLimitsForCombo30_20_30WithCg(sum),
      true,
      "R15",
      "Комбинация 30' + 20' + 30' со смещением ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover30, ...res.leftover20, ...rest]
    };
  },

  // --- ПРАВИЛО 16: Комбинация 40' + 20' по краям платформы без смещения ЦТ ---
  applyRule16_Combo40_20NoCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && item.cgMm === 0 && (item.type === "40" || item.type === "20")) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => {
        if (a.type === b.type) return false;
        const k40 = a.type === "40" ? a : b;
        const k20 = a.type === "20" ? a : b;
        return rules.canCombo40_20NoCg(k40, k20);
      },
      (a, b) => {
        const k40 = a.type === "40" ? a : b;
        const k20 = a.type === "20" ? a : b;
        const limits = rules.getLimitsForCombo40_20NoCg(k20.massT);
        const sumMass = Math.round((k40.massT + k20.massT) * 100) / 100;
        return {
          ruleId: "R16",
          ruleApplied: "Комбинация 40' + 20' по краям без смещения ЦТ",
          edgeAligned: true,
          containers: [k40, k20],
          totalMassT: sumMass,
          totalLenM: Math.round((k40.lengthM + k20.lengthM) * 1000) / 1000,
          meta: `20' ≤ ${limits.maxMass20T} т | 40' в диапазоне [${limits.minMass40T}..${limits.maxMass40T}] т`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },

  // --- ПРАВИЛО 17: Комбинация 40' + 20' по краям платформы со смещением ЦТ ---
  applyRule17_Combo40_20WithCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && (item.type === "40" || item.type === "20")) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => {
        if (a.type === b.type) return false;
        const k40 = a.type === "40" ? a : b;
        const k20 = a.type === "20" ? a : b;
        return rules.canCombo40_20WithCg(k40, k20);
      },
      (a, b) => {
        const k40 = a.type === "40" ? a : b;
        const k20 = a.type === "20" ? a : b;
        const limits = rules.getLimitsForCombo40_20WithCg(k20.massT);
        const sumMass = Math.round((k40.massT + k20.massT) * 100) / 100;
        return {
          ruleId: "R17",
          ruleApplied: "Комбинация 40' + 20' по краям со смещением ЦТ",
          edgeAligned: true,
          containers: [k40, k20],
          totalMassT: sumMass,
          totalLenM: Math.round((k40.lengthM + k20.lengthM) * 1000) / 1000,
          meta: `40' [${limits.minMass40T}..${limits.maxMass40T}] т | ЦТ 40': ${Math.abs(k40.cgMm)} (≤ ${limits.maxCg40Mm}), ЦТ 20': ${Math.abs(k20.cgMm)} (≤ ${limits.maxCg20Mm})`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },
  
    // --- ПРАВИЛО 18: Комбинация 30' + 20' по краям платформы без смещения ЦТ ---
  applyRule18_Combo30_20NoCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && item.cgMm === 0 && (item.type === "30" || item.type === "20")) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => {
        if (a.type === b.type) return false;
        const k30 = a.type === "30" ? a : b;
        const k20 = a.type === "20" ? a : b;
        return rules.canCombo30_20NoCg(k30, k20);
      },
      (a, b) => {
        const k30 = a.type === "30" ? a : b;
        const k20 = a.type === "20" ? a : b;
        const limits = rules.getLimitsForCombo30_20NoCg(k20.massT);
        const sumMass = Math.round((k30.massT + k20.massT) * 100) / 100;
        return {
          ruleId: "R18",
          ruleApplied: "Комбинация 30' + 20' по краям без смещения ЦТ",
          edgeAligned: true,
          containers: [k30, k20],
          totalMassT: sumMass,
          totalLenM: Math.round((k30.lengthM + k20.lengthM) * 1000) / 1000,
          meta: `20' ≤ ${limits.maxMass20T} т | 30' в диапазоне [${limits.minMass30T}..${limits.maxMass30T}] т`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },

  // --- ПРАВИЛО 19: Комбинация 30' + 20' по краям платформы со смещением ЦТ ---
  applyRule19_Combo30_20WithCg(pool, rules) {
    const eligible = [];
    const rest = [];

    for (const item of pool) {
      if (!item.isEmpty && (item.type === "30" || item.type === "20")) {
        eligible.push(item);
      } else {
        rest.push(item);
      }
    }

    const res = this.matchPairs(
      eligible,
      (a, b) => {
        if (a.type === b.type) return false;
        const k30 = a.type === "30" ? a : b;
        const k20 = a.type === "20" ? a : b;
        return rules.canCombo30_20WithCg(k30, k20);
      },
      (a, b) => {
        const k30 = a.type === "30" ? a : b;
        const k20 = a.type === "20" ? a : b;
        const limits = rules.getLimitsForCombo30_20WithCg(k20.massT);
        const sumMass = Math.round((k30.massT + k20.massT) * 100) / 100;
        return {
          ruleId: "R19",
          ruleApplied: "Комбинация 30' + 20' по краям со смещением ЦТ",
          edgeAligned: true,
          containers: [k30, k20],
          totalMassT: sumMass,
          totalLenM: Math.round((k30.lengthM + k20.lengthM) * 1000) / 1000,
          meta: `30' [${limits.minMass30T}..${limits.maxMass30T}] т | ЦТ 30': ${Math.abs(k30.cgMm)} (≤ ${limits.maxCg30Mm}), ЦТ 20': ${Math.abs(k20.cgMm)} (≤ ${limits.maxCg20Mm})`
        };
      }
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftover, ...rest]
    };
  },

  /**
   * Универсальный упаковщик комбинаций [20' (край), порожний 40' (центр, 4 т), 20' (край)].
   */
  packCombo20_Empty40_20(listEmpty40, list20, rules, getLimitsFn, withCg, ruleId, ruleName) {
    const empty40Mass = rules.platform.empty40MassT;
    const e40 = [...listEmpty40];
    const c20 = [...list20].sort((a, b) => b.massT - a.massT);

    const usedE40 = new Uint8Array(e40.length);
    const used20 = new Uint8Array(c20.length);
    const platforms = [];

    for (let idxE40 = 0; idxE40 < e40.length; idxE40++) {
      let bestMatch = null;
      let bestScore = Infinity;

      for (let i = 0; i < c20.length - 1; i++) {
        if (used20[i]) continue;
        for (let j = i + 1; j < c20.length; j++) {
          if (used20[j]) continue;

          const sumMass = empty40Mass + c20[i].massT + c20[j].massT;
          const limits = getLimitsFn(sumMass);
          if (!limits) continue;

          const diff20 = Math.abs(c20[i].massT - c20[j].massT);
          if (diff20 > limits.maxOuterDiffT + 1e-6) continue;

          const maxCg20 = Math.max(Math.abs(c20[i].cgMm), Math.abs(c20[j].cgMm));
          if (maxCg20 > limits.maxCg20Mm) continue;

          const score = diff20 * 10 - sumMass * 0.01;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = { i, j, sumMass, diff20, limits, maxCg20 };
          }
        }
      }

      if (bestMatch) {
        const { i, j, sumMass, diff20, limits, maxCg20 } = bestMatch;
        usedE40[idxE40] = 1;
        used20[i] = 1;
        used20[j] = 1;

        const left20 = c20[i];
        const right20 = c20[j];
        // Фиксируем расчётную массу 4 т на порожнем контейнере для корректного отображения
        const centerEmpty40 = { ...e40[idxE40], massT: empty40Mass };

        const cgNote = withCg
          ? ` | max|ЦТ| 20': ${maxCg20} мм (≤ ${limits.maxCg20Mm} мм)`
          : "";

        platforms.push({
          ruleId,
          ruleApplied: ruleName,
          edgeAligned: true,
          containers: [left20, centerEmpty40, right20], // строго: [20' край, порожний 40' центр, 20' край]
          totalMassT: Math.round(sumMass * 100) / 100,
          totalLenM: Math.round((left20.lengthM + centerEmpty40.lengthM + right20.lengthM) * 1000) / 1000,
          meta: `Δ крайних 20': ${diff20.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т) | пор. 40': ${empty40Mass} т${cgNote}`
        });
      }
    }

    return {
      platforms,
      leftoverE40: e40.filter((_, idx) => !usedE40[idx]),
      leftover20: c20.filter((_, idx) => !used20[idx]),
    };
  },

  // --- ПРАВИЛО 20: Комбинация 20' + порожний 40' + 20' без смещения ЦТ ---
  applyRule20_Combo20_Empty40_20NoCg(pool, rules) {
    const listEmpty40 = [];
    const list20 = [];
    const rest = [];

    for (const item of pool) {
      if (item.isEmpty && item.type === "40") listEmpty40.push(item);
      else if (!item.isEmpty && item.cgMm === 0 && item.type === "20") list20.push(item);
      else rest.push(item);
    }

    const res = this.packCombo20_Empty40_20(
      listEmpty40,
      list20,
      rules,
      sum => {
        const d = rules.getMaxDiffForCombo20_Empty40_20NoCg(sum);
        return d < 0 ? null : { maxOuterDiffT: d, maxCg20Mm: 0 };
      },
      false,
      "R20",
      "Комбинация 20' + порожний 40' + 20' без смещения ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE40, ...res.leftover20, ...rest]
    };
  },

  // --- ПРАВИЛО 21: Комбинация 20' + порожний 40' + 20' со смещением ЦТ ---
  applyRule21_Combo20_Empty40_20WithCg(pool, rules) {
    const listEmpty40 = [];
    const list20 = [];
    const rest = [];

    for (const item of pool) {
      if (item.isEmpty && item.type === "40") listEmpty40.push(item);
      else if (!item.isEmpty && item.type === "20") list20.push(item);
      else rest.push(item);
    }

    const res = this.packCombo20_Empty40_20(
      listEmpty40,
      list20,
      rules,
      sum => rules.getLimitsForCombo20_Empty40_20WithCg(sum),
      true,
      "R21",
      "Комбинация 20' + порожний 40' + 20' со смещением ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE40, ...res.leftover20, ...rest]
    };
  },
  
    // --- ПРАВИЛО 22: Порожний 20' (2.2 т) + гружёный 40' (<= 36 т) + порожний 20' (2.2 т) ---
  applyRule22_ComboEmpty20_40_Empty20(pool, rules) {
    const empty20Mass = rules.platform.empty20MassT;
    const list40 = [];
    const listEmpty20 = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "40" && !item.isEmpty && rules.canComboEmpty20_40_Empty20(item)) {
        list40.push(item);
      } else if (item.type === "20" && item.isEmpty) {
        listEmpty20.push(item);
      } else {
        rest.push(item);
      }
    }

    // Берём сначала самые тяжёлые из допустимых 40' (до 36 т)
    list40.sort((a, b) => b.massT - a.massT);

    const platforms = [];
    let idx40 = 0;
    let idxE20 = 0;

    while (idx40 < list40.length && idxE20 + 1 < listEmpty20.length) {
      const k40 = list40[idx40++];
      const leftE20 = { ...listEmpty20[idxE20++], massT: empty20Mass };
      const rightE20 = { ...listEmpty20[idxE20++], massT: empty20Mass };

      const sumMass = Math.round((k40.massT + empty20Mass * 2) * 100) / 100;
      const totalLen = Math.round((leftE20.lengthM + k40.lengthM + rightE20.lengthM) * 1000) / 1000;

      platforms.push({
        ruleId: "R22",
        ruleApplied: "Комбинация пор. 20' + 40' + пор. 20'",
        edgeAligned: true,
        containers: [leftE20, k40, rightE20], // строго: [пор. 20', гружёный 40' в центре, пор. 20']
        totalMassT: sumMass,
        totalLenM: totalLen,
        meta: `Гружёный 40': ${k40.massT.toFixed(2)} т (≤ ${rules.platform.comboEmpty20_40_Max40MassT} т) | пор. 20': 2 × ${empty20Mass} т`
      });
    }

    const leftover40 = list40.slice(idx40);
    const leftoverE20 = listEmpty20.slice(idxE20);

    return {
      platforms,
      pool: [...leftover40, ...leftoverE20, ...rest]
    };
  },

  /**
   * Универсальный упаковщик комбинаций [30' (край), порожний 20' (центр, 2.2 т), 30' (край)].
   */
  packCombo30_Empty20_30(listEmpty20, list30, rules, getLimitsFn, withCg, ruleId, ruleName) {
    const empty20Mass = rules.platform.empty20MassT;
    const e20 = [...listEmpty20];
    const c30 = [...list30].sort((a, b) => b.massT - a.massT);

    const usedE20 = new Uint8Array(e20.length);
    const used30 = new Uint8Array(c30.length);
    const platforms = [];

    for (let idxE20 = 0; idxE20 < e20.length; idxE20++) {
      let bestMatch = null;
      let bestScore = Infinity;

      for (let i = 0; i < c30.length - 1; i++) {
        if (used30[i]) continue;
        for (let j = i + 1; j < c30.length; j++) {
          if (used30[j]) continue;

          const sumMass = empty20Mass + c30[i].massT + c30[j].massT;
          const limits = getLimitsFn(sumMass);
          if (!limits) continue;

          const diff30 = Math.abs(c30[i].massT - c30[j].massT);
          if (diff30 > limits.maxOuterDiffT + 1e-6) continue;

          const maxCg30 = Math.max(Math.abs(c30[i].cgMm), Math.abs(c30[j].cgMm));
          if (maxCg30 > limits.maxCg30Mm) continue;

          const score = diff30 * 10 - sumMass * 0.01;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = { i, j, sumMass, diff30, limits, maxCg30 };
          }
        }
      }

      if (bestMatch) {
        const { i, j, sumMass, diff30, limits, maxCg30 } = bestMatch;
        usedE20[idxE20] = 1;
        used30[i] = 1;
        used30[j] = 1;

        const left30 = c30[i];
        const right30 = c30[j];
        const centerEmpty20 = { ...e20[idxE20], massT: empty20Mass };

        const cgNote = withCg
          ? ` | max|ЦТ| 30': ${maxCg30} мм (≤ ${limits.maxCg30Mm} мм)`
          : "";

        platforms.push({
          ruleId,
          ruleApplied: ruleName,
          edgeAligned: true,
          containers: [left30, centerEmpty20, right30], // строго: [30' край, порожний 20' центр, 30' край]
          totalMassT: Math.round(sumMass * 100) / 100,
          totalLenM: Math.round((left30.lengthM + centerEmpty20.lengthM + right30.lengthM) * 1000) / 1000,
          meta: `Δ крайних 30': ${diff30.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т) | пор. 20': ${empty20Mass} т${cgNote}`
        });
      }
    }

    return {
      platforms,
      leftoverE20: e20.filter((_, idx) => !usedE20[idx]),
      leftover30: c30.filter((_, idx) => !used30[idx]),
    };
  },

  // --- ПРАВИЛО 23: Комбинация 30' + порожний 20' + 30' без смещения ЦТ ---
  applyRule23_Combo30_Empty20_30NoCg(pool, rules) {
    const listEmpty20 = [];
    const list30 = [];
    const rest = [];

    for (const item of pool) {
      if (item.isEmpty && item.type === "20") listEmpty20.push(item);
      else if (!item.isEmpty && item.cgMm === 0 && item.type === "30") list30.push(item);
      else rest.push(item);
    }

    const res = this.packCombo30_Empty20_30(
      listEmpty20,
      list30,
      rules,
      sum => {
        const d = rules.getMaxDiffForCombo30_Empty20_30NoCg(sum);
        return d < 0 ? null : { maxOuterDiffT: d, maxCg30Mm: 0 };
      },
      false,
      "R23",
      "Комбинация 30' + порожний 20' + 30' без смещения ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE20, ...res.leftover30, ...rest]
    };
  },

  // --- ПРАВИЛО 24: Комбинация 30' + порожний 20' + 30' со смещением ЦТ ---
  applyRule24_Combo30_Empty20_30WithCg(pool, rules) {
    const listEmpty20 = [];
    const list30 = [];
    const rest = [];

    for (const item of pool) {
      if (item.isEmpty && item.type === "20") listEmpty20.push(item);
      else if (!item.isEmpty && item.type === "30") list30.push(item);
      else rest.push(item);
    }

    const res = this.packCombo30_Empty20_30(
      listEmpty20,
      list30,
      rules,
      sum => rules.getLimitsForCombo30_Empty20_30WithCg(sum),
      true,
      "R24",
      "Комбинация 30' + порожний 20' + 30' со смещением ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE20, ...res.leftover30, ...rest]
    };
  },

  /**
   * Универсальный упаковщик четвёрок [20' (край), пор. 20', пор. 20', 20' (край)].
   */
  packQuad20_2EmptyCenter(listEmpty20, listLoaded20, rules, getLimitsFn, withCg, ruleId, ruleName) {
    const empty20Mass = rules.platform.empty20MassT;
    const centerPairMass = empty20Mass * 2; // 4.4 т

    // Сколько максимум четвёрок можно собрать по числу пар порожних 20'
    const maxGroupsByEmpty = Math.floor(listEmpty20.length / 2);
    if (maxGroupsByEmpty === 0 || listLoaded20.length < 2) {
      return { platforms: [], leftoverE20: listEmpty20, leftoverL20: listLoaded20 };
    }

    // Сначала ищем все допустимые пары крайних гружёных 20' через matchPairs
    const res = this.matchPairs(
      listLoaded20,
      (a, b) => {
        const sumMass = a.massT + b.massT + centerPairMass;
        const limits = getLimitsFn(sumMass);
        if (!limits) return false;
        const diff = Math.abs(a.massT - b.massT);
        const maxCg = Math.max(Math.abs(a.cgMm), Math.abs(b.cgMm));
        return diff <= limits.maxOuterDiffT + 1e-6 && maxCg <= limits.maxCg20Mm;
      },
      (a, b) => ({ a, b })
    );

    // Берём не больше чем maxGroupsByEmpty пар (остальные возвращаем в пул)
    const takenPairs = res.platforms.slice(0, maxGroupsByEmpty);
    const returnedLoaded = res.platforms.slice(maxGroupsByEmpty).flatMap(p => [p.a, p.b]);

    const platforms = [];
    let eIdx = 0;

    for (const pair of takenPairs) {
      const left20 = pair.a;
      const right20 = pair.b;
      const center1 = { ...listEmpty20[eIdx++], massT: empty20Mass };
      const center2 = { ...listEmpty20[eIdx++], massT: empty20Mass };

      const sumMass = Math.round((left20.massT + right20.massT + centerPairMass) * 100) / 100;
      const diff = Math.round(Math.abs(left20.massT - right20.massT) * 100) / 100;
      const limits = getLimitsFn(sumMass);
      const maxCg = Math.max(Math.abs(left20.cgMm), Math.abs(right20.cgMm));

      const cgNote = withCg
        ? ` | max|ЦТ| 20': ${maxCg} мм (≤ ${limits.maxCg20Mm} мм)`
        : "";

      platforms.push({
        ruleId,
        ruleApplied: ruleName,
        containers: [left20, center1, center2, right20], // строго: [20', пор.20', пор.20', 20']
        totalMassT: sumMass,
        totalLenM: Math.round((left20.lengthM + center1.lengthM + center2.lengthM + right20.lengthM) * 1000) / 1000,
        meta: `Δ крайних 20': ${diff.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т) | пор. 20': 2 × ${empty20Mass} т${cgNote}`
      });
    }

    return {
      platforms,
      leftoverE20: listEmpty20.slice(eIdx),
      leftoverL20: [...res.leftover, ...returnedLoaded]
    };
  },

  // --- ПРАВИЛО 25: 20' + 2×порожних 20' в центре + 20' без смещения ЦТ ---
  applyRule25_Quad20_2EmptyCenterNoCg(pool, rules) {
    const listEmpty20 = [];
    const listLoaded20 = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "20" && item.isEmpty) listEmpty20.push(item);
      else if (item.type === "20" && !item.isEmpty && item.cgMm === 0) listLoaded20.push(item);
      else rest.push(item);
    }

    const res = this.packQuad20_2EmptyCenter(
      listEmpty20,
      listLoaded20,
      rules,
      sum => {
        const d = rules.getMaxDiffForQuad20_2EmptyCenterNoCg(sum);
        return d < 0 ? null : { maxOuterDiffT: d, maxCg20Mm: 0 };
      },
      false,
      "R25",
      "Четвёрка 20' + 2×пор. 20' (центр) + 20' без смещения ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE20, ...res.leftoverL20, ...rest]
    };
  },

  // --- ПРАВИЛО 26: 20' + 2×порожних 20' в центре + 20' со смещением ЦТ ---
  applyRule26_Quad20_2EmptyCenterWithCg(pool, rules) {
    const listEmpty20 = [];
    const listLoaded20 = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "20" && item.isEmpty) listEmpty20.push(item);
      else if (item.type === "20" && !item.isEmpty) listLoaded20.push(item);
      else rest.push(item);
    }

    const res = this.packQuad20_2EmptyCenter(
      listEmpty20,
      listLoaded20,
      rules,
      sum => rules.getLimitsForQuad20_2EmptyCenterWithCg(sum),
      true,
      "R26",
      "Четвёрка 20' + 2×пор. 20' (центр) + 20' со смещением ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE20, ...res.leftoverL20, ...rest]
    };
  },

  /**
   * Универсальный упаковщик троек [20' (край), пор. 20' (центр, 2.2 т), 20' (край)].
   */
  packTriple20_EmptyCenter(listEmpty20, listLoaded20, rules, getLimitsFn, withCg, ruleId, ruleName) {
    const empty20Mass = rules.platform.empty20MassT; // 2.2 т

    const maxGroupsByEmpty = listEmpty20.length;
    if (maxGroupsByEmpty === 0 || listLoaded20.length < 2) {
      return { platforms: [], leftoverE20: listEmpty20, leftoverL20: listLoaded20 };
    }

    const res = this.matchPairs(
      listLoaded20,
      (a, b) => {
        const sumMass = a.massT + b.massT + empty20Mass;
        const limits = getLimitsFn(sumMass);
        if (!limits) return false;
        const diff = Math.abs(a.massT - b.massT);
        const maxCg = Math.max(Math.abs(a.cgMm), Math.abs(b.cgMm));
        return diff <= limits.maxOuterDiffT + 1e-6 && maxCg <= limits.maxCg20Mm;
      },
      (a, b) => ({ a, b })
    );

    const takenPairs = res.platforms.slice(0, maxGroupsByEmpty);
    const returnedLoaded = res.platforms.slice(maxGroupsByEmpty).flatMap(p => [p.a, p.b]);

    const platforms = [];
    let eIdx = 0;

    for (const pair of takenPairs) {
      const left20 = pair.a;
      const right20 = pair.b;
      const centerEmpty20 = { ...listEmpty20[eIdx++], massT: empty20Mass };

      const sumMass = Math.round((left20.massT + right20.massT + empty20Mass) * 100) / 100;
      const diff = Math.round(Math.abs(left20.massT - right20.massT) * 100) / 100;
      const limits = getLimitsFn(sumMass);
      const maxCg = Math.max(Math.abs(left20.cgMm), Math.abs(right20.cgMm));

      const cgNote = withCg
        ? ` | max|ЦТ| 20': ${maxCg} мм (≤ ${limits.maxCg20Mm} мм)`
        : "";

      platforms.push({
        ruleId,
        ruleApplied: ruleName,
        edgeAligned: true,
        containers: [left20, centerEmpty20, right20], // строго: [20', пор. 20' в центре, 20']
        totalMassT: sumMass,
        totalLenM: Math.round((left20.lengthM + centerEmpty20.lengthM + right20.lengthM) * 1000) / 1000,
        meta: `Δ крайних 20': ${diff.toFixed(2)} т (≤ ${limits.maxOuterDiffT} т) | пор. 20': ${empty20Mass} т${cgNote}`
      });
    }

    return {
      platforms,
      leftoverE20: listEmpty20.slice(eIdx),
      leftoverL20: [...res.leftover, ...returnedLoaded]
    };
  },

  // --- ПРАВИЛО 27: Тройка 20' + порожний 20' (центр) + 20' без смещения ЦТ ---
  applyRule27_Triple20_EmptyCenterNoCg(pool, rules) {
    const listEmpty20 = [];
    const listLoaded20 = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "20" && item.isEmpty) listEmpty20.push(item);
      else if (item.type === "20" && !item.isEmpty && item.cgMm === 0) listLoaded20.push(item);
      else rest.push(item);
    }

    const res = this.packTriple20_EmptyCenter(
      listEmpty20,
      listLoaded20,
      rules,
      sum => {
        const d = rules.getMaxDiffForTriple20_EmptyCenterNoCg(sum);
        return d < 0 ? null : { maxOuterDiffT: d, maxCg20Mm: 0 };
      },
      false,
      "R27",
      "Тройка 20' + пор. 20' (центр) + 20' без смещения ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE20, ...res.leftoverL20, ...rest]
    };
  },

  // --- ПРАВИЛО 28: Тройка 20' + порожний 20' (центр) + 20' со смещением ЦТ ---
  applyRule28_Triple20_EmptyCenterWithCg(pool, rules) {
    const listEmpty20 = [];
    const listLoaded20 = [];
    const rest = [];

    for (const item of pool) {
      if (item.type === "20" && item.isEmpty) listEmpty20.push(item);
      else if (item.type === "20" && !item.isEmpty) listLoaded20.push(item);
      else rest.push(item);
    }

    const res = this.packTriple20_EmptyCenter(
      listEmpty20,
      listLoaded20,
      rules,
      sum => rules.getLimitsForTriple20_EmptyCenterWithCg(sum),
      true,
      "R28",
      "Тройка 20' + пор. 20' (центр) + 20' со смещением ЦТ"
    );

    return {
      platforms: res.platforms,
      pool: [...res.leftoverE20, ...res.leftoverL20, ...rest]
    };
  },

  // --- ПРАВИЛО 29: Комбинации только порожних КТК ---
  applyEmptyOnlyRules(pool, rules) {
    const e40 = [];
    const e30 = [];
    const e20 = [];
    const rest = [];

    const m40 = rules.platform.empty40MassT;
    const m30 = rules.platform.empty30MassT;
    const m20 = rules.platform.empty20MassT;

    for (const item of pool) {
      if (!item.isEmpty) {
        rest.push(item);
      } else if (item.type === "40") {
        e40.push({ ...item, massT: m40 });
      } else if (item.type === "30") {
        e30.push({ ...item, massT: m30 });
      } else if (item.type === "20") {
        e20.push({ ...item, massT: m20 });
      } else {
        rest.push(item);
      }
    }

    const platforms = [];

    const makeEmptyPlatform = (ruleName, containers, opts = {}) => {
      const totalMass = Math.round(containers.reduce((s, c) => s + c.massT, 0) * 100) / 100;
      const totalLen = Math.round(containers.reduce((s, c) => s + c.lengthM, 0) * 1000) / 1000;
      platforms.push({
        ruleId: "R29",
        ruleApplied: ruleName,
        centered: !!opts.centered,
        edgeAligned: !!opts.edgeAligned,
        containers,
        totalMassT: totalMass,
        totalLenM: totalLen,
        meta: `Порожние КТК | Суммарная масса тары: ${totalMass.toFixed(2)} т`
      });
    };

    // 1. Четвёрки 4×20'
    while (e20.length >= 4) {
      makeEmptyPlatform("Порожние: 4×20'", [e20.pop(), e20.pop(), e20.pop(), e20.pop()]);
    }

    // 2. Тройки 3×30' (один в центре, два по краям)
    while (e30.length >= 3) {
      makeEmptyPlatform("Порожние: 3×30' (по краям и в центре)", [e30.pop(), e30.pop(), e30.pop()], { edgeAligned: true });
    }

    // 3. Смешанные тройки 20' + 40' + 20' (40' в центре, 20' по краям)
    while (e40.length >= 1 && e20.length >= 2) {
      const left20 = e20.pop();
      const mid40 = e40.pop();
      const right20 = e20.pop();
      makeEmptyPlatform("Порожние: 20' + 40' + 20'", [left20, mid40, right20], { edgeAligned: true });
    }

    // 4. Смешанные тройки 30' + 20' + 30' (20' в центре, 30' по краям)
    while (e30.length >= 2 && e20.length >= 1) {
      const left30 = e30.pop();
      const mid20 = e20.pop();
      const right30 = e30.pop();
      makeEmptyPlatform("Порожние: 30' + 20' + 30'", [left30, mid20, right30], { edgeAligned: true });
    }

    // 5. Пары 40' + 40'
    while (e40.length >= 2) {
      makeEmptyPlatform("Порожние: 40' + 40'", [e40.pop(), e40.pop()]);
    }

    // 6. Пары 30' + 30' по краям
    while (e30.length >= 2) {
      makeEmptyPlatform("Порожние: 30' + 30' по краям", [e30.pop(), e30.pop()], { edgeAligned: true });
    }

    // 7. Смешанные пары 40' + 20' по краям
    while (e40.length >= 1 && e20.length >= 1) {
      makeEmptyPlatform("Порожние: 40' + 20' по краям", [e40.pop(), e20.pop()], { edgeAligned: true });
    }

    // 8. Смешанные пары 30' + 20' по краям
    while (e30.length >= 1 && e20.length >= 1) {
      makeEmptyPlatform("Порожние: 30' + 20' по краям", [e30.pop(), e20.pop()], { edgeAligned: true });
    }

    // 9. Пары 2×20' в центре
    while (e20.length >= 2) {
      makeEmptyPlatform("Порожние: 2×20' в центре", [e20.pop(), e20.pop()], { centered: true });
    }

    // 10. Одиночные порожние в центре (40', 30', 20')
    while (e40.length >= 1) {
      makeEmptyPlatform("Порожний: 40' в центре", [e40.pop()], { centered: true });
    }
    while (e30.length >= 1) {
      makeEmptyPlatform("Порожний: 30' в центре", [e30.pop()], { centered: true });
    }
    while (e20.length >= 1) {
      makeEmptyPlatform("Порожний: 20' в центре", [e20.pop()], { centered: true });
    }

    return { platforms, pool: rest };
  },

  // --- ФИНАЛЬНОЕ ПРАВИЛО: Любой одиночный гружёный КТК в центре (<= 36 т) ---
  applyFinalSingles(pool, rules) {
    const platforms = [];
    const unplaced = [];

    for (const item of pool) {
      if (rules.canPlaceSingleLoaded(item)) {
        platforms.push({
          ruleId: "R-SINGLE",
          ruleApplied: `Одиночный ${item.type}' в центре платформы`,
          centered: true,
          containers: [item],
          totalMassT: item.massT,
          totalLenM: item.lengthM,
          meta: `Масса: ${item.massT.toFixed(2)} т (допуск ≤ ${rules.platform.singleLoadedMaxMassT} т)`
        });
      } else {
        unplaced.push(item);
      }
    }

    return { platforms, unplaced };
  },
  
  /**
   * Расчёт осевых нагрузок и продольного смещения общего ЦТ платформы.
   */
  calcAxleLoads(containers, slotCentersMm = [], rules) {
    const tareMassT = rules.platform.tareMassT;
    const baseMm = rules.platform.baseMm;
    const maxAxleAllowed = rules.platform.maxAxleLoadT;

    let cargoMassT = 0;
    let momentTMm = 0;

    for (let i = 0; i < containers.length; i++) {
      const c = containers[i];
      const slotX = slotCentersMm?.[i] ?? 0;
      const actualX = slotX + (c.cgMm || 0);

      cargoMassT += c.massT;
      momentTMm += c.massT * actualX;
    }

    const grossMassT = tareMassT + cargoMassT;
    const wagonCgMm = grossMassT > 0 ? momentTMm / grossMassT : 0;

    // Реакции на 1-ю (левую) и 2-ю (правую) двухосные тележки, т
    const bogie1T = grossMassT / 2 - momentTMm / baseMm;
    const bogie2T = grossMassT / 2 + momentTMm / baseMm;

    // Нагрузка на каждую ось (по 2 оси на тележку), тс
    const axle1T = bogie1T / 2;
    const axle2T = bogie2T / 2;
    const maxAxleT = Math.max(axle1T, axle2T);

    return {
      grossMassT: Math.round(grossMassT * 100) / 100,
      wagonCgMm: Math.round(wagonCgMm),
      bogie1T: Math.round(bogie1T * 100) / 100,
      bogie2T: Math.round(bogie2T * 100) / 100,
      axle1T: Math.round(axle1T * 100) / 100,
      axle2T: Math.round(axle2T * 100) / 100,
      maxAxleT: Math.round(maxAxleT * 100) / 100,
      maxAxleAllowed,
      isOverloaded: maxAxleT > maxAxleAllowed + 1e-6,
    };
  },


  /**
   * Главный конвейер правил
   */
  solve(items, batchParams) {
    const rules = window.KTK.RULES;
    const allPlatforms = [];
    let pool = [...items];

     // 1. Полные однородные схемы: пары 40' (R1, R3), четвёрки 4×20' (R6, R7), тройки 3×20' (R8, R9)
    const r1 = this.applyRule1_Pair40NoCg(pool, rules);
    allPlatforms.push(...r1.platforms);
    pool = r1.pool;

    const r3 = this.applyRule3_Pair40WithCg(pool, rules);
    allPlatforms.push(...r3.platforms);
    pool = r3.pool;

    const r6 = this.applyRule6_Quad20NoCg(pool, rules);
    allPlatforms.push(...r6.platforms);
    pool = r6.pool;

    const r7 = this.applyRule7_Quad20WithCg(pool, rules);
    allPlatforms.push(...r7.platforms);
    pool = r7.pool;

    const r8 = this.applyRule8_Triple20NoCg(pool, rules);
    allPlatforms.push(...r8.platforms);
    pool = r8.pool;

    const r9 = this.applyRule9_Triple20WithCg(pool, rules);
    allPlatforms.push(...r9.platforms);
    pool = r9.pool;

    // 2. Трёхконтейнерные смешанные комбинации: 20'+40'+20' (R12, R13) и 30'+20'+30' (R14, R15)
    const r12 = this.applyRule12_Combo20_40_20NoCg(pool, rules);
    allPlatforms.push(...r12.platforms);
    pool = r12.pool;

    const r13 = this.applyRule13_Combo20_40_20WithCg(pool, rules);
    allPlatforms.push(...r13.platforms);
    pool = r13.pool;

    const r14 = this.applyRule14_Combo30_20_30NoCg(pool, rules);
    allPlatforms.push(...r14.platforms);
    pool = r14.pool;

    const r15 = this.applyRule15_Combo30_20_30WithCg(pool, rules);
    allPlatforms.push(...r15.platforms);
    pool = r15.pool;
	
	// Комбинации с порожним 40' в центре: 20' + пор. 40' + 20' (R20, R21)
    const r20 = this.applyRule20_Combo20_Empty40_20NoCg(pool, rules);
    allPlatforms.push(...r20.platforms);
    pool = r20.pool;

    const r21 = this.applyRule21_Combo20_Empty40_20WithCg(pool, rules);
    allPlatforms.push(...r21.platforms);
    pool = r21.pool;
	
	const r22 = this.applyRule22_ComboEmpty20_40_Empty20(pool, rules);
    allPlatforms.push(...r22.platforms);
    pool = r22.pool;
	
	const r23 = this.applyRule23_Combo30_Empty20_30NoCg(pool, rules);
    allPlatforms.push(...r23.platforms);
    pool = r23.pool;

    const r24 = this.applyRule24_Combo30_Empty20_30WithCg(pool, rules);
    allPlatforms.push(...r24.platforms);
    pool = r24.pool;
	
	const r25 = this.applyRule25_Quad20_2EmptyCenterNoCg(pool, rules);
    allPlatforms.push(...r25.platforms);
    pool = r25.pool;

    const r26 = this.applyRule26_Quad20_2EmptyCenterWithCg(pool, rules);
    allPlatforms.push(...r26.platforms);
    pool = r26.pool;
	
	const r27 = this.applyRule27_Triple20_EmptyCenterNoCg(pool, rules);
    allPlatforms.push(...r27.platforms);
    pool = r27.pool;

    const r28 = this.applyRule28_Triple20_EmptyCenterWithCg(pool, rules);
    allPlatforms.push(...r28.platforms);
    pool = r28.pool;

    // 3. Парные неполные схемы: пары 30' (R4, R5) и пары 2×20' (R10, R11)
    const r4 = this.applyRule4_Pair30NoCg(pool, rules);
    allPlatforms.push(...r4.platforms);
    pool = r4.pool;

    const r5 = this.applyRule5_Pair30WithCg(pool, rules);
    allPlatforms.push(...r5.platforms);
    pool = r5.pool;

    const r10 = this.applyRule10_Pair20NoCg(pool, rules);
    allPlatforms.push(...r10.platforms);
    pool = r10.pool;

    const r11 = this.applyRule11_Pair20WithCg(pool, rules);
    allPlatforms.push(...r11.platforms);
    pool = r11.pool;
	
	// Двухконтейнерные смешанные комбинации: 40' + 20' (R16, R17)
    const r16 = this.applyRule16_Combo40_20NoCg(pool, rules);
    allPlatforms.push(...r16.platforms);
    pool = r16.pool;

    const r17 = this.applyRule17_Combo40_20WithCg(pool, rules);
    allPlatforms.push(...r17.platforms);
    pool = r17.pool;
	
	const r18 = this.applyRule18_Combo30_20NoCg(pool, rules);
    allPlatforms.push(...r18.platforms);
    pool = r18.pool;

    const r19 = this.applyRule19_Combo30_20WithCg(pool, rules);
    allPlatforms.push(...r19.platforms);
    pool = r19.pool;
	
	// 4. Размещение оставшихся порожних КТК по схемам R29
    const r29 = this.applyEmptyOnlyRules(pool, rules);
    allPlatforms.push(...r29.platforms);
    pool = r29.pool;

    // 2. В самом конце — одиночное размещение оставшихся КТК по центру платформы
    const finalRes = this.applyFinalSingles(pool, rules);
    allPlatforms.push(...finalRes.platforms);

    // Нумеруем итоговые платформы
    const platforms = allPlatforms.map((p, idx) => {
      const slotCenters = rules.slotCentersByScheme[p.scheme];
      const axleLoads = this.calcAxleLoads(p.containers, slotCenters, rules);
      return {
        index: idx + 1,
        ...p,
        axleLoads,
      };
    });

    return {
      platforms,
      unplaced: finalRes.unplaced
    };
  }
};
