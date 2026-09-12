const API = '/api';
let candidatos = [];
let entrevistas = [];

document.getElementById('menuToggle')?.addEventListener('click', () => document.querySelector('.nav-list')?.classList.toggle('open'));

const esc = (value = '') => {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
};

const formatDate = (value) => {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value || '') : date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).toUpperCase();
};

const showAlert = (message, type = 'error') => {
  const alert = document.getElementById('agenda-alert');
  alert.textContent = message;
  alert.className = `form-alert ${type}`;
  alert.hidden = false;
};

async function loadCandidates() {
  const select = document.getElementById('ag-candidato');
  try {
    const response = await fetch(`${API}/postulaciones?estado=Aprobado`);
    if (!response.ok) throw new Error('No se pudieron consultar postulaciones.');
    candidatos = await response.json();
    select.innerHTML = '<option value="" disabled selected>Seleccionar aspirante</option>';
    candidatos.forEach((candidate) => {
      const option = document.createElement('option');
      option.value = candidate.id_postulacion;
      option.textContent = `${candidate.nombre_completo} · ${candidate.cargo}`;
      option.dataset.nombre = candidate.nombre_completo;
      option.dataset.cargo = candidate.cargo;
      option.dataset.telefono = candidate.telefono || '';
      option.dataset.correo = candidate.correo || '';
      select.appendChild(option);
    });
  } catch (error) {
    showAlert(error.message);
  }
}

async function loadInterviews() {
  const list = document.getElementById('eventList');
  try {
    const response = await fetch(`${API}/entrevistas`);
    if (!response.ok) throw new Error('No se pudieron consultar entrevistas.');
    entrevistas = await response.json();
    list.innerHTML = '';
    if (!entrevistas.length) {
      list.innerHTML = '<div class="event-item"><div class="event-desc">No hay entrevistas programadas.</div></div>';
      return;
    }
    entrevistas.forEach((interview) => {
      const item = document.createElement('div');
      item.className = `event-item${String(interview.resultado || '').toLowerCase().includes('urg') ? ' urgent' : ''}`;
      const notes = interview.observaciones || 'Entrevista programada';
      item.innerHTML = `<div class="event-time">${esc(formatDate(interview.fecha_entrevista))}</div><div class="event-name">${esc(interview.candidato || 'Candidato')}</div><div class="event-desc">${esc(interview.cargo || notes)}</div>`;
      list.appendChild(item);
    });
  } catch (error) {
    showAlert(error.message);
  }
}

document.getElementById('ag-candidato').addEventListener('change', (event) => {
  const selected = event.target.selectedOptions[0];
  const cargo = document.getElementById('ag-cargo');
  if (selected?.dataset.cargo) {
    const matching = [...cargo.options].find((option) => option.textContent.trim().toLowerCase() === selected.dataset.cargo.trim().toLowerCase());
    if (matching) cargo.value = matching.value;
  }
});

document.getElementById('btnAgendar').addEventListener('click', async () => {
  const candidateSelect = document.getElementById('ag-candidato');
  const selectedCandidate = candidateSelect.selectedOptions[0];
  const postulationId = candidateSelect.value;
  const candidate = selectedCandidate?.dataset.nombre || selectedCandidate?.textContent || '';
  const role = document.getElementById('ag-cargo').value;
  const date = document.getElementById('ag-fecha').value;
  const time = document.getElementById('ag-hora').value;
  const modality = document.getElementById('ag-modalidad').value;

  if (!postulationId || !role || !date || !time) {
    showAlert('Completa todos los campos requeridos.');
    return;
  }

  const alert = document.getElementById('agenda-alert');
  alert.hidden = true;
  const interviewDate = new Date(`${date}T${time}`);
  const dateText = interviewDate.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeText = interviewDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const message = `Hola ${candidate}, nos complace informarte que has sido seleccionado(a) para continuar en nuestro proceso de selección para el cargo de ${role} en Colviseg. Tu entrevista está programada para el ${dateText} a las ${timeText}. Modalidad e indicaciones: ${modality}. Por favor confirma tu asistencia y presenta tu documento de identidad y soportes de tu hoja de vida. ¡Te esperamos!`;

  try {
    const response = await fetch(`${API}/entrevistas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idPostulacion: Number(postulationId), fecha: date, hora: time, modalidad: modality, indicaciones: `Hora: ${time}. Modalidad: ${modality}.` })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'No fue posible agendar la entrevista.');

    document.getElementById('notificationText').textContent = 'El mensaje de selección quedó listo para enviar con fecha, hora e indicaciones de la entrevista.';
    document.getElementById('whatsappLink').href = `https://wa.me/${selectedCandidate?.dataset.telefono || ''}?text=${encodeURIComponent(message)}`;
    document.getElementById('emailLink').href = `mailto:${selectedCandidate?.dataset.correo || ''}?subject=${encodeURIComponent('Entrevista de selección · Colviseg')}&body=${encodeURIComponent(message)}`;
    document.getElementById('notificationCard').hidden = false;
    await Promise.all([loadCandidates(), loadInterviews()]);
    ['ag-candidato', 'ag-cargo', 'ag-fecha', 'ag-hora'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('ag-modalidad').selectedIndex = 0;
  } catch (error) {
    showAlert(error.message);
  }
});

loadCandidates();
loadInterviews();
