function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function renderZoneCanvas(canvasId, zoneObj, options = {}) {
  if (options.compact) {
    renderFlatZonePreview(canvasId, zoneObj, options);
  } else {
    renderIsometricZone(canvasId, zoneObj);
  }
}

// Плоская мини-карта с поддержкой двух встречных партий в одном слоте
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
        // Группируем рулоны в слоте по партиям (может быть 1 партия или 2 встречные)
        const byBatch = new Map();
        slot.coils.forEach(coil => {
          if (!byBatch.has(coil.batchId)) {
            byBatch.set(coil.batchId, {
              color: coil.color,
              side: coil.side || (r % 2 === 1 ? 'right' : 'left'),
              minX: coil.xStart,
              maxX: coil.xEnd
            });
          } else {
            const g = byBatch.get(coil.batchId);
            g.minX = Math.min(g.minX, coil.xStart);
            g.maxX = Math.max(g.maxX, coil.xEnd);
          }
        });

        byBatch.forEach(g => {
          const gx = x + (g.minX / slotL) * w;
          const gw = ((g.maxX - g.minX) / slotL) * w;
          ctx.fillStyle = g.color;
          ctx.fillRect(gx, y, gw, h);
        });
      }

      ctx.strokeStyle = '#57606a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#1f2328';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const filledCount = slot && slot.coils ? slot.coils.length : 0;
      const label = filledCount > 0 ? `#${idx + 1} (${filledCount}шт)` : `#${idx + 1}`;
      if (w > 34 && h > 14) {
        ctx.fillText(label, x + w / 2, y + h / 2);
      }
    }
  }
}

// Изометрическая 3D-отрисовка площадки
function renderIsometricZone(canvasId, zone) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (canvas.height < 480) canvas.height = 480;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sx = zone.slotsX;
  const sy = zone.slotsY;
  const slotL = 20.0;
  const slotW = 3.6;
  const gapY = 1.0;
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

  // Основание площадки (плита с бортиком)
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

  // ПРОХОД 1: Рисуем разметку пола и номера ВСЕХ слотов площадки
  for (let r = 0; r < sy; r++) {
    for (let c = 0; c < sx; c++) {
      const idx = r * sx + c;
      const slot = zone.slots[idx];
      const x0 = c * slotL;
      const y0 = r * (slotW + gapY);

      const s00 = toScreen(x0, y0, 0);
      const s10 = toScreen(x0 + slotL, y0, 0);
      const s11 = toScreen(x0 + slotL, y0 + slotW, 0);
      const s01 = toScreen(x0, y0 + slotW, 0);

      ctx.beginPath();
      ctx.moveTo(s00.x, s00.y);
      ctx.lineTo(s10.x, s10.y);
      ctx.lineTo(s11.x, s11.y);
      ctx.lineTo(s01.x, s01.y);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#8c959f';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const lblPos = toScreen(x0 + 1.2, y0 + slotW - 0.35, 0);
      ctx.fillStyle = '#57606a';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const filled = slot && slot.coils ? slot.coils.length : 0;
      ctx.fillText(filled > 0 ? `#${idx + 1} (${filled} шт.)` : `#${idx + 1}`, lblPos.x, lblPos.y);
    }
  }

  // ПРОХОД 2: Рисуем ВЕСЬ груз поверх готового пола
  for (let r = 0; r < sy; r++) {
    for (let c = sx - 1; c >= 0; c--) {
      const idx = r * sx + c;
      const slot = zone.slots[idx];
      if (!slot || !slot.coils || slot.coils.length === 0) continue;

      const x0 = c * slotL;
      const y0 = r * (slotW + gapY);
      const maxRow = slot.coils.reduce((m, item) => Math.max(m, item.row), 1);

      for (let row = 0; row <= maxRow; row++) {
        for (let tier = 1; tier <= 2; tier++) {
          const itemsInLayer = slot.coils
            .filter(item => item.row === row && item.tier === tier)
            .map(item => ({ ...item, localMid: (item.xStart + item.xEnd) / 2 }))
            .sort((a, b) => b.localMid - a.localMid);

          itemsInLayer.forEach(item => {
            const spec = ROLL_SPECS[item.weight] || ROLL_SPECS[8];

            if (spec.shape === 'bag') {
              const rowCount = spec.rows || 3;
              const rowGap = (slotW - spec.width * rowCount) / (rowCount + 1);
              const yStart = y0 + rowGap + row * (spec.width + rowGap);
              const yEnd = yStart + spec.width;
              const H = spec.height || 1.2;
              const zBottom = (tier - 1) * H;
              const zTop = tier * H;
              drawIsoBigBag(ctx, toScreen, x0 + item.xStart, x0 + item.xEnd, yStart, yEnd, zBottom, zTop, item.color);
            } else {
              const R = spec.diameter / 2;
              const rowGap = (slotW - spec.width * 2) / 3;
              const yStart = y0 + rowGap + row * (spec.width + rowGap);
              const yEnd = yStart + spec.width;
              const zCenter = tier === 1 ? R : R * (1 + Math.sqrt(3));
              const xCenter = x0 + item.localMid;
              drawIsoCoil(ctx, toScreen, xCenter, yStart, yEnd, zCenter, R, item.color);
            }
          });
        }
      }
    }
  }
}

