let selectedWeight = 8;
let state = null;

function initSetup() {
  state = getStorageState();
  saveStorageState(state);

  // Следующий исторический номер партии
  const maxActiveId = state.batches.reduce((max, b) => Math.max(max, b.id), 0);
  const nextNum = Math.max(state.lastBatchId || 0, maxActiveId) + 1;
  document.getElementById('batchNumber').value = nextNum;

  // Изменение размеров активной площадки (если на ней ещё нет груза)
  const onSizeChange = () => {
    const zone = getActiveZone();
    if (!zone) return;
    const nx = Math.max(1, parseInt(document.getElementById('slotsX').value, 10) || 1);
    const ny = Math.max(1, parseInt(document.getElementById('slotsY').value, 10) || 1);
    resizeZone(zone, nx, ny);
    saveStorageState(state);
    renderZoneTabs();
    updateSetupUI();
  };

  document.getElementById('slotsX').addEventListener('input', onSizeChange);
  document.getElementById('slotsY').addEventListener('input', onSizeChange);
  document.getElementById('batchCount').addEventListener('input', updateSetupUI);
  document.getElementById('batchNumber').addEventListener('input', updateSetupUI);

  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedWeight = parseInt(card.dataset.weight, 10);
      document.getElementById('opt8').classList.toggle('active', selectedWeight === 8);
      document.getElementById('opt15').classList.toggle('active', selectedWeight === 15);
      card.querySelector('input').checked = true;
      updateSetupUI();
    });
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Сбросить все площадки и партии к исходным двум площадкам (5×3 и 3×3)?')) {
      clearStorageState();
      window.location.reload();
    }
  });

  document.getElementById('setupForm').addEventListener('submit', e => {
    e.preventDefault();
    const zone = getActiveZone();
    const count = Math.max(1, parseInt(document.getElementById('batchCount').value, 10) || 1);
    const batchId = Math.max(1, parseInt(document.getElementById('batchNumber').value, 10) || 1);

    const res = placeBatchNoSplit(state, zone.id, selectedWeight, count, batchId);
    if (!res.ok) {
      alert('Ни на одной площадке недостаточно свободных слотов для размещения партии целиком без разрыва!');
      return;
    }

    saveStorageState(state);
    window.location.href = `storage.html?zoneId=${res.zoneId}${res.relocated ? '&relocated=1' : ''}`;
  });

  renderZoneTabs();
  syncZoneInputs();
  updateSetupUI();
}

function getActiveZone() {
  return state.zones.find(z => z.id === state.activeZoneId) || state.zones;
}

