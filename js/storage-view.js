let isRelocatedNotice = false;
let isSharedNotice = false;

function getCargoTitle(weight) {
  if (typeof ROLL_SPECS !== 'undefined' && ROLL_SPECS[weight] && ROLL_SPECS[weight].label) {
    return ROLL_SPECS[weight].label;
  }
  if (weight === 1) return 'Биг-бэг 1 т';
  if (weight === 8) return 'Рулон 8 т';
  if (weight === 15) return 'Рулон 15 т';
  return `Груз ${weight} т`;
}


function initView() {
  if (window.__viewAlreadyInit) return;
  window.__viewAlreadyInit = true;

  const urlParams = new URLSearchParams(window.location.search);
  const reqZoneId = parseInt(urlParams.get('zoneId'), 10);
  isRelocatedNotice = urlParams.get('relocated') === '1';
  isSharedNotice = urlParams.get('shared') === '1';

  if (window.location.search) {
    window.history.replaceState({}, document.title, 'storage.html');
  }

  const state = getStorageState();
  if (reqZoneId && state.zones.some(z => z.id === reqZoneId)) {
    state.activeZoneId = reqZoneId;
    saveStorageState(state);
  }

  const resetHandler = () => {
    if (confirm('Сбросить все площадки и партии к исходным двум площадкам (5×3 и 3×3)?')) {
      clearStorageState();
      window.location.href = 'storage-setup.html';
    }
  };
  
    const algoModal = document.getElementById('algoModal');
	  document.getElementById('openAlgoBtn').addEventListener('click', () => {
		algoModal.classList.add('open');
	  });
	  document.getElementById('closeAlgoBtn').addEventListener('click', () => {
		algoModal.classList.remove('open');
	  });
	  algoModal.addEventListener('click', e => {
		if (e.target === algoModal) algoModal.classList.remove('open');
	  });

  document.getElementById('topResetBtn').addEventListener('click', resetHandler);
  document.getElementById('bottomResetBtn').addEventListener('click', resetHandler);

  renderViewPage(state);
}

function renderViewPage(state) {
  const zone = state.zones.find(z => z.id === state.activeZoneId) || state.zones;
  const totalL = zone.slotsX * 20.0;
  const totalW = zone.slotsY * 3.6 + (zone.slotsY - 1) * 1.0;

  document.getElementById('pageTitle').textContent = `Карта размещения: ${zone.name}`;
  document.getElementById('canvasTitle').textContent = `Схема укладки — ${zone.name}`;
  document.getElementById('subHeader').textContent =
    `Габариты площадки: ${zone.slotsX}×${zone.slotsY} слотов (${totalL.toFixed(1)} × ${totalW.toFixed(1)} м)`;

  const zoneBatches = state.batches.filter(b => b.zoneId === zone.id);
  const lastBatch = zoneBatches[zoneBatches.length - 1];

  const alertBox = document.getElementById('alertBox');
  alertBox.style.display = 'block';
    if (lastBatch) {
    const cargoName = getCargoTitle(lastBatch.weight);
    const sharedText = isSharedNotice ? ' (хвост состыкован навстречу в общем слоте с зазором ≥ 2 единиц)' : '';
    if (isRelocatedNotice) {
      alertBox.className = 'alert warn';
      alertBox.textContent = `На исходной площадке не хватило места — Партия №${lastBatch.id} (${cargoName}, ${lastBatch.placed} шт.) размещена на «${zone.name}»${sharedText}.`;
    } else {
      alertBox.className = 'alert ok';
      alertBox.textContent = `Активная площадка: «${zone.name}». Последняя партия здесь — №${lastBatch.id} (${cargoName}, ${lastBatch.placed} шт.)${sharedText}.`;
    }
  }

  let zoneRolls = 0;
  let zoneMass = 0;
  let occupiedSlots = 0;

  zone.slots.forEach(slot => {
    const count = slot.coils ? slot.coils.length : 0;
    if (count > 0) {
      occupiedSlots++;
      zoneRolls += count;
      slot.coils.forEach(c => { zoneMass += c.weight; });
    }
  });

  const fillPercent = zone.slots.length > 0 ? Math.round((occupiedSlots / zone.slots.length) * 100) : 0;

  document.getElementById('statZoneBatches').textContent = `${zoneBatches.length} шт.`;
  document.getElementById('statTotalRolls').textContent = `${zoneRolls} шт.`;
  document.getElementById('statTotalMass').textContent = `${zoneMass.toLocaleString('ru-RU')} т`;
  document.getElementById('statFill').textContent = `${fillPercent}% (${occupiedSlots}/${zone.slots.length})`;

  const tbody = document.getElementById('batchTable');
  tbody.innerHTML = '';

  if (zoneBatches.length === 0) {
    const emptyTr = document.createElement('tr');
    emptyTr.innerHTML = `<td colspan="7" style="text-align:center; color:#656d76; padding:18px;">На этой площадке нет размещенных партий</td>`;
    tbody.appendChild(emptyTr);
  } else {
        zoneBatches.forEach(b => {
      const cargoName = getCargoTitle(b.weight);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="swatch" style="background:${b.color}; vertical-align:middle; margin-right:6px;"></span><strong>Партия №${b.id}</strong></td>
        <td><strong>${b.zoneName}</strong></td>
        <td><strong>${cargoName}</strong></td>
        <td><strong>${b.placed} шт.</strong></td>
        <td>${(b.placed * b.weight).toLocaleString('ru-RU')} т</td>
        <td style="font-size:13px; color:#57606a;">${b.slotsList.join(', ') || '—'}</td>
        <td>
          <button type="button" class="btn-ship" data-id="${b.id}" style="background:#2da44e; color:#fff; border:none; border-radius:6px; padding:6px 12px; font-size:13px; font-weight:600; cursor:pointer;">
            🚚 Отгрузить в КТК
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.querySelectorAll('.btn-ship').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const batch = state.batches.find(item => item.id === id);
      if (!batch) return;

      if (confirm(`Отгрузить Партию №${batch.id} (${batch.placed} шт. по ${batch.weight} т) с «${batch.zoneName}» в калькулятор КТК?\nСлоты ${batch.slotsList.join(', ')} будут освобождены.`)) {
        shipBatchFromStorage(state, id);
        saveStorageState(state);

        const deltaMin = +(Math.random() * 0.9 + 0.1).toFixed(1);
        const deltaMax = +(Math.random() * 0.9 + 0.1).toFixed(1);
        const minW = Math.max(0.5, +(batch.weight - deltaMin).toFixed(1));
        const maxW = +(batch.weight + deltaMax).toFixed(1);

        const params = new URLSearchParams({
          count: batch.placed,
          minWeight: minW,
          maxWeight: maxW,
          fromBatch: batch.id
        });
        window.location.href = `rolls.html?${params.toString()}`;
      }
    });
  });

  // В легенде под изометрией:
  const legend = document.getElementById('legend');
	  legend.innerHTML = `<span class="legend-item"><i class="swatch" style="background:#ffffff; border:1px solid #8c959f;"></i> Свободный слот</span>`;
	  zoneBatches.forEach(b => {
		const cargoName = getCargoTitle(b.weight);
		legend.innerHTML += `<span class="legend-item"><i class="swatch" style="background:${b.color};"></i> Партия №${b.id}: <strong>${cargoName}</strong> (${b.placed} шт.)</span>`;
	  });

  renderZoneCanvas('storageCanvas', zone, { compact: false });
}

window.addEventListener('DOMContentLoaded', initView);
