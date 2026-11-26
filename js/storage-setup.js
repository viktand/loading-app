let selectedWeight = 8;
let state = null;

function initSetup() {
  state = getStorageState();
  saveStorageState(state);

  const maxActiveId = state.batches.reduce((max, b) => Math.max(max, b.id), 0);
  const nextNum = Math.max(state.lastBatchId || 0, maxActiveId) + 1;
  document.getElementById('batchNumber').value = nextNum;

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
  document.getElementById('tiersMode').addEventListener('change', updateSetupUI);

  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedWeight = parseFloat(card.dataset.weight);
      document.getElementById('opt8').classList.toggle('active', selectedWeight === 8);
      document.getElementById('opt15').classList.toggle('active', selectedWeight === 15);
      document.getElementById('opt1').classList.toggle('active', selectedWeight === 1);
      document.getElementById('opt08').classList.toggle('active', selectedWeight === 0.8);
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
	const tiers = parseInt(document.getElementById('tiersMode').value, 10) || 2;
    const res = placeBatchNoSplit(state, zone.id, selectedWeight, count, batchId, tiers);

    if (!res.ok) {
      alert('Ни на одной площадке не найдено места для размещения партии без разрыва (с учётом зазора ≥ 2 рулонов в общих слотах).');
      return;
    }

    saveStorageState(state);
    const q = new URLSearchParams({ zoneId: res.zoneId });
    if (res.relocated) q.set('relocated', '1');
    if (res.shared) q.set('shared', '1');
    window.location.href = `storage.html?${q.toString()}`;
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
    btn.innerHTML = `${z.name} <span class="badge-dim">(${z.slotsX}×${z.slotsY}, чистых ${free}/${total})</span>`;
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
  let full = 0, partial = 0;
  zone.slots.forEach(s => {
    const len = s.coils ? s.coils.length : 0;
    if (len > 0 && len >= s.capacity) full++;
    else if (len > 0) partial++;
  });
  const free = totalSlotsCount - full - partial;

  document.getElementById('totalSlots').textContent =
    `Всего ${totalSlotsCount}: полных ${full}, неполных ${partial}, пустых ${free}`;

  const tiers = parseInt(document.getElementById('tiersMode').value, 10) || 2;
  analyzeMultiZoneCapacity(count, selectedWeight, zone, tiers);
  renderZoneCanvas('gridPreview', zone, { pad: 12, compact: true });

    const legendBox = document.getElementById('legendBox');
	  legendBox.innerHTML = `<span class="legend-item"><i class="swatch" style="background:#ffffff;"></i> Свободно</span>`;
	  const zoneBatches = state.batches.filter(b => b.zoneId === zone.id);
	  zoneBatches.forEach(b => {
		const spec = ROLL_SPECS[b.weight];
		const typeLabel = (spec && spec.label) ? spec.label : (b.weight === 1 ? 'Биг-бэг 1 т' : `Рулон ${b.weight} т`);
		legendBox.innerHTML += `<span class="legend-item"><i class="swatch" style="background:${b.color};"></i> Партия №${b.id} — ${typeLabel} (${b.placed} шт.)</span>`;
	  });
}

function analyzeMultiZoneCapacity(count, weight, currentZone, tiers = 2) {
  const alertEl = document.getElementById('capacityAlert');
  const submitBtn = document.getElementById('submitBtn');

  const currentPlan = findZonePlacementPlan(currentZone, weight, count, tiers);

  if (currentPlan) {
    const slotsText = currentPlan.steps.map(s => `#${s.slotIdx + 1}`).join(', ');
    alertEl.className = 'cap-alert ok';
    if (currentPlan.shared) {
      alertEl.innerHTML = `<strong>Доступна встречная стыковка на «${currentZone.name}»:</strong> хвост партии войдёт навстречу в неполный слот (с зазором ≥ 2 рулона). Слоты: <strong>${slotsText}</strong>.`;
    } else {
      alertEl.innerHTML = `<strong>Места достаточно на «${currentZone.name}»:</strong> партия разместится в чистых слотах <strong>${slotsText}</strong>.`;
    }
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
    submitBtn.textContent = 'Разместить партию на площадке →';
    return;
  }

  // Поиск на других площадках
  let altZone = null;
  let altPlan = null;
  for (const z of state.zones) {
    if (z.id === currentZone.id) continue;
    const p = findZonePlacementPlan(z, weight, count, tiers);
    if (p) { altZone = z; altPlan = p; break; }
  }

  if (altZone && altPlan) {
    const slotsText = altPlan.steps.map(s => `#${s.slotIdx + 1}`).join(', ');
    alertEl.className = 'cap-alert warn';
    alertEl.innerHTML = `<strong>На «${currentZone.name}» нет подходящего места</strong> (с учётом запрета разрыва и зазора в неполных слотах).<br>` +
      `Партия будет размещена на <strong>«${altZone.name}»</strong> (слоты: ${slotsText}${altPlan.shared ? ', со встречной стыковкой хвостов' : ''}).`;
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
    submitBtn.textContent = `Разместить на «${altZone.name}» →`;
  } else {
    alertEl.className = 'cap-alert err';
    alertEl.innerHTML = `<strong>Размещение невозможно:</strong> ни на одной из площадок нет непрерывного места для партии без разрыва (в неполных слотах должен сохраняться зазор не менее 2 рулонов между хвостами).`;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.textContent = 'Нет места для размещения';
  }
}

window.addEventListener('DOMContentLoaded', initSetup);
