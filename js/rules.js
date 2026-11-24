"use strict";
window.KTK = window.KTK || {};

window.KTK.RULES = {
  platform: {
    maxCargoMassT: 69.0,
    loadingLengthM: 24.45,
    singleLoadedMaxMassT: 36.0, // Любой одиночный гружёный КТК (40', 30', 20') в центре <= 36 т
    single40MaxMassT: 36.0,
    single30MaxMassT: 36.0,
    empty40MassT: 4.0,  // Масса порожнего 40', т
    empty30MassT: 3.1,  // Масса порожнего 30', т
    empty20MassT: 2.2,  // Масса порожнего 20', т
    comboEmpty20_40_Max40MassT: 36.0,
  },

  // Правило 1: Пара 40' без смещения ЦТ (|m1 - m2| <= maxDiffT)
  pair40NoCgDiffTable: [
    { maxSumT: 10, maxDiffT: 0.4 },
    { maxSumT: 15, maxDiffT: 5.4 },
    { maxSumT: 20, maxDiffT: 7.0 },
    { maxSumT: 25, maxDiffT: 8.0 },
    { maxSumT: 30, maxDiffT: 9.0 },
    { maxSumT: 35, maxDiffT: 10.0 },
    { maxSumT: 40, maxDiffT: 12.0 },
    { maxSumT: 45, maxDiffT: 13.0 },
    { maxSumT: 50, maxDiffT: 13.0 },
    { maxSumT: 55, maxDiffT: 11.0 },
    { maxSumT: 60, maxDiffT: 8.0 },
    { maxSumT: 65, maxDiffT: 4.0 },
    { maxSumT: 69, maxDiffT: 1.5 },
  ],

  // Правило 3: Пара 40' со смещением ЦТ (|m1 - m2| <= maxDiffT и |cg| <= maxCgMm для каждого КТК)
  pair40WithCgTable: [
    { maxSumT: 10, maxDiffT: 0.4, maxCgMm: 1200 },
    { maxSumT: 20, maxDiffT: 3.0, maxCgMm: 1200 },
    { maxSumT: 35, maxDiffT: 3.5, maxCgMm: 1200 },
    { maxSumT: 50, maxDiffT: 4.0, maxCgMm: 1200 },
    { maxSumT: 55, maxDiffT: 1.0, maxCgMm: 1200 },
    { maxSumT: 60, maxDiffT: 0.0, maxCgMm: 860 },
    { maxSumT: 65, maxDiffT: 0.0, maxCgMm: 456 },
    { maxSumT: 69, maxDiffT: 0.0, maxCgMm: 173 },
  ],
  
  // Правило 4: Пара 30' по краям платформы без смещения ЦТ (|m1 - m2| <= maxDiffT)
  pair30NoCgDiffTable: [
    { maxSumT: 10, maxDiffT: 2.0 },
    { maxSumT: 15, maxDiffT: 4.0 },
    { maxSumT: 20, maxDiffT: 5.0 },
    { maxSumT: 25, maxDiffT: 6.0 },
    { maxSumT: 30, maxDiffT: 7.0 },
    { maxSumT: 35, maxDiffT: 8.0 },
    { maxSumT: 40, maxDiffT: 9.0 },
    { maxSumT: 45, maxDiffT: 10.0 },
    { maxSumT: 50, maxDiffT: 11.0 },
    { maxSumT: 55, maxDiffT: 9.0 },
    { maxSumT: 60, maxDiffT: 6.0 },
    { maxSumT: 65, maxDiffT: 3.0 },
    { maxSumT: 69, maxDiffT: 1.5 },
  ],
  
  // Правило 5: Пара 30' по краям платформы со смещением ЦТ
  pair30WithCgTable: [
    { maxSumT: 15, maxDiffT: 2.0, maxCgMm: 900 },
    { maxSumT: 20, maxDiffT: 3.4, maxCgMm: 900 },
    { maxSumT: 25, maxDiffT: 3.5, maxCgMm: 900 },
    { maxSumT: 30, maxDiffT: 4.0, maxCgMm: 900 },
    { maxSumT: 40, maxDiffT: 4.5, maxCgMm: 900 },
    { maxSumT: 45, maxDiffT: 5.5, maxCgMm: 900 },
    { maxSumT: 50, maxDiffT: 5.0, maxCgMm: 900 },
    { maxSumT: 55, maxDiffT: 3.0, maxCgMm: 900 },
    { maxSumT: 60, maxDiffT: 0.0, maxCgMm: 860 },
    { maxSumT: 65, maxDiffT: 0.0, maxCgMm: 456 },
    { maxSumT: 69, maxDiffT: 0.0, maxCgMm: 173 },
  ],
  
  // Правило 6: Четвёрка 20' без смещения ЦТ [Край1, Внутр1, Внутр2, Край2]
  // maxInnerDiffT (1-е число) — допуск разницы масс для внутренних (2-го и 3-го)
  // maxOuterDiffT (2-е число) — допуск разницы масс для крайних (1-го и 4-го)
  quad20NoCgTable: [
    { maxSumT: 10, maxInnerDiffT: 0.0, maxOuterDiffT: 0.0 },
    { maxSumT: 15, maxInnerDiffT: 1.5, maxOuterDiffT: 3.5 },
    { maxSumT: 20, maxInnerDiffT: 2.0, maxOuterDiffT: 4.0 },
    { maxSumT: 25, maxInnerDiffT: 2.5, maxOuterDiffT: 4.5 },
    { maxSumT: 30, maxInnerDiffT: 2.5, maxOuterDiffT: 5.5 },
    { maxSumT: 35, maxInnerDiffT: 3.0, maxOuterDiffT: 6.0 },
    { maxSumT: 45, maxInnerDiffT: 3.0, maxOuterDiffT: 7.0 },
    { maxSumT: 50, maxInnerDiffT: 4.0, maxOuterDiffT: 8.0 },
    { maxSumT: 55, maxInnerDiffT: 3.0, maxOuterDiffT: 6.0 },
    { maxSumT: 60, maxInnerDiffT: 3.0, maxOuterDiffT: 4.0 },
    { maxSumT: 65, maxInnerDiffT: 1.5, maxOuterDiffT: 2.5 },
    { maxSumT: 69, maxInnerDiffT: 0.9, maxOuterDiffT: 0.9 },
  ],
  
  // Правило 7: Четвёрка 20' со смещением ЦТ [Край1, Внутр1, Внутр2, Край2]
  // maxOuterDiffT (1-е число) — разница крайних (1-го и 4-го)
  // maxInnerDiffT (2-е число) — разница внутренних (2-го и 3-го)
  // maxCgMm (3-е число) — макс. смещение ЦТ по модулю для каждого из 4 КТК
  quad20WithCgTable: [
    { maxSumT: 10, maxOuterDiffT: 0.0,  maxInnerDiffT: 0.0,  maxCgMm: 600 },
    { maxSumT: 15, maxOuterDiffT: 2.9,  maxInnerDiffT: 0.5,  maxCgMm: 600 },
    { maxSumT: 20, maxOuterDiffT: 2.8,  maxInnerDiffT: 2.0,  maxCgMm: 600 },
    { maxSumT: 25, maxOuterDiffT: 3.0,  maxInnerDiffT: 2.5,  maxCgMm: 600 },
    { maxSumT: 30, maxOuterDiffT: 3.3,  maxInnerDiffT: 3.5,  maxCgMm: 600 },
    { maxSumT: 35, maxOuterDiffT: 3.7,  maxInnerDiffT: 3.5,  maxCgMm: 600 },
    { maxSumT: 40, maxOuterDiffT: 4.05, maxInnerDiffT: 3.75, maxCgMm: 600 },
    { maxSumT: 45, maxOuterDiffT: 4.5,  maxInnerDiffT: 4.0,  maxCgMm: 600 },
    { maxSumT: 50, maxOuterDiffT: 4.3,  maxInnerDiffT: 4.5,  maxCgMm: 600 },
    { maxSumT: 55, maxOuterDiffT: 3.1,  maxInnerDiffT: 3.5,  maxCgMm: 600 },
    { maxSumT: 60, maxOuterDiffT: 1.1,  maxInnerDiffT: 1.5,  maxCgMm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0,  maxInnerDiffT: 0.0,  maxCgMm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0,  maxInnerDiffT: 0.0,  maxCgMm: 173 },
  ],
  
   // Правило 8: Тройка 3×20' без смещения ЦТ [Край 1, Центр, Край 2]
  // Самый тяжёлый КТК не может стоять в центре; maxOuterDiffT — допуск разницы масс крайних
  triple20NoCgTable: [
    { maxSumT: 10, maxOuterDiffT: 2.5 },
    { maxSumT: 15, maxOuterDiffT: 3.5 },
    { maxSumT: 20, maxOuterDiffT: 4.5 },
    { maxSumT: 30, maxOuterDiffT: 5.5 },
    { maxSumT: 35, maxOuterDiffT: 6.5 },
    { maxSumT: 40, maxOuterDiffT: 7.5 },
    { maxSumT: 50, maxOuterDiffT: 8.5 },
    { maxSumT: 55, maxOuterDiffT: 7.5 },
    { maxSumT: 60, maxOuterDiffT: 5.5 },
    { maxSumT: 65, maxOuterDiffT: 3.0 },
    { maxSumT: 69, maxOuterDiffT: 1.5 },
  ],
  
  // Правило 9: Тройка 3×20' со смещением ЦТ [Край 1, Центр, Край 2]
  // Самый тяжёлый КТК не может стоять в центре; maxOuterDiffT — разница крайних; maxCgMm — допуск ЦТ для каждого КТК
  triple20WithCgTable: [
    { maxSumT: 10, maxOuterDiffT: 2.5,  maxCgMm: 600 },
    { maxSumT: 15, maxOuterDiffT: 5.0,  maxCgMm: 600 },
    { maxSumT: 20, maxOuterDiffT: 3.5,  maxCgMm: 600 },
    { maxSumT: 25, maxOuterDiffT: 3.7,  maxCgMm: 600 },
    { maxSumT: 30, maxOuterDiffT: 4.2,  maxCgMm: 600 },
    { maxSumT: 35, maxOuterDiffT: 4.7,  maxCgMm: 600 },
    { maxSumT: 40, maxOuterDiffT: 5.2,  maxCgMm: 600 },
    { maxSumT: 50, maxOuterDiffT: 5.75, maxCgMm: 600 },
    { maxSumT: 55, maxOuterDiffT: 4.3,  maxCgMm: 600 },
    { maxSumT: 60, maxOuterDiffT: 1.5,  maxCgMm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0,  maxCgMm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0,  maxCgMm: 173 },
  ],
  
   // Правило 10: Пара 2×20' по краям платформы без смещения ЦТ (|m1 - m2| <= maxDiffT)
  pair20NoCgDiffTable: [
    { maxSumT: 10, maxDiffT: 3.2 },
    { maxSumT: 20, maxDiffT: 4.0 },
    { maxSumT: 25, maxDiffT: 5.0 },
    { maxSumT: 30, maxDiffT: 6.0 },
    { maxSumT: 35, maxDiffT: 7.0 },
    { maxSumT: 45, maxDiffT: 8.0 },
    { maxSumT: 50, maxDiffT: 9.0 },
    { maxSumT: 55, maxDiffT: 7.0 },
    { maxSumT: 60, maxDiffT: 5.0 },
    { maxSumT: 65, maxDiffT: 3.0 },
    { maxSumT: 69, maxDiffT: 1.2 },
  ],

  // Правило 11: Пара 2×20' по краям платформы со смещением ЦТ
  pair20WithCgTable: [
    { maxSumT: 10, maxDiffT: 2.5, maxCgMm: 600 },
    { maxSumT: 15, maxDiffT: 3.0, maxCgMm: 600 },
    { maxSumT: 20, maxDiffT: 3.5, maxCgMm: 600 },
    { maxSumT: 25, maxDiffT: 3.8, maxCgMm: 600 },
    { maxSumT: 30, maxDiffT: 4.4, maxCgMm: 600 },
    { maxSumT: 35, maxDiffT: 4.8, maxCgMm: 600 },
    { maxSumT: 40, maxDiffT: 5.2, maxCgMm: 600 },
    { maxSumT: 50, maxDiffT: 5.8, maxCgMm: 600 },
    { maxSumT: 55, maxDiffT: 4.2, maxCgMm: 600 },
    { maxSumT: 60, maxDiffT: 1.6, maxCgMm: 600 },
    { maxSumT: 65, maxDiffT: 0.0, maxCgMm: 456 },
    { maxSumT: 69, maxDiffT: 0.0, maxCgMm: 173 },
  ],
  
    // Правило 12: Комбинация [20', 40', 20'] без смещения ЦТ
  // 40' в центре, 20' по краям; maxOuterDiffT — допуск разницы масс только между двумя 20'
  combo20_40_20NoCgTable: [
    { maxSumT: 10, maxOuterDiffT: 0.0 },
    { maxSumT: 20, maxOuterDiffT: 4.0 },
    { maxSumT: 25, maxOuterDiffT: 5.0 },
    { maxSumT: 30, maxOuterDiffT: 6.0 },
    { maxSumT: 35, maxOuterDiffT: 7.0 },
    { maxSumT: 45, maxOuterDiffT: 8.0 },
    { maxSumT: 50, maxOuterDiffT: 9.0 },
    { maxSumT: 55, maxOuterDiffT: 7.0 },
    { maxSumT: 60, maxOuterDiffT: 5.0 },
    { maxSumT: 65, maxOuterDiffT: 3.0 },
    { maxSumT: 69, maxOuterDiffT: 1.3 },
  ],

  // Правило 13: Комбинация [20', 40', 20'] со смещением ЦТ
  // maxOuterDiffT — разница масс крайних 20'; maxCg40Mm — допуск ЦТ для 40'; maxCg20Mm — допуск ЦТ для 20'
  combo20_40_20WithCgTable: [
    { maxSumT: 10, maxOuterDiffT: 0.0, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 15, maxOuterDiffT: 2.5, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 20, maxOuterDiffT: 2.7, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 25, maxOuterDiffT: 2.8, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 30, maxOuterDiffT: 3.0, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 35, maxOuterDiffT: 3.1, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 40, maxOuterDiffT: 3.3, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 45, maxOuterDiffT: 3.4, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 50, maxOuterDiffT: 3.6, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 55, maxOuterDiffT: 2.0, maxCg40Mm: 1200, maxCg20Mm: 600 },
    { maxSumT: 60, maxOuterDiffT: 1.5, maxCg40Mm: 600,  maxCg20Mm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0, maxCg40Mm: 456,  maxCg20Mm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0, maxCg40Mm: 173,  maxCg20Mm: 173 },
  ],

 // Правило 14: Комбинация [30', 20', 30'] без смещения ЦТ
  // 20' в центре, 30' по краям; maxOuterDiffT — допуск разницы масс между двумя 30'
  combo30_20_30NoCgTable: [
    { maxSumT: 15, maxOuterDiffT: 4.5 },
    { maxSumT: 20, maxOuterDiffT: 5.5 },
    { maxSumT: 25, maxOuterDiffT: 6.5 },
    { maxSumT: 30, maxOuterDiffT: 7.5 },
    { maxSumT: 35, maxOuterDiffT: 8.5 },
    { maxSumT: 40, maxOuterDiffT: 9.5 },
    { maxSumT: 50, maxOuterDiffT: 10.5 },
    { maxSumT: 55, maxOuterDiffT: 9.5 },
    { maxSumT: 60, maxOuterDiffT: 6.5 },
    { maxSumT: 65, maxOuterDiffT: 3.5 },
    { maxSumT: 69, maxOuterDiffT: 1.5 },
  ],

  // Правило 15: Комбинация [30', 20', 30'] со смещением ЦТ
  // maxOuterDiffT — разница масс крайних 30'; maxCg30Mm — допуск ЦТ для 30'; maxCg20Mm — допуск ЦТ для 20'
  combo30_20_30WithCgTable: [
    { maxSumT: 15, maxOuterDiffT: 3.0, maxCg30Mm: 900, maxCg20Mm: 600 },
    { maxSumT: 20, maxOuterDiffT: 3.5, maxCg30Mm: 900, maxCg20Mm: 600 },
    { maxSumT: 30, maxOuterDiffT: 4.0, maxCg30Mm: 900, maxCg20Mm: 600 },
    { maxSumT: 35, maxOuterDiffT: 4.5, maxCg30Mm: 900, maxCg20Mm: 600 },
    { maxSumT: 40, maxOuterDiffT: 5.0, maxCg30Mm: 900, maxCg20Mm: 600 },
    { maxSumT: 50, maxOuterDiffT: 5.3, maxCg30Mm: 900, maxCg20Mm: 600 },
    { maxSumT: 55, maxOuterDiffT: 3.1, maxCg30Mm: 900, maxCg20Mm: 600 },
    { maxSumT: 60, maxOuterDiffT: 1.9, maxCg30Mm: 600, maxCg20Mm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0, maxCg30Mm: 456, maxCg20Mm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0, maxCg30Mm: 456, maxCg20Mm: 456 },
  ],
  
  // Правило 16: Комбинация 40' + 20' по краям платформы без смещения ЦТ
  // maxMass20T — масса 20' до указанного значения; [minMass40T, maxMass40T] — допустимый диапазон масс 40'
  combo40_20NoCgTable: [
    { maxMass20T: 2.5, minMass40T: 0.0,  maxMass40T: 9.0  },
    { maxMass20T: 3.0, minMass40T: 0.0,  maxMass40T: 10.0 },
    { maxMass20T: 4.0, minMass40T: 0.0,  maxMass40T: 12.0 },
    { maxMass20T: 5.0, minMass40T: 0.0,  maxMass40T: 14.5 },
    { maxMass20T: 6.0, minMass40T: 0.0,  maxMass40T: 17.0 },
    { maxMass20T: 7.0, minMass40T: 5.1,  maxMass40T: 19.0 },
    { maxMass20T: 8.0, minMass40T: 6.1,  maxMass40T: 21.5 },
    { maxMass20T: 9.0, minMass40T: 7.2,  maxMass40T: 23.5 },
    { maxMass20T: 10.0, minMass40T: 8.2, maxMass40T: 26.0 },
    { maxMass20T: 11.0, minMass40T: 9.5, maxMass40T: 28.0 },
    { maxMass20T: 12.0, minMass40T: 10.5, maxMass40T: 30.5 },
    { maxMass20T: 13.0, minMass40T: 11.5, maxMass40T: 32.5 },
    { maxMass20T: 14.0, minMass40T: 12.5, maxMass40T: 34.5 },
    { maxMass20T: 15.0, minMass40T: 13.5, maxMass40T: 36.0 },
    { maxMass20T: 16.0, minMass40T: 14.5, maxMass40T: 36.0 },
    { maxMass20T: 17.0, minMass40T: 15.5, maxMass40T: 36.0 },
    { maxMass20T: 18.0, minMass40T: 16.5, maxMass40T: 36.0 },
    { maxMass20T: 19.0, minMass40T: 17.5, maxMass40T: 36.0 },
    { maxMass20T: 20.0, minMass40T: 18.5, maxMass40T: 36.0 },
    { maxMass20T: 21.0, minMass40T: 19.5, maxMass40T: 36.0 },
    { maxMass20T: 22.0, minMass40T: 20.5, maxMass40T: 36.0 },
    { maxMass20T: 23.0, minMass40T: 21.5, maxMass40T: 36.0 },
    { maxMass20T: 24.0, minMass40T: 23.0, maxMass40T: 36.0 },
    { maxMass20T: 25.0, minMass40T: 24.0, maxMass40T: 36.0 },
    { maxMass20T: 26.0, minMass40T: 26.0, maxMass40T: 36.0 },
    { maxMass20T: 27.0, minMass40T: 30.0, maxMass40T: 36.0 },
  ],

  // Правило 17: Комбинация 40' + 20' по краям платформы со смещением ЦТ
  combo40_20WithCgTable: [
    { maxMass20T: 2.5,  minMass40T: 0.0,  maxMass40T: 6.6,  maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 3.0,  minMass40T: 2.6,  maxMass40T: 7.8,  maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 4.0,  minMass40T: 3.5,  maxMass40T: 9.5,  maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 5.0,  minMass40T: 4.3,  maxMass40T: 11.2, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 6.0,  minMass40T: 5.4,  maxMass40T: 12.9, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 7.0,  minMass40T: 6.7,  maxMass40T: 14.6, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 8.0,  minMass40T: 8.1,  maxMass40T: 16.3, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 9.0,  minMass40T: 9.3,  maxMass40T: 18.0, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 10.0, minMass40T: 10.7, maxMass40T: 19.7, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 11.0, minMass40T: 12.0, maxMass40T: 21.4, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 12.0, minMass40T: 13.3, maxMass40T: 23.1, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 13.0, minMass40T: 14.6, maxMass40T: 24.8, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 14.0, minMass40T: 15.9, maxMass40T: 26.5, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 15.0, minMass40T: 17.2, maxMass40T: 28.3, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 16.0, minMass40T: 18.6, maxMass40T: 29.9, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 17.0, minMass40T: 19.9, maxMass40T: 31.3, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 18.0, minMass40T: 21.2, maxMass40T: 32.5, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 19.0, minMass40T: 22.5, maxMass40T: 33.2, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 20.0, minMass40T: 23.7, maxMass40T: 33.8, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 21.0, minMass40T: 25.2, maxMass40T: 34.4, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 22.0, minMass40T: 26.7, maxMass40T: 34.8, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 23.0, minMass40T: 29.7, maxMass40T: 35.1, maxCg20Mm: 600, maxCg40Mm: 1200 },
    { maxMass20T: 24.0, minMass40T: 27.9, maxMass40T: 36.0, maxCg20Mm: 600, maxCg40Mm: 600  },
    { maxMass20T: 25.0, minMass40T: 30.3, maxMass40T: 36.0, maxCg20Mm: 500, maxCg40Mm: 500  },
    { maxMass20T: 26.0, minMass40T: 34.1, maxMass40T: 36.0, maxCg20Mm: 350, maxCg40Mm: 350  },
    { maxMass20T: 27.0, minMass40T: 34.0, maxMass40T: 36.0, maxCg20Mm: 120, maxCg40Mm: 120  },
  ],
  
    // Правило 18: Комбинация 30' + 20' по краям платформы без смещения ЦТ
  // maxMass20T — масса 20' до указанного значения; [minMass30T, maxMass30T] — допустимый диапазон масс 30'
  combo30_20NoCgTable: [
    { maxMass20T: 2.5,  minMass30T: 0.0,  maxMass30T: 6.5  },
    { maxMass20T: 3.0,  minMass30T: 0.0,  maxMass30T: 7.5  },
    { maxMass20T: 4.0,  minMass30T: 0.0,  maxMass30T: 9.0  },
    { maxMass20T: 5.0,  minMass30T: 0.0,  maxMass30T: 11.0 },
    { maxMass20T: 6.0,  minMass30T: 0.0,  maxMass30T: 12.5 },
    { maxMass20T: 7.0,  minMass30T: 4.5,  maxMass30T: 14.5 },
    { maxMass20T: 8.0,  minMass30T: 5.5,  maxMass30T: 16.0 },
    { maxMass20T: 9.0,  minMass30T: 6.0,  maxMass30T: 17.5 },
    { maxMass20T: 10.0, minMass30T: 7.0,  maxMass30T: 19.5 },
    { maxMass20T: 11.0, minMass30T: 8.0,  maxMass30T: 21.0 },
    { maxMass20T: 12.0, minMass30T: 8.5,  maxMass30T: 23.0 },
    { maxMass20T: 13.0, minMass30T: 9.5,  maxMass30T: 24.5 },
    { maxMass20T: 14.0, minMass30T: 10.5, maxMass30T: 26.5 },
    { maxMass20T: 15.0, minMass30T: 11.5, maxMass30T: 28.0 },
    { maxMass20T: 16.0, minMass30T: 12.0, maxMass30T: 29.5 },
    { maxMass20T: 17.0, minMass30T: 13.0, maxMass30T: 31.0 },
    { maxMass20T: 18.0, minMass30T: 14.0, maxMass30T: 32.5 },
    { maxMass20T: 19.0, minMass30T: 14.5, maxMass30T: 33.0 },
    { maxMass20T: 20.0, minMass30T: 15.5, maxMass30T: 33.5 },
    { maxMass20T: 21.0, minMass30T: 16.5, maxMass30T: 34.5 },
    { maxMass20T: 22.0, minMass30T: 17.0, maxMass30T: 34.5 },
    { maxMass20T: 23.0, minMass30T: 18.0, maxMass30T: 34.5 },
    { maxMass20T: 24.0, minMass30T: 19.0, maxMass30T: 34.5 },
    { maxMass20T: 25.0, minMass30T: 20.0, maxMass30T: 34.5 },
    { maxMass20T: 26.0, minMass30T: 21.5, maxMass30T: 34.5 },
    { maxMass20T: 27.0, minMass30T: 21.5, maxMass30T: 34.5 },
    { maxMass20T: 28.0, minMass30T: 23.0, maxMass30T: 34.5 },
    { maxMass20T: 29.0, minMass30T: 25.0, maxMass30T: 34.5 },
    { maxMass20T: 30.0, minMass30T: 28.5, maxMass30T: 34.5 },
    { maxMass20T: 31.0, minMass30T: 33.0, maxMass30T: 34.5 },
  ],

  // Правило 19: Комбинация 30' + 20' по краям платформы со смещением ЦТ
  combo30_20WithCgTable: [
    { maxMass20T: 2.5,  minMass30T: 0.0,  maxMass30T: 5.2,  maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 3.0,  minMass30T: 0.0,  maxMass30T: 6.2,  maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 4.0,  minMass30T: 2.8,  maxMass30T: 8.3,  maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 5.0,  minMass30T: 3.5,  maxMass30T: 9.2,  maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 6.0,  minMass30T: 4.2,  maxMass30T: 10.6, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 7.0,  minMass30T: 5.2,  maxMass30T: 12.1, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 8.0,  minMass30T: 6.3,  maxMass30T: 13.5, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 9.0,  minMass30T: 7.3,  maxMass30T: 14.9, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 10.0, minMass30T: 8.3,  maxMass30T: 16.3, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 11.0, minMass30T: 9.3,  maxMass30T: 17.7, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 12.0, minMass30T: 10.3, maxMass30T: 19.1, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 13.0, minMass30T: 11.4, maxMass30T: 20.5, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 14.0, minMass30T: 12.4, maxMass30T: 21.9, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 15.0, minMass30T: 13.4, maxMass30T: 23.3, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 16.0, minMass30T: 14.4, maxMass30T: 24.7, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 17.0, minMass30T: 15.4, maxMass30T: 26.2, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 18.0, minMass30T: 16.5, maxMass30T: 27.5, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 19.0, minMass30T: 17.5, maxMass30T: 28.8, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 20.0, minMass30T: 18.5, maxMass30T: 29.9, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 21.0, minMass30T: 19.5, maxMass30T: 30.6, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 22.0, minMass30T: 20.5, maxMass30T: 31.1, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 23.0, minMass30T: 21.5, maxMass30T: 31.7, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 24.0, minMass30T: 22.6, maxMass30T: 32.1, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 25.0, minMass30T: 23.8, maxMass30T: 32.4, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 26.0, minMass30T: 25.6, maxMass30T: 32.7, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 27.0, minMass30T: 28.7, maxMass30T: 33.0, maxCg20Mm: 600, maxCg30Mm: 900 },
    { maxMass20T: 28.0, minMass30T: 30.7, maxMass30T: 34.2, maxCg20Mm: 600, maxCg30Mm: 600 },
    { maxMass20T: 29.0, minMass30T: 31.6, maxMass30T: 34.5, maxCg20Mm: 400, maxCg30Mm: 400 },
    { maxMass20T: 30.0, minMass30T: 32.1, maxMass30T: 34.5, maxCg20Mm: 200, maxCg30Mm: 200 },
    { maxMass20T: 31.0, minMass30T: 32.4, maxMass30T: 34.5, maxCg20Mm: 0,   maxCg30Mm: 0   },
  ],
  
    // Правило 20: Комбинация [20', порожний 40' (4 т), 20'] без смещения ЦТ
  // Порожний 40' в центре (4 т), 20' по краям; maxOuterDiffT — допуск разницы масс крайних 20'
  combo20_Empty40_20NoCgTable: [
    { maxSumT: 10, maxOuterDiffT: 0.0 },
    { maxSumT: 20, maxOuterDiffT: 4.0 },
    { maxSumT: 25, maxOuterDiffT: 5.0 },
    { maxSumT: 30, maxOuterDiffT: 6.0 },
    { maxSumT: 35, maxOuterDiffT: 7.0 },
    { maxSumT: 45, maxOuterDiffT: 8.0 },
    { maxSumT: 50, maxOuterDiffT: 9.0 },
    { maxSumT: 55, maxOuterDiffT: 7.0 },
    { maxSumT: 60, maxOuterDiffT: 5.0 },
    { maxSumT: 65, maxOuterDiffT: 3.0 },
    { maxSumT: 69, maxOuterDiffT: 1.3 },
  ],

  // Правило 21: Комбинация [20', порожний 40' (4 т), 20'] со смещением ЦТ
  // maxOuterDiffT — разница масс крайних 20'; maxCg20Mm — допуск ЦТ для каждого 20'
  combo20_Empty40_20WithCgTable: [
    { maxSumT: 10, maxOuterDiffT: 0.0, maxCg20Mm: 600 },
    { maxSumT: 15, maxOuterDiffT: 3.2, maxCg20Mm: 600 },
    { maxSumT: 20, maxOuterDiffT: 3.8, maxCg20Mm: 600 },
    { maxSumT: 25, maxOuterDiffT: 4.2, maxCg20Mm: 600 },
    { maxSumT: 30, maxOuterDiffT: 4.6, maxCg20Mm: 600 },
    { maxSumT: 35, maxOuterDiffT: 5.2, maxCg20Mm: 600 },
    { maxSumT: 40, maxOuterDiffT: 5.6, maxCg20Mm: 600 },
    { maxSumT: 45, maxOuterDiffT: 6.0, maxCg20Mm: 600 },
    { maxSumT: 50, maxOuterDiffT: 6.2, maxCg20Mm: 600 },
    { maxSumT: 55, maxOuterDiffT: 4.6, maxCg20Mm: 600 },
    { maxSumT: 60, maxOuterDiffT: 2.0, maxCg20Mm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0, maxCg20Mm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0, maxCg20Mm: 173 },
  ],
  
   // Правило 23: Комбинация [30', порожний 20' (2.2 т), 30'] без смещения ЦТ
  // Порожний 20' в центре (2.2 т), 30' по краям; maxOuterDiffT — разница масс крайних 30'
  combo30_Empty20_30NoCgTable: [
    { maxSumT: 15, maxOuterDiffT: 4.5 },
    { maxSumT: 20, maxOuterDiffT: 5.5 },
    { maxSumT: 25, maxOuterDiffT: 6.5 },
    { maxSumT: 30, maxOuterDiffT: 7.5 },
    { maxSumT: 35, maxOuterDiffT: 8.5 },
    { maxSumT: 40, maxOuterDiffT: 9.5 },
    { maxSumT: 50, maxOuterDiffT: 10.5 },
    { maxSumT: 55, maxOuterDiffT: 9.5 },
    { maxSumT: 60, maxOuterDiffT: 6.5 },
    { maxSumT: 65, maxOuterDiffT: 3.5 },
    { maxSumT: 69, maxOuterDiffT: 1.5 },
  ],

  // Правило 24: Комбинация [30', порожний 20' (2.2 т), 30'] со смещением ЦТ
  // maxOuterDiffT — разница масс крайних 30'; maxCg30Mm — допуск ЦТ для каждого 30'
  combo30_Empty20_30WithCgTable: [
    { maxSumT: 15, maxOuterDiffT: 3.3, maxCg30Mm: 900 },
    { maxSumT: 20, maxOuterDiffT: 3.7, maxCg30Mm: 900 },
    { maxSumT: 25, maxOuterDiffT: 4.1, maxCg30Mm: 900 },
    { maxSumT: 30, maxOuterDiffT: 4.3, maxCg30Mm: 900 },
    { maxSumT: 35, maxOuterDiffT: 4.7, maxCg30Mm: 900 },
    { maxSumT: 40, maxOuterDiffT: 5.1, maxCg30Mm: 900 },
    { maxSumT: 50, maxOuterDiffT: 5.5, maxCg30Mm: 900 },
    { maxSumT: 55, maxOuterDiffT: 3.3, maxCg30Mm: 900 },
    { maxSumT: 60, maxOuterDiffT: 2.1, maxCg30Mm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0, maxCg30Mm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0, maxCg30Mm: 173 },
  ],

  // Правило 25: Четвёрка [20', пор. 20' (2.2 т), пор. 20' (2.2 т), 20'] без смещения ЦТ
  // Два порожних 20' в центре (4.4 т), два гружёных 20' по краям; maxOuterDiffT — разница крайних
  quad20_2EmptyCenterNoCgTable: [
    { maxSumT: 10, maxOuterDiffT: 0.0 },
    { maxSumT: 20, maxOuterDiffT: 4.0 },
    { maxSumT: 25, maxOuterDiffT: 5.0 },
    { maxSumT: 30, maxOuterDiffT: 6.0 },
    { maxSumT: 35, maxOuterDiffT: 7.0 },
    { maxSumT: 40, maxOuterDiffT: 8.0 },
    { maxSumT: 45, maxOuterDiffT: 8.5 },
    { maxSumT: 50, maxOuterDiffT: 9.0 },
    { maxSumT: 55, maxOuterDiffT: 7.0 },
    { maxSumT: 60, maxOuterDiffT: 5.0 },
    { maxSumT: 65, maxOuterDiffT: 3.0 },
    { maxSumT: 69, maxOuterDiffT: 1.3 },
  ],

  // Правило 26: Четвёрка [20', пор. 20' (2.2 т), пор. 20' (2.2 т), 20'] со смещением ЦТ
  // maxOuterDiffT — разница крайних 20'; maxCg20Mm — допуск ЦТ для каждого крайнего 20'
  quad20_2EmptyCenterWithCgTable: [
    { maxSumT: 10, maxOuterDiffT: 0.0, maxCg20Mm: 600 },
    { maxSumT: 15, maxOuterDiffT: 3.2, maxCg20Mm: 600 },
    { maxSumT: 20, maxOuterDiffT: 3.8, maxCg20Mm: 600 },
    { maxSumT: 25, maxOuterDiffT: 4.2, maxCg20Mm: 600 },
    { maxSumT: 30, maxOuterDiffT: 4.6, maxCg20Mm: 600 },
    { maxSumT: 35, maxOuterDiffT: 5.2, maxCg20Mm: 600 },
    { maxSumT: 40, maxOuterDiffT: 5.6, maxCg20Mm: 600 },
    { maxSumT: 45, maxOuterDiffT: 6.0, maxCg20Mm: 600 },
    { maxSumT: 50, maxOuterDiffT: 6.2, maxCg20Mm: 600 },
    { maxSumT: 55, maxOuterDiffT: 4.6, maxCg20Mm: 600 },
    { maxSumT: 60, maxOuterDiffT: 2.0, maxCg20Mm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0, maxCg20Mm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0, maxCg20Mm: 173 },
  ],
  
    // Правило 27: Тройка [20', порожний 20' (2.2 т), 20'] без смещения ЦТ
  // Порожний 20' в центре (2.2 т), гружёные 20' по краям; maxOuterDiffT — разница крайних
  triple20_EmptyCenterNoCgTable: [
    { maxSumT: 10, maxOuterDiffT: 2.5 },
    { maxSumT: 15, maxOuterDiffT: 3.5 },
    { maxSumT: 20, maxOuterDiffT: 4.5 },
    { maxSumT: 25, maxOuterDiffT: 5.5 },
    { maxSumT: 30, maxOuterDiffT: 5.5 },
    { maxSumT: 35, maxOuterDiffT: 6.5 },
    { maxSumT: 45, maxOuterDiffT: 8.5 },
    { maxSumT: 50, maxOuterDiffT: 8.5 },
    { maxSumT: 55, maxOuterDiffT: 7.5 },
    { maxSumT: 60, maxOuterDiffT: 5.5 },
    { maxSumT: 65, maxOuterDiffT: 3.0 },
    { maxSumT: 69, maxOuterDiffT: 1.3 },
  ],

  // Правило 28: Тройка [20', порожний 20' (2.2 т), 20'] со смещением ЦТ
  // maxOuterDiffT — разница крайних 20'; maxCg20Mm — допуск ЦТ для каждого крайнего 20'
  triple20_EmptyCenterWithCgTable: [
    { maxSumT: 10, maxOuterDiffT: 2.5, maxCg20Mm: 600 },
    { maxSumT: 15, maxOuterDiffT: 3.1, maxCg20Mm: 600 },
    { maxSumT: 20, maxOuterDiffT: 3.7, maxCg20Mm: 600 },
    { maxSumT: 25, maxOuterDiffT: 4.1, maxCg20Mm: 600 },
    { maxSumT: 30, maxOuterDiffT: 4.5, maxCg20Mm: 600 },
    { maxSumT: 35, maxOuterDiffT: 4.9, maxCg20Mm: 600 },
    { maxSumT: 40, maxOuterDiffT: 5.5, maxCg20Mm: 600 },
    { maxSumT: 45, maxOuterDiffT: 5.9, maxCg20Mm: 600 },
    { maxSumT: 50, maxOuterDiffT: 6.1, maxCg20Mm: 600 },
    { maxSumT: 55, maxOuterDiffT: 4.5, maxCg20Mm: 600 },
    { maxSumT: 60, maxOuterDiffT: 1.7, maxCg20Mm: 600 },
    { maxSumT: 65, maxOuterDiffT: 0.0, maxCg20Mm: 456 },
    { maxSumT: 69, maxOuterDiffT: 0.0, maxCg20Mm: 173 },
  ],

  getMaxDiffForTriple20_EmptyCenterNoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.triple20_EmptyCenterNoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxOuterDiffT;
    }
    return -1;
  },

  getLimitsForTriple20_EmptyCenterWithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.triple20_EmptyCenterWithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },


  getMaxDiffForQuad20_2EmptyCenterNoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.quad20_2EmptyCenterNoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxOuterDiffT;
    }
    return -1;
  },

  getLimitsForQuad20_2EmptyCenterWithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.quad20_2EmptyCenterWithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },

  getMaxDiffForCombo30_Empty20_30NoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.combo30_Empty20_30NoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxOuterDiffT;
    }
    return -1;
  },

  getLimitsForCombo30_Empty20_30WithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.combo30_Empty20_30WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },
  
   // Правило 22: Комбинация [порожний 20' (2.2 т), гружёный 40' (<= 36 т), порожний 20' (2.2 т)]
  canComboEmpty20_40_Empty20(ktk40) {
    return (
      ktk40.type === "40" &&
      !ktk40.isEmpty &&
      ktk40.massT <= this.platform.comboEmpty20_40_Max40MassT + 1e-6
    )
  },

  getMaxDiffForCombo20_Empty40_20NoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.combo20_Empty40_20NoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxOuterDiffT;
    }
    return -1;
  },

  getLimitsForCombo20_Empty40_20WithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.combo20_Empty40_20WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },


  getLimitsForCombo30_20NoCg(mass20T) {
    for (const row of this.combo30_20NoCgTable) {
      if (mass20T <= row.maxMass20T + 1e-6) return row;
    }
    return null;
  },

  canCombo30_20NoCg(ktk30, ktk20) {
    const limits = this.getLimitsForCombo30_20NoCg(ktk20.massT);
    if (!limits) return false;
    return (
      ktk30.massT >= limits.minMass30T - 1e-6 &&
      ktk30.massT <= limits.maxMass30T + 1e-6
    );
  },

  getLimitsForCombo30_20WithCg(mass20T) {
    for (const row of this.combo30_20WithCgTable) {
      if (mass20T <= row.maxMass20T + 1e-6) return row;
    }
    return null;
  },

  canCombo30_20WithCg(ktk30, ktk20) {
    const limits = this.getLimitsForCombo30_20WithCg(ktk20.massT);
    if (!limits) return false;
    return (
      ktk30.massT >= limits.minMass30T - 1e-6 &&
      ktk30.massT <= limits.maxMass30T + 1e-6 &&
      Math.abs(ktk20.cgMm) <= limits.maxCg20Mm &&
      Math.abs(ktk30.cgMm) <= limits.maxCg30Mm
    );
  },


  getLimitsForCombo40_20NoCg(mass20T) {
    for (const row of this.combo40_20NoCgTable) {
      if (mass20T <= row.maxMass20T + 1e-6) return row;
    }
    return null;
  },

  canCombo40_20NoCg(ktk40, ktk20) {
    const limits = this.getLimitsForCombo40_20NoCg(ktk20.massT);
    if (!limits) return false;
    return (
      ktk40.massT >= limits.minMass40T - 1e-6 &&
      ktk40.massT <= limits.maxMass40T + 1e-6
    );
  },

  getLimitsForCombo40_20WithCg(mass20T) {
    for (const row of this.combo40_20WithCgTable) {
      if (mass20T <= row.maxMass20T + 1e-6) return row;
    }
    return null;
  },

  canCombo40_20WithCg(ktk40, ktk20) {
    const limits = this.getLimitsForCombo40_20WithCg(ktk20.massT);
    if (!limits) return false;
    return (
      ktk40.massT >= limits.minMass40T - 1e-6 &&
      ktk40.massT <= limits.maxMass40T + 1e-6 &&
      Math.abs(ktk20.cgMm) <= limits.maxCg20Mm &&
      Math.abs(ktk40.cgMm) <= limits.maxCg40Mm
    );
  },

  getMaxDiffForCombo30_20_30NoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.combo30_20_30NoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxOuterDiffT;
    }
    return -1;
  },

  getLimitsForCombo30_20_30WithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.combo30_20_30WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },
  
  getMaxDiffForCombo20_40_20NoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.combo20_40_20NoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxOuterDiffT;
    }
    return -1;
  },

  getLimitsForCombo20_40_20WithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.combo20_40_20WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },


  getMaxDiffFor20PairNoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.pair20NoCgDiffTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxDiffT;
    }
    return -1;
  },

  canPair20NoCg(ktkA, ktkB) {
    const sum = ktkA.massT + ktkB.massT;
    const diff = Math.abs(ktkA.massT - ktkB.massT);
    const maxAllowedDiff = this.getMaxDiffFor20PairNoCg(sum);
    return maxAllowedDiff >= 0 && diff <= maxAllowedDiff + 1e-6;
  },

  getLimitsFor20PairWithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.pair20WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },

  canPair20WithCg(ktkA, ktkB) {
    const sum = ktkA.massT + ktkB.massT;
    const diff = Math.abs(ktkA.massT - ktkB.massT);
    const limits = this.getLimitsFor20PairWithCg(sum);
    if (!limits) return false;

    const cgA = Math.abs(ktkA.cgMm);
    const cgB = Math.abs(ktkB.cgMm);
    return (
      diff <= limits.maxDiffT + 1e-6 &&
      cgA <= limits.maxCgMm &&
      cgB <= limits.maxCgMm
    );
  },

  getLimitsFor20TripleWithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.triple20WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },

  getMaxDiffFor20TripleNoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.triple20NoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxOuterDiffT;
    }
    return -1;
  },

  // --- Вспомогательные проверки ---

  getMaxDiffFor40NoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.pair40NoCgDiffTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxDiffT;
    }
    return -1;
  },

  canPair40NoCg(ktkA, ktkB) {
    const sum = ktkA.massT + ktkB.massT;
    const diff = Math.abs(ktkA.massT - ktkB.massT);
    const maxAllowedDiff = this.getMaxDiffFor40NoCg(sum);
    return maxAllowedDiff >= 0 && diff <= maxAllowedDiff + 1e-6;
  },
  
  getMaxDiffFor30NoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return -1;
    for (const row of this.pair30NoCgDiffTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row.maxDiffT;
    }
    return -1;
  },

  canPair30NoCg(ktkA, ktkB) {
    const sum = ktkA.massT + ktkB.massT;
    const diff = Math.abs(ktkA.massT - ktkB.massT);
    const maxAllowedDiff = this.getMaxDiffFor30NoCg(sum);
    return maxAllowedDiff >= 0 && diff <= maxAllowedDiff + 1e-6;
  },

  getLimitsFor40WithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.pair40WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },

  canPair40WithCg(ktkA, ktkB) {
    const sum = ktkA.massT + ktkB.massT;
    const diff = Math.abs(ktkA.massT - ktkB.massT);
    const limits = this.getLimitsFor40WithCg(sum);
    if (!limits) return false;

    const cgA = Math.abs(ktkA.cgMm);
    const cgB = Math.abs(ktkB.cgMm);
    return (
      diff <= limits.maxDiffT + 1e-6 &&
      cgA <= limits.maxCgMm &&
      cgB <= limits.maxCgMm
    );
  },
  
   getLimitsFor30WithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.pair30WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },

  canPair30WithCg(ktkA, ktkB) {
    const sum = ktkA.massT + ktkB.massT;
    const diff = Math.abs(ktkA.massT - ktkB.massT);
    const limits = this.getLimitsFor30WithCg(sum);
    if (!limits) return false;

    const cgA = Math.abs(ktkA.cgMm);
    const cgB = Math.abs(ktkB.cgMm);
    return (
      diff <= limits.maxDiffT + 1e-6 &&
      cgA <= limits.maxCgMm &&
      cgB <= limits.maxCgMm
    );
  },
  
  getLimitsFor20QuadNoCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.quad20NoCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },

  canQuad20NoCg(outer1, inner1, inner2, outer2) {
    const sum = outer1.massT + inner1.massT + inner2.massT + outer2.massT;
    const limits = this.getLimitsFor20QuadNoCg(sum);
    if (!limits) return false;

    const innerDiff = Math.abs(inner1.massT - inner2.massT);
    const outerDiff = Math.abs(outer1.massT - outer2.massT);

    return (
      innerDiff <= limits.maxInnerDiffT + 1e-6 &&
      outerDiff <= limits.maxOuterDiffT + 1e-6
    );
  },
  
   getLimitsFor20QuadWithCg(sumMassT) {
    if (sumMassT > this.platform.maxCargoMassT + 1e-6) return null;
    for (const row of this.quad20WithCgTable) {
      if (sumMassT <= row.maxSumT + 1e-6) return row;
    }
    return null;
  },

  canPlaceSingle30(ktk) {
    return (
      ktk.type === "30" &&
      !ktk.isEmpty &&
      ktk.massT <= this.platform.single30MaxMassT + 1e-6
    );
  },

  canPlaceSingle40(ktk) {
    return (
      ktk.type === "40" &&
      !ktk.isEmpty &&
      ktk.massT <= this.platform.single40MaxMassT + 1e-6
    );
  },
  
    canPlaceSingleLoaded(ktk) {
    return (
      !ktk.isEmpty &&
      ktk.massT <= this.platform.singleLoadedMaxMassT + 1e-6
    );
  },

};