function renderZoneTabs() {
  const bar = document.getElementById('zoneTabs');
  bar.innerHTML = '';

  state.zones.forEach(z => {
    const free = getZoneFreeSlotsCount(z);
    const total = z.slots.length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zone-tab' + (z.id === state.activeZoneId ? ' active' : '');
    btn.innerHTML = `${z.name} <span class="badge-dim">(${z.slotsX}×${z.slotsY}, своб. ${free}/${total})</span>`;
    btn.addEventListener('click', () => {
      state.activeZoneId = z.id;
      saveStorageState(state);
      renderZoneTabs();
      syncZoneInputs();
      updateSetupUI();
    });
    bar.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-zone';
  addBtn.textContent = '+ Добавить площадку (3×3)';
  addBtn.addEventListener('click', () => {
    const nextId = state.zones.reduce((m, z) => Math.max(m, z.id), 0) + 1;
    const newZone = createZoneObj(nextId, `Площадка ${nextId}`, 3, 3);
    state.zones.push(newZone);
    state.activeZoneId = nextId;
    saveStorageState(state);
    renderZoneTabs();
    syncZoneInputs();
    updateSetupUI();
  });
  bar.appendChild(addBtn);
}

function syncZoneInputs() {
  const zone = getActiveZone();
  const hasCargo = zone.slots.some(s => s.coils && s.coils.length > 0);
  document.getElementById('zoneCardTitle').textContent = `1. Состояние: ${zone.name}`;
  document.getElementById('slotsX').value = zone.slotsX;
  document.getElementById('slotsY').value = zone.slotsY;
  document.getElementById('slotsX').disabled = hasCargo;
  document.getElementById('slotsY').disabled = hasCargo;
  document.getElementById('lockNote').style.display = hasCargo ? 'inline-block' : 'none';
}

function updateSetupUI() {
  const zone = getActiveZone();
  const sx = zone.slotsX;
  const sy = zone.slotsY;
  const count = Math.max(1, parseInt(document.getElementById('batchCount').value, 10) || 1);

  const totalL = sx * 20.0;
  const totalW = sy * 3.6 + (sy - 1) * 1.0;

  document.getElementById('totalDim').textContent = `${totalL.toFixed(1)} × ${totalW.toFixed(1)} м`;
  document.getElementById('batchMassHint').textContent = `Масса новой партии: ${(count * selectedWeight).toLocaleString('ru-RU')} т`;

  const totalSlotsCount = zone.slots.length;
  const freeSlotsCount = getZoneFreeSlotsCount(zone);
  const occupiedCount = totalSlotsCount - freeSlotsCount;

  document.getElementById('totalSlots').textContent =
    `Всего ${totalSlotsCount}: занято ${occupiedCount}, свободно ${freeSlotsCount}`;

  analyzeMultiZoneCapacity(count, selectedWeight, zone);
  renderZoneCanvas('gridPreview', zone, { pad: 12, compact: true });

  const legendBox = document.getElementById('legendBox');
  legendBox.innerHTML = `<span class="legend-item"><i class="swatch" style="background:#ffffff;"></i> Свободно</span>`;
  const zoneBatches = state.batches.filter(b => b.zoneId === zone.id);
  zoneBatches.forEach(b => {
    legendBox.innerHTML += `<span class="legend-item"><i class="swatch" style="background:${b.color};"></i> Партия №${b.id} (${b.weight} т, ${b.placed} шт.)</span>`;
  });
}

function analyzeMultiZoneCapacity(count, weight, currentZone) {
  const spec = ROLL_SPECS[weight] || ROLL_SPECS;
  const neededSlots = Math.ceil(count / spec.capacity);
  const currentMaxContiguous = getMaxContiguousFreeSlots(currentZone);
  const currentTotalFree = getZoneFreeSlotsCount(currentZone);

  const alertEl = document.getElementById('capacityAlert');
  const submitBtn = document.getElementById('submitBtn');

  if (currentMaxContiguous >= neededSlots) {
    alertEl.className = 'cap-alert ok';
    alertEl.innerHTML = `<strong>Места достаточно на «${currentZone.name}»:</strong> партия разместится единым блоком в <strong>${neededSlots}</strong> слотов подряд (всего свободно ${currentTotalFree}).`;
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
    submitBtn.textContent = 'Разместить партию на площадке →';
    return;
  }

  // Ищем альтернативную площадку с непрерывным блоком нужной длины
  const altZone = state.zones.find(z => z.id !== currentZone.id && getMaxContiguousFreeSlots(z) >= neededSlots);

  if (altZone) {
    const reasonText = currentTotalFree >= neededSlots
      ? `на «${currentZone.name}» есть ${currentTotalFree} свободных слотов, но они разделены занятыми (макс. блок подряд — ${currentMaxContiguous})`
      : `на «${currentZone.name}» не хватает места (нужно ${neededSlots} слотов подряд, доступно ${currentMaxContiguous})`;

    alertEl.className = 'cap-alert warn';
    alertEl.innerHTML = `<strong>Перенос без разрыва:</strong> ${reasonText}.<br>` +
      `Партия будет размещена единым блоком на <strong>«${altZone.name}»</strong>.`;
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
    submitBtn.textContent = `Разместить целиком на «${altZone.name}» →`;
  } else {
    alertEl.className = 'cap-alert err';
    alertEl.innerHTML = `<strong>Размещение без разрыва невозможно:</strong> требуется <strong>${neededSlots}</strong> свободных слотов подряд. ` +
      `На «${currentZone.name}» самый большой непрерывный участок — <strong>${currentMaxContiguous}</strong> слот(ов) (разрывать партию запрещено).`;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.textContent = 'Нет непрерывного участка слотов';
  }
}


window.addEventListener('DOMContentLoaded', initSetup);