function drawIsoBigBag(ctx, toScreen, x1, x2, y1, y2, z1, z2, baseColor) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const rx = (x2 - x1) * 0.45; // радиус по X (с небольшим технологическим зазором)
  const ry = (y2 - y1) * 0.45; // радиус по Y
  const h = z2 - z1;

  // Вертикальные уровни цилиндра: низ, «пузатая» середина и суженный верх
  const zMid = z1 + h * 0.48;
  const zTop = z2 - h * 0.08;

  const steps = 20;
  const botPts = [];
  const midPts = [];
  const topPts = [];

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    botPts.push(toScreen(cx + cos * rx * 0.94, cy + sin * ry * 0.94, z1));
    midPts.push(toScreen(cx + cos * rx * 1.04, cy + sin * ry * 1.04, zMid));
    topPts.push(toScreen(cx + cos * rx * 0.88, cy + sin * ry * 0.88, zTop));
  }

  // 1. Боковая поверхность мешка (видимая передняя дуга от 0 до PI)
  const half = Math.floor(steps / 2);
  ctx.beginPath();
  for (let i = 0; i <= half; i++) {
    const p = botPts[i];
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  for (let i = half; i >= 0; i--) {
    ctx.lineTo(midPts[i].x, midPts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = shadeColor(baseColor, -22); // нижняя тень
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i <= half; i++) {
    const p = midPts[i];
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  for (let i = half; i >= 0; i--) {
    ctx.lineTo(topPts[i].x, topPts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = shadeColor(baseColor, -10); // верхняя часть боковины
  ctx.fill();

  // Внешний контур боковой стенки
  ctx.beginPath();
  for (let i = 0; i <= half; i++) {
    const p = botPts[i];
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(midPts[half].x, midPts[half].y);
  ctx.lineTo(topPts[half].x, topPts[half].y);
  ctx.moveTo(botPts.x, botPts.y);
  ctx.lineTo(midPts.x, midPts.y);
  ctx.lineTo(topPts.x, topPts.y);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 2. Верхний купол (крышка мешка)
  ctx.beginPath();
  topPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = shadeColor(baseColor, 10);
  ctx.fill();
  ctx.strokeStyle = '#1f2328';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // 3. Загрузочная горловина (узел по центру сверху)
  const neckCenter = toScreen(cx, cy, zTop + 0.04);
  ctx.beginPath();
  ctx.ellipse(neckCenter.x, neckCenter.y, 3.2, 2.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = shadeColor(baseColor, -30);
  ctx.fill();
  ctx.strokeStyle = '#1f2328';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // 4. Четыре подъёмные лямки (стропы), поднимающиеся от краёв к центру
  const strapAngles = [Math.PI * 0.22, Math.PI * 0.78, Math.PI * 1.22, Math.PI * 1.78];
  ctx.strokeStyle = '#24292f';
  ctx.lineWidth = 1.3;

  strapAngles.forEach(ang => {
    const basePt = toScreen(cx + Math.cos(ang) * rx * 0.84, cy + Math.sin(ang) * ry * 0.84, zTop);
    const loopPt = toScreen(cx + Math.cos(ang) * rx * 0.42, cy + Math.sin(ang) * ry * 0.42, z2 + 0.14);

    ctx.beginPath();
    ctx.moveTo(basePt.x, basePt.y);
    ctx.quadraticCurveTo(
      (basePt.x + loopPt.x) / 2,
      loopPt.y - 2,
      loopPt.x,
      loopPt.y
    );
    ctx.stroke();
  });
}



function drawIsoCoil(ctx, toScreen, xCenter, yBack, yFront, zCenter, R, baseColor) {
  const steps = 22;
  const backPts = [];
  const frontPts = [];

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const dx = Math.cos(theta) * R;
    const dz = Math.sin(theta) * R;
    backPts.push(toScreen(xCenter + dx, yBack, zCenter + dz));
    frontPts.push(toScreen(xCenter + dx, yFront, zCenter + dz));
  }

  const startIdx = Math.floor(steps * 0.90);
  const endIdx = Math.floor(steps * 0.45);
  ctx.beginPath();
  for (let i = 0; i <= endIdx; i++) i === 0 ? ctx.moveTo(frontPts[i].x, frontPts[i].y) : ctx.lineTo(frontPts[i].x, frontPts[i].y);
  for (let i = endIdx; i >= 0; i--) ctx.lineTo(backPts[i].x, backPts[i].y);
  for (let i = steps; i >= startIdx; i--) ctx.lineTo(backPts[i].x, backPts[i].y);
  for (let i = startIdx; i <= steps; i++) ctx.lineTo(frontPts[i].x, frontPts[i].y);
  ctx.closePath();
  ctx.fillStyle = shadeColor(baseColor, -18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.beginPath();
  frontPts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = shadeColor(baseColor, 8);
  ctx.fill();
  ctx.strokeStyle = '#1f2328';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  const holeR = R * 0.34;
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const theta = (i / 16) * Math.PI * 2;
    const p = toScreen(xCenter + Math.cos(theta) * holeR, yFront, zCenter + Math.sin(theta) * holeR);
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = '#32383f';
  ctx.fill();
}